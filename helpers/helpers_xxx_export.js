﻿'use strict';
//25/09/25

/* exported exportSettings, importSettings */

include('helpers_xxx.js');
/* global folders:readable */
include('helpers_xxx_file.js');
/* global _isFile:readable, _save:readable, _explorer:readable, WshShell:readable, popup:readable, _deleteFile:readable, _deleteFolder:readable, _open:readable, utf8:readable, _isFolder:readable, _renameFolder:readable */
include('helpers_xxx_file_zip.js');
/* global _zip:readable, _unzip:readable */
include('helpers_xxx_input.js');
/* global Input:readable */
include('helpers_xxx_prototypes.js');
/* global _ps:readable */
include('helpers_xxx_properties.js');
/* global overwriteProperties:readable */

function exportSettings(properties, data = [], panelName = window.Name, toFile = null) {
	if (data && WshShell.Popup('Also export user global presets?\n\nFound at: ' + folders.userPresets, 0, panelName + _ps(window.ScriptInfo.Name) + ': Export panel settings', popup.question + popup.yes_no) === popup.yes) {
		data.push(folders.userPresets);
	}
	const bZip = data && data.length;
	if (!toFile) {
		toFile = Input.string(
			'file',
			folders.data + 'settings_' + window.Name.replace(/\s/g, '_') + (bZip ? '_' + new Date().toISOString().split('.')[0].replace(/[ :,]/g, '_') + '.zip' : '.json'),
			'File name:', panelName + ': Export panel settings',
			folders.data + 'settings' + (bZip ? '.zip' : '.json'),
			void (0), true
		) || (Input.isLastEqual ? Input.lastInput : null);
		if (toFile === null) { return null; }
	}
	const settings = JSON.stringify(
		properties,
		(key, val) => {
			if (Array.isArray(val)) {
				val.length = 2;
			}
			return val;
		},
		'\t'
	).replace(/\n/g, '\r\n');
	let bDone;
	if (bZip) {
		bDone = _save(folders.temp + 'settings.json', settings);
		if (bDone) {
			if (!data.includes(folders.temp + 'settings.json')) { data.push(folders.temp + 'settings.json'); }
			_zip(
				data.filter(Boolean),
				toFile,
				false,
				folders.data
			);
			bDone = _isFile(toFile);
		}
	} else if (_save(toFile, settings)) { bDone = true; }
	if (bDone) {
		console.log(panelName + ': exported panel settings to\n\t ' + toFile);
		_explorer(toFile);
	} else {
		console.popup(panelName + ': failed exporting panel settings.', window.Name + _ps(window.ScriptInfo.Name));
	}
	return bDone;
};

function importSettings(callbacks, currSettings, panelName = window.Name) {
	if (!callbacks) {
		callbacks = {
			onLoadSetting: (settings, bSettingsFound, panelName) => true, // eslint-disable-line no-unused-vars
			onUnzipData: (importPath, panelName) => true, // eslint-disable-line no-unused-vars
			onUnzipPresets: (importPath, panelName) => true, // eslint-disable-line no-unused-vars
			onUnzipDelete: (importPath, bDone, panelName) => true, // eslint-disable-line no-unused-vars
			onReload: (panelName) => true // eslint-disable-line no-unused-vars
		};
	}
	const input = Input.string('file', '', 'File name:\n\nPanel settings must be provided in a .json or .zip file.\n\nNote existing files associated to the panel may be overwritten.', panelName + ': import settings', '.\\profile\\js_data\\settings_' + panelName.replace(/\s/g, '') + '_2025-05-09T11_06_50.zip', void (0), true) || (Input.isLastEqual ? Input.lastInput : null);
	if (input === null) { return null; }
	let bDone;
	if (/\.zip$/i.test(input)) {
		const importPath = folders.temp + 'import\\';
		_deleteFolder(importPath);
		_unzip(input, importPath);
		if (_isFile(importPath + 'settings.json')) {
			const settings = JSON.parse(
				_open(importPath + 'settings.json', utf8),
				(key, val) => {
					return val === null
						? Infinity
						: val;
				}
			);
			if (callbacks.onLoadSetting && !callbacks.onLoadSetting(settings, true, panelName)) {
				console.popup(panelName + ': failed importing panel settings.', window.Name + _ps(window.ScriptInfo.Name));
				return false;
			}
			overwriteProperties(settings);
			_deleteFile(importPath + 'settings.json');
			console.log(panelName + ': imported panel settings');
		} else {
			if (callbacks.onLoadSetting && !callbacks.onLoadSetting(currSettings, false, panelName)) {
				console.popup(panelName + ': failed importing panel settings.', window.Name + _ps(window.ScriptInfo.Name));
				return false;
			}
			console.log(panelName + ': no panel settings file found (settings.json)');
		}
		if (callbacks.onUnzipData && !callbacks.onUnzipData(importPath, panelName)) {
			console.popup(panelName + ': failed importing data files.', window.Name + _ps(window.ScriptInfo.Name));
			return false;
		}
		if (_isFolder(importPath + 'presets\\')) {
			bDone = _renameFolder(folders.userPresets.replace(/\\$/gi, ''), importPath + 'back\\');
			if (bDone) {
				if (callbacks.onUnzipPresets && !callbacks.onUnzipPresets(importPath + 'presets\\', panelName)) {
					console.popup(panelName + ': failed importing user global presets.', window.Name + _ps(window.ScriptInfo.Name));
					bDone = false;
				}
				bDone = bDone && _renameFolder(importPath + 'presets', folders.data);
				if (bDone) {
					_deleteFolder(importPath + 'back\\presets');
					console.log(panelName + ': imported user global presets.', window.Name + _ps(window.ScriptInfo.Name));
				} else {
					if (_isFolder(folders.userPresets)) { _deleteFolder(folders.userPresets); }
					_renameFolder(importPath + 'back\\presets', folders.data);
					console.popup(panelName + ': failed importing user global presets.', window.Name + _ps(window.ScriptInfo.Name));
				}
			} else { console.popup(panelName + ': failed importing user global presets.', window.Name + _ps(window.ScriptInfo.Name)); }
		}
		if (bDone) { console.log(panelName + ': imported data files'); }
		if (callbacks.onUnzipDelete) { callbacks.onUnzipDelete(importPath + 'presets\\', bDone, panelName); }
		_deleteFolder(importPath);
		if (bDone) { console.log(panelName + ': imported panel settings + data files from\n\t ' + input); }
	} else {
		const settings = JSON.parse(
			_open(input, utf8),
			(key, val) => {
				return val === null
					? Infinity
					: val;
			}
		);
		if (callbacks.onLoadSetting && !callbacks.onLoadSetting(settings, true, panelName)) {
			console.popup(panelName + ': failed importing panel settings.', window.Name + _ps(window.ScriptInfo.Name));
			return false;
		}
		overwriteProperties(settings);
		console.log(panelName + ': imported panel settings from\n\t ' + input);
		bDone = true;
	}
	if (bDone && callbacks.onReload && !callbacks.onReload(panelName)) {
		console.popup(panelName + ': failed reloading panel.', window.Name + _ps(window.ScriptInfo.Name));
		return false;
	}
	if (bDone) { fb.ShowPopupMessage(panelName + ':\n\nSuccessfully imported panel settings from:\n' + input, window.Name + _ps(window.ScriptInfo.Name)); }
	console.log(panelName + ': reloading panel...');
	window.Reload();
}