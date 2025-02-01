'use strict';
//01/02/25

/**
 * Global folders setting
 */
const folders = {};
/**
 * Package directories (only available if script is a package)
 * @type {{Root: string, Assets: string, Scripts: string, Storage: string}|null}
 */
folders.JsPackageDirs = (utils.GetPackageInfo(window.ScriptInfo.PackageId || -1) || { Directories: null }).Directories;
if (folders.JsPackageDirs) { for (const key in folders.JsPackageDirs) { folders.JsPackageDirs[key] += '\\'; } }
/**
 * Scripts installation root
 * @type {string} - Ex: scripts\\SMP\\xxx-scripts\\
 */
folders.xxxName = 'scripts\\SMP\\xxx-scripts\\'; // Edit here to change install path (this is relative to the profile path)
/**
 * JS data folder
 * @type {string} - Ex: js_data\\
 */
folders.dataName = 'js_data\\';
/**
 * Path to scripts installation root (adjusted for packages or script files)
 * @type {string} - Ex: [foobar profile]\\scripts\\SMP\\xxx-scripts\\ or [foobar profile]\\foo_spider_monkey_panel\\packages\\{2A6AEDC9-BAE4-4D30-88E2-EDE7225B494D}\\
 */
folders.xxx = folders.JsPackageDirs ? folders.JsPackageDirs.Root : fb.ProfilePath + folders.xxxName;
/**
 * Path to global JS data folder
 * @type {string}- Ex: [foobar profile]\\js_data\\
 */
folders.data = fb.ProfilePath + folders.dataName;
/**
 * Path to local JS data folder (adjusted for packages, fallbacks to global JS data folder otherwise)
 * @type {string}- Ex: [foobar profile]\\js_data\\ or [foobar profile]\\foo_spider_monkey_panel\\package_data\\{2A6AEDC9-BAE4-4D30-88E2-EDE7225B494D}\\
 */
folders.dataPackage = folders.JsPackageDirs ? folders.JsPackageDirs.Storage : folders.data;
/**
 * Path to global JS temp folder
 * @type {string} - Ex: [foobar profile]\\js_data\\temp\\
 */
folders.temp = folders.data + 'temp\\';
/**
 * Path to local JS temp folder (adjusted for packages, fallbacks to global JS data folder otherwise)
 * @type {string}- Ex: [foobar profile]\\js_data\\temp\\ or [foobar profile]\\foo_spider_monkey_panel\\temp\\{2A6AEDC9-BAE4-4D30-88E2-EDE7225B494D}\\
 */
folders.tempPackage = folders.dataPackage + 'temp\\';
/**
 * Path to global JS user helpers folder
 * @type {string} - Ex: [foobar profile]\\js_data\\helpers\\
 */
folders.userHelpers = folders.data + 'helpers\\';
/**
 * Path to global JS user presets folder
 * @type {string} - Ex: [foobar profile]\\js_data\\presets\\
 */
folders.userPresets = folders.data + 'presets\\';
/**
 * Path to global JS user global presets folder
 * @type {string} - Ex: [foobar profile]\\js_data\\presets\\global\\
 */
folders.userPresetsGlobal = folders.userPresets + 'global\\';

/*
	Global files
*/
/* exported soFeatFile */
const soFeatFile = folders.temp + 'soFeatures.json'; // Used at helpers_xxx_so.js

/*
	Global helpers
*/
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
/** @type {boolean} - Flag set when loaded within foobar v2 */
const isFoobarV2 = isCompatible('2.0', 'fb');
/** @type {boolean} - Flag set when foo_enhanced_playcount is present */
const isEnhPlayCount = utils.CheckComponent('foo_enhanced_playcount');
/** @type {boolean} - Flag set when foo_playcount_2003 is present */
const isPlayCount2003 = utils.CheckComponent('foo_playcount_2003');
/** @type {boolean} - Flag set when foo_playcount is present */
const isPlayCount = utils.CheckComponent('foo_playcount');
/** @type {boolean} - Flag set when foo_youtube is present */
const isYouTube = utils.CheckComponent('foo_youtube');
/** @type {boolean} - Flag set when foo_skipcount is present */
const isSkipCount = utils.CheckComponent('foo_skipcount');

/*
	Async processing
*/
/* exported iStepsLibrary, iDelayLibrary, iDelayLibraryPLM, iDelayPlaylists */
/** @type {number} - n steps to split whole library processing: check library tags, pre-cache paths, etc. */
const iStepsLibrary = 100;
/** @type {number} - ms per step for whole handle processing */
const iDelayLibrary = isFoobarV2 ? 200 : 100;
/** @type {number} - ms per step for whole handle processing */
const iDelayLibraryPLM = isFoobarV2 ? 40 : 25;
/** @type {number} - ms per step for playlist processing: playlist manager */
const iDelayPlaylists = 120;

/*
	Console
*/
/** @type {string} - Console log file path. Replace with '' or null to disable logging. */
console.File = fb.ProfilePath + 'console.log';
/** @type {number} - Console log file size, in bytes. Setting to zero or null disables logging. */
console.MaxSize = 1000000;

/*
	Global tags, queries, RegExp, Fonts, Settings
*/
include('helpers_xxx_global.js');
/* global loadUserDefFile:readable, globTags:readable, globQuery:readable, globRegExp:readable, globFonts:readable, globSettings:readable */
// Load user files used at helpers_xxx_global.js
loadUserDefFile(globTags);
loadUserDefFile(globQuery);
loadUserDefFile(globRegExp);
loadUserDefFile(globSettings);

/** @type {FbProfiler} - Global profiler instance to use at init */
const globProfiler = globSettings.bProfileInit
	? new FbProfiler(window.Name + ' - Global profiler')
	: { Print: () => void (0), Time: void (0), Reset: () => void (0) };

if (!globSettings.bLogToFile) { console.disableFile(); }

/*
	SO features
*/
const soFeat = utils.IsFile(soFeatFile)
	? globSettings.bCheckSoFeatures ? getSoFeatures() : {}
	: getSoFeatures();

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
			'\n\t' + globFonts._file +
			'\n\n\t-' + key + ':\t' + globFonts[key].name +
			'\n\n\nEither change the font at the file to one available in your system or install it. Note default fonts are bundled at:' +
			'\n\t' + folders.xxx + '_resources\\fonts\\'
			, 'Global fonts'
		);
	}
});

/*
	SO features
*/
if (Object.values(soFeat).slice(0, -1).some((val) => !val)) { // Retry once if something fails
	new Promise((resolve) => { setTimeout(getSoFeatures, 1000); resolve(true); }).then(() => { initCheckFeatures(soFeat, globSettings.bPopupOnCheckSOFeatures); });
} else { initCheckFeatures(soFeat, globSettings.bPopupOnCheckSOFeatures); }

globProfiler.Print('helpers_xxx');