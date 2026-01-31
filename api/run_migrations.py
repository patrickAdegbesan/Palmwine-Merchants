import os
import sys
from pathlib import Path

# Prepare Django environment
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pw_merchants.settings')

import django
django.setup()

from django.core.management import call_command
import io


def app(environ, start_response):
    # Simple WSGI app that runs migrations when called with correct Bearer token
    auth = environ.get('HTTP_AUTHORIZATION', '')
    secret = os.environ.get('MIGRATE_SECRET', '')
    if not auth.startswith('Bearer ') or auth.split(' ', 1)[1] != secret:
        start_response('401 Unauthorized', [('Content-Type', 'text/plain')])
        return [b'Unauthorized']

    buf = io.StringIO()
    try:
        call_command('migrate', stdout=buf, stderr=buf, interactive=False)
        output = buf.getvalue().encode('utf-8')
        start_response('200 OK', [('Content-Type', 'text/plain')])
        return [output]
    except Exception as e:
        msg = str(e).encode('utf-8')
        start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
        return [msg]
