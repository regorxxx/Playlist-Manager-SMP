'use strict';
//08/11/22

// Folders
const folders = {};
folders.xxxName = 'scripts\\SMP\\xxx-scripts\\'; // Edit here to change install path (this is relative to the profile path)
folders.dataName = 'js_data\\';
folders.xxx = fb.ProfilePath + folders.xxxName; 
folders.data = fb.ProfilePath + folders.dataName;
folders.userHelpers = folders.data + 'helpers\\';
folders.temp = folders.data + 'temp\\';
folders.userPresets = folders.data + 'presets\\';
folders.userPresetsGlobal = folders.userPresets + 'global\\';

// Files
const soFeatFile = folders.temp + 'soFeatures.json'; // Used at helpers_xxx_so.js

// Global helpers
include(fb.ComponentPath + 'docs\\Codepages.js');
include(fb.ComponentPath + 'docs\\Flags.js');
include('helpers_xxx_basic_js.js');
include('helpers_xxx_console.js');
include('helpers_xxx_foobar.js');
include('helpers_xxx_global.js');
include('helpers_xxx_so.js');

/* 
	Global Variables 
*/
const isFoobarV2 = isCompatible('2.0', 'fb');

// Async processing
const iStepsLibrary = 100; // n steps to split whole library processing: check library tags, pre-cache paths, etc.
const iDelayLibrary = isFoobarV2 ? 200 : 100; // ms per step for whole handle processing
const iDelayLibraryPLM = isFoobarV2 ? 40 : 25; // ms per step for whole handle processing
const iDelayPlaylists = 120; // ms per step for playlist processing: playlist manager

// Console log file used at helpers_xxx_console.js
conLog = fb.ProfilePath + 'console.log'; // Edit here to change logging file. Replace with '' or null to disable logging
conLogMaxSize = 5000000; // File size, in bytes. Setting to zero or null disables logging too

/* 
	Global tags, queries, RegExp
*/
// Load user files used at helpers_xxx_global.js
loadUserDefFile(globTags);
loadUserDefFile(globQuery);
loadUserDefFile(globRegExp);
addGlobTags();

/* 
	SO features
*/
const soFeat = getSoFeatures();
if (Object.values(soFeat).slice(0, -1).some((val) => {return !val;})) { // Retry once if something fails
	new Promise((resolve) => {setTimeout(getSoFeatures, 1000); resolve(true);}).then((resolve) => {initCheckFeatures(soFeat);});
} else {initCheckFeatures(soFeat);}