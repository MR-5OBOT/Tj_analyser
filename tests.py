import logging
import os

from dotenv import load_dotenv
from telegram import Update, constants
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Bot is running!", parse_mode=constants.ParseMode.MARKDOWN)


def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN environment variable is not set.")
        return

    # Initialize the bot with JobQueue disabled
    application = ApplicationBuilder().token(token).job_queue(None).build()

    # Register handlers
    application.add_handler(CommandHandler("start", start))

    # Start the bot
    application.run_polling()
