// Source: http://jsfiddle.net/vWx8V/
// http://stackoverflow.com/questions/5603195/full-list-of-javascript-keycodes

/**
 * Conenience method returns corresponding value for given keyName or keyCode.
 *
 * @param {Mixed} keyCode {Number} or keyName {String}
 * @return {Mixed}
 * @api public
 */

function keyCode(searchInput) {
  // Keyboard Events
  if (searchInput && 'object' === typeof searchInput) {
    let hasKeyCode = searchInput.which || searchInput.keyCode || searchInput.charCode;
    if (hasKeyCode) {searchInput = hasKeyCode;}
  }

  // Numbers
  if ('number' === typeof searchInput) {return keyCode.names[searchInput];}

  // Everything else (cast to string)
  let search = String(searchInput);

  // check codes
  let foundNamedKey = keyCode.codes[search.toLowerCase()];
  if (foundNamedKey) {return foundNamedKey;}

  // check aliases
  foundNamedKey = keyCode.aliases[search.toLowerCase()];
  if (foundNamedKey) {return foundNamedKey;}

  // weird character?
  if (search.length === 1) {return search.charCodeAt(0);}

  return void(0);
};

/**
 * Compares a keyboard event with a given keyCode or keyName.
 *
 * @param {Event} event Keyboard event that should be tested
 * @param {Mixed} keyCode {Number} or keyName {String}
 * @return {Boolean}
 * @api public
 */
keyCode.isEventKey = function isEventKey(event, nameOrCode) {
  if (event && 'object' === typeof event) {
    let keyCode = event.which || event.keyCode || event.charCode;
    if (keyCode === null || keyCode === undefined) { return false; }
    if (typeof nameOrCode === 'string') {
      // check codes
      let foundNamedKey = keyCode.codes[nameOrCode.toLowerCase()];
      if (foundNamedKey) { return foundNamedKey === keyCode; }
    
      // check aliases
      foundNamedKey = keyCode.aliases[nameOrCode.toLowerCase()];
      if (foundNamedKey) { return foundNamedKey === keyCode; }
    } else if (typeof nameOrCode === 'number') {
      return nameOrCode === keyCode;
    }
    return false;
  }
};

/**
 * Get by name
 *
 *   exports.code['enter'] // => 13
 */

keyCode.codes = {
  'backspace': 8,
  'tab': 9,
  'enter': 13,
  'shift': 16,
  'ctrl': 17,
  'alt': 18,
  'pause/break': 19,
  'caps lock': 20,
  'esc': 27,
  'space': 32,
  'page up': 33,
  'page down': 34,
  'end': 35,
  'home': 36,
  'left': 37,
  'up': 38,
  'right': 39,
  'down': 40,
  'insert': 45,
  'delete': 46,
  'command': 91,
  'left command': 91,
  'right command': 93,
  'numpad *': 106,
  'numpad +': 107,
  'numpad -': 109,
  'numpad .': 110,
  'numpad /': 111,
  'num lock': 144,
  'scroll lock': 145,
  'my computer': 182,
  'my calculator': 183,
  ';': 186,
  '=': 187,
  ',': 188,
  '-': 189,
  '.': 190,
  '/': 191,
  '`': 192,
  '[': 219,
  '\\': 220,
  ']': 221,
  "'": 222
};

// Helper aliases

keyCode.aliases = {
  'windows': 91,
  '⇧': 16,
  '⌥': 18,
  '⌃': 17,
  '⌘': 91,
  'ctl': 17,
  'control': 17,
  'option': 18,
  'pause': 19,
  'break': 19,
  'caps': 20,
  'return': 13,
  'escape': 27,
  'spc': 32,
  'spacebar': 32,
  'pgup': 33,
  'pgdn': 34,
  'ins': 45,
  'del': 46,
  'cmd': 91
};

/*!
 * Programatically add the following
 */

// lower case chars
for (let i = 97; i < 123; i++) {keyCode.codes[String.fromCharCode(i)] = i - 32;}

// numbers
for (let i = 48; i < 58; i++) {keyCode.codes[i - 48] = i;}

// function keys
for (let i = 1; i < 13; i++) {keyCode.codes['f'+i] = i + 111;}

// numpad keys
for (let i = 0; i < 10; i++) {keyCode.codes['numpad '+i] = i + 96;}

/**
 * Get by code
 *
 *   exports.name[13] // => 'Enter'
 */

keyCode.names = {}; // title for backward compat

// Create reverse mapping
for (let i in keyCode.codes) {keyCode.names[keyCode.codes[i]] = i;}

// Add aliases
for (let alias in keyCode.aliases) {
  keyCode.codes[alias] = keyCode.aliases[alias];
}
