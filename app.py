"""Main application module for the NCLEX coaching platform."""
import os
from backend import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    )