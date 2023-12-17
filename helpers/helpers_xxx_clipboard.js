'use strict';
//17/12/23

/* exported _getClipboardData, _setClipboardData */

const doc = new ActiveXObject('htmlfile');

function _getClipboardData() {
	return utils.GetClipboardText ? utils.GetClipboardText() : doc.parentWindow.clipboardData.getData('Text');
}

function _setClipboardData(value) {
	return utils.SetClipboardText ?  utils.SetClipboardText(value.toString()) : doc.parentWindow.clipboardData.setData('Text', value.toString());
}