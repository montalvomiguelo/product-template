/*
 *
 * This is an updated version of the `option_selection.js` from
 * https://cdn.shopify.com/s/shopify/option_selection.js?e90f577220d8b5f6b4fa5679a9ae14e9a536abf5
 *
 * To support using radio buttons this version of the file has been
 * modified.
 *
 */

if ((typeof Shopify) == 'undefined') {
  var Shopify = {};
}

// ---------------------------------------------------------------------------
// Shopify generic helper methods
// ---------------------------------------------------------------------------
Shopify.each = function(ary, callback) {
  for (var i = 0; i < ary.length; i++) {
    callback(ary[i], i);
  }
};

Shopify.map = function(ary, callback) {
  var result = [];
  for (var i = 0; i < ary.length; i++) {
    result.push(callback(ary[i], i));
  }
  return result;
};

Shopify.arrayIncludes = function(ary, obj) {
  for (var i = 0; i < ary.length; i++) {
    if (ary[i] == obj) {
      return true;
    }
  }
  return false;
};

Shopify.uniq = function(ary) {
  var result = [];
  for (var i = 0; i < ary.length; i++) {
    if (!Shopify.arrayIncludes(result, ary[i])) { result.push(ary[i]); }
  }
  return result;
};

Shopify.isDefined = function(obj) {
  return ((typeof obj == 'undefined') ? false : true);
};

Shopify.getClass = function(obj) {
  return Object.prototype.toString.call(obj).slice(8, -1);
};

Shopify.extend = function(subClass, baseClass) {
  function inheritance() {}
  inheritance.prototype = baseClass.prototype;

  subClass.prototype = new inheritance();
  subClass.prototype.constructor = subClass;
  subClass.baseConstructor = baseClass;
  subClass.superClass = baseClass.prototype;
};

