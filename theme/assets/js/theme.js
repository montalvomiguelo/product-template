var theme = (function($) {
  'use strict';

  var cache = {
    // General
    $html: $('html'),
    $body: $(document.body),

    // Product
    $numInputs: $('input[type="number"]'),
    $openProductMenuSlideout: $('.js-product-menu-slideout-open'),
    $cloeseProductMenuSlideout: $('.js-product-menu-slideout-close'),
    $productMenuSlideout: $('#ProductMenuSlideout'),
    $productMenuButtons: $('#ProductMenuButtons'),

  };

  var init = function() {
    FastClick.attach(document.body);
    qtySelectors();
    productMenuSlideout();
  };

  var qtySelectors = function() {
    if (!cache.$numInputs.length) {
      return;
    }

    cache.$numInputs.each(function() {
      var $el = $(this),
        currentQty = $el.val(),
        inputName = $el.attr('name'),
        inputId = $el.attr('id');

      var itemAdd = currentQty + 1,
        itemMinus = currentQty - 1,
        itemQty = currentQty;

      var source   = $("#JsQty").html(),
        template = Handlebars.compile(source),
        data = {
          key: $el.data('id'),
          itemQty: itemQty,
          itemAdd: itemAdd,
          itemMinus: itemMinus,
          inputName: inputName,
          inputId: inputId
        };

      // Append new quantity selector then remove original
      $el.after(template(data)).remove();
    });

    // Setup listeners to add/subtract from the input
    cache.$body.on('click', '.js-qty__adjust', function() {
      var $el = $(this),
          id = $el.data('id'),
          $qtySelector = $el.siblings('.js-qty__num'),
          qty = parseInt($qtySelector.val().replace(/\D/g, ''));

      var qty = validateQty(qty);

      // Add or subtract from the current quantity
      if ($el.hasClass('js-qty__adjust--plus')) {
        qty += 1;
      } else {
        qty -= 1;
        if (qty <= 1) qty = 1;
      }

      // Update the input's number
      $qtySelector.val(qty);
    });

  };

  var validateQty = function (qty) {
    if((parseFloat(qty) == parseInt(qty)) && !isNaN(qty)) {
      // We have a valid number!
    } else {
      // Not a number. Default to 1.
      qty = 1;
    }
    return qty;
  };

  var productPage = function(options) {
    var moneyFormat = options.money_format,
        variant = options.variant,
        selector = options.selector,
        translations = options.translations;

    // Selectors
    var $addToBag = $('#AddToBag'),
        $productPrice = $('.js-product-price'),
        $addToBagText= $('#AddToBagText'),
        $currentVariantPrice = $('.js-current-variant-price');

    if (variant) {
      // Swap image.

      // Selected a valid variant that is available.
      if (variant.available) {

        // Enabling add to cart button.
        $addToBag.removeClass('disabled').prop('disabled', false);
        $addToBagText.html(translations.addToBag);

      } else {
        // Variant is sold out.
        $addToBagText.html(translations.soldOut);
        $addToBag.addClass('disabled').prop('disabled', true);
      }

      // Whether the variant is in stock or not, we can update the price and compare at price.
      if (variant.compare_at_price > variant.price) {
        $productPrice.html(Shopify.formatMoney(variant.price, moneyFormat) + '&nbsp;<s>' + Shopify.formatMoney(variant.compare_at_price, moneyFormat)  + '</s>');
      } else {
        $productPrice.html(Shopify.formatMoney(variant.price, moneyFormat));
      }

      $currentVariantPrice.html(Shopify.formatMoney(variant.price, moneyFormat));

    } else {
      // variant doesn't exist.
      $addToBagText.html(translations.unavailable);
      $addToBag.addClass('disabled').prop('disabled', true);
    }

  };

  var productMenuSlideout = function() {
    cache.$openProductMenuSlideout.click(function(evt) {
      evt.preventDefault();
      $(this).hide();
      cache.$productMenuSlideout.addClass('is-open');
      cache.$productMenuButtons.show();
    });

    cache.$cloeseProductMenuSlideout.click(function(evt) {
      evt.preventDefault();
      cache.$productMenuSlideout.removeClass('is-open');
      cache.$productMenuButtons.hide();
      cache.$openProductMenuSlideout.show();
    })
  };

  return {
    init: init,
    productPage: productPage
  };
})(jQuery);

$(theme.init);
