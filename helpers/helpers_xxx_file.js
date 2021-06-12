'use strict';
//01/06/21

include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx_foobar.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx_prototypes.js');

/* 
	Global Variables 
*/

/* 
	File manipulation 
*/
const fso = new ActiveXObject('Scripting.FileSystemObject');
const WshShell = new ActiveXObject('WScript.Shell');
const app = new ActiveXObject('Shell.Application');

function _isFile(file) {
	if (isCompatible('1.4.0')) {return utils.IsFile(file);} 
	else {return isString(file) ? fso.FileExists(file) : false;} //TODO: Deprecated
}

function _isFolder(folder) {
	if (isCompatible('1.4.0')) {return utils.IsDirectory(folder);} 
	else {return isString(folder) ? fso.FolderExists(folder) : false;} //TODO: Deprecated
}

function _createFolder(folder) {
	if (!_isFolder(folder)) {
		try {
			fso.CreateFolder(folder);
		} catch (e) {
			return false;
		}
		return _isFolder(folder);
	}
	return false;
}

// Delete. Can not be undone.
function _deleteFile(file) {
	if (_isFile(file)) {
		try {
			fso.DeleteFile(file);
		} catch (e) {
			return false;
		}
		return !(_isFile(file));
	}
	return false;
}

// Rename/move
function _renameFile(oldFilePath, newFilePath) {
	if (!_isFile(newFilePath)) {
		if (_isFile(oldFilePath)) {
			try {
				fso.MoveFile(oldFilePath, newFilePath);
			} catch (e) {
				return false;
			}
			return _isFile(newFilePath);
		}
		return false;
	}
	return false;
}

// Copy
function _copyFile(oldFilePath, newFilePath) {
	if (!_isFile(newFilePath)) {
		if (_isFile(oldFilePath)) {
			try {
				fso.CopyFile(oldFilePath, newFilePath);
			} catch (e) {
				return false;
			}
			return _isFile(newFilePath) && _isFile(oldFilePath);
		}
		return false;
	}
	return false;
}

// Sends file to recycle bin, can be undone
// Beware of calling this while pressing shift. File will be removed without sending to recycle bin!
// Use utils.IsKeyPressed(VK_SHIFT) and debouncing as workaround
function _recycleFile(file) {
	if (_isFile(file)) {
		try {
			app.NameSpace(10).MoveHere(file);
		} catch (e) {
			return false;
		}
		return !(_isFile(file));
	}
	return false;
}

// Restores file from the recycle Bin, you must pass the original path. 
// Beware of collisions... same file deleted 2 times has the same virtual name on bin...
function _restoreFile(file) {
	if (!_isFile(file)) {
		const arr = isCompatible('1.4.0') ? utils.SplitFilePath(file) : utils.FileTest(file, 'split'); //TODO: Deprecated
		const OriginalFileName = (arr[1].endsWith(arr[2])) ? arr[1] : arr[1] + arr[2]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
		const items = app.NameSpace(10).Items();
		const numItems = items.Count;
		for (let i = 0; i < numItems; i++) {
			if (items.Item(i).Name === OriginalFileName) {
				_renameFile(items.Item(i).Path, file);
				break;
			}
		}
		let bFound = _isFile(file);
		if (!bFound){console.log('_restoreFile(): Can not restore file, \'' + OriginalFileName + '\' was not found at the bin.');}
		return bFound;
	} else {
		console.log('_restoreFile(): Can not restore file to \'' + file + '\' since there is already another file at the same path.');
		return false;
	}
}

function _open(file, codePage = 0) {
	if (_isFile(file)) {
		return utils.ReadTextFile(file, codePage);
	} else {
		return '';
	}
}

function _save(file, value) {
	const filePath = isCompatible('1.4.0') ? utils.SplitFilePath(file)[0] : utils.FileTest(file, 'split')[0]; //TODO: Deprecated
	if (_isFolder(filePath) && utils.WriteTextFile(file, value, true)) {
		return true;
	}
	console.log('Error saving to ' + file);
	return false;
}

