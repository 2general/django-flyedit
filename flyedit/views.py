# pylint: disable=W0212
#         Access to a protected member of a client class

from django.db.models import CharField, get_model
from django import forms
from django.http import Http404, HttpResponse, HttpResponseBadRequest
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.views.generic import View


class Flyedit(View):

    def get(self, request):
        """Returns rendered HTML for an instance field

        Expects the following GET variables:
        * ``template_name`` (optional): the template to use for re-rendering
          the model instance
        * ``app_label``: the app to which the model belongs
        * ``model_name``: the name of the model
        * ``pk``: the primary key of the instance
        * ``varname`` (optional): the name of the model instance
          in template context

        """
        # pylint: disable=W0142
        #         Used * or ** magic
        data = request.GET
        if 'template_name' in data:
            template_name = data['template_name']
        else:
            template_name = (
                '{app}/{model}/_{field}.html'.format(
                    app=data['app_label'],
                    model=data['model_name'],
                    field=data['field_name']))
        varname = data.get('varname', data['model_name'])
        instance = self._get_instance(data)
        context = {varname: instance}
        return render_to_response(template_name,
                                  context,
                                  RequestContext(request))

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
        * ``varname`` (optional): the name of the model instance
          in template context

        The possible actions are:
        * ``image_change``: change the value of an ImageField

        """
        # pylint: disable=W0142
        #         Used * or ** magic
        data = request.POST
        action = getattr(self, data['action'])
        try:
            context = action(data, request.FILES)
        except IOError as e:
            return HttpResponseBadRequest(unicode(e))
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

    def _get_instance(self, data):
        model = get_model(data['app_label'], data['model_name'])
        queryset = (model._default_manager
                    .select_for_update()
                    .filter(pk=data['pk']))
        try:
            return queryset[0]
        except IndexError:
            raise Http404

    def image_change(self, data, _files):
        instance = self._get_instance(data)
        field_name = data['field_name']
        field = instance._meta.get_field(field_name)
        new_value = field.to_python(data['new_value'])
        old_value = getattr(instance, field_name)
        setattr(instance, field_name, new_value)
        instance.save()
        return {data.get('varname', data['model_name']): instance,
                'old_value': old_value}

    text_change = image_change
    choices_change = image_change

    def image_upload(self, data, files):
        instance = self._get_instance(data)
        field_name = data['field_name']
        field = getattr(instance, field_name)
        old_value = field.name
        file_ = files['flyedit-image-upload']
        field.save(file_.name, file_)
        return {data.get('varname', data['model_name']): instance,
                'old_value': old_value}


class Autocomplete(View):
    def get(self, request):
        # pylint: disable=E1101
        #         Instance of <class> has no <member>

        # import from selectable locally so it's not a hard dependency
        from selectable.forms import AutoCompleteWidget
        from selectable.registry import registry

        data = request.GET
        if 'lookup' in data:
            lookup_class = registry.get(data.get('lookup'))
        else:
            from selectable.base import ModelLookup
            model_class = get_model(data['app_label'], data['model_name'])
            first_charfield = (f for f in model_class._meta.fields
                               if isinstance(f, CharField)).next()

            class lookup_class(ModelLookup):
                model = model_class
                search_fields = [first_charfield.name]

        class Form(forms.Form):
            autocomplete = forms.CharField(
                label=u'',
                widget=AutoCompleteWidget(lookup_class))

        return HttpResponse(Form().as_p())
