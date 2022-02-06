'use strict';
//28/12/21
include('helpers_xxx.js');
include('helpers_xxx_file.js');

/* 
	Instances Manager:
	Workaround to using window.notifyOthers with other panels. Functions on intervals/timeouts don't update 
	properly variables modified via callbacks, so the actual panels IDs must be read from files. 
	'removeInstance' must be called via 'on_script_unload' on every panel whenever a instance is logged
	using 'addInstance'. This ensures the file is empty of IDs when Foobar closes. Otherwise, the file
	is cleared on consecutive Foobar startups.
*/
folders.xxxInstances = folders.data + 'xxxInstances.json';
const instances = {};
instances.date = lastStartup().toString(); // Alternative to checking new startup via SDK?
instances.id = window.ID; // Could be changed to an arbitrary Id per panel

if (_isFile(folders.data + 'xxsInstances.json')) {_deleteFile(folders.data + 'xxsInstances.json');} // TODO remove on future versions

// Create file the first time and ensure the file is up to date (avoids old Ids on file from previously crashed instances)
if (!_isFile(folders.xxxInstances)) {_save(folders.xxxInstances, JSON.stringify({date: instances.date}, null, '\t'));}
else {
	const newInstances = getInstances();
	if (!newInstances || !newInstances.hasOwnProperty('date') || instances.date !== newInstances.date) {
		_deleteFile(folders.xxxInstances);
		_save(folders.xxxInstances, JSON.stringify({date: instances.date}, null, '\t'));
	}
}

function addInstance(newKey = window.Name) {
	const newInstances = getInstances();
	let bDone = false;
	if (newInstances) {
		if (newInstances.hasOwnProperty(newKey)) {newInstances[newKey].add(instances.id); bDone = true;}
		else {newInstances[newKey] =  new Set([instances.id]); bDone = true;}
	}
	if (bDone) {_save(folders.xxxInstances, JSON.stringify(newInstances, (k, v) => {return SetReplacer(null, v);}, '\t'));}
	return bDone;
}

function getInstances() {
	const newInstances = _jsonParseFileCheck(folders.xxxInstances, 'Instances json file', void(0), convertCharsetToCodepage('UTF-8'));
	if (newInstances) {
		for (let key of Object.keys(newInstances)) {if (key !== 'date') {newInstances[key] = new Set(newInstances[key]);}}
	}
	return newInstances;
}

function getInstancesByKey(key = window.Name) {
	return getInstances()[key] || [];
}

function removeInstance(key = window.Name) {
	const newInstances = getInstances();
	let bDone = false;
	if (newInstances && newInstances.hasOwnProperty(key) && newInstances[key].has(instances.id)) {
		newInstances[key].delete(instances.id);
		if (newInstances[key].size === 0) {delete newInstances[key];}
		bDone = true;
	}
	if (bDone) {_save(folders.xxxInstances, JSON.stringify(newInstances, (k, v) => {return SetReplacer(null, v);}, '\t'));}
	return bDone;
}