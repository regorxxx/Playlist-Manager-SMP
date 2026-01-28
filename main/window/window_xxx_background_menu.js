'use strict';
//23/01/26

/* exported createBackgroundMenu */

/* global Chroma:readable, folders:readable */
include('window_xxx_helpers.js');
/* global MF_GRAYED:readable, MF_STRING:readable,  */
include('..\\..\\helpers\\menu_xxx.js');
/* global _menu:readable */
include('..\\..\\helpers\\helpers_xxx_file.js');
/* global _explorer:readable */
include('..\\..\\helpers\\helpers_xxx_input.js');
/* global Input:readable */
include('..\\..\\helpers-external\\namethatcolor\\ntc.js');
/* global ntc:readable */

/**
 * Background settings menu. Must be bound to _background() instance
 *
 * @function
 * @name createBackgroundMenu
 * @kind function
 * @this {_background}
 * @param {{menuName: string, subMenuFrom: string, flags: number}} appendTo
 * @param {_menu} parentMenu
 * @param {{ nameColors: boolean, onInit: (menu:_menu) => void(0) }} options? - nameColors requires Chroma
 * @returns {_menu}
 */
function createBackgroundMenu(appendTo, parentMenu, options = { nameColors: false, onInit: null }) { // NOSONAR
	// Constants
	if (Object.hasOwn(this, 'tooltip')) { this.tooltip.SetValue(null); }
	const menu = parentMenu || new _menu();
	const mainMenuName = appendTo
		? menu.findOrNewMenu(appendTo.menuName, appendTo.subMenuFrom, appendTo.flags)
		: menu.getMainMenuName();
	// helper
	const getColorName = (val) => val !== -1 && val !== null && typeof val !== 'undefined'
		? (ntc.name(Chroma(val).hex())[1] || '').toString() || 'unknown'
		: '-none-';
	const createMenuOption = (key, subKey, menuName = mainMenuName, bCheck = true, addFunc = null, postFunc = null) => {
		return function (option) {
			if (menu.isSeparator(option) && !menu.isSeparator(menu.getEntries().pop())) { menu.newSeparator(menuName); return; } // Add sep only if any entry has been added
			if (option.isEq && option.key === option.value || !option.isEq && option.key !== option.value || option.isEq === null) {
				menu.newEntry({
					menuName, entryText: option.entryText, func: () => {
						if (addFunc) { addFunc(option); }
						if (subKey) {
							if (Array.isArray(subKey)) {
								const len = subKey.length - 1;
								const obj = { [key]: {}, callbackArgs: { bSaveProperties: true } };
								let prev = obj[key];
								subKey.forEach((curr, i) => {
									prev[curr] = i === len ? option.newValue : {};
									prev = prev[curr];
								});
								this.changeConfig({ config: obj, callbackArgs: { bSaveProperties: true } });
							} else {
								this.changeConfig({ config: { [key]: { [subKey]: option.newValue } }, callbackArgs: { bSaveProperties: true } });
							}
						}
						else { this.changeConfig({ config: { [key]: option.newValue }, callbackArgs: { bSaveProperties: true } }); }
						if (postFunc) { postFunc(option); }
					}, flags: Object.hasOwn(option, 'flags') ? option.flags : MF_STRING
				});
				if (bCheck) {
					menu.newCheckMenuLast(() => {
						const val = subKey
							? Array.isArray(subKey)
								? subKey.reduce((acc, curr) => acc[curr], this[key])
								: this[key][subKey]
							: this[key];
						if (option.newValue && typeof option.newValue === 'function') { return !!(val && val.name === option.newValue.name); }
						if (option.newValue && typeof option.newValue === 'object') {
							if (Array.isArray(val)) {
								return !!(val && val.toString() === option.newValue.toString());
							} else if (val) {
								const keys = Object.keys(option.newValue);
								return keys.every((key) => val[key] === option.newValue[key]);
							}
						} else {
							return option.isEq === null && option.value === null && (option.newValue === true || option.newValue === false)
								? !!val
								: (val === option.newValue);
						}
					});
				}
			}
		}.bind(this);
	};
	// Header
	menu.newEntry({ menuName: mainMenuName, entryText: 'Background settings:', flags: MF_GRAYED });
	menu.newSeparator(mainMenuName);
	// Menus
	{
		const subMenu = menu.newMenu('Art mode' + (this.useCover ? '' : '\t[none sel]'), mainMenuName, this.useCover ? MF_STRING : MF_GRAYED);
		[
			{ isEq: null, key: this.coverMode, value: null, newValue: 'front', entryText: 'Front' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'back', entryText: 'Back' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'disc', entryText: 'Disc' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'icon', entryText: 'Icon' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'artist', entryText: 'Artist' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'path', entryText: 'File (by TF)...' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'folder', entryText: 'Folder (by TF)...' },
		].forEach(createMenuOption('coverMode', void (0), subMenu, true, (option) => {
			if (option.newValue === 'path' || option.newValue === 'folder') {
				const bLoadXXX = typeof folders !== 'undefined' && Object.hasOwn(folders, 'xxxRootName');
				const input = option.newValue === 'path'
					? Input.string('string', this.coverModeOptions.path, 'Enter TF expression or file path:\n\nPaths starting with \'.\\profile\\\' are relative to foobar profile folder.' + (bLoadXXX ? '\nPaths starting with \'' + folders.xxxRootName + '\' are relative to this script\'s folder.' : '') + '\n\n\'%FB2K_PROFILE_PATH%\' or \'%PROFILE%\' may also be used.\n\nFor example:\n$directory_path(%PATH%)\\art\\artist.jpg', window.Name + ' (' + window.ScriptInfo.Name + '): Background file path', '$directory_path(%PATH%)\\art\\artist.jpg')
					: Input.string('string', this.coverModeOptions.path, 'Enter TF expression or folder path:\n\nPaths starting with \'.\\profile\\\' are relative to foobar profile folder.' + (bLoadXXX ? '\nPaths starting with \'' + folders.xxxRootName + '\' are relative to this script\'s folder.' : '') + '\n\n\'%FB2K_PROFILE_PATH%\' or \'%PROFILE%\' may also be used.\n\nFor example:\n%PROFILE%\\yttm\\art_img\\$lower($cut(%ARTIST%,1))\\$meta(ARTIST,0)\\', window.Name + ' (' + window.ScriptInfo.Name + '): Background folder path', '%PROFILE%\\yttm\\art_img\\$lower($cut(%ARTIST%,1))\\$meta(ARTIST,0)\\');
				if (input === null) { return; }
				this.changeConfig({ config: { coverModeOptions: { path: input } }, callbackArgs: { bSaveProperties: true } });
			}
		}));
		if (['path', 'folder'].includes(this.coverMode.toLowerCase())) {
			menu.newSeparator(subMenu);
			menu.newEntry({
				menuName: subMenu, entryText: 'Open folder...', func: () => {
					const path = this.getArtPath();
					if (path) { _explorer(path); }
				},
			});
		}
	}
	{
		const subMenu = menu.newMenu('Art crop', mainMenuName, this.showCover ? MF_STRING : MF_GRAYED);
		[
			{ isEq: null, key: this.coverModeOptions.bProportions, value: null, newValue: !this.coverModeOptions.bProportions, entryText: 'Maintain proportions' }
		].forEach(createMenuOption('coverModeOptions', 'bProportions', subMenu, true));
		menu.newSeparator(subMenu);
		[
			{ isEq: null, key: this.coverModeOptions.bFill, value: false, newValue: false, entryText: 'None' }
		].forEach((opt) => {
			createMenuOption('coverModeOptions', 'bFill', subMenu)(opt);
			menu.newCheckMenuLast(() => this.coverModeOptions.bProportions && !this.coverModeOptions.bFill);
			menu.getLastEntry().flags = this.coverModeOptions.bProportions ? MF_STRING : MF_GRAYED;
		});
		[
			{ isEq: null, key: this.coverModeOptions.fillCrop, value: null, newValue: 'top', entryText: 'Top' },
			{ isEq: null, key: this.coverModeOptions.fillCrop, value: null, newValue: 'center', entryText: 'Center' },
			{ isEq: null, key: this.coverModeOptions.fillCrop, value: null, newValue: 'bottom', entryText: 'Bottom' },
		].forEach((opt) => {
			createMenuOption('coverModeOptions', 'fillCrop', subMenu, false, () => {
				this.changeConfig({ config: { coverModeOptions: { bFill: true } }, callbackArgs: { bSaveProperties: true } });
			})(opt);
			menu.newCheckMenuLast(() => this.coverModeOptions.bFill && this.coverModeOptions.bProportions && this.coverModeOptions.fillCrop === opt.newValue);
			menu.getLastEntry().flags = this.coverModeOptions.bProportions ? MF_STRING : MF_GRAYED;
		});
		menu.newSeparator(subMenu);
		menu.newEntry({
			menuName: subMenu, entryText: (this.coverModeOptions.bProportions && !this.coverModeOptions.bFill ? 'Margin (Y-axis)' : 'Enlarge (Y-Axis)') + '\t[' + this.offsetH + ']', func: () => {
				const input = Input.number('int positive', this.offsetH, 'Enter number:\n(integer number ≥0)', window.Name + ' (' + window.ScriptInfo.Name + '): Y-axis margin', 2);
				if (input === null) { return; }
				this.changeConfig({ config: { offsetH: input }, callbackArgs: { bSaveProperties: true } });
			}, flags: this.coverModeOptions.bProportions ? MF_STRING : MF_GRAYED
		});
	}
	{
		const subMenu = menu.newMenu('Art cycle', mainMenuName, ['path', 'folder'].includes(this.coverMode.toLowerCase()) ? MF_STRING : MF_GRAYED);
		[
			{ isEq: null, key: this.coverModeOptions.pathCycleTimer, value: null, newValue: 0, entryText: 'Disabled' },
			{ isEq: null, key: this.coverModeOptions.pathCycleTimer, value: null, newValue: 5000, entryText: '5' },
			{ isEq: null, key: this.coverModeOptions.pathCycleTimer, value: null, newValue: 10000, entryText: '10' },
			{ isEq: null, key: this.coverModeOptions.pathCycleTimer, value: null, newValue: 20000, entryText: '20' },
		].forEach(createMenuOption('coverModeOptions', 'pathCycleTimer', subMenu, true, (option) => {
			if (option.newValue === 0 || !this.coverModeOptions.pathCycleTimer) { this.resetArtFiles(); }
		}));
		menu.newSeparator(subMenu);
		[
			{ isEq: null, key: this.coverModeOptions.pathCycleSort, value: null, newValue: 'name', entryText: 'By name' },
			{ isEq: null, key: this.coverModeOptions.pathCycleSort, value: null, newValue: 'date', entryText: 'By date (last modified)' },
		].forEach(createMenuOption('coverModeOptions', 'pathCycleSort', subMenu, true));
	}
	{
		const bAvailable = this.useCover && this.coverModeOptions.bProportions && !this.coverModeOptions.bFill;
		const subMenu = menu.newMenu('Art reflection' + (bAvailable ? '' : '\t[none crop]'), mainMenuName, bAvailable ? MF_STRING : MF_GRAYED);
		[
			{ isEq: null, key: this.coverModeOptions.reflection, value: null, newValue: 'none', entryText: 'None' },
			{ isEq: null, key: this.coverModeOptions.reflection, value: null, newValue: 'asymmetric', entryText: 'Asymmetrical' },
			{ isEq: null, key: this.coverModeOptions.reflection, value: null, newValue: 'symmetric', entryText: 'Symmetrical' },
		].forEach(createMenuOption('coverModeOptions', 'reflection', subMenu, true));
	}
	{
		const subMenu = menu.newMenu('Art effects', mainMenuName, this.useCover ? MF_STRING : MF_GRAYED);
		[
			{ isEq: null, key: this.coverModeOptions.bCircularBlur, value: null, newValue: !this.coverModeOptions.bCircularBlur, entryText: 'Circular blur' }
		].forEach(createMenuOption('coverModeOptions', 'bCircularBlur', subMenu, true));
		menu.getLastEntry().flags = this.coverModeOptions.blur === 0 || !this.showCover ? MF_GRAYED : MF_STRING;
		[
			{ key: 'blur', entryText: 'Blur...', checks: [(num) => num >= 0 && num < Infinity], inputHint: '\n(0 to ∞)' },
			{ entryText: menu.separator },
			{ key: 'angle', entryText: 'Angle...', checks: [(num) => num >= 0 && num <= 360], inputHint: '\nClockwise.\n(0 to 360)' },
			{ key: 'zoom', entryText: 'Zoom...', checks: [(num) => num >= 0 && num <= 100], inputHint: '\n0 is full image, 100 is fully zoomed.\n(0 to 100)' },
			{ entryText: menu.separator },
			{ key: 'mute', entryText: 'Mute...', checks: [(num) => num >= 0 && num <= 100], inputHint: '\n0 is disabled, 100 is max effect.\n(0 to 100)' },
			{ key: 'bloom', entryText: 'Bloom...', checks: [(num) => num >= 0 && num <= 100], inputHint: '\n0 is disabled, 100 is max effect.\n(0 to 100)' },
			{ key: 'edgeGlow', entryText: 'Edge...', checks: [(num) => num >= 0 && num <= 100], inputHint: '\n0 is disabled, 100 is max effect.\n(0 to 100)' },
			{ entryText: menu.separator },
			{ key: 'alpha', entryText: 'Opacity...', checks: [(num) => num >= 0 && num <= 100], inputHint: '\n0 is transparent, 100 is opaque.\n(0 to 100)' },
		].forEach((option) => {
			if (menu.isSeparator(option)) { menu.newSeparator(subMenu); return; }
			const prevVal = option.key === 'alpha' ? Math.round(this.coverModeOptions[option.key] * 100 / 255) : this.coverModeOptions[option.key];
			menu.newEntry({
				menuName: subMenu, entryText: option.entryText + '\t[' + prevVal + ']', func: () => {
					const input = Input.number('int positive', prevVal, 'Enter number:' + option.inputHint, window.Name + ' (' + window.ScriptInfo.Name + ')', 100, option.checks);
					if (input === null) { return; }
					const newVal = option.key === 'alpha' ? Math.round(input * 255 / 100) : input;
					this.changeConfig({ config: { coverModeOptions: { [option.key]: newVal } }, callbackArgs: { bSaveProperties: true } });
				}, flags: this.useCover && (option.key === 'alpha' || this.showCover || this.colorMode === 'blend') ? MF_STRING : MF_GRAYED
			});
		});
		menu.newSeparator(subMenu);
		[
			{ isEq: null, key: this.coverModeOptions.bFlipX, value: null, newValue: !this.coverModeOptions.bFlipX, entryText: 'Flip on X-axis' }
		].forEach(createMenuOption('coverModeOptions', 'bFlipX', subMenu, true));
		[
			{ isEq: null, key: this.coverModeOptions.bFlipY, value: null, newValue: !this.coverModeOptions.bFlipY, entryText: 'Flip on Y-axis' }
		].forEach(createMenuOption('coverModeOptions', 'bFlipY', subMenu, true));
	}
	menu.newSeparator(mainMenuName);
	{
		const subMenu = menu.newMenu('Selection mode', mainMenuName);
		[
			{ isEq: null, key: this.coverMode, value: null, newValue: 'none', entryText: 'None' },
		].forEach(createMenuOption('coverMode', void (0), subMenu));
		menu.newSeparator(subMenu);
		[
			{ isEq: null, key: this.coverModeOptions.bNowPlaying, value: null, newValue: true, entryText: 'Follow now playing' }
		].forEach(createMenuOption('coverModeOptions', 'bNowPlaying', subMenu, false, () => {
			if (!this.useCover) {
				this.changeConfig({ config: { coverMode: this.getDefaultCoverMode() }, callbackArgs: { bSaveProperties: true } });
			}
		}));
		[
			{ isEq: null, key: this.coverModeOptions.bNowPlaying, value: null, newValue: false, entryText: 'Follow selection' }
		].forEach(createMenuOption('coverModeOptions', 'bNowPlaying', subMenu, false, () => {
			if (!this.useCover) {
				this.changeConfig({ config: { coverMode: this.getDefaultCoverMode() }, callbackArgs: { bSaveProperties: true } });
			}
		}));
		menu.getLastEntry().flags = !this.useCover ? MF_GRAYED : MF_STRING;
		menu.newCheckMenuLast(() => this.coverMode === 'none' ? 0 : (this.coverModeOptions.bNowPlaying ? 1 : 2), 4);
		menu.newSeparator(subMenu);
		[
			{ isEq: null, key: this.coverModeOptions.bNoSelection, value: null, newValue: !this.coverModeOptions.bNoSelection, entryText: 'No selection (as fallback)' }
		].forEach(createMenuOption('coverModeOptions', 'bNoSelection', subMenu, true));
		menu.getLastEntry().flags = !this.useCover || !this.coverModeOptions.bNowPlaying ? MF_GRAYED : MF_STRING;
	}
	menu.newSeparator(mainMenuName);
	{
		const subMenu = menu.newMenu('Color mode', mainMenuName);
		[
			{ isEq: null, key: this.colorMode, value: null, newValue: 'none', entryText: 'None' },
			{ isEq: null, key: this.colorMode, value: null, newValue: 'single', entryText: 'Single...' + (options.nameColors ? '\t[' + getColorName(this.colorModeOptions.color[0]) + ']' : '') },
			{ isEq: null, key: this.colorMode, value: null, newValue: 'gradient', entryText: 'Gradient...' + (options.nameColors ? '\t[' + this.colorModeOptions.color.map(getColorName).join(', ') + ']' : '') },
			{ isEq: null, key: this.colorMode, value: null, newValue: 'bigradient', entryText: 'Bigradient...' + (options.nameColors ? '\t[' + this.colorModeOptions.color.map(getColorName).join(', ') + ']' : '') }
		].forEach(createMenuOption('colorMode', void (0), subMenu, true, (option) => {
			if (!['none'].includes(option.newValue)) {
				let input;
				if (option.newValue === 'single') {
					input = [utils.ColourPicker(0, this.colorModeOptions.color[0]), this.colorModeOptions.color[1]];
					console.log('Background (' + window.Name + ' (' + window.ScriptInfo.Name + ')' + '): Selected color ->\n\t Android: ' + input[0] + ' - RGB: ' + Chroma(input[0]).rgb());
				} else {
					input = this.colorModeOptions.color.map((color) => utils.ColourPicker(0, color));
					console.log('Background (' + window.Name + ' (' + window.ScriptInfo.Name + ')' + '): Selected color ->' + input.map((col) => '\n\t Android: ' + col + ' - RGB: ' + Chroma(col).rgb()).join(''));
				}
				this.changeConfig({ config: { colorModeOptions: { color: input } }, callbackArgs: { bSaveProperties: true } });
			}
		}));
		[
			{ isEq: null, key: this.colorMode, value: null, newValue: 'blend', entryText: 'Blend\t[from art]' },
		].forEach(createMenuOption('colorMode', void (0), subMenu, false));
		menu.newCheckMenuLast(() => this.useCover && this.colorMode === 'blend');
		menu.getLastEntry().flags = this.useCover ? MF_STRING : MF_GRAYED;
		menu.newSeparator(subMenu);
		[
			{ isEq: null, key: this.colorModeOptions.bUiColors, value: null, newValue: !this.colorModeOptions.bUiColors, entryText: (window.InstanceType ? 'Use Default UI colors' : 'Use Columns UI colors') }
		].forEach(createMenuOption('colorModeOptions', 'bUiColors', subMenu, true));
		menu.getLastEntry().flags = this.useColors && this.colorMode !== 'blend' ? MF_STRING : MF_GRAYED;
		[
			{ isEq: null, key: this.colorModeOptions.bDither, value: null, newValue: !this.colorModeOptions.bDither, entryText: 'Apply dither' }
		].forEach(createMenuOption('colorModeOptions', 'bDither', subMenu, true));
		menu.getLastEntry().flags = this.useColors && this.colorMode !== 'blend' ? MF_STRING : MF_GRAYED;
		menu.newSeparator(subMenu);
		[
			{ key: 'angle', entryText: 'Gradient angle...', type: 'int positive', checks: [(num) => num >= 0 && num < 360], inputHint: '\nClockwise.\n(0 to 360)' },
			{ key: 'focus', entryText: 'Gradient focus...', type: 'real positive', checks: [(num) => num >= 0 && num <= 1], inputHint: '\nWhere the centred color will be at its highest intensity.\n(0 to 1)' },
		].forEach((option) => {
			menu.newEntry({
				menuName: subMenu, entryText: option.entryText + '\t[' + this.colorModeOptions[option.key] + ']', func: () => {
					const input = Input.number(option.type, this.colorModeOptions[option.key], 'Enter number:' + option.inputHint, window.Name + ' (' + window.ScriptInfo.Name + ')', 100, option.checks);
					if (input === null) { return; }
					this.changeConfig({ config: { colorModeOptions: { [option.key]: input } }, callbackArgs: { bSaveProperties: true } });
				}, flags: ['gradient', 'bigradient'].includes(this.colorMode) ? MF_STRING : MF_GRAYED
			});
		});
		[
			{ isEq: null, key: this.colorModeOptions.bDarkBiGradOut, value: null, newValue: !this.colorModeOptions.bDarkBiGradOut, entryText: 'Gradient prefer dark out' }
		].forEach(createMenuOption('colorModeOptions', 'bDarkBiGradOut', subMenu, true));
		menu.getLastEntry().flags = ['bigradient'].includes(this.colorMode) ? MF_STRING : MF_GRAYED;
		menu.newSeparator(subMenu);
		[
			{ key: 'blendIntensity', entryText: 'Blend blur intensity...', type: 'int positive', checks: [(num) => num >= 0 && num < 90], inputHint: '\nBlur intensity.\n(0 to 90)' },
			{ key: 'blendAlpha', entryText: 'Blend opacity...', type: 'int positive', checks: [(num) => num >= 0 && num <= 100], inputHint: '\n0 is transparent, 100 is opaque.\n(0 to 100)' },
		].forEach((option) => {
			const prevVal = option.key === 'blendAlpha' ? Math.round(this.colorModeOptions[option.key] * 100 / 255) : this.colorModeOptions[option.key];
			menu.newEntry({
				menuName: subMenu, entryText: option.entryText + '\t[' + prevVal + ']', func: () => {
					const input = Input.number('int positive', prevVal, 'Enter number:' + option.inputHint, window.Name + ' (' + window.ScriptInfo.Name + ')', 100, option.checks);
					if (input === null) { return; }
					const newVal = option.key === 'blendAlpha' ? Math.round(input * 255 / 100) : input;
					this.changeConfig({ config: { colorModeOptions: { [option.key]: newVal } }, callbackArgs: { bSaveProperties: true } });
				}, flags: this.colorMode === 'blend' ? MF_STRING : MF_GRAYED
			});
		});
	}
	menu.newSeparator(mainMenuName);
	[
		{ isEq: null, key: this.coverModeOptions.bProcessColors, value: null, newValue: !this.coverModeOptions.bProcessColors, entryText: 'Process art colors' }
	].forEach(createMenuOption('coverModeOptions', 'bProcessColors', mainMenuName, true));
	menu.getLastEntry().flags = !this.useCover ? MF_GRAYED : MF_STRING;

	if (options.onInit) { options.onInit(menu); }

	return menu;
}