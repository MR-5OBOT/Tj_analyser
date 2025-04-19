import logging
import os
from io import BytesIO

import pandas as pd
import pytz
from dotenv import load_dotenv
from telegram import Update, constants
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from helpers.df_check import df_check
from helpers.stats import (  # Adjust if df_check is in live_fetch
    pl_raw_series,
    stats_table,
)
from live_fetch import export_to_pdf, generate_plots

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# Replace this with your actual Google Sheets template link
TEMPLATE_URL = "https://docs.google.com/spreadsheets/d/YOUR_TEMPLATE_URL/edit#gid=0"

WELCOME_MESSAGE = f"""
👋 *Welcome to the Trading Analysis Bot!*

I can help you analyze your trading performance and generate reports.

📌 *You can send me:*
- A CSV or Excel file
- A direct Google Sheets CSV link

🧾 *Your file must include these columns:*
- `date`
- `outcome`
- `pl_by_percentage`
- `risk_by_percentage`
- `entry_time`
- `exit_time`
- `pl_by_rr`

📥 *Template:* [Click here to download]({TEMPLATE_URL})

Type or upload your data to begin! 📊
"""


# Command: /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(WELCOME_MESSAGE, parse_mode=constants.ParseMode.MARKDOWN)


# Main handler for file or URL
async def process_file(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        message = await update.message.reply_text("🔄 Processing your data...")

        df = None

        # Handle Google Sheets or raw CSV links
        if update.message.text and update.message.text.startswith(("http://", "https://")):
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
            file = await context.bot.get_file(update.message.document.file_id)
            file_bytes = await file.download_as_bytearray()
            file_name = update.message.document.file_name.lower()

            try:
                if file_name.endswith(".csv"):
                    df = pd.read_csv(BytesIO(file_bytes))
                elif file_name.endswith((".xlsx", ".xls")):
                    df = pd.read_excel(BytesIO(file_bytes))
                else:
                    await message.edit_text("❌ Unsupported file format. Please send a .csv or .xlsx file.")
                    return
            except Exception as e:
                await message.edit_text(f"❌ Failed to read the file. Error: `{e}`", parse_mode="Markdown")
                return

        if df is None or df.empty:
            await message.edit_text("❌ No valid data received. Please send a CSV/Excel file or a valid URL.")
            return

        # Check DataFrame structure
        try:
            df_check(df)
        except ValueError as e:
            await message.edit_text(f"❌ Data validation failed: `{e}`", parse_mode="Markdown")
            return

        await message.edit_text("📊 Generating your analysis report...")

        # Perform calculations
        cumulative_pl = pl_raw_series(df)
        pl_raw = pl_raw_series(df)

        # Generate and save PDF report
        pdf_path = export_to_pdf(df, cumulative_pl, pl_raw)

        await message.edit_text("📤 Sending your report...")

        # Send PDF
        with open(pdf_path, "rb") as pdf:
            await context.bot.send_document(
                chat_id=update.effective_chat.id,
                document=pdf,
                filename=f"trading_analysis_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                caption="📈 Here's your trading analysis report!",
            )

        os.remove(pdf_path)

    except Exception as e:
        logger.error("Error processing file: %s", e)
        await update.message.reply_text(f"❌ An error occurred: `{e}`", parse_mode="Markdown")


def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN environment variable is not set.")
        return

    # Initialize the bot with JobQueue disabled
    application = ApplicationBuilder().token(token).job_queue(None).build()

    # Register handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.Document.ALL | filters.Regex(r"^https?://"), process_file))

    # Start the bot
    application.run_polling()


if __name__ == "__main__":
    main()
