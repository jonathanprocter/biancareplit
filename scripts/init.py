import click
from pathlib import Path
from app import create_app, db

@click.command()
def init():
    """Initialize the application"""
    click.echo('Initializing application...')
    
    # Create instance directory
    Path('instance').mkdir(exist_ok=True)
    
    # Create application instance
    app = create_app()
    
    with app.app_context():
        # Clean up existing migrations
        from scripts.cleanup import cleanup_migrations
        cleanup_migrations()
        
        # Initialize new migrations
        from scripts.cleanup import init_new_migrations
        init_new_migrations(app)
        
        # Create tables
        db.create_all()
        
        click.echo('Initialization complete!')

if __name__ == '__main__':
    init()
