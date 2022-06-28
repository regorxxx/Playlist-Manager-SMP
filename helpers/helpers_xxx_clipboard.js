'use strict';
//28/06/22

const doc = new ActiveXObject('htmlfile');

function _getClipboardData() {
	return utils.GetClipboardText ? utils.GetClipboardText() : doc.parentWindow.clipboardData.getData('Text');
}

function _setClipboardData(value) {
	return utils.SetClipboardText ?  utils.SetClipboardText(value.toString()) : doc.parentWindow.clipboardData.setData('Text', value.toString());
}