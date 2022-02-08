'use strict';
//08/02/21

include(fb.ComponentPath + 'docs\\Codepages.js');
include('helpers_xxx.js');
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
const spaces = {desktop: 0, bin: 10, userdesktop: 16, fonts: 19};
const fileAttr = {Normal: 0, ReadOnly: 1, Hidden: 2, Syestem: 4, Volume: 8, Directory: 16, Archive: 32, Alias: 1024, Compressed: 2048};

function _getNameSpacePath(name) { // bin nameSpace returns a virtual path which is only usable on _explorer()
	const folder = app.NameSpace(spaces.hasOwnProperty(name.toLowerCase()) ? spaces[name.toLowerCase()] : name);
	if (folder) {
		const selfObj = folder.Self;
		if (selfObj) {
			return selfObj.Path;
		}
	}
	return '';
}

function _isFile(file) {
	if (isCompatible('1.4.0')) {return utils.IsFile(file);} 
	else { //TODO: Deprecated
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
		return isString(file) ? fso.FileExists(file) : false;
	}
}

function _isFolder(folder) {
	if (isCompatible('1.4.0')) {return utils.IsDirectory(folder);} 
	else { //TODO: Deprecated
		if (folder.startsWith('.\\')) {folder = fb.FoobarPath + folder.replace('.\\','');}
		return isString(folder) ? fso.FolderExists(folder) : false;
	}
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
function _deleteFile(file, bForce = true) {
	if (_isFile(file)) {
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
		try {
			fso.DeleteFile(file, bForce);
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
			const filePath = utils.SplitFilePath(newFilePath)[0];
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
			const filePath = utils.SplitFilePath(newFilePath)[0];
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
// Works even pressing shift thanks to an external utility
// Otherwise file would be removed without sending to recycle bin!
// Use utils.IsKeyPressed(VK_SHIFT) and debouncing as workaround when external exe must not be run
function _recycleFile(file) {
	if (_isFile(file)) {
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
		try {
			if (utils.IsKeyPressed(VK_SHIFT)) {throw 'Shift';}
			app.NameSpace(spaces.bin).MoveHere(file); // First nameSpace method (may not work on Unix systems)
		} catch (e) {
			try {
				if (utils.IsKeyPressed(VK_SHIFT)) {throw 'Shift';}
				app.NameSpace(0).ParseName(file).InvokeVerb('delete'); // Second nameSpace method (may not work on Unix systems)
			} catch (e) {
				try {_runCmd(_q(folders.xxx + 'helpers-external\\cmdutils\\Recycle.exe') + ' -f ' + _q(file), true);} // cmdUtils as fallback
				catch (e) {return false;}
			}
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
		const arr = utils.SplitFilePath(file);
		const OriginalFileName = (arr[1].endsWith(arr[2])) ? arr[1] : arr[1] + arr[2]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
		let numItems, items;
		try {
			items = app.NameSpace(10).Items();
			numItems = items.Count;
		} catch (e) {return false;}
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

function _getAttrFile(file) {
	if (!_isFile(file)) {return null;}
	const fileObj = fso.GetFile(file);
	if (!fileObj) {return null;}
	return fileObj.Attributes;
}

function _parseAttrFile(file) {
	let attr = _getAttrFile(file);
	if (!attr) {return null;}
	const attrObj = Object.fromEntries(Object.keys(fileAttr).map((_) => {return [_, false];}));
	if (attr === fileAttr.Normal) {attrObj.Normal = true;}
	else {Object.keys(fileAttr).reverse().forEach((key) => {if (attr && attr >= fileAttr[key]) {attr -= fileAttr[key]; attrObj[key] = true;}});}
	return attrObj;
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
	const filePath = utils.SplitFilePath(file)[0];
	if (!_isFolder(filePath)) {_createFolder(filePath);}
	if (_isFolder(filePath) && utils.WriteTextFile(file, value, bBOM)) {
		return true;
	}
	console.log('Error saving to ' + file);
	return false;
}

function _saveSplitJson(file, value, replacer = void(0), space = void(0), splitBy = 50000, bBOM = false) {
	if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
	const filePath = utils.SplitFilePath(file)[0];
	if (!_isFolder(filePath)) {_createFolder(filePath);}
	if (_isFolder(filePath)) {
		const fileName = utils.SplitFilePath(file)[1];
		const len = value.length;
		const add = len > splitBy ? splitBy : len;
		const count = Math.ceil(len / splitBy);
		let bDone = true;
		for (let i = 0; i < count; i++) {
			const newFilename = file.replace(fileName, fileName + i);
			bDone = bDone && _save(newFilename, JSON.stringify(value.slice(i * add, ((i + 1) * add < len ? (i + 1) * add : len)), replacer, space), bBOM);
		}
		return bDone;
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

function _jsonParseFileSplit(filePath, reportName = 'Json', popupName = window.Name, codePage = 0) {
	const [path, fileName, extension] = utils.SplitFilePath(filePath);
	const files = utils.Glob(path + '\\' + fileName + '*' + extension);
	let result = [];
	for (let file of files) {
		const data = _jsonParseFile(file, codePage);
		if (data) {result = result.concat(data);}
		else {return null;}
	}
	return result;
}

function _jsonParseFileCheck(file, fileName = 'Json', popupName = window.Name, codePage = 0) {
	let data = null;
	if (_isFile(file)) {
		data = _jsonParseFile(file, codePage);
		if (!data && utils.GetFileSize(file)) {
			console.log(fileName + ' file is corrupt:', file);
			fb.ShowPopupMessage(fileName + ' file is corrupt:\n' + file, popupName);
		}
	} else {
		console.log(fileName + ' file not found:\n', file);
		fb.ShowPopupMessage(fileName + ' file not found:\n' + file, popupName);
	}
	return data;
}

// Opens explorer on file (and selects it) or folder
function _explorer(fileOrFolder) {
	if (fileOrFolder.startsWith('.\\')) {fileOrFolder = fb.FoobarPath + fileOrFolder.replace('.\\','');}
	if (fileOrFolder.startsWith('::{')) { // Virtual folder
		WshShell.Run('explorer /e, ' + fileOrFolder);
		return true; // There is no way to know if the explorer window got opened at the right path...
	} else if (_isFile(fileOrFolder)) { // File
		WshShell.Run('explorer /select,' + _q(fileOrFolder));
		return true;
	} else if (_isFolder(fileOrFolder)) { // Folder
		WshShell.Run('explorer /e,' + _q(fileOrFolder));
		return true;
	}
	return false;
}

// Workaround for bug on win 7 on utils.Glob(), matching extensions with same chars: utils.Glob(*.m3u) returns *.m3u8 files too
function getFiles(folderPath, extensionSet) {
	return utils.Glob(folderPath + '*.*').filter((item) => {
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

function _runHidden() {
	try {
		WshShell.Run([...arguments].map((arg) => {return _q(arg);}).join(' '), 0, true);
		return true;
	} catch (e) {
		return false;
	}
}

function _runCmd(command, bWait) {
	try {
		WshShell.Run(command, 0, bWait);
	} catch (e) {
		console.log('_runCmd(): failed to run command ' + command + '(' + e + ')');
	}
}

// Replace once originalString from a file
function editTextFile(filePath, originalString, newString, bBOM = false) {
	let bDone = false;
	let reason = -1;
	if (_isFile(filePath)){
		let fileText = utils.ReadTextFile(filePath);
		const extension = utils.SplitFilePath(filePath)[2];
		const codePage = checkCodePage(fileText, extension);
		if (codePage !== -1) {fileText = utils.ReadTextFile(filePath, codePage);}
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
				} else {reason = -1;}
			} else {reason = 1}
		} else {reason = 0;}
	} else {reason = -1;}
	return [bDone, reason];
}

function checkCodePage(originalText, extension, bAdvancedCheck = false) {
	let codepage = -1;
	const plsText = isArray(originalText) ? originalText : originalText.split(/\r\n|\n\r|\n|\r/);
	if (extension === '.m3u8') {codepage = convertCharsetToCodepage('UTF-8');}
	else if (extension === '.m3u' && plsText.length >= 2 && plsText[1].startsWith('#EXTENC:')) {
		const codepageName = plsText[1].split(':').pop();
		if (codepageName) {codepage = convertCharsetToCodepage(codepageName);}
	} else if ((extension === '.xspf' || extension === '.asx' || extension === '.xsp') && plsText.length >= 2 && plsText[0].indexOf('encoding=') !== -1) {
		const codepageName = plsText[0].match(/encoding="([\S]*)"/).pop();
		if (codepageName) {codepage = convertCharsetToCodepage(codepageName);}
	} else if (bAdvancedCheck) {
		if (plsText.length && plsText.some((line) => {
			line = line.toLowerCase();
			return (line.indexOf('ã©') !== -1 || line.indexOf('ã¨') !== -1 || line.indexOf('ã¼') !== -1 || line.indexOf('ãº') !== -1) ;
			})) {
			codepage = convertCharsetToCodepage('UTF-8');
		} else if (plsText.length && plsText.some((line) => {line = line.toLowerCase(); return (line.indexOf('�') !== -1);})) {
			codepage = systemCodePage;
		}
	}
	return codepage ? codepage : -1;
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

function lastModified(file, bParse = false) {
	if (!_isFile(file)) {return -1;}
	return bParse ? Date.parse(fso.GetFile(file).DateLastModified) : fso.GetFile(file).DateLastModified;
}