import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import RequestFactory
from memberships.report_views import AuctionTransactionReportView

factory = RequestFactory()
request = factory.get('/api/reports/auction-transactions/?format=csv')
view = AuctionTransactionReportView.as_view()

try:
    response = view(request)
    print(f'Status: {response.status_code}')
    if hasattr(response, 'get'):
        print(f'Content-Type: {response.get("Content-Type", "Not set")}')
    if hasattr(response, 'content'):
        print(f'Content: {response.content[:100]}')
except Exception as e:
    print(f'Error: {type(e).__name__}: {e}')
    import traceback
    traceback.print_exc()
