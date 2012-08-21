/* TODO: refactor heavily to organize the code better */

(function($) {
  $.fn.flyedit = function() {
      // Initialize editable elements inside the current element
      $('[data-flyedit]', this).each(function() {
          flyedit.initializeWrapper($(this));
      });
  };
})(jQuery);


flyedit = {
    initializeWrapper: function($newWrapper) {
        var data = $newWrapper.data('flyedit');
        this.fieldTypes[data.type].init($newWrapper, data);
    },

    makePostData: function(data, info) {
        // Prepares POST data for submitting an action.
        // `data` must contain the per-action information:
        //   * `action`: the action name (e.g. 'image_change')
        //   * `new_value`: the new value of the field
        // `info` must contain instance data:
        //   * `template_name`: template to render and return from server after save
        //   * `varname`: the name of the context variable to store the new instance in
        //   * `app_label`: the Django app for the saved instance
        //   * `model_name`: the model of the saved instance
        //   * `pk`: the primary key of the saved instance
        //   * `field_name`: the field to change
        //   * `csrfmiddlewaretoken`: Django's CSRF middleware token
        return {action: data.action,
                template_name: info.template_name,
                varname: info.varname,
                app_label: info.app_label,
                model_name: info.model_name,
                pk: info.pk,
                field_name: info.field_name,
                new_value: data.new_value,
                csrfmiddlewaretoken: info.csrfmiddlewaretoken};
    },

    handleAction: function(event) {
        // called when e.g. tte "Remove image" button is clicked
        $.post(event.data.info.url, 
               flyedit.makePostData(event.data, event.data.info),
               function(html) {
                   var newWrapper = $(html).replaceAll(event.data.wrapper);
                   flyedit.initializeWrapper(newWrapper);
               });
        return false;
    },

    fieldTypes: {
        image: {
            html: {
                removeButton: '<div class="flyedit-image-remove">' +
                              '&times;' +
                              '</div>',
                uploadButton: '<a href="#" class="flyedit-upload-button">' +
                              'Upload image' +
                              '</a>',
                uploadForm: '<div id="flyedit-image-upload-wrapper">' +
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
                    $form;
                if (info.selector === undefined) {
                    info.selector = 'img';
                }
                image = $(info.selector, wrapper);
                if (image.length) {
                    // There is an image -> display a remove button
                    actionData = {info: info,
                                  action: 'image_change',
                                  new_value: null,
                                  wrapper: wrapper};
                    $(html.removeButton)
                        .insertAfter(image)
                        .on('click', actionData, flyedit.handleAction);
                } else {
                    // There is no image -> display an upload form
                    $uploadButton = $(html.uploadButton);
                    $uploadButton
                        .appendTo(wrapper)
                        .on('click', function() {
                            var $button = $(this);
                            actionData = {info: info,
                                          action: 'image_upload',
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
                                formData: flyedit.makePostData(actionData, info),
                                done: function(e, data) {
                                    $form.remove();
                                    var newWrapper = $(data.result).replaceAll(wrapper);
                                    flyedit.initializeWrapper(newWrapper);
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
                editControls: '<div class="flyedit-text-controls">' +
                              '<a class="edit" href="#">Edit</a> ' +
                              '<a class="save" style="display: none;" href="#">Save</a> ' +
                              '<a class="cancel" style="display: none;" href="#">Cancel</a>' +
                              '</div>',
                editor: '<textarea class="flyedit-text-editor"></textarea>'
            },

            init: function(wrapper, info) {
                var self = this,
                    element,
                    editControls = $(this.html.editControls);
                if (info.selector === undefined) {
                    info.selector = '> [class!=flyedit-text-controls]';
                }
                $(info.selector, wrapper).last().after(editControls);
                editControls.on('click', '.edit', function(event) {
                    return self.handleEditClick(event, wrapper, info);
                });
                editControls.on('click', '.save', function(event) {
                    return self.handleSaveClick(event, wrapper, info);
                });
                editControls.on('click', '.cancel', function(event) {
                    return self.handleCancelClick(event, wrapper, info);
                });
            },

            handleEditClick: function(event, wrapper, info) {
                var editControls = event.delegateTarget,
                    editor = $(this.html.editor).html(info.value),
                    rendered = $(info.selector, wrapper);
                $('.edit', wrapper).hide();
                $('.save', wrapper).show();
                $('.cancel', wrapper).show();
                editor.width(rendered.width())
                      .height(rendered.height());
                rendered.hide();
                editor.insertBefore(editControls);
                return false;
            },

            handleSaveClick: function(event, wrapper, info) {
                event.data = {info: info,
                              action: 'text_change',
                              new_value: $('.flyedit-text-editor', wrapper).val(),
                              wrapper: wrapper};
                flyedit.handleAction(event);
                return false;
            },

            handleCancelClick: function(event, wrapper, info) {
                $('.edit', wrapper).show();
                $('.save', wrapper).hide();
                $('.cancel', wrapper).hide();
                $('.flyedit-text-editor', wrapper).remove();
                $(info.selector, wrapper).show();
                return false;
            }
        },

        choices: {
            html: {
                select: '<div class="flyedit-choices-radio">' +
                        '</div>',
                option: '<input type="radio" name="flyedit-choices-radio"' +
                        ' value="VALUE" CHECKED> LABEL<br>',
                editButton: '<a href="#" class="flyedit-choices-edit">[edit]</a>'
            },

            init: function(wrapper, info) {
                var self = this,
                    editButton = $(this.html.editButton);
                if (info.selector === undefined) {
                    info.selector = '.value';
                }
                $(info.selector, wrapper).after(editButton);
                editButton.on('click', this.handleEditClick, function(event) {
                    return self.handleEditClick(event, wrapper, info);
                });
            },

            handleEditClick: function(event, wrapper, info) {
                var self = this,
                    select = $(this.html.select)
                        .on('click', function(event) {
                            return self.handleChange(event, wrapper, info);
                        })
                        .focus();
                $.each(info.choices, function() {
                    var value = this[0],
                        label = this[1],
                        checked = value == info.value ? ' checked' : '';
                    select.append(
                        self.html.option
                            .replace('VALUE', value)
                            .replace('LABEL', label)
                            .replace('CHECKED', checked));
                });
                $('.flyedit-choices-edit', wrapper).before(select).hide();
                $(info.selector, wrapper).hide();
            },

            handleChange: function(event, wrapper, info) {
                event.data = {info: info,
                              action: 'choices_change',
                              new_value: $(event.target).val(),
                              wrapper: wrapper};
                flyedit.handleAction(event);
            }
        }
    }
};
