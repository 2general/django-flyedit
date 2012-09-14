/* TODO: refactor heavily to organize the code better */

(function($) {
    $.fn.flyedit = function(options) {
        // Initializes editable elements inside the current element.
        //
        // Finds all the editable elements, initializes them and
        // triggers a custom "flyedit initialized" event.
        //
        // Editable elements are identified by looking for the
        // data-flyedit="..." attribute.  The current element and all its
        // descendants are searched.
        //
        // Initialization is done by calling the init() method of the
        // field type specified in data-flyedit='"{"type": <field type>}"'

        var $this = $(this),
            $editables = $this.find('[data-flyedit]');
        if ($this.attr('data-flyedit')) {
            $editables.push(this);
        }
        $editables.each(function() {
            var $editable = $(this),
            data = $editable.data('flyedit');
            $.flyedit.fieldTypes[data.type].init($editable, data);
        });
        $this.trigger('flyeditinitialized');
    };

    var simpleTemplate = function(variables, lines) {
        return {
            render: function() {
                var rendered = lines.join('\n'),
                    i;
                for (i=0; i < variables.length; ++i) {
                    rendered = rendered.replace(variables[i], arguments[i]);
                }
                return rendered;
            }
        };
    };
                        
    $.flyedit = {
        makePostData: function(action, data, flyeditParams) {
            // Prepares POST data for submitting an action.
            // `action` must be the action name (e.g. 'image_change')
            // `data` must contain the per-action information:
            //   * `new_value`: the new value of the field
            // `flyeditParams` must contain instance data:
            //   * `template_name`: template to render and return from server after save
            //   * `varname`: the name of the context variable to store the new instance in
            //   * `app_label`: the Django app for the saved instance
            //   * `model_name`: the model of the saved instance
            //   * `pk`: the primary key of the saved instance
            //   * `field_name`: the field to change
            //   * `csrfmiddlewaretoken`: Django's CSRF middleware token
            return {action: action,
                    template_name: flyeditParams.template_name,
                    varname: flyeditParams.varname,
                    app_label: flyeditParams.app_label,
                    model_name: flyeditParams.model_name,
                    pk: flyeditParams.pk,
                    field_name: flyeditParams.field_name,
                    new_value: JSON.stringify(data.new_value),
                    csrfmiddlewaretoken: flyeditParams.csrfmiddlewaretoken};
        },

        handleAction: function(action, event) {
            // Sends action data to the server and replaces the editable section
            // with the new version received from the server.
            //
            // This is called when e.g. the "Remove image" button is clicked.
            var postData = $.flyedit.makePostData(action, event.data, event.data.flyeditParams),
                handleReceiveHtml = function(html) {
                    // Replaces the old editable section with the newly rendered
                    // version received from the server.
                    $(html).replaceAll(event.data.editable).flyedit();
                };
            $.post(event.data.flyeditParams.url, postData, handleReceiveHtml);
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
                    uploadForm: simpleTemplate(['URL'],
                                               ['<div id="flyedit-image-upload-wrapper">',
                                                '    Upload image:<br />',
                                                '    <input id="flyedit-image-upload"',
                                                '           type="file" ',
                                                '           name="flyedit-image-upload"',
                                                '           data-url="URL" multiple>',
                                                '</div>'])
                },

                init: function(editable, flyeditParams) {
                    var html = this.html,
                        actionData,
                        $form,

                        handleAction = function(event) {
                            // called when e.g. the "Remove image" button is clicked
                            $.post(flyeditParams.url,
                                   $.flyedit.makePostData('image_change', event.data, flyeditParams),
                                   function(html) {
                                       $(html).replaceAll(editable).flyedit();
                                   });
                            return false;
                        },

                        handleUploadClick = function(event) {
                            var $button = $(this);
                            event.preventDefault();
                            event.stopPropagation();
                            actionData = {flyeditParams: flyeditParams,
                                          editable: editable};
                            $form = $('#flyedit-image-upload-wrapper');
                            if ($form.length) {
                                // The upload form already exists, remove it.
                                // Show the upload button for the image where
                                // the form was previously.
                                $form.prev().show();
                                $form.remove();
                            }
                            $form = $(html.uploadForm.render(flyeditParams.url))
                                .on('click', function(e) {
                                    e.stopPropagation();
                                });
                            // .on('clickoutside', function(e) {
                            //     $(this).hide().prev().show();
                            // });
                            $button.after($form).hide();  // hide the upload button
                            $('#flyedit-image-upload').fileupload({
                                formData: $.flyedit.makePostData('image_upload', actionData, flyeditParams),
                                done: function(e, data) {
                                    $(data.result).replaceAll(editable).flyedit();
                                },
                                fail: function(e, data) {
                                    $('.error', $form).remove();
                                    $form.append('<div class="error">' + 
                                                 data.jqXHR.responseText +
                                                 '</div>');
                                }
                            });
                            return false;
                        };

                    if (flyeditParams.selector === undefined) {
                        // by default, the image is the only <img> tag inside
                        // the editable
                        flyeditParams.selector = 'img';
                    }

                    if (flyeditParams.value) {
                        // There is an image -> display a remove button
                        actionData = {new_value: null,
                                      editable: editable};
                        $(html.removeButton)
                            .appendTo(editable)
                            .on('click', actionData, handleAction);
                    } else {
                        // There is no image -> display an upload form
                        $uploadButton = $(html.uploadButton);
                        $uploadButton
                            .appendTo(editable)
                            .on('click', handleUploadClick);
                    }
                }
            },

            text: {
                // Editor widget for textareas
                html: {
                    editControls: 
                        '<div class="flyedit-text-controls">' +
                        '    <a class="edit" href="#">Edit</a> ' +
                        '    <input type="button" class="save" value="Save"> ' +
                        '    <a class="cancel" href="#">Cancel</a>' +
                        '</div>',
                    editor: '<textarea class="flyedit-text-editor"></textarea>'
                },

                init: function(editable, flyeditParams) {
                    var self = this,
                        editControls = $(this.html.editControls),
                        $editButton,
                        $saveButton,
                        $cancelButton;

                        handleEditClick = function(event) {
                            var editor = $(self.html.editor).html(flyeditParams.value),
                                rendered = $(flyeditParams.selector, editable);
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
                            event.data = {flyeditParams: flyeditParams,
                                          new_value: $('.flyedit-text-editor', editable).val(),
                                          editable: editable};
                            $.flyedit.handleAction('text_change', event);
                            return false;
                        },
            
                        handleCancelClick = function(event) {
                            $editButton.show();
                            $saveButton.hide();
                            $cancelButton.hide();
                            $('.flyedit-text-editor', editable).remove();
                            $(flyeditParams.selector, editable).show();
                            return false;
                        };

                    if (flyeditParams.selector === undefined) {
                        flyeditParams.selector = '> [class!=flyedit-text-controls]';
                    }
                    $(flyeditParams.selector, editable).last().after(editControls);
                    $editButton = editControls.find('.edit').on('click', handleEditClick);
                    $saveButton = editControls.find('.save').on('click', handleSaveClick);
                    $cancelButton = editControls.find('.cancel').on('click', handleCancelClick);
                }

            },

            char: {
                // Editor widget for input fields
                html: {
                    editControls:
                        '<div class="flyedit-char-controls">' +
                        '    <a class="edit" href="#">Edit</a> ' +
                        '    <input type="button" class="save" value="Save"> ' +
                        '    <a class="cancel" href="#">Cancel</a>' +
                        '</div>',
                    editor: '<input type="text" class="flyedit-char-editor">'
                },

                init: function(editable, flyeditParams) {
                    var self = this,
                        editControls = $(this.html.editControls),
                        $editButton,
                        $saveButton,
                        $cancelButton;

                        handleEditClick = function(event) {
                            var editor = $(self.html.editor).val(flyeditParams.value),
                                rendered = $(flyeditParams.selector, editable);
                            $editButton.hide();
                            $saveButton.show();
                            $cancelButton.show();
                            editor.width(rendered.width()); // .height(rendered.height());
                            rendered.hide();
                            editor.insertBefore(editControls);
                            return false;
                        },

                        handleSaveClick = function(event) {
                            event.data = {flyeditParams: flyeditParams,
                                          new_value: $('.flyedit-char-editor', editable).val(),
                                          editable: editable};
                            $.flyedit.handleAction('char_change', event);
                            return false;
                        },

                        handleCancelClick = function(event) {
                            $editButton.show();
                            $saveButton.hide();
                            $cancelButton.hide();
                            $('.flyedit-char-editor', editable).remove();
                            $(flyeditParams.selector, editable).show();
                            return false;
                        };

                    if (flyeditParams.selector === undefined) {
                        flyeditParams.selector = '> [class!=flyedit-char-controls]';
                    }
                    $(flyeditParams.selector, editable).last().after(editControls);
                    $editButton = editControls.find('.edit').on('click', handleEditClick);
                    $saveButton = editControls.find('.save').on('click', handleSaveClick);
                    $cancelButton = editControls.find('.cancel').on('click', handleCancelClick);
                }

            },

            choices: {
                // Editor widget for multiple-choice fields as a group of radio
                // buttons
                html: {
                    select:
                        '<div class="flyedit-choices-radio">' +
                        '</div>',
                    option: simpleTemplate(['VAL', 'LBL', 'CHK'],
                                           ['<label>',
                                            '    <input type="radio"',
                                            '     name="flyedit-choices-radio"',
                                            '     value="VAL" CHK>',
                                            '    LBL',
                                            '</label>',
                                            '<br>']),
                    editButton:
                        '<a href="#" class="flyedit-choices-edit">[edit]</a>'
                },

                init: function(editable, flyeditParams) {
                    var self = this,
                        html = self.html,

                        handleEditClick = function(event) {
                            select = $(html.select).on('click', ':input', handleChange);
                            $.each(flyeditParams.choices, function() {
                                var value = this[0],
                                label = this[1],
                                checked = value == flyeditParams.value ? ' checked' : '';
                                select.append(html.option.render(value, label, checked));
                            });
                            $('.flyedit-choices-edit', editable).before(select).hide();
                            $(flyeditParams.selector, editable).hide();
                        },

                        handleChange = function(event) {
                            event.data = {flyeditParams: flyeditParams,
                                          new_value: $('.flyedit-choices-radio :checked').val(),
                                          editable: editable};
                            setTimeout(function() {
                                $.flyedit.handleAction('choices_change', event);
                            }, 0);
                        };

                    if (flyeditParams.selector === undefined) {
                        flyeditParams.selector = '.value';
                    }
                    $(html.editButton).insertAfter($(flyeditParams.selector, editable))
                                      .on('click', handleEditClick);
                }

            },

            m2m: {
                // Editor widget for many-to-many fields with auto-completion
                //
                // TODO: this widget has a lot common with the text widget,
                // refactor?
                html: {
                    editControls: 
                        '<div class="flyedit-m2m-controls">' +
                        '    <a class="edit" href="#">Edit</a> ' +
                        '    <input type="button" class="save" value="Save" disabled="disabled"> ' +
                        '    <a class="cancel" href="#">Cancel</a>' +
                        '</div>',
                    editor: '<ul class="flyedit-m2m-editor"></ul>',
                    item: simpleTemplate(['ID', 'LABEL'],
                                         ['<li class="item" data-id="ID">',
                                          '    <span class="label">LABEL</span>',
                                          '    <a href="#" class="remove">remove</a>',
                                          '</li>'])
                },

                init: function(editable, flyeditParams) {
                    var self = this,
                        $editControls = $(this.html.editControls),
                        $editor,
                        $editButton,
                        $saveButton,
                        $cancelButton,
                        $target;

                        handleSelectItem = function(event, ui) {
                            // when an item to be added is selected in the
                            // auto-complete field, add it to the list and empty
                            // the field
                            var $input = $(this);
                            $input.before(self.html.item.render(ui.item.id,
                                                                ui.item.label));
                            // defer emptying the field because the selected
                            // value hasn't yet been filled in by
                            // jquery.selectable
                            setTimeout(function() { $input.val(''); }, 0);
                            enableSave();
                        },

                        enableSave = function() {
                            // Enables the save button.  It's disabled initially
                            // and should be enabled only when changes are made.
                            $saveButton.prop('disabled', false);
                        },

                        handleAutocompleteLoaded = function(html) {
                            // Adds the HTML received for the "new item"
                            // auto-complete field into the editor.
                            $editor.append(html);
                            bindSelectables($editor);
                            $('input', $editor).on('autocompleteselect', handleSelectItem);
                        },
                            
                        handleEditClick = function(event) {
                            var newItem = $('.new.item', $editor),
                                rendered = $(flyeditParams.selector, editable); // might be empty
                            $editor = $(self.html.editor),
                            $editButton.hide();
                            $saveButton.show();
                            $cancelButton.show();
 
                            // render existing items above the "new item" field
                            $.each(flyeditParams.value, function() {
                                $editor.append(self.html.item.render(this[0], this[1]));
                            });

                            // load the "new item" autocomplete field
                            $.ajax('/flyedit/autocomplete/',
                                   {type: 'GET',
                                    data: {app_label: flyeditParams.m2m_app_label,
                                           model_name: flyeditParams.m2m_model_name,
                                           lookup: flyeditParams.lookup},
                                    success: handleAutocompleteLoaded}
                            );

                            $editor.insertBefore($editControls)
                                   .on('click', '.remove', handleRemoveClick);
                            return false;
                        },
            
                        handleSaveClick = function(event) {
                            // Saves the current many-to-many items to the
                            // server and reloads updated HTML for the editable
                            // section.
                            //
                            // The set of items is retrieved as an array of
                            // primary keys from the data-id="" attributes of
                            // items.
                            var values = $('.flyedit-m2m-editor .item', editable).map(function() {
                                return $(this).data('id');
                            }).toArray();
                            event.data = {flyeditParams: flyeditParams,
                                          new_value: values,
                                          editable: editable};
                            $.flyedit.handleAction('m2m_change', event);
                            return false;
                        },
            
                        handleCancelClick = function(event) {
                            $editButton.show();
                            $saveButton.hide();
                            $cancelButton.hide();
                            $('.flyedit-m2m-editor', editable).remove();
                            $(flyeditParams.selector, editable).show();
                            return false;
                        },
                    
                        handleRemoveClick = function(event) {
                            $(this).closest('.item').remove();
                            enableSave();
                            return false;
                        };

                    if (flyeditParams.selector === undefined) {
                        flyeditParams.selector = '> [class!=flyedit-m2m-controls]';
                    }
                    $target = $(flyeditParams.selector, editable).last();
                    if ($target.length) {
                        $target.after($editControls);
                    } else {
                        editable.append($editControls);
                    }
                    $editButton = $editControls.find('.edit').on('click', handleEditClick);
                    $saveButton = $editControls.find('.save').on('click', handleSaveClick);
                    $cancelButton = $editControls.find('.cancel').on('click', handleCancelClick);
                }
            }
        }
    };

})(jQuery);
