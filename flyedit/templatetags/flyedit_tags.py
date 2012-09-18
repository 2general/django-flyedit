from django.core.urlresolvers import reverse
from django.db import models
from django.template import Library, Node, TemplateSyntaxError, Variable
from django.utils.importlib import import_module
from django.utils import simplejson

register = Library()


class FlyeditNode(Node):
    # pylint: disable=W0212
    #         Access to a protected member of a client class

    def __init__(self,
                 instance_varname,
                 field_name,
                 template_name,
                 lookup):
        self.instance_varname = instance_varname
        self.instance = Variable(instance_varname)
        self.field_name = field_name
        self.template_name = template_name
        self.lookup = lookup

    def render(self, context):
        """Renders the data-flyedit attribute for an editable element"""
        instance = self.instance.resolve(context)

        if not self.check_permission(context, instance):
            return u''

        data = {'url': reverse('flyedit'),
                'varname': self.instance_varname,
                'app_label': instance._meta.app_label,
                'model_name': instance._meta.module_name,
                'field_name': self.field_name,
                'pk': instance.pk,
                'csrfmiddlewaretoken': unicode(context['csrf_token'])}
        template_name = self.template_name.resolve(context)
        if template_name:
            data['template_name'] = template_name
        field = instance._meta.get_field(self.field_name)
        data.update(self.get_type_specific_metadata(field, instance, context))
        return u" data-flyedit='{0}'".format(simplejson.dumps(data))

    def check_permission(self, context, instance):
        """Returns True if the user has permission to change the instance"""
        permission = '{0}.change_{1}'.format(instance._meta.app_label,
                                             instance._meta.module_name)
        return context['user'].has_perm(permission)

    def get_type_specific_metadata(self, field, instance, context):
        """Returns flyedit JS editor metadata specific to the field type

        The metadata ends up in the ``<... data-flyedit='{}'>`` attribute of
        the editable element.

        Arguments:
        * ``field``: the model field class
        * ``instance``: the model instance to edit
        * ``context``: the current template context

        """
        if isinstance(field, models.ImageField):
            return {'type': 'image',
                    'value': getattr(instance, field.name).name}
        elif field.choices:
            return {'type': 'choices',
                    'value': getattr(instance, field.name),
                    'choices': [[value,  unicode(label)]
                                for value, label in field.choices]}
        elif isinstance(field, models.TextField):
            return {'type': 'text',
                    'value': getattr(instance, field.name)}
        elif isinstance(field, models.CharField):
            return {'type': 'input',
                    'value': getattr(instance, field.name)}
        elif isinstance(field, models.ManyToManyField):
            m2m_field = getattr(instance, field.name)
            data = {'type': 'm2m',
                    'value': [[item.pk, unicode(item)]
                              for item in m2m_field.all()],
                    'm2m_app_label': m2m_field.model._meta.app_label,
                    'm2m_model_name': m2m_field.model._meta.module_name}
            lookup = self.lookup.resolve(context)
            if lookup:
                lookup_class_parts = lookup.rsplit('.', 1)
                lookup_class_module = import_module(lookup_class_parts[0])
                lookup_class = getattr(lookup_class_module,
                                       lookup_class_parts[1])
                data['lookup'] = lookup_class.name()
            return data
        else:
            raise TypeError("Can't make the {0} {1}.{2} in-line editable"
                            .format(field.__class__.__name__,
                                    instance._meta.object_name,
                                    field.name))


@register.tag
def flyedit(parser, token):
    """Turns a HTML block editable

    Syntax::

        {% flyedit <instance.field_name> ["<template name>"] [lookup="<lookup class>"]%}

    The ``lookup=`` parameter is only used for many-to-many auto-complete
    fields and should specify the full Python path to a django-selectable
    Lookup class.

    Examples::

        {% flyedit poll.question %}

    is equivalent to::

        {% flyedit poll.question "polls/poll/_question.html" %}

    To use a different tepmlate fragment::

        {% flyedit poll.question "mytemplate.html" %}

    """
    bits = token.split_contents()
    params = {}

    def set_param(name, value):
        if name in params:
            raise TemplateSyntaxError(
                '{0!r} tag accepts only one "{1}" argument, '
                'got an extra value {2!r}'
                .format(bits[0], name, value))
        params[name] = value

    try:
        instance_and_field = bits[1]
    except IndexError:
        raise TemplateSyntaxError(
            '{0!r} tag requires at least one argument'.format(bits[0]))

    try:
        instance_varname, field_name = instance_and_field.split('.', 1)
    except IndexError:
        raise TemplateSyntaxError(
            'First argument to {0!r} tag must be <instance>.<field>, '
            'got {1!r} instead'
            .format(bits[0], instance_and_field))

    for bit in bits[2:]:
        if bit.startswith('lookup='):
            set_param('lookup', bit.split('=', 1)[1])
        else:
            set_param('template name', bit)

    return FlyeditNode(
        instance_varname,
        field_name,
        parser.compile_filter(params.get('template name', '""')),
        parser.compile_filter(params.get('lookup', '""')))
