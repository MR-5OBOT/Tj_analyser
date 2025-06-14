import logging
import os
from io import BytesIO
import pandas as pd
from dotenv import load_dotenv
from telegram import Update, constants
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    ConversationHandler,
    filters,
)

from helpers.data_cleaning import *
from helpers.data_preprocessing import *
from Tj_analyser import *

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Google Sheets template link
TEMPLATE_URL = "https://docs.google.com/spreadsheets/d/16noFFWS0NSFe__Jq4yguBA1wts9MH8CLu8qtJRCTz0g/edit?usp=sharing"

# States
WAITING_FOR_FILE = 0
ASKING_FOR_PASSWORD = 1


# Ask for password
async def ask_for_password(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text("🔐 Please enter the access password to continue.")
    return ASKING_FOR_PASSWORD


# Check the password
async def check_password(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    user_input = update.message.text.strip()
    correct_password = os.getenv("BOT_PASSWORD")

    if user_input == correct_password:
        context.user_data["authenticated"] = True
        await update.message.reply_text(
            "✅ Access granted. You may now use /weekly or /overall."
        )
        return ConversationHandler.END
    else:
        await update.message.reply_text(
            "❌ Incorrect password. Try again or type /cancel to stop."
        )
        return ASKING_FOR_PASSWORD


# /weekly command
async def weekly_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not context.user_data.get("authenticated"):
        await update.message.reply_text(
            "🚫 You need to authenticate first. Use /start."
        )
        return ConversationHandler.END

    context.user_data["report_type"] = "weekly"
    await update.message.reply_text(
        "📅 *Weekly Report Mode*\n\n📥 Send a CSV, Excel file, or Google Sheets link.",
        parse_mode=constants.ParseMode.MARKDOWN,
    )
    return WAITING_FOR_FILE


# /overall command
async def overall_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if not context.user_data.get("authenticated"):
        await update.message.reply_text(
            "🚫 You need to authenticate first. Use /start."
        )
        return ConversationHandler.END

    context.user_data["report_type"] = "overall"
    await update.message.reply_text(
        "📊 *Overall Report Mode*\n\n📥 Send a CSV, Excel file, or Google Sheets link.",
        parse_mode=constants.ParseMode.MARKDOWN,
    )
    return WAITING_FOR_FILE


# Handle user file or link
async def handle_user_file(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    report_type = context.user_data.get("report_type")
    if report_type not in ["weekly", "overall"]:
        await update.message.reply_text("❌ Please use /weekly or /overall to start.")
        return ConversationHandler.END

    try:
        await context.bot.send_chat_action(
            chat_id=update.effective_chat.id, action=constants.ChatAction.TYPING
        )
        message = await update.message.reply_text("🔄 Processing...")

        df = None
        file_source = update.message.text or update.message.document

        if not file_source:
            await message.edit_text("❌ No file or link provided.")
            return WAITING_FOR_FILE

        # Handle Google Sheets link
        if update.message.text and update.message.text.startswith(
            ("http://", "https://")
        ):
            try:
                csv_url = update.message.text.replace(
                    "/edit?usp=sharing", "/export?format=csv"
                )
                df = pd.read_csv(csv_url)
            except Exception as e:
                await message.edit_text(f"❌ Invalid link. Error: {e}")
                return ConversationHandler.END

        # Handle file upload
        elif update.message.document:
            if update.message.document.file_size > 10 * 1024 * 1024:  # 10MB limit
                await message.edit_text("❌ File too large (max 10MB).")
                return ConversationHandler.END

            file = await context.bot.get_file(update.message.document.file_id)
            file_bytes = await file.download_as_bytearray()
            file_name = update.message.document.file_name.lower()

            try:
                if file_name.endswith(".csv"):
                    df = pd.read_csv(BytesIO(file_bytes))
                elif file_name.endswith((".xlsx", ".xls")):
                    df = pd.read_excel(BytesIO(file_bytes))
                else:
                    await message.edit_text("❌ Only CSV or Excel files supported.")
                    return ConversationHandler.END
            except Exception as e:
                await message.edit_text(f"❌ File processing failed. Error: {e}")
                return ConversationHandler.END

        if df is None or df.empty:
            await message.edit_text("❌ Empty or unreadable data.")
            return ConversationHandler.END

        # Validate columns
        df_check(
            df,
            required_columns=[
                "contract",
                "R/R",
                "outcome",
                "date",
                "day",
                "entry_time",
                "exit_time",
                "symbol",
            ],
        )

        await message.edit_text("📊 Generating report...")

        pdf_path = export_pdf_report(
            generate_plots_weekly(df)
            if report_type == "weekly"
            else generate_plots_overall(df)
        )

        await message.edit_text("📤 Sending report...")

        with open(pdf_path, "rb") as pdf_file:
            await context.bot.send_document(
                chat_id=update.effective_chat.id,
                document=pdf_file,
                filename=f"{report_type}_report_{pd.Timestamp.now().strftime('%Y-%m-%d_%H-%M-%S')}.pdf",
                caption=f"📈 Your *{report_type.capitalize()}* report!",
                parse_mode=constants.ParseMode.MARKDOWN,
            )

        os.remove(pdf_path)
        context.user_data.clear()

    except Exception as e:
        logger.error(f"Error in {report_type} report: {e}")
        await message.edit_text(f"❌ Error: {e}")
    return ConversationHandler.END


# Cancel handler
async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    context.user_data.clear()
    await update.message.reply_text("❌ Operation cancelled.")
    return ConversationHandler.END


def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN not set.")
        return

    app = ApplicationBuilder().token(token).build()

    # Set bot commands
    async def set_bot_commands(application):
        commands = [
            ("start", "Authenticate and unlock bot"),
            ("weekly", "Generate weekly report"),
            ("overall", "Generate overall report"),
            ("cancel", "Cancel operation"),
        ]
        await application.bot.set_my_commands(commands)

    app.post_init = set_bot_commands

    # Password authentication handler
    password_handler = ConversationHandler(
        entry_points=[CommandHandler("start", ask_for_password)],
        states={
            ASKING_FOR_PASSWORD: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, check_password)
            ]
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        per_user=True,
        per_chat=True,
    )

    # Main conversation handler
    report_handler = ConversationHandler(
        entry_points=[
            CommandHandler("weekly", weekly_command),
            CommandHandler("overall", overall_command),
        ],
        states={
            WAITING_FOR_FILE: [
                MessageHandler(
                    filters.Document.ALL | filters.TEXT & ~filters.COMMAND,
                    handle_user_file,
                )
            ]
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        per_user=True,
        per_chat=True,
    )

    # Add handlers
    app.add_handler(password_handler)
    app.add_handler(report_handler)

    app.run_polling()


if __name__ == "__main__":
    main()
