from django.conf.urls import include, patterns, url
from .views import Autocomplete, Flyedit


urlpatterns = patterns(
    # pylint: disable=E1101
    #         Instance of <class> has no <member>

    '',

    url(r'^$', Flyedit.as_view(),
        name='flyedit'),
    url(r'^autocomplete/$', Autocomplete.as_view(),
        name='flyedit-autocomplete')
)
