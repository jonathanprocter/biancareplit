
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from services.summary_service import SummaryService
from models import User
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()

async def send_daily_summaries():
    summary_service = SummaryService()
    users = User.query.filter(User.email_preferences.daily_summary == True).all()
    
    for user in users:
        try:
            summary = await summary_service.generate_daily_summary(user.id)
            await summary_service.send_email(user.email, summary)
        except Exception as e:
            logger.error(f"Failed to send summary to {user.email}: {str(e)}")

def init_scheduler():
    try:
        # Daily summary job
        scheduler.add_job(
            send_daily_summaries,
            CronTrigger(hour=17, minute=0),  # Runs at 5 PM daily
            id='daily_summary',
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=3600
        )
        
        # Start the scheduler
        if not scheduler.running:
            scheduler.start()
            logger.info("Scheduler started successfully")
            
    except Exception as e:
        logger.error(f"Failed to initialize scheduler: {str(e)}")
        raise
