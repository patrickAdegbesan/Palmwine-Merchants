import sys
import os
from pathlib import Path
import traceback

# Add the project directory to the Python path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pw_merchants.settings')

try:
    import django
    django.setup()
    
    from django.core.wsgi import get_wsgi_application
    
    app = get_wsgi_application()
except Exception as e:
    # If Django fails to initialize, create a simple WSGI app that shows the error
    error_msg = f"Django initialization failed: {str(e)}\n\nTraceback:\n{traceback.format_exc()}"
    print(error_msg, file=sys.stderr)
    
    def app(environ, start_response):
        status = '500 Internal Server Error'
        response_headers = [('Content-Type', 'text/plain')]
        start_response(status, response_headers)
        return [error_msg.encode('utf-8')]

