'use strict';
//08/10/21
include(fb.ComponentPath + 'docs\\Codepages.js');
include(fb.ComponentPath + 'docs\\Flags.js');
include('helpers_xxx_basic_js.js');
include('helpers_xxx_console.js');

/* 
	Global Variables 
*/

// Folders
const folders = {};
folders.xxxName = 'scripts\\SMP\\xxx-scripts\\'; // Edit here to change install path (this is relative to the profile path)
folders.dataName = 'js_data\\';
folders.xxx = fb.ProfilePath + folders.xxxName; 
folders.data = fb.ProfilePath + folders.dataName;

// Async processing
const iStepsLibrary = 100; // n steps to split whole library processing: check library tags, pre-cache paths, etc.
const iDelayLibrary = 100; // ms per step for whole handle processing
const iDelayPlaylists = 50; // ms per step for playlist processing: playlist manager
const iDelaySBDCache = 15; // ms per step for playlist processing: playlist manager

// Console log file
conLog = fb.ProfilePath + 'console.log'; // Edit here to change logging file. Replace with '' or null to disable logging
conLogMaxSize = 5000000; // File size, in bytes. Setting to zero or null disables logging too