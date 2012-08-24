from django.core.urlresolvers import reverse
from django.db import models
from django.template import Library, Node, TemplateSyntaxError
from django.utils import simplejson

register = Library()


class FlyeditNode(Node):
    def __init__(self,
                 instance_varname,
                 instance,
                 field_name,
                 template_name,
                 lookup):
        self.instance_varname = instance_varname
        self.instance = instance
        self.field_name = field_name
        self.template_name = template_name
        self.lookup = lookup

    def render(self, context):
        # pylint: disable=W0212
        #         Access to a protected member of a client class
        user = context['user']
        instance = self.instance.resolve(context)
        field_name = self.field_name.resolve(context)
        app_label = instance._meta.app_label
        model_name = instance._meta.module_name
        permission = '{0}.change_{1}'.format(app_label, model_name)
        if not user.has_perm(permission):
            return u''
        data = {'url': reverse('flyedit'),
                'varname': self.instance_varname,
                'app_label': app_label,
                'model_name': model_name,
                'field_name': field_name,
                'pk': instance.pk,
                'csrfmiddlewaretoken': unicode(context['csrf_token'])}
        template_name = self.template_name.resolve(context)
        if template_name:
            data['template_name'] = template_name
        field = instance._meta.get_field(field_name)
        if isinstance(field, models.ImageField):
            data['type'] = 'image'
        elif field.choices:
            data['type'] = 'choices'
            data['value'] = getattr(instance, field_name)
            data['choices'] = [[value,  unicode(label)]
                               for value, label in field.choices]
        elif isinstance(field, models.TextField):
            data['type'] = 'text'
            data['value'] = getattr(instance, field_name)
        elif isinstance(field, models.ManyToManyField):
            data['type'] = 'm2m'
            data['value'] = [[item.pk, unicode(item)]
                             for item in getattr(instance, field_name).all()]
            data['lookup'] = self.lookup.resolve(context)
        else:
            raise TypeError("Can't make the {0} {1}.{2} in-line editable"
                            .format(field.__class__.__name__,
                                    model_name,
                                    field_name))
        return u" data-flyedit='{0}'".format(simplejson.dumps(data))


@register.tag
def flyedit(parser, token):
    """Turns a HTML block editable

    Syntax::

        {% flyedit <instance> "<field name>" ["<template name>"] [lookup="<lookup name>"]%}

    Examples::

        {% flyedit poll "question" %}

    is equivalent to::

        {% flyedit poll "question" "polls/poll/_question.html" %}

    To use a different tepmlate fragment::

        {% flyedit poll "question" "mytemplate.html" %}

    """
    bits = token.split_contents()
    try:
        instance_varname, field_name = bits[1:3]
    except ValueError:
        raise TemplateSyntaxError(
            "%r tag requires at least two arguments" % bits[0])
    template_name = '""'
    lookup = '""'
    for bit in bits[3:]:
        if bit.startswith('lookup='):
            lookup = bit.split('=', 1)[1]
        else:
            template_name = bit
    else:
        raise TemplateSyntaxError(
            "%r tag accepts at most three arguments" % bits[0])
    return FlyeditNode(instance_varname,
                       parser.compile_filter(instance_varname),
                       parser.compile_filter(field_name),
                       parser.compile_filter(template_name),
                       parser.compile_filter(lookup))
