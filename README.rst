======================================================
 django-flyedit – tools for in-line editing in Django
======================================================

This reusable app for Django provides easy in-line editing for model data.  At
this point it supports ``TextField``\s and ``ImageField``\s.

The editor widgets are injected with JavaScript.  Modifications are submitted
to the server with AJAX, and modified values are re-rendered on the server.
The resulting HTML is injected back to the page.

User permissions are honored, and the editor widgets are not show nor is
submitting modified data allowed unless the user has necessary permissions.

When using the built-in default template paths, it becomes very easy to add
in-line editing to Django apps.


Quickstart
==========

Install django-flyedit with pip::

    pip install django-flyedit

Add ``flyedit`` to your ``INSTALLED_APPS`` in :file:`settings.py`::

    INSTALLED_APPS = (
        # ...
        'flyedit',
        # ...
    )

Add this to your master :file:`urls.py`::

    urlpatterns = patterns(
        '',

        # ...
        (r'^flyedit/', include('flyedit.urls')),
        # ...
    )

In the templates for which you need to enable in-line editing, make sure that
jQuery and :file:`flyedit/static/flyedit/js/flyedit.js` are loaded.  For
example, with :mod:`django.contrib.staticfiles` you'll add::

    <script type="text/javascript"
            src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js"></script>
    <script type="text/javascript"
            src="{{ STATIC_URL }}flyedit/js/flyedit.js"></script>

Example
=======

Let's assume we have a Poll model in the ``polls`` app's
:file:`polls/models.py` file::

    class Poll(models.Model):
        question = models.TextField()
        photo = models.ImageField(upload_to='polls')

The detail view for the Poll model is in :file:`polls/views.py`::

    class PollDetail(DetailView):
        model = Poll
        template = 'polls/poll/detail.html'

The corresponding detail template :file:`polls/poll/detail.html`::

    <html>
        <head>
            <script type="text/javascript" src="/static/js/jquery.min.js"></script>
            <script type="text/javascript" src="/static/js/flyedit.min.js"></script>
        </head>
        <body>
            <h1>Details for poll {{ poll.pk }}</h1>
            <h2>Question:<h2>
            {% include "polls/poll/_question.html" %}
            <h2>Photo:</h2>
            {% include "polls/poll/_photo.html" %}
        </body>
    </html>

Each editable data item should be separated into its own template fragment.
Here's :file:`polls/poll/_question.html`::

    <div class="question" {% flyedit poll "question" %}>
        <div>{{ poll.question|linebreaks }}</div>
    </div>
    
And here's :file:`polls/poll/_photo.html`::

    <div class="photo" {% flyedit poll "photo" %}>
        <img src="{{ poll.photo.url }}">
    </div>

If you render the same field differently in another template and need in-line
editing there, too, you need to create another template fragment and provide
its name for the ``{% flyedit %}`` template tag.  For example, in
:file:`polls/poll/list.html` you might have::

    {# ... #}
    {% for poll in polls %}
        {% include "polls/poll/_question_in_list.html" %}
        {% include "polls/poll/_photo_in_list.html" %}
    {% endfor %}
    {# ... #}

Here's :file:`polls/poll/_question_in_list.html`::

    <div class="question" {% flyedit poll "question" "polls/poll/_question_in_list.html" %}>
        <div>Poll #{{ poll.pk }}:</div>
        <div>{{ poll.question|linebreaks }}</div>
    </div>
    
And here's :file:`polls/poll/_photo_in_list.html` which uses easy-thumbnails for
resizing the photo::

    {% load thumbnail %}
    <div class="photo" {% flyedit poll "photo" "polls/poll/_photo_in_list.html" %}>
        <img src="{% thumbnail poll.photo.url 50x50 crop %}">
    </div>