Shopify.urlParam = function(name) {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

// ---------------------------------------------------------------------------
// Shopify Product object
// JS representation of Product
// ---------------------------------------------------------------------------
Shopify.Product = function(json) {
  if (Shopify.isDefined(json)) { this.update(json); }
};

Shopify.Product.prototype.update = function(json) {
  for (property in json) {
    this[property] = json[property];
  }
};

// returns array of option names for product
Shopify.Product.prototype.optionNames = function() {
  if (Shopify.getClass(this.options) == 'Array') {
    return this.options;
  } else {
    return [];
  }
};

// returns array of all option values (in order) for a given option name index
Shopify.Product.prototype.optionValues = function(index) {
  if (!Shopify.isDefined(this.variants)) { return null; }
  var results = Shopify.map(this.variants, function(e) {
    var option_col = "option" + (index + 1);
    return (e[option_col] == undefined) ? null : e[option_col];
  });
  return (results[0] == null ? null : Shopify.uniq(results));
};

// return the variant object if exists with given values, otherwise return null
Shopify.Product.prototype.getVariant = function(selectedValues) {
  var found = null;
  if (selectedValues.length != this.options.length) { return found; }

  Shopify.each(this.variants, function(variant) {
    var satisfied = true;
    for (var j = 0; j < selectedValues.length; j++) {
      var option_col = "option"+(j+1);
      if (variant[option_col] != selectedValues[j]) {
        satisfied = false;
      }
    }
    if (satisfied == true) {
      found = variant;
      return;
    }
  });
  return found;
};

Shopify.Product.prototype.getVariantById = function(id) {
  for (var i = 0; i < this.variants.length; i++) {
    var variant = this.variants[i];

    if (id == variant.id) {
      return variant;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Money format handler
// ---------------------------------------------------------------------------
{% raw %}
Shopify.money_format = "${{amount}}";
{% endraw %}
Shopify.formatMoney = function(cents, format) {
  if (typeof cents == 'string') { cents = cents.replace('.',''); }
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = (format || this.money_format);

  function defaultOption(opt, def) {
    return (typeof opt == 'undefined' ? def : opt);
  }

  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ',');
    decimal   = defaultOption(decimal, '.');

    if (isNaN(number) || number == null) { return 0; };

    number = (number/100.0).toFixed(precision);

    var parts   = number.split('.');
    var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    var cents   = parts[1] ? (decimal + parts[1]) : '';

    return dollars + cents;
  }

  switch(formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
};

function floatToString(numeric, decimals) {
  var amount = numeric.toFixed(decimals).toString();
  if(amount.match(/^\.\d+/)) {return "0"+amount; }
  else { return amount; }
};
// ---------------------------------------------------------------------------
// OptionSelectors(domid, options)
//
// ---------------------------------------------------------------------------
Shopify.OptionSelectors = function(existingSelectorId, options) {
  this.radioDivClass = 'radio-wrapper';
  this.selectorClass = 'single-option-selector';
  this.radioClass = 'single-option-radio';
  this.variantIdFieldIdSuffix = '-variant-id';

  this.variantIdField    = null;
  this.historyState      = null;
  this.selectors         = [];
  this.domIdPrefix       = existingSelectorId;
  this.product           = new Shopify.Product(options.product);
  this.onVariantSelected = Shopify.isDefined(options.onVariantSelected) ? options.onVariantSelected : function(){};

  this.replaceSelector(existingSelectorId); // create the dropdowns
  this.initDropdown();

  if (options.enableHistoryState) {
    this.historyState = new Shopify.OptionSelectors.HistoryState(this);
  }

  return true;
};

Shopify.OptionSelectors.prototype.initDropdown = function () {
  var options = { initialLoad: true };
  var successDropdownSelection = this.selectVariantFromDropdown(options);

  if (!successDropdownSelection) {
    var self = this;
    setTimeout(function () {
      if (!self.selectVariantFromParams(options)) {
        self.fireOnChangeForFirstDropdown.call(self, options);
      }
    });
  }
};

Shopify.OptionSelectors.prototype.fireOnChangeForFirstDropdown = function (options) {
  this.selectors[0].element.onchange(options);
};

Shopify.OptionSelectors.prototype.selectVariantFromParamsOrDropdown = function (options) {
  var success = this.selectVariantFromParams(options)

  if (!success) {
    this.selectVariantFromDropdown(options);
  }
};

// insert new multi-selectors and hide original selector
Shopify.OptionSelectors.prototype.replaceSelector = function(domId) {
  var oldSelector = document.getElementById(domId);
  var parent = oldSelector.parentNode;
  Shopify.each(this.buildSelectors(), function(el) {
    parent.insertBefore(el, oldSelector);
  });
  oldSelector.style.display = 'none';
  this.variantIdField = oldSelector;
};

Shopify.OptionSelectors.prototype.selectVariantFromDropdown = function (options) {
  // get selected variant from hidden dropdown
  var option = document.getElementById(this.domIdPrefix).querySelector('[selected="selected"]');

  // If selected=selected is null, selected alone may exist (depending on DOM)
  if (!option) {
    option = document.getElementById(this.domIdPrefix).querySelector('[selected]');
  }

  if (!option) {
    return false;
  }

  var variantId = option.value;
  return this.selectVariant(variantId, options);
};

Shopify.OptionSelectors.prototype.selectVariantFromParams = function (options) {
  var variantId = Shopify.urlParam("variant");
  return this.selectVariant(variantId, options);
};

Shopify.OptionSelectors.prototype.selectVariant = function (variantId, options) {
  var variant  = this.product.getVariantById(variantId);

  if (variant == null) {
    return false;
  }

  for (var i = 0; i < this.selectors.length; i++) {
    var element = this.selectors[i].element;
    var optionName = element.getAttribute("data-option");
    var value = variant[optionName];
    if (value == null || !this.optionExistInSelect(element, value)) {
      continue;
    }
    if(element.tagName.toLowerCase() === 'select') {
      element.value = value;
    } else {
      //loop through radio button values
      for (var k = 0; k < element.childNodes.length; k++) {
        if (element.childNodes[k].value === value) {
          element.childNodes[k].checked = true;
        }
      }
    }
  }

  if (typeof jQuery !== 'undefined') {
    jQuery(this.selectors[0].element).trigger('change', options);
  } else {
    this.selectors[0].element.onchange(options);
  }

  return true;
};

Shopify.OptionSelectors.prototype.optionExistInSelect = function (element, value) {
  var length;
  var isSelect;
  var currentValue;

  //assign length if select or radio buttons
  if(element.tagName.toLowerCase() === 'select') {
    length = element.options.length;
    isSelect = true;
  } else {
    length = element.childNodes.length;
    isSelect = false;
  }

  for (var i = 0; i < length; i++) {
    if (isSelect) {
      currentValue = element.options[i].value;
    } else {
      currentValue  = element.childNodes[i].value;
    }

    if (currentValue = value) {
      return true;
    }
  }
};

// insertSelectors(domId, msgDomId)
// create multi-selectors in the given domId, and use msgDomId to show messages
Shopify.OptionSelectors.prototype.insertSelectors = function(domId, messageElementId) {
  if (Shopify.isDefined(messageElementId)) {
    this.setMessageElement(messageElementId);
  }

  this.domIdPrefix = "product-" + this.product.id + "-variant-selector";

  var parent = document.getElementById(domId);
  Shopify.each(this.buildSelectors(), function(el) {
    parent.appendChild(el);
  });
};

// buildSelectors(index)
// create and return new selector element for given option
Shopify.OptionSelectors.prototype.buildSelectors = function() {
  // build selectors

  for (var i = 0; i < this.product.optionNames().length; i++) {
    // Use radio buttons by default
    var buttons = new Shopify.SingleOptionRadio(this, i, this.product.optionNames()[i], this.product.optionValues(i));
    buttons.element.disabled = false;
    this.selectors.push(buttons);
  }

  // replace existing selector with new radio buttons, new hidden input field, new hidden messageElement
  var radioDivClass = this.radioDivClass;
  var optionNames = this.product.optionNames();
  var elements = Shopify.map(this.selectors, function(selector, i) {
    var div = document.createElement('div');
    div.setAttribute('class', radioDivClass);
    div.appendChild(selector.element);

    // create label if more than 1 option (ie: more than one drop down)
    if (optionNames.length > 1) {
      var label = document.createElement('label');
      label.setAttribute('class', 'single-option-radio__label');

      // create and append a label into div
      label.htmlFor = selector.element.id;
      label.innerHTML = selector.name;

      div.appendChild(label);
    }

    div.setAttribute('class', radioDivClass);
    div.appendChild(selector.element);

    return div;
  });

  return elements;
};

// Returns array of currently selected values from all multiselectors
Shopify.OptionSelectors.prototype.selectedValues = function() {
  var currValues = [];
  var currentSelector;
  var thisValue;

  for (var i = 0; i < this.selectors.length; i++) {
    currentSelector = this.selectors[i];
    if(currentSelector.element.tagName.toLowerCase() === 'select') {
      // Get selected value from select
      thisValue = currentSelector.element.value;
    } else {
      // Loop through radio button values
      for (var j = 0; j < currentSelector.element.childNodes.length; j++) {
        if (currentSelector.element.childNodes[j].checked === true || currentSelector.element.childNodes[j].status === true) {
          thisValue = currentSelector.element.childNodes[j].value;
        }
      }
    }

    currValues.push(thisValue);
  }
  return currValues;
};

// callback when a selector is updated.
Shopify.OptionSelectors.prototype.updateSelectors = function(index, options) {
  var currValues = this.selectedValues(); // get current values
  var variant = this.product.getVariant(currValues);

  if (variant) {
    this.variantIdField.disabled = false;
    this.variantIdField.value = variant.id; // update hidden selector with new variant id
  } else {
    this.variantIdField.disabled = true;
  }

  this.onVariantSelected(variant, this, options);  // callback

  if (this.historyState != null) {
    this.historyState.onVariantChange(variant, this, options);
  }
};

// ---------------------------------------------------------------------------
// OptionSelectorsFromDOM(domid, options)
//
// ---------------------------------------------------------------------------

Shopify.OptionSelectorsFromDOM = function(existingSelectorId, options){
  // build product json from selectors
  // create new options hash
  var optionNames = options.optionNames || [];
  var priceFieldExists = options.priceFieldExists || true;
  var delimiter = options.delimiter || '/';
  var productObj = this.createProductFromSelector(existingSelectorId, optionNames, priceFieldExists, delimiter);
  options.product = productObj;
  Shopify.OptionSelectorsFromDOM.baseConstructor.call(this, existingSelectorId, options);
};

Shopify.extend(Shopify.OptionSelectorsFromDOM, Shopify.OptionSelectors);

// updates the product_json from existing select element
Shopify.OptionSelectorsFromDOM.prototype.createProductFromSelector = function(domId, optionNames, priceFieldExists, delimiter) {
  if (!Shopify.isDefined(priceFieldExists)) { var priceFieldExists = true; }
  if (!Shopify.isDefined(delimiter)) { var delimiter = '/'; }

  var oldSelector = document.getElementById(domId);
  var options = oldSelector.childNodes;
  var parent = oldSelector.parentNode;
  var optionCount = optionNames.length;

  // build product json + messages array
  var variants = [];
  var self = this;
  Shopify.each(options, function(option, variantIndex) {
    if (option.nodeType == 1 && option.tagName.toLowerCase() == 'option') {
      var chunks = option.innerHTML.split(new RegExp('\\s*\\'+ delimiter +'\\s*'));

      if (optionNames.length == 0) {
        optionCount = chunks.length - (priceFieldExists ? 1 : 0);
      }

      var optionOptionValues = chunks.slice(0, optionCount);
      var message = (priceFieldExists ? chunks[optionCount] : '');
      var variantId = option.getAttribute('value');

      var attributes = {
        available: (option.disabled ? false : true),
        id:  parseFloat(option.value),
        price: message,
        option1: optionOptionValues[0],
        option2: optionOptionValues[1],
        option3: optionOptionValues[2]
      };
      variants.push(attributes);
    }
  });
  var updateObj = { variants: variants };
  if (optionNames.length == 0) {
    updateObj.options = [];
    for (var i=0;i<optionCount;i++) { updateObj.options[i] = ('option ' + (i + 1)) }
  } else {
    updateObj.options = optionNames;
  }
  return updateObj;
};

// ---------------------------------------------------------------------------
// SingleOptionRadio
// takes option name and values and creates a series of radio buttons from them
// ---------------------------------------------------------------------------
Shopify.SingleOptionRadio = function(multiSelector, index, name, values) {
  this.multiSelector = multiSelector;
  var selectors = this.multiSelector.selectors;
  this.values = values;
  this.index = index;
  this.name = name;
  this.element = document.createElement('fieldset');

  for (var i = 0; i < values.length; i++) {
    var radio = document.createElement('input');
    var label = document.createElement('label');

    //set radio button values
    radio.type = 'radio';
    radio.value = values[i];
    radio.setAttribute('name', name);
    radio.setAttribute('class', this.multiSelector.selectorClass + '__radio');
    radio.setAttribute('data-option', 'option' + (index+1));
    radio.id = multiSelector.domIdPrefix + '-option-' + name.replace(/\s/,'-') + '-' + values[i].replace(/\s/,'-');

    label.htmlFor = radio.id;
    label.innerHTML = values[i];

    if (!this.multiSelector.product.variants[i].available && this.multiSelector.product.options.length === 1) {
      $(radio).addClass('disabled').attr('disabled', 'disabled');
      $(label).addClass('disabled');
    }

    this.element.appendChild(radio);
    this.element.appendChild(label);
  }

  this.element.setAttribute('class', this.multiSelector.radioClass);
  this.element.setAttribute('data-option', 'option' + (index+1));
  this.element.name = name;
  this.element.id = multiSelector.domIdPrefix + '-option-' + index;
  this.element.onchange = function(event, options) {
    options = options || {};

    multiSelector.updateSelectors(index, options);
  };

  return true;
};

// ---------------------------------------------------------------------------
// Image.switchImage
// helps to switch variant images on variant selection
// ---------------------------------------------------------------------------
Shopify.Image = {

  preload: function (images, size) {
    for (var i=0; i < images.length; i++) {
      var image = images[i];

      this.loadImage(this.getSizedImageUrl(image, size));
    }
  },

  loadImage: function (path) {
    new Image().src = path;
  },

  switchImage: function (image, element, callback) {
    if (!image || !element) {
      return;
    }

    var size = this.imageSize(element.src)
    var imageUrl = this.getSizedImageUrl(image.src, size);

    if (callback) {
      callback(imageUrl, image, element);
    } else {
      element.src = imageUrl;
    }
  },

  imageSize: function (src) {
    var match = src.match(/_(1024x1024|2048x2048|pico|icon|thumb|small|compact|medium|large|grande)\./);

    if (match != null) {
      return match[1];
    } else {
      return null;
    }
  },

  getSizedImageUrl: function (src, size) {
    if (size == null) {
      return src;
    }

    if (size == 'master') {
      return this.removeProtocol(src);
    }

    var match  = src.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif)(\?v=\d+)?$/i);

    if (match != null) {
      var prefix = src.split(match[0]);
      var suffix = match[0];

      return this.removeProtocol(prefix[0] + "_" + size + suffix);
    } else {
      return null;
    }
  },

  removeProtocol: function (path) {
    return path.replace(/http(s)?:/, "");
  }
};

// ---------------------------------------------------------------------------
// Shopify.HistoryState
// Gets events from Push State
// ---------------------------------------------------------------------------

Shopify.OptionSelectors.HistoryState = function (optionSelector) {
  if (this.browserSupports()) {
    this.register(optionSelector);
  }
};

Shopify.OptionSelectors.HistoryState.prototype.register = function (optionSelector) {
  window.addEventListener("popstate", function(event) {
    optionSelector.selectVariantFromParamsOrDropdown({popStateCall: true});
  });
};

Shopify.OptionSelectors.HistoryState.prototype.onVariantChange = function (variant, selector, data) {
  if (this.browserSupports()) {
    if (variant && !data.initialLoad && !data.popStateCall) {
      window.history.replaceState({}, document.title, "?variant=" + variant.id);
    }
  }
};

Shopify.OptionSelectors.HistoryState.prototype.browserSupports = function () {
  return window.history && window.history.replaceState;
};
