/* TODO: refactor heavily to organize the code better */

(function($) {
    $.fn.flyedit = function() {
        // Initialize editable elements inside the current element
        var $this = $(this),
            $wrappers = $this.find('[data-flyedit]');
        if ($this.attr('data-flyedit')) {
            $wrappers.push(this);
        }
        $wrappers.each(function() {
            var $wrapper = $(this),
            data = $wrapper.data('flyedit');
            $.flyedit.fieldTypes[data.type].init($wrapper, data);
        });
    };


    $.flyedit = {
        makePostData: function(action, data, info) {
            // Prepares POST data for submitting an action.
            // `action` must be the action name (e.g. 'image_change')
            // `data` must contain the per-action information:
            //   * `new_value`: the new value of the field
            // `info` must contain instance data:
            //   * `template_name`: template to render and return from server after save
            //   * `varname`: the name of the context variable to store the new instance in
            //   * `app_label`: the Django app for the saved instance
            //   * `model_name`: the model of the saved instance
            //   * `pk`: the primary key of the saved instance
            //   * `field_name`: the field to change
            //   * `csrfmiddlewaretoken`: Django's CSRF middleware token
            return {action: action,
                    template_name: info.template_name,
                    varname: info.varname,
                    app_label: info.app_label,
                    model_name: info.model_name,
                    pk: info.pk,
                    field_name: info.field_name,
                    new_value: data.new_value,
                    csrfmiddlewaretoken: info.csrfmiddlewaretoken};
        },

        handleAction: function(action, event) {
            // called when e.g. the "Remove image" button is clicked
            $.post(event.data.info.url, 
                   $.flyedit.makePostData(action, event.data, event.data.info),
                   function(html) {
                       $(html).replaceAll(event.data.wrapper)
                           .flyedit();
                   });
            return false;
        },

        fieldTypes: {
            image: {
                html: {
                    removeButton:
                        '<div class="flyedit-image-remove">' +
                        '&times;' +
                        '</div>',
                    uploadButton:
                        '<a href="#" class="flyedit-upload-button">' +
                        'Upload image' +
                        '</a>',
                    uploadForm:
                        '<div id="flyedit-image-upload-wrapper">' +
                        '    Upload image:<br />' +
                        '    <input id="flyedit-image-upload"' +
                        '           type="file" ' +
                        '           name="flyedit-image-upload"' +
                        '           data-url="URL" multiple>' +
                        '</div>'},
                init: function(wrapper, info) {
                    var html = this.html,
                        image,
                        actionData,
                        $form,
                        handleAction = function(event) {
                            // called when e.g. the "Remove image" button is clicked
                            $.post(info.url,
                                   $.flyedit.makePostData('image_change', event.data, info),
                                   function(html) {
                                       $(html).replaceAll(wrapper).flyedit();
                                   });
                            return false;
                        };

                    if (info.selector === undefined) {
                        // by default, the image is the only <img> tag inside
                        // the wrapper
                        info.selector = 'img';
                    }

                    image = $(info.selector, wrapper);
                    if (image.length) {
                        // There is an image -> display a remove button
                        actionData = {new_value: null,
                                      wrapper: wrapper};
                        $(html.removeButton)
                            .insertAfter(image)
                            .on('click', actionData, handleAction);
                    } else {
                        // There is no image -> display an upload form
                        $uploadButton = $(html.uploadButton);
                        $uploadButton
                            .appendTo(wrapper)
                            .on('click', function() {
                                var $button = $(this);
                                actionData = {info: info,
                                              wrapper: wrapper};
                                $form = $('#flyedit-image-upload-wrapper');
                                if ($form.length) {
                                    // The upload form already exists, move it.
                                    // Show the upload button for the image where
                                    // the form was previously.
                                    $form.prev().show();
                                } else {
                                    $form = $(html.uploadForm.replace('URL', info.url))
                                        .on('click', function(e) {
                                            e.stopPropagation();
                                        })
                                        .on('clickoutside', function(e) {
                                            $(this).hide().prev().show();
                                        });
                                }
                                $button.after($form).hide();  // hide the upload button
                                $form.show();  // show the form just in case it was hidden
                                $('#flyedit-image-upload').fileupload({
                                    formData: $.flyedit.makePostData('image_upload', actionData, info),
                                    done: function(e, data) {
                                        $(data.result).replaceAll(wrapper).flyedit();
                                    },
                                    fail: function(e, data) {
                                        $('.error', $form).remove();
                                        $form.append('<div class="error">' + 
                                                     data.jqXHR.responseText +
                                                     '</div>');
                                    }
                                });
                                return false;
                            });
                    }
                }
            },

            text: {
                html: {
                    editControls: 
                        '<div class="flyedit-text-controls">' +
                        '    <a class="edit" href="#">Edit</a> ' +
                        '    <input type="button" class="save" value="Save"> ' +
                        '    <a class="cancel" href="#">Cancel</a>' +
                        '</div>',
                    editor: '<textarea class="flyedit-text-editor"></textarea>'
                },

                init: function(wrapper, info) {
                    var self = this,
                        element,
                        editControls = $(this.html.editControls),
                        $editButton,
                        $saveButton,
                        $cancelButton;

                        handleEditClick = function(event) {
                            var editControls = event.delegateTarget,
                                editor = $(self.html.editor).html(info.value),
                                rendered = $(info.selector, wrapper);
                            $editButton.hide();
                            $saveButton.show();
                            $cancelButton.show();
                            editor.width(rendered.width())
                                .height(rendered.height());
                            rendered.hide();
                            editor.insertBefore(editControls);
                            return false;
                        },
            
                        handleSaveClick = function(event) {
                            event.data = {info: info,
                                          action: 'text_change',
                                          new_value: $('.flyedit-text-editor', wrapper).val(),
                                          wrapper: wrapper};
                            $.flyedit.handleAction('text_change', event);
                            return false;
                        },
            
                        handleCancelClick = function(event) {
                            $editButton.show();
                            $saveButton.hide();
                            $cancelButton.hide();
                            $('.flyedit-text-editor', wrapper).remove();
                            $(info.selector, wrapper).show();
                            return false;
                        };

                    if (info.selector === undefined) {
                        info.selector = '> [class!=flyedit-text-controls]';
                    }
                    $(info.selector, wrapper).last().after(editControls);
                    $editButton = editControls.find('.edit').on('click', handleEditClick);
                    $saveButton = editControls.find('.save').on('click', handleSaveClick);
                    $cancelButton = editControls.find('.cancel').on('click', handleCancelClick);
                }

            },

            choices: {
                html: {
                    select:
                        '<div class="flyedit-choices-radio">' +
                        '</div>',
                    option: {
                        html:
                            '<label>' +
                            '    <input type="radio"' +
                            '     name="flyedit-choices-radio"' +
                            '     value="VAL" CHK>' +
                            '    LBL' +
                            '</label>' +
                            '<br>',
                        render: function(value, label, checked) {
                            return this.html.replace('VAL', value)
                                            .replace('LBL', label)
                                            .replace('CHK', checked);
                        }
                    },
                    editButton:
                        '<a href="#" class="flyedit-choices-edit">[edit]</a>'
                },

                init: function(wrapper, info) {
                    var self = this,
                        html = self.html,

                        handleEditClick = function(event) {
                            select = $(html.select).on('click', ':input', handleChange);
                            $.each(info.choices, function() {
                                var value = this[0],
                                label = this[1],
                                checked = value == info.value ? ' checked' : '';
                                select.append(html.option.render(value, label, checked));
                            });
                            $('.flyedit-choices-edit', wrapper).before(select).hide();
                            $(info.selector, wrapper).hide();
                        },

                        handleChange = function(event) {
                            event.data = {info: info,
                                          new_value: $('.flyedit-choices-radio :checked').val(),
                                          wrapper: wrapper};
                            setTimeout(function() {
                                $.flyedit.handleAction('choices_change', event);
                            }, 0);
                        };

                    if (info.selector === undefined) {
                        info.selector = '.value';
                    }
                    $(html.editButton).insertAfter($(info.selector, wrapper))
                                      .on('click', handleEditClick);
                }

            }
        }
    };

})(jQuery);
