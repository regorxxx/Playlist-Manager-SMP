'use strict';
//30/01/25

/* exported _listStatistics */

/* global panel:readable, list:readable, overwriteProperties:readable, MF_GRAYED:readable, MF_CHECKED:readable, _b:readable, MF_STRING:readable, isArrayEqual:readable */
include('..\\statistics\\statistics_xxx.js');
/* global opaqueColor:readable, Chroma:readable, _scale:readable, blendColors:readable, invert:readable, _chart:readable */
include('..\\..\\helpers\\menu_xxx.js');
/* global _menu:readable */
include('..\\..\\helpers\\helpers_xxx_input.js');
/* global Input:readable */

function _listStatistics(x, y, w, h, bEnabled = false, config = {}) {
	const parent = this;
	const sizeThreshold = 25; // Used at getData to clasify playlists by size
	let rows = 0;
	let columns = 0;
	let nCharts = [];
	let charts = [];

	this.attachCallbacks = () => {
		addEventListener('on_paint', (gr) => {
			if (!window.ID || !this.bEnabled) { return; }
			if (!window.Width || !window.Height) { return; }
			panel.paintImage(gr, { w: window.Width, h: window.Height, x: 0, y: 0, offsetH: 0 });
			charts.forEach((chart) => { chart.paint(gr); });
		});

		addEventListener('on_size', () => {
			if (!window.ID || !this.bEnabled) { return; }
			if (!window.Width || !window.Height) { return; }
			for (let i = 0; i < rows; i++) {
				for (let j = 0; j < columns; j++) {
					const w = window.Width / columns;
					const h = window.Height / rows * (i + 1);
					const x = w * j;
					const y = window.Height / rows * i;
					nCharts[i][j].changeConfig({ x, y, w, h, bPaint: false });
				}
			}
			list.repaint();
		});

		addEventListener('on_mouse_move', (x, y, mask) => {
			if (!window.ID || !this.bEnabled) { return; }
			charts.some((chart) => { return chart.move(x, y, mask); });
		});

		addEventListener('on_mouse_leave', () => {
			if (!this.bEnabled) { return; }
			charts.forEach((chart) => { chart.leave(); });
		});

		addEventListener('on_mouse_lbtn_up', (x, y, mask) => {
			if (!this.bEnabled) { return true; }
			charts.some((chart) => { return chart.lbtnUp(x, y, mask); });
		});

		addEventListener('on_mouse_lbtn_dblclk', (x, y, mask) => {
			if (!window.ID || !this.bEnabled) { return; }
			charts.some((chart) => { return chart.lbtnDblClk(x, y, mask); });
		});
	};

	const createMenuOptionParent = function createMenuOptionParent(menu, key, subKey, menuName = menu.getMainMenuName(), bCheck = true, addFunc = null, postFunc = null) {
		return function (option) {
			if (menu.isSeparator(option) && !menu.isSeparator(menu.getEntries().pop())) { menu.newSeparator(menuName); return; } // Add sep only if any entry has been added
			if (option.isEq && option.key === option.value || !option.isEq && option.key !== option.value || option.isEq === null) {
				menu.newEntry({
					menuName, entryText: option.entryText, func: () => {
						if (addFunc) { addFunc(option); }
						if (subKey) {
							if (Array.isArray(subKey)) {
								const len = subKey.length - 1;
								const obj = { [key]: {} };
								let prev = obj[key];
								subKey.forEach((curr, i) => {
									prev[curr] = i === len ? option.newValue : {};
									prev = prev[curr];
								});
								this.changeConfig(obj);
							} else {
								this.changeConfig({ [key]: { [subKey]: option.newValue } });
							}
						}
						else { this.changeConfig({ [key]: option.newValue }); }
						if (postFunc) { postFunc(option); }
					},
					flags: Object.hasOwn(option, 'flags') ? option.flags : MF_STRING
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
						if ((key === 'data' || key === 'dataAsync') && Object.keys(option.args[key]).every((val) => parent[val] === option.args[key][val])) { return true; }
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

	// Generic statistics menu which should work on almost any chart...
	this.onLbtnUpSettings = function onLbtnUpSettings(bClear = true) {
		// Constants
		this.tooltip.SetValue(null);
		if (!this.settingsMenu) {
			this.settingsMenu = new _menu({
				onBtnUp: () => {
					const config = this.exportConfig();
					const keys = new Set(['graph', 'dataManipulation', 'grid', 'axis', 'margin']);
					Object.keys(config).forEach((key) => {
						if (!keys.has(key)) { delete config[key]; }
					});
					config.dataManipulation.sort = this.exportSortLabel();
					config.data = { source: parent.source.toLowerCase(), sourceArg: parent.sourceArg, option: parent.option.toLowerCase(), arg: parent.arg }; // Similar to this.exportDataLabels()
					list.properties['statsConfig'][1] = JSON.stringify(config);
					overwriteProperties(list.properties);
				}
			});
		}
		const menu = this.settingsMenu;
		if (bClear) { menu.clear(true); } // Reset on every call
		// helper
		const createMenuOption = createMenuOptionParent.bind(this, menu);
		// Header
		menu.newEntry({ entryText: this.title, flags: MF_GRAYED });
		menu.newSeparator();
		{	// Data
			const subMenu = menu.newMenu('Data...');
			menu.newEntry({ menuName: subMenu, entryText: 'From playlists:', flags: MF_GRAYED });
			menu.newSeparator(subMenu);
			[
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'Extension', args: { axis: 'Ext', data: { option: 'property', arg: 'extension' } },
					flags: parent.source === 'autoplaylists' || parent.source === 'ui' ? MF_GRAYED : MF_STRING
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'Type', args: { axis: 'Type', data: { option: 'property', arg: 'query' } },
					flags: parent.source !== 'all' && parent.source !== 'playlists' ? MF_GRAYED : MF_STRING
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'Categories', args: { axis: 'Category', data: { option: 'property', arg: 'category' } }
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'Tags', args: { axis: 'Tag', data: { option: 'property', arg: 'tags' } }
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'Folders', args: { axis: 'Type', data: { option: 'property', arg: 'isFolder' } },
					flags: parent.source !== 'all' && parent.source !== 'playlists' ? MF_GRAYED : MF_STRING
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'MBID', args: { axis: 'MBID', data: { option: 'property', arg: 'playlist_mbid' } }
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'Size', args: { axis: 'Size', data: { option: 'property', arg: 'size' } }
				},
			].forEach(createMenuOption('data', null, subMenu, true, (option) => {
				option.newValue = Array(1).fill(...parent.getData({ source: parent.source, sourceArg: parent.sourceArg, option: option.args.data.option, arg: option.args.data.arg }));
				[parent.option, parent.arg] = [option.args.data.option, option.args.data.arg];
				this.changeConfig(
					{
						axis: {
							x: { key: option.args.axis }
						},
						title: window.Name + ' - ' + this.axis.y.key + ' per ' + option.entryText
					}
				);
			}));
		}
		menu.newSeparator();
		{
			const subMenu = menu.newMenu('Data source...');
			menu.newEntry({ menuName: subMenu, entryText: 'Select source for playlists:', flags: MF_GRAYED });
			menu.newSeparator(subMenu);
			[
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'All', args: { data: { source: 'all' } }
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'Playlist files', args: { data: { source: 'files' } },
					flags: list.bLiteMode ? MF_GRAYED : MF_STRING
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'AutoPlaylists', args: { data: { source: 'autoplaylists' } },
					flags: list.itemsAutoPlaylist === 0 ? MF_GRAYED : MF_STRING
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'UI-Only playlists', args: { data: { source: 'ui' } },
					flags: list.dataUI.length === 0 ? MF_GRAYED : MF_STRING
				},
				{
					isEq: null, key: this.data, value: null, newValue: null,
					entryText: 'Selected playlist(s)...' +
						(parent.source === 'playlists' ? '\t' + _b((parent.sourceArg || []).length) : ''),
					args: { data: { source: 'playlists', sourceArg: parent.source === 'playlists' ? parent.sourceArg : null } }
				}
			].forEach(createMenuOption('data', null, subMenu, true, (option) => {
				if (Object.hasOwn(option.args.data, 'sourceArg')) {
					if (option.args.data.sourceArg === null) {
						const input = Input.string('string', parent.sourceArg || '', 'Enter playlist name(s):\n(separated by ;)', window.Name, 'My Playlist;Other Playlist', void (0), true) || Input.lastInput;
						if (input === null) { return; }
						parent.sourceArg = input.split(';');
					} else {
						parent.sourceArg = option.args.data.sourceArg;
					}
				}
				option.newValue = Array(1).fill(...parent.getData({ source: option.args.data.source, sourceArg: parent.sourceArg, option: parent.option, arg: parent.arg }));
				parent.source = option.args.data.source;
			}));
		}
		menu.newSeparator();
		menu.newEntry({ entryText: 'Exit statistics mode', func: parent.exit });
		return menu;
	};

	this.onLbtnUpDisplay = function onLbtnUpDisplay(bClear = true) {
		// Constants
		this.tooltip.SetValue(null);
		if (!this.displayMenu) {
			this.displayMenu = new _menu({
				onBtnUp: () => {
					const config = this.exportConfig();
					const keys = new Set(['graph', 'dataManipulation', 'grid', 'axis', 'margin']);
					Object.keys(config).forEach((key) => {
						if (!keys.has(key)) { delete config[key]; }
					});
					config.dataManipulation.sort = this.exportSortLabel();
					config.data = { option: parent.option.toLowerCase(), arg: parent.arg }; // Similar to this.exportDataLabels()
					list.properties['statsConfig'][1] = JSON.stringify(config);
					overwriteProperties(list.properties);
				}
			});
		}
		const menu = this.displayMenu;
		if (bClear) { menu.clear(true); } // Reset on every call
		// helper
		const createMenuOption = createMenuOptionParent.bind(this, menu);
		const filtGreat = (num) => ((a) => a.y > num);
		const filtLow = (num) => ((a) => a.y < num);
		const filtBetween = (lim) => ((a) => a.y > lim[0] && a.y < lim[1]);
		const fineGraphs = new Set(['bars', 'fill', 'doughnut', 'pie']);
		const sizeGraphs = new Set(['scatter', 'lines']);
		const type = this.graph.type.toLowerCase();
		// Header
		menu.newEntry({ entryText: this.title, flags: MF_GRAYED });
		menu.newSeparator();
		// Menus
		{
			const subMenu = menu.newMenu('Chart type...');
			[
				{ isEq: null, key: this.graph.type, value: null, newValue: 'scatter', entryText: 'Scatter' },
				{ isEq: null, key: this.graph.type, value: null, newValue: 'bars', entryText: 'Bars' },
				{ isEq: null, key: this.graph.type, value: null, newValue: 'fill', entryText: 'Fill' },
				{ isEq: null, key: this.graph.type, value: null, newValue: 'lines', entryText: 'Lines' },
				{ isEq: null, key: this.graph.type, value: null, newValue: 'doughnut', entryText: 'Doughnut' },
				{ isEq: null, key: this.graph.type, value: null, newValue: 'pie', entryText: 'Pie' },
			].forEach(createMenuOption('graph', 'type', subMenu, void (0), (option) => {
				this.graph.borderWidth = fineGraphs.has(option.newValue) ? _scale(1) : _scale(4);
			}, (option) => {
				if (['doughnut', 'pie'].includes(type) && type !== option.newValue) {
					this.colors = [list.colors.selectedPlaylistColor];
					this.checkColors();
				}
			}));
		}
		{
			const subMenu = menu.newMenu('Distribution...');
			[
				{ isEq: null, key: this.dataManipulation.distribution, value: null, newValue: null, entryText: 'Standard graph' },
				{ isEq: null, key: this.dataManipulation.distribution, value: null, newValue: 'normal', entryText: 'Normal distrib.' },
			].forEach(createMenuOption('dataManipulation', 'distribution', subMenu));
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
				const options = [...new Set([this.stats.maxY, 1000, 100, 10, 10 / 2, 10 / 3, 10 / 5, 10 / 7].map((frac) => {
					return Math.round(this.stats.maxY / frac) || 1; // Don't allow zero
				}))];
				{
					options.map((val) => {
						return { isEq: null, key: this.dataManipulation.filter, value: null, newValue: filtGreat(val), entryText: val };
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
									filter: val === -Infinity ? null : filtGreat(val)
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
						return { isEq: null, key: this.dataManipulation.filter, value: null, newValue: filtLow(val), entryText: val };
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
									filter: val === Infinity ? null : filtLow(val)
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
									filter: limits.every((n) => !Number.isFinite(n)) ? null : filtBetween(limits)
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
		}
		{
			const subMenu = menu.newMenu('Other config...');
			if (sizeGraphs.has(type)) {
				{
					const configSubMenu = menu.newMenu((type === 'lines' ? 'Line' : 'Point') + ' size...', subMenu);
					[1, 2, 3, 4].map((val) => {
						return { isEq: null, key: this.graph.borderWidth, value: null, newValue: _scale(val), entryText: val.toString() };
					}).forEach(createMenuOption('graph', 'borderWidth', configSubMenu));
				}
				if (type === 'scatter') {
					const configSubMenu = menu.newMenu('Point type...', subMenu);
					['circle', 'circumference', 'cross', 'triangle', 'plus'].map((val) => {
						return { isEq: null, key: this.graph.point, value: null, newValue: val, entryText: val };
					}).forEach(createMenuOption('graph', 'point', configSubMenu));
				}
			}
			{
				const configSubMenu = menu.newMenu('Point transparency...', subMenu);
				[0, 20, 40, 60, 80, 100].map((val) => {
					return { isEq: null, key: this.graph.pointAlpha, value: null, newValue: Math.round(val * 255 / 100), entryText: val.toString() + (val === 0 ? '\t(transparent)' : val === 100 ? '\t(opaque)' : '') };
				}).forEach(createMenuOption('graph', 'pointAlpha', configSubMenu));
			}
		}
		return menu;
	};

	this.onLbtnUpPoint = function onLbtnUpPoint(point, x, y, mask) { // eslint-disable-line no-unused-vars
		const filters = [];
		switch (parent.source) { // NOSONAR
			case 'property': {
				switch (parent.arg) {
					case 'extension':
						filters.push({ extState: point.x });
						break;
					case 'tags':
						filters.push({ tagState: [point.x === 'No tag' ? list.tags(0) : point.x] });
						break;
					case 'category':
						filters.push({ categoryState: [point.x === 'No category' ? list.categories(0) : point.x] });
						break;
					case 'playlist_mbid':
						filters.push({ mbidState: point.x === 'No MBID' ? list.constMbidStates()[1] : list.constMbidStates()[2] });
						break;
					case 'isLocked':
						filters.push({ lockState: point.x });
						break;
					case 'query':
						switch (point.x) {
							case 'Smart Pls.':
								filters.push({ autoPlaylistState: list.constAutoPlaylistStates()[1], extState: '.xsp' });
								break;
							case 'AutoPls.':
								filters.push({ plsState: list.dataAll.filter((pls) => pls.isAutoPlaylist) });
								break;
							case 'Std. Pls.':
								filters.push({ autoPlaylistState: list.constAutoPlaylistStates()[2] });
								break;
							case 'UI Pls.':
								filters.push({ autoPlaylistState: list.constAutoPlaylistStates()[3] });
								break;
						}
						break;
					case 'size':
						switch (point.x) {
							case 'Empty':
								filters.push({ plsState: list.dataAll.filter((pls) => pls.size === 0) });
								break;
							case '?':
								filters.push({ plsState: list.dataAll.filter((pls) => pls.size === '?') });
								break;
							default:
								filters.push({
									plsState: list.dataAll.filter((pls) => {
										return pls.size >= Number(point.x.slice(1)) && pls.size <= (Number(point.x.slice(1)) + sizeThreshold);
									})
								});
								break;
						}
						break;
					case 'isFolder':
						switch (point.x) {
							case 'Folder':
								filters.push({ plsState: list.dataAll.filter((pls) => pls.isFolder) });
								break;
							case 'Playlist':
								filters.push({ plsState: list.dataAll.filter((pls) => !pls.isFolder) });
								break;
						}
						break;
				}
			}
		}
		list.resetFilter();
		parent.exit();
		list.filter(filters.reduce((acc, curr) => { return { ...acc, ...curr }; }, {}));
	};

	this.getData = ({ source = 'all', sourceArg = null, option = 'property', arg = 'extension' } = {}) => {
		let data = [];
		let dataSource;
		switch (source.toLowerCase()) {
			case 'files':
				dataSource = list.dataAll.filter((pls) => pls.extension !== '.ui' && !pls.isAutoPlaylist);
				break;
			case 'autoplaylists':
				dataSource = list.dataAutoPlaylists;
				break;
			case 'ui':
				dataSource = list.dataUI;
				break;
			case 'playlists': // NOSONAR [fallthrough]
				if (sourceArg) {
					sourceArg = new Set(sourceArg.map((name) => name.toString().toLowerCase()));
					dataSource = list.dataAll.filter((pls) => sourceArg.has(pls.name.toLowerCase()));
					break;
				} else { console.popup('Playlists names have not been set while using \'Selected playlists\' as source.', 'Playlist Manager: source error'); }
			case 'all': // eslint-disable-line no-fallthrough
			default:
				dataSource = list.dataAll;
				break;
		}
		switch (option.toLowerCase()) { // NOSONAR
			case 'property': {
				const count = new Map();
				dataSource.forEach((pls) => {
					let val = '';
					switch (arg) {
						case 'isFolder': val = pls[arg] ? 'Folder' : 'Playlist'; break;
						case 'query': {
							if (Object.hasOwn(pls, arg) && pls[arg].length) {
								val = (pls.extension === '.xsp' ? 'Smart Pls.' : 'AutoPls.');
							} else {
								val = (pls.extension === '.ui' ? 'UI Pls.' : 'Std. Pls.');
							}
							break;
						}
						case 'isLocked': val = pls[arg] ? 'Locked' : 'Not locked'; break;
						case 'tags': val = pls[arg].length ? pls[arg] : ['No tag']; break;
						case 'category': val = pls[arg].length ? pls[arg] : 'No category'; break;
						case 'playlist_mbid': val = pls[arg].length ? 'Exported' : 'No MBID'; break;
						case 'size': {
							if (pls.isFolder) { val = null; } // Just skip
							else {
								if (pls.size) { // NOSONAR
									val = !Number.isNaN(pls.size) && pls.size !== '?'
										? '>' + Math.floor(pls.size / sizeThreshold) * sizeThreshold
										: '?';
								} else {
									val = 'Empty';
								}
							}
							break;
						}
						default: val = pls[arg];
					}
					(Array.isArray(val) ? val : [val]).forEach((subVal) => {
						if (subVal === null) { return; }
						if (!count.has(subVal)) { count.set(subVal, 1); }
						else { count.set(subVal, count.get(subVal) + 1); }
					});
				});
				data = [Array.from(count, (point) => { return { x: point[0], y: point[1] }; })];
				break;
			}
		}
		return data;
	};

	this.defaultConfig = () => {
		return {
			data: [], // No data is added by default to set no colors on first init
			graph: { type: 'doughnut', pointAlpha: Math.round(40 * 255 / 100) },
			chroma: {
				scheme: [
					opaqueColor(list.colors.selectedPlaylistColor, 100),
					Chroma.mix(opaqueColor(list.colors.selectedPlaylistColor, 100), invert(opaqueColor(list.colors.selectedPlaylistColor, 100)), 0.4)
				]
			},
			dataManipulation: { sort: 'natural|x', filter: null, distribution: null },
			background: { color: null },
			colors: [list.colors.selectedPlaylistColor],
			margin: { left: _scale(20), right: _scale(20), top: _scale(10), bottom: _scale(15) },
			axis: {
				x: { show: true, color: blendColors(panel.colors.highlight, panel.getColorBackground(), 0.1), width: _scale(2), ticks: 'auto', labels: true, key: 'Key', bAltLabels: true },
				y: { show: true, color: blendColors(panel.colors.highlight, panel.getColorBackground(), 0.1), width: _scale(2), ticks: 'auto', labels: true, key: 'Playlists' }
			},
			x: 0,
			w: 0,
			y: 0,
			h: 0,
			tooltipText: function (point, serie, mask) { return '\n\n(L. click to filter list by ' + this.axis.x.key + ')'; }, // eslint-disable-line no-unused-vars
			callbacks: {
				point: { onLbtnUp: parent.onLbtnUpPoint },
				settings: { onLbtnUp: function (x, y, mask) { return parent.onLbtnUpSettings.call(this).btn_up(x, y); } }, // eslint-disable-line no-unused-vars
				display: { onLbtnUp: function (x, y, mask) { return parent.onLbtnUpDisplay.call(this).btn_up(x, y); } }, // eslint-disable-line no-unused-vars
				custom: { onLbtnUp: parent.exit, tooltip: 'Exit statistics mode...' },
				config: {
					backgroundColor: () => [panel.getColorBackground()]
				},
			},
			buttons: { settings: true, display: true, custom: true },
		};
	};

	/*
		Automatically draw new graphs using table above
	*/
	this.init = () => {
		const newConfig = [
			[ // Row
				{
					...config,
					data: Array(1).fill(...this.getData({ source: this.source, sourceArg: this.sourceArg, option: this.option, arg: this.arg }))
				},
			]
		];
		rows = newConfig.length;
		columns = newConfig[0].length;
		nCharts = Array.from({length: rows}, (row, i) => {
			return Array.from({length: columns}, (cell, j) => {
				const w = window.Width / columns;
				const h = window.Height / rows * (i + 1);
				const x = w * j;
				const y = window.Height / rows * i;
				const defaultConfig = this.defaultConfig();
				const axis = (newConfig[i][j].axis || defaultConfig.axis);
				const title = window.Name + ' - ' + axis.y.key + ' per ' + axis.x.key;
				return new _chart({ ...defaultConfig, x, y, w, h }).changeConfig({ ...newConfig[i][j], bPaint: false, title });
			});
		});
		charts = nCharts.flat(Infinity);
	};

	this.exit = () => {
		parent.bEnabled = !parent.bEnabled;
		list.properties['bStatsMode'][1] = parent.bEnabled;
		overwriteProperties(list.properties);
		list.updateUIElements(); // Buttons, etc.
	};

	this.bEnabled = bEnabled;
	this.source = config && config.data ? (config.data.source || 'all').toLowerCase() : 'all';
	this.sourceArg = config && config.data ? config.data.sourceArg || null : null;
	this.option = config && config.data ? (config.data.option || 'property').toLowerCase() : 'property';
	this.arg = (config && config.data ? config.data.arg : '') || 'extension';
	if (this.bEnabled) { this.init(); }
}