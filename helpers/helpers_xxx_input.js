'use strict';
//29/11/22

// Helpers for input popup and checking proper values are provided
// Provides extensive error popups on output to give feedback to the user
// Returns null when default value (oldVal) matches output
// Ex input.json('array numbers', [0, 2], 'Input an Array of numbers:', 'Input', JSON.stringify([0, 2])),
const Input = Object.seal(Object.freeze({
	data: Object.seal({last: null, lastInput: null}),
	get isLastEqual() {
		return this.data.last === this.data.lastInput;
	},
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
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must pass these checks:\n' + checks.join('\n') + '\n\nExample:\n' + example, title);
			} else if (e.message !== 'InputBox failed:\nDialog window was closed') {
				fb.ShowPopupMessage(e.name + '\n\n' + e.message, title);
			}
			return null;
		}
		if (oldValStr === JSON.stringify(newVal)) {this.data.lastInput = newVal; return null;}
		return newVal;
	},
	number: function (type, oldVal, message, title, example, checks = []) {
		const types = new Set(['int', 'int positive', 'int negative', 'float', 'float positive', 'float negative']);
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
				case 'int': {
					break;
				}
				case 'int positive': {
					if (newVal < 0) {throw new Error('Invalid type');}
					break;
				}
				case 'int negative': {
					if (newVal > 0) {throw new Error('Invalid type');}
					break;
				}
				case 'float': {
					break;
				}
				case 'float positive': {
					if (newVal < 0) {throw new Error('Invalid type');}
					break;
				}
				case 'float negative': {
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
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must pass these checks:\n' + checks.join('\n') + '\n\nExample:\n' + example, title);
			} else if (e.message !== 'InputBox failed:\nDialog window was closed') {
				fb.ShowPopupMessage(e.name + '\n\n' + e.message, title);
			}
			return null;
		}
		if (oldVal === newVal) {this.data.lastInput = newVal; return null;}
		return newVal;
	},
	string: function (type, oldVal, message, title, example, checks = [], bFilterEmpty = false) {
		const types = new Set(['string']);
		this.data.last = oldVal; this.data.lastInput = null;
		if (!types.has(type)) {throw new Error('Invalid type: ' + type);}
		let input, newVal;
		try {
			input = utils.InputBox(window.ID, message, title, oldVal !== null && typeof oldVal !== 'undefined' ? oldVal : '', true);
			if (input === null || typeof input === 'undefined') {throw new Error('Invalid type');}
			else {newVal = String(input);}
			switch (type) {
				case 'string': {
					if (bFilterEmpty && !newVal.length) {throw new Error('Empty')}
					break;
				}
			}
			if (checks && checks.length  && !checks.some((check) => {return check.call(this, newVal);})) {
				throw new Error('Invalid checks');
			}
		}
		catch (e) {
			if (e.message === 'Invalid type' || e.name === 'SyntaxError') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must be an ' + type.toUpperCase() + '\n\nExample:\n' + example, title);
			} else if (e.message === 'Empty') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must be a non zero length string.\n\nExample:\n' + example, title);
			} else if (e.message === 'Invalid checks') {
				fb.ShowPopupMessage('Value is not valid:\n' + input + '\n\nValue must pass these checks:\n' + checks.join('\n') + '\n\nExample:\n' + example, title);
			} else if (e.message !== 'InputBox failed:\nDialog window was closed') {
				fb.ShowPopupMessage(e.name + '\n\n' + e.message, title);
			}
			return null;
		}
		if (oldVal === newVal) {this.data.lastInput = newVal; return null;}
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
			}
			return null;
		}
		if (oldVal === newVal) {this.data.lastInput = newVal; return null;}
		return newVal;
	}
}));