import sys
import os
from pathlib import Path

# Add the project directory to the Python path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pw_merchants.settings')

import django
django.setup()

from django.core.wsgi import get_wsgi_application

app = get_wsgi_application()
