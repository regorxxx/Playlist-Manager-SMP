'use strict';
//17/12/23

/* exported exportDSP, exportDevices, exportComponents */

include('helpers_xxx.js');
/* global folders:readable */
include('helpers_xxx_file.js');
/* global _isFolder:readable, _save:readable, _jsonParseFile:readable, utf8:readable */
folders.ajquery = fb.ProfilePath + 'foo_httpcontrol_data\\ajquery-xxx\\';
folders.ajquerySMP = folders.ajquery  + 'SMP\\';
folders.ajqueryCheck = () => {return utils.CheckComponent('foo_httpcontrol') && _isFolder(folders.ajquery);};

// Global scope
function exportDSP(path) {
	const data = JSON.parse(fb.GetDSPPresets()); // Reformat with tabs
	return _save(path + 'dsp.json', JSON.stringify(data, null, '\t'));
}

function exportDevices(path) {
	const data = JSON.parse(fb.GetOutputDevices()); // Reformat with tabs
	return _save(path + 'devices.json', JSON.stringify(data, null, '\t'));
}
function exportComponents(path, newEntries /*{key: val, ...*/) {
	const data = _jsonParseFile(path + 'components.json', utf8) || {};
	['foo_run_main', 'foo_runcmd', 'foo_quicksearch', 'foo_youtube'].forEach((key) => {
		data[key] = utils.CheckComponent(key, true);
	});
	for (let key in newEntries) {data[key] = newEntries[key];}
	return _save(path + 'components.json', JSON.stringify(data, null, '\t'));
}