var theme = (function($) {
  'use strict';

  var variables = {
    mediaQuerySmall: 668,
    mediaQueryMedium: 800
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
    $closeShare: $('#CloseShare'),
    $openProductShareSlideout: $('.js-product-share-slideout-open'),
    $productShareSlideout: $('#ProductShareSlideout'),
    $productMenuSlideout: $('#ProductMenuSlideout'),
    $productImages: $('#ProductImages'),
    $productActions: $('#ProductActions'),
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

      if (isProductMenuSlideoutOpen()) {
        closeProductMenuSlideout();
      }

      if (isNotificationOpen()) {
        closeNotification();
      }

      cache.$productActions.addClass('is-product-share-slideout-open');
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
        ShopifyAPI.addItemFromForm(evt.target, onItemAdded);
      });
    }
  };

  var onItemAdded = function(lineItem) {
    if (isProductMenuSlideoutOpen()) {
      closeProductMenuSlideout();
    }
    notification('success', lineItem.title + ' was added to your shopping cart.');
  };

  var isNotificationOpen = function() {
    return cache.$errorEl.hasClass('is-open');
  };

  var notification = function(type, message, callback) {
    var notificationClasses = 'notification ' + type,
        notificationTimeout,
        isOpenClass = 'is-open';

    cache.$errorEl.attr('class', notificationClasses);

    if (type === 'confirm') {
      var confirmOptions = '<br><a class="confirm-true" href="#">Yes</a><a class="confirm-false" href="#">No</a>';

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

      // clearTimeout(notificationTimeout);
      // notificationTimeout = setTimeout(function() {
      //   $errorEl.removeClass(isOpenClass);
      // }, 4000);
    }

    cache.$closeNotification.click(function(evt) {
      evt.preventDefault();
      closeNotification();
    });

  };

  var closeNotification = function() {
    cache.$errorEl.removeClass('is-open');
  };

  return {
    init: init,
    productPage: productPage,
    notification: notification
  };
})(jQuery);

$(theme.init);
