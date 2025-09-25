'use strict';
//06/08/25

/* exported createStatisticsMenu */

// Don't load this helper unless menu framework is also present
// https://github.com/regorxxx/Menu-Framework-SMP
try { include('..\\..\\helpers\\menu_xxx.js'); } catch (e) { // eslint-disable-line no-unused-vars
	try { include('..\\..\\examples\\_statistics\\menu_xxx.js'); } catch (e) { fb.ShowPopupMessage('Missing menu framework file', window.Name + ' (' + window.ScriptInfo.Name + ')'); } // eslint-disable-line no-unused-vars
}

/* global _menu:readable */
/* global MF_GRAYED:readable, MF_CHECKED:readable, _scale:readable, MF_STRING:readable, colorbrewer:readable, MF_MENUBARBREAK:readable, Input:readable, isArrayEqual:readable */

/**
 * Generic statistics menu which should work on almost any chart. Must be bound to a _chart() instance.
 * Usage: createStatisticsMenu.call(this, args).btn_up(...)
 *
 * @function
 * @name createStatisticsMenu
 * @this _chart
 * @param {object} [o] - Arguments
 * @param {_menu} [o.bClear] - [=true] Flag to reset menu on every call
 * @param {_menu} [o.menuKey] - [='menu'] Key where the menu object will be stored within this context
 * @param {function} [o.onBtnUp] - [=null] Callback called after menu is closed
 * @param {boolean} [o.bShowMulti] - [=true] Flag to show/hide 3D-related (Z-axis) settings
 * @param {set<string>} [o.hideCharts] - Set of chart types which should be hidden
 * @returns {_menu}
 */
