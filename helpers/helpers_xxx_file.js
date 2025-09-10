'use strict';
//10/09/25

/* exported _getNameSpacePath, _deleteFolder, _copyFile, _recycleFile, _restoreFile, _saveFSO, _saveSplitJson, _jsonParseFileSplit, _jsonParseFileCheck, _parseAttrFile, _explorer, getFiles, _run, _runHidden, _exec, editTextFile, findRecursiveFile, findRelPathInAbsPath, sanitizePath, sanitize, UUID, created, getFileMeta, popup, getPathMeta, testPath, youTubeRegExp, _isNetwork, findRecursiveDirs, _copyFolder, _renameFolder */

include(fb.ComponentPath + 'docs\\Codepages.js');
/* global convertCharsetToCodepage:readable */
include('helpers_xxx_basic_js.js');
/* global tryMethod:readable */
include('helpers_xxx_prototypes.js');
/* global _q:readable, isString:readable, round:readable, roughSizeOfObject:readable, isArray:readable, isArrayStrings:readable */

/*
	Global Variables
*/
const fso = new ActiveXObject('Scripting.FileSystemObject');
const WshShell = new ActiveXObject('WScript.Shell');
const app = new ActiveXObject('Shell.Application');
const spaces = { desktop: 0, documents: 5, startup: 7, recent: 8, bin: 10, userDesktop: 16, fonts: 19, pictures: 39, profile: 40 };
const fileAttr = { Normal: 0, ReadOnly: 1, Hidden: 2, System: 4, Volume: 8, Directory: 16, Archive: 32, Alias: 1024, Compressed: 2048 };
const utf8 = convertCharsetToCodepage('UTF-8');
const fileSizeMask = new Map([['B', 1], ['KB', 1024], ['MB', 1024 ** 2], ['GB', 1024 ** 3]]);
const absPathRegExp = /[A-z]*:\\/;
const youTubeRegExp = /(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^&\s?]+(?!\S))\/)|(?:\S*v=|v\/)))([^&\s?]+)/; // NOSONAR /* cspell:disable-line */


include('helpers_xxx.js');
/* global folders:readable, isCompatible:readable, lastStartup:readable, VK_SHIFT:readable */

// Create global folders
_createFolder(folders.data);
_createFolder(folders.userHelpers);
_createFolder(folders.temp);
_createFolder(folders.userPresets);
_createFolder(folders.userPresetsGlobal);
// Add info files
console.disable();
[
	folders.data + '_XXX-SCRIPTS_CONFIG_FILES',
	folders.userHelpers + '_XXX-SCRIPTS_CONFIG_FILES',
	folders.userPresets + '_XXX-SCRIPTS_CONFIG_FILES',
	folders.userPresetsGlobal + '_DELETE_globQuery_TO_REFRESH_TAGS',
	folders.temp + '_SAFE_TO_REMOVE_TEMP_FILES'
].forEach((file) => {
	if (!_isFile(file)) { _save(file, ''); }
});
console.enable();

// Additional code to check for network drives: these don't have recycle bin so _recycleFile would always fail or show a prompt
const mappedDrivesFile = folders.temp + 'mappedDrives.txt';
const mappedDrives = [];
const binDrives = {};
if (!_isFile(mappedDrivesFile) || lastStartup() !== lastModified(mappedDrivesFile)) {
	_runCmd('CMD /C wmic path Win32_LogicalDisk Where DriveType="4" get DeviceID, ProviderName > ' + _q(mappedDrivesFile), true);
}
{
	const file = _open(mappedDrivesFile);
	if (file && file.length) {
		const lines = file.split(/\r\n|\n\r|\n|\r/);
		lines.forEach((line, i) => {
			if (i === 0 || !line.length) { return; }
			const drive = line.match(/(.+?:)/g)[0];
			if (drive && drive.length) { mappedDrives.push(drive.toLowerCase()); }
		});
	}
}

// Retrieve system codepage
const systemCodePageFile = folders.temp + 'systemCodePage.txt';
if (!_isFile(systemCodePageFile) || lastStartup() > lastModified(systemCodePageFile)) {
	_runCmd('CMD /C CHCP > ' + _q(systemCodePageFile), true);
}
const systemCodePage = _isFile(systemCodePageFile) ? _open(systemCodePageFile).split(': ').pop() : -1;

const popup = {
	ok: 0,
	ok_cancel: 1,
	abort_retry_ignore: 2,
	yes_no_cancel: 3,
	yes_no: 4,
	retry_cancel: 5,
	// Return
	timeout: -1,
	okr: 1,
	cancel: 2,
	abort: 3,
	retry: 4,
	ignore: 5,
	yes: 6,
	no: 7,
	// Icon
	stop: 16,
	question: 32,
	exclamation: 48,
	info: 64,
	// Default button
	firstButton: 0,
	secondButton: 256,
	thirdButton: 512,
	fourthButton: 768,
	// Extra
	appModal: 0,
	systemModal: 4096,
	helpButton: 16384, // Doesn't work on vb
	foreground: 65536,
	rightAlign: 524288,
};

