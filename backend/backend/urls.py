from django.contrib import admin
from django.urls import include, path
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework.permissions import AllowAny

schema_view = get_schema_view(
    openapi.Info(
        title="Member Management & Donation Tracking System API",
        default_version="v1",
        description="APIs for member management, receipts, donations, deposits, relatives, and eelam tracking.",
    ),
    public=True,
    permission_classes=[AllowAny],
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("memberships.urls")),
    path("swagger/", schema_view.with_ui("swagger", cache_timeout=0), name="schema-swagger-ui"),
    path("swagger.json", schema_view.without_ui(cache_timeout=0), name="schema-json"),
]