function _jsonParse(value) {
	try {
		let data = JSON.parse(value);
		return data;
	} catch (e) {
		return null;
	}
}

function _jsonParseFile(file) {
	return _jsonParse(_open(file));
}

// Opens explorer on file (and selects it) or folder
function _explorer(fileOrFolder) {
	if (_isFile(fileOrFolder)) {
		WshShell.Run('explorer /select,' + _q(fileOrFolder));
		return true; // There is no way to know if the explorer window got opened at the right path...
	} else if (_isFolder(fileOrFolder)) {
		WshShell.Run('explorer /e,' + _q(fileOrFolder));
		return true; // There is no way to know if the explorer window got opened at the right path...
	}
	return false;
}

// Workaround for bug on win 7 on utils.Glob(), matching extensions with same chars: utils.Glob(*.m3u) returns *.m3u8 files too
function getFiles(folderPath, extensionSet) {
	return utils.Glob(folderPath +'*.*').filter((item) => {
		return extensionSet.has('.' + item.split('.').pop().toLowerCase());
	});
}

function _run() {
	try {
		WshShell.Run([...arguments].map((arg) => {return _q(arg);}).join(' '));
		return true;
	} catch (e) {
		return false;
	}
}

function _runCmd(command, wait) {
	try {
		WshShell.Run(command, 0, wait);
	} catch (e) {
		console.log('_runCmd(): failed to run command ' + command);
	}
}

// Replace once originalString from a file
function editTextFile(filePath, originalString, newString) {
	let bDone = false;
	if (_isFile(filePath)){
		let fileText = utils.ReadTextFile(filePath);
		if (typeof fileText !== 'undefined' && fileText.length >= 1) {
			let fileTextNew = fileText;
			if (isArray(originalString) && isArray(newString) && originalString.length === newString.length) {
				originalString = originalString.filter(Boolean); // '' values makes no sense to be replaced
				if (isArrayStrings(originalString) && isArrayStrings(newString, true) && originalString.length === newString.length) { //newString may have blank values but both arrays must have same length
					let replacements = newString.length;
					for (let i = 0; i < replacements; i++) {
						fileTextNew = fileTextNew.replace(originalString[i], newString[i]);
					}
				}
			} else if (isString(originalString) && isString(newString)) {
				fileTextNew = fileTextNew.replace(originalString, newString);
			}
			if (fileTextNew !== fileText) {
				bDone = utils.WriteTextFile(filePath, fileTextNew, true);
				// Check
				if (_isFile(filePath) && bDone) {
					let check = utils.ReadTextFile(filePath, convertCharsetToCodepage('UTF-8'));
					bDone = (check === fileTextNew);
				}
			}
		}
	}
	return bDone;
}

function findRecursivePaths(path = fb.ProfilePath){
	let arr = [], pathArr = [];
	arr = utils.Glob(path + '*.*', 0x00000020); // Directory
	arr.forEach( (subPath) => {
		if (subPath.indexOf('\\..') !== -1 || subPath.indexOf('\\.') !== -1) {return;}
		if (subPath === path) {return;}
		pathArr.push(subPath);
		pathArr = pathArr.concat(findRecursivePaths(subPath + '\\'));
	});
	return pathArr;
}

function findRecursivefile(fileMask, inPaths = [fb.ProfilePath, fb.ComponentPath]){
	let fileArr = [];
	if (isArrayStrings(inPaths)) {
		let pathArr = inPaths; // Add itself
		inPaths.forEach( (path) => {pathArr = pathArr.concat(findRecursivePaths(path));});
		pathArr.forEach( (path) => {fileArr = fileArr.concat(utils.Glob(path + '\\' +  fileMask));});
	}
	return fileArr;
}

function _q(value) {
	return '"' + value + '"';
}