/* cspell:disable */
const WinApiError = {
	UNKNOWN: 'UNKNOWN',
	'0x800A0005': 'CTL_E_ILLEGALFUNCTIONCALL',
	'0x800A0006': 'CTL_E_OVERFLOW',
	'0x800A0007': 'CTL_E_OUTOFMEMORY',
	'0x800A000B': 'CTL_E_DIVISIONBYZERO',
	'0x800A000E': 'CTL_E_OUTOFSTRINGSPACE',
	'0x800A001C': 'CTL_E_OUTOFSTACKSPACE',
	'0x800A0034': 'CTL_E_BADFILENAMEORNUMBER',
	'0x800A0035': 'CTL_E_FILENOTFOUND',
	'0x800A0036': 'CTL_E_BADFILEMODE',
	'0x800A0037': 'CTL_E_FILEALREADYOPEN',
	'0x800A0039': 'CTL_E_DEVICEIOERROR',
	'0x800A003A': 'CTL_E_FILEALREADYEXISTS',
	'0x800A003B': 'CTL_E_BADRECORDLENGTH',
	'0x800A003D': 'CTL_E_DISKFULL',
	'0x800A003F': 'CTL_E_BADRECORDNUMBER',
	'0x800A0040': 'CTL_E_BADFILENAME',
	'0x800A0043': 'CTL_E_TOOMANYFILES',
	'0x800A0044': 'CTL_E_DEVICEUNAVAILABLE',
	'0x800A0046': 'CTL_E_PERMISSIONDENIED',
	'0x800A0047': 'CTL_E_DISKNOTREADY',
	'0x800A004B': 'CTL_E_PATHFILEACCESSERROR',
	'0x800A004C': 'CTL_E_PATHNOTFOUND',
	'0x800A005D': 'CTL_E_INVALIDPATTERNSTRING',
	'0x800A005E': 'CTL_E_INVALIDUSEOFNULL',
	'0x800A0141': 'CTL_E_INVALIDFILEFORMAT',
	'0x800A017C': 'CTL_E_INVALIDPROPERTYVALUE',
	'0x800A017D': 'CTL_E_INVALIDPROPERTYARRAYINDEX',
	'0x800A017E': 'CTL_E_SETNOTSUPPORTEDATRUNTIME',
	'0x800A017F': 'CTL_E_SETNOTSUPPORTED',
	'0x800A0181': 'CTL_E_NEEDPROPERTYARRAYINDEX',
	'0x800A0183': 'CTL_E_SETNOTPERMITTED',
	'0x800A0189': 'CTL_E_GETNOTSUPPORTEDATRUNTIME',
	'0x800A018A': 'CTL_E_GETNOTSUPPORTED',
	'0x800A01A6': 'CTL_E_PROPERTYNOTFOUND',
	'0x800A01CC': 'CTL_E_INVALIDCLIPBOARDFORMAT',
	'0x800A01E1': 'CTL_E_INVALIDPICTURE',
	'0x800A01E2': 'CTL_E_PRINTERERROR',
	'0x800A0258': 'CTL_E_CUSTOM_FIRST',
	'0x800A02DF': 'CTL_E_CANTSAVEFILETOTEMP',
	'0x800A02E8': 'CTL_E_SEARCHTEXTNOTFOUND',
	'0x800A02EA': 'CTL_E_REPLACEMENTSTOOLONG',
	'0x800A0BB8': 'adErrProviderFailed',
	'0x800A0BB9': 'adErrInvalidArgument',
	'0x800A0BBA': 'adErrOpeningFile',
	'0x800A0BBB': 'adErrReadFile',
	'0x800A0BBC': 'adErrWriteFile',
	'0x800A0BCD': 'adErrNoCurrentRecord',
	'0x800A0C93': 'adErrIllegalOperation',
	'0x800A0C94': 'adErrCantChangeProvider',
	'0x800A0CAE': 'adErrInTransaction',
	'0x800A0CB3': 'adErrFeatureNotAvailable',
	'0x800A0CC1': 'adErrItemNotFound',
	'0x800A0D27': 'adErrObjectInCollection',
	'0x800A0D5C': 'adErrObjectNotSet',
	'0x800A0D5D': 'adErrDataConversion',
	'0x800A0E78': 'adErrObjectClosed',
	'0x800A0E79': 'adErrObjectOpen',
	'0x800A0E7A': 'adErrProviderNotFound',
	'0x800A0E7B': 'adErrBoundToCommand',
	'0x800A0E7C': 'adErrInvalidParamInfo',
	'0x800A0E7D': 'adErrInvalidConnection',
	'0x800A0E7E': 'adErrNotReentrant',
	'0x800A0E7F': 'adErrStillExecuting',
	'0x800A0E80': 'adErrOperationCancelled',
	'0x800A0E81': 'adErrStillConnecting',
	'0x800A0E82': 'adErrInvalidTransaction',
	'0x800A0E83': 'adErrNotExecuting',
	'0x800A0E84': 'adErrUnsafeOperation',
	'0x800A0E85': 'adWrnSecurityDialog',
	'0x800A0E86': 'adWrnSecurityDialogHeader',
	'0x800A0E87': 'adErrIntegrityViolation',
	'0x800A0E88': 'adErrPermissionDenied',
	'0x800A0E89': 'adErrDataOverflow',
	'0x800A0E8A': 'adErrSchemaViolation',
	'0x800A0E8B': 'adErrSignMismatch',
	'0x800A0E8C': 'adErrCantConvertvalue',
	'0x800A0E8D': 'adErrCantCreate',
	'0x800A0E8E': 'adErrColumnNotOnThisRow',
	'0x800A0E8F': 'adErrURLDoesNotExist|adErrURLIntegrViolSetColumns',
	'0x800A0E90': 'adErrTreePermissionDenied',
	'0x800A0E91': 'adErrInvalidURL',
	'0x800A0E92': 'adErrResourceLocked',
	'0x800A0E93': 'adErrResourceExists',
	'0x800A0E94': 'adErrCannotComplete',
	'0x800A0E95': 'adErrVolumeNotFound',
	'0x800A0E96': 'adErrOutOfSpace',
	'0x800A0E97': 'adErrResourceOutOfScope',
	'0x800A0E98': 'adErrUnavailable',
	'0x800A0E99': 'adErrURLNamedRowDoesNotExist',
	'0x800A0E9A': 'adErrDelResOutOfScope',
	'0x800A0E9B': 'adErrPropInvalidColumn',
	'0x800A0E9C': 'adErrPropInvalidOption',
	'0x800A0E9D': 'adErrPropInvalidValue',
	'0x800A0E9E': 'adErrPropConflicting',
	'0x800A0E9F': 'adErrPropNotAllSettable',
	'0x800A0EA0': 'adErrPropNotSet',
	'0x800A0EA1': 'adErrPropNotSettable',
	'0x800A0EA2': 'adErrPropNotSupported',
	'0x800A0EA3': 'adErrCatalogNotSet',
	'0x800A0EA4': 'adErrCantChangeConnection',
	'0x800A0EA5': 'adErrFieldsUpdateFailed',
	'0x800A0EA6': 'adErrDenyNotSupported',
	'0x800A0EA7': 'adErrDenyTypeNotSupported',
	'0x800A0EA9': 'adErrProviderNotSpecified',
	'0x800A0EAA': 'adErrConnectionStringTooLong'
};
/* cspell:enable */

