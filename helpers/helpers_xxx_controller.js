'use strict';
//14/09/22

include('helpers_xxx_file.js');

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
	const data = _jsonParseFile(path + 'components.json', utf8);
	['foo_run_main', 'foo_runcmd', 'foo_quicksearch', 'foo_youtube'].forEach((key) => {
		data[key] = utils.CheckComponent(key, true);
	});
	for (let key in newEntries) {data[key] = newEntries[key];}
	return _save(path + 'components.json', JSON.stringify(data, null, '\t'));
}
						