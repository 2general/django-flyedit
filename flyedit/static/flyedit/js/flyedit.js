(function($) {
  $.fn.flyedit = function() {
      flyedit.initializeWrappers(this);
  };
})(jQuery);


flyedit = {
    init: function() {
        this.initializeWrappers(null);
    },

    initializeWrappers: function($wrappers) {
        var self = this;
        $('[data-flyedit]', $wrappers).each(function() {
            self.initializeWrapper($(this));
        });
    },

    initializeWrapper: function($newWrapper) {
        var data = $newWrapper.data('flyedit');
        this.fieldTypes[data.type].init($newWrapper, data);
    },

    handleAction: function(event) {
        // called when e.g. tte "Remove image" button is clicked
        var data = event.data,
            info = event.data.info,
            ajaxData = {action: data.action,
                        template_name: info.template_name,
                        varname: info.varname,
                        app_label: info.app_label,
                        model_name: info.model_name,
                        field_name: info.field_name,
                        pk: info.pk,
                        new_value: data.new_value};
        $.post(info.url, 
               ajaxData,
               function(html) {
                   var newWrapper = $(html).replaceAll(data.wrapper);
                   flyedit.initializeWrapper(newWrapper);
               });
        return false;
    },

    fieldTypes: {
        image: {
            html: {
                removeButton: '<div class="flyedit-image-remove" style="position: relative;">' +
                              '&nbsp;' +
                              '</div>'
            },
            init: function(wrapper, info) {
                var image,
                    removeData,
                    $removeButton,
                    buttonPos,
                    imagePos;
                if (info.selector === undefined) {
                    info.selector = 'img';
                }
                image = $(info.selector, wrapper);
                if (image.length) {
                    removeData = {info: info,
                                  action: 'image_change',
                                  new_value: null,
                                  wrapper: wrapper};
                    $removeButton = $(this.html.removeButton).insertAfter(image);
                    buttonPos = $removeButton.position();
                    imagePos = image.position();
                    $removeButton.css('top', '-' + (buttonPos.top - imagePos.top) + 'px')
                                 .css('left', (imagePos.left + image.outerWidth() - buttonPos.left - $removeButton.outerWidth()) + 'px')
                                 .on('click', removeData, flyedit.handleAction);
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
        }
    }
};

$(function() {
    flyedit.init();
});
