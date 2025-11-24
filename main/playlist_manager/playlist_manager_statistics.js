'use strict';
//21/11/25

/* exported _listStatistics */

/* global panel:readable, list:readable, overwriteProperties:readable, MF_GRAYED:readable, _b:readable, MF_STRING:readable, _ps:readable, VK_CONTROL:readable, VK_ALT:readable */
include('..\\statistics\\statistics_xxx.js');
/* global opaqueColor:readable, Chroma:readable, _scale:readable, blendColors:readable, invert:readable, _chart:readable, Input:readable */
include('..\\statistics\\statistics_xxx_menu.js');
/* global createStatisticsMenu:readable */
include('..\\..\\helpers\\menu_xxx.js');
/* global _menu:readable */

function _listStatistics(x, y, w, h, bEnabled = false, config = {}) {
	const parent = this;
	const sizeThreshold = 25; // Used at getData to classify playlists by size
	let rows = 0;
	let columns = 0;
	let nCharts = [];
	let charts = [];

	const saveSettings = function () { // Must be bound to chart context
		const config = this.exportConfig();
		const keys = new Set(['graph', 'dataManipulation', 'grid', 'axis', 'margin', 'buttons']);
		Object.keys(config).forEach((key) => {
			if (!keys.has(key)) { delete config[key]; }
		});
		config.dataManipulation.sort = this.exportSortLabel();
		config.data = { source: parent.source.toLowerCase(), sourceArg: parent.sourceArg, option: parent.option.toLowerCase(), arg: parent.arg }; // Similar to this.exportDataLabels()
		list.properties['statsConfig'][1] = JSON.stringify(config);
		overwriteProperties(list.properties);
	};

	this.attachCallbacks = () => {
		addEventListener('on_paint', (gr) => {
			if (!window.ID || !this.bEnabled) { return; }
			if (!window.Width || !window.Height) { return; }
			panel.paintImage(gr, { w: window.Width, h: window.Height, x: 0, y: 0, offsetH: 0 });
			charts.forEach((chart) => chart.paint(gr));
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
			charts.some((chart) => chart.move(x, y, mask));
		});

		addEventListener('on_mouse_leave', () => {
			if (!this.bEnabled) { return; }
			charts.forEach((chart) => chart.leave());
		});

		addEventListener('on_mouse_lbtn_up', (x, y, mask) => {
			if (!this.bEnabled) { return true; }
			charts.some((chart) => chart.lbtnUp(x, y, mask));
		});

		addEventListener('on_mouse_lbtn_dblclk', (x, y, mask) => {
			if (!window.ID || !this.bEnabled) { return; }
			charts.some((chart) => chart.lbtnDblClk(x, y, mask));
		});

		addEventListener('on_mouse_wheel', (step) => {
			if (!window.ID || !this.bEnabled) { return; }
			if (utils.IsKeyPressed(VK_CONTROL) && utils.IsKeyPressed(VK_ALT)) {
				charts.some((chart) => chart.mouseWheelResize(step, void(0), { bSaveProperties: true }));
			} else { charts.some((chart) => chart.mouseWheel(step)); }
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
				onBtnUp: saveSettings.bind(this)
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
						const input = Input.string('string', parent.sourceArg || '', 'Enter playlist name(s):\n(separated by ;)', window.Name + _ps(window.ScriptInfo.Name), 'My Playlist;Other Playlist', void (0), true) || Input.lastInput;
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
		return createStatisticsMenu.call(this, {
			bClear,
			menuKey: 'displayMenu',
			bShowMulti: false,
			hideCharts: new Set(['timeline']),
			onBtnUp: saveSettings.bind(this)
		});
	};

	this.onLbtnUpPoint = function onLbtnUpPoint(point, x, y, mask) { // eslint-disable-line no-unused-vars
		if (!point) { return; }
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
			tooltipText: function (point, series, mask) { return '\n\n(L. click to filter list by ' + this.axis.x.key + ')'; }, // eslint-disable-line no-unused-vars
			callbacks: {
				point: { onLbtnUp: parent.onLbtnUpPoint },
				settings: { onLbtnUp: function (x, y, mask) { return parent.onLbtnUpSettings.call(this).btn_up(x, y); } }, // eslint-disable-line no-unused-vars
				display: { onLbtnUp: function (x, y, mask) { return parent.onLbtnUpDisplay.call(this).btn_up(x, y); } }, // eslint-disable-line no-unused-vars
				custom: { onLbtnUp: parent.exit, tooltip: 'Exit statistics mode...' },
				config: {
					backgroundColor: () => [panel.getColorBackground()],
					change: function (config, changeArgs, callbackArgs) {
						if (callbackArgs && callbackArgs.bSaveProperties) {	saveSettings.call(this); }
					},
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
		nCharts = Array.from({ length: rows }, (row, i) => {
			return Array.from({ length: columns }, (cell, j) => {
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