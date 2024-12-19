
import logging
from typing import Dict
from sqlalchemy import text
from .extensions import db

class DatabaseVerifier:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def verify_connection(self) -> bool:
        try:
            with db.engine.connect() as conn:
                conn.execute(text('SELECT 1'))
                self.logger.info("Database connection verified successfully")
                return True
        except Exception as e:
            self.logger.error(f"Database connection verification failed: {str(e)}")
            return False

    def verify_tables(self) -> bool:
        try:
            with db.engine.connect() as conn:
                tables = db.inspect(db.engine).get_table_names()
                self.logger.info(f"Found tables: {tables}")
                return True
        except Exception as e:
            self.logger.error(f"Table verification failed: {str(e)}")
            return False

    def run_health_check(self) -> Dict[str, bool]:
        return {
            'connection': self.verify_connection(),
            'tables': self.verify_tables()
        }

db_verifier = DatabaseVerifier()
