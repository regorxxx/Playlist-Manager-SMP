'use strict';

const doc = new ActiveXObject('htmlfile');

function _getClipboardData() {
	return doc.parentWindow.clipboardData.getData('Text');
}

function _setClipboardData(value) {
	return doc.parentWindow.clipboardData.setData('Text', value.toString());
}