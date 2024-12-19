"""System verification utilities."""
import logging
from typing import Dict, Any
from sqlalchemy import text
from .app_context import ApplicationContextManager

class SystemVerification:
    """Handles comprehensive system verification."""
    
    def __init__(self, context_manager: ApplicationContextManager):
        self.context_manager = context_manager
        self.logger = context_manager.logger

    def verify_system(self) -> Dict[str, bool]:
        """Run comprehensive system verification."""
        results = {
            'app_context': False,
            'database_connection': False,
            'migrations': False,
            'configuration': False
        }
        
        try:
            # Verify application context
            with self.context_manager.app_context():
                results['app_context'] = True
                
                # Verify database
                if self.context_manager.verify_database():
                    results['database_connection'] = True
                
                # Verify migrations
                if self._verify_migrations():
                    results['migrations'] = True
                    
                # Verify configuration
                if self._verify_configuration():
                    results['configuration'] = True
                
        except Exception as e:
            self.logger.error(f"System verification failed: {str(e)}")
            
        return results

    def _verify_migrations(self) -> bool:
        """Verify migration status."""
        try:
            with self.context_manager.db_session_context() as session:
                # Check alembic_version table
                result = session.execute(text(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
                    "WHERE table_name='alembic_version')"
                ))
                exists = result.scalar()
                
                if exists:
                    version = session.execute(text(
                        "SELECT version_num FROM alembic_version"
                    )).scalar()
                    self.logger.info(f"Current migration version: {version}")
                    return bool(version)
                    
                return False
        except Exception as e:
            self.logger.error(f"Migration verification failed: {str(e)}")
            return False

    def _verify_configuration(self) -> bool:
        """Verify system configuration."""
        try:
            with self.context_manager.app_context():
                app = self.context_manager.app
                required_config = [
                    'SQLALCHEMY_DATABASE_URI',
                    'SECRET_KEY',
                    'SQLALCHEMY_TRACK_MODIFICATIONS'
                ]
                
                for key in required_config:
                    if key not in app.config:
                        self.logger.error(f"Missing configuration: {key}")
                        return False
                        
                return True
        except Exception as e:
            self.logger.error(f"Configuration verification failed: {str(e)}")
            return False
