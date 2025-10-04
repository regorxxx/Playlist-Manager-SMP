'use strict';
//03/10/25

/* exported _zip, _unzip */

include('helpers_xxx.js');
/* global folders:readable, soFeat:readable */
include('helpers_xxx_prototypes.js');
/* global _q:readable, isArrayStrings:readable */
include('helpers_xxx_file.js');
/* global _runCmd:readable, _resolvePath:readable */

// NOSONAR [_zip(folders.xxx + 'test.txt','test.zip');]
// NOSONAR [_zip(['test.txt', 'test2.txt'], 'test.zip');]
function _zip(file, toPath, bAsync = false, relativePath = null, timeout = 0, cmdArgs) {
	const cmd = _q(folders.xxx + 'helpers-external\\7z\\' + (soFeat.x64 ? '7za' : '7za_32')+ '.exe') +
		' a -tzip ' + _q(_resolvePath(toPath)) + ' ' +
		(isArrayStrings(file) ? file.map((f) => _q(_resolvePath(f))).join(' ') : _q(_resolvePath(file))) +
		(cmdArgs ? ' ' + cmdArgs : '');
	let relCmd;
	if (timeout) {
		if (relativePath) {
			relCmd = 'CMD /Q /C' + _q('CD ' + _q(relativePath) + ' && TIMEOUT /T ' + timeout+ ' /NOBREAK >nul && ' +  cmd);
		} else {
			relCmd = 'CMD /Q /C ' + _q('TIMEOUT /T ' + timeout+ ' /NOBREAK >nul && ' +  cmd);
		}
	} else if (relativePath) {
		relCmd = 'CMD /Q /C ' + _q('CD ' + _q(relativePath) + ' && ' +  cmd);
	}
	_runCmd(relCmd || cmd, !(bAsync || timeout));
}

// NOSONAR [_unzip(folders.xxx + 'test.zip', folders.xxx + 'test\\');]
function _unzip(file, toPath, bAsync = false) {
	const cmd = '"' + folders.xxx + 'helpers-external\\7z\\' + (soFeat.x64 ? '7za' : '7za_32')+ '.exe" x "' + _resolvePath(file) + '" -o"' + _resolvePath(toPath) + '"';
	_runCmd(cmd, !bAsync);
}