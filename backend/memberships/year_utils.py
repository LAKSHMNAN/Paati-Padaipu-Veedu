from django.db.models import QuerySet


def parse_record_year(value):
    try:
        year = int(value)
    except (TypeError, ValueError):
        return None
    if year < 1900 or year > 3000:
        return None
    return year


def get_request_record_year(request):
    return parse_record_year(request.GET.get("year") or request.data.get("record_year"))


def filter_queryset_by_year(queryset, year):
    if not isinstance(queryset, QuerySet):
        return queryset
    if year is None:
        return queryset
    if "record_year" not in {field.name for field in queryset.model._meta.fields}:
        return queryset
    return queryset.filter(record_year=year)
