'use strict';
//07/10/21

include('helpers_xxx.js');
include('helpers_xxx_file.js');

// _zip(folders.xxx + 'test.txt', folders.xxx + 'test.zip');
function _zip(file, toPath) {
	const cmd = '"' + folders.xxx + 'helpers-external\\7z\\7za.exe" a -tzip "' + toPath + '" "' + file + '"';
	_runCmd(cmd, true);
}

// _unzip(folders.xxx + 'test.zip', folders.xxx + 'test\\');
function _unzip(file, toPath) {
	const cmd = '"' + folders.xxx + 'helpers-external\\7z\\7za.exe" e "' + file + '" -o"' + toPath + '"';
	_runCmd(cmd, true);
}