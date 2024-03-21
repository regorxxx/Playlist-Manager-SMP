'use strict';
//20/03/24

/* global VK_CONTROL:readable, VK_ALT:readable, VK_SHIFT:readable, MK_LBUTTON:readable, MK_CONTROL:readable, MK_SHIFT:readable */
/* exported buttonStates, getKeyboardMask, dropEffect, dropMask, VK_LWIN, VK_RWIN, Flag */

const kMask = {
	none: 0,
	ctrl: 1,
	shift: 2,
	ctrlShift: 3,
	ctrlAlt: 4,
	ctrlAltShift: 5,
	alt: 6
};

const buttonStates = {
	normal: 0,
	hover: 1,
	down: 2,
	hide: 3
};

function getKeyboardMask() {
	const c = utils.IsKeyPressed(VK_CONTROL) ? true : false;
	const a = utils.IsKeyPressed(VK_ALT) ? true : false;
	const s = utils.IsKeyPressed(VK_SHIFT) ? true : false;
	let ret = kMask.none;
	if (c && !a && !s) { ret = kMask.ctrl; }
	if (!c && !a && s) { ret = kMask.shift; }
	if (c && !a && s) { ret = kMask.ctrlShift; }
	if (c && a && !s) { ret = kMask.ctrlAlt; }
	if (c && a && s) { ret = kMask.ctrlAltShift; }
	if (!c && a && !s) { ret = kMask.alt; }
	return ret;
}

const dropEffect = {
	none: 0,
	copy: 1,
	move: 2,
	link: 4,
	scroll: 0x80000000
};

const dropMask = { // on_drag_over, on_drag_leave, on_drag_over, on_drag_enter
	ctrl: MK_LBUTTON + MK_CONTROL,
	shift: MK_LBUTTON + MK_SHIFT,
	shiftCtrl: MK_LBUTTON + MK_CONTROL + MK_SHIFT
};

const VK_LWIN = 0x5B;
const VK_RWIN = 0x5C;

class Flag {
	constructor(value = 0) {
		this.value = value;
	}
	get() {
		return this.value;
	}
	set(value) {
		this.value = value;
		return this;
	}
	has(key, flags = []) { // To check for zero, if there are multiple zero flags, needs a list of flags to check against
		return key
			? ((this.value & key) === key)
			: flags && flags.length
				? !flags.filter(Boolean).some((f) => this.has(f))
				: this.value === key;
	}
	add(key) {
		if (key) { this.value |= key; }
		return this;
	}
	delete(key) {
		if (key) { this.value &= ~key; }
		return this;
	}
	toggle(key) {
		if (key) { this.has(key) ? this.delete(key) : this.add(key); }
		return this;
	}
}