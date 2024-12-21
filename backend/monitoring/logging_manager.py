import logging
import sys
from typing import Optional
from datetime import datetime
from pathlib import Path


class LoggingManager:
    def __init__(self, log_dir: str = "logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        self.setup_logging()

    def setup_logging(self, level: int = logging.INFO) -> None:
        """Configure logging with file and console handlers"""
        root_logger = logging.getLogger()
        root_logger.setLevel(level)

        # File handler
        file_handler = logging.FileHandler(
            self.log_dir / f'monitoring_{datetime.now().strftime("%Y%m%d")}.log'
        )
        file_handler.setFormatter(
            logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        )
        root_logger.addHandler(file_handler)

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(logging.Formatter("%(levelname)s: %(message)s"))
        root_logger.addHandler(console_handler)
