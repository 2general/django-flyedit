from django.conf.urls import include, patterns, url
from .views import Flyedit


urlpatterns = patterns(
    '',

    url(r'^$', Flyedit.as_view(), name='flyedit')
)
