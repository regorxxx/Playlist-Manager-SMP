
// https://github.com/angus-c/just


/*
  Deep clones all properties except functions
*/
function clone(obj) {
	if (typeof obj === 'function') {
		return obj;
	}
	let result = Array.isArray(obj) ? [] : {};
	for (let key in obj) {
		// include prototype properties
		let value = obj[key];
		let type = {}.toString.call(value).slice(8, -1);
		if (type === 'Array' || type === 'Object') {
			result[key] = clone(value);
		} else if (type === 'Date') {
			result[key] = new Date(value.getTime());
		} else if (type === 'RegExp') {
			result[key] = RegExp(value.source, getRegExpFlags(value));
		} else {
			result[key] = value;
	}
	}
	return result;
}

function getRegExpFlags(regExp) {
		if (typeof regExp.source.flags === 'string') {
		return regExp.source.flags;
	} else {
		let flags = [];
		regExp.global && flags.push('g');
		regExp.ignoreCase && flags.push('i');
		regExp.multiline && flags.push('m');
		regExp.sticky && flags.push('y');
		regExp.unicode && flags.push('u');
		return flags.join('');
	}
}

function randomString(len, charSet) {
	charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let randomString = '';
	for (let i = 0; i < len; i++) {
		let randomPoz = Math.floor(Math.random() * charSet.length);
		randomString += charSet.substring(randomPoz,randomPoz+1);
	}
	return randomString;
}