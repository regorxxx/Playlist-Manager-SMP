'use strict';
//10/12/23

// Helpers for input popup and checking proper values are provided
// Provides extensive error popups on output to give feedback to the user
// Returns null when default value (oldVal) matches output
// Ex input.json('array numbers', [0, 2], 'Input an Array of numbers:', 'Input', JSON.stringify([0, 2])),
const Input = Object.seal(Object.freeze({
	// Data validation
	data: Object.seal({last: null, lastInput: null}),
	get isLastEqual() {
		if (typeof this.data.last === 'object') {
			return (JSON.stringify(this.data.last) === JSON.stringify(this.data.lastInput));
		} else {
			return (this.data.last === this.data.lastInput);
		}
	},
	get lastInput() {
		return this.data.lastInput;
	},
	get previousInput() {
		return this.data.last;
	},
	// Input methods
	json: function (type, oldVal, message, title, example, checks = [], bFilterFalse = false) {
		const types = new Set(['array', 'array numbers', 'array strings', 'array booleans', 'object']);
		this.data.last = oldVal; this.data.lastInput = null;
		if (!types.has(type)) {throw new Error('Invalid type: ' + type);}
		let input, newVal;
		const oldValStr = JSON.stringify(oldVal);
		try {
			input = utils.InputBox(window.ID, message, title, oldVal ? JSON.stringify(oldVal) : '', true);
			if (!input || typeof input === 'string' && !input.length) {throw new Error('Invalid type');}
			else {newVal = JSON.parse(input);}
			if (typeof newVal !== 'object') {throw new Error('Invalid type');}
			if (type.startsWith('array') && !Array.isArray(newVal)) {throw new Error('Invalid type');}
			switch (type) {
				case 'array': {
					newVal = bFilterFalse
						? newVal.filter((n) => n)
						: newVal.filter((n) => (n === '' || n === 0 || n));
					break;
				}
				case 'array numbers': {
					newVal = newVal.map((n) => Number(n));
					newVal = bFilterFalse
						? newVal.filter((n) => n)
						: newVal.filter((n) => (n === 0 || n));
					break;
				}
				case 'array strings': {
					newVal = newVal.map((n) => String(n));
					newVal = bFilterFalse
						? newVal.filter((n) => n)
						: newVal.filter((n) => (n === '' || n));
					break;
				}
				case 'array booleans': {
					newVal = newVal.map((n) => Boolean(n));
					if (bFilterFalse) {newVal = newVal.filter((n) => n);}
					break;
				}
				case 'object': {
					if (Array.isArray(newVal)) {throw new Error('Invalid type');}
					break;
				}
			}
			if (checks && checks.length) {
				if (type.startsWith('array')) {
					if (!newVal.some((row) => {return !checks.some((check) => {return check.call(this, row);});})) {
						throw new Error('Invalid checks');
					}
				} else if (type.startsWith('object')) { 
					for (let key in newVal) {
						if (!checks.some((check) => {return check.call(this, newVal[key]);})) {
							throw new Error('Invalid checks');
						}
					}
				}
			}
		}
		catch (e) {
			if (e.message === 'Invalid type' || e.name === 'SyntaxError') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must be an ' + type.toUpperCase() + '\n\nExample:\n' + example, title);
			} else if (e.message === 'Invalid checks') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must pass these checks:\n' + checks.map(f => this.cleanCheck(f)).join('\n') + '\n\nExample:\n' + example, title);
			} else if (e.message !== 'InputBox failed:\nDialog window was closed') {
				fb.ShowPopupMessage(e.name + '\n\n' + e.message, title);
			}
			return null;
		}
		this.data.lastInput = newVal;
		if (oldValStr === JSON.stringify(newVal)) {return null;}
		return newVal;
	},
	number: function (type, oldVal, message, title, example, checks = []) {
		const types = new Set(['int', 'int positive', 'int negative', 'float', 'float positive', 'float negative', 'real', 'real positive', 'real negative']);
		this.data.last = oldVal; this.data.lastInput = null;
		if (!types.has(type)) {throw new Error('Invalid type: ' + type);}
		let input, newVal;
		try {
			input = utils.InputBox(window.ID, message, title, oldVal !== null && typeof oldVal !== 'undefined' ? oldVal : '', true);
			if (input === null || typeof input === 'undefined' || typeof input === 'string' && !input.length) {throw new Error('Invalid type');}
			else {newVal = Number(input);}
			if (newVal.toString() !== input) {throw new Error('Invalid type');} // No fancy number checks, just allow proper input
			if (type.startsWith('int') && Number.isFinite(newVal) && !Number.isInteger(newVal)) {throw new Error('Invalid type');}
			else if (type.startsWith('float') && Number.isFinite(newVal) && Number.isInteger(newVal)) {throw new Error('Invalid type');}
			switch (type) {
				case 'float':
				case 'real':
				case 'int': {
					break;
				}
				case 'float positive':
				case 'real positive':
				case 'int positive': {
					if (newVal < 0) {throw new Error('Invalid type');}
					break;
				}
				case 'float negative':
				case 'real negative':
				case 'int negative': {
					if (newVal > 0) {throw new Error('Invalid type');}
					break;
				}
			}
			if (checks && checks.length && !checks.some((check) => {return check.call(this, newVal);})) {
				throw new Error('Invalid checks');
			}
		}
		catch (e) {
			if (e.message === 'Invalid type' || e.name === 'SyntaxError') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must be an ' + type.toUpperCase() + '\n\nExample:\n' + example, title);
			} else if (e.message === 'Invalid checks') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must pass these checks:\n' + checks.map(f => this.cleanCheck(f)).join('\n') + '\n\nExample:\n' + example, title);
			} else if (e.message !== 'InputBox failed:\nDialog window was closed') {
				fb.ShowPopupMessage(e.name + '\n\n' + e.message, title);
			}
			return null;
		}
		this.data.lastInput = newVal;
		if (oldVal === newVal) {return null;}
		return newVal;
	},
	string: function (type, oldVal, message, title, example, checks = [], bFilterEmpty = false) {
		const types = new Set(['string', 'unicode']);
		this.data.last = oldVal; this.data.lastInput = null;
		if (!types.has(type)) {throw new Error('Invalid type: ' + type);}
		let input, newVal;
		let uOldVal = null;
		if (type === 'unicode') {uOldVal = oldVal.split(' ').map((s) =>  s !== '' ? s.codePointAt(0).toString(16) : '').join(' ');}
		try {
			input = utils.InputBox(window.ID, message, title, oldVal !== null && typeof oldVal !== 'undefined' ? uOldVal || oldVal : '', true);
			if (input === null || typeof input === 'undefined') {throw new Error('Invalid type');}
			else {newVal = String(input);}
			switch (type) {
				case 'string': {
					if (bFilterEmpty && !newVal.length) {throw new Error('Empty')}
					break;
				}
				case 'unicode': { // https://www.rapidtables.com/code/text/unicode-characters.html
					if (bFilterEmpty && !newVal.length) {throw new Error('Empty')}
					newVal = newVal.split(' ').map((s) => s !== '' ? String.fromCharCode(parseInt(s, 16)) : '').join(' ');
					break;
				}
			}
			if (checks) {
				if (!Array.isArray(checks)) {
					throw new Error('Invalid checks argument');
				} else if (checks.length && !checks.some((check) => {return check.call(this, newVal);})) {
					throw new Error('Invalid checks');
				}
			}
		}
		catch (e) {
			if (e.message === 'Invalid type' || e.name === 'SyntaxError') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must be an ' + type.toUpperCase() + '\n\nExample:\n' + example, title);
			} else if (e.message === 'Empty') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must be a non zero length string.\n\nExample:\n' + example, title);
			} else if (e.message === 'Invalid checks argument') {
				fb.ShowPopupMessage('Checks is not an array:\n' + checks, title);
			} else if (e.message === 'Invalid checks') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must pass these checks:\n' + checks.map(f => this.cleanCheck(f)).join('\n') + '\n\nExample:\n' + example, title);
			} else if (e.message !== 'InputBox failed:\nDialog window was closed') {
				fb.ShowPopupMessage(e.name + '\n\n' + e.message, title);
			}
			return null;
		}
		this.data.lastInput = newVal;
		if (oldVal === newVal) {return null;}
		return newVal;
	},
	query: function (oldVal, message, title, example, checks = [], bFilterEmpty = false) {
		let newVal;
		this.data.last = oldVal; this.data.lastInput = null;
		try {
			newVal = this.string('string', oldVal, message, title, example);
			if (newVal === null) {throw new Error('Invalid string');}
			if (!newVal.length && bFilterEmpty) {newVal = 'ALL';}
			try {fb.GetQueryItems(new FbMetadbHandleList(), newVal);} // Sanity check
			catch (e) {throw new Error('Invalid query');}
			if (bFilterEmpty && fb.GetQueryItems(fb.GetLibraryItems(), newVal).Count === 0) {throw new Error('Zero items query');}
			if (checks && checks.length  && !checks.some((check) => {return check.call(this, newVal);})) {
				throw new Error('Invalid checks');
			}
		}
		catch (e) {
			if (e.message === 'Invalid query') {
				fb.ShowPopupMessage('Query not valid:\n' + input + '\n\nValue must follow query syntax:\nhttps://wiki.hydrogenaud.io/index.php?title=Foobar2000:Query_syntax', title);
			} else if (e.message === 'Zero items query') {
				fb.ShowPopupMessage('Query returns no items (on current library):\n' + input, title);
			} else if (e.message === 'Invalid checks') {
				fb.ShowPopupMessage('Query is not valid:\n' + input + '\n\nQuery must pass these checks:\n' + checks.map(f => this.cleanCheck(f)).join('\n') + '\n\nExample:\n' + example, title);
			} else if (e.message !== 'InputBox failed:\nDialog window was closed') {
				fb.ShowPopupMessage(e.name + '\n\n' + e.message, title);
			}
			return null;
		}
		this.data.lastInput = newVal;
		if (oldVal === newVal) {return null;}
		return newVal;
	},
	// Internal helpers
	cleanCheck: function (func) {
		return func.toString().replace(/^[^{]*{\s*/, '').replace(/\s*}[^}]*$/,'').replace(/^.*=> /, '');
	}
}));