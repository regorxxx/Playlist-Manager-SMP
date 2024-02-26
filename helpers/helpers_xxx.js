'use strict';
//21/02/24

// Folders
const folders = {};
folders.JsPackageDirs = (utils.GetPackageInfo(window.ScriptInfo.PackageId || -1) || {Directories: null}).Directories;
if (folders.JsPackageDirs) {for (const key in folders.JsPackageDirs) {folders.JsPackageDirs[key] += '\\';}}
folders.xxxName = 'scripts\\SMP\\xxx-scripts\\'; // Edit here to change install path (this is relative to the profile path)
folders.dataName = 'js_data\\';
folders.xxx = folders.JsPackageDirs ? folders.JsPackageDirs.Root : fb.ProfilePath + folders.xxxName;
folders.data = fb.ProfilePath + folders.dataName;
folders.dataPackage = folders.JsPackageDirs ? folders.JsPackageDirs.Storage : fb.ProfilePath + folders.dataName;
folders.temp = folders.data + 'temp\\';
folders.tempPackage = folders.dataPackage + 'temp\\';
folders.userHelpers = folders.data + 'helpers\\';
folders.userPresets = folders.data + 'presets\\';
folders.userPresetsGlobal = folders.userPresets + 'global\\';

// Files
/* exported soFeatFile */
const soFeatFile = folders.temp + 'soFeatures.json'; // Used at helpers_xxx_so.js

// Global helpers
include(fb.ComponentPath + 'docs\\Codepages.js');
include(fb.ComponentPath + 'docs\\Flags.js');
include('helpers_xxx_basic_js.js');
include('helpers_xxx_console.js');
include('helpers_xxx_foobar.js');
/* global isCompatible:readable */
include('helpers_xxx_so.js');
/* global getSoFeatures:readable, initCheckFeatures:readable */

/*
	Global Variables
*/
/* exported isFoobarV2, isEnhPlayCount, isPlayCount, isYouTube, isSkipCount, isPlayCount2003 */
const isFoobarV2 = isCompatible('2.0', 'fb');
const isEnhPlayCount = utils.CheckComponent('foo_enhanced_playcount');
const isPlayCount = utils.CheckComponent('foo_playcount');
const isYouTube = utils.CheckComponent('foo_youtube');
const isSkipCount = utils.CheckComponent('foo_skipcount');
const isPlayCount2003 = utils.CheckComponent('foo_playcount_2003');

// Async processing
/* exported iStepsLibrary, iDelayLibrary, iDelayLibraryPLM, iDelayPlaylists */
const iStepsLibrary = 100; // n steps to split whole library processing: check library tags, pre-cache paths, etc.
const iDelayLibrary = isFoobarV2 ? 200 : 100; // ms per step for whole handle processing
const iDelayLibraryPLM = isFoobarV2 ? 40 : 25; // ms per step for whole handle processing
const iDelayPlaylists = 120; // ms per step for playlist processing: playlist manager

// Console log file used at helpers_xxx_console.js
console.File = fb.ProfilePath + 'console.log'; // Edit here to change logging file. Replace with '' or null to disable logging
console.MaxSize = 1000000; // File size, in bytes. Setting to zero or null disables logging too

/*
	Global tags, queries, RegExp, Fonts, Settings
*/
include('helpers_xxx_global.js');
/* global loadUserDefFile:readable, globTags:readable, globQuery:readable, globRegExp:readable, globFonts:readable, globSettings:readable, addGlobTags:readable */
// Load user files used at helpers_xxx_global.js
loadUserDefFile(globTags);
loadUserDefFile(globQuery);
loadUserDefFile(globRegExp);
loadUserDefFile(globSettings);
addGlobTags();

const globProfiler = globSettings.bProfileInit
	? new FbProfiler(window.Name + ' - Global profiler')
	: {Print: () => void(0), Time: void(0), Reset: () => void(0) };

/*
	SO features
*/
const soFeat = getSoFeatures();

/*
	Global Post-settings Fonts
*/
include('helpers_xxx_global_post.js');
loadUserDefFile(globFonts);

// Check user-set fonts
Object.keys(globFonts).forEach((key) => {
	if (!key.startsWith('_') && !utils.CheckFont(globFonts[key].name)) {
		fb.ShowPopupMessage(
			'Missing font set at:' +
			'\n' + globFonts._file +
			'\n\n\t-' + key + ':\t' + globFonts[key].name
			, 'Global fonts'
		);
	}
});

/*
	SO features
*/
if (Object.values(soFeat).slice(0, -1).some((val) => !val)) { // Retry once if something fails
	new Promise((resolve) => {setTimeout(getSoFeatures, 1000); resolve(true);}).then(() => {initCheckFeatures(soFeat, globSettings.bPopupOnCheckSOFeatures);});
} else {initCheckFeatures(soFeat, globSettings.bPopupOnCheckSOFeatures);}

globProfiler.Print('helpers_xxx');