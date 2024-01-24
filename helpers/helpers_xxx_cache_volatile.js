'use strict';
//23/01/24

/* exported VolatileCache */

function VolatileCache(lifeSpan = 1000) {
	const cache = new Map();
	this.clear = () => cache.clear();
	this.clearTag = (key) => {
		cache.forEach((value) => {
			if (Object.hasOwn(value, key)) { delete value[key]; }
		});
	};
	this.clearRef = (ref) => {
		cache.forEach((entry, key) => {
			if (key === ref) { entry.values = null; cache.delete(ref); }
		});
	};
	this.set = (ref, newValues = {}) => {
		const curr = cache.get(ref) || { accessed: null, values: {} };
		curr.accessed = Date.now();
		for (const key in newValues) { curr.values[key] = newValues[key]; }
		cache.set(ref, curr);
		return this;
	};
	this.get = (ref, keysArr) => {
		const now = Date.now();
		let values;
		const curr = cache.get(ref);
		if (curr && ((now - curr.accessed) < lifeSpan)) {
			curr.accessed = now;
			if (!keysArr || !keysArr.length) {
				values = {};
				for (const key in curr.values) { values[key] = curr.values[key].slice(); }
			} else {
				if (keysArr.some((key) => Object.hasOwn(curr.values, key))) { values = {}; }
				for (const key of keysArr) { values[key] = curr.values[key].slice(); }
			}
		}
		return values;
	};
	// Auto-clear
	const clear = () => {
		const now = Date.now();
		cache.forEach((entry) => {
			if ((now - entry.accessed) > lifeSpan) { entry.values = {};}
		});
	};
	let id = setInterval(clear, lifeSpan);
	Object.defineProperty(this, 'lifeSpan', {
		get: function () { return lifeSpan; },
		set: function (val) { lifeSpan = val; clearInterval(id); setInterval(clear, lifeSpan); },
	});
}