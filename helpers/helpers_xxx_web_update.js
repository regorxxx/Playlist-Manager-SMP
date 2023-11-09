'use strict';
//09/11/23

include('helpers_xxx_web.js');

function checkUpdate({repository = 'https://github.com/' + window.ScriptInfo.Author +'/' + window.ScriptInfo.Name.replace(/ /g,'-') + (window.ScriptInfo.Name.endsWith('-SMP') ? '' : '-SMP'), bDownload = false, bOpenWeb = true, bDisableWarning = true} = {}) {
	const bGithub = repository.includes('github.com');
	const versionURL = bGithub 
		? repository.replace('github.com', 'raw.githubusercontent.com').replace(/\/$/, '') + '/main/VERSION' 
		: repository;
	return getText(versionURL)
		.then((version) => {
			if (!compareVersions(window.ScriptInfo.Version, version.replace(/^v/i, ''))) {
				console.log('A new version has been found for ' + window.ScriptInfo.Name + ' panel: ' + version.replace(/^v/i, ''));
				const answer = WshShell.Popup('A new version is available: ' + version + (bGithub && bDownload ? '\nDownload?' : bOpenWeb ? '\nOpen script webpage?' : '') + (bDisableWarning ? '\n\n(Automatic update checking can be disabled at settings)' : ''), 0, window.Name, popup.info + popup.yes_no);
				const packageName = repository.replace(/\/$/, '').split('/').slice(-1)[0];
				if (bDownload && answer === popup.yes) {
					let file, fileURL;
					if (bGithub) {
						file = packageName + '-' + version.replace(/^v/i, '').replace(/\./g, '-') + '-package.zip';
						fileURL = repository.replace(/\/$/, '') + '/releases/latest/download/' +  file;
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
			if (typeof reason === 'object') {reason = reason.responseText || reason.status;}
			switch (reason) {
				case 12007: reason = 'Network error'; break;
				case '': reason = 'Uknown error'; break;
			}
			console.log('getText(): ' + reason + '\n\t' + versionURL);
			return false;
		});
}

if (typeof compareVersions === 'undefined') {
	this.compareVersions = function compareVersions(from, to, bNum = true) {
		if (typeof from === 'string') {from = from.split('.');}
		if (typeof to === 'string') {to = to.split('.');}
		if (bNum) {
			if (to.length > 3) {to.length = 3;}
			if (from.length > 3) {from.length = 3;}
		}
		for (let i = 0; i < to.length; ++i) {
			if (to[i] !== from[i]) {
				return to[i].localeCompare(from[i], void(0), {numeric: true}) < 0;
			}
		}
		return true;
	}
}

if (typeof WshShell === 'undefined') {
	this.WshShell = new ActiveXObject('WScript.Shell');
}