/*
	File manipulation
*/

function _hasRecycleBin(drive) {
	drive = drive.toLowerCase();
	if (!Object.hasOwn(binDrives, drive)) { binDrives[drive] = _isFolder(drive + '\\$RECYCLE.BIN'); }
	return binDrives[drive];
}

function _isNetwork(drive) {
	return !mappedDrives.includes(drive.toLowerCase());
}

function _getNameSpacePath(name) { // bin nameSpace returns a virtual path which is only usable on _explorer()
	const folder = app.NameSpace(Object.hasOwn(spaces, name.toLowerCase()) ? spaces[name.toLowerCase()] : name);
	if (folder) {
		const selfObj = folder.Self;
		if (selfObj) {
			return selfObj.Path;
		}
	}
	return '';
}

function _resolvePath(path) {
	if (path.startsWith('.\\profile\\')) { path = path.replace('.\\profile\\', fb.ProfilePath); }
	else if (path.startsWith(folders.xxxRootName)) { path = path.replace(folders.xxxRootName, folders.xxx); }
	else if (path.startsWith('.\\')) { path = path.replace('.\\', fb.FoobarPath); }
	return path;
}

function _comparePaths(source, destination) {
	return (source.endsWith('\\') ? source.slice(0, -1) : source).toLowerCase() === (destination.endsWith('\\') ? destination.slice(0, -1) : destination).toLowerCase();
}

function _isFile(file) {
	file = _resolvePath(file);
	if (file.endsWith('\\')) { file = file.slice(0, -1); }
	if (isCompatible('1.4.0', 'smp') || isCompatible('3.6.1', 'jsplitter')) { try { return utils.IsFile(file); } catch (e) { return false; } } // eslint-disable-line no-unused-vars
	else { return isString(file) ? fso.FileExists(file) : false; }
}

function _isFolder(folder) {
	folder = _resolvePath(folder);
	if (isCompatible('1.4.0', 'smp') || isCompatible('3.6.1', 'jsplitter')) { try { return utils.IsDirectory(folder); } catch (e) { return false; } } // eslint-disable-line no-unused-vars
	else { return isString(folder) ? fso.FolderExists(folder) : false; }
}

function _isLink(path) {
	path = path.toLowerCase().replace(/\\\\/g, '//');
	return ['http://', 'https://', 'fy+', '3dydfy:', 'youtube.', 'www.'].some((prefix) => path.startsWith(prefix)); /* cspell:disable-line */
}

function _createFolder(folder) { // Creates complete dir tree if needed up to the final folder
	if (!folder.length) { return false; }
	folder = _resolvePath(folder);
	if (!_isFolder(folder) && !_isFile(folder)) {
		if (!folder.endsWith('\\')) { folder += '\\'; }
		const subFolders = new Set(folder.split('\\').map((_, i, arr) => {
			return i ? arr.slice(0, i).reduce((path, name) => { return path + '\\' + name; }) : _;
		}));
		subFolders.forEach((path) => {
			if (!_isFolder(path)) {
				try {
					fso.CreateFolder(path);
				} catch (e) {
					console.log(parseWinApiError(e.message));
					return false;
				}
			}
		});
		return _isFolder(folder);
	}
	return false;
}

