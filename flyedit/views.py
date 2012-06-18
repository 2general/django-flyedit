from django.db.models import get_model
from django.http import Http404
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.views.generic import View


class Flyedit(View):
    def post(self, request):
        """Modifies a model instance and returns re-rendered HTML for it

        Expects the following POST variables:
        * ``action``: the modification to make (see below)
        * ``template_name`` (optional): the template to use for re-rendering
          the model instance
        * ``app_label``: the app to which the model belongs
        * ``model_name``: the name of the model
        * ``pk``: the primary key of the instance
        * ``new_value``: the new value for the field

        The possible actions are:
        * ``image_change``: change the value of an ImageField

        """
        # pylint: disable=W0142
        #         Used * or ** magic
        data = request.POST
        action = getattr(self, data['action'])
        context = action(data)
        if 'template_name' in data:
            template_name = data['template_name']
        else:
            template_name = (
                '{app}/{model}/_{field}.html'.format(
                    app=data['app_label'],
                    model=data['model_name'],
                    field=data['field_name']))
        return render_to_response(template_name,
                                  context,
                                  RequestContext(request))

    def image_change(self, data):
        # pylint: disable=W0212
        #         Access to a protected member of a client class
        model = get_model(data['app_label'], data['model_name'])
        queryset = (model._default_manager
                    .select_for_update()
                    .filter(pk=data['pk']))
        try:
            instance = queryset[0]
        except IndexError:
            raise Http404
        field_name = data['field_name']
        old_value = getattr(instance, field_name)
        setattr(instance, field_name, data['new_value'])
        instance.save()
        return {data['varname']: instance,
                'old_value': old_value}

    text_change = image_change
