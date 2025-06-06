import logging
import os
from io import BytesIO

import pandas as pd
from dotenv import load_dotenv
from telegram import Update, constants, BotCommand
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from DA_helpers.data_cleaning import *
from DA_helpers.data_preprocessing import *
from DA_helpers.formulas import *
from DA_helpers.utils import *
from DA_helpers.reports import *
from DA_helpers.visualizations import *
from Overall_performance import generate_plots

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Google Sheets template link
TEMPLATE_URL = "https://docs.google.com/spreadsheets/d/1JwaEanv8tku6dXSGWsu3c7KFZvCtEjQEcKkzO0YcrPQ/edit?usp=sharing"


# Command: /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    WELCOME_MESSAGE = """
👋 *Welcome to the Trading Analysis Bot!*

I can help you analyze your trading performance and generate reports.

📌 *You can send me:*
- A CSV or Excel file
- A direct Google Sheets CSV link

🧾 *Your data must be:*
- Check `/template` command

Upload your data to begin! 📊  
For support, contact the bot admin `@MR_5OBOT`
"""
    await update.message.reply_text(
        WELCOME_MESSAGE, parse_mode=constants.ParseMode.MARKDOWN
    )


# Command: /help
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    help_text = """
📚 *Help - Trading Analysis Bot*

Available commands:
- `/start`: Show the welcome message and instructions.
- `/help`: Display this help message.
- `/template`: Get the Google Sheets template link.

📤 *Upload a file or link*:
Send a CSV/Excel file or a Google Sheets CSV link to generate a trading report.

For support, contact the bot admin `@MR_5OBOT`
"""
    await update.message.reply_text(help_text, parse_mode=constants.ParseMode.MARKDOWN)


# Command: /template
async def template_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        f"📥 Download the template here: [Google Sheets Template]({TEMPLATE_URL})",
        parse_mode=constants.ParseMode.MARKDOWN,
    )


# Main handler for file or URL
async def process_file(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        await context.bot.send_chat_action(
            chat_id=update.effective_chat.id, action=constants.ChatAction.TYPING
        )
        message = await update.message.reply_text("🔄 Processing your data...")

        df = None

        # Handle Google Sheets or raw CSV links
        if update.message.text and update.message.text.startswith(
            ("http://", "https://")
        ):
            try:
                df = pd.read_csv(update.message.text)
            except Exception as e:
                await message.edit_text(
                    f"❌ Could not read from the link. Make sure it's a direct CSV export link.\nError: `{e}`",
                    parse_mode="Markdown",
                )
                return

        # Handle file upload
        elif update.message.document:
            if update.message.document.file_size > 10 * 1024 * 1024:  # 10 MB limit
                await message.edit_text(
                    "❌ File too large. Please upload a file under 10MB."
                )
                return

            file = await context.bot.get_file(update.message.document.file_id)
            file_bytes = await file.download_as_bytearray()
            file_name = update.message.document.file_name.lower()

            try:
                if file_name.endswith(".csv"):
                    df = pd.read_csv(BytesIO(file_bytes))
                elif file_name.endswith((".xlsx", ".xls")):
                    df = pd.read_excel(BytesIO(file_bytes))
                else:
                    await message.edit_text(
                        "❌ Unsupported file format. Please send a .csv or .xlsx file."
                    )
                    return
            except Exception as e:
                await message.edit_text(
                    f"❌ Failed to read the file. Error: `{e}`", parse_mode="Markdown"
                )
                return

        if df is None or df.empty:
            await message.edit_text(
                "❌ No valid data received. Please send a CSV/Excel file or a valid URL."
            )
            return

        # Basic structure validation
        try:
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
        except ValueError as e:
            await message.edit_text(
                f"❌ Data validation failed: `{e}`", parse_mode="Markdown"
            )
            return

        await message.edit_text("📊 Generating your analysis report...")

        # Perform calculations
        rr_series = clean_numeric_series(df["R/R"])
        risk = clean_numeric_series(df["contract"])

        # Generate and save PDF report
        pdf_path = export_pdf_report(generate_plots(df, risk, rr_series))

        await message.edit_text("📤 Sending your report...")

        # Send PDF
        with open(pdf_path, "rb") as pdf:
            await context.bot.send_document(
                chat_id=update.effective_chat.id,
                document=pdf,
                filename=f"trading_report_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                caption="📈 Here's your trading analysis report!",
            )

        os.remove(pdf_path)

    except Exception as e:
        logger.error("Error processing file: %s", e)
        await update.message.reply_text(
            f"❌ An error occurred: `{e}`", parse_mode="Markdown"
        )


def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN environment variable is not set.")
        return

    application = ApplicationBuilder().token(token).job_queue(None).build()

    async def set_bot_commands(app):
        commands = [
            BotCommand("start", "Start the bot and see instructions"),
            BotCommand("help", "Show help and available commands"),
            BotCommand("template", "Get the Google Sheets template link"),
        ]
        await app.bot.set_my_commands(commands)

    application.post_init = set_bot_commands

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("template", template_command))
    application.add_handler(
        MessageHandler(
            filters.Document.ALL | filters.Regex(r"^https?://"), process_file
        )
    )

    application.run_polling()


if __name__ == "__main__":
    main()