// Delete. Can not be undone.
function _deleteFile(file, bForce = true) {
	file = _resolvePath(file);
	if (_isFile(file)) {
		try {
			fso.DeleteFile(file, bForce);
		} catch (e) {
			console.log(parseWinApiError(e.message));
			return false;
		}
		return !(_isFile(file));
	}
	return false;
}

// Delete. Can not be undone.
function _deleteFolder(folder, bForce = true) {
	folder = _resolvePath(folder);
	if (_isFolder(folder)) {
		if (folder.endsWith('\\')) { folder = folder.slice(0, -1); }
		try {
			fso.DeleteFolder(folder, bForce);
		} catch (e) {
			console.log(parseWinApiError(e.message));
			return false;
		}
		return !(_isFolder(folder));
	}
	return false;
}

// Rename/move
function _renameFile(oldFilePath, newFilePath) {
	if (!newFilePath.length) { return; }
	oldFilePath = _resolvePath(oldFilePath);
	newFilePath = _resolvePath(newFilePath);
	if (_comparePaths(oldFilePath, newFilePath)) { return true; }
	if (!_isFile(newFilePath)) {
		if (_isFile(oldFilePath)) {
			const filePath = utils.SplitFilePath(newFilePath)[0];
			if (!_isFolder(filePath)) { _createFolder(filePath); }
			try {
				fso.MoveFile(oldFilePath, newFilePath);
			} catch (e) {
				console.log(parseWinApiError(e.message));
				return false;
			}
			return _isFile(newFilePath);
		}
		return false;
	}
	return false;
}

// https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/movefolder-method
function _renameFolder(oldFolderPath, newFolderPath) {
	if (!newFolderPath.length) { return; }
	oldFolderPath = _resolvePath(oldFolderPath);
	newFolderPath = _resolvePath(newFolderPath);
	const source = oldFolderPath.replace(/\*$/i, '');
	if (_comparePaths(oldFolderPath, newFolderPath)) { return true; }
	if (!source.endsWith('\\') || !_isFolder(newFolderPath)) {
		if (_isFolder(source)) {
			_createFolder(newFolderPath);
			try {
				fso.MoveFolder(oldFolderPath, newFolderPath);
			} catch (e) {
				console.log(parseWinApiError(e.message));
				return false;
			}
			return _isFolder(newFolderPath);
		}
		return false;
	}
	return false;
}

// Copy
// https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/copyfile-method
function _copyFile(oldFilePath, newFilePath, bAsync = false) {
	if (!newFilePath.length) { return; }
	oldFilePath = _resolvePath(oldFilePath);
	newFilePath = _resolvePath(newFilePath);
	const source = oldFilePath.replace(/(([^\\.]*\.\*)|(\*\.[^.]*)|\*\.\*)$/i, '');
	const bWildCard = !_comparePaths(oldFilePath, source);
	const bTargetFolder = newFilePath.endsWith('\\');
	if (_comparePaths(oldFilePath, newFilePath)) { return true; }
	if ((bTargetFolder && _isFolder(newFilePath)) || (!bTargetFolder && !_isFile(newFilePath))) {
		if ((bWildCard && _isFolder(source)) || (!bWildCard && _isFile(oldFilePath))) {
			if (!bTargetFolder) {
				const filePath = utils.SplitFilePath(newFilePath)[0];
				if (!_isFolder(filePath)) { _createFolder(filePath); }
			}
			try {
				bAsync ? _runCmd('CMD /C COPY "' + oldFilePath + '" "' + newFilePath + '"', false) : fso.CopyFile(oldFilePath, newFilePath);
			} catch (e) {
				console.log(parseWinApiError(e.message));
				return false;
			}
			return (bAsync ? true : (bTargetFolder || _isFile(newFilePath)) && (bWildCard || _isFile(oldFilePath))); // Must check afterwards for Async
		}
		return false;
	}
	return false;
}

// Copy
// https://learn.microsoft.com/en-us/office/vba/language/reference/user-interface-help/copyfolder-method
function _copyFolder(oldFolderPath, newFolderPath, bAsync = false) {
	if (!newFolderPath.length) { return; }
	oldFolderPath = _resolvePath(oldFolderPath);
	newFolderPath = _resolvePath(newFolderPath);
	const source = oldFolderPath.replace(/(\\\\)?\*?$/i, '$1');
	if (_comparePaths(oldFolderPath, newFolderPath)) { return true; }
	if (_isFolder(source)) {
		if (newFolderPath.endsWith('\\') && !_isFolder(newFolderPath)) { _createFolder(newFolderPath); }
		try {
			bAsync ? _runCmd('CMD /C COPY "' + oldFolderPath + '" "' + newFolderPath + '"', false) : fso.CopyFolder(oldFolderPath, newFolderPath);
		} catch (e) {
			console.log(parseWinApiError(e.message));
			return false;
		}
		return (bAsync ? true : _isFolder(newFolderPath) && _isFolder(source)); // Must check afterwards for Async
	}
	return false;
}

