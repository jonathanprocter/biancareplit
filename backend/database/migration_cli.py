"""CLI interface for database migration management."""

import sys
from typing import Dict, Any
from backend.database.migration_manager import MigrationManager


class MigrationCLI:
    def __init__(self):
        self.manager = MigrationManager()

    @staticmethod
    def display_health_status(status: Dict[str, Any]) -> None:
        """Display migration system health status."""
        print("\nMigration System Health Status:")
        print("-" * 40)

        # Database Connection
        print(f"Database Connection: {'✓' if status['database_connection'] else '✗'}")

        # Structure Verification
        print("\nStructure Verification:")
        for key, value in status["structure_verification"].items():
            print(f"  {key}: {'✓' if value else '✗'}")

        # Version Information
        print(f"\nCurrent Version: {status['current_version'] or 'None'}")
        print(f"Pending Migrations: {'Yes' if status['pending_migrations'] else 'No'}")

        # Backup System
        print(f"Backup System: {'✓' if status['backup_system'] else '✗'}")

        # Overall Health
        print("\nOverall Health:", end=" ")
        if status["overall_health"]:
            print("✓ Healthy")
        else:
            print("✗ Needs Attention")

    def handle_migrations(self) -> None:
        """Interactive CLI handler for migration operations."""
        while True:
            print("\nMigration Management")
            print("=" * 20)
            print("1. Show Health Status")
            print("2. Create New Migration")
            print("3. Clean & Reinitialize")
            print("4. Upgrade Database")
            print("5. Show Current Version")
            print("6. Create Backup")
            print("7. Restore from Backup")
            print("8. Exit")

            try:
                choice = input("\nEnter choice (1-8): ").strip()

                if choice == "1":
                    status = self.manager.run_health_check()
                    self.display_health_status(status)

                elif choice == "2":
                    message = input("Enter migration message: ").strip()
                    if self.manager.create_migration(message):
                        print("Migration created successfully")
                    else:
                        print("Failed to create migration")

                elif choice == "3":
                    confirm = input(
                        "This will remove all existing migrations. Continue? (y/n): "
                    )
                    if confirm.lower() == "y":
                        if self.manager.clean_migrations():
                            print("Migrations cleaned and reinitialized successfully")
                        else:
                            print("Failed to clean migrations")

                elif choice == "4":
                    if self.manager.upgrade_database():
                        print("Database upgraded successfully")
                    else:
                        print("Failed to upgrade database")

                elif choice == "5":
                    version = self.manager.get_current_version()
                    print(f"Current version: {version or 'None'}")

                elif choice == "6":
                    backup_path = self.manager.create_backup()
                    if backup_path:
                        print(f"Backup created at: {backup_path}")
                    else:
                        print("Failed to create backup")

                elif choice == "7":
                    backups = list(self.manager.backup_dir.glob("migration_backup_*"))
                    if not backups:
                        print("No backups available")
                        continue

                    print("\nAvailable backups:")
                    for i, backup in enumerate(backups, 1):
                        print(f"{i}. {backup.name}")

                    backup_choice = input(
                        "\nSelect backup number to restore (or 0 to cancel): "
                    )
                    if backup_choice.isdigit() and 0 < int(backup_choice) <= len(
                        backups
                    ):
                        selected_backup = backups[int(backup_choice) - 1]
                        if self.manager.restore_backup(str(selected_backup)):
                            print("Backup restored successfully")
                        else:
                            print("Failed to restore backup")

                elif choice == "8":
                    print("Exiting migration manager")
                    break

                else:
                    print("Invalid choice")

            except Exception as e:
                print(f"Error: {str(e)}")
                continue

            input("\nPress Enter to continue...")


def main():
    """Main entry point for migration CLI."""
    try:
        cli = MigrationCLI()
        cli.handle_migrations()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"Fatal error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
