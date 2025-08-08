﻿'use strict';
//07/08/25

/* exported checkUpdate */

include('helpers_xxx.js');
/* global folders:readable, compareVersions:readable */
include('helpers_xxx_prototypes.js');
/* global _q:readable, _explorer:readable, _runCmd:readable, popup:readable */
include('helpers_xxx_file.js');
/* global WshShell:readable */
include('helpers_xxx_web.js');
/* global downloadText:readable */

function checkUpdate({
	scriptName = window.ScriptInfo.Name,
	repository = 'https://github.com/' + window.ScriptInfo.Author + '/' + scriptName.replace(/ /g, '-') + (scriptName.endsWith('-SMP') ? '' : '-SMP'),
	version = window.ScriptInfo.Version,
	bDownload = false,
	bOpenWeb = true,
	bDisableWarning = true
} = {}) {
	const bGithub = repository.startsWith('https://github.com/');
	const versionURL = bGithub
		? repository.replace('github.com', 'raw.githubusercontent.com').replace(/\/$/, '') + '/main/VERSION'
		: repository;
	return downloadText(versionURL)
		.then((lastVersion) => {
			if (!compareVersions(version, lastVersion.replace(/^v/i, ''))) {
				console.log('A new version has been found for ' + scriptName + ' script: ' + lastVersion.replace(/^v/i, ''));
				const nameIsUUID = /{.{8}-.{4}-.{4}-.{4}-.{12}}/.test(window.Name);
				const answer = WshShell.Popup('A new version is available: ' + lastVersion + (bGithub && bDownload ? '\nDownload?' : bOpenWeb ? '\nOpen script webpage?' : '') + (bDisableWarning ? '\n\n(Automatic update checking can be disabled at settings)' : ''), 0, nameIsUUID ? scriptName : window.Name + ': ' + scriptName, popup.info + popup.yes_no);
				const packageName = repository.replace(/\/$/, '').split('/').slice(-1)[0];
				if (bDownload && answer === popup.yes) {
					let file, fileURL;
					if (bGithub) {
						file = packageName + '-' + lastVersion.replace(/^v/i, '').replace(/\./g, '-') + '-package.zip';
						fileURL = repository.replace(/\/$/, '') + '/releases/latest/download/' + file;
					}
					const output = folders.xxx + 'packages\\' + file;
					_runCmd('CMD /C ' + folders.xxx + '\\helpers-external\\curl\\curl.exe -L -o ' + output + ' ' + fileURL + ' & ECHO. & ECHO File downloaded to ' + _q(output) + ' & ECHO A new window will show the file' + (bOpenWeb ? ' and the browser the release page' : '') + ' & ECHO Press any key to exit & EXPLORER /SELECT,' + output + ' & PAUSE>nul', false, 1);
				}
				if (bOpenWeb && answer === popup.yes) {
					if (bGithub) {
						_explorer(repository.replace(/\/$/, '') + '/releases/latest/');
					} else {
						_explorer(repository);
					}
				}
				return true;
			}
			return false;
		}).catch((reason) => {
			if (typeof reason === 'object') { reason = reason.responseText || reason.status; }
			switch (reason) {
				case 12007: reason = 'Network error'; break;
				case '': reason = 'Unknown error'; break;
			}
			console.log('downloadText(): ' + reason + '\n\t ' + versionURL);
			return false;
		});
}