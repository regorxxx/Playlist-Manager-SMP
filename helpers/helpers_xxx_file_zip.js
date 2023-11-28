'use strict';
//27/11/23

include('helpers_xxx.js');
include('helpers_xxx_file.js');

// _zip(folders.xxx + 'test.txt','test.zip');
// _zip(['test.txt', 'test2.txt'], 'test.zip');
function _zip(file, toPath, bAsync = false, relativePath = null) {
	const cmd = _q(folders.xxx + 'helpers-external\\7z\\' + (soFeat.x64 ? '7za' : '7za_32')+ '.exe') + ' a -tzip ' + _q(toPath) + ' ' + (isArrayStrings(file) ? file.map((f) => {return _q(f);}).join(' ') : _q(file));
	const relCmd = relativePath ? 'CMD /Q /C ' + _q('CD ' + _q(relativePath) + ' && ' +  cmd) : null;
	_runCmd(relCmd || cmd, !bAsync);
}

// _unzip(folders.xxx + 'test.zip', folders.xxx + 'test\\');
function _unzip(file, toPath, bAsync = false) {
	const cmd = '"' + folders.xxx + 'helpers-external\\7z\\' + (soFeat.x64 ? '7za' : '7za_32')+ '.exe" e "' + file + '" -o"' + toPath + '"';
	_runCmd(cmd, !bAsync);
}