// Sends file to recycle bin, can be undone
// Works even pressing shift thanks to an external utility
// Otherwise file would be removed without sending to recycle bin!
// Use utils.IsKeyPressed(VK_SHIFT) and debouncing as workaround when external exe must not be run
function _recycleFile(file, bCheckBin = false) {
	file = _resolvePath(file);
	if (_isFile(file)) {
		let bIsBin = true;
		if (bCheckBin && !_hasRecycleBin(file.match(/^(.+?:)/g)[0])) { bIsBin = false; }
		if (bIsBin) {
			try {
				if (utils.IsKeyPressed(VK_SHIFT)) { throw new Error('Shift'); }
				app.NameSpace(spaces.bin).MoveHere(file); // First nameSpace method (may not work on Unix systems)
			} catch (e) { // eslint-disable-line no-unused-vars
				try {
					if (utils.IsKeyPressed(VK_SHIFT)) { throw new Error('Shift'); }
					app.NameSpace(0).ParseName(file).InvokeVerb('delete'); // Second nameSpace method (may not work on Unix systems)
					// fso.GetFile(file).Delete(true);
				} catch (e) { // eslint-disable-line no-unused-vars
					try { _runCmd(_q(folders.xxx + 'helpers-external\\cmdutils\\Recycle.exe') + ' -f ' + _q(file), true); } // cmdUtils as fallback /* cspell:disable-line */
					catch (e) { return false; } // eslint-disable-line no-unused-vars
				}
			}
		} else { return _deleteFile(file, true); }
		return !(_isFile(file));
	}
	return false;
}

// Restores file from the recycle Bin, you must pass the original path.
// Beware of collisions... same file deleted 2 times has the same virtual name on bin...
function _restoreFile(file) {
	file = _resolvePath(file);
	if (!_isFile(file)) {
		const arr = utils.SplitFilePath(file);
		const originalFileName = (arr[1].endsWith(arr[2])) ? arr[1] : arr[1] + arr[2]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
		let numItems, items;
		try {
			items = app.NameSpace(10).Items();
			numItems = items.Count;
		} catch (e) { return false; } // eslint-disable-line no-unused-vars
		for (let i = 0; i < numItems; i++) {
			if (items.Item(i).Nam.toLowerCase() === originalFileName.toLowerCase()) {
				_renameFile(items.Item(i).Path, file);
				break;
			}
		}
		const bFound = _isFile(file);
		if (!bFound) { console.log('_restoreFile(): Can not restore file, \'' + originalFileName + '\' was not found at the bin.'); }
		return bFound;
	} else {
		console.log('_restoreFile(): Can not restore file to \'' + file + '\' since there is already another file at the same path.');
		return false;
	}
}

function _getAttrFile(file) {
	file = _resolvePath(file);
	if (!_isFile(file)) { return null; }
	const fileObj = fso.GetFile(file);
	if (!fileObj) { return null; }
	return fileObj.Attributes;
}

function _parseAttrFile(file) {
	file = _resolvePath(file);
	let attr = _getAttrFile(file);
	if (!attr) { return null; }
	const attrObj = Object.fromEntries(Object.keys(fileAttr).map((_) => [_, false]));
	if (attr === fileAttr.Normal) { attrObj.Normal = true; }
	else { Object.keys(fileAttr).reverse().forEach((key) => { if (attr && attr >= fileAttr[key]) { attr -= fileAttr[key]; attrObj[key] = true; } }); }
	return attrObj;
}

function _open(file, codePage = 0) {
	file = _resolvePath(file);
	if (_isFile(file)) {
		return tryMethod('ReadTextFile', utils)(file, codePage) || '';  // Bypasses crash on file locked by other process
	} else {
		return '';
	}
}

function _save(file, value, bBOM = false) {
	file = _resolvePath(file);
	const filePath = utils.SplitFilePath(file)[0];
	if (!_isFolder(filePath)) { _createFolder(filePath); }
	if (round(roughSizeOfObject(value) / 1024 ** 2 / 2, 1) > 110) { console.popup('Data is bigger than 100 Mb, it may crash SMP. Report to use split JSON.', window.Name + ': JSON saving'); }
	if (_isFolder(filePath) && utils.WriteTextFile(file, value, bBOM)) {
		return true;
	} else if (file.length > 255) {
		fb.ShowPopupMessage('Script is trying to save a file in a path containing more than 256 chars which leads to problems on Windows systems.\n\nPath:\n' + file + '\n\nTo avoid this problem, install your foobar portable installation at another path (with less nesting).');
	}
	console.log('Error saving to ' + file);
	return false;
}

function _saveFSO(file, value, bUTF16) {
	file = _resolvePath(file);
	const filePath = utils.SplitFilePath(file)[0];
	if (!_isFolder(filePath)) { _createFolder(filePath); }
	if (_isFolder(filePath)) {
		try {
			const fileObj = fso.CreateTextFile(file, true, bUTF16);
			fileObj.Write(value);
			fileObj.Close();
			return true;
		} catch (e) {
			console.log(parseWinApiError(e.message));
		}
	}
	console.log('Error saving to ' + file);
	return false;
}