function createStatisticsMenu({ bClear = true, menuKey = 'menu', onBtnUp = null, bShowMulti = true, hideCharts = new Set('lines-hq') } = {}) {
	// Constants
	this.tooltip.SetValue(null);
	if (!this[menuKey]) { this[menuKey] = new _menu({ onBtnUp }); }
	/** @type {_menu} */
	const menu = this[menuKey];
	if (bClear) { menu.clear(true); } // Reset on every call
	// helper
	const createMenuOption = (key, subKey, menuName = menu.getMainMenuName(), bCheck = true, addFunc = null) => {
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
								this.changeConfig(obj);
							} else {
								this.changeConfig({ [key]: { [subKey]: option.newValue }, callbackArgs: { bSaveProperties: true } });
							}
						}
						else { this.changeConfig({ [key]: option.newValue, callbackArgs: { bSaveProperties: true } }); }
					}, flags: Object.hasOwn(option, 'flags') ? option.flags : MF_STRING
				});
				if (bCheck) {
					menu.newCheckMenu(menuName, option.entryText, void (0), () => {
						if (key === 'dataManipulation' && subKey.includes('sort')) {
							return Array.isArray(subKey)
								? !!this.sortKey && option.newValue === this.sortKey[subKey[1]]
								: option.newValue === this.sortKey || ['x', 'y', this.graph.multi ? 'z' : '']
									.filter(Boolean).every((k) => option.newValue === this.sortKey[k]);
						}
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
	const filterGreat = (num) => ((a) => a.y > num);
	const filterLow = (num) => ((a) => a.y < num);
	const filterBetween = (lim) => ((a) => a.y > lim[0] && a.y < lim[1]);
	const fineGraphs = new Set(['bars', 'fill', 'doughnut', 'pie', 'timeline', 'horizontal-bars']).difference(hideCharts || new Set());
	const sizeGraphs = new Set(['scatter', 'lines']).difference(hideCharts || new Set());
	// Header
	menu.newEntry({ entryText: this.title, flags: MF_GRAYED });
	menu.newSeparator();
	// Menus
	{
		const subMenu = menu.newMenu('Chart type');
		[
			{ isEq: null, key: this.graph.type, value: null, newValue: 'timeline', entryText: 'Timeline' },
			{ isEq: null, key: this.graph.type, value: null, newValue: 'scatter', entryText: 'Scatter' },
			{ isEq: null, key: this.graph.type, value: null, newValue: 'bars', entryText: 'Bars' },
			{ isEq: null, key: this.graph.type, value: null, newValue: 'horizontal-bars', entryText: 'Bars (horizontal)' },
			{ isEq: null, key: this.graph.type, value: null, newValue: 'lines', entryText: 'Lines' },
			{ isEq: null, key: this.graph.type, value: null, newValue: 'lines-hq', entryText: 'Lines (high quality)' },
			{ isEq: null, key: this.graph.type, value: null, newValue: 'fill', entryText: 'Fill' },
			{ isEq: null, key: this.graph.type, value: null, newValue: 'doughnut', entryText: 'Doughnut' },
			{ isEq: null, key: this.graph.type, value: null, newValue: 'pie', entryText: 'Pie' },
		].filter((opt) => !hideCharts.has(opt.newValue)).forEach(createMenuOption('graph', 'type', subMenu, void (0), (option) => {
			this.graph.borderWidth = fineGraphs.has(option.newValue) ? _scale(1) : _scale(4);
		}));
	}
	{
		const subMenu = menu.newMenu('Distribution');
		[
			{ isEq: null, key: this.dataManipulation.distribution, value: null, newValue: null, entryText: 'Standard graph' },
			{ isEq: null, key: this.dataManipulation.distribution, value: null, newValue: 'normal', entryText: 'Normal distrib.' },
		].forEach(createMenuOption('dataManipulation', 'distribution', subMenu));
		menu.newCheckMenuLast(() => ['normal inverse', 'normal'].includes(this.dataManipulation.distribution));
		menu.newSeparator();
	}
	{
		const subMenu = menu.newMenu('Sorting');
		if (this.dataManipulation.distribution === null) {
			menu.newEntry({ menuName: subMenu, entryText: 'Applied in ' + (this.graph.multi ? 'Z-' : '') + 'Y-X order:', flags: MF_GRAYED });
			menu.newSeparator(subMenu);
			['x', 'y', this.graph.multi ? 'z' : ''].filter(Boolean).forEach((axis) => {
				const subMenuTwo = menu.newMenu('By ' + axis.toUpperCase() + ' axis', subMenu, this.dataManipulation.sort[axis] ? MF_CHECKED : void (0));
				[
					{ isEq: null, key: null, value: null, newValue: 'natural' + (axis === 'y' ? ' num' : ''), entryText: 'Natural sorting' },
					{ isEq: null, key: null, value: null, newValue: 'reverse' + (axis === 'y' ? ' num' : ''), entryText: 'Reverse sorting' },
					{ entryText: 'sep' },
				].forEach(createMenuOption('dataManipulation', ['sort', axis], subMenuTwo));
				[
					{ isEq: null, key: null, value: null, newValue: null, entryText: 'No sorting' }
				].forEach(createMenuOption('dataManipulation', ['sort', axis], subMenuTwo));
			});
			if (this.graph.multi) {
				menu.newSeparator(subMenu);
				const subMenuTwo = menu.newMenu('Z-Axis groups', subMenu, this.dataManipulation.sort.my || this.dataManipulation.sort.mz ? MF_CHECKED : void (0));
				[
					{ isEq: null, key: null, value: null, newValue: 'natural num', entryText: 'Natural sorting (Y)' },
					{ isEq: null, key: null, value: null, newValue: 'reverse num', entryText: 'Reverse sorting (Y)' },
					{ isEq: null, key: null, value: null, newValue: 'natural total', entryText: 'Natural sorting (ΣY)' },
					{ isEq: null, key: null, value: null, newValue: 'reverse total', entryText: 'Reverse sorting (ΣY)' },
					{ entryText: 'sep' },
				].forEach(createMenuOption('dataManipulation', ['sort', 'my'], subMenuTwo));
				[
					{ isEq: null, key: null, value: null, newValue: 'natural', entryText: 'Natural sorting (Z)' },
					{ isEq: null, key: null, value: null, newValue: 'reverse', entryText: 'Reverse sorting (Z)' },
					{ entryText: 'sep' },
				].forEach(createMenuOption('dataManipulation', ['sort', 'mz'], subMenuTwo));
				[
					{ isEq: null, key: null, value: null, newValue: null, entryText: 'No sorting (Y)' },
				].forEach(createMenuOption('dataManipulation', ['sort', 'my'], subMenuTwo));
				[
					{ isEq: null, key: null, value: null, newValue: null, entryText: 'No sorting (Z)' },
				].forEach(createMenuOption('dataManipulation', ['sort', 'mz'], subMenuTwo));
			}
			menu.newSeparator(subMenu);
			[
				{ isEq: null, key: null, value: null, newValue: null, entryText: 'No sorting' }
			].forEach(createMenuOption('dataManipulation', 'sort', subMenu));
		} else {
			[
				{ isEq: null, key: this.dataManipulation.distribution, value: 'normal', newValue: 'normal inverse', entryText: 'See tails' },
				{ isEq: null, key: this.dataManipulation.distribution, value: 'normal inverse', newValue: 'normal', entryText: 'Mean centered' }
			].forEach(createMenuOption('dataManipulation', 'distribution', subMenu));
		}
		menu.newSeparator();
	}
	{ // NOSONAR
		{
			const subMenu = menu.newMenu('Show (X-axis)');
			if (this.buttons.zoom) {
				menu.newEntry({ menuName: subMenu, entryText: 'Changed with zoom:', flags: MF_GRAYED });
				menu.newSeparator(subMenu);
			}
			const options = [
				{ isEq: false, key: this.dataManipulation.slice, value: [0, 4], newValue: [0, 4], entryText: '4 items' + (this.dataManipulation.distribution ? ' per tail' : '') },
				{ isEq: false, key: this.dataManipulation.slice, value: [0, 10], newValue: [0, 10], entryText: '10 items' + (this.dataManipulation.distribution ? ' per tail' : '') },
				{ isEq: false, key: this.dataManipulation.slice, value: [0, 20], newValue: [0, 20], entryText: '20 items' + (this.dataManipulation.distribution ? ' per tail' : '') },
				{ isEq: false, key: this.dataManipulation.slice, value: [0, 50], newValue: [0, 50], entryText: '50 items' + (this.dataManipulation.distribution ? ' per tail' : '') }
			];
			options.forEach(createMenuOption('dataManipulation', 'slice', subMenu));
			menu.newSeparator(subMenu);
			menu.newEntry({
				menuName: subMenu, entryText: 'Custom range...' + '\t[' + this.dataManipulation.slice + ']', func: () => {
					const slice = [0, Infinity];
					slice[0] = Input.number('int positive', this.dataManipulation.slice[0], 'Input number:', 'Show X-points from', 40);
					if (slice[0] === null) {
						if (!Input.isLastEqual) { return; }
						slice[0] = Input.previousInput;
					}
					slice[1] = Input.number('int positive', this.dataManipulation.slice[1], 'Input number:\n(must be greater than previous one: ' + slice[0] + ')', 'Show X-points up to', slice[0] + 1, [(n) => n > slice[0]]);
					if (slice[1] === null) {
						if (!Input.isLastEqual) { return; }
						slice[1] = Input.previousInput;
					}
					if (isArrayEqual(this.dataManipulation.slice, slice)) { return; }
					this.changeConfig({ dataManipulation: { slice }, callbackArgs: { bSaveProperties: true } });
				}
			});
			menu.newCheckMenuLast(() => !options.some((opt) => isArrayEqual(this.dataManipulation.slice, opt.value)));
			[
				{ entryText: 'sep' },
				{ isEq: false, key: this.dataManipulation.slice, value: [0, Infinity], newValue: [0, Infinity], entryText: 'Show entire X-axis' },
			].forEach(createMenuOption('dataManipulation', 'slice', subMenu));
		}
		{
			const subMenu = menu.newMenu('Filter (Y-axis)');
			const subMenuGreat = menu.newMenu('Greater than', subMenu);
			const subMenuLow = menu.newMenu('Lower than', subMenu);
			// Create a filter entry for each fraction of the max value (duplicates filtered)
			const parent = this;
			const options = [...new Set([
				this.stats.minY, this.stats.maxY,
				...[1000, 100, 10, 10 / 2, 10 / 3, 10 / 5, 10 / 7].map((frac) => Math.round(this.stats.maxY / frac) || 1)
			])].sort((a, b) => a - b);
			{
				options.map((val) => {
					return { isEq: null, key: this.dataManipulation.filter, value: null, newValue: filterGreat(val), entryText: val };
				}).forEach(function (option, i) {
					createMenuOption('dataManipulation', 'filter', subMenuGreat, false)(option);
					menu.newCheckMenu(subMenuGreat, option.entryText, void (0), () => {
						const filter = this.dataManipulation.filter;
						const filterStr = (filter || '').toString();
						return !!filter && filterStr.includes(' > ') && filter({ y: options[i] + 1 }) && !filter({ y: options[i] }); // Just a hack to check the current value is the filter
					});
				}.bind(parent));
				menu.newSeparator(subMenuGreat);
				menu.newEntry({
					menuName: subMenuGreat, entryText: 'Custom value...', func: () => {
						let val = Input.number('real', -Infinity, 'Input real number:', 'Allow only Y-Value greater than', 40);
						if (val === null) {
							if (!Input.isLastEqual) { return; }
							val = Input.previousInput;
						}
						this.changeConfig({
							dataManipulation: {
								filter: val === -Infinity ? null : filterGreat(val)
							}, callbackArgs: { bSaveProperties: true }
						});
					}
				});
				menu.newCheckMenuLast(() => {
					const filter = this.dataManipulation.filter;
					const filterStr = (filter || '').toString();
					return !!filter && filterStr.includes(' > ') && options.every((val) => !menu.isChecked(subMenuGreat, val));
				});
			}
			{
				options.map((val) => {
					return { isEq: null, key: this.dataManipulation.filter, value: null, newValue: filterLow(val), entryText: val };
				}).forEach(function (option, i) {
					createMenuOption('dataManipulation', 'filter', subMenuLow, false)(option);
					menu.newCheckMenu(subMenuLow, option.entryText, void (0), () => {
						const filter = this.dataManipulation.filter;
						const filterStr = (filter || '').toString();
						return !!filter && filterStr.includes(' < ') && filter({ y: options[i] + 1 }) && !filter({ y: options[i] }); // Just a hack to check the current value is the filter
					});
				}.bind(parent));
				menu.newSeparator(subMenuLow);
				menu.newEntry({
					menuName: subMenuLow, entryText: 'Custom value...', func: () => {
						let val = Input.number('real', Infinity, 'Input real number:', 'Allow only Y-Value lower than', 40);
						if (val === null) {
							if (!Input.isLastEqual) { return; }
							val = Input.previousInput;
						}
						this.changeConfig({
							dataManipulation: {
								filter: val === Infinity ? null : filterLow(val)
							}, callbackArgs: { bSaveProperties: true }
						});
					}
				});
				menu.newCheckMenuLast(() => {
					const filter = this.dataManipulation.filter;
					const filterStr = (filter || '').toString();
					return !!filter && filterStr.includes(' < ') && options.every((val) => !menu.isChecked(subMenuLow, val));
				});
			}
			{
				menu.newSeparator(subMenu);
				menu.newEntry({
					menuName: subMenu, entryText: 'Between 2 values...', func: () => {
						const limits = [-Infinity, Infinity];
						limits[0] = Input.number('real', -Infinity, 'Input real number:', 'Allow only Y-Value greater than', 40);
						if (limits[0] === null) {
							if (!Input.isLastEqual) { return; }
							limits[0] = Input.previousInput;
						}
						limits[1] = Input.number('real', Infinity, 'Input real number:', 'Allow only Y-Value lower than', 40);
						if (limits[1] === null) {
							if (!Input.isLastEqual) { return; }
							limits[1] = Input.previousInput;
						}
						this.changeConfig({
							dataManipulation: {
								filter: limits.every((n) => !Number.isFinite(n)) ? null : filterBetween(limits)
							}, callbackArgs: { bSaveProperties: true }
						});
					}
				});
				menu.newCheckMenuLast(() => {
					const filter = this.dataManipulation.filter;
					const filterStr = (filter || '').toString();
					return !!filter && filterStr.includes(' < ') && filterStr.includes(' > ');
				});
			}
			[
				{ entryText: 'sep' },
				{ isEq: null, key: this.dataManipulation.filter, value: null, newValue: null, entryText: 'No filter' },
			].forEach(createMenuOption('dataManipulation', 'filter', subMenu));
		}
		if (bShowMulti) {
			menu.newSeparator();
			{	// Z-Axis groups
				const subMenuGroup = menu.newMenu('Filter (Z-Axis)' + (!this.graph.multi ? '\t[3D-Graphs]' : ''), void (0), this.graph.multi ? MF_STRING : MF_GRAYED);
				if (this.graph.multi) {
					menu.newEntry({ menuName: subMenuGroup, entryText: 'Filter Z-points on groups:', flags: MF_GRAYED });
					menu.newSeparator(subMenuGroup);
					[
						{ isEq: null, key: this.dataManipulation.mFilter, value: false, newValue: true, entryText: 'Non-zero Y-values' },
						{ isEq: null, key: this.dataManipulation.mFilter, value: true, newValue: false, entryText: 'All available points' },
					].forEach(createMenuOption('dataManipulation', 'mFilter', subMenuGroup));
				}
			}
			{	// Z-Axis groups
				const subMenuGroup = menu.newMenu('Groups (Z-Axis)' + (!this.graph.multi ? '\t[3D-Graphs]' : ''), void (0), this.graph.multi ? MF_STRING : MF_GRAYED);
				if (this.graph.multi) {
					menu.newEntry({ menuName: subMenuGroup, entryText: 'Z-points per X-value to show:', flags: MF_GRAYED });
					menu.newSeparator(subMenuGroup);
					const parent = this;
					const options = [...new Set([this.stats.maxGroup, 10, 8, 5, 4, 3, 2, 1].map((frac) => {
						return Math.round(this.stats.maxGroup / frac) || this.stats.minGroup; // Don't allow zero
					}))];

					options.map((val) => {
						return { isEq: null, key: this.dataManipulation.group, value: null, newValue: val, entryText: val + ' point(s)' };
					}).forEach(function (option, i) {
						createMenuOption('dataManipulation', 'group', subMenuGroup, false)(option);
						menu.newCheckMenuLast(() => this.dataManipulation.group === options[i]);
					}.bind(parent));
					menu.newSeparator(subMenuGroup);
					menu.newEntry({
						menuName: subMenuGroup, entryText: 'Custom value...' + '\t[' + this.dataManipulation.group + ']', func: () => {
							const val = Input.number('int positive', this.dataManipulation.group, 'Input number:', 'Number of Z-points per X-value', 40);
							if (val === null) { return; }
							this.changeConfig({ dataManipulation: { group: val }, callbackArgs: { bSaveProperties: true } });
						}
					});
					menu.newCheckMenuLast(() => !options.some((val) => this.dataManipulation.group === val));
				}
			}
		}
		menu.newSeparator();
	}
	{
		const subMenu = menu.newMenu('Axis & labels');
		{
			const subMenuTwo = menu.newMenu('Grid', subMenu);
			[
				{ isEq: null, key: this.grid.x.show, value: null, newValue: { show: !this.grid.x.show }, entryText: (this.grid.x.show ? 'Hide' : 'Show') + ' X grid' }
			].forEach(createMenuOption('grid', 'x', subMenuTwo, false));
			[
				{ isEq: null, key: this.grid.y.show, value: null, newValue: { show: !this.grid.y.show }, entryText: (this.grid.y.show ? 'Hide' : 'Show') + ' Y grid' }
			].forEach(createMenuOption('grid', 'y', subMenuTwo, false));
		}
		{
			const subMenuTwo = menu.newMenu('Axis', subMenu);
			[
				{ isEq: null, key: this.axis.x.show, value: null, newValue: { show: !this.axis.x.show }, entryText: (this.axis.x.show ? 'Hide' : 'Show') + ' X axis' }
			].forEach(createMenuOption('axis', 'x', subMenuTwo, false));
			[
				{ isEq: null, key: this.axis.y.show, value: null, newValue: { show: !this.axis.y.show }, entryText: (this.axis.y.show ? 'Hide' : 'Show') + ' Y axis' }
			].forEach(createMenuOption('axis', 'y', subMenuTwo, false));
		}
		{
			const subMenuTwo = menu.newMenu('Labels', subMenu);
			[
				{ isEq: null, key: this.axis.x.labels, value: null, newValue: { labels: !this.axis.x.labels }, entryText: (this.axis.x.labels ? 'Hide' : 'Show') + ' X labels' }
			].forEach(createMenuOption('axis', 'x', subMenuTwo, false));
			[
				{ isEq: null, key: this.axis.y.labels, value: null, newValue: { labels: !this.axis.y.labels }, entryText: (this.axis.y.labels ? 'Hide' : 'Show') + ' Y labels' }
			].forEach(createMenuOption('axis', 'y', subMenuTwo, false));
			menu.newSeparator(subMenuTwo);
			[
				{ isEq: null, key: this.axis.x.bAltLabels, value: null, newValue: !this.axis.x.bAltLabels, entryText: 'Alt. X labels' },
			].forEach(createMenuOption('axis', ['x', 'bAltLabels'], subMenuTwo, true));
			if (this.graph.type === 'timeline' && this.graph.multi) {
				[
					{ isEq: null, key: this.graphSpecs.timeline.bAxisCenteredX, value: null, newValue: !this.graphSpecs.timeline.bAxisCenteredX, entryText: 'Center X tick' },
				].forEach(createMenuOption('graphSpecs', ['timeline', 'bAxisCenteredX'], subMenuTwo, true));
			}
		}
		{
			const subMenuTwo = menu.newMenu('Titles', subMenu);
			[
				{ isEq: null, key: this.axis.x.showKey, value: null, newValue: { showKey: !this.axis.x.showKey }, entryText: (this.axis.x.showKey ? 'Hide' : 'Show') + ' X title' }
			].forEach(createMenuOption('axis', 'x', subMenuTwo, false));
			[
				{ isEq: null, key: this.axis.y.showKey, value: null, newValue: { showKey: !this.axis.y.showKey }, entryText: (this.axis.y.showKey ? 'Hide' : 'Show') + ' Y title' }
			].forEach(createMenuOption('axis', 'y', subMenuTwo, false));
		}
		{
			const subMenuTwo = menu.newMenu('Dynamic colors', subMenu, this.callbacks.config.backgroundColor ? MF_STRING : MF_GRAYED);
			[
				{ isEq: null, key: this.configuration.bDynLabelColor, value: null, newValue: !this.configuration.bDynLabelColor, entryText: 'Invert background color' },
			].forEach(createMenuOption('configuration', 'bDynLabelColor', subMenuTwo, true));
			[
				{ isEq: null, key: this.configuration.bDynLabelColorBW, value: null, newValue: !this.configuration.bDynLabelColorBW, entryText: 'Only in B&W', flags: this.configuration.bDynLabelColor ? MF_STRING : MF_GRAYED },
			].forEach(createMenuOption('configuration', 'bDynLabelColorBW', subMenuTwo, true));
		}
	}
	{
		const bHasDynColor = this.callbacks.config.artColors && Object.hasOwn(this.configuration, 'bDynSeriesColor');
		const bUsesDynColor = bHasDynColor && this.configuration.bDynSeriesColor;
		const subMenu = menu.newMenu('Color palette');
		[
			{ isEq: null, key: this.chroma.scheme, value: null, newValue: 'diverging', entryText: 'Diverging', flags: bUsesDynColor ? MF_GRAYED : MF_STRING },
			{ isEq: null, key: this.chroma.scheme, value: null, newValue: 'qualitative', entryText: 'Qualitative', flags: bUsesDynColor ? MF_GRAYED : MF_STRING },
			{ isEq: null, key: this.chroma.scheme, value: null, newValue: 'sequential', entryText: 'Sequential', flags: bUsesDynColor ? MF_GRAYED : MF_STRING },
			{ entryText: 'sep' },
			{ isEq: null, key: this.chroma.scheme, value: null, newValue: 'random', entryText: 'Random', flags: bUsesDynColor ? MF_GRAYED : MF_STRING },
		].forEach(createMenuOption('chroma', 'scheme', subMenu, true, () => { this.colors = []; })); // Remove colors to force new palette
		menu.newSeparator(subMenu);
		{
			const subMenuTwo = menu.newMenu('By scheme', subMenu, bUsesDynColor ? MF_GRAYED : MF_STRING);
			let j = 0;
			for (let key in colorbrewer) {
				if (key === 'colorBlind') { continue; }
				colorbrewer[key].forEach((scheme, i) => {
					if (i === 0) {
						menu.newEntry({ menuName: subMenuTwo, entryText: key.charAt(0).toUpperCase() + key.slice(1), flags: (j === 0 ? MF_GRAYED : MF_GRAYED | MF_MENUBARBREAK) });
						menu.newSeparator(subMenuTwo);
					}
					if (this.chroma.colorBlindSafe && !colorbrewer.colorBlind[key].includes(scheme)) { return; }
					[
						{ isEq: null, key: this.chroma.scheme, value: null, newValue: scheme, entryText: scheme },
					].forEach(createMenuOption('chroma', 'scheme', subMenuTwo, true, () => { this.colors = []; })); // Remove colors to force new palette
				});
				j++;
			}
		}
		menu.newSeparator(subMenu);
		menu.newEntry({
			menuName: subMenu, entryText: 'Colorblind safe', func: () => {
				this.colors = [];
				this.changeConfig({ chroma: { colorBlindSafe: !this.chroma.colorBlindSafe }, callbackArgs: { bSaveProperties: true } });
			}, flags: this.chroma.scheme === 'random' || bUsesDynColor ? MF_GRAYED : MF_STRING
		});
		menu.newCheckMenu(subMenu, 'Colorblind safe', void (0), () => this.chroma.colorBlindSafe && this.chroma.scheme !== 'random' && !bUsesDynColor);
		if (this.callbacks.config.artColors && Object.hasOwn(this.configuration, 'bDynSeriesColor')) {
			const subMenuTwo = menu.newMenu('Dynamic colors', subMenu);
			[
				{ isEq: null, key: this.configuration.bDynSeriesColor, value: null, newValue: !this.configuration.bDynSeriesColor, entryText: 'Use art colors (background cover mode)' },
			].forEach(createMenuOption('configuration', 'bDynSeriesColor', subMenuTwo, true));
			[
				{ isEq: null, key: this.configuration.bDynBgColor, value: null, newValue: !this.configuration.bDynBgColor, entryText: 'Also apply to background color', flags: bUsesDynColor ? MF_STRING : MF_GRAYED },
			].forEach(createMenuOption('configuration', 'bDynBgColor', subMenuTwo, true));
		}
	}
	{
		const type = this.graph.type.toLowerCase();
		const subMenu = menu.newMenu('Other settings');
		if (sizeGraphs.has(type)) {
			{
				const configSubMenu = menu.newMenu((type === 'lines' ? 'Line' : 'Point') + ' size', subMenu);
				[1, 2, 3, 4].map((val) => {
					return { isEq: null, key: this.graph.borderWidth, value: null, newValue: _scale(val), entryText: val.toString() };
				}).forEach(createMenuOption('graph', 'borderWidth', configSubMenu));
			}
			if (type === 'scatter' || type === 'p-p plot') {
				const configSubMenu = menu.newMenu('Point type', subMenu);
				['circle', 'circumference', 'cross', 'triangle', 'plus'].map((val) => {
					return { isEq: null, key: this.graph.point, value: null, newValue: val, entryText: val };
				}).forEach(createMenuOption('graph', 'point', configSubMenu));
			}
		}
		{
			const configSubMenu = menu.newMenu('Point transparency', subMenu);
			[0, 20, 40, 60, 80, 100].map((val) => {
				return { isEq: null, key: this.graph.pointAlpha, value: null, newValue: Math.round(val * 255 / 100), entryText: val.toString() + (val === 0 ? '\t(transparent)' : val === 100 ? '\t(opaque)' : '') };
			}).forEach(createMenuOption('graph', 'pointAlpha', configSubMenu));
		}
	}
	return menu;
}