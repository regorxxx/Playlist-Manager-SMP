'use strict';
//18/05/26

include('callbacks_xxx.js');

/* exported VolatileCache */

function VolatileCache(lifeSpan = 1000) {
	const cache = new Map();
	this.clear = () => {
		cache.clear();
		resetAutoClear(true);
	};
	this.clearTag = (key) => {
		cache.forEach((value) => {
			if (Object.hasOwn(value, key)) { delete value[key]; }
		});
		resetAutoClear();
	};
	this.clearRef = (ref) => {
		cache.forEach((entry, key) => {
			if (key === ref) { entry.values = null; cache.delete(ref); }
		});
		resetAutoClear();
	};
	this.set = (ref, newValues = {}) => {
		const curr = cache.get(ref) || { accessed: null, values: {} };
		curr.accessed = Date.now();
		for (const key in newValues) { curr.values[key] = newValues[key]; }
		cache.set(ref, curr);
		setAutoClear();
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
	let id = null;
	let eventListener = null;
	const autoClear = () => {
		const now = Date.now();
		cache.forEach((entry) => {
			if ((now - entry.accessed) > lifeSpan) { entry.values = {}; }
		});
	};
	const resetAutoClear = (force) => {
		if (force || !cache.size) {
			if (id !== null) {
				clearInterval(id);
				id = null;
			}
			if (eventListener !== null) {
				removeEventListener(eventListener.event, void (0), eventListener.id);
				eventListener = null;
			}
		}
	};
	const setAutoClear = () => {
		if (id === null) { id = setInterval(autoClear, lifeSpan); }
		if (eventListener === null) { eventListener = addEventListener('on_metadb_changed', () => this.clear()); }
	};
	Object.defineProperty(this, 'lifeSpan', {
		get: function () { return lifeSpan; },
		set: function (val) { lifeSpan = val; resetAutoClear(true); setAutoClear(); },
	});
}