function _saveSplitJson(file, value, replacer = void (0), space = void (0), splitBy = 50000, bBOM = false) {
	file = _resolvePath(file);
	const filePath = utils.SplitFilePath(file)[0];
	if (!_isFolder(filePath)) { _createFolder(filePath); }
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
		const data = JSON.parse(value);
		return data;
	} catch (e) { // eslint-disable-line no-unused-vars
		return null;
	}
}

function _jsonParseFile(file, codePage = 0) {
	return _jsonParse(_open(file, codePage));
}

function _jsonParseFileSplit(filePath, codePage = 0) {
	filePath = _resolvePath(filePath);
	const [path, fileName, extension] = utils.SplitFilePath(filePath);
	const files = utils.Glob(path + '\\' + fileName + '*' + extension);
	let result = [];
	const regex = new RegExp(fileName + '[0-9]*' + extension); // Only allow numbers as suffix
	for (const file of files) {
		if (regex.test(file)) {
			const data = _jsonParseFile(file, codePage);
			if (data) { result = result.concat(data); }
			else { return null; }
		}
	}
	return result;
}

function _jsonParseFileCheck(file, fileName = 'Json', popupName = window.Name, codePage = 0) {
	file = _resolvePath(file);
	let data = null;
	if (_isFile(file)) {
		data = _jsonParseFile(file, codePage);
		if (!data && utils.GetFileSize(file)) {
			console.log(fileName + ' file is corrupt:\n\t', file); // DEBUG
			fb.ShowPopupMessage(fileName + ' file is corrupt:\n' + file, popupName);
		}
	} else {
		console.log(fileName + ' file not found:\n\t', file); // DEBUG
		fb.ShowPopupMessage(fileName + ' file not found:\n' + file, popupName);
	}
	return data;
}

// Opens explorer on file (and selects it) or folder
function _explorer(fileOrFolder) {
	fileOrFolder = _resolvePath(fileOrFolder);
	if (fileOrFolder.startsWith('::{')) { // Virtual folder
		WshShell.Run('explorer /e, ' + fileOrFolder);
		return true; // There is no way to know if the explorer window got opened at the right path...
	} else if (_isFile(fileOrFolder)) { // File
		WshShell.Run('explorer /select,' + _q(fileOrFolder));
		return true;
	} else if (_isFolder(fileOrFolder)) { // Folder
		WshShell.Run('explorer /e,' + _q(fileOrFolder));
		return true;
	} else if (_isLink(fileOrFolder)) { // Link
		WshShell.Run('explorer ' + _q(fileOrFolder));
		return true;
	}
	return false;
}

// Workaround for bug on win 7 on utils.Glob(), matching extensions with same chars: utils.Glob(*.m3u) returns *.m3u8 files too
function getFiles(folderPath, extensionSet) {
	folderPath = _resolvePath(folderPath);
	return utils.Glob(folderPath + '*.*').filter((item) => {
		return extensionSet.has('.' + item.split('.').pop().toLowerCase());
	});
}

