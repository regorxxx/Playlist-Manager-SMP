'use strict';
//01/06/21

include(fb.ComponentPath + 'docs\\Codepages.js');
include('helpers_xxx_foobar.js');
include('helpers_xxx_prototypes.js');

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
	else {
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
		return isString(file) ? fso.FileExists(file) : false;
	} //TODO: Deprecated
}

function _isFolder(folder) {
	if (isCompatible('1.4.0')) {return utils.IsDirectory(folder);} 
	else {
		if (folder.startsWith('.\\')) {folder = fb.FoobarPath + folder.replace('.\\','');}
		return isString(folder) ? fso.FolderExists(folder) : false;
	} //TODO: Deprecated
}

function _createFolder(folder) { // Creates complete dir tree if needed up to the final folder
	if (!folder.length) {return false;}
	if (!_isFolder(folder)) {
		if (folder.startsWith('.\\')) {folder = fb.FoobarPath + folder.replace('.\\','');}
		const subFolders = folder.split('\\').map((_, i, arr) => {return i ? arr.slice(0, i).reduce((path, name) => {return path + '\\' + name;}) : _;});
		subFolders.forEach((path) => {
			try {
				fso.CreateFolder(path);
			} catch (e) {
				return false;
			}
		});
		return _isFolder(folder);
	}
	return false;
}

// Delete. Can not be undone.
function _deleteFile(file) {
	if (_isFile(file)) {
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
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
	if (!newFilePath.length) {return;}
	if (!_isFile(newFilePath)) {
		if (_isFile(oldFilePath)) {
			if (oldFilePath.startsWith('.\\')) {oldFilePath = fb.FoobarPath + oldFilePath.replace('.\\','');}
			if (newFilePath.startsWith('.\\')) {newFilePath = fb.FoobarPath + newFilePath.replace('.\\','');}
			const filePath = isCompatible('1.4.0') ? utils.SplitFilePath(newFilePath)[0] : utils.FileTest(newFilePath, 'split')[0]; //TODO: Deprecated
			if (!_isFolder(filePath)) {_createFolder(filePath);}
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
function _copyFile(oldFilePath, newFilePath, bAsync = false) {
	if (!newFilePath.length) {return;}
	if (!_isFile(newFilePath)) {
		if (_isFile(oldFilePath)) {
			if (oldFilePath.startsWith('.\\')) {oldFilePath = fb.FoobarPath + oldFilePath.replace('.\\','');}
			if (newFilePath.startsWith('.\\')) {newFilePath = fb.FoobarPath + newFilePath.replace('.\\','');}
			const filePath = isCompatible('1.4.0') ? utils.SplitFilePath(newFilePath)[0] : utils.FileTest(newFilePath, 'split')[0]; //TODO: Deprecated
			if (!_isFolder(filePath)) {_createFolder(filePath);}
			try {
				bAsync ? _runCmd('CMD /C COPY "' + oldFilePath + '" "' + newFilePath + '"', false) : fso.CopyFile(oldFilePath, newFilePath);
			} catch (e) {
				return false;
			}
			return (bAsync ? true : _isFile(newFilePath) && _isFile(oldFilePath)); // Must check afterwards for Async
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
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
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
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
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
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
		return utils.ReadTextFile(file, codePage);
	} else {
		return '';
	}
}

function _save(file, value, bBOM = false) {
	if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
	const filePath = isCompatible('1.4.0') ? utils.SplitFilePath(file)[0] : utils.FileTest(file, 'split')[0]; //TODO: Deprecated
	if (!_isFolder(filePath)) {_createFolder(filePath);}
	if (_isFolder(filePath) && utils.WriteTextFile(file, value, bBOM)) {
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

function _jsonParseFile(file, codePage = 0) {
	return _jsonParse(_open(file, codePage));
}

// Opens explorer on file (and selects it) or folder
function _explorer(fileOrFolder) {
	if (fileOrFolder.startsWith('.\\')) {fileOrFolder = fb.FoobarPath + fileOrFolder.replace('.\\','');}
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
function editTextFile(filePath, originalString, newString, bBOM = false) {
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
				bDone = utils.WriteTextFile(filePath, fileTextNew, bBOM);
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

function findRelPathInAbsPath(relPath, absPath = fb.FoobarPath) {
	let finalPath = '';
	if (relPath.startsWith('.\\') && absPath === fb.FoobarPath ) {finalPath = fb.FoobarPath + relPath.replace('.\\','');}
	else {
		const relPathArr = relPath.split('\\').filter(Boolean);
		const absPathArr = absPath.split('\\').filter(Boolean);
		let bIntersect = new Set(relPathArr).intersectionSize(new Set(absPathArr));
		if (bIntersect) {
			bIntersect = false;
			for (let i = relPathArr.length - 1; i >= 0; i--) {
				for (let j = absPathArr.length - 1; j >= 0; j--) {
					if (bIntersect) {
						if (relPathArr[i] === '..') {relPathArr[i] = '';}
						else if (relPathArr[i] !== absPathArr[i]) {relPathArr[i] = absPathArr[j];}
					} else {bIntersect = relPathArr[i] === absPathArr[j];}
				}
			}
			finalPath = relPathArr.join('\\');
		} else {
			finalPath = relPathArr.map((folder) => {return (folder !== '..' ? folder : '');}).filter(Boolean);
			finalPath = absPathArr.slice(0, absPathArr.length - (relPathArr.length - finalPath.length)).concat(finalPath);
			finalPath = finalPath.join('\\');
		}
	}
	if (finalPath.length && relPath.endsWith('\\') && !finalPath.endsWith('\\')) {finalPath += '\\';}
	return finalPath;
}

function _q(value) {
	return '"' + value + '"';
}

function sanitize(value) {
	return value.replace(/[\/\\|:]/g, '-').replace(/\*/g, 'x').replace(/"/g, "''").replace(/[<>]/g, '_').replace(/\?/g, '').replace(/(?! )\s/g, '');
}

function UUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g , function(c) {
		const rnd = Math.random() * 16 | 0, v = c === 'x' ? rnd : (rnd&0x3|0x8) ;
		return v.toString(16);
	});
}