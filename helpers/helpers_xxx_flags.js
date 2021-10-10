'use strict';
//07/10/21

const KMask = {
	none: 0,
	ctrl: 1,
	shift: 2,
	ctrlshift: 3,
	ctrlalt: 4,
	ctrlaltshift: 5,
	alt: 6
};

const ButtonStates = {
	normal: 0,
	hover: 1,
	down: 2,
	hide: 3
};

function GetKeyboardMask() {
	var c = utils.IsKeyPressed(VK_CONTROL) ? true : false;
	var a = utils.IsKeyPressed(VK_ALT) ? true : false;
	var s = utils.IsKeyPressed(VK_SHIFT) ? true : false;
	var ret = KMask.none;
	if (c && !a && !s)
		ret = KMask.ctrl;
	if (!c && !a && s)
		ret = KMask.shift;
	if (c && !a && s)
		ret = KMask.ctrlshift;
	if (c && a && !s)
		ret = KMask.ctrlalt;
	if (c && a && s)
		ret = KMask.ctrlaltshift;
	if (!c && a && !s)
		ret = KMask.alt;
	return ret;
};