function _run() {
	try {
		WshShell.Run(Array.from(arguments, (arg) => /^(CMD |")/gi.test(arg) ? arg : _q(arg)).join(' '));
		return true;
	} catch (e) { // eslint-disable-line no-unused-vars
		return false;
	}
}

function _runHidden() {
	try {
		WshShell.Run(Array.from(arguments, (arg) => /^(CMD |")/gi.test(arg) ? arg : _q(arg)).join(' '), 0, true);
		return true;
	} catch (e) { // eslint-disable-line no-unused-vars
		return false;
	}
}

function _runCmd(command, bWait = false, iShow = 0) {
	try {
		WshShell.Run(command, iShow, bWait);
		return true;
	} catch (e) {
		console.log('_runCmd(): failed to run command ' + command + '(' + e + ')');
		return false;
	}
}

function _exec(command) {
	const execObj = WshShell.Exec(command);
	return new Promise((res, rej) => {
		const intervalID = setInterval(() => {
			switch (execObj.Status) {
				case 2: rej(execObj.StdErr.ReadAll()); break;
				case 1: res(execObj.StdOut.ReadAll()); break;
				default: return; // do nothing
			}
			clearInterval(intervalID);
		}, 50);
	});
}

// Replace once originalString from a file
function editTextFile(filePath, originalString, newString, bBOM = false) {
	let bDone = false;
	let reason = -1;
	filePath = _resolvePath(filePath);
	if (_isFile(filePath)) {
		let fileText = _open(filePath);
		const extension = utils.SplitFilePath(filePath)[2];
		const codePage = checkCodePage(fileText, extension);
		if (codePage !== -1) { fileText = _open(filePath, codePage); }
		if (typeof fileText !== 'undefined' && fileText.length >= 1) {
			let fileTextNew = fileText;
			if (isArray(originalString) && isArray(newString) && originalString.length === newString.length) {
				originalString = originalString.filter(Boolean); // '' values makes no sense to be replaced
				if (isArrayStrings(originalString) && isArrayStrings(newString, true) && originalString.length === newString.length) { //newString may have blank values but both arrays must have same length
					const replacements = newString.length;
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
					const check = _open(filePath, utf8);
					bDone = (check === fileTextNew);
				} else { reason = -1; }
			} else { reason = 1; }
		} else { reason = 0; }
	} else { reason = -1; }
	return [bDone, reason];
}

function checkCodePage(originalText, extension, bAdvancedCheck = false) {
	let codepage = -1;
	const plsText = Array.isArray(originalText) ? originalText : originalText.split(/\r\n|\n\r|\n|\r/);
	if (extension === '.m3u8') { codepage = utf8; }
	else if (extension === '.m3u' && plsText.length >= 2 && plsText[1].startsWith('#EXTENC:')) {
		const codepageName = plsText[1].split(':').pop();
		if (codepageName) { codepage = convertCharsetToCodepage(codepageName); }
	} else if ((extension === '.xspf' || extension === '.asx' || extension === '.xsp') && plsText.length >= 2 && plsText[0].includes('encoding=')) {
		const codepageName = plsText[0].match(/encoding="(\S*)"/).pop();
		if (codepageName) { codepage = convertCharsetToCodepage(codepageName); }
	} else if (bAdvancedCheck) {
		if (plsText.length && plsText.some((line) => {
			line = line.toLowerCase();
			return (line.includes('ã©') || line.includes('ã¨') || line.includes('ã¼') || line.includes('ãº'));
		})) {
			codepage = utf8;
		} else if (plsText.length && plsText.some((line) => { line = line.toLowerCase(); return (line.includes('�')); })) {
			codepage = systemCodePage;
		}
	}
	return codepage || -1;
}

function findRecursivePaths(path = fb.ProfilePath) {
	path = _resolvePath(path);
	let arr = [], pathArr = [];
	arr = utils.Glob(path + '*.*', 0x00000020); // Directory
	arr.forEach((subPath) => {
		if (subPath.includes('\\..') || subPath.includes('\\.')) { return; }
		if (_comparePaths(subPath, path)) { return; }
		pathArr.push(subPath);
		pathArr = pathArr.concat(findRecursivePaths(subPath + '\\'));
	});
	return pathArr;
}

function findRecursiveDirs(path = fb.ProfilePath) {
	return findRecursivePaths(path).map((dir) => dir.replace(_resolvePath(path), ''));
}

function findRecursiveFile(fileMask, inPaths = [fb.ProfilePath, fb.ComponentPath]) {
	let fileArr = [];
	if (isArrayStrings(inPaths)) {
		inPaths = inPaths.map((path) => _resolvePath(path));
		let pathArr = inPaths; // Add itself
		inPaths.forEach((path) => { pathArr = pathArr.concat(findRecursivePaths(path)); });
		pathArr.forEach((path) => { fileArr = fileArr.concat(utils.Glob(path + (path.endsWith('\\') ? '' : '\\') + fileMask)); });
	}
	return fileArr;
}

function findRelPathInAbsPath(relPath, absPath = fb.FoobarPath) {
	let finalPath = '';
	if (relPath.startsWith('.\\profile\\') && _comparePaths(absPath, fb.ProfilePath)) { finalPath = relPath.replace('.\\profile\\', absPath); }
	else if (relPath.startsWith(folders.xxxRootName) && _comparePaths(absPath, folders.xxx)) { finalPath = relPath.replace(folders.xxxRootName, absPath); }
	else if (relPath.startsWith('.\\') && _comparePaths(absPath, fb.FoobarPath)) { finalPath = relPath.replace('.\\', absPath); }
	else {
		const relPathArr = relPath.split('\\').filter(Boolean);
		const absPathArr = absPath.split('\\').filter(Boolean);
		let bIntersect = new Set(relPathArr).intersectionSize(new Set(absPathArr));
		if (bIntersect) {
			bIntersect = false;
			for (let i = relPathArr.length - 1; i >= 0; i--) {
				for (let j = absPathArr.length - 1; j >= 0; j--) {
					if (bIntersect) {
						if (relPathArr[i] === '..') { relPathArr[i] = ''; }
						else if (relPathArr[i].toLowerCase() !== absPathArr[i].toLowerCase()) { relPathArr[i] = absPathArr[j]; }
					} else { bIntersect = relPathArr[i].toLowerCase() === absPathArr[j].toLowerCase(); }
				}
			}
			finalPath = relPathArr.join('\\');
		} else {
			finalPath = relPathArr.map((folder) => { return (folder !== '..' ? folder : ''); }).filter(Boolean);
			finalPath = absPathArr.slice(0, absPathArr.length - (relPathArr.length - finalPath.length)).concat(finalPath);
			finalPath = finalPath.join('\\');
		}
	}
	if (finalPath.length && relPath.endsWith('\\') && !finalPath.endsWith('\\')) { finalPath += '\\'; }
	return finalPath;
}

function testPath(path, relativeTo = '') {
	let bDead = false;
	if (!_isLink(path)) {
		if (absPathRegExp.test(path)) { bDead = !_isFile(path); }
		else {
			let pathAbs = path;
			if (pathAbs.startsWith('.\\')) { pathAbs = pathAbs.replace('.\\', relativeTo); }
			else { pathAbs = findRelPathInAbsPath(pathAbs, relativeTo); }
			bDead = !_isFile(pathAbs);
		}
	}
	return !bDead;
}
function sanitize(value) {
	return value && value.length ? value.replace(/[/\\|:–]/g, '-').replace(/\*/g, 'x').replace(/"/g, '\'\'').replace(/[<>]/g, '_').replace(/\?/g, '').replace(/(?! )\s/g, '') : '';
}

function sanitizePath(value) { // Sanitize illegal chars but skip drive
	if (!value || !value.length) { return ''; }
	const disk = (value.match(/^\w:\\/g) || [''])[0];
	return disk + (disk && disk.length ? value.replace(disk, '') : value).replace(/\//g, '\\').replace(/[|–‐—-]/g, '-').replace(/\*/g, 'x').replace(/"/g, '\'\'').replace(/[<>]/g, '_').replace(/[?:]/g, '').replace(/(?! )\s/g, '');
}

function UUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { /* cspell:disable-line */
		const rnd = Math.random() * 16 | 0;
		const v = c === 'x' ? rnd : (rnd & 0x3 | 0x8);
		return v.toString(16);
	});
}

function lastModified(file, bParse = false) {
	file = _resolvePath(file);
	if (!_isFile(file)) { return -1; }
	return bParse ? Date.parse(fso.GetFile(file).DateLastModified) : fso.GetFile(file).DateLastModified;
}

function created(file, bParse = false) {
	file = _resolvePath(file);
	if (!_isFile(file)) { return -1; }
	return bParse ? Date.parse(fso.GetFile(file).DateCreated) : fso.GetFile(file).DateCreated;
}

function getFileMeta(file, bParse = false) {
	file = _resolvePath(file);
	if (!_isFile(file)) { return null; }
	const fileObj = fso.GetFile(file);
	return {
		created: bParse ? Date.parse(fileObj.DateCreated) : fileObj.DateCreated,
		modified: bParse ? Date.parse(fileObj.DateLastModified) : fileObj.DateLastModified
	};
}

function formatFileSize(val) {
	const regexTwoDecs = /^(\d*\.\d{2,3})/;
	const regexHundreds = /^(\d{3,4})/;
	const regexUnit = /(^\d*.*\d* )(\w*)/;
	val = utils.FormatFileSize(val);  // X.XX bb
	if (regexHundreds.test(val)) {
		val = val.replace(regexHundreds, round(parseFloat(val.match(regexHundreds)[0] / 1024), 3));
		const unit = val.match(regexUnit)[2];
		let toUnit = '';
		switch (unit) {
			case 'B': toUnit = 'KB'; break;
			case 'KB': toUnit = 'MB'; break;
			case 'MB': toUnit = 'GB'; break;
			case 'GB': toUnit = 'TB'; break;
		}
		val = val.replace(regexUnit, '$1' + toUnit);
	}
	if (regexTwoDecs.test(val)) {
		val = val.replace(regexTwoDecs, round(parseFloat(val.match(regexTwoDecs)[0]), 1));
	}
	return val;
}

function getPathMeta(path, sizeUnit = 'GB', bSkipFolderSize = true) {
	path = _resolvePath(path);
	const driveName = fso.GetDriveName(path);
	if (!driveName) { return null; }
	const drive = fso.GetDrive(driveName);
	if (!drive) { return null; }
	const folder = fso.GetFolder(path);
	const out = {
		letter: null, path: null, type: null, volume: null,
		folder: { name: null, size: null, sizePercent: null, type: null, isRoot: null, dateCreated: null, dateModified: null },
		size: { total: null, free: null, name: null, freePercent: null }
	};
	const unit = fileSizeMask.get(sizeUnit) || 1;
	if (drive.IsReady) {
		out.letter = drive.DriveLetter;
		out.path = drive.Path + '\\';
		out.type = drive.DriveType;
		out.volume = drive.VolumeName;
		out.size.total = round(drive.TotalSize / unit, 2);
		out.size.free = round(drive.FreeSpace / unit, 2);
		out.size.freePercent = round(out.size.free / out.size.total * 100, 1);
		out.size.totalFormat = formatFileSize(drive.TotalSize);
		out.size.freeFormat = formatFileSize(drive.FreeSpace);
		out.folder.name = folder.Name || out.letter;
		out.folder.path = folder.Path || out.path;
		out.folder.type = folder.Type || out.type;
		out.folder.isRoot = folder.IsRootFolder;
		if (!out.folder.isRoot) {
			if (!bSkipFolderSize) { // Is slow...
				try {
					out.folder.size = round(folder.Size, 2);
					out.folder.sizePercent = round(out.folder.size / out.size.total * 100, 1);
				} catch (e) { /* fso fails on large folders */ } // eslint-disable-line no-unused-vars
			}
			out.folder.dateCreated = folder.DateCreated; // .toString()
			out.folder.dateModified = folder.DateLastModified;
		} else {
			out.folder.size = out.size.total;
			out.folder.sizePercent = 100;
		}
	}
	return out;
}


function parseWinApiError(message, bAddLink = true) {
	const code = (/\((\w*)\)/gi.exec(message)[1] || 'UNKNOWN').toUpperCase().replace('0X', '0x');
	return 'WinAPI error: ' + code + ' - ' + WinApiError[code] +
		(bAddLink ? '\n\t Check: https://www.hresult.info/FACILITY_CONTROL' + (code !== 'UNKNOWN' ? '/' + code : '') : '');
}