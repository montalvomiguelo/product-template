var theme = (function($) {
  'use strict';

  var variables = {
    mediaQuerySmall: 668,
    mediaQueryMedium: 800,
    milliseconds: 300
  };

  var cache = {
    // General
    $window: $(window),
    $html: $('html'),
    $body: $(document.body),

    // Product
    $numInputs: $('input[type="number"]'),
    $openProductMenuSlideout: $('.js-product-menu-slideout-open'),
    $cloeseProductMenuSlideout: $('.js-product-menu-slideout-close'),
    $closeProductShareSlideout: $('.js-product-share-slideout-close'),
    $openShippingRatesSlideout: $('.js-shipping-rates-slideout-open'),
    $closeShippingRatesSlideout: $('.js-shipping-rates-slideout-close'),
    $closeShare: $('#CloseShare'),
    $openProductShareSlideout: $('.js-product-share-slideout-open'),
    $productShareSlideout: $('#ProductShareSlideout'),
    $productMenuSlideout: $('#ProductMenuSlideout'),
    $shippingRatesSlideout: $('#ShippingRatesSlideout'),
    $productImages: $('#ProductImages'),
    $productActions: $('#ProductActions'),
    $cartActions: $('#CartActions'),
    $productDetails: $('.product-details'),
    $relatedProducts: $('.related-products'),
    $shareButton: $('.share-button'),
    $addToBag: $('#AddToBag'),
    $formContainer: $('#AddToBagForm'),

    // Notification
    $errorEl: $('.notification'),
    $errorTextEl: $('.notification__inner'),
    $closeNotification: $('.js-notification-slideout-close'),

  };

  var init = function() {
    FastClick.attach(document.body);
    qtySelectors();
    productMenuSlideout();
    productShareSlideout();
    shippingRatesSlideout();
    productImages();
    relatedProductsSlider();
    onResize();
    stickyProductDetails();
    formOverride();
  };

  var qtySelectors = function() {
    if (!cache.$numInputs.length) {
      return;
    }

    cache.$numInputs.each(function() {
      var $el = $(this),
        currentQty = $el.val(),
        inputName = $el.attr('name'),
        inputId = $el.attr('id'),
        line = $el.data('line'),
        handle = $el.data('handle');

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
          inputId: inputId,
          line: line,
          handle: handle
        };

      // Append new quantity selector then remove original
      $el.after(template(data)).remove();
    });

    // Setup listeners to add/subtract from the input
    cache.$body.on('click', '.js-qty__adjust', function() {
      var $el = $(this),
          $qtySelector = $el.siblings('.js-qty__num'),
          handle = $qtySelector.data('handle'),
          qty = parseInt($qtySelector.val().replace(/\D/g, ''));

      var qty = validateQty(qty);

      // Add or subtract from the current quantity
      if ($el.hasClass('js-qty__adjust--plus')) {
        qty += 1;
      } else {
        qty -= 1;
        if (qty <= 1) qty = 1;
      }

      // If it has a data-line, update the cart.
      // Otherwise, just update the input's number
      if ($qtySelector.data('line')) {
        // Update cart after short timeout so user doesn't create simultaneous ajax calls
        clearTimeout(qtyUpdateTimeout);
        var qtyUpdateTimeout = setTimeout(function() {
          ShopifyAPI.getProduct(handle, function(product) {
            validateAvailabilityCallback(qty, $qtySelector, product);
          });
        }, 200);
      } else {
        $qtySelector.val(qty);
      }
    });
  };

  var getProductIdFromKey = function(key) {
    return key.split(':')[0];
  };

  var validateAvailabilityCallback = function(qty, $qtySelector, product) {
    var id = getProductIdFromKey($qtySelector.data('id')),
        line = $qtySelector.data('line');

    var quantityIsAvailable = true;

    // This returns all variants of a product.
    // Loop through them to get our desired one.
    for (var i = 0; i < product.variants.length; i++) {
      var variant = product.variants[i];
      if (variant.id == id) {
        break;
      }
    }

    // If the variant tracks inventory and does not sell when sold out
    // we can compare the requested with available qty
    if (variant.inventory_management !== null && variant.inventory_policy === 'deny') {

      if (variant.inventory_quantity < qty) {
        // Show notification with error message
        notification('error', '{{ "products.product.stock_unavailable" | t }}');
        cache.$cartActions.addClass('is-qty-error');

        // Set qty to max amount available
        $qtySelector.val(variant.inventory_quantity);

        quantityIsAvailable = false;
      }
    }

    if (quantityIsAvailable) {
      updateItemQuantity(line, qty, $qtySelector);
    }
  };

  var updateItemQuantity = function(line, qty, $qtySelector) {
    ShopifyAPI.changeItem(line, qty, function(cart) {
      $qtySelector.val(qty);
      $('#TotalPrice').html(Shopify.formatMoney(cart.total_price));
    });
  };

  var validateQty = function(qty) {
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
      if (variant.featured_image) {

        var featuredImageId = variant.featured_image.id,
            newImage = $('img[data-image-id="' + featuredImageId + '"]'),
            imageIndex = $(newImage).parent().index(),
            disabledClass = 'disabled';

        showVariantImage(featuredImageId, newImage, imageIndex);
      }

      // Selected a valid variant that is available.
      if (variant.available) {

        // Enabling add to cart button.
        $addToBag.removeClass(disabledClass).prop('disabled', false);
        $addToBagText.html(translations.addToBag);

      } else {
        // Variant is sold out.
        $addToBagText.html(translations.soldOut);
        $addToBag.addClass(disabledClass).prop('disabled', true);
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
      $addToBag.addClass(disabledClass).prop('disabled', true);
    }

  };

  var scrolledBelowProductImages = function() {
    return (cache.$window.scrollTop() > cache.$productImages.offset().top);
  };

  var featuredImageEqualToFirstProductImages = function(featuredImageId) {
    var $firstProductImage = $(cache.$productImages.find('[data-image-id]')[0]);

    return ($firstProductImage.data('image-id') == featuredImageId);
  };

  var isPostBreakSmall = function() {
    return (cache.$window.width() > variables.mediaQuerySmall);
  };

  var isPostBreakMedium = function() {
    return (cache.$window.width() > variables.mediaQueryMedium);
  };

  var showVariantImage = function(featuredImageId, newImage, imageIndex) {

    if (isPostBreakSmall()) {

      if (scrolledBelowProductImages() || !featuredImageEqualToFirstProductImages(featuredImageId)) {
        $('html, body').animate({
          scrollTop: $(newImage).offset().top
        }, 300);
      }

      return;
    }

    if (isProductImagesFlickity()) {
      cache.$productImages.flickity('select', imageIndex);
    }

  };

  var isProductMenuSlideoutOpen = function() {
    return cache.$productMenuSlideout.hasClass('is-open');
  };

  var productMenuSlideout = function() {
    cache.$openProductMenuSlideout.click(function(evt) {
      evt.preventDefault();
      cache.$productActions.addClass('is-product-menu-slideout-open');
      cache.$productMenuSlideout.addClass('is-open');
    });

    cache.$cloeseProductMenuSlideout.click(function(evt) {
      evt.preventDefault();
      closeProductMenuSlideout();
    })
  };

  var closeProductMenuSlideout = function() {
    cache.$productActions.removeClass('is-product-menu-slideout-open');
    cache.$productMenuSlideout.removeClass('is-open');
  };

  var productShareSlideout = function() {
    cache.$openProductShareSlideout.click(function(evt) {
      evt.preventDefault();

      var delay = false;

      if (isProductMenuSlideoutOpen()) {
        closeProductMenuSlideout();
        delay = true;
      }

      if (isNotificationOpen()) {
        closeNotification();
        delay = true;
      }

      cache.$productActions.addClass('is-product-share-slideout-open');

      if (delay) {
        setTimeout(function() {
          cache.$productShareSlideout.addClass('is-open');
        }, variables.milliseconds);
        return;
      }

      cache.$productShareSlideout.addClass('is-open');
    });

    cache.$closeProductShareSlideout.click(function(evt) {
      evt.preventDefault();
      cache.$productActions.removeClass('is-product-share-slideout-open');
      cache.$productShareSlideout.removeClass('is-open');
    });
  };

  var productImages = function() {
    if (!cache.$productImages.length) {
      return;
    }

    if (isPostBreakMedium()) {

      if (isProductImagesFlickity()) {
        cache.$productImages.flickity('destroy');
      }
      return;
    }

    if (!isProductImagesFlickity()) {
      cache.$productImages.flickity({
        accessibility: true,
        adaptiveHeight: true,
        cellAlign: 'left',
        cellSelector: '.product-images__item',
        friction: .8,
        imagesLoaded: true,
        pageDots: false,
        prevNextButtons: false,
        selectedAttraction: .2,
        wrapAround: true
      });
    }

  };

  var isProductImagesFlickity = function() {
    return cache.$productImages.hasClass('flickity-enabled')
  };

  var onResize = function() {
    cache.$window.resize(function() {
      productImages();
      stickyProductDetails();
    });
  };

  var stickyProductDetails = function() {
    if (isPostBreakSmall() && !cache.$productDetails.hasClass('is_stuck')) {
      cache.$productDetails.stick_in_parent({
        offset_top: 40
      });

      return;
    }

    if (cache.$productDetails.hasClass('is_stuck')) {
      cache.$productDetails.trigger('sticky_kit:detach');
    }
  };

  var relatedProductsSlider = function() {
    if (!cache.$relatedProducts.length) {
      return;
    }

    cache.$relatedProducts.flickity({
      cellSelector: '.product',
      contain: true,
      prevNextButtons: false,
      pageDots: false,
      selectedAttraction: .02,
      imagesLoaded: true
    });
  };

  var formOverride = function() {
    if (cache.$addToBag.length) {
      cache.$formContainer.on('submit', function(evt) {
        evt.preventDefault();
        ShopifyAPI.addItemFromForm(evt.target, onItemAdded, onItemError);
      });
    }
  };

  var onItemAdded = function(lineItem) {
    var source   = $("#ItemAdded").html(),
        template = Handlebars.compile(source),
        context = {
          quantity: lineItem.quantity,
          message: "{{ 'cart.general.item_added' | t }}",
          title: lineItem.title
        },
        html = template(context);

    cache.$productActions.addClass('is-item-added');

    if (isProductMenuSlideoutOpen()) {
      closeProductMenuSlideout();

      setTimeout(function() {
        notification('success', html);
      }, variables.milliseconds);

      return;
    }

    notification('success', html);
  };

  var onItemError = function(XMLHttpRequest, textStatus) {
    var data = eval('(' + XMLHttpRequest.responseText + ')');

    cache.$productActions.addClass('is-item-error');

    if (!!data.message) {
      if (data.status == 422) {
        if (isProductMenuSlideoutOpen()) {
          closeProductMenuSlideout();

          setTimeout(function() {
            notification('error', data.description);
          }, variables.milliseconds);

          return;
        }

        notification('error', data.description);
      }
    }
  };

  var isNotificationOpen = function() {
    return cache.$errorEl.hasClass('is-open');
  };

  var notification = function(type, message, callback) {
    var notificationClasses = 'notification notification--' + type,
        notificationTimeout,
        isOpenClass = 'is-open';

    cache.$errorEl.attr('class', notificationClasses);

    if (type === 'confirm') {
      var confirmOptions = '<br><a class="confirm-true" href="#">{{ "general.notification.yes" | t }}</a><a class="confirm-false" href="#">{{ "general.notification.no" | t }}</a>';

      cache.$errorTextEl.html(message + confirmOptions);
      cache.$errorEl.addClass(isOpenClass);

      cache.$errorEl.find('.confirm-true').click(function(e) {
        e.preventDefault();
        callback();
        cache.$errorEl.removeClass(isOpenClass);
        return true;
      });

      cache.$errorEl.find('.confirm-false').click(function(e) {
        e.preventDefault();
        cache.$errorEl.removeClass(isOpenClass);
        return false;
      });

    } else {
      cache.$errorTextEl.html(message);
      cache.$errorEl.addClass(isOpenClass);

      if (type === 'error') {
        clearTimeout(notificationTimeout);
        notificationTimeout = setTimeout(function() {
          closeNotification();
        }, 4000);
      }

    }

    cache.$closeNotification.click(function(evt) {
      evt.preventDefault();
      closeNotification();
    });

  };

  var closeNotification = function() {
    cache.$errorEl.removeClass('is-open');
    removeNotificationClassesFromProductActionsEle();
    removeNotificationClassesFromCartActionsEle();
  };

  var removeNotificationClassesFromCartActionsEle = function() {
    if (!cache.$cartActions.length) {
      return;
    }

    var cssClasses = [
      'is-qty-error'
    ];

    removeClassesFromEle(cssClasses, cache.$cartActions);

  };

  var removeClassesFromEle = function(cssClasses, $ele) {
    cssClasses.forEach(function(klass) {
      if ($ele.hasClass(klass)) {
        $ele.removeClass(klass);
      }
    });
  };

  var removeNotificationClassesFromProductActionsEle = function() {
    if (!cache.$productActions.length) {
      return;
    }

    var cssClasses = [
      'is-item-added',
      'is-item-error'
    ];

    removeClassesFromEle(cssClasses, cache.$productActions);

  };

  var shippingRatesSlideout = function() {
    cache.$openShippingRatesSlideout.click(function(evt) {
      evt.preventDefault();
      cache.$shippingRatesSlideout.addClass('is-open');
      cache.$cartActions.addClass('is-shipping-rates-slideout-open');
    });

    cache.$closeShippingRatesSlideout.click(function(evt) {
      evt.preventDefault();
      cache.$shippingRatesSlideout.removeClass('is-open');
      cache.$cartActions.removeClass('is-shipping-rates-slideout-open');
    });
  };

  return {
    init: init,
    productPage: productPage,
    notification: notification
  };
})(jQuery);

$(theme.init);
