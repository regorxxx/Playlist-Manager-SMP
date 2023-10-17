'use strict';
//17/10/23

include('..\\..\\helpers\\helpers_xxx.js');
include('..\\window\\window_xxx_input.js');
include('..\\..\\helpers\\helpers_xxx_UI.js');
include('..\\..\\helpers\\helpers_xxx_UI_draw.js');
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
include('..\\..\\helpers\\helpers_xxx_properties.js');
include('..\\..\\helpers\\helpers_xxx_playlists.js');
include('..\\..\\helpers\\helpers_xxx_playlists_files.js');
include('..\\..\\helpers\\helpers_xxx_tags.js');
include('..\\..\\helpers\\helpers_xxx_file.js');
include('..\\..\\helpers\\helpers_xxx_utils.js');
include('..\\..\\helpers\\helpers_xxx_controller.js');
include('..\\..\\helpers-external\\keycode-2.2.0\\index.js');
include('playlist_manager_panel.js');
include('playlist_manager_helpers.js');


function _list(x, y, w, h) {
	const bProfile = false;
	// Pls Keys
	const defPls = new oPlaylist();
	const defPlsKeys = new Set(Object.keys(new oPlaylist()));
	// Icons
	const gfontIconChar = () => {return _gdiFont('FontAwesome', _scale(panel.fonts.size - (_scale(72) > 120 ? 8 : _scale(72) > 96 ? 6 : 4)), 0);}; // Icon may overlap on high DPI systems without this adjustment
	const gfontIconCharAlt = () => {return _gdiFont('FontAwesome', _scale(panel.fonts.size - (_scale(72) > 120 ? 10 : _scale(72) > 96 ? 8 : 6)), 0);};
	const iconCharHeader = chars.folderOpenBlack;
	const iconCharPlaylistWidth = Object.fromEntries(Object.entries(playlistDescriptors).map((pair) => {return [pair[0], _gr.CalcTextWidth(pair[1].icon, gfontIconChar())];}));
	var maxIconWidth = Math.max(...Object.values(iconCharPlaylistWidth));
	
	// UI offset
	var yOffset = _scale(6) + panel.row_height / 4;
	const columnOffset = Math.max(_scale(2), 3);
	
	// Header
	var headerW = -1;
	var headerH = -1;
	
	// Cache
	var currentItemIndex = -1;
	this.getCurrentItemIndex = () => {return currentItemIndex;};
	var bMaintainFocus = (currentItemIndex !== -1); // Skip at init() or when mouse leaves panel
	var currentItemPath = bMaintainFocus ? this.data[currentItemIndex].path : null;
	var currentItemNameId = bMaintainFocus ? this.data[currentItemIndex].nameId : null;
	var currentItemIsAutoPlaylist = bMaintainFocus ? this.data[currentItemIndex].isAutoPlaylist : null;
	var currentItemIsUI = bMaintainFocus ? this.data[currentItemIndex].extension === '.ui' : null;
	var currentItemIsFolder = bMaintainFocus ? this.data[currentItemIndex].isFolder : null;
	var idxHighlight = -1;
	var animation = {bHighlight: false, fRepaint: null};
	var animationButtons = new Map(
		/* buttonKey: {bHighlight: false, fRepaint: null} */
	);
	
	// Helpers
	const headerRe = /\n[-]*$/;
	const regexHours = /^\d*:\d*:/;
	const regexWeek = /^\d*wk/;
	const regexDay = /^\dd/;
	const regexTwoDecs = /^(\d*\.\d{2,3})/;
	const regexHundreds = /^(\d{3,4})/;
	const regexUnit = /(^\d*.*\d* )(\w*)/;
	const regexUnicode = /[^\u0000-\u00ff]/;
	const quickSearchRe = /[_A-z0-9]/;
	const playlistRe = /playlist/gi;
	
	// Global tooltip
	// Timers follow the double click timer
	this.tooltip = new _tt(null, void(0), void(0), 600); 
	
	this.updateUIElements = (bReload = false) => {
		if (bReload) {window.Reload();}
		if (!this.uiElements['Search filter'].enabled) {this.searchInput = null;}
		for (let key in this.headerButtons) {
			const button = this.headerButtons[key];
			button.x = button.y = button.w = button.h = 0;
		}
		this.size();
		this.repaint();
	}
	
	this.updatePlaylistIcons = () => {
		for (let key in iconCharPlaylistWidth) {
			let icon = playlistDescriptors[key].icon;
			if (this.playlistIcons.hasOwnProperty(key)) {
				if (this.playlistIcons[key].hasOwnProperty('icon')) {
					icon = this.playlistIcons[key].icon ? String.fromCharCode(parseInt(this.playlistIcons[key].icon, 16)) : null;
				}
			}
			iconCharPlaylistWidth[key] = icon ? _gr.CalcTextWidth(icon, gfontIconChar()) : 0;
		}
		maxIconWidth = Math.max(...Object.values(iconCharPlaylistWidth));
	}
	
	this.calcColumnVal = (key /*pls property*/, pls, bRough = false) => {
		let val = pls[key] === -1 ? '?' : pls[key];
		if (pls.isFolder) {
			switch (key) {
				case 'duration':
				case 'fileSize':
				case 'size': {
					const plsArr = pls.pls.filtered;
					if (plsArr.length) {val = 0;}
					plsArr.forEach((subPls) => {
						const newVal = this.calcColumnVal(key, subPls, true);
						val += (newVal === '?' ? 0 : newVal);
					});
					break;
				}
				default:
					break;
			}
		}
		if (!bRough && val !== '?') {
			switch (key) {
				case 'duration': { // Format it with no more than 4 digits
					const cache = val;
					val = utils.FormatDuration(val);  // Xw xd XX:XX:XX
					if (regexHours.test(val)) {
						val = round(cache / 3600, 1) + ' h';
					} else if (regexDay.test(val)) {
						val = round(cache / 86400, 1) + ' d';
					} else if (regexWeek.test(val)) {
						val = round(cache / 604800, 1) + ' w';
					}
					break;
				}
				case 'fileSize': { // Format it with no more than 4 digits
					if (val === 0) {val = '-'; break;};
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
					break;
				}
				case 'size': {
					val = this.columns.sizeUnits.prefix.toString() + val.toString() + this.columns.sizeUnits.suffix.toString();
					break;
				}
				case 'playlist_mbid': {
					val = val.length ? '\u2605' : '';
					break;
				}
				case 'trackTags': {
					val = val.length ? '\u2710' : '';
					break;
				}
				case 'isLocked': {
					val = val ? '\u26D4' : '';
					break;
				}
			}
		}
		return val;
	}
	
	this.calcColumnAlign = (key /*align key*/) => {
		switch ((key || '').toLowerCase()) {
			case 'center': return CENTRE;
			case 'left': return LEFT;
			case 'right':
			default: return RIGHT;
		}
	}
	
	this.calcRowWidth = (gr, w, columnIdx, plsIdx) => {
		return w === 'auto' 
			? gr.CalcTextWidth(this.calcColumnVal(this.columns.labels[columnIdx], this.data[plsIdx]), panel.fonts[this.columns.font[columnIdx] || 'normal'])
			: (w < 1 ? w * (this.w - this.x): w);
	}
	
	this.calcColumnsWidth = (gr = _gr, toColumn = Infinity, current = -1) => {
		const test = bProfile ? new FbProfiler(window.Name + ': ' + 'calcColumnsWidth') : null;
		let total = 0;
		const offset = 5;
		const perLabel = {};
		if (toColumn) {
			const columns = this.columns.width.slice(0, toColumn);
			if (columns.filter((_, i) => this.columns.bShown[i]).some((val) => val === 'auto')) {
				columns.forEach((val, i) => {
					if (!this.columns.bShown[i]) {return;}
					let maxVal = 0;
					if (val === 'auto') {
						const rows = this.columns.autoWidth === 'current view' ? Math.min(this.items, this.rows) : this.items;
						for (let j = 0; j < rows; j++) {
							const currIdx = this.columns.autoWidth === 'current view' ? j + this.offset : j;
							if (currIdx >= this.items) {break;}
							maxVal = Math.max(maxVal, this.calcRowWidth(gr, val, i, currIdx));
						}
						maxVal += columnOffset * ((i === this.columns.width.length - 1) ? 3 : 2)
					} else {
						maxVal = this.calcRowWidth(gr, val);
					}
					total += maxVal;
					perLabel[this.columns.labels[i]] = maxVal;
				});
			} else {
				columns.forEach((val, i) => {
					if (!this.columns.bShown[i]) {return;}
					total += this.calcRowWidth(gr, val);
					perLabel[this.columns.labels[i]] = val
				});
			}
		}
		if (current === -1) {
			let maxVal = 0;
			if (this.columns.bShown[current]) {
				const val = this.columns.width[current];
				if (val === 'auto') {
					const rows = this.columns.autoWidth === 'current view' ? Math.min(this.items, this.rows) : this.items ;
					for (let j = 0; j < rows; j++) {
						const currIdx = this.columns.autoWidth === 'current view' ? j + this.offset : j;
						if (currIdx >= this.items) {break;}
						maxVal = Math.max(maxVal, this.calcRowWidth(gr, val, current, currIdx));
					}
					maxVal += columnOffset * (current === this.columns.width.length - 1 ? 3 : 2)
				} else {
					maxVal = this.calcRowWidth(gr, val);
				}
			}
			perLabel[this.columns.labels[current]] = maxVal;
		}
		if (bProfile) {test.Print();}
		return {total, perLabel};
	}
	
	this.getColumnsEnabled = (label) => {
		return this.columns.labels.map((_, i) => i).filter((i) => this.columns.bShown[i] && (!label || this.columns.labels[i] === label));
	}
	
	this.isColumnsEnabled = (label) => {
		return this.uiElements['Columns'].enabled && this.getColumnsEnabled(label).length > 0;
	}
	
	this.size = () => {
		const oldW = this.w, oldH = this.h;
		this.w = panel.w - (this.x * 2);
		this.h = panel.h - this.y;
		this.index = 0;
		this.offset = 0;
		if (oldH > 0 && this.h > 0) {yOffset = (_scale(6) + panel.row_height / 4) * (this.h / oldH);}
		this.rows = Math.floor((this.h - _scale(this.uiElements['Up/down buttons'].enabled ? 24 : 12) - yOffset) / panel.row_height); // 24
		this.up_btn.x = this.x + Math.round((this.w - _scale(12)) / 2);
		this.down_btn.x = this.up_btn.x;
		this.up_btn.y = this.y + _scale(1);
		this.down_btn.y = this.y + this.h - _scale(12) - buttonCoordinatesOne.h; // Accommodate space for buttons!
		this.headerTextUpdate();
		this.updatePlaylistIcons();
	}
	
	this.getHeaderSize = () => {return {h: Math.max(headerH, this.y), w: headerW};}
	
	this.headerText = window.Name;
	
	this.headerTextUpdate = () => {
		const bCategoryFilter = !isArrayEqual(this.categoryState, this.categories());
		if (this.playlistsPath && this.itemsAll) {
			const info = ' (' + this.itemsAll + ' pls.)' + (bCategoryFilter ? '[*]' : '');
			const sizeInfo = _gr.CalcTextWidth(info, panel.fonts.title);
			const sizeName = _gr.CalcTextWidth(this.playlistsPathDirName, panel.fonts.title);
			const sizeEllipsis = _gr.CalcTextWidth('...', panel.fonts.title);
			const left = this.w - 15 - sizeInfo - sizeEllipsis - 2;
			const name = sizeName + sizeInfo + 15 > this.w
				? this.playlistsPathDirName.slice(0, Math.floor(left * this.playlistsPathDirName.length / (sizeName - sizeInfo)) - Math.ceil(left * this.playlistsPathDirName.length / (sizeName - sizeEllipsis - 7))) + '...'
				: this.playlistsPathDirName;
			this.headerText = 'Playlists: ' + name + info;
		} else {
			this.headerText = 'Playlist Manager: empty folder';
		}
		if (this.w < _gr.CalcTextWidth(this.headerText, panel.fonts.title) + 15) {
			this.headerText = this.headerText.replace('Playlists: ','').replace('Playlist Manager: ','');
		}
	}
	
	this.headerTooltip = (mask, bActions = true, bForceActions = false) => {
		let headerText = this.playlistsPath;
		headerText += '\n' + 'Categories: '+ (!isArrayEqual(this.categoryState, this.categories()) ? this.categoryState.join(', ') + ' (filtered)' : '(All)' );
		headerText += '\n' + 'Filters: ' + (this.autoPlaylistStates[0] !== this.constAutoPlaylistStates()[0] ? this.autoPlaylistStates[0] : '(All)') + ' | ' + (this.lockStates[0] !== this.constLockStates()[0] ?  this.lockStates[0] : '(All)');
		const autoPlsCount = this.data.reduce((sum, pls, idx) => {return (pls.query.length ? sum + 1 : sum);}, 0); // Counts autoplaylists and smart playlists
		headerText += '\n' + 'Current view: '+ this.items + ' Playlists (' + autoPlsCount + ' AutoPlaylists)';
		// Tips
		if (bActions) {
			const lShortcuts = this.getShortcuts('L', 'HEADER');
			const mShortcuts = this.getShortcuts('M', 'HEADER');
			const defaultAction = this.getDefaultShortcutAction('M', 'HEADER'); // All actions are shared for M or L mouse
			const multSelAction = 'Multiple selection'; // All actions are shared for M or L mouse
			if (this.bShowTips || mask === MK_CONTROL || mask === MK_SHIFT || mask === MK_SHIFT + MK_CONTROL || bForceActions) {
				headerText += '\n----------------------------------------------';
			}
			if (mask === MK_CONTROL) {
				headerText += lShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + L. Click to ' + lShortcuts[MK_CONTROL].key + ')' : '';
				headerText += mShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + M. Click to ' + lShortcuts[MK_CONTROL].key + ')' : '';
			} else if (mask === MK_SHIFT) {
				headerText += lShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + L. Click to ' + lShortcuts[MK_SHIFT].key + ')' : '';
				headerText += mShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + M. Click to ' + lShortcuts[MK_SHIFT].key + ')' : '';
			} else if (mask === MK_SHIFT + MK_CONTROL) {
				headerText += lShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + L. Click to ' + lShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
				headerText += mShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + M. Click to ' + lShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
			} else if (this.bShowTips || bForceActions) {
				if (this.modeUI === 'traditional' || bForceActions) {
					headerText += '\n(R. Click for config menus)';
				}
				// L. Click
				headerText += lShortcuts['SG_CLICK'].key !== defaultAction ? '\n(L. Click to ' + lShortcuts['SG_CLICK'].key + ')' : '';
				headerText += lShortcuts['DB_CLICK'].key !== defaultAction ? '\n(Double Click to ' + lShortcuts['DB_CLICK'].key + ')' : '';
				headerText += lShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + L. Click to ' + lShortcuts[MK_CONTROL].key + ')' : '';
				headerText += lShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + L. Click to ' + lShortcuts[MK_SHIFT].key + ')' : '';
				headerText += lShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + L. Click to ' + lShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
				// Middle button
				headerText += mShortcuts['SG_CLICK'].key !== defaultAction ? '\n(M. Click to ' + mShortcuts['SG_CLICK'].key + ')' : '';
				headerText += mShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + M. Click to ' + mShortcuts[MK_CONTROL].key + ')' : '';
				headerText += mShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + M. Click to ' + mShortcuts[MK_SHIFT].key + ')' : '';
				headerText += mShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + M. Click to ' + mShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
			}
			if (headerRe.test(headerText)) { // If no shortcut was found, show default ones
				headerText += '\n(R. Click for config menus)';
				// L. Click
				headerText += lShortcuts['SG_CLICK'].key !== defaultAction ? '\n(L. Click to ' + lShortcuts['SG_CLICK'].key + ')' : '';
				headerText += lShortcuts['DB_CLICK'].key !== defaultAction ? '\n(Double Click to ' + lShortcuts['DB_CLICK'].key + ')' : '';
			}
		}
		let warningText = '';
		if (this.bLibraryChanged && !this.bLiteMode) {warningText += '\nWarning! Library paths cache is outdated,\nloading playlists may be slower than intended...';}
		if (warningText.length) {headerText += '\n' + warningText;}
		return headerText;
	}
	
	this.paintHeader = (gr, mode = 'traditional') => {
		let lineY;
		let lineColor;
		switch (mode.toLowerCase()) {
			case 'traditional' : {
				const panelBgColor = panel.getColorBackground();
				const bCatIcon = this.categoryState.length === 1 && this.configFile && this.configFile.ui.icons.category.hasOwnProperty(this.categoryState[0]);
				const catIcon = bCatIcon ? this.configFile.ui.icons.category[this.categoryState[0]] : iconCharHeader; // Try setting customized button from json
				const offsetHeader = yOffset / 10;
				const gfontHeader= _gdiFont('FontAwesome', _scale((panel.fonts.size <= 14) ? panel.fonts.size - 3 : panel.fonts.size - 7), 0);
				const iconHeaderColor = this.headerButtons.folder.inFocus ? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) : blendColors(panel.colors.highlight, panelBgColor, 0.1);
				const iconW = gr.CalcTextWidth(catIcon, gfontHeader);
				const iconH = gr.CalcTextHeight(catIcon, gfontHeader);
				const headerTextH = gr.CalcTextHeight(this.headerText, panel.fonts.normal);
				const maxHeaderH = Math.max(iconH, headerTextH);
				[this.headerButtons.folder.x, this.headerButtons.folder.y, this.headerButtons.folder.w, this.headerButtons.folder.h] = [LM, (maxHeaderH - iconH) / 2, iconW, iconH] // Update button coords
				gr.GdiDrawText(catIcon, gfontHeader, iconHeaderColor, LM, 0, iconW, maxHeaderH, DT_BOTTOM | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX);
				gr.GdiDrawText(this.headerText, panel.fonts.normal, panel.colors.highlight, LM + iconW + 5, 0, panel.w - (LM * 2) - iconW - 5, TM, LEFT);
				lineY = maxHeaderH % 2 ? maxHeaderH + 2 : maxHeaderH + 1;
				lineY += offsetHeader;
				lineColor = panel.colors.highlight;
				headerW = LM + iconW + 5;
				headerH = lineY;
				break;
			}
			case 'modern' : {
				const panelBgColor = panel.getColorBackground();
				const altColorBg = RGBA(...toRGB(invert(panelBgColor, true)), getBrightness(...toRGB(panelBgColor)) < 50 ? 15 : 7);
				const altColorSearch = RGBA(...toRGB(invert(panelBgColor, true)), getBrightness(...toRGB(panelBgColor)) < 50 ? 5 : 3);
				const offsetHeader = yOffset / 10;
				const headerTextH = gr.CalcTextHeight(this.headerText, panel.fonts.normal);
				// Buttons
				const gfontHeader= _gdiFont('FontAwesome', _scale((panel.fonts.size <= 14) ? panel.fonts.size - 3 : panel.fonts.size - 7), 0);
				const buttons = [
					{	// Search
						parent: this.uiElements['Search filter'].enabled ? this.headerButtons.search : null,
						position: 0,
						icon: this.searchInput && this.searchInput.text.length || this.plsState.length ? chars.close : chars.search,
						color: this.headerButtons.search.inFocus 
							? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) 
							: blendColors(panel.colors.highlight, panelBgColor, 0.1),
						bgColor: this.headerButtons.search.inFocus
							? blendColors(panel.colors.highlight, panelBgColor, 0.8)
							: null,
						align: 'l',
						x: (button, curr) => curr,
						y: (button) => (maxHeaderH - button.h) / 2,
						w: 0,
						h: 0
					},
					{	// Help
						parent: this.uiElements['Header buttons'].elements['Help'].enabled ? this.headerButtons.help : null,
						position: this.uiElements['Header buttons'].elements['Help'].position,
						icon: chars.question,
						color: this.headerButtons.help.inFocus 
							? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) 
							: blendColors(panel.colors.highlight, panelBgColor, 0.1),
						bgColor: this.headerButtons.help.inFocus
							? blendColors(panel.colors.highlight, panelBgColor, 0.8)
							: null,
						align: 'r',
						x: (button, curr, bFirst) => curr - button.w - (bFirst ? 0 : LM / 2),
						y: (button) => (maxHeaderH - button.h) / 2,
						w: 0,
						h: 0
					},
					{	// Folder
						parent: this.uiElements['Header buttons'].elements['Folder'].enabled && !this.bLiteMode ? this.headerButtons.folder : null,
						position: this.uiElements['Header buttons'].elements['Folder'].position,
						icon: this.categoryState.length === 1 && this.configFile && this.configFile.ui.icons.category.hasOwnProperty(this.categoryState[0]) 
							? this.configFile.ui.icons.category[this.categoryState[0]] 
							: iconCharHeader, // Try setting customized button from json
						color: this.headerButtons.folder.inFocus 
							? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) 
							: blendColors(panel.colors.highlight, panelBgColor, 0.1),
						bgColor: this.headerButtons.folder.inFocus
							? blendColors(panel.colors.highlight, panelBgColor, 0.8)
							: null,
						align: 'r',
						x: (button, curr, bFirst) => curr - button.w - (bFirst ? 0 : LM / 2),
						y: (button) => (maxHeaderH - button.h) / 2,
						w: 0,
						h: 0
					},
					{	// Config
						parent: this.uiElements['Header buttons'].elements['Settings menu'].enabled ? this.headerButtons.settings : null,
						position: this.uiElements['Header buttons'].elements['Settings menu'].position,
						icon: chars.cogs,
						color: this.headerButtons.settings.inFocus 
							? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) 
							: blendColors(panel.colors.highlight, panelBgColor, 0.1),
						bgColor: this.headerButtons.settings.inFocus
							? blendColors(panel.colors.highlight, panelBgColor, 0.8)
							: null,
						align: 'r',
						x: (button, curr, bFirst) => curr - button.w - (bFirst ? 0 : LM / 2),
						y: (button) => (maxHeaderH - button.h) / 2,
						w: 0,
						h: 0
					},
					{	// New
						parent: this.uiElements['Header buttons'].elements['List menu'].enabled ? this.headerButtons.newPls : null,
						position: this.uiElements['Header buttons'].elements['List menu'].position,
						icon: chars.plus,
						color: this.headerButtons.newPls.inFocus 
							? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) 
							: blendColors(panel.colors.highlight, panelBgColor, 0.1),
						bgColor: this.headerButtons.newPls.inFocus
							? blendColors(panel.colors.highlight, panelBgColor, 0.8)
							: null,
						align: 'r',
						x: (button, curr, bFirst) => curr - button.w - (bFirst ? 0 : LM / 2),
						y: (button) => (maxHeaderH - button.h) / 2,
						w: 0,
						h: 0
					},
					{	// Columns
						parent: this.uiElements['Header buttons'].elements['Switch columns'].enabled ? this.headerButtons.columns : null,
						position: this.uiElements['Header buttons'].elements['Switch columns'].position,
						icon: chars.table,
						color: this.headerButtons.columns.inFocus 
							? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) 
							: blendColors(panel.colors.highlight, panelBgColor, 0.1),
						bgColor: this.headerButtons.columns.inFocus
							? blendColors(panel.colors.highlight, panelBgColor, 0.8)
							: null,
						align: 'r',
						x: (button, curr, bFirst) => curr - button.w - (bFirst ? 0 : LM / 2),
						y: (button) => (maxHeaderH - button.h) / 2,
						w: 0,
						h: 0
					},
					{	// Reset Filters
						parent: this.uiElements['Header buttons'].elements['Reset filters'].enabled ? this.headerButtons.resetFilters : null,
						position: this.uiElements['Header buttons'].elements['Reset filters'].position,
						icon: chars.close,
						color: this.headerButtons.resetFilters.inFocus 
							? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) 
							: blendColors(panel.colors.highlight, panelBgColor, 0.1),
						bgColor: this.headerButtons.resetFilters.inFocus
							? blendColors(panel.colors.highlight, panelBgColor, 0.8)
							: null,
						align: 'r',
						x: (button, curr, bFirst) => curr - button.w - (bFirst ? 0 : LM / 2),
						y: (button) => (maxHeaderH - button.h) / 2,
						w: 0,
						h: 0
					},
					{	// Poweraction
						parent: this.uiElements['Header buttons'].elements['Power actions'].enabled ? this.headerButtons.action : null,
						position: this.uiElements['Header buttons'].elements['Power actions'].position,
						icon: chars.bolt,
						color: this.headerButtons.action.inFocus 
							? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) 
							: blendColors(panel.colors.highlight, panelBgColor, 0.1),
						bgColor: this.headerButtons.action.inFocus
							? blendColors(panel.colors.highlight, panelBgColor, 0.8)
							: null,
						align: 'r',
						x: (button, curr, bFirst) => curr - button.w - (bFirst ? 0 : LM / 2),
						y: (button) => (maxHeaderH - button.h) / 2,
						w: 0,
						h: 0
					},
				].filter((button) => button.parent).sort((a, b) => a.align === 'l' ? a.position - b.position : b.position - a.position);
				let maxHeaderH = headerTextH;
				if (buttons.length) {
					// Position
					buttons.forEach((button) => {
						button.w = gr.CalcTextWidth(button.icon, gfontHeader),
						button.h = gr.CalcTextHeight(button.icon, gfontHeader);
						maxHeaderH = Math.max(button.h, maxHeaderH);
					})
					let currLx = this.x;
					let currRx = this.x + this.w;
					buttons.forEach((button) => {
						if (isFunction(button.x)) {
							if (button.align === 'l') {button.x = button.x(button, currLx); currLx = button.x + button.w;}
							if (button.align === 'r') {button.x = button.x(button, currRx, currRx === (this.x + this.w)); currRx = button.x;}
						}
						if (isFunction(button.y)) {button.y = button.y(button);}
					});
					// Check extra highlighting
					buttons.forEach((button) => {
						const parent = button.parent;
						if (parent.highlighting) {
							if (!animationButtons.has(parent)) {
								animationButtons.set(parent, {bHighlight: false, fRepaint: null});
							}
							const animationButton = animationButtons.get(parent);
							if (!parent.inFocus && !animationButton.fRepaint){
								if (parent.highlighting(void(0), void(0), void(0), parent)) {
									if (animationButton.bHighlight) {
										animationButton.fRepaint = setTimeout(() => {animationButton.fRepaint = null; animationButton.bHighlight = false; window.RepaintRect(button.x, button.y, button.x + button.w, button.y + button.h)}, 600);
									} else {
										animationButton.fRepaint = setTimeout(() => {animationButton.fRepaint = null; animationButton.bHighlight = true; window.RepaintRect(button.x, button.y, button.x + button.w, button.y + button.h)}, 600);
									}
								} else {animationButton.bHighlight = false;}
							} else if (parent.inFocus) {
								animationButton.bHighlight = false;
							}
						}
					});
				}
				const iconOffsetLeft = buttons.reduce((total, curr) => total + (curr.x < this.w / 2 ? curr.w : 0), 0);
				const iconOffsetRight = this.w - buttons.reduce((total, curr) => Math.min(total, (curr.x > this.w / 2 ? curr.x : this.w)), this.w) + 2 * LM;
				lineY = maxHeaderH % 2 ? maxHeaderH + 2 : maxHeaderH + 1 + offsetHeader;
				if (buttons.length) {
					// Background
					gr.FillSolidRect(0, 0, this.x + LM / 2 + iconOffsetLeft, lineY, altColorSearch);
					gr.FillSolidRect(this.x + this.w - iconOffsetRight, 0, panel.w, lineY, altColorBg);
					// Buttons
					gr.SetSmoothingMode(SmoothingMode.HighQuality);
					buttons.forEach((button) => {
						const parent = button.parent;
						[parent.x, parent.y, parent.w, parent.h] = [button.x, button.y, button.w, button.h] // Update button coords
						if (button.bgColor !== null) {
							gr.FillRoundRect(button.x - _scale(2), (maxHeaderH - button.h) / 2 - _scale(1), button.w + _scale(3), button.h + _scale(2) , _scale(2), _scale(2), button.bgColor);
						}
						const color = parent.highlighting && animationButtons.get(parent).bHighlight 
							? blendColors(RGB(...toRGB(panel.colors.text)), invert(this.colors.selectedPlaylistColor), 0.8)
							: parent.altColor && !parent.inFocus && parent.altColor(void(0), void(0), void(0), parent) 
								? blendColors(RGB(...toRGB(panel.colors.text)), invert(this.colors.selectedPlaylistColor), 0.8)
								: button.color;
						gr.GdiDrawText(button.icon, gfontHeader, color, button.x, -2, button.w + _scale(1), maxHeaderH, DT_BOTTOM | DT_END_ELLIPSIS | DT_LEFT | DT_CALCRECT | DT_NOPREFIX); // Add some extra width to avoid drawing bugs on small settings
					})
				}
				// Text
				if (this.uiElements['Search filter'].enabled) {
					if (!this.searchInput) {
						this.searchInput = new _inputbox(panel.w - (LM * 2) - iconOffsetLeft - 2.5, lineY, this.searchCurrent, 'Search', panel.colors.highlight, panelBgColor, panelBgColor, this.colors.selectedPlaylistColor, this.search, this, folders.xxx + 'helpers\\readme\\input_box.txt');
						if (this.searchMethod.text.length && !this.searchMethod.bResetStartup) {
							this.searchInput.text = this.searchMethod.text;
							this.search();
						}
						this.searchInput.autovalidation = this.searchMethod.bAutoSearch;
					}
					this.searchInput.emptyText = this.isFilterActive('Playlist') ? 'Results' : 'Search';
					this.searchInput.setSize(panel.w - (LM * 2) - iconOffsetLeft - iconOffsetRight - LM / 2 - 2.5, lineY, panel.fonts.size - 5);
					this.searchInput.paint(gr, LM + iconOffsetLeft + 5, 0);
					if (panel.imageBackground.bTint) {
						panel.paintImage(
							gr,
							{w: this.x + this.w - iconOffsetRight, h: this.searchInput.h, x: 0, y: this.searchInput.y, offsetH: _scale(1)},
							{transparency: (getBrightness(...toRGB(panelBgColor)) < 50 ? 50: 20)}
						);
					}
				} else {
					const bCatIcon = this.categoryState.length === 1 && this.configFile && this.configFile.ui.icons.category.hasOwnProperty(this.categoryState[0]);
					const catIcon = bCatIcon ? this.configFile.ui.icons.category[this.categoryState[0]] : null; // Try setting customized button from json
					const iconW = catIcon ? gr.CalcTextWidth(catIcon, gfontHeader) : 0;
					if (catIcon) {
						const iconHeaderColor = this.headerButtons.folder.inFocus ? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) : blendColors(panel.colors.highlight, panelBgColor, 0.1);
						gr.GdiDrawText(catIcon, gfontHeader, iconHeaderColor, LM, 0, iconW, maxHeaderH, DT_BOTTOM | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX);
					}
					gr.GdiDrawText(this.headerText, panel.fonts.normal, panel.colors.highlight, LM + iconW, 0, panel.w - (LM * 2) - iconW - iconOffsetLeft - iconOffsetRight - LM / 2 - 2.5, TM, LEFT);
				}
				// Lines
				lineColor = blendColors(panel.colors.highlight, panelBgColor, 0.7);
				if (buttons.length) {gr.DrawLine(this.x + this.w - iconOffsetRight, 1, this.x + this.w - iconOffsetRight, lineY - 2, 1, lineColor);}
				gr.SetSmoothingMode(SmoothingMode.Default);
				headerW = LM + iconOffsetLeft + 5;
				headerH = lineY;
				break;
			}
		}
		return [lineY, lineColor];
	}
	
	this.paint = (gr) => {
		// Bg
		const panelBgColor = panel.getColorBackground();
		// Header
		const [lineY, lineColor] = this.paintHeader(gr, this.modeUI);
		// Art background
		panel.paintImage(gr, {w: window.Width, h: this.h - buttonCoordinatesOne.h + Math.max(this.y - lineY, 0), x: 0, y: lineY + 1, offsetH: 2});
		// Line
		if (lineY > 0) {gr.DrawLine(0, lineY , panel.w, lineY, 1, lineColor);}
		// Empty Panel
		this.text_x = 0;
		this.textWidth = this.w;
		if (this.items === 0) {
			let emptyText = '';
			if (this.itemsAll !== 0) {
				emptyText = 'No matches for the current filters.';
			} else {
				emptyText = 'Playlist folder is currently empty:\n\'' + this.playlistsPath + '\'\n\nAdd playlist files moving them to tracked folder, creating new playlists or importing them.'+ '\n\nSet the tracked folder at header: \'Set playlists folder...\'.' + '\n\nReadable playlist formats:\n\'' + [...loadablePlaylistFormats].join('\', \'') + '\'\nWritable formats:\n\'' + [...writablePlaylistFormats].join('\', \'') + '\'';
			}
			const cache = this.rows;
			this.rows = (emptyText.match(/\n/g) || []).length; // # lines of previous text = # \n
			const emptyTextWrapped = gr.EstimateLineWrap(emptyText, panel.fonts.normal, panel.w - (LM * 2));
			for (let i = 0; i < emptyTextWrapped.length; i++) {
				if (i % 2) {
					gr.GdiDrawText(emptyTextWrapped[i - 1], panel.fonts.normal, panel.colors.text, this.x,  this.y + (i * panel.row_height / 2), emptyTextWrapped[i], panel.row_height, LEFT); // Divide height by 2 since the loop is text rows * 2 !
				}
			}
			this.rows = cache;
			return;
		}
		// List
		const standardPlaylistIconColor = blendColors(panel.colors.highlight, panelBgColor, 0.1);
		const lockedPlaylistIconColor = blendColors(standardPlaylistIconColor, this.colors.lockedPlaylistColor, 0.8);
		const autoPlaylistIconColor = blendColors(RGB(...toRGB(panelBgColor)), this.colors.autoPlaylistColor, 0.8);
		const smartPlaylistIconColor = blendColors(RGB(...toRGB(panelBgColor)), this.colors.smartPlaylistColor, 0.8);
		const uiPlaylistIconColor = blendColors(RGB(...toRGB(panelBgColor)), this.colors.uiPlaylistColor, 0.8);
		const folderIconColor = blendColors(RGB(...toRGB(panelBgColor)), this.colors.folderColor, 0.8);
		if (!this.categoryHeaderOffset) {this.categoryHeaderOffset = _scale(panel.fonts.size - 4);}
		const categoryHeaderColor = blendColors(panelBgColor, panel.colors.text, 0.6);
		const categoryHeaderLineColor = blendColors(panelBgColor, categoryHeaderColor, 0.5);
		const altColorRow = RGBA(...toRGB(invert(panelBgColor, true)), getBrightness(...toRGB(panelBgColor)) < 50 ? 15 : 7);
		const indexSortStateOffset = !this.getIndexSortState() ? -1 : 1; // Compare to the next one or the previous one according to sort order
		const rows = Math.min(this.items, this.rows);
		const rowWidth =  this.x + this.w; // Ignore separator UI config
		const selWidth =  this.bShowSep ? this.x + this.w - this.categoryHeaderOffset :  this.x + this.w; // Adjust according to UI config
		// Highlight
		if (idxHighlight !== -1) {
			const currSelIdx = idxHighlight;
			const currSelOffset = idxHighlight !== - 1 ? this.offset : 0;
			if ((currSelIdx - currSelOffset) >= 0 && (currSelIdx - currSelOffset) < this.rows) {
				// Rectangle
				gr.DrawRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, 0, opaqueColor(this.colors.selectedPlaylistColor, 50));
				gr.FillSolidRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, opaqueColor(this.colors.selectedPlaylistColor, 30));
			}
			if (this.lastCharsPressed.bDraw) {animation.bHighlight = false;}
			if (animation.bHighlight) {
				if ((currSelIdx - currSelOffset) >= 0 && (currSelIdx - currSelOffset) < this.rows) {
					gr.DrawRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, 0, opaqueColor(this.colors.selectedPlaylistColor, 50));
					gr.FillSolidRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, opaqueColor(this.colors.selectedPlaylistColor, 30));
				}
				animation.bHighlight = false;
				animation.fRepaint = setTimeout(() => {animation.fRepaint = null; window.RepaintRect(0, this.y, window.Width, this.h);}, 600);
			} else if (!this.lastCharsPressed.bDraw) {
				idxHighlight = -1;
			}
		} else {animation.bHighlight = false;}
		// Columns settings
		const bColumnsEnabled = this.isColumnsEnabled();
		const columns = this.columns.labels;
		const {total: columnsWidth = 0, perLabel: columnsWidthLabel = null} = bColumnsEnabled ? this.calcColumnsWidth(gr) : {};
		const columnLineColor = bColumnsEnabled ? blendColors(panel.colors.highlight, panelBgColor, 0.7) : null;
		// Rows
		const nums = new Array(10).fill(null); // To easily check index from 0 to 9 without using global isNaN()
		let cacheLen = 0;
		const ellipisisW = this.bShowSize ? gr.CalcTextWidth('...', panel.fonts.normal) : 0;
		const iconsRightW = this.uiElements['Scrollbar'].enabled && scroll ? this.w - (scroll.visible ? scroll.w : scroll.wHidden) : this.textWidth
		const level = {name: '', offset: 0};
		// Helpers
		const shading = {};
		if (panel.colors.bFontOutline && rows) {
			shading.img = gdi.CreateImage(this.w - (bColumnsEnabled ? columnsWidth + columnOffset * Math.max(2, scaleDPI.factor) : 0), rows * panel.row_height);
			shading.bPanelArt = panel.imageBackground.enabled && panel.imageBackground.art.image;
			shading.outColor = shading.bPanelArt ? RGB(0, 0, 0) : invert(panelBgColor, true);
			shading.gr = shading.img.GetGraphics();
			shading.gr.SetTextRenderingHint(TextRenderingHint.TextRenderingHintSingleBitPerPixel);
			shading.pls = [];
		}
		const paintColumn = (item, x, columnY, color) => {
			if (bColumnsEnabled && columnsWidth) {
				columns.forEach((key, i) => {
					const columnX = x + this.textWidth - 30 + this.calcColumnsWidth(gr, i).total;
					const columnFont = panel.fonts[this.columns.font[i] || 'normal'];
					const val = this.calcColumnVal(key, item);
					const columnW = (this.columns.width[i] === 'auto' 
							? columnsWidthLabel[key]
							: this.columns.width[i]
						) - columnOffset * ((i === columns.length - 1) ? 3 : 2);
					const align = this.calcColumnAlign(this.columns.align[i]);
					const columnColor = this.columns.color[i] === 'playlistColor' 
						? color 
						: this.columns.color[i] === 'textColor' 
							? panel.colors.text
							: this.columns.color[i];
					if (this.columns.line === 'all' || i === 0 && this.columns.line === 'first') {gr.DrawLine(columnX, columnY, columnX, columnY + panel.row_height, 1, columnLineColor);}
					gr.GdiDrawText(val, columnFont, columnColor, columnX + columnOffset, columnY, columnW, panel.row_height, align);
				});
				this.textWidth = this.w;
			}
		};
		const paintPls = (pls, i, currIdx, textX, textY, level = 0) => {
			// Add category sep
			if (this.bShowSep) {
				let dataKey = ''; // Use this.data[dataKey] notation instead of this.data.dataKey, so we can apply the same code to all use-cases
				if (this.methodState.split('\t')[0] === 'By category'){dataKey = 'category';}
				else if (this.methodState.split('\t')[0] === 'By name'){dataKey = 'name';}
				else if (this.methodState.split('\t')[0] === 'By tags'){dataKey = 'tags';}
				if (dataKey.length){
					const data = isArray(pls[dataKey]) ? pls[dataKey][0] : pls[dataKey]; // If it's an array get first value
					let offsetLetter = 0;
					// Show always current letter at top. Also shows number
					if (indexSortStateOffset === -1 && i === 0) {
						let sepLetter = data.length ? data[0].toUpperCase() : '-';
						if (sepLetter in nums) {sepLetter = '#';} // Group numbers
						else if (sepLetter === 'W') {offsetLetter += gr.CalcTextWidth('W', panel.fonts.small) / 8;}
						drawDottedLine(gr, this.x, textY, this.x + this.w - this.categoryHeaderOffset, textY , 1, categoryHeaderLineColor, _scale(2));
						gr.GdiDrawText(sepLetter, panel.fonts.small, categoryHeaderColor, this.x, textY - panel.row_height / 2, iconsRightW + offsetLetter , panel.row_height , RIGHT);
					}
					// The rest... note numbers are always at top or at bottom anyway
					if (i < (Math.min(this.items, this.rows) - indexSortStateOffset) && i + indexSortStateOffset >= 0) {
						const sepLetter = data.length ? data[0].toUpperCase() : '-';
						const nextIdx = currIdx + indexSortStateOffset;
						const nextData = isArray(this.data[nextIdx][dataKey]) ? this.data[nextIdx][dataKey][0] : this.data[nextIdx][dataKey]; // If it's an array get first value
						const nextsepLetter = nextData.length ? nextData[0].toUpperCase() : '-';
						if (sepLetter !== nextsepLetter && !(sepLetter in nums)) {
							let sepIndex = indexSortStateOffset < 0 ? i : i + indexSortStateOffset;
							if (sepLetter === 'W') {offsetLetter += gr.CalcTextWidth('W', panel.fonts.small) / 8;}
							drawDottedLine(gr, this.x, this.y + yOffset + (sepIndex * panel.row_height), this.x + this.w - this.categoryHeaderOffset, this.y + yOffset + (sepIndex * panel.row_height) , 1, categoryHeaderLineColor, _scale(2));
							gr.GdiDrawText(sepLetter, panel.fonts.small, categoryHeaderColor, this.x, this.y + yOffset + (sepIndex * panel.row_height) - panel.row_height / 2, iconsRightW + offsetLetter, panel.row_height , RIGHT);
						}
					}
					// Show always current letter at bottom. Also shows number
					if (indexSortStateOffset === 1 && i === Math.min(this.items, this.rows) - 1) {
						let sepIndex = i + indexSortStateOffset;
						let sepLetter = data.length ? data[0].toUpperCase() : '-';
						if (sepLetter in nums) {sepLetter = '#';} // Group numbers
						else if (sepLetter === 'W') {offsetLetter += gr.CalcTextWidth('W', panel.fonts.small) / 8;}
						drawDottedLine(gr, this.x, this.y + yOffset + (sepIndex * panel.row_height), this.x + this.w - this.categoryHeaderOffset, this.y + yOffset + (sepIndex * panel.row_height) , 1, categoryHeaderLineColor, _scale(2));
						gr.GdiDrawText(sepLetter, panel.fonts.small, categoryHeaderColor, this.x, this.y + yOffset + (sepIndex * panel.row_height) - panel.row_height / 2, iconsRightW + offsetLetter, panel.row_height , RIGHT);
					}
				}
			}
			// Playlists
			const levelOffset = level * 20;
			let playlistDataText =  pls.name + (this.bShowSize ? ' (' + pls.size + ')' : '');
			// Adjust playlist name according to width available but always show the size if possible
			this.textWidth = this.w - (bColumnsEnabled ? columnsWidth + columnOffset * Math.max(2, scaleDPI.factor) : 0);
			if (this.bShowSize && playlistDataText.length > cacheLen) {
				const w = gr.CalcTextWidth(playlistDataText, panel.colors.bBold ? panel.fonts.normalBold : panel.fonts.normal);
				if (w > this.textWidth - 30 - levelOffset) {
					const size = ' (' + pls.size + ')';
					const sizeW = gr.CalcTextWidth(size, panel.colors.bBold ? panel.fonts.normalBold : panel.fonts.normal);
					const plsW = w - sizeW;
					const left = this.textWidth - 30 - sizeW - ellipisisW - _scale(3) * (1 + level * 2) - levelOffset;
					playlistDataText = pls.name.slice(0, Math.floor(left * pls.name.length / plsW)) + '...' + size;
				} else {cacheLen = playlistDataText.length;}
			}
			const iconFont = gfontIconChar();
			const iconFontAlt = gfontIconCharAlt();
			// Set colors and icons according to playlist type
			let playlistColor = panel.colors.text, iconColor = standardPlaylistIconColor;
			const plsExtension = pls.isAutoPlaylist ? 'autoPlaylist' : pls.extension;
			let extension = pls.isLocked ? 'locked' : pls.isAutoPlaylist ? 'autoPlaylist' : plsExtension;
			if (extension === 'locked') {playlistColor = this.colors.lockedPlaylistColor; iconColor = lockedPlaylistIconColor;}
			else if (extension === 'autoPlaylist') {playlistColor = this.colors.autoPlaylistColor; iconColor = autoPlaylistIconColor;}
			else if (extension === '.xsp') {playlistColor = this.colors.smartPlaylistColor; iconColor = smartPlaylistIconColor;}
			else if (extension === '.ui') {playlistColor = this.colors.uiPlaylistColor; iconColor = uiPlaylistIconColor;}
			if (pls.size === 0) {extension = 'blank';}
			// Icon
			if (this.bShowIcons) {
				let icon = playlistDescriptors[extension].icon;
				let iconBg = playlistDescriptors[extension].iconBg;
				if (this.playlistIcons.hasOwnProperty(extension)) {
					let bFallback = false;
					if (this.playlistIcons[extension].hasOwnProperty('icon')) {
						icon = this.playlistIcons[extension].icon ? String.fromCharCode(parseInt(this.playlistIcons[extension].icon, 16)) : null;
						if (!icon && extension !== plsExtension) { // When playlist state icon is null (locked or blank), fallback to playlist type
							icon = playlistDescriptors[plsExtension].icon ? playlistDescriptors[plsExtension].icon : null;
							if (this.playlistIcons.hasOwnProperty(plsExtension) && this.playlistIcons[plsExtension].hasOwnProperty('icon')) {
								icon = this.playlistIcons[plsExtension].icon ? String.fromCharCode(parseInt(this.playlistIcons[plsExtension].icon, 16)) : null;
							}
							bFallback = icon ? true : false;
						}
					}
					if (this.playlistIcons[extension].hasOwnProperty('iconBg')) {
						iconBg = this.playlistIcons[extension].iconBg ? String.fromCharCode(parseInt(this.playlistIcons[extension].iconBg, 16)) : null;
						if (bFallback && !iconBg && extension !== plsExtension) { // When playlist state icon is null (locked or blank), fallback to playlist type
							iconBg = playlistDescriptors[plsExtension].iconBg ? playlistDescriptors[plsExtension].iconBg : null;
							if (this.playlistIcons.hasOwnProperty(plsExtension) && this.playlistIcons[plsExtension].hasOwnProperty('iconBg')) {
								iconBg = this.playlistIcons[plsExtension].iconBg ? String.fromCharCode(parseInt(this.playlistIcons[plsExtension].iconBg, 16)) : null;
							}
						}
					}
				}
				if (iconBg) {
					gr.GdiDrawText(iconBg, iconFont, iconColor, this.text_x + 5 + levelOffset, textY, maxIconWidth, panel.row_height, CENTRE);
					if (icon) {
						gr.GdiDrawText(icon, iconFontAlt, blendColors(panelBgColor, iconColor, 0.2), this.text_x + 5 + levelOffset, textY, maxIconWidth, panel.row_height, CENTRE);
					}
				} else if (icon) {
					gr.GdiDrawText(icon, iconFont, iconColor, this.text_x + 5 + levelOffset, textY, maxIconWidth, panel.row_height, CENTRE);
				}
			}
			// Text
			if (panel.colors.bFontOutline && shading.img) { // Outline current text
				shading.gr.GdiDrawText(playlistDataText, panel.colors.bBold ? panel.fonts.normalBold : panel.fonts.normal, shading.outColor, textX + levelOffset - this.x, i * panel.row_height, Math.min(shading.img.Width, this.textWidth - 30 - levelOffset), shading.img.Height, DT_LEFT | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX);
				shading.pls.push([playlistDataText, panel.colors.bBold ? panel.fonts.normalBold : panel.fonts.normal, playlistColor, textX + levelOffset, textY, this.textWidth - 30 - levelOffset]);
			} else {
				gr.GdiDrawText(playlistDataText, panel.colors.bBold ? panel.fonts.normalBold : panel.fonts.normal, playlistColor, textX + levelOffset, textY, this.textWidth - 30 - levelOffset, panel.row_height, LEFT);
			}
			return playlistColor;
		};
		const paintIndicators = (pls, textY) => {
			// Add playing now indicator
			const findPlsIdx = plman.FindPlaylist(pls.nameId);
			if (findPlsIdx !== -1 && plman.IsAutoPlaylist(findPlsIdx) === !!pls.isAutoPlaylist) { // If missing it's false
				const iconChars = {
					playing: {s: String.fromCharCode(9654), offset: 0}, 
					loaded: {s: String.fromCharCode(187) /* » */, offset: true}, 
					loadedV2: {s: String.fromCharCode(9644) /* - */, offset: false},
					loadedV3: {s: String.fromCharCode(126) /* ~ */, offset: false}
				};
				Object.keys(iconChars).forEach((k) => {
					if (iconChars[k].offset) {
						const sepLeterW = gr.CalcTextWidth('A', panel.fonts.small);
						iconChars[k].offset = gr.CalcTextWidth(iconChars[k].s, panel.fonts.small) - sepLeterW;
					} else {iconChars[k].offset = 0;}
				});
				const icon = iconChars[fb.IsPlaying && findPlsIdx === plman.PlayingPlaylist ? 'playing' : 'loaded'];
				// Draw
				gr.GdiDrawText(icon.s, panel.fonts.small, panel.colors.text, this.x + icon.offset, textY, iconsRightW, panel.row_height, RIGHT);
			}
		};
		const paintSelection = (i, textY) => {
			// Multiple selection
			if (this.indexes.length) {
				if (this.indexes.indexOf(this.offset + i) !== -1) {
					gr.DrawRect(this.x - 5, textY, selWidth, panel.row_height, 0, opaqueColor(this.colors.selectedPlaylistColor, 50));
					gr.FillSolidRect(this.x - 5, textY, selWidth, panel.row_height, opaqueColor(this.colors.selectedPlaylistColor, 30));
				}
			}
		};
		const paintFolder = (folder, i, textY) => {
			// Adjust playlist name according to width available but always show the size if possible
			this.textWidth = this.w - (bColumnsEnabled ? columnsWidth + columnOffset * Math.max(2, scaleDPI.factor) : 0);
			const folderText =  _b(folder.name) + (this.folders.bShowSize ? ' (' + (this.folders.bShowSizeDeep ? folder.pls.lengthFilteredDeep : folder.pls.lengthFiltered) + ')' : '');
			const icon = folder.isOpen ? this.folders.icons.open : this.folders.icons.closed;
			if (icon) {
				gr.GdiDrawText(icon, gfontIconChar(), folderIconColor, this.text_x + 5 + level.offset * 20, textY, maxIconWidth, panel.row_height, CENTRE);
			}
			// Text
			if (panel.colors.bFontOutline && shading.img) { // Outline current text
				shading.gr.GdiDrawText(folderText, panel.colors.bBold ? panel.fonts.normalBold : panel.fonts.normal, shading.outColor, maxIconWidth + level.offset * 20, i * panel.row_height, Math.min(shading.img.Width,  this.textWidth - 25), shading.img.Height, DT_LEFT | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX);
				shading.pls.push([folderText, panel.colors.bBold ? panel.fonts.normalBold : panel.fonts.normal, this.colors.folderColor, this.x + maxIconWidth + level.offset * 20, textY, this.textWidth - 25]);
			} else {
				gr.GdiDrawText(folderText, panel.colors.bBold ? panel.fonts.normalBold : panel.fonts.normal, this.colors.folderColor, this.x + maxIconWidth + level.offset * 20, textY, this.textWidth - 25, panel.row_height, LEFT);
			}
			return this.colors.folderColor;
		};
		// Paint list
		for (let i = 0; i < rows; i++) {
			// Safety check: when deleted a playlist from data and paint fired before calling this.update()... things break silently. Better to catch it
			if (i + this.offset >= this.items) {
				console.log('Playlist manager: Warning. i + this.offset (' + (i + this.offset) + ') is >= than this.items (' + this.items + ') on paint.'); 
				break;
			}
			const currIdx = i + this.offset;
			const pls = this.data[currIdx];
			const textX = this.bShowIcons ? this.x + maxIconWidth : this.x;
			const textY = this.y + yOffset + (i * panel.row_height);
			// Set levels
			if (!this.isInFolder(pls)) {
				level.offset = 0;
				level.name = '';
			} else if (level.name.length && level.name !== pls.inFolder) {
				level.offset -= 1;
				level.name = pls.inFolder;
			} else if (!level.name) {
				let folder = this.data.find((item) => pls.inFolder === item.nameId);
				while (folder) {
					level.offset += 1;
					level.name = folder.name;
					folder = this.data.find((item) => folder.inFolder === item.nameId);
				}
			}
			// Alternate row colors
			if (panel.colors.bAltRowsColor && currIdx % 2) {
				gr.FillSolidRect(this.x - 5, textY, rowWidth, panel.row_height, altColorRow);
			}
			// Paint folders and playlists
			let playlistColor;
			if (pls.isFolder) {
				playlistColor = paintFolder(pls, i, textY);
				level.offset += 1;
				level.name = pls.name;
			} else {
				playlistColor = paintPls(pls, i, currIdx, textX, textY, level.offset);
			}
			paintColumn(pls, textX, textY, playlistColor);
			paintIndicators(pls, textY);
			paintSelection(i, textY);
		}
		if (panel.colors.bFontOutline && shading.img) {
			// Paint shade
			shading.img.StackBlur(0);
			if (shading.bPanelArt && getBrightness(...toRGB(panel.imageBackground.art.colors[0].col)) < 100) {shading.img = shading.img.InvertColours();} // Due to GDI bug, painting white doesn't work properly..
			gr.DrawImage(shading.img, this.x, this.y + yOffset, shading.img.Width, shading.img.Height, 0, 0, shading.img.Width, shading.img.Height, 0, 100);
			shading.img.ReleaseGraphics(shading.gr);
			// And text
			shading.pls.forEach((data) => {gr.GdiDrawText(...data, panel.row_height, LEFT);});
		}
		// Selection indicator
		// Current playlist selection is also drawn when a menu is opened if related to the selected playlist (this.bSelMenu)
		if (this.colors.selectedPlaylistColor !== panelBgColor && (this.bMouseOver || this.bSelMenu)) {
			const currSelIdx = typeof this.index !== 'undefined' && (this.index !== -1 || !this.bSelMenu) ? this.index : (this.bSelMenu ? currentItemIndex : -1);
			const currSelOffset = typeof this.index !== 'undefined' && (this.index !== -1 || !this.bSelMenu) ? this.offset : (this.bSelMenu ? this.lastOffset : 0);
			if (typeof currSelIdx !== 'undefined' && typeof this.data[currSelIdx] !== 'undefined') {
				if ((currSelIdx - currSelOffset) >= 0 && (currSelIdx - currSelOffset) < this.rows) {
					// Rectangle
					gr.DrawRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, 0, this.colors.selectedPlaylistColor);
				}
			}
		}
		// Display internal drag n drop
		if (this.isInternalDrop()) {
			const pls = this.data[this.internalPlsDrop[0]];
			if (pls) {
				const len = this.internalPlsDrop.length;
				const playlistDataText =  pls.name + (len > 1 ? '... (' + len  + ' playlists)' : '');
				const bInFolder = this.isInFolder(pls);
				const bToFolder = this.index !== -1 ? this.data[this.index].isFolder : false;
				const bToSameFolder = this.index !== -1 
					? this.internalPlsDrop.every((idx) => {
						return bToFolder && this.data[idx].inFolder === this.data[this.index].nameId || !bToFolder && this.data[idx].inFolder === this.data[this.index].inFolder;
					})
					: false;
				const bValid = this.isInternalDropValid();
				const backgroundColor = bValid 
					? this.colors.selectedPlaylistColor
					: invert(this.colors.selectedPlaylistColor);
				const titleColor = bValid
					? panel.colors.text
					: blendColors(panel.colors.text, backgroundColor, 0.5);
				const lineColor = opaqueColor(backgroundColor, bValid ? 100 : 50);
				let level = 0;
				if (this.index !== -1) {
					if (this.dropUp || this.dropDown) {
						const dropY = this.y + yOffset + (this.index - this.offset) * panel.row_height + (this.dropDown ? panel.row_height : 0);
						gr.DrawLine(this.x - 5, dropY, selWidth + _scale(2), dropY, _scale(2), lineColor);
					} else if (this.dropIn) {
						gr.DrawRect(this.x - 5, this.y + yOffset + (this.index - this.offset) * panel.row_height, selWidth, panel.row_height, _scale(2), lineColor);
					}
					// Nest folders
					let idx = this.index;
					while (idx !== -1 && (this.data[idx].isFolder || this.isInFolder(this.data[idx]))) {
						if (this.data[idx].isFolder) {level++;}
						idx = this.isInFolder(this.data[idx]) ? this.data.findIndex((pls) => pls.nameId === this.data[idx].inFolder): -1;
					}
				}
				const levelOffset = 20 * (level || bValid && bInFolder ? 1 : 0);
				gr.FillSolidRect(this.x - 5 + levelOffset, this.my, selWidth - levelOffset, panel.row_height, opaqueColor(backgroundColor, bValid ? 40 : 20));
				gr.DrawRect(this.x - 5 + levelOffset, this.my, selWidth - levelOffset, panel.row_height, 0, lineColor);
				gr.GdiDrawText(playlistDataText, panel.fonts.normal, titleColor, Math.max(levelOffset, this.bShowIcons ? maxIconWidth : 0) + this.x, this.my, this.textWidth - 30 - levelOffset / 2, panel.row_height, LEFT);
				if (levelOffset > 0) {
					if (bInFolder && !bToSameFolder) {
						const lineColor = opaqueColor(invert(this.colors.selectedPlaylistColor), 50);
						gr.GdiDrawText(chars.signOut, gfontIconCharAlt(), blendColors(panelBgColor, lineColor, 0.2), this.x, this.my, this.textWidth, panel.row_height, LEFT);
						gr.GdiDrawText(chars.signOut, gfontIconChar(), lineColor, this.x, this.my, this.textWidth, panel.row_height, LEFT);
					} else {
						gr.GdiDrawText(chars.folderOpenBlack, gfontIconCharAlt(), blendColors(panelBgColor, lineColor, 0.2), this.x + levelOffset * (level - 1) / level, this.my, this.textWidth, panel.row_height, LEFT);
						gr.GdiDrawText(chars.folderOpenBlack, gfontIconChar(), lineColor, this.x + levelOffset * (level - 1) / level, this.my, this.textWidth, panel.row_height, LEFT);
					}
				}
				let dragDropText = '';
				switch (true) {
					case bToFolder && !bToSameFolder && !bValid: {dragDropText = 'Level nesting too deep... (> ' + this.folders.maxDepth + ')'; break;}
					case bToSameFolder && !bValid: {dragDropText = 'Can not move to same folder...'; break;}
				}
				if (dragDropText.length) {
					const popupCol = opaqueColor(lightenColor(panel.getColorBackground() || RGB(0, 0, 0), 20), 80);
					const borderCol = opaqueColor(invert(popupCol), 50);
					const sizeX = gr.CalcTextWidth(dragDropText, panel.fonts.normal) + _scale (4);
					const sizeY = gr.CalcTextHeight(dragDropText, panel.fonts.normal) + _scale (2);
					const y = Math.min(this.my + panel.row_height, this.y + this.h - sizeY);
					const offsetX = this.x + levelOffset * (level - 1) / level;
					const x = Math.min(offsetX, this.x + this.w - sizeX);
					gr.FillRoundRect(x, y, sizeX, sizeY, 1, 1, popupCol);
					gr.DrawRoundRect(x, y, sizeX, sizeY, 1, 1, 1, borderCol);
					gr.GdiDrawText(dragDropText, panel.fonts.normal, panel.colors.text, x, y, sizeX, sizeY, CENTRE);
				}
			} else {
				console.log('Playlist manager: Warning. this.internalPlsDrop[0] (' + (this.internalPlsDrop[0]) + ') is not defined on paint.');
			}
		}
		// Char popup as animation
		if (this.lastCharsPressed.bDraw) {
			const popupCol = opaqueColor(lightenColor(panel.getColorBackground() || RGB(0, 0, 0), 20), 80);
			const borderCol = opaqueColor(invert(popupCol), 50);
			const textCol = panel.colors.text;
			const scaleX = 0.75;
			const scaleY = 1 / 2;
			const sizeX = Math.round(scaleX * this.w / 2);
			const sizeY = Math.round(scaleY * this.h / 3);
			const textOffset = scaleX * this.w * 1 / 20;
			const popX = this.x + this.w / 2 - sizeX / 2;
			const popY = this.y + this.h / 2 - sizeY / 2;
			// Draw the box
			gr.FillRoundRect(popX, popY, sizeX, sizeY, sizeX / 6, sizeY / 2, popupCol);
			gr.DrawRoundRect(popX, popY, sizeX, sizeY, sizeX / 6, sizeY / 2, 1, borderCol);
			// Draw the letter
			if (idxHighlight === -1) { // Striked out when not found
				gr.GdiDrawText(this.lastCharsPressed.str.toUpperCase(), panel.fonts.title, invert(blendColors(textCol, this.colors.selectedPlaylistColor, 0.5)), popX + textOffset, popY, sizeX - textOffset * 2, sizeY, CENTRE);
				const textW = Math.min(gr.CalcTextWidth(this.lastCharsPressed.str.toUpperCase(), panel.fonts.title), sizeX - textOffset) + 10;
				const lineX = Math.max(popX + sizeX / 2 - textW / 2 - 1, popX + textOffset / 2 );
				const lineW = Math.min(popX + sizeX / 2 + textW / 2 - 1, popX + sizeX - textOffset / 2);
				gr.DrawLine(lineX, popY + sizeY / 2, lineW, popY + sizeY / 2, 1, invert(opaqueColor(this.colors.selectedPlaylistColor, 70)));
			} else { // when found
				gr.GdiDrawText(this.lastCharsPressed.str.toUpperCase(), panel.fonts.title, textCol, popX + textOffset, popY, sizeX - textOffset * 2, sizeY, CENTRE);
				// And highlight a few ms the found playlist
				const currSelIdx = idxHighlight;
				const currSelOffset = idxHighlight !== - 1 ? this.offset : 0;
				if ((currSelIdx - currSelOffset) >= 0 && (currSelIdx - currSelOffset) < this.rows) {
					gr.DrawRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, 0, opaqueColor(this.colors.selectedPlaylistColor, 80));
					gr.FillSolidRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, opaqueColor(this.colors.selectedPlaylistColor, 50));
				}
			}
			this.lastCharsPressed.bDraw = false;
			animation.fRepaint = setTimeout(() => {animation.fRepaint = null; window.RepaintRect(0, this.y, window.Width, this.h);}, 600);
		}
		// Draw a tooltip box on drag n drop
		if (this.bIsDragDrop) {
			const popupCol = opaqueColor(lightenColor(panel.getColorBackground() || RGB(0, 0, 0), 20), 80);
			const borderCol = opaqueColor(invert(popupCol), 50);
			const sizeX = gr.CalcTextWidth(this.dragDropText, panel.fonts.normal) + _scale (4);
			const sizeY = gr.CalcTextHeight(this.dragDropText, panel.fonts.normal) + _scale (2);
			const y = Math.min(this.my + _scale(25), this.y + this.h - sizeY);
			const offsetX = y === this.my + _scale(25) ? _scale(10) : _scale(53)
			const x = Math.min(this.mx + offsetX, this.x + this.w - sizeX);
			gr.FillRoundRect(x, y, sizeX, sizeY, 1, 1, popupCol);
			gr.DrawRoundRect(x, y, sizeX, sizeY, 1, 1, 1, borderCol);
			gr.GdiDrawText(this.dragDropText, panel.fonts.normal, panel.colors.text, x, y, sizeX, sizeY, CENTRE);
		}
		// Up/down buttons
		this.up_btn.paint(gr, this.up_btn.hover ? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) : panel.colors.text);
		this.down_btn.paint(gr, this.down_btn.hover ? blendColors(RGB(...toRGB(panel.colors.text)), this.colors.selectedPlaylistColor, 0.8) : panel.colors.text);
	}
	
	this.repaint = () => {
		window.Repaint();
	}
	
	this.trace = (x, y) => { // On panel
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
	}
	
	this.traceHeader = (x, y) => { // On Header
		return x > 0 && x < panel.w && y > 0 && y < headerH;
	}
	
	this.traceHeaderButton = (x, y, button) => { // On Header
		return x > button.x && x < (button.x + button.w) && y > button.y && y < (button.y + button.h);
	}
	
	this.wheel = ({s, bPaint = true, bForce = false, scrollDelta = 3} = {}) => {
		if (this.trace(this.mx, this.my) || !bPaint || bForce) {
			if (this.items > this.rows) {
				if (!Number.isInteger(s)) {s = Math.round(s);}
				let offset = this.offset - (s * scrollDelta); // Offset changes by 3 on every step
				if (offset < 0) {
					offset = 0;
				}
				if (offset + this.rows > this.items) {
					offset = this.items - this.rows;
				}
				if (this.offset !== offset) {
					this.cacheLastPosition();
					this.offset = offset;
					if (this.trace(this.mx, this.my)) {
						this.index = Math.floor((this.my - this.y - yOffset) / panel.row_height) + this.offset;
					}
					if (bPaint) {this.repaint();}
				}
				if (this.uiElements['Scrollbar'].enabled && scroll && scroll.bDrag) {
					this.offset = offset;
					this.index = Math.floor((this.my - this.y - yOffset) / panel.row_height) + this.offset;
					this.inRange = true;
					this.cacheLastPosition();
				}
			}
			return true;
		} else {
			return false;
		}
	}
	
	this.jumpToIndex = (idx, bScroll = false) => { // Puts selected playlist in the middle of the window, if possible
		const cache = {index: this.index, offset: this.offset}
		this.index = idx;
		// Safechecks
		if (this.items < this.rows) {this.offset = 0;}
		if (this.index >= this.items) {this.index = this.items - 1;}
		// Jump
		const row = Math.ceil(this.items / this.rows);
		this.offset = this.index > this.rows / 2 
			? Math.floor(this.index / this.rows) * this.rows + this.index % this.rows - Math.round(this.rows / 2 - 1) 
			: 0;
		if (this.offset + this.rows >= this.items) {this.offset = this.items > this.rows ? this.items - this.rows : 0;}
		if (bScroll) {this.index = -1;}
		if (cache.index !== this.index || cache.offset !== this.offset) {this.repaint();}
		return this.index;
	}
	
	this.showCurrPls = ({bPlayingPls = false} = {}) => {
		const name = plman.GetPlaylistName(bPlayingPls ? plman.PlayingPlaylist : plman.ActivePlaylist);
		let idx = this.data.findIndex((pls) => {return pls.nameId === name;});
		if (idx === -1 && this.itemsFolder) {
			idx = this.dataAll.findIndex((pls) => {return pls.nameId === name;});
			const folderTree = [];
			let item = this.dataAll[idx];
			while (this.isInFolder(item)) {
				item = this.dataAll.find((pls) => {return pls.nameId === item.inFolder && pls.isFolder;});
				folderTree.push(item);
			}
			folderTree.reverse();
			if (this.data.includes(folderTree[0])) {
				folderTree.forEach((folder) => {
					idx = this.data.indexOf(folder);
					if (!folder.isOpen) {this.switchFolder(idx);}
				});
				idx = this.data.findIndex((pls) => {return pls.nameId === name;});
			}
		}
		return this.showPlsByIdx(idx);
	}
	
	this.showPlsByIdx = (idx) => {
		if (idx === -1) {
			idxHighlight = -1;
			animation.bHighlight = false;
			window.RepaintRect(0, this.y, window.Width, this.h);
			return false;
		} else if (idxHighlight === idx) {
			animation.bHighlight = true;
			window.RepaintRect(0, this.y, window.Width, this.h);
			return true;
		} else {
			animation.bHighlight = true;
			idxHighlight = currentItemIndex = this.jumpToIndex(idx);
			window.RepaintRect(0, this.y, window.Width, this.h);
			return true;
		}
	}
	
	this.showPlsByObj = (obj, ms = 10) => {
		// Set focus on new playlist if possible (if there is an active filter, then pls may be not found on this.data)
		const idx = this.data.findIndex((pls) => {return pls === obj;});
		if (idx !== -1) {
			if (ms) {
				setTimeout(() => { // Required since input popup invokes move callback after this func!
					this.cacheLastPosition(idx);
					this.showPlsByIdx(idx);
				}, ms);
			} else {
				this.cacheLastPosition(idx);
				this.showPlsByIdx(idx);
			}
		}
	}
	
	this.onMouseLeaveList = () => {  // Removes selection indicator
		if (!this.bSelMenu) { // When pressing right button, the index gets cleared too... but we may want to use it on the menus
			this.cacheLastPosition(this.offset + Math.round(this.rows / 2 - 1));
		}
		this.index = -1;
		this.mx = -1; this.my = -1;
		this.bMouseOver = false;
		this.clearSelPlaylistCache();
		this.up_btn.hover = false;
		this.down_btn.hover = false;
		this.bIsDragDrop = false;
		this.dragDropText = '';
		for (let key in this.headerButtons) {
			this.headerButtons[key].inFocus = false;
		}
		this.internalPlsDrop = [];
		this.repaint();
	}
	
	this.move = (x, y, mask, bDragDrop = false, bTooltipOverride = false) => {
		this.bIsDragDrop = bDragDrop;
		this.bMouseOver = true;
		const bMoved = this.mx !== x || this.my !== y;
		this.mx = x;
		this.my = y;
		if (this.traceHeader(x,y)) { // Tooltip for header
			let bButtonTrace = false;
			for (let key in this.headerButtons) {
				const button = this.headerButtons[key];
				if (this.traceHeaderButton(x, y, button)) {
					if (!bDragDrop && bMoved) {window.SetCursor(IDC_HAND);}
					this.tooltip.SetValue(isFunction(button.text) ? button.text(x, y, mask, button) : button.text, true);
					button.inFocus = true;
					bButtonTrace = true;
				} else {
					button.inFocus = false;
				}
			}
			if (this.isInternalDrop() && !this.isInternalDropValid()) {window.SetCursor(IDC_NO);}
			else if (!bButtonTrace) {
				if (this.searchInput) { // Apart to correctly select the end of string on move
					this.searchInput.check('move', x, y, bDragDrop);
				}
				if (this.searchInput && this.searchInput.trackCheck(x, y)) {
					const headerText = this.headerTooltip(mask, false);
					this.tooltip.SetValue(headerText, true);
				} else {
					if (bMoved) {window.SetCursor(IDC_ARROW);}
					if (this.modeUI === 'traditional' || !this.searchInput) {
						const headerText = this.headerTooltip(mask, !this.uiElements['Header buttons'].elements['Power actions'].enabled);
						this.tooltip.SetValue(headerText, true);
					}
				}
			}
			this.index = -1;
			this.inRange = false;
			this.up_btn.hover = false;
			this.down_btn.hover = false;
			this.repaint(); // Removes selection indicator
			return true;
		} else {
			for (let key in this.headerButtons) {
				this.headerButtons[key].inFocus = false;
			}
		}
		if (this.trace(x, y)) {
			this.searchInput && this.searchInput.check('move', x, y);
			this.cacheLastPosition();
			this.index = Math.floor((y - this.y - yOffset) / panel.row_height) + this.offset;
			this.inRange = this.index >= this.offset && this.index < this.offset + Math.min(this.rows, this.items);
			switch (true) {
				case this.up_btn.move(x, y):
				case this.down_btn.move(x, y):
					if (bMoved) {window.SetCursor(IDC_ARROW);}
					break;
				case !this.inRange: {
					if (bMoved) {window.SetCursor(IDC_ARROW);}
					if (this.tooltip.Text) {this.tooltip.SetValue(null);} // Removes tt when not over a list element
					this.index = -1;
					// this.lastOffset = 0;
					this.dropUp = this.dropDown = this.dropIn = false;
					this.repaint(); // Removes selection indicator
					break;
				}
				default: {
					switch (true) {
						case (x > this.x && x < this.x + (this.bShowSep ? this.x + this.w - 20 : this.x + this.w)):	{
							// Cursor
							if (bMoved) {window.SetCursor(IDC_HAND);}
							// Selection indicator
							this.repaint();
							// Tooltip for playlists
							const pls = this.data[this.index];
							if (pls) {
								if (this.isInternalDrop()) {
									const currY = this.y + yOffset + (this.index - this.offset) * panel.row_height;
									if (this.methodState !== this.manualMethodState()) {
										this.dropUp = this.dropDown = false;
									} else {
										this.dropUp = pls.isFolder
											? y < (currY + panel.row_height / 3)
											: y < (currY + panel.row_height / 2);
										this.dropDown = pls.isFolder 
											? y > (currY + panel.row_height * 2/3)
											: !this.dropUp;
									}
									this.dropIn = !this.dropUp && !this.dropDown;
								} else {
									this.dropUp = this.dropDown = this.dropIn = false;
								}
								const path = (pls.path) ? '(' + pls.path.replace(this.playlistsPath,'')  + ')' : '';
								const locks = getLocks(pls.nameId);
								let playlistDataText = (pls.isAutoPlaylist ? 'AutoPlaylist' : (pls.extension === '.xsp' ? 'Smart Playlist' : pls.isFolder ? 'Folder' : 'Playlist')) + ': ';
								playlistDataText += pls.nameId + ' - ' + (pls.isFolder ? this.calcColumnVal('size', pls, true) : pls.size) + ' Tracks ' + path;
								if (!pls.isFolder) {
									playlistDataText += '\n' + 'Status: ' + (pls.isLocked ? 'Locked (read-only)' : 'Writable');
									playlistDataText +=  locks.isLocked ? ' ' + _b((pls.extension !== '.ui' ? 'UI-locked: ' : '' ) + locks.name) : '';
									playlistDataText +=  locks.isLocked ? '\n' + 'Locks: ' + locks.types.joinEvery(', ', 4, '\n          ') : '';
									playlistDataText += '\n' + 'Category: ' + (pls.category ? pls.category : '-');
									playlistDataText += '\n' + 'Tags: ' + (isArrayStrings(pls.tags) ? pls.tags.join(', ') : '-');
									playlistDataText += '\n' + 'Track Tags: ' + (isArray(pls.trackTags) ? pls.trackTags.map((_) => {return Object.keys(_)[0];}).join(', ') : '-');
								} else {
									const total = pls.pls.lengthDeep;
									const totalCurrentView = pls.pls.lengthFilteredDeep;
									playlistDataText += '\n' + 'Childs: ' + totalCurrentView + ' item' + (totalCurrentView > 1 ? 's' : '') + (total !== totalCurrentView ? ' (of ' + total + ' total)' : '');
								}
								playlistDataText += '\n' + 'Duration: ' +  (pls.isFolder 
									? utils.FormatDuration(this.calcColumnVal('duration', pls, true)) 
									: pls.duration !== -1 
										? utils.FormatDuration(pls.duration) 
										: '?'
								);
								// Text for AutoPlaylists
								if (pls.isAutoPlaylist || pls.query) {
									playlistDataText += '\n' + 'Query: ' + (pls.query ? pls.query : '-');
									playlistDataText += '\n' + 'Sort: ' + (pls.sort ? pls.sort + (pls.bSortForced ? ' (forced)' : ''): '-');
									playlistDataText += '\n' + 'Limit: ' +  (pls.limit ? pls.limit : '\u221E') + ' tracks';
								}
								// Synced playlists with ListenBrainz
								if (pls.playlist_mbid.length) {
									playlistDataText += '\n' + 'MBID: ' +  pls.playlist_mbid;
								}
								// Show UI playlist duplicate warning
								let iDup = 0;
								if (pls.extension === '.ui') {
									iDup = getPlaylistIndexArray(pls.nameId).length;
								}
								// Show current action
								const lShortcuts = this.getShortcuts('L');
								const mShortcuts = this.getShortcuts('M');
								const rShortcuts = this.getShortcuts('R');
								const defaultAction = this.getDefaultShortcutAction('M'); // All actions are shared for M or L mouse
								if (this.bShowTips || mask === MK_CONTROL || mask === MK_SHIFT || mask === MK_SHIFT + MK_CONTROL || iDup > 1) {
									playlistDataText += '\n---------------------------------------------------';
								}
								if (mask === MK_CONTROL) {
									playlistDataText += lShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + L. Click to ' + lShortcuts[MK_CONTROL].key + ')' : '';
									playlistDataText += mShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + M. Click to ' + mShortcuts[MK_CONTROL].key + ')' : '';
									playlistDataText += rShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + M. Click to ' + mShortcuts[MK_CONTROL].key + ')' : '';
								} else if (mask === MK_SHIFT) {
									playlistDataText += lShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + L. Click to ' + lShortcuts[MK_SHIFT].key + ')' : '';
									playlistDataText += mShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + M. Click to ' + mShortcuts[MK_SHIFT].key + ')' : '';
									playlistDataText += rShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + M. Click to ' + mShortcuts[MK_SHIFT].key + ')' : '';
								} else if (mask === MK_SHIFT + MK_CONTROL) {
									playlistDataText += lShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + L. Click to ' + lShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
									playlistDataText += mShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + M. Click to ' + mShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
									playlistDataText += rShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + M. Click to ' + mShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
								} else if (this.bShowTips) { // All Tips
									playlistDataText += lShortcuts['SG_CLICK'].key !== defaultAction ? '\n(L. Click to ' + lShortcuts['SG_CLICK'].key + ')' : '';
									playlistDataText += lShortcuts['DB_CLICK'].key !== defaultAction ? '\n(Double L. Click to ' + lShortcuts['DB_CLICK'].key + ')' : '';
									if (!this.uiElements['Header buttons'].elements['List menu'].enabled) {playlistDataText += '\n(R. Click for other tools / new playlists)';}
									playlistDataText += lShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + L. Click to ' + lShortcuts[MK_CONTROL].key + ')' : '';
									playlistDataText += lShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + L. Click to ' + lShortcuts[MK_SHIFT].key + ')' : '';
									playlistDataText += lShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + L. Click to ' + lShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
									// Middle button
									playlistDataText += mShortcuts['SG_CLICK'].key !== defaultAction ? '\n(M. Click to ' + mShortcuts['SG_CLICK'].key + ')' : '';
									playlistDataText += mShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + M. Click to ' + mShortcuts[MK_CONTROL].key + ')' : '';
									playlistDataText += mShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + M. Click to ' + mShortcuts[MK_SHIFT].key + ')' : '';
									playlistDataText += mShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + M. Click to ' + mShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
									// R. Button
									playlistDataText += rShortcuts['SG_CLICK'].key !== defaultAction ? '\n(R. Click to ' + rShortcuts['SG_CLICK'].key + ')' : '';
									playlistDataText += rShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + R. Click to ' + rShortcuts[MK_CONTROL].key + ')' : '';
									playlistDataText += rShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + R. Click to ' + rShortcuts[MK_SHIFT].key + ')' : '';
									playlistDataText += rShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + R. Click to ' + rShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
								}
								if (headerRe.test(playlistDataText)) { // If no shortcut was found, show default ones
									if (!this.uiElements['Header buttons'].elements['List menu'].enabled) {
										playlistDataText += '\n(L. Click to Manage playlist)';
										playlistDataText += '\n(R. Click for other tools / new playlists)';
									} else {
										playlistDataText += '\n(L. Click to Manage playlist)';
									}
								}
								if (pls.isFolder) { // Change text for folders
									// Remove unused actions
									const ignoreActions = ['Playlist\'s items menu'];
									ignoreActions.forEach((t) => {
										playlistDataText = playlistDataText.replace(new RegExp('\\n\\(.*' + escapeRegExp(t) + '\\)', 'gi'), '');
									});
									// Replace
									if (playlistRe.test(playlistDataText)) {
										playlistDataText = playlistDataText.replace(playlistRe, (match) => matchCase('folder', match));
									}
								}
								// Adding Duplicates on selection hint
								let warningText = '';
								if (lShortcuts.hasOwnProperty(mask) && lShortcuts[mask].key === 'Copy selection to playlist' || mShortcuts.hasOwnProperty(mask) && mShortcuts[mask].key === 'Copy selection to playlist') {
									if (pls.isAutoPlaylist || pls.query) {warningText += '\n' + '(' + (pls.isAutoPlaylist ? 'AutoPlaylists' : 'Smart Playlists') + ' are non editable, convert it first)';}
									else if (pls.extension === '.fpl') {warningText += '\n(.fpl playlists are non editable, convert it first)';}
									else if (pls.isLocked) {warningText += '\n(Locked playlists are non editable, unlock it first)';}
									else {
										const selItems = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
										if (!selItems || !selItems.Count) {warningText += '\n(No items on active playlist current selection)';}
									}
									if (this.checkSelectionDuplicatesPlaylist({playlistIndex: this.index})) {warningText += '\nWarning! Some track(s) already present...';}
								}
								if (iDup > 1) {warningText += '\nWarning! Multiple UI playlists ' + _p(iDup) + ' have the same name.';}
								if (this.bLibraryChanged && !this.bLiteMode && !pls.isAutoPlaylist && pls.extension !== '.fpl' && pls.extension !== '.ui') {warningText += '\nWarning! Library paths cache is outdated,\nloading playlists may be slower than intended...';}
								if (pls.extension === '.xsp' && pls.type !== 'songs') {warningText += '\nWarning! XSP playlist with non compatible type ' + _p(pls.type) + '.';}
								if (warningText.length) {playlistDataText += '\n' + warningText;}
								if (this.tooltip.text !== playlistDataText) {
									if (bMoved) {this.tooltip.Deactivate();}
									this.tooltip.SetValue(playlistDataText, true);
								} else {
									this.tooltip.SetValue(playlistDataText, true);
								}
							}
							break;
						}
						default: {
							this.clearSelPlaylistCache();
							if (this.tooltip.Text) {this.tooltip.SetValue(null);} // Removes tt when not over a list element
							this.repaint(); // Removes selection indicator
							this.dropUp = this.dropDown = this.dropIn = false;
							break;
						}
					}
					break;
				}
			}
			// Force scrolling so the list doesn't get blocked at current view while doing internal drag n drop
			if (this.isInternalDrop()) {
				this.up_btn.hover = this.up_btn.lbtn_up(x, y);
				this.down_btn.hover = this.down_btn.lbtn_up(x, y);
				if (!this.isInternalDropValid()) {window.SetCursor(IDC_NO);}
			}
			return true;
		} else {
			this.dropUp = this.dropDown = this.dropIn = false;
			this.up_btn.hover = false;
			this.down_btn.hover = false;
			if (!bTooltipOverride && this.tooltip.Text) {this.tooltip.SetValue(null);} // Removes tt when not over a list element
			this.index = -1;
			this.repaint(); // Removes selection indicator
			return false;
		}
	}
	
	this.cacheLastPosition = (z = this.index) => { // Saves info to restore position later!
		if (this.inRange && z !== -1) {
			this.lastIndex = z;
			this.lastOffset = this.offset;
		}
		currentItemIndex = this.lastIndex;
		if (currentItemIndex >= this.items) {currentItemIndex = this.items - 1;}
		bMaintainFocus = (currentItemIndex !== -1); // Skip at init or when mouse leaves panel
		const item = (bMaintainFocus) ? this.data[currentItemIndex] : null; // Skip at init or when mouse leaves panel
		currentItemPath = item ? item.path : null;
		currentItemNameId = item ? item.nameId : null;
		currentItemIsAutoPlaylist = item ? item.isAutoPlaylist : null;
		currentItemIsUI = item ? item.extension === '.ui' : null;
		currentItemIsFolder = item ? item.isFolder : null;
	}
	
	this.clearLastPosition = () => { // Clears position
		if (this.inRange && this.index !== -1) {
			this.lastIndex = this.index;
			this.lastOffset = this.offset;
		}
		currentItemIndex = -1;
		bMaintainFocus = (currentItemIndex !== -1); // Skip at init or when mouse leaves panel
		const item = (currentItemIndex !== -1) ? this.data[currentItemIndex] : null; // Skip at init or when mouse leaves panel
		currentItemPath = item ? item.path : null;
		currentItemNameId = item ? item.nameId : null;
		currentItemIsAutoPlaylist = item ? item.isAutoPlaylist : null;
		currentItemIsUI = item ? item.extension === '.ui' : null;
		currentItemIsFolder = item ? item.isFolder : null;
		this.index = -1;
		this.offset = 0;
	}
	
	this.jumpLastPosition = () => {
		if (currentItemIndex < this.items) {
			for (let i = 0; i < this.items; i++) { // Also this separate for the same reason, to 
				// Get current index of the previously selected item to not move the list focus when updating...
				// Offset is calculated simulating the wheel, so it moves to the previous location
				if (currentItemIsAutoPlaylist) { // AutoPlaylists
					if (this.data[i].isAutoPlaylist && this.data[i].nameId === currentItemNameId) { 
						this.jumpToIndex(i);
						break;
					}
				} else if (currentItemIsUI) {
					if (this.data[i].extension === '.ui' && this.data[i].nameId === currentItemNameId) { 
						this.jumpToIndex(i);
						break;
					}
				} else if (currentItemIsFolder) { // Standard Playlists
					if (this.data[i].isFolder && this.data[i].nameId === currentItemNameId) { 
						this.jumpToIndex(i);
						break;
					}
				} else if (this.data[i].path === currentItemPath) { // Standard Playlists
					this.jumpToIndex(i);
					break;
				}
			}
		} else {
			this.clearLastPosition();
		}
	};
	
	this.on_focus = (bFocused) => {
		if (this.searchInput) {
			this.searchInput.check('down', -1, -1);
			this.searchInput.check('up', -1, -1);
		}
	}
	
	this.rbtn_up = (x, y, mask) => {
		if (this.traceHeader(x, y)) {
			if (this.searchInput && this.searchInput.trackCheck(x, y)) {
				for (let key in this.headerButtons) {this.headerButtons[key].inFocus = false;} // Focus bug when alt+tab
				return this.searchInput.check('right', x, y);
			} else {
				let bButtonTrace = false;
				let bActionButton = false;
				for (let key in this.headerButtons) {
					const button = this.headerButtons[key];
					if (this.traceHeaderButton(x, y, button)) {
						if (button.func) {
							bButtonTrace = true;
						} else {
							bActionButton = true;
						}
						break;
					}
				}
				if (!bButtonTrace) {
					const buttons = this.uiElements['Header buttons'].elements;
					if (!buttons['Settings menu'].enabled && !buttons['Power actions'].enabled || bActionButton) {
						return createMenuRightTop().btn_up(x, y);
					}
				}
			}
		} else if (!this.uiElements['Header buttons'].elements['List menu'].enabled) {
			return createMenuRight().btn_up(x, y);
		} else if (this.trace(x, y)) {
			this.cacheLastPosition();
			const z = this.index;
			if (x > this.x && x < this.x + (this.bShowSep ? this.x + this.w - 20 : this.x + this.w)) {
				const shortcuts = this.getShortcuts('R');
				const sgShortcut = shortcuts[shortcuts.hasOwnProperty(mask) ? mask : 'SG_CLICK'];
				if (sgShortcut) { // Select all from current view or clean selection
					this.executeAction(z, x, y, sgShortcut, false);
				}
			}
		}
		return true;
	}
	
	this.lbtn_down = (x, y, mask) => {
		if (this.searchInput) {
			if (this.traceHeader(x, y)) {
				this.searchInput.check('down', x, y);
			} else {
				this.searchInput.check('down', -1, -1);
				this.searchInput.check('up', -1, -1);
			}
		}
		if (this.trace(x,y)) {
			if (this.methodState === this.manualMethodState() || this.isFolderInView()) {
				if (x > this.x && x < this.x + (this.bShowSep ? this.x + this.w - 20 : this.x + this.w)) {
					// Set drag n drop after some time
					const z = this.index;
					setTimeout(() => {
						if (!utils.IsKeyPressed(0x01) || z === -1) {return;} // L. Click
						if (z !== this.index || z === this.index && (Math.abs(this.mx - x) > 20 || Math.abs(this.my - y) > 20)) {
							this.internalPlsDrop = this.indexes.length ? [...this.indexes] : [z];
						}
					}, 300);
				}
			}
		}
	}
	
	this.lbtn_up = (x, y, mask) => {
		const shortcuts = this.getShortcuts('L');
		if (this.trace(x, y)) {
			if (this.searchInput && this.searchInput.select && this.searchInput.edit && !this.searchInput.trackCheck(x, y)) { // Allow finishing selection outside the input box
				this.searchInput.check('up', x < this.searchInput.x ? this.searchInput.x + 1 : this.searchInput.x + this.searchInput.w, this.searchInput.y + 1);
				return true;
			}
			this.cacheLastPosition();
			switch (true) {
				case this.up_btn.lbtn_up(x, y):
				case this.down_btn.lbtn_up(x, y):
				case !this.inRange:
					if (!shortcuts.hasOwnProperty(mask) || shortcuts[mask].key === 'Multiple selection' || shortcuts[mask].key === 'Multiple selection (range)') {this.resetMultSelect();}
					if (this.isInternalDrop()) {this.internalPlsDrop = []; this.move(this.mx + 0.01, this.my, mask); return false;}
					break;
				default: {
					const z = this.index;
					if (x > this.x && x < this.x + (this.bShowSep ? this.x + this.w - 20 : this.x + this.w)) {
						if (this.isInternalDrop()) {
							if (this.isInternalDropValid()) {
								const currIdx = this.dropIn || this.dropUp ? z : Math.min(z + 1, this.items - 1);
								const currItem = this.data[currIdx];
								if (!this.internalPlsDrop.includes(z) && this.internalPlsDrop.every((idx) => this.data[idx])) {
									if (this.methodState === this.manualMethodState() && !this.dropIn) {
										const plsSel = this.indexes.length ? this.indexes.map((idx) => this.data[idx]) : [];
										const name = currItem.nameId;
										const cache = [...this.sortingFile];
										const bInverted = this.getSortState() !== this.defaultSortState(this.manualMethodState());
										if (bInverted) {this.sortingFile = this.sortingFile.reverse();} // For reverse sorting, list must be sorted first too!
										const toMove = this.internalPlsDrop.reverse().map((idx) => {
											const sortIdx = this.sortingFile.findIndex((n) => n === this.data[idx].nameId);
											return sortIdx !== -1 ? this.sortingFile.splice(sortIdx, 1)[0] : null;
										}).filter((n) => n !== null).reverse();
										const toIdx = this.sortingFile.findIndex((n) => n === name);
										if (toIdx !== -1) {
											this.sortingFile.splice(toIdx + (this.dropDown && z === (this.items - 1) ? 1 : 0), 0, ...toMove); // Move one lower at end
											if (bInverted) {this.sortingFile = this.sortingFile.reverse();} // And revert back
											// TODO sort within folder
											if (this.internalPlsDrop.some((idx) => this.isInFolder(this.data[idx])) && !currItem.isFolder && !this.isInFolder(currItem)) {
												this.internalPlsDrop.forEach((idx) => {
													this.removeFromFolder(this.data[idx]);
												});
											}
											this.save();
											this.saveManualSorting();
											this.sort();
											if (plsSel.length) { // Restore multiple selection
												this.indexes = plsSel.map((pls) => this.data.indexOf(pls)).filter((idx) => idx !== -1);
											}
										} else {this.sortingFile = cache;}
									} else if (currItem.isFolder) {
										this.internalPlsDrop.forEach((idx) => {
											this.addToFolder(this.data[idx], currItem);
										});
										this.save();
										if (this.methodState === this.manualMethodState()) {this.saveManualSorting();}
										this.sort();
									} else {
										this.internalPlsDrop.forEach((idx) => {
											this.removeFromFolder(this.data[idx]);
										});
										this.save();
										if (this.methodState === this.manualMethodState()) {this.saveManualSorting();}
										this.sort();
									}
								}
								}
							this.internalPlsDrop = [];
						} else if (shortcuts.hasOwnProperty(mask)) {
							if (shortcuts[mask].key === 'Copy selection to playlist' || shortcuts[mask].key === 'Move selection to playlist') {
								const bDelSource = shortcuts[mask].key === 'Move selection to playlist';
								const cache = [this.offset, this.index];
								let bSucess = false;
								if (this.indexes.length) {
									this.indexes.forEach((zz) => {
										const item = typeof zz !== 'undefined' && zz !== -1 ? this.data[zz] : null;
										if (item && item.isFolder) {
											if (!!item.pls.lengthFiltered && this.sendSelectionToPlaylist({pls: item, bCheckDup: true, bPaint: false, bDelSource})) {
												bSucess = true;
											}
										} else if (this.sendSelectionToPlaylist({playlistIndex: zz, bCheckDup: true, bPaint: false, bDelSource})) {
											bSucess = true;
										}
									});
								} else {
									const currItem = this.data[z];
									if (currItem.isFolder) {
										if (!!currItem.pls.lengthFiltered && this.sendSelectionToPlaylist({pls: currItem, bCheckDup: true, bPaint: false, bDelSource})) {
											bSucess = true;
										}
									} else {
										bSucess = this.sendSelectionToPlaylist({playlistIndex: z, bPaint: false, bDelSource});
									}
								}
								if (bSucess) {
									[this.offset, this.index] = cache;
									window.RepaintRect(0, this.y, window.Width, this.h); // Don't reload the list but just paint with changes to avoid jumps
								}
							} else {
								this.executeAction(z, x, y, shortcuts[mask]);
							}
						} else { // Only mouse
							const currItem = this.data[z];
							if (!this.bDoubleclick) { // It's not a second lbtn click
								if (!this.uiElements['Header buttons'].elements['List menu'].enabled) {
									this.playlistMenu(z, x, y);
								} else if (currItem.isFolder) {
									this.switchFolder(z);
									this.save();
								} else {
									this.timeOut = delayFn(this.executeAction, this.iDoubleClickTimer)(z, x, y, shortcuts['SG_CLICK']); // Creates the menu and calls it later
								}
							} else {this.bDoubleclick = false;}
						}
					} else {
						if (this.isInternalDrop()) {this.internalPlsDrop = [];}
					}
					break;
				}
			}
			this.searchInput && this.searchInput.check('up', -1, -1);
			return true;
		} else if (this.traceHeader(x, y)) { // Highlight active playlist or playing playlist
			if (this.isInternalDrop()) {this.internalPlsDrop = []; this.move(this.mx + 0.01, this.my, mask); return true;}
			if (this.searchInput && this.searchInput.select && this.searchInput.edit && !this.searchInput.trackCheck(x, y)) { // Allow finishing selection outside the input box
				this.searchInput.check('up', x < this.searchInput.x ? this.searchInput.x + 1 : this.searchInput.x + this.searchInput.w, this.searchInput.y + 1);
				return true;
			}
			let bButtonTrace = false;
			let bActionButton = false;
			for (let key in this.headerButtons) {
				const button = this.headerButtons[key];
				if (this.traceHeaderButton(x, y, button)) {
					if (button.func) {
						button.func(x, y, mask);
						bButtonTrace = true;
					} else {
						bActionButton = true;
					}
					button.inFocus = false;
					break;
				}
			}
			if (!bButtonTrace) {
				if (this.searchInput && this.searchInput.trackCheck(x, y)) {
					this.searchInput.check('up', x, y);
				} else if (bActionButton || this.modeUI === 'traditional' || !this.uiElements['Header buttons'].elements['Power actions'].enabled) {
					const shortcuts = this.getShortcuts('L', 'HEADER');
					const sgShortcut = shortcuts[shortcuts.hasOwnProperty(mask) ? mask : 'SG_CLICK'];
					if (sgShortcut) { // Select all from current view or clean selection
						if (!this.bDoubleclick) { // It's not a second lbtn click
							this.timeOut = delayFn(this.executeAction, this.iDoubleClickTimer)(void(0), x, y, sgShortcut, false);
						} else {this.bDoubleclick = false;}
					}
					this.move(this.mx, this.my, mask); // Updates tooltip even when mouse hasn't moved
				}
			}
			return true;
		} else {
			if (!shortcuts.hasOwnProperty(mask) || shortcuts[mask].key === 'Multiple selection' || shortcuts[mask].key === 'Multiple selection (range)') {this.resetMultSelect();}
			this.searchInput && this.searchInput.select && this.searchInput.edit && this.searchInput.check('up', this.searchInput.x + (x > (this.x + this.w) ? this.searchInput.w : 1), this.searchInput.y + 1); // Allow finishing selection outside panel
			return false;
		}
	}
	
	this.mbtn_up = (x, y, mask) => {
		const shortcuts = this.getShortcuts('M');
		const sgShortcut = shortcuts[shortcuts.hasOwnProperty(mask) ? mask : 'SG_CLICK'];
		if (this.trace(x, y)) {
			this.cacheLastPosition();
			switch (true) {
				case !this.inRange:
					if (sgShortcut.key === 'Multiple selection' || sgShortcut.key === 'Multiple selection (range)') {this.resetMultSelect();}
					break;
				default: {
					const z = this.index;
					if (x > this.x && x < this.x + (this.bShowSep ? this.x + this.w - 20 : this.x + this.w)) {
						if (shortcuts.hasOwnProperty(mask)) {
							if (shortcuts[mask].key === 'Copy selection to playlist' || shortcuts[mask].key === 'Move selection to playlist') {
								const bDelSource = shortcuts[mask].key === 'Move selection to playlist';
								const cache = [this.offset, this.index];
								let bSucess = false;
								if (this.indexes.length) {
									this.indexes.forEach((z) => {
										if (this.sendSelectionToPlaylist({playlistIndex: z, bCheckDup: true, bPaint: false, bDelSource})) {
											bSucess = true;
										}
									});
								} else {bSucess = this.sendSelectionToPlaylist({playlistIndex: z, bPaint: false, bDelSource});}
								if (bSucess) {
									[this.offset, this.index] = cache;
									window.RepaintRect(0, this.y, window.Width, this.h); // Don't reload the list but just paint with changes to avoid jumps
								}
							} else {
								this.executeAction(z, x, y, shortcuts[mask]);
							}
						} else { // Only mouse
							this.executeAction(z, x, y, shortcuts['SG_CLICK']);
						}
					}
					break;
				}
			}
			return true;
		} else if (this.traceHeader(x, y)) {
			let bButtonTrace = false;
			let bActionButton = false;
			for (let key in this.headerButtons) {
				const button = this.headerButtons[key];
				if (this.traceHeaderButton(x, y, button)) {
					if (button.func) {
						button.func(x, y, mask);
						bButtonTrace = true;
					} else {
						bActionButton = true;
					}
					break;
				}
			}
			if (!bButtonTrace && (bActionButton || this.modeUI === 'traditional' || !this.uiElements['Header buttons'].elements['Power actions'].enabled)) {
				const shortcuts = this.getShortcuts('M', 'HEADER');
				const sgShortcut = shortcuts[shortcuts.hasOwnProperty(mask) ? mask : 'SG_CLICK'];
				if (sgShortcut) {
					this.executeAction(void(0), x, y, sgShortcut, false);
				}
			}
			return false;
		} else {
			// Clean selection
			if (sgShortcut.key === 'Multiple selection' || sgShortcut.key === 'Multiple selection (range)') {this.resetMultSelect();}
			return false;
		}
	}
	
	this.lbtn_dblclk = (x, y) => {
		const shortcuts = this.getShortcuts('L');
		const mask = 'DB_CLICK';
		if (this.trace(x, y)) {
			this.cacheLastPosition();
			switch (true) {
				case !this.inRange:
					break;
				default:
				{
					const z = this.index;
					clearTimeout(this.timeOut);
					this.timeOut = null;
					this.bDoubleclick = true;
					if (this.data[z].isFolder) {break;}
					this.executeAction(z, x, y, shortcuts[mask]);
					break;
				}
			}
			return true;
		} else if (this.traceHeader(x, y)) {
			let bButtonTrace = false;
			let bActionButton = false;
			for (let key in this.headerButtons) {
				const button = this.headerButtons[key];
				if (this.traceHeaderButton(x, y, button)) {
					if (button.func) {
						button.func(x, y, mask);
						bButtonTrace = true;
					} else {
						bActionButton = true;
					}
					break;
				}
			}
			if (!bButtonTrace) {
				if (this.searchInput && this.searchInput.trackCheck(x, y)) {
					this.searchInput.check('dblclk', x, y);
				} else if (bActionButton || this.modeUI === 'traditional' || !this.uiElements['Header buttons'].elements['Power actions'].enabled) {
					clearTimeout(this.timeOut);
					this.timeOut = null;
					this.bDoubleclick = true;
					const shortcuts = this.getShortcuts('L', 'HEADER');
					const sgShortcut = shortcuts[mask];
					if (sgShortcut) {
						this.executeAction(void(0), x, y, sgShortcut, false);
					}
					this.move(this.mx, this.my); // Updates tooltip even when mouse hasn't moved
				}
			}
			return true;
		} else {
			if (!shortcuts.hasOwnProperty(mask) || shortcuts[mask].key === 'Multiple selection' || shortcuts[mask].key === 'Multiple selection (range)') {this.resetMultSelect();}
			return false;
		}
	}
	
	this.on_char = (code) => {
		if (this.searchInput && this.searchInput.active) {
			this.searchInput.on_char(code); 
		}
		return;
	}
	
	this.key_down = (k) => {
		if (this.searchInput && this.searchInput.active) {
			this.searchInput.on_key_down(k); 
			return;
		}
		switch (k) {
			// Scroll wheel
			case VK_UP: {
				this.wheel({s: 1, bForce: true});
				return true;
			}
			case VK_DOWN: {
				this.wheel({s: -1, bForce: true});
				return true;
			}
			// Scroll entire pages
			case VK_PGUP: {
				this.wheel({s: this.rows / 3, bForce: true});
				return true;
			}
			case VK_PGDN: {
				this.wheel({s: -this.rows / 3, bForce: true});
				return true;
			}
			// Go to top/bottom
			case VK_HOME: {
				let offset = 0;
				while (true) {
					this.wheel({s: 1, bPaint: false});
					if (offset === this.offset) {this.repaint(); currentItemIndex = 0; break;} else {offset = this.offset;}
				}
				return true;
			}
			case VK_END: {
				let offset = 0;
				while (true) {
					this.wheel({s: -1, bPaint: false});
					if (offset === this.offset) {this.repaint(); currentItemIndex = this.items - 1; break;} else {offset = this.offset;}
				}
				return true;
			}
			// Updates tooltip even when mouse hasn't moved
			case VK_CONTROL: {
				if (getKeyboardMask() === kMask.ctrlShift) {this.move(this.mx, this.my, MK_SHIFT + MK_CONTROL);}
				else {this.move(this.mx, this.my, MK_CONTROL);}
				return true;
			}
			case VK_SHIFT: {
				if (getKeyboardMask() === kMask.ctrlShift) {this.move(this.mx, this.my, MK_SHIFT + MK_CONTROL);}
				else {this.move(this.mx, this.my, MK_SHIFT);}
				return true;
			}
			// Quick-search or keyboard shortcuts
			default: {
				if (!this.bMouseOver) {return false;}
				const keyChar = keyCode(k);
				// Enabled features
				const showMenus = JSON.parse(this.properties.showMenus[1]);
				// Shortcuts
				const z = this.index;
				const pls = this.data[z];
				if (z !== -1) {this.cacheLastPosition(z);}
				if (this.properties.bGlobalShortcuts[1]) {
					switch (keyChar) {
						case 'f1': // Lock/Unlock
							if (z !== -1) {
								const playlists = [];
								const indexes = [];
								if (pls.isFolder) {
									pls.pls.filtered.forEach((subPls) => playlists.push(subPls));
									playlists.forEach((subPls) => indexes.push(this.dataAll.indexOf(subPls)));
								} else {
									playlists.push(pls);
									indexes.push(this.dataAll.indexOf(pls));
								}
								indexes.forEach((idx, i) => {
									if (playlists[i].extension === '.ui') {
										const lockTypes = ['AddItems', 'RemoveItems', 'ReplaceItems', 'ReorderItems', 'RenamePlaylist', 'RemovePlaylist'];
										const index = plman.FindPlaylist(playlists[i].nameId);
										if (index === -1) {return false;}
										const currentLocks = plman.GetPlaylistLockedActions(index) || [];
										const lockName = plman.GetPlaylistLockName(index);
										if (lockName === 'foo_spider_monkey_panel' || !lockName) {
											if (currentLocks.length) {
												plman.SetPlaylistLockedActions(index, []);
											} else {
												plman.SetPlaylistLockedActions(index, lockTypes);
											}
										}
									} else {switchLock(this, idx, true);}
								});
								return true;
							}
							return false;
						case 'f2': // Rename
							if (z !== -1) {
								const input = Input.string('string', pls.name, 'Enter playlist name:', window.Name, 'My playlist', void(0), true);
								if (input === null) {return;}
								if (pls.isFolder) {renamefolder(this, z, input);}
								else {renamePlaylist(this, z, input);}
								return true;
							}
							return false;
						case 'f3': // Clone in UI (view)
							if (z !== -1) {
								if (pls.isFolder) {
									const playlists = pls.pls.filtered;
									const bOpen = pls.isOpen;
									if (!bOpen) {this.switchFolder(z);}
									const indexes = playlists.map((p) => this.data.indexOf(p));
									indexes.forEach((z, i) => {
										const subPls = playlists[i];
										if (subPls.extension === '.xsp' && subPls.hasOwnProperty('type') && subPls.type !== 'songs') {return;}
										if (subPls.extension !== '.ui' && !subPls.isFolder) {
											if (subPls.isAutoPlaylist) {
												const remDupl = (subPls.isAutoPlaylist && this.bRemoveDuplicatesAutoPls) || (subPls.extension === '.xsp' && this.bRemoveDuplicatesSmartPls) ? this.removeDuplicatesAutoPls : [];
												cloneAsStandardPls(this, z, remDupl, this.bAdvTitle, false);
											} else {
												clonePlaylistFile(this, z, '.ui');
											}
										}
									});
									if (!bOpen) {this.switchFolder(z);}
								} else if (pls.isAutoPlaylist || pls.query) {
									const remDupl = (pls.isAutoPlaylist && this.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && this.bRemoveDuplicatesSmartPls) ? this.removeDuplicatesAutoPls : [];
									clonePlaylistInUI(this, z, remDupl, this.bAdvTitle);
								} else {
									clonePlaylistFile(this, z, '.ui');
								}
								return true;
							}
							return false;
						case 'f4': // Load (edit)
							if (z !== -1) {
								if (pls.isFolder) {
									const playlists = pls.pls.filtered;
									const indexes = playlists.map((p) => this.dataAll.indexOf(p));
									indexes.forEach((z, i) => {
										const subPls = playlists[i];
										if (subPls.extension !== '.ui' && !subPls.isFolder) {this.loadPlaylist(z, true);}
									});
								} else {
									this.loadPlaylistOrShow(z);
								}
								return true;
							}
							return false;
						case 'f5': // Clone (copy)
							if (z !== -1) {
								if (pls.isFolder) {
									const name = pls.name + ' (copy ' + this.dataAll.reduce((count, iPls) => {if (iPls.name.startsWith(pls.name + ' (copy ')) {count++;} return count;}, 0) + ')';
									this.addFolder(name);
								} else if (pls.isAutoPlaylist) {cloneAsAutoPls(this, z);}
								else if (pls.extension === '.xsp') {cloneAsSmartPls(this, z);}
								else {clonePlaylistFile(this, z, pls.extension);}
								return true;
							}
							return false;
						case 'f6': // Export to ListenBrainz (move)
							if (z !== -1 && showMenus['Online sync']) {
								return this.exportToListenbrainz(pls);
							}
							return false;
						case 'f7': { // Add playlist (new)
							if (this.bLiteMode) {
								this.addUIplaylist({bInputName: true});
							} else {
								if (showMenus['Folders'] && getKeyboardMask() === kMask.shift) {
									this.addFolder();
								} else {
									this.add({bEmpty: true});
								}
							}
							return true;
						}
						case 'f8': // Cycle categories
							if (showMenus['Category']) {cycleCategories();}
							return true;
						case 'f9': // Filter playlists with selected tracks / Search
							const selItems = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
							if (selItems && selItems.Count) {
								if (this.searchInput && this.searchMethod.bPath) {
									let search = '';
									if (selItems.Count > 1 && list.searchMethod.bRegExp) {
										const paths = selItems.GetLibraryRelativePaths().map((path) => path.split('\\').slice(-1)[0]).filter(Boolean);
										search = '/' + paths.join('|') + '/i';
										
									} else {
										search = fb.GetLibraryRelativePath(selItems[0]).split('\\').slice(-1)[0];
									}
									this.searchInput.text = search;
									this.search();
								} else {
									const found = [];
									for (let i = 0; i < this.itemsAll; i++) {
										if (this.checkSelectionDuplicatesPlaylist({playlistIndex: i, bAlsoHidden: true})) {
											found.push({name: this.dataAll[i].name, category: this.dataAll[i].category});
										}
									}
									found.sort((a, b) => a.category.localeCompare(b.category));
									for (let i = 0, prevCat = null; i < found.length; i++) {
										if (prevCat !== found[i].category) {prevCat = found[i].category; found.splice(i, 0, found[i].category);}
									}
									for (let i = 0; i < found.length; i++) {
										if (found[i].name) {
											found[i] = '\t- ' + found[i].name;
										} else {
											found[i] = (found[i] || 'No category') + ':';
										}
									}
									fb.ShowPopupMessage('In case of multiple selection, a single track match will be enough\nto show a playlist. So not all results will contain all tracks.\n\nHint: Use playlist search (Ctrl + F) to find items on loaded playlists.\n\nSelected tracks found on these playlists: [Category:] - Playlist\n\n' + (found.length ? found.join('\n') : 'None.'), window.Name);
								}
								return true;
							}
							return false;
						case 'f10': // Settings / List (+ Shift)
							if (getKeyboardMask() === kMask.shift) {
								createMenuRight().btn_up(this.mx, this.my);
							} else {
								createMenuRightTop().btn_up(this.mx, this.my);
							}
							return true;
						case 'f11': // Help
							createMenuRightTop().btn_up(this.mx, this.my, void(0), 'Open documentation...')
							return true;
						case 'f12': // Tracked folder
							if (!this.bLiteMode) {_explorer(this.playlistsPath);}
							return true;
					}
				}
				switch (keyChar) {
					case 'numpad /': // Show hide columns
					case '\\':
					case 'º':
						this.uiElements['Columns'].enabled = !this.uiElements['Columns'].enabled;
						this.properties.uiElements[1] = JSON.stringify(this.uiElements);
						overwriteProperties(this.properties);
						this.updateUIElements();
						return true;
					case 'delete': // Delete playlist (delete)
						if (z !== -1) {
							this.removePlaylist(z);
							setTimeout(() => { // Required since input popup invokes move callback after this func!
								this.cacheLastPosition(Math.min(z, this.items - 1));
								this.jumpLastPosition();
								this.move(this.mx, this.my); // Update cursor
							}, 10);
							return true;
						}
						break; // Don't process when not over playlist
				}
				// Focus on search box
				if (this.searchInput && keyChar === 'e' && getKeyboardMask() === kMask.ctrl) {
					this.searchInput.check('down', this.searchInput.x + 1, this.searchInput.y + 1);
					this.searchInput.check('up', this.searchInput.x + 1, this.searchInput.y + 1);
					return true;
				}
				// Quick-search
				// Search by key according to the current sort method: it extracts the property to check against from the method name 'By + [playlist property]'
				if (showMenus['Quick-search'] && keyChar && keyChar.length === 1 && quickSearchRe.test(keyChar)) {
					if (animation.fRepaint !== null) {clearTimeout(animation.fRepaint);}
					if (isFinite(this.lastCharsPressed.ms) && Math.abs(this.lastCharsPressed.ms - Date.now()) > 600) {this.lastCharsPressed = {str: '', ms: Infinity, bDraw: false};}
					let method = this.methodState.split('\t')[0].replace('By ', '');
					if (method === 'name' || !(new oPlaylist()).hasOwnProperty(method)) {method = 'nameId';} // Fallback to name for sorting methods associated to non tracked variables
					let bNext = false;
					const bCycle = this.properties.bQuicSearchCycle[1];
					if (!this.properties.bQuicSearchNext[1]) {
						this.lastCharsPressed.str += keyChar;
					} else { // Jump to next item with same char
						if (this.lastCharsPressed.str !== keyChar) {this.lastCharsPressed.str += keyChar;} 
						else {bNext = true;}
					}
					// Helper
					const searchStr = (pls) => {
						if (pls.hasOwnProperty(method) && pls[method] !== null && pls[method] !== void(0)) {
							const bArray = isArray(pls[method]);
							if (bArray && !pls[method].length) {return false;}
							const val = bArray ? pls[method][0] : pls[method];
							if (typeof val === 'string' && val.length) {return val.toLowerCase().startsWith(this.lastCharsPressed.str);} // Fuzzy search?
							if (typeof val === 'number') {return val.toString().startsWith(this.lastCharsPressed.str);}
							else {return false;}
						} else {return false;}
					}
					// Check the current playlist is a valid result when looking for next item
					let currPlsIdx = -1;
					if (bNext && this.index !== -1) {
						const pls = this.data[this.index];
						currPlsIdx = searchStr(pls) ? this.index : -1;
					}
					// Look for pls
					const idx = this.data.findIndex((pls, idx) => {
						if (bNext && currPlsIdx >= idx) {return false;}
						return searchStr(pls);
					});
					// Find first possible item if cycling is active
					const startIdx = bNext && bCycle && idx === -1 ? this.data.findIndex((pls, idx) => {return searchStr(pls);}) : -1;
					// Highlight found item or current one if there are no more items or cycle to the first one
					this.lastCharsPressed.bDraw = true;
					this.showPlsByIdx(currPlsIdx !== -1 && idx === -1 ? bCycle ? startIdx : currPlsIdx : idx);
					this.lastCharsPressed.ms = Date.now();
				} else {
					this.lastCharsPressed = {str: '', ms: Infinity, bDraw: false};
					return false;
				}
			}
		}
	}
	
	this.listGlobalShortcuts = (bForce = false) => {
		const showMenus = JSON.parse(this.properties.showMenus[1]);
		return (this.properties.bGlobalShortcuts[1] || bForce
			? '\n- F1: lock / unlock playlist.' +
				'\n- F2: rename playlist.' +
				'\n- F3: clone in UI playlist.' +
				'\n- F4: load / jump to playlist.' +
				'\n- F5: copy playlist (with same format).' +
				(showMenus['Online sync'] ? '\n- F6: export playlist to ListenBrainz (+ Spotify).' : '\n- F6: -none-\t(disabled Online sync)') +
				'\n- F7: new playlist' + (showMenus['Folders'] ? ' or folder (+ Shift)' : '') + '.' +
				(showMenus['Category'] ? '\n- F8: cycle categories.' :  '\n- F8: -none-\t(disabled Categories)') +
				'\n- F9: search playlists with selected tracks.' +
				'\n- F10: settings menu or list menu (+ Shift).' +
				'\n- F11: documentation (pdf).' +
				(!this.bLiteMode ? '\n- F12: open playlists tracked folder.' : '\n- F12: -none-\t(disabled File tracking -lite mode-)')
			: '');
	}
	
	this.playlistMenu = (z, x, y) => {
		if (z === -1) {return;}
		this.bSelMenu = true; // Used to maintain current selection rectangle while drawing the menu
		if (this.indexes.length) {
			if (!this.indexes.includes(z)) {
				const pls = this.data[z];
				const folderRecurse = (pls) => {
					const bOpen = pls.isOpen;
					if (!bOpen) {this.switchFolder(z, false);}
					pls.pls.filter((item) => this.data.includes(item)).forEach((item) => {
						const zz = this.data.indexOf(item);
						if (zz !== -1 && !this.indexes.includes(zz)) {
							if (this.data[zz].isFolder) {folderRecurse(this.data[zz]);}
							else {this.multSelect(zz);}
						}
					});
				}
				if (pls.isFolder) {
					folderRecurse(pls);
				} else {
					this.multSelect(z);
				}
			}
			createMenuLeftMult(this.indexes).btn_up(x,y);
		} else {
			createMenuLeft(z).btn_up(x,y); // Must force index here since the mouse may move on the 500 ms delay to another pls (bug) or even out of range (crash)
		}
		this.bSelMenu = false;
	}
	
	this.contextMenu = (z, x, y) => {
		if (z === -1) {return;}
		const pls = list.data[z];
		const menu = new _menu({bInit: false});
		menu.newMenu(void(0), void(0), void(0), {type: 'handlelist', playlistIdx: plman.FindPlaylist(pls.nameId)});
		return menu.btn_up(x,y);
	}
	
	this.exportToListenbrainz = (plsArr) => {
		if (!plsArr && !isArray(plsArr)) {return Promise.resolve(false);}
		if (isArray(plsArr) && plsArr.some((pls) => pls.isFolder) || plsArr.isFolder) {
			if (plsArr.isFolder) {plsArr = plsArr.pls.filtered;}
			const expand = (pls) => {
				if (pls.isFolder) {
					return pls.pls.filtered.map(expand);
				} else {return pls;}
			};
			plsArr = plsArr.map(expand).flat(Infinity);
		}
		return checkLBToken()
			.then((result) => {
				if (!result) {return false;}
				const lb = listenBrainz;
				const bLookupMBIDs = this.properties.bLookupMBIDs[1];
				const token = this.properties.lBrainzToken[1].length > 0 ? lb.decryptToken({lBrainzToken: this.properties.lBrainzToken[1], bEncrypted: this.properties.lBrainzEncrypt[1]}) : null;
				if (!token) {return false;}
				return Promise.serial(isArray(plsArr) ? plsArr : [plsArr], async (pls, i) => {
					let bUpdateMBID = false;
					let playlist_mbid = '';
					if (pls.playlist_mbid.length) {
						console.log('Syncing playlist with ListenBrainz: ' + pls.name);
						playlist_mbid = await lb.syncPlaylist(pls, this.playlistsPath, token, bLookupMBIDs);
						if (playlist_mbid.length && pls.playlist_mbid !== playlist_mbid) {bUpdateMBID = true; fb.ShowPopupMessage('Playlist had an MBID but no playlist was found with such MBID on server.\nA new one has been created. Check console.', window.Name);}
					} else {
						console.log('Exporting playlist to ListenBrainz: ' + pls.name);
						playlist_mbid = await lb.exportPlaylist(pls, this.playlistsPath, token, bLookupMBIDs);
						if (playlist_mbid && typeof playlist_mbid === 'string' && playlist_mbid.length) {bUpdateMBID = true;} 
					}
					if (!playlist_mbid || typeof playlist_mbid !== 'string' || !playlist_mbid.length) {lb.consoleError('Playlist was not exported.'); return false;}
					if (this.properties.bSpotify[1]) {
						lb.retrieveUser(token).then((user) => lb.getUserServices(user, token)).then((services) => {
							if (services.indexOf('spotify') !== -1) {
								console.log('Exporting playlist to Spotify: ' + pls.name);
								lb.exportPlaylistToService({playlist_mbid}, 'spotify', token);
							}
						});
					}
					if (bUpdateMBID && writablePlaylistFormats.has(pls.extension)) {setPlaylist_mbid(playlist_mbid, this, pls);}
					return true;
				})
			});
	}
	
	this.search = (bFilter = true, str = this.searchInput ? this.searchInput.text : '') => {
		if (this.searchInput.text.length && this.searhHistory.indexOf(this.searchInput.text) === -1) {this.searhHistory.push(this.searchInput.text);}
		if (this.searhHistory.length > 10) {this.searhHistory.splice(10, Infinity);}
		this.searchMethod.text = this.searchMethod.bResetStartup ? '' : str;
		this.properties['searchMethod'][1] = JSON.stringify(this.searchMethod);
		overwriteProperties({searchMethod: this.properties['searchMethod']});
		if (str.length) {
			const found = [...this.dataAll].filter((pls) => {
				let rgExp;
				if (this.searchMethod.bRegExp) {
					let re, flag;
					try {
						[, re, flag] = str.match(/\/(.*)\/([a-z]+)?/);
						rgExp = re ? new RegExp(re, flag) : null;
					} catch(e) {}
				}
				if (!rgExp) {rgExp = new RegExp(escapeRegExp(str), 'gi');}
				if (this.searchMethod.bName && rgExp.test(pls.name)) {return true;}
				else if (this.searchMethod.bTags && pls.tags.some((tag) => rgExp.test(tag))) {return true;}
				else if (this.searchMethod.bCategory && rgExp.test(pls.category)) {return true;}
				else if (this.searchMethod.bPath && (pls.path.length || pls.extension === '.ui')) {
					let paths;
					if (pls.extension === '.ui') { // TODO match against meta found on M3U8 playlists...
						const idx = plman.FindPlaylist(pls.nameId);
						paths = idx !== -1 ? plman.GetPlaylistItems(idx).GetLibraryRelativePaths() : [];
					} else {
						paths = getFilePathsFromPlaylist(pls.path);
					}
					paths = paths.map((path) => path.split('\\').slice(- (this.searchMethod.pathLevel || Infinity)));
					if (paths.some((path) => path.some((s) => rgExp.test(s)))) {return true;}
				}
				return false;
			});
			if (bFilter) { // Show found playlists or blank panel
				this.filter({plsState: found.length ? found : [{}], bSkipSearch: true});
			}
			return {plsState: found.length ? found : [{}]};
		} else if (bFilter) {
			this.filter({plsState: [], bSkipSearch: true});
		}
		return {plsState: []};
	}
	
	this.multSelect = (playlistIndex = -1) => {
		if (playlistIndex === -1) {this.resetMultSelect();}
		else {
			const found = this.indexes.indexOf(playlistIndex);
			if (found !== -1) {this.indexes.splice(found, 1);}
			else {this.indexes.push(playlistIndex);}
		}
		return this.indexes;
	}
	
	this.multSelectRange = (playlistIndex = -1) => {
		if (playlistIndex === -1) {this.resetMultSelect();}
		else {
			const found = this.indexes.indexOf(playlistIndex);
			if (found !== -1) {
				const start = this.indexes.slice(-1)[0];
				const idxArr = range(start, playlistIndex, start > playlistIndex ? -1 : 1);
				this.indexes.splice(0, Infinity);
				Array.prototype.push.apply(this.indexes, idxArr);
			} else {
				const start = this.indexes.slice(-1)[0] || 0;
				const idxArr = range(start, playlistIndex, start > playlistIndex ? -1 : 1);
				idxArr.forEach((idx) => {
					if (!this.indexes.includes(idx)) {this.indexes.push(idx);}
				});
			}
		}
		return this.indexes;
	}
	
	this.resetMultSelect = () => {
		this.indexes = [];
		return this.indexes;
	}
	
	this.multSelectAll = () => {
		if (this.indexes.length) {this.resetMultSelect();}
		else {this.indexes = range(0, this.data.length - 1, 1);}
	}
	
	this.executeAction = (z, x, y, shortcut, bMultiple = !!this.indexes.length) => {
		const pls = typeof z !== 'undefined' && z !== -1 ? this.data[z] : null;
		if (pls && pls.isFolder) { // Folder
			const singleActions = new Set(['Manage playlist']);
			const ignoreActions = new Set(['Playlist\'s items menu']);
			const openActions = new Set(['Multiple selection']);
			if (ignoreActions.has(shortcut.key)) {return;}
			else if (singleActions.has(shortcut.key)) {
				if (shortcut.func === this.playlistMenu || shortcut.func === this.contextMenu) {shortcut.func(z, x, y);}
				else {shortcut.func(z);}
			} else {
				let bOpen = pls.isOpen;
				if (shortcut.key === 'Multiple selection' && this.indexes.includes(z)) { // Deselect folder or select/deselect all items within
					shortcut.func(z);
				} else {
					let bEverySelected = false;
					const folderRecurse = (pls, idx) => {
						const bOpen = pls.isOpen;
						if (pls.isFolder && !bOpen) {this.switchFolder(idx, false);}
						if (!bEverySelected) {
							bEverySelected = pls.pls.filtered.every((item) => {
								return this.indexes.includes(this.data.indexOf(item));
							});
						}
						pls.pls.filtered.forEach((item) => {
							const zz = this.data.indexOf(item); 
							if ((item.isAutoPlaylist || item.query) && shortcut.key === 'Clone playlist in UI') {
								const remDupl = (item.isAutoPlaylist && this.bRemoveDuplicatesAutoPls) || (item.extension === '.xsp' && this.bRemoveDuplicatesSmartPls) ? this.removeDuplicatesAutoPls : [];
								shortcut.func(zz, remDupl, this.bAdvTitle);
							} else {
								if (this.data[zz].isFolder) {
									if (shortcut.key === 'Multiple selection' && this.indexes.includes(zz)) {shortcut.func(zz);}
									folderRecurse(this.data[zz], zz);
								} else {
									if (shortcut.key === 'Multiple selection') {
										if (!this.indexes.includes(zz)) {
											shortcut.func(zz);
										} else if (bEverySelected) {
											shortcut.func(zz);
										}
									} else {shortcut.func(zz);}
								}
							}
						});
						if (pls.isFolder && !bOpen && !openActions.has(shortcut.key)) {this.switchFolder(idx, false);}
					}
					folderRecurse(pls, z);
				}
			}
		} else if (bMultiple) { // Multiple selection
			const singleActions = new Set(['Multiple selection', 'Multiple selection (range)', 'Manage playlist']);
			const ignoreActions = new Set(['Playlist\'s items menu']);
			if (ignoreActions.has(shortcut.key)) {return;}
			else if (singleActions.has(shortcut.key)) {this.executeAction(z, x, y, shortcut, false);}
			else {
				this.indexes.forEach((zz) => {
					const pls = typeof zz !== 'undefined' && zz !== -1 ? this.data[zz] : null;
					if (pls && (pls.isAutoPlaylist || pls.query) && shortcut.key === 'Clone playlist in UI') {
						const remDupl = (pls.isAutoPlaylist && this.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && this.bRemoveDuplicatesSmartPls) ? this.removeDuplicatesAutoPls : [];
						shortcut.func(zz, remDupl, this.bAdvTitle);
					} else {
						shortcut.func(zz);
					}
				});
			}
		} else if (pls) { // Single playlist
			if ((pls.isAutoPlaylist || pls.query) && shortcut.key === 'Clone playlist in UI') {
				const remDupl = (pls.isAutoPlaylist && this.bRemoveDuplicatesAutoPls) || (pls.extension === '.xsp' && this.bRemoveDuplicatesSmartPls) ? this.removeDuplicatesAutoPls : [];
				shortcut.func(z, remDupl, this.bAdvTitle);
			} else {
				if (shortcut.func === this.playlistMenu || shortcut.func === this.contextMenu) {shortcut.func(z, x, y);}
				else {shortcut.func(z);}
			}
		} else { // Header
			if (shortcut.func === this.playlistMenu || shortcut.func === this.contextMenu) {shortcut.func(-1, x, y);}
			else {shortcut.func(-1);}
		}
	}
	
	this.getDefaultShortcuts = (mouseBtn = 'L', element = 'LIST') => {
		const shortcuts = {options: null, actions: null};
		switch (mouseBtn.toUpperCase()) {
			case 'L': {
				shortcuts.options = [
					{key: 'Ctrl',			mask: MK_CONTROL},
					{key: 'Shift',			mask: MK_SHIFT},
					{key: 'Ctrl + Shift',	mask: MK_SHIFT + MK_CONTROL},
					element.toUpperCase() === 'HEADER' 
						? {key: 'Single Click',	mask: 'SG_CLICK'} 
						: void(0),
					{key: 'Single Click',	mask: 'SG_CLICK'},
					{key: 'Double Click',	mask: 'DB_CLICK'}
				].filter(Boolean);
				break;
			}
			case 'M': {
				shortcuts.options = [
					{key: 'Ctrl',			mask: MK_CONTROL},
					{key: 'Shift',			mask: MK_SHIFT},
					{key: 'Ctrl + Shift',	mask: MK_SHIFT + MK_CONTROL},
					{key: 'Single Click',	mask: 'SG_CLICK'}
				];
				break;
			}
			case 'R': {
				shortcuts.options = [
					{key: 'Ctrl',			mask: MK_CONTROL},
					{key: 'Shift',			mask: MK_SHIFT},
					{key: 'Ctrl + Shift',	mask: MK_SHIFT + MK_CONTROL},
					{key: 'Single Click',	mask: 'SG_CLICK'}
				];
				break;
			}
		}
		if (shortcuts.options) { // Are shared for all mouse clicks
			switch (element.toUpperCase()) {
				case 'LIST': {
					shortcuts.actions = [
						{key: '- None -',					func: () => {void(0);}},
						{key: 'Manage playlist',			func: this.playlistMenu},
						{key: 'Playlist\'s items menu',		func: this.contextMenu},
						{key: 'Load / show playlist',		func: this.loadPlaylistOrShow},
						{key: 'Copy selection to playlist',	func: null}, // Processed at lbtn_up
						{key: 'Move selection to playlist',	func: null}, // Processed at lbtn_up
						{key: 'Clone playlist in UI',		func: clonePlaylistInUI.bind(this, this)},
						{key: 'Recycle playlist',			func: this.removePlaylist},
						{key: 'Lock/unlock playlist file',	func: switchLock.bind(this, this)},
						{key: 'Lock/unlock UI playlist',	func: switchLockUI.bind(this, this)},
						{key: 'Multiple selection',			func: this.multSelect},
						{key: 'Multiple selection (range)',	func: this.multSelectRange}
					];
					break;
				}
				case 'HEADER': {
					shortcuts.actions = [
						{key: '- None -',							func: () => {void(0);}},
						{key: 'Show current / playing playlist',	func: () => {this.showCurrPls() || this.showCurrPls({bPlayingPls: true});}},
						{key: 'Multiple selection (all)',			func: this.multSelectAll},
						{key: 'Cycle categories',					func: cycleCategories.bind(this, this)},
						{key: 'Cycle tags',							func: cycleTags.bind(this, this)},
						{key: 'Add new empty playlist file',		func: () => {this.add({bEmpty: true});}},
						{key: 'Add active playlist',				func: () => {this.add({bEmpty: false});}},
						{key: 'Manual refresh',						func: this.manualRefresh},
						{key: 'Manual saving (all not locked)',		func: () => {console.log('Playlist Manager: Updated ' + this.updateAll(false) + ' playlists.');}},
						{key: 'Manual saving (all)',				func: () => {console.log('Playlist Manager: Updated ' + this.updateAll(true) + ' playlists.');}},
					];
					break;
				}
			}
		}
		return shortcuts;
	}
	
	this.getDefaultShortcutAction = (mouseBtn = 'L', element = 'LIST') => {
		const shortcuts = this.getDefaultShortcuts(mouseBtn);
		return shortcuts.actions ? shortcuts.actions[0].key : '';
	}
	
	this.getShortcuts = (mouseBtn = 'L', element = 'LIST') => {
		const shortcuts = {};
		const {options, actions} = this.getDefaultShortcuts(mouseBtn, element);
		let prop;
		switch (mouseBtn.toUpperCase() + '-' + element.toUpperCase()) {
			case 'M-LIST': {prop = this.mShortcuts; break;}
			case 'L-LIST': {prop = this.lShortcuts; break;}
			case 'R-LIST': {prop = this.rShortcuts; break;}
			case 'M-HEADER': {prop = this.mShortcutsHeader; break;}
			case 'L-HEADER': {prop = this.lShortcutsHeader; break;}
		}
		if (prop) {
			for (let key in prop) {
				const mask = (options.find((obj) => {return obj.key === key;}) || {}).mask || 'none';
				const action = prop[key];
				const func = (actions.find((obj) => {return obj.key === action;}) || {}).func || (() => {console.popup('Shortcut not properly set: ' + mouseBtn + ' ' + key + ' --> ' + action, window.Name);});
				shortcuts[mask] = {key: action, func};
			}
		}
		return shortcuts;
	}
	
	// Drag n drop
	this.isFolderInView = () => {
		return this.data.some((pls) => pls.isFolder);
	}
	
	this.isInternalDrop = () => {
		return this.internalPlsDrop.length && (this.methodState === this.manualMethodState() || this.isFolderInView());
	}
	
	this.isInternalDropValid = () => {
		const currSelIdx = typeof this.index !== 'undefined' && (this.index !== -1 || !this.bSelMenu) ? this.index : (this.bSelMenu ? currentItemIndex : -1);
		const currSelOffset = typeof this.index !== 'undefined' && (this.index !== -1 || !this.bSelMenu) ? this.offset : (this.bSelMenu ? this.lastOffset : 0);
		const bValidPos = typeof currSelIdx !== 'undefined' && typeof this.data[currSelIdx] !== 'undefined' &&  (currSelIdx - currSelOffset) >= 0 && (currSelIdx - currSelOffset) < this.rows;
		if (this.methodState === this.manualMethodState()) {
			return bValidPos;
		} else if (bValidPos) {
			const bToFolder = this.data[currSelIdx].isFolder;
			const bFolder = bToFolder || this.internalPlsDrop.some((idx) => this.isInFolder(this.data[idx])) && !this.internalPlsDrop.every((idx) => this.data[idx].inFolder === this.data[currSelIdx].inFolder);
			let level = bToFolder ? 1 : 0;
			let i = currSelIdx;
			while (this.data[i].inFolder) {
				i = this.data.findIndex((item) => item.nameId === this.data[i].inFolder && item.isFolder);
				level++;
			}
			const bMaxLevel = level <= this.folders.maxDeep;
			const bToSameFolder = currSelIdx !== -1 
				? this.internalPlsDrop.every((idx) => {
					return bToFolder && this.data[idx].inFolder === this.data[currSelIdx].nameId || !bToFolder && this.data[idx].inFolder === this.data[currSelIdx].inFolder;
				})
				: false;
			return bFolder && bMaxLevel && !bToSameFolder;
		}
	}
	
	this.onDragDrop = () => {
		if (_isFile(null)) { // Sends files (playlists) to tracked folder
			return true;
		}
		if (this.index !== -1 && this.inRange) { // Sends tracks to playlist file directly
			this.addTracksToPlaylist({playlistIndex: this.index, handleList});
			return true;
		}
		return false;
	}
	
	this.addPlaylistsToFolder = (filePath) => { // Sends tracks to playlist file directly
		if (isArrayStrings(filePath)) {
			let bDone = false;
			const filePathLength = filePath.length;
			for (i = 0; i < filePathLength; i++) {
				if (!_isFile(filePath[i])) {
					console.log('Playlist Manager: Error adding items to tracked folder. Path not found.\n' + filePath[i]);
					return false;
				} else {
					const arr = utils.SplitFilePath(path);
					const fileName = (arr[1].endsWith(arr[2])) ? arr[1] : arr[1] + arr[2]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
					bDone = _renameFile(filePath[i], playlistsPathDirName + fileName);
				}
				if (!bDone) {
					console.log('Playlist Manager: Error while moving item to tracked folder.\n' + filePath[i]);
					return false;
				}
			}
			console.log('Playlist Manager: Drag n drop done.');
			this.update(void(0), true);
			this.filter();
			return true;
		}
		return false;
	}
	
	this.checkSelectionDuplicatesPlaylist = ({playlistIndex, pls = null, bAlsoHidden = false} = {}) => {
		if (typeof playlistIndex !== 'undefined' && playlistIndex !== null ) {
			if (playlistIndex < 0 || (!bAlsoHidden && playlistIndex >= this.items) || (bAlsoHidden && playlistIndex >= this.itemsAll)) {
				console.log('Playlist Manager: Error checking duplicates. Index '+ _p(playlistIndex) + ' out of bounds. (checkSelectionDuplicatesPlaylist)');
				return false;
			}
			pls = bAlsoHidden ? this.dataAll[playlistIndex] : this.data[playlistIndex];
		} else if (!pls) {
			console.log('Playlist Manager: Error checking duplicates. Index or playlist not provided. (checkSelectionDuplicatesPlaylist)');
			return false;
		}
		let bDup = false;
		if (pls.isFolder) { // Only check allowed destinations
			bDup = pls.pls.filter((item) => !item.isAutoPlaylist && !item.query && item.extension !== '.fpl' && (bAlsoHidden || this.data.includes(item)))
				.map((item) => this.checkSelectionDuplicatesPlaylist({pls: item}))
				.flat(Infinity)
				.every((result) => result === true);
		} else {
			if (!pls.isAutoPlaylist && !pls.query && pls.extension !== '.fpl' && !pls.isFolder && pls.size) {
				const selItems = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
				if (selItems && selItems.Count) {
					const filePaths = pls.extension !== '.ui' ? new Set(getFilePathsFromPlaylist(pls.path)) : new Set(fb.TitleFormat('%path%').EvalWithMetadbs(getHandleFromUIPlaylists([pls.nameId])));
					const selItemsPaths = fb.TitleFormat('%path%').EvalWithMetadbs(selItems);
					if (filePaths.intersectionSize(new Set(selItemsPaths))) {
						if (this.bForbidDuplicates) {this.selPaths = {sel: selItemsPaths};}
						bDup = true;
					} else {
						const relPathSplit = this.playlistsPath.length ? this.playlistsPath.split('\\').filter(Boolean) : null;
						const selItemsRelPaths = selItemsPaths.map((path) => {return path.replace(this.playlistsPath, '.\\');});
						const selItemsRelPathsTwo = selItemsPaths.map((path) => {return path.replace(this.playlistsPath, '');});
						const selItemsRelPathsThree = selItemsPaths.map((path) => {return getRelPath(path, relPathSplit);});
						if (filePaths.intersectionSize(new Set(selItemsRelPaths))) {
							if (this.bForbidDuplicates) {this.selPaths = {sel: selItemsRelPaths};}
							bDup = true;
						} else if (filePaths.intersectionSize(new Set(selItemsRelPathsTwo))) {
							if (this.bForbidDuplicates) {this.selPaths =  {sel: selItemsRelPathsTwo};}
							bDup = true;
						} else if (filePaths.intersectionSize(new Set(selItemsRelPathsThree))) {
							if (this.bForbidDuplicates) {this.selPaths =  {sel: selItemsRelPathsThree};}
							bDup = true;
						}
					}
					if (bDup) {
						if (this.bForbidDuplicates) {this.selPaths.pls = filePaths;}
					} else {this.clearSelPlaylistCache();}
				}
			}
		}
		return bDup;
	}
	
	this.plsNameFromSelection = (idx) => {
		const selItems = plman.GetPlaylistSelectedItems(idx);
		if (selItems && selItems.Count > 0) {
			const tags = getTagsValuesV4(selItems, ['ALBUM ARTIST', 'ALBUM']);
			const [artists, albums] = tags;
			let [bMultArtists, bMultAlbums] = [false, false];
			let artistName = artists[0][0];
			for (let i = 0; i < artists.length; i++) {
				if (!bMultArtists && artistName !== artists[i][0]) { 
					bMultArtists = true; 
					artistName = 'Various Artists';
					break;
				}
			}
			let albumName = albums[0][0];
			for (let i = 0; i < albums.length; i++) {
				if (!bMultAlbums && albumName !== albums[i][0]) { 
					bMultAlbums = true; 
					albumName = '';
					break;
				}
			}
			return bMultAlbums ? artistName : artistName + ' - ' + albumName;
		}
		return 'Empty playlist';
	}
	
	this.sendSelectionToPlaylist = ({playlistIndex, pls = null, bCheckDup = false, bAlsoHidden = false, bPaint = true, bDelSource = false} = {}) => {
		if (typeof playlistIndex !== 'undefined' && playlistIndex !== null ) {
			if (playlistIndex < 0 || (!bAlsoHidden && playlistIndex >= this.items) || (bAlsoHidden && playlistIndex >= this.itemsAll)) {
				console.log('Playlist Manager: Error adding tracks to playlist. Index '+ _p(playlistIndex) + ' out of bounds. (sendSelectionToPlaylist)');
				return false;
			}
			pls = bAlsoHidden ? this.dataAll[playlistIndex] : this.data[playlistIndex];
		} else if (!pls) {
			console.log('Playlist Manager: Error checking duplicates. Index or playlist not provided. (sendSelectionToPlaylist)');
			return false;
		}
		if (plman.ActivePlaylist === -1) {return false;}
		if (pls.isFolder) { // Only check allowed destinations
			const plsArr = pls.pls.filtered.filter((item) => !item.isAutoPlaylist && !item.query && !item.isLocked && item.extension !== '.fpl');
			const total = plsArr.length;
			return plsArr.map((item, i) => this.sendSelectionToPlaylist({pls: item, bCheckDup, bPaint: bPaint && total === (i + 1) ? true : false, bDelSource: bDelSource && total === (i + 1) ? true : false, bAlsoHidden: true}))
				.flat(Infinity)
				.some((result) => result === true);
		} else {
			if (pls.isAutoPlaylist || pls.isLocked || pls.extension === '.fpl' || pls.query) {return false;} // Skip non writable playlists
			let selItems = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
			if (selItems && selItems.Count) {
				if (bCheckDup) {this.checkSelectionDuplicatesPlaylist({playlistIndex, pls, bAlsoHidden});}
				// Remove duplicates
				if (this.bForbidDuplicates && this.selPaths.sel.length && this.selPaths.pls.size) { // Checked before at move()
					const selPathsSet = new Set();
					const toRemove = new Set();
					this.selPaths.sel.forEach((path, idx) => {
						if (this.selPaths.pls.has(path)) {toRemove.add(idx);} // Remove items already on pls
						else {
							if (!selPathsSet.has(path)) {selPathsSet.add(path);}
							else {toRemove.add(idx);} // And duplicated items on selection
						}
					});
					if (toRemove.size) {
						selItems = selItems.Convert().filter((_, idx) => {return !toRemove.has(idx);});
						selItems = new FbMetadbHandleList(selItems);
						// Warn about duplication
						if (!selItems.Count) {console.log('Playlist Manager: No tracks added, all are duplicated.');}
						else {console.log('Playlist Manager: Skipped duplicated tracks.');}
					}
				}
				if (selItems && selItems.Count) {
					// Warn about dead items
					selItems.Convert().some((handle, i) => {
						if (!_isLink(handle.Path) && !_isFile(handle.Path)) {
							fb.ShowPopupMessage('Warning! There is at least one dead item among the tracks on current selection, there may be more.\n\n(' + i + ') ' + handle.RawPath, window.Name); 
							return true;
						}
						return false;
					});
					// Add to pls
					this.addTracksToPlaylist({playlistIndex, pls, handleList: selItems, bAlsoHidden, bPaint});
					const index = plman.FindPlaylist(pls.nameId);
					// Add items to chosen playlist too if it's loaded within foobar2000 unless it's the current playlist
					if (index !== -1 && plman.ActivePlaylist !== index) {
						plman.UndoBackup(index);
						plman.InsertPlaylistItems(index, plman.PlaylistItemCount(index), selItems);
						const idx = this.dataAll.findIndex((item) => item.nameId === pls.nameId && item.extension === pls.extension);
						pls = this.dataAll[idx]; // Old object is not available anymore
						// Edit again data since update did not catch the change
						if (pls.extension === '.ui') {
							this.editData(pls, {
								size: pls.size + selItems.Count,
								duration: (pls.duration !== - 1 ? pls.duration + selItems.CalcTotalDuration() : plman.GetPlaylistSelectedItems(plman.ActivePlaylist).CalcTotalDuration()),
								modified: Date.now(),
							});
						}
					}
					// Remove items when moving
					if (bDelSource) {
						plman.UndoBackup(plman.ActivePlaylist); 
						plman.RemovePlaylistSelection(plman.ActivePlaylist);
						const sourcePls = (bAlsoHidden ? this.dataAll : this.data)
							.find((pls, idx) => {return pls.nameId === plman.GetPlaylistName(plman.ActivePlaylist);});
						if (pls !== sourcePls) {
							this.editData(sourcePls, {
								size: sourcePls.size + selItems.Count,
								duration: (sourcePls.duration !== - 1 ? sourcePls.duration - selItems.CalcTotalDuration() : selItems.CalcTotalDuration()),
								modified: Date.now(),
							});
						}
					}
					return true;
				}
			}
		}
		return false;
	}
	
	this.clearSelPlaylistCache = () => {
		this.selPaths = {pls: new Set(), sel: []};
	}
	
	this.addTracksToPlaylist = ({playlistIndex, pls = null, handleList, bAlsoHidden = false, bPaint = true} = {}) => { // Sends tracks to playlist file directly
		if (typeof playlistIndex !== 'undefined' && playlistIndex !== null ) {
			if (playlistIndex < 0 || (!bAlsoHidden && playlistIndex >= this.items) || (bAlsoHidden && playlistIndex >= this.itemsAll)) {
				console.log('Playlist Manager: Error adding tracks to playlist. Index '+ _p(playlistIndex) + ' out of bounds. (addTracksToPlaylist)');
				return false;
			}
			pls = bAlsoHidden ? this.dataAll[playlistIndex] : this.data[playlistIndex];
		} else if (!pls) {
			console.log('Playlist Manager: Error checking duplicates. Index or playlist not provided. (addTracksToPlaylist)');
			return false;
		}
		if (typeof handleList === 'undefined' || handleList === null || handleList.Count === 0) {
				console.log('Playlist Manager: Error adding tracks to playlist. Handle list has no tracks. (addTracksToPlaylist)');
			return false;
		}
		if (pls.isLocked) { // Skip locked playlists
			console.log('Playlist Manager: Skipping save on locked playlist.');
			return false;
		}
		console.log('Playlist Manager: Updating playlist... ' + pls.name);
		const [handleUpdate, tagsUpdate] = this.bAutoTrackTag ? this.getUpdateTrackTags(handleList, pls) : [null, null]; // Done at 2 steps, first get tags
		const playlistPath = pls.path;
		const bUI = pls.extension === '.ui';
		const backPath = playlistPath + '.back';
		if (pls.extension === '.m3u' || pls.extension === '.m3u8' || pls.extension === '.xspf') {_copyFile(playlistPath, backPath);}
		let done = bUI ? true : addHandleToPlaylist(handleList, playlistPath, (this.bRelativePath ? this.playlistsPath : ''), this.bBOM);
		if (!done) {
			fb.ShowPopupMessage(
				'Playlist generation failed while writing file:\n' + playlistPath + 
				'\n\nTrace:' + 
				'\nadd' + _p({playlistIndex, handleList, bAlsoHidden, bPaint}.toStr()) +
				'\n\naddHandleToPlaylist' + _p({handleList, playlistPath, relativePath: (this.bRelativePath ? this.playlistsPath : ''), bBOM: this.bBOM}.toStr())
			, window.Name);
			_renameFile(backPath, playlistPath); // Restore backup in case something goes wrong
			return false;
		} else if (_isFile(backPath)) {_deleteFile(backPath);}
		// If done, then we repaint later. Now we manually update the data changes... only one playlist length and/or playlist file size can change here
		pls = this.dataAll.find((item) => item.nameId === pls.nameId && item.extension === pls.extension);
		this.editData(pls, {
			size: pls.size + handleList.Count,
			duration: (pls.duration !== - 1 ? pls.duration + handleList.CalcTotalDuration() : handleList.CalcTotalDuration()),
			fileSize: bUI ? 0 : utils.GetFileSize(done), // done points to new path, note playlist extension is not always = 'playlistPath
			modified: Date.now(),
		});
		if (this.bAutoTrackTag) {this.updateTrackTags(handleUpdate, tagsUpdate);} // Apply tags from before
		console.log('Playlist Manager: drag n drop done.');
		this.lastPlsLoaded.push(pls);
		this.update(true, true); // We have already updated data before only for the variables changed
		if (bPaint) {this.filter();}
		return true;
	}
	
	this.getUpdateTrackTags = (handleList, pls) => { // Add tags to tracks according to playlist, only applied once per track. i.e. adding multiple copies will not add multiple times the tag
		if (!pls.hasOwnProperty('trackTags') || !pls.trackTags || !pls.trackTags.length || !handleList || !handleList.Count) {return [new FbMetadbHandleList(), []];}
		// const oldHandles = pls.path && !pls.isAutoPlaylist ? getHandlesFromPlaylist(pls.path, this.playlistsPath) : null;
		const newHandles = handleList.Clone();
		newHandles.Sort();
		// if (oldHandles) {
			// oldHandles.Sort();
			// newHandles.Sort();
			// newHandles.MakeDifference(oldHandles);
		// }
		let tagsArr = [];
		const newHandlesNoTags = new FbMetadbHandleList();
		if (newHandles.Count) {
			console.log('Playlist Manager: Auto-tagging enabled, retrieving tags for new tracks...');
			for (let i = 0; i < newHandles.Count; ++i) {
				let tags = {};
				pls.trackTags.forEach((tagObj) => { // TODO: Don't rewrite tags but add?
					const name = Object.keys(tagObj)[0];
					const expression = tagObj[name];
					let bFunc = false, bOverWrite = false, bMultiple = false;
					let value = null;
					if (typeof expression === 'number') {value = [expression.toString()];}
					else if (expression.indexOf('$') !== -1) { // TF
						try {value = fb.TitleFormat(expression).EvalWithMetadb(newHandles[i]).split(', ');}
						catch (e) {fb.ShowPopupMessage('TF expression is not valid:\n' + expression, window.Name);}
					} else if (expression.indexOf('%') !== -1) { // Tag remapping
						try {value = fb.TitleFormat(expression).EvalWithMetadb(newHandles[i]).split(', ');}
						catch (e) {fb.ShowPopupMessage('TF expression is not valid:\n' + expression, window.Name);}
					} else if (expression.indexOf('JS:') !== -1) { // JS expression by function name at 'helpers_xxx_utils.js'
						bFunc = true;
						let funcName = expression.replace('JS:', '');
						if (funcDict.hasOwnProperty(funcName)) {
							try {({value, bOverWrite, bMultiple} = funcDict[funcName](pls));}
							catch (e) {fb.ShowPopupMessage('JS expression failed:\n' + funcName, window.Name);}
						} else {fb.ShowPopupMessage('JS function not found at \'helpers_xxx_utils.js\':\n' + funcName, window.Name);}
					} else if (expression.indexOf(',') !== -1) { // Array (list sep by comma)
						value = expression.split(',');
						value = value.map((_) => {return _.trim();});
					} else {value = [expression];} // Strings, etc.
					if (value) { // Append to current tags
						const currVal = getTagsValues(newHandles[i], [name], true);
						if (currVal && currVal.length) {
							let newVal = currVal;
							if (bFunc) {
								if (!bMultiple && !bOverWrite) {return;}
								if (bOverWrite) {tags[name] = value.length ? value : [''];}
								else if (bMultiple && value.length && !isArrayEqual(currVal, value)) {newVal = [...new Set([...currVal, ...value])];} // Don't duplicate values
							} else {
								if (!value.length) {newVal = [''];} // Delete
								else if (!isArrayEqual(currVal, value)) {newVal = [...new Set([...currVal, ...value])];} // Don't duplicate values
							}
							// Double check there are changes
							if (!isArrayEqual(currVal, newVal)) {tags[name] = newVal;}
						} else if (value.length) {tags[name] = value;}
					}
				});
				if (Object.keys(tags).length) {tagsArr.push(tags);} //Tags with no values may produce holes in the list compared against the handles
				else {newHandlesNoTags.Add(newHandles[i]);} // So they must be checked later
			}
			if (!tagsArr.length) {console.log('Playlist Manager: no tags will be added...');}
			newHandles.MakeDifference(newHandlesNoTags); // Remove tracks that will not be tagged
		}
		return [newHandles, tagsArr];
	}
	
	this.updateTrackTags = (handleList, tagsArr) => { // Need to do it in 2 steps to only apply the changes after the playlist file have been updated successfully
		if (!handleList || !handleList.Count || !tagsArr || !tagsArr.length) {return false;}
		console.log('Playlist Manager: Auto-tagging tracks...');
		if (handleList.Count !== tagsArr.length) {console.log('Playlist Manager: Auto tagging failed due to size mismatch between handle list and tags array.'); return false;}
		handleList.UpdateFileInfoFromJSON(JSON.stringify(tagsArr));
		return true;
	}
	
	this.updatePlaylistOnlyTracks = (playlistIndex) => { // Skips saving to file
		if (!this.bAutoTrackTag) {return;}
		if (typeof playlistIndex === 'undefined' || playlistIndex === null || playlistIndex === -1) {return;}
		if (playlistIndex >= plman.PlaylistCount) {return;} //May have deleted a playlist before delaying the update... so there is nothing to update
		if (arePlaylistNamesDuplicated()) { // Force no duplicate names on foobar2000 playlists when auto-saving...	
			const plmanDuplicates = findPlaylistNamesDuplicated();
			let duplicates = [];
			this.dataAll.forEach((item) => { // But only if those names are being used by playlist at the manager
				const idx = plmanDuplicates.indexOf(item.nameId);
				if (idx !== -1 && item.extension !== '.ui') {duplicates.push(item.nameId);}
			});
			if (duplicates.length) {
				fb.ShowPopupMessage('Check playlists loaded, duplicated names are not allowed when using auto-saving:\n\n' + duplicates.join(', '), window.Name);
				return;
			}
		}
		const numPlaylist = this.itemsAll;
		const playlistNameId = plman.GetPlaylistName(playlistIndex);
		const playlistName = removeIdFromStr(playlistNameId);
		for (let i = 0; i < numPlaylist; i++) {
			const i_pnameId = this.dataAll[i].nameId;
			const dataIndex = i; // This one always point to the index of data
			const fbPlaylistIndex = playlistIndex; // And this one to fb playlists...
			if (playlistNameId === i_pnameId) {
				this.updateTags(plman.GetPlaylistItems(fbPlaylistIndex), this.dataAll[i]);
				return;
			}
		}
	}
	
	this.updateTags = (handleList, pls) => {
		if (!this.bAutoTrackTag) {return false;}
		if (pls.isAutoPlaylist || pls.query) {
			if (this.bAutoTrackTagAutoPls) {
				const [handleUpdate, tagsUpdate] = this.getUpdateTrackTags(handleList, pls);
				return this.updateTrackTags(handleUpdate, tagsUpdate);
			}
		} else {
			if ((pls.isLocked && this.bAutoTrackTagLockPls) || (!pls.isLocked && this.bAutoTrackTagPls)) {
				const [handleUpdate, tagsUpdate] = this.getUpdateTrackTags(handleList, pls);
				return this.updateTrackTags(handleUpdate, tagsUpdate);
			}
		}
		return false;
	}
	
	this.updatePlaylistFpl = (playlistIndex) => { // Workaround for .fpl playlist limitations...
		const numPlaylist = this.items;
		const playlistNameId = plman.GetPlaylistName(playlistIndex);
		for (let i = 0; i < numPlaylist; i++) {
			const i_pnameId = this.data[i].nameId;
			const dataIndex = i;
			const fbPlaylistIndex = playlistIndex;
			if (playlistNameId === i_pnameId) {
				console.log('Playlist Manager: Updating fpl playlist...');
				this.editData(this.data[dataIndex], {
					size: plman.PlaylistItemCount(fbPlaylistIndex),
				});
				console.log('Playlist Manager: done.');
				this.update(true, true); // We have already updated data before only for the variables changed
				this.filter();
				break;
			}
        }
	}
	
	this.updateAll = (bForceLocked = false) => {
		const current = getPlaylistNames();
		let count = 0;
		this.dataAll.forEach((pls, playlistIndex) => {
			if (pls.isLocked && !bForceLocked || pls.extension === '.ui' || pls.isAutoPlaylist || pls.query) {return;}
			if (pls.extension === '.xspf' && this.playlistsExtension !== pls.extension) {return;} // Don't save XSPF playlists unless format will not be changed
			if (current.findIndex((uiPls) => uiPls.name === pls.nameId) !== -1) { // There may be other checks later, but at least omit these ones...
				if (this.updatePlaylist({playlistIndex, bCallback: false, bForceLocked})) {count++;}
			}
		});
		return count;
	}
	
	this.updatePlaylist = ({playlistIndex, bCallback = false, bForceLocked = false} = {}) => { // Only changes total size
		// playlistIndex: We have a foobar2000 playlist and we iterate over playlist files
		// Or we have the playlist file and we iterate over foobar2000 playlists
		if (typeof playlistIndex === 'undefined' || playlistIndex === null || playlistIndex === -1) {return false;}
		if (bCallback) {
			if (playlistIndex >= plman.PlaylistCount) {return false;} //May have deleted a playlist before delaying the update... so there is nothing to update
			if (plman.IsAutoPlaylist(playlistIndex)) {return false;} // Always skip updates for AutoPlaylists
			if (this.lastPlsLoaded.length) { // skip auto-update for the last loaded playlists
				const nameId = plman.GetPlaylistName(playlistIndex);
				const idx = this.lastPlsLoaded.findIndex((pls) => {return nameId === pls.nameId;});
				if (idx !== -1) {
					const pls = this.lastPlsLoaded.splice(idx, 1)[0]; // Remove from list
					if (pls.isAutoPlaylist || pls.query) {return false;} // Always skip updates for AutoPlaylists
					else if (pls.extension === '.ui') {return false;} // Always skip updates for ui only playlists
					else if (pls.size === plman.PlaylistItemCount(playlistIndex)) {return false;} // And skip update if no change was made (omits reordering before autosave fires!)
				}
			}
			if (arePlaylistNamesDuplicated()) { // Force no duplicate names on foobar2000 playlists when auto-saving...	
				const plmanDuplicates = findPlaylistNamesDuplicated();
				let duplicates = [];
				this.dataAll.forEach((item) => { // But only if those names are being used by playlist at the manager
					if (!item.isAutoPlaylist && !item.query) {
						const idx = plmanDuplicates.indexOf(item.nameId);
						if (idx !== -1 && item.extension !== '.ui') {duplicates.push(item.nameId);}
					}
				});
				if (duplicates.length) {
					fb.ShowPopupMessage('Check playlists loaded, duplicated names are not allowed when using auto-saving:\n\n' + duplicates.join(', '), window.Name);
					return false;
				}
			}
		} 
		else if (this.data[playlistIndex].isAutoPlaylist || this.data[playlistIndex].query) {return false;} // Always skip updates for AutoPlaylists
		else if (this.data[playlistIndex].extension === '.ui') {return false;} // Always skip updates for ui only playlists
		// TODO: Allow linking an AutoPlaylist to a file and convert it to standard playlist on saving (?)
		const numPlaylist = (bCallback) ? this.itemsAll : plman.PlaylistCount;
		const playlistNameId = (bCallback) ? plman.GetPlaylistName(playlistIndex) : this.data[playlistIndex].nameId;
		const playlistName = removeIdFromStr(playlistNameId);
		for (let i = 0; i < numPlaylist; i++) {
			const i_pnameId = (bCallback) ? this.dataAll[i].nameId : plman.GetPlaylistName(i);
			const dataIndex = (bCallback) ? i : playlistIndex; // This one always point to the index of data
			const fbPlaylistIndex = (bCallback) ? playlistIndex : i; // And this one to fb playlists... according to bCallback
			if (playlistNameId === i_pnameId) {
				const plsData = (bCallback) ? this.dataAll[dataIndex] : this.data[dataIndex]; // All playlist or only current view
				if (plsData.isLocked) {
					if (this.bAutoTrackTag && this.bAutoTrackTagLockPls && (debouncedUpdate || !bCallback)) {
						const [handleUpdate, tagsUpdate] = this.getUpdateTrackTags(plman.GetPlaylistItems(fbPlaylistIndex), plsData); // Done at 2 steps, first get tags
						this.updateTrackTags(handleUpdate, tagsUpdate);
					} // Apply tags from before
					if (!bForceLocked) {return false;} // Skips locked playlists usually for auto-saving!
				}
				const [handleUpdate, tagsUpdate] = this.bAutoTrackTag && this.bAutoTrackTagPls && (debouncedUpdate || !bCallback)? this.getUpdateTrackTags(plman.GetPlaylistItems(fbPlaylistIndex), plsData) : [null, null]; // Done at 2 steps, first get tags
				if (bCallback && plsData.isAutoPlaylist) {return false;} // In case an UI playlist matches an Autoplaylist on manager
				if (bCallback && !this.bSavingXsp && plsData.extension === '.xsp') {return false;}
				if (plsData.extension !== '.ui') {
					if (this.bSavingWarnings && this.bSavingDefExtension && plsData.extension !== this.playlistsExtension) {
						let answer = WshShell.Popup(playlistNameId + ':\n' + plsData.path + '\nUpdating the playlist will change the format from ' + plsData.extension + ' to ' + this.playlistsExtension + '\nDo you want to continue?', 0, window.Name, popup.question + popup.yes_no);
						if (answer === popup.no) {return false;}
					}
					const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
					console.log('Playlist Manager: Updating playlist... ' + plsData.name);
					const playlistPath = plsData.path;
					let bDeleted = false;
					if (_isFile(playlistPath)) {
						bDeleted = _recycleFile(playlistPath, true);
					} else {bDeleted = true;}
					if (bDeleted) {
						const extension = this.bSavingDefExtension || plsData.extension === '.fpl' ? this.playlistsExtension : plsData.extension;
						let done = savePlaylist({playlistIndex: fbPlaylistIndex, playlistPath, ext: extension, playlistName, useUUID: this.optionsUUIDTranslate(), bLocked: plsData.isLocked, category: plsData.category, tags: plsData.tags, relPath: (this.bRelativePath ? this.playlistsPath : ''), trackTags: plsData.trackTags, playlist_mbid: plsData.playlist_mbid, author: plsData.author, description: plsData.description, bBom: this.bBOM});
						if (!done) {
							fb.ShowPopupMessage(
								'Playlist generation failed while writing file:\n' + playlistPath + 
								'\n\nTrace:' + 
								'\nupdatePlaylist' + _p({playlistIndex, bCallback, bForceLocked}.toStr()) +
								'\n\nsavePlaylist' + _p({playlistIndex: fbPlaylistIndex, playlistPath, ext: extension, playlistName, useUUID: this.optionsUUIDTranslate(), bLocked: plsData.isLocked, category: plsData.category, tags: plsData.tags, relPath: (this.bRelativePath ? this.playlistsPath : ''), trackTags: plsData.trackTags, playlist_mbid: plsData.playlist_mbid, author: plsData.author, description: plsData.description, bBom: this.bBOM}.toStr())
								, window.Name);
							_restoreFile(playlistPath); // Since it failed we need to restore the original playlist back to the folder!
							return false;
						}
						// If done, then we repaint later. Now we manually update the data changes... only one playlist length and/or playlist file size can change here
						const UUID = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate(), false) : ''; // Last UUID or nothing for .pls playlists...
						this.editData(plsData, {
							size: plman.PlaylistItemCount(fbPlaylistIndex), 
							nameId: plsData.name + UUID, 
							id: UUID,
							extension, // May have forced saving on a fpl playlist
							path: this.playlistsPath + sanitize(plsData.name) + extension,
							fileSize: utils.GetFileSize(done), // done points to new path, note playlist extension is not always = 'playlistPath
							duration: plman.GetPlaylistItems(fbPlaylistIndex).CalcTotalDuration(),
							modified: Date.now(),
						});
						if (plsData.nameId !== playlistNameId) {
							const currentLocks = plman.GetPlaylistLockedActions(fbPlaylistIndex) || [];
							if (!currentLocks.includes('RenamePlaylist')) {plman.RenamePlaylist(fbPlaylistIndex, plsData.nameId);}
							else {console.log('updatePlaylist: can not rename playlist due to lock. ' + plsData.nameId);}
						}
						// Warn about dead items
						if (!bCallback || (!bCallback && this.bDeadCheckAutoSave)) {
							const selItems = plman.GetPlaylistItems(fbPlaylistIndex).Convert();
							if (selItems && selItems.length) {
								selItems.some((handle, i) => {
									if (!_isLink(handle.Path) && !_isFile(handle.Path)) {
										fb.ShowPopupMessage('Warning! There is at least one dead item among the tracks used to create the playlist, there may be more.\n\n(' + i + ') '+ handle.RawPath, window.Name); 
										return true;
									}
									return false;
								});
							}
						}
						if (this.bAutoTrackTag && this.bAutoTrackTagPls && (debouncedUpdate || !bCallback)) {this.updateTrackTags(handleUpdate, tagsUpdate);} // Apply tags from before
					} else {
						fb.ShowPopupMessage('Playlist generation failed when overwriting original playlist file \'' + playlistPath + '\'. May be locked.', window.Name);
						return false;
					}
					clearInterval(delay);
					console.log('Playlist Manager: done.');
				}
				const currIdx = this.data.indexOf(plsData);
				this.cacheLastPosition(this.offset + Math.round(this.rows / 2 - 1));
				if (plsData.extension !== '.ui' && !pop.isEnabled()) { // Display animation except for UI playlists
					pop.enable(true, 'Saving...', 'Saving playlist...\nPanel will be disabled during the process.'); 
					this.repaint()
				}
				this.update(true, true, currentItemIndex); // We have already updated data before only for the variables changed
				this.filter();
				if (plsData.extension !== '.ui') {setTimeout(() => {if (pop.isEnabled()) {pop.disable(true);}}, 500);}
				return true;
			}
		}
		return false;
	}
	
	this.exportJson = ({idx, bAllExt = false, path = ''} = {}) => { // idx may be -1 (export all), int (single pls) or array (set of pls)
		let name = '';
		let bArray = false;
		if (isArray(idx)) {name = sanitize(this.playlistsPathDisk + '_' + this.playlistsPathDirName) + '.json'; bArray = true;}
		else if (idx === -1) {name = sanitize(this.playlistsPathDisk + '_' + this.playlistsPathDirName) + '.json';}
		else if (isInt(idx)) {name = sanitize(this.data[idx].name) + '.json';}
		else {console.log('exportJson: Invalid index argument ' + idx); return '';}
		if (!bArray && idx !== -1 ) { // Safety check
			const pls = this.data[idx];
			if (!pls.isAutoPlaylist) {
				if (!bAllExt) {return '';}
				else if (bAllExt) {
					if (pls.extension !== '.fpl' && pls.extension !== '.xsp') {return '';}
					if (pls.extension === '.xsp' &&  pls.hasOwnProperty('type') && pls.type !== 'songs') { // Don't export incompatible files
						fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name);
						return '';
					}
				}
			}
		}
		if (!path || !path.length) {
			try {path = sanitizePath(utils.InputBox(window.ID, 'Path to save the json file:', window.Name, this.playlistsPath + 'Export\\' + name, true));}
			catch (e) {return '';}
		}
		if (!path.length){return '';}
		if (_isFile(path)) {
			let bDone = _recycleFile(path, true);
			if (!bDone) {console.log('exportJson: can\'t delete duplicate file ' + path); return '';}
		}
		let toSave = [];
		if (bArray) {
			idx.forEach((i) => {
				const pls = this.data[i];
				if ((pls.extension === '.fpl' || pls.extension === '.xsp') && bAllExt) {
					if (pls.extension === '.xsp' && pls.hasOwnProperty('type') && pls.type !== 'songs') { // Don't export incompatible files
						fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name);
						return;
					}
					toSave.push(pls);
				}
				else if (pls.isAutoPlaylist) {toSave.push(pls);}
			});
		}
		else if (idx === -1) {toSave = bAllExt ? [...this.dataAutoPlaylists, ...this.dataFpl, ...this.dataXsp] : [...this.dataAutoPlaylists];}
		else {toSave.push(this.data[idx]);}
		_save(path, JSON.stringify(toSave, this.replacer, '\t'), this.bBOM); // No BOM
		return path;
	}
	
	this.loadExternalJson = ({path = '', bOldVersion} = {}) => {
		const test = bProfile ? new FbProfiler(window.Name + ': ' + 'Load json file') : null;
		let externalPath = path;
		if (!path || !path.length) {
			try {externalPath = utils.InputBox(window.ID, 'Put here the path of the json file:', window.Name, '', true);}
			catch (e) {return false;}
		}
		if (!externalPath.length){return false;}
		if (!_isFile(externalPath)) {
			fb.ShowPopupMessage('File does not exist:\n\'' + externalPath + '\'', window.Name);
			return false;
		}
		if (!externalPath.endsWith('.json')) {
			fb.ShowPopupMessage('File has not .json extension:\n\'' + externalPath + '\'', window.Name);
			return false;
		}
		let answer = bOldVersion === void(0) ? WshShell.Popup('Are you loading a .json file created by Auto-playlist list by marc2003 script?\n(no = json file by this playlist manager)', 0, window.Name, popup.question + popup.yes_no) : (bOldVersion ? popup.yes : popup.no);
		let dataExternalPlaylists = [];
		const data = _jsonParseFileCheck(externalPath, 'Playlist json', window.Name, answer === popup.no ? utf8 : 0);
		if (!data) {return false;}
		if (answer === popup.yes) {
			// Then all playlist are AutoPlaylists and all need size updating...
			// {name,query,sort,forced} maps to {...,name,query,sort,bSortForced,...}
			// Need to fill all the other values
			data.forEach((item) => {
				if (!checkQuery(item.query, false, true)) {fb.ShowPopupMessage('Query not valid:\n' + item.query, window.Name); return;}
				const handleList = fb.GetQueryItems(fb.GetLibraryItems(), stripSort(item.query));
				const size = handleList.Count;
				const duration = handleList.CalcTotalDuration();
				const oAutoPlaylistItem = new oPlaylist({
					name: item.name,
					size,
					bAutoPlaylist: true,
					queryObj: {query: item.query, sort: item.sort, bSortForced: item.forced},
					duration
				});
				const diffKeys = defPlsKeys.difference(new Set(Object.keys(item)));
				if (diffKeys.size) {diffKeys.forEach((key) => {item[key] = defPls[key];});}
				// width is done along all playlist internally later...
				dataExternalPlaylists.push(oAutoPlaylistItem);
			});
		} else if (answer === popup.no) {
			data.forEach((item) => { // TODO: .fpl importing?
				if (!item.hasOwnProperty('query') || !item.hasOwnProperty('isAutoPlaylist') || !item.isAutoPlaylist) {return;} // May be a non AutoPlaylist item
				if (!checkQuery(item.query, false, true)) {fb.ShowPopupMessage('Query not valid:\n' + item.query, window.Name); return;} // Don't allow empty but allow sort
				if (item.extension === '.xsp' && item.hasOwnProperty('type') && item.type !== 'songs') { // Don't import incompatible files
					fb.ShowPopupMessage('XSP has a non compatible type: ' + item.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name);
					return;
				}
				const handleList = fb.GetQueryItems(fb.GetLibraryItems(), stripSort(item.query));
				item.size = handleList.Count;
				item.duration = handleList.CalcTotalDuration();
				const diffKeys = defPlsKeys.difference(new Set(Object.keys(item)));
				if (diffKeys.size) {diffKeys.forEach((key) => {item[key] = defPls[key];});}
				// width is done along all playlist internally later...
				dataExternalPlaylists.push(item);
			});
		}
		// Auto-Tags (skip bAutoLock since AutoPlaylists are already locked)
		dataExternalPlaylists.forEach((oPlaylist) => {
			if (this.bAutoLoadTag && oPlaylist.tags.indexOf('bAutoLoad') === -1) {oPlaylist.tags.push('bAutoLoad');}
			if (this.bMultMenuTag && oPlaylist.tags.indexOf('bMultMenu') === -1) {oPlaylist.tags.push('bMultMenu');}
			if (this.bAutoCustomTag) {this.autoCustomTag.forEach( (tag) => {if (tag !== 'bAutoLock' && ! new Set(oPlaylist.tags).has(tag)) {oPlaylist.tags.push(tag);}});}
		});
		if (dataExternalPlaylists.length) {this.addToData(dataExternalPlaylists);} // Add to database
		this.update(true, true); // Updates and saves AutoPlaylist to our own json format
		this.resetFilter();
		if (bProfile) {test.Print();}
		return true;
	}
	// Categories and tags
	this.categories = (idx = null) => {
		const defCateg = '(None)';
		if (idx === 0) {return defCateg;}
		let categ = new Set();
		this.dataAll.forEach( (playlist) => {if (playlist.category.length) {categ.add(playlist.category);}});
		return idx ? [defCateg, ...[...categ].sort((a,b) => a.localeCompare(b))][idx] : [defCateg, ...[...categ].sort((a,b) => a.localeCompare(b))];
	}
	this.categoryState = [];
	this.tags = (idx = null) => {
		const defTag = '(None)';
		if (idx === 0) {return defTag;}
		let tags = new Set();
		this.dataAll.forEach( (playlist) => {if (playlist.tags.length) {playlist.tags.forEach((tag) => {tags.add(tag);});}});
		return idx ? [defTag, ...[...tags].sort((a,b) => a.localeCompare(b))][idx] : [defTag, ...[...tags].sort((a,b) => a.localeCompare(b))];
	}
	this.tagState = [];
	// By pls
	this.plsState = [];
	// These are constant
	this.constLockStates = () => {return ['All','Not locked','Locked'];};
	this.constAutoPlaylistStates = (bUI = this.bAllPls, bLiteMode = this.bLiteMode) => {
		return bUI 
			? this.constAutoPlaylistStates(false).concat(['UI-only Playlists'])
			: bLiteMode 
				? ['All','AutoPlaylists && Smart Playlists']
				: ['All','AutoPlaylists && Smart Playlists','Standard Playlists'];
	};
	this.constExtStates = (bUI = this.bAllPls) => {return bUI ? this.constExtStates(false).concat(['.ui']) : ['All', ...loadablePlaylistFormats];};
	this.constMbidStates = () => {return ['All','No MBID','With MBID'];};
	// These rotate over time
	this.lockStates = this.constLockStates();
	this.autoPlaylistStates = this.constAutoPlaylistStates();
	this.extStates = this.constExtStates();
	this.mbidStates = this.constMbidStates();
	
	this.getFilter = (bActiveOnly = false) => {
		const filter = {
			Category: !isArrayEqual(this.categoryState, this.categories()),
			Extension: this.constExtStates()[0] !== this.extStates[0],
			'Lock state': this.constLockStates()[0] !== this.lockStates[0],
			MBID: this.constMbidStates()[0] !== this.mbidStates[0],
			Playlist: this.plsState.length !== 0 && (this.searchInput === null || this.searchInput.text.length === 0),
			'Playlist type': this.constAutoPlaylistStates()[0] !== this.autoPlaylistStates[0],
			Search: this.plsState.length !== 0 && this.searchInput !== null && this.searchInput.text.length !== 0,
			Tag: !isArrayEqual(this.tagState, this.tags())
		};
		return bActiveOnly 
			? Object.fromEntries(Object.entries(filter).filter((entry) => entry[1] === true))
			: filter;
	};
	this.isFilterActive = (filter = null) => {
		return filter ? this.getFilter()[filter] : Object.values(this.getFilter()).some(Boolean);
	};
	this.filter = ({autoPlaylistState = this.autoPlaylistStates[0], lockState = this.lockStates[0], extState = this.extStates[0], categoryState = this.categoryState, tagState = this.tagState, mbidState = this.mbidStates[0], plsState = this.plsState, bReusePlsFilter = false, bSkipSearch = false, bRepaint = true} = {}) => {
		// Apply current search
		const bPlsFilter = plsState.length;
		if (this.searchInput && this.searchInput.text.length && !bSkipSearch) {
			if (!bReusePlsFilter || !bPlsFilter) {
				plsState = this.search(false).plsState;
			} else if (bReusePlsFilter && bPlsFilter) {
				const newPlsState = this.search(false).plsState;
				plsState = plsState.filter((oldPls) => {
					return newPlsState.includes(oldPls) || (newPlsState.findIndex((pls) => 
							pls.nameId === oldPls.nameId && pls.path === oldPls.path && oldPls.extension === pls.extension
						) !== -1);
				});
			}
		}
		// Then filter by current playlists filtered
		if (plsState.length) {
			this.data = this.dataAll.filter((pls) => plsState.includes(pls));
			// In case there has been an update, objects can change, look for other properties
			if (!this.data.length) {
				this.data = this.dataAll.filter((dataPls) => 
					plsState.findIndex((pls) => 
						pls.nameId === dataPls.nameId && pls.path === dataPls.path && dataPls.extension === pls.extension
					) !== -1
				);
			}
		} else { // On first filter we use this.dataAll as origin
			this.data = [...this.dataAll];
		}
		// Process folders
		this.collapseFolders();
		this.processFolders();
		// AutoPlaylists
		if (autoPlaylistState === this.constAutoPlaylistStates()[0]) { // AutoPlaylists
			// this.data = this.data;
		} else if (autoPlaylistState === this.constAutoPlaylistStates()[1]) {
			const isAutoPls = (item) => {return item.isAutoPlaylist || item.query || (item.isFolder && item.pls.some(isAutoPls));};
			this.data = this.data.filter(isAutoPls);
		} else if (autoPlaylistState === this.constAutoPlaylistStates()[2]) {
			if (!this.bLiteMode) {
				const isFilePls = (item) => {return !item.isAutoPlaylist && !item.query && item.extension !== '.ui' || (item.isFolder && item.pls.some(isFilePls));};
				this.data = this.data.filter(isFilePls);
			} else {
				const isUiPls = (item) => {return item.extension === '.ui' || (item.isFolder && item.pls.some(isUiPls));};
				this.data = this.data.filter(isUiPls);
			}
		} else if (this.bAllPls && autoPlaylistState === this.constAutoPlaylistStates()[3]) {
			const isUiPls = (item) => {return item.extension === '.ui' || (item.isFolder && item.pls.some(isUiPls));};
			this.data = this.data.filter(isUiPls);
		}
		// And then... we use this.data to filter again by lock state
		if (lockState === this.constLockStates()[0]) {
			// this.data = this.data;
		} else if (lockState === this.constLockStates()[1]) {
			const isNotLocked = (item) => {return !item.isLocked ||(item.isFolder && item.pls.some(isNotLocked));};
			this.data = this.data.filter(isNotLocked);
		} else if (lockState === this.constLockStates()[2]) {
			const isLocked = (item) => {return item.isLocked || (item.isFolder && item.pls.some(isLocked));};
			this.data = this.data.filter(isLocked);
		}
		// And again with extension
		if (extState === this.constExtStates()[0]) {
			// this.data = this.data;
		} else {
			const isExt = (item) => {return item.extension === extState || (item.isFolder && item.pls.some(isExt));};
			this.data = this.data.filter(isExt);
		}
		// And again with categories
		if (!isArrayEqual(categoryState, this.categories())) {
			const isCategory = (item) => {
				if (categoryState.indexOf('(None)') !== -1) {return (!item.category.length || categoryState.indexOf(item.category) !== -1) || (item.isFolder && item.pls.some(isCategory));}
				else {return (categoryState.indexOf(item.category) !== -1 || (item.isFolder && item.pls.some(isCategory)));}
			};
			this.data = this.data.filter(isCategory);
		}
		// And again with tags
		if (!isArrayEqual(tagState, this.tags())) {
			const isTag = (item) => {
				if (tagState.indexOf('(None)') !== -1) {return (!item.tags.length || new Set(tagState).intersectionSize(new Set(item.tags)) !== 0) || (item.isFolder && item.pls.some(isTag));}
				else {return new Set(tagState).intersectionSize(new Set(item.tags)) !== 0 || (item.isFolder && item.pls.some(isTag));}
			};
			this.data = this.data.filter(isTag);
		}
		// And again with MBID
		if (mbidState === this.constMbidStates()[0]) {
			// this.data = this.data;
		} else if (mbidState === this.constMbidStates()[1]) {
			const isNoMbid = (item) => {return !item.playlist_mbid.length || (item.isFolder && item.pls.some(isNoMbid));};
			this.data = this.data.filter(isNoMbid);
		} else if (mbidState === this.constMbidStates()[2]) {
			const isMbid = (item) => {return item.playlist_mbid.length || (item.isFolder && item.pls.some(isMbid));};
			this.data = this.data.filter(isMbid);
		}
		// Focus
		this.items = this.data.length;
		if (bMaintainFocus) {this.jumpLastPosition();}
		// Update filters with current values
		// Lock, playlist type, extension
		// Rotate original matrix until it matches the current one
		let rotations = [0,0,0];
		for (let i = 0; i < this.constAutoPlaylistStates().length; i++) {
			const newState = this.constAutoPlaylistStates().rotate(i);
			if (autoPlaylistState === newState[0]) {
				this.autoPlaylistStates = newState;
				rotations[0] = i;
				break;
			}
		}
		for (let i = 0; i < this.constLockStates().length; i++) {
			const newState = this.constLockStates().rotate(i);
			if (lockState === newState[0]) {
				this.lockStates = newState;
				rotations[1] = i;
				break;
			}
		}
		for (let i = 0; i < this.constExtStates().length; i++) {
			const newState = this.constExtStates().rotate(i);
			if (extState === newState[0]) {
				this.extStates = newState;
				rotations[2] = i;
				break;
			}
		}
		for (let i = 0; i < this.constMbidStates().length; i++) {
			const newState = this.constMbidStates().rotate(i);
			if (mbidState === newState[0]) {
				this.mbidStates = newState;
				rotations[3] = i;
				break;
			}
		}
		// Categories
		if (!isArrayEqual(categoryState, this.categoryState)) {
			this.categoryState = categoryState;
		}
		// Tags
		if (!isArrayEqual(tagState, this.tagState)) {
			this.tagState = tagState;
		}
		// By pls
		if (!isArrayEqual(plsState, this.plsState)) {
			this.plsState = plsState;
		}
		// Save current view filters on properties
		if (this.bSaveFilterStates) {
			this.properties['filterStates'][1] = rotations.join(',');
			this.properties['categoryState'][1] = JSON.stringify(this.categoryState);
			// Save
			overwriteProperties(this.properties);
		}
		// Update header whenever it's needed
		this.headerTextUpdate();
		// Update offset!
		if (currentItemIndex === -1) {this.offset = 0;}
		if (bRepaint) {
			if (this.offset + this.rows >= this.items) {this.offset = Math.max(this.items - this.rows, 0);}
			this.repaint();
		}
	}
	this.resetFilter = () => {
		if (this.searchInput && this.searchMethod.bResetFilters) {this.searchInput.on_key_down(VK_ESCAPE);}
		this.filter({autoPlaylistState: this.constAutoPlaylistStates()[0], lockState: this.constLockStates()[0], extState: this.constExtStates()[0], tagState: this.tags(), categoryState: this.categories(), mbidState: this.constMbidStates()[0], plsState: []});
	}
	this.availableFilters = () => {
		const showMenus = JSON.parse(this.properties.showMenus[1]);
		const bListenBrainz = this.properties.lBrainzToken[1].length > 0;
		return [showMenus['Category'] ? 'Category' : '', !this.bLiteMode ? 'Extension' : '', 'Lock state', showMenus['Online sync'] && bListenBrainz ? 'MBID' : '', 'Playlist type',  showMenus['Tags'] ? 'Tag' : ''].filter(Boolean).sort((a,b) => a.localeCompare(b));
	}
	this.filterData = ({data = null, autoPlaylistState = this.autoPlaylistStates[0], lockState = this.lockStates[0], extState = this.extStates[0], categoryState = this.categoryState, tagState = this.tagState, mbidState = this.mbidStates[0], plsState = this.plsState, bReusePlsFilter = false, bSkipSearch = false} = {}) => {
		if (!data) {throw 'No data provided for filtering';}
		if (!data.length) {return data;}
		let outData;
		// Apply current search
		const bPlsFilter = plsState.length;
		if (this.searchInput && this.searchInput.text.length && !bSkipSearch) {
			if (!bReusePlsFilter || !bPlsFilter) {
				plsState = this.search(false).plsState;
			} else if (bReusePlsFilter && bPlsFilter) {
				const newPlsState = this.search(false).plsState;
				plsState = plsState.filter((oldPls) => {
					return newPlsState.includes(oldPls) || (newPlsState.findIndex((pls) => 
							pls.nameId === oldPls.nameId && pls.path === oldPls.path && oldPls.extension === pls.extension
						) !== -1);
				});
			}
		}
		// Then filter by current playlists filtered
		if (plsState.length) {
			outData = data.filter((pls) => plsState.includes(pls));
			// In case there has been an update, objects can change, look for other properties
			if (!outData.length) {
				outData = data.filter((dataPls) => 
					plsState.findIndex((pls) => 
						pls.nameId === dataPls.nameId && pls.path === dataPls.path && dataPls.extension === pls.extension
					) !== -1
				);
			}
		} else { // On first filter we use original data as source
			outData = [...data];
		}
		// AutoPlaylists
		if (autoPlaylistState === this.constAutoPlaylistStates()[0]) { // AutoPlaylists
			// outData = outData;
		} else if (autoPlaylistState === this.constAutoPlaylistStates()[1]) {
			const isAutoPls = (item) => {return item.isAutoPlaylist || item.query || (item.isFolder && item.pls.some(isAutoPls));};
			outData = outData.filter(isAutoPls);
		} else if (autoPlaylistState === this.constAutoPlaylistStates()[2]) {
			if (!this.bLiteMode) {
				const isFilePls = (item) => {return !item.isAutoPlaylist && !item.query && item.extension !== '.ui' || (item.isFolder && item.pls.some(isFilePls));};
				outData = outData.filter(isFilePls);
			} else {
				const isUiPls = (item) => {return item.extension === '.ui' || (item.isFolder && item.pls.some(isUiPls));};
				outData = outData.filter(isUiPls);
			}
		} else if (this.bAllPls && autoPlaylistState === this.constAutoPlaylistStates()[3]) {
			const isUiPls = (item) => {return item.extension === '.ui' || (item.isFolder && item.pls.some(isUiPls));};
			outData = outData.filter(isUiPls);
		}
		// And then... we use outData to filter again by lock state
		if (lockState === this.constLockStates()[0]) {
			// outData = outData;
		} else if (lockState === this.constLockStates()[1]) {
			const isNotLocked = (item) => {return !item.isLocked ||(item.isFolder && item.pls.some(isNotLocked));};
			outData = outData.filter(isNotLocked);
		} else if (lockState === this.constLockStates()[2]) {
			const isLocked = (item) => {return item.isLocked || (item.isFolder && item.pls.some(isLocked));};
			outData = outData.filter(isLocked);
		}
		// And again with extension
		if (extState === this.constExtStates()[0]) {
			// outData = outData;
		} else {
			const isExt = (item) => {return item.extension === extState || (item.isFolder && item.pls.some(isExt));};
			outData = outData.filter(isExt);
		}
		// And again with categories
		if (!isArrayEqual(categoryState, this.categories())) {
			const isCategory = (item) => {
				if (categoryState.indexOf('(None)') !== -1) {return (!item.category.length || categoryState.indexOf(item.category) !== -1) || (item.isFolder && item.pls.some(isCategory));}
				else {return (categoryState.indexOf(item.category) !== -1 || (item.isFolder && item.pls.some(isCategory)));}
			};
			outData = outData.filter(isCategory);
		}
		// And again with tags
		if (!isArrayEqual(tagState, this.tags())) {
			const isTag = (item) => {
				if (tagState.indexOf('(None)') !== -1) {return (!item.tags.length || new Set(tagState).intersectionSize(new Set(item.tags)) !== 0) || (item.isFolder && item.pls.some(isTag));}
				else {return new Set(tagState).intersectionSize(new Set(item.tags)) !== 0 || (item.isFolder && item.pls.some(isTag));}
			};
			outData = outData.filter(isTag);
		}
		// And again with MBID
		if (mbidState === this.constMbidStates()[0]) {
			// outData = outData;
		} else if (mbidState === this.constMbidStates()[1]) {
			const isNoMbid = (item) => {return !item.playlist_mbid.length || (item.isFolder && item.pls.some(isNoMbid));};
			outData = outData.filter(isNoMbid);
		} else if (mbidState === this.constMbidStates()[2]) {
			const isMbid = (item) => {return item.playlist_mbid.length || (item.isFolder && item.pls.some(isMbid));};
			outData = outData.filter( isMbid);
		}
		
		return outData;
	}
	
	this.sortMethods = (bInternal = true) => { // These are constant. Expects the first sorting order of every method to be the natural one... also method must be named 'By + [playlist property]' for quick-searching
		const showMenus = JSON.parse(this.properties.showMenus[1]);
		return {
				'By name': 
					{
						'Az': (a, b) => {return a.name.localeCompare(b.name);}, 
						'Za': (a, b) => {return 0 - a.name.localeCompare(b.name);}
					},
				'By size': 
					{
						'(S) Asc.': (a, b) => {return a.size - b.size;},
						'(S) Des.': (a, b) => {return b.size - a.size;}
					},
				...(showMenus['Category'] 
					? {
						'By category': 
							{
								'(C) Az': (a, b) => {return a.category.localeCompare(b.category);}, 
								'(C) Za': (a, b) => {return 0 - a.category.localeCompare(b.category);}
							}
						}
					: {}
				),
				...(showMenus['Tags'] 
					? {
						'By tags\t-first one-': 
							{
								'(T) Az': (a, b) => {return (a.tags[0] || '').localeCompare((b.tags[0] || ''));}, 
								'(T) Za': (a, b) => {return 0 - (a.tags[0] || '').localeCompare((b.tags[0] || ''));}
							}
						}
					: {}
				),
				'By date\t-last modified-': 
					{
						'(D) Asc.': (a, b) => {return a.modified - b.modified;},
						'(D) Des.': (a, b) => {return b.modified - a.modified;}
					},
				'By date\t-created-': 
					{
						'(D) Asc.': (a, b) => {return a.created - b.created;},
						'(D) Des.': (a, b) => {return b.created - a.created;}
					},
				'By duration': 
					{
						'(D) Asc.': (a, b) => {return a.duration - b.duration;},
						'(D) Des.': (a, b) => {return b.duration - a.duration;}
					},
				// Manual
				'Manual sorting': 
					{
						'(M) Asc.': (a, b) => {return a.sortIdx - b.sortIdx;},
						'(M) Des.': (a, b) => {return b.sortIdx - a.sortIdx;}
					},
				// Internal
				// Only getOppositeSortState work with these
				...(bInternal
					? {
						'Pinned': 
							{
								'First': (a, b) => {
									const aPin = a.tags.includes('bPinnedFirst');
									const bPin = b.tags.includes('bPinnedFirst');
									if (aPin && !bPin) {return -1;}
									else if (!aPin && bPin) {return 1;}
									else {return 0;}
								},
								'Last': (a, b) => {
									const aPin = a.tags.includes('bPinnedLast');
									const bPin = b.tags.includes('bPinnedLast');
									if (aPin && !bPin) {return 1;}
									else if (!aPin && bPin) {return -1;}
									else {return 0;}
								},
								bHidden: true
							}
						}
					: {}
				)
		};
	}
	this.getOppositeSortState = (sortState, methodState = this.methodState) => { // first or second key
		const keys = Object.keys(this.sortMethods()[methodState]);
		let index = keys.indexOf(sortState);
		if (index === -1) {return null;}
		return ((index === 0) ? keys[++index] : keys[--index]);
	}
	this.getIndexSortState = (sortState = this.sortState, methodState = this.methodState) => {
		const keys = Object.keys(this.sortMethods(false)[methodState]);
		const index = keys.indexOf(sortState);
		return index;
	}
	// Use these to always get valid values
	this.getSortState = () => {
		const keys = Object.keys(this.sortMethods(false)[this.methodState]);
		let index = keys.indexOf(this.sortState);
		if (index === -1) {return Object.keys(this.sortMethods(false)[this.methodState])[0];}
		return this.sortState;
	}
	this.setSortState = (sortState) => {
		// Check if it's a valid one
		const keys = Object.keys(this.sortMethods(false)[this.methodState]);
		let index = keys.indexOf(sortState);
		if (index === -1) {return false;}
		// Save it
		this.sortState = sortState;
		this.properties['sortState'][1] = this.sortState;
		overwriteProperties(this.properties);
		return true;
	}
	this.getMethodState = () => {
		const keys = Object.keys(this.sortMethods(false));
		let index = keys.indexOf(this.methodState);
		if (index === -1) {return Object.keys(this.sortMethods(false))[0];}
		return this.methodState;
	}
	this.setMethodState = (methodState) => {
		// Check if it's a valid one
		const keys = Object.keys(this.sortMethods(false));
		let index = keys.indexOf(methodState);
		if (index === -1) {return false;}
		// Save it
		this.methodState = methodState;
		this.properties['methodState'][1] = this.methodState;
		overwriteProperties(this.properties);
		return true;
	}
	this.defaultMethodState = () => {
		return Object.keys(this.sortMethods(false))[0];
	}
	this.defaultSortState = (method = this.defaultMethodState()) => {
		return Object.keys(this.sortMethods(false)[method])[0];
	}
	this.manualMethodState = () => {
		return Object.keys(this.sortMethods(false)).slice(-1)[0];
	}
	
	this.changeSorting = (newMethod) => {
		const previousMethodState = this.methodState;
		this.methodState = newMethod;
		this.sortState = this.defaultSortState(this.methodState);
		// Update properties to save between reloads, but property descriptions change according to list.methodState
		this.properties['methodState'][1] = this.methodState;
		const removeProperties = {SortState: [this.properties['sortState'][0], null]}; // need to remove manually since we change the ID (description)!
		this.properties['sortState'][0] = this.properties['sortState'][0].replace(Object.keys(this.sortMethods(false)[previousMethodState]).join(','),''); // remove old keys
		this.properties['sortState'][0] += Object.keys(this.sortMethods(false)[this.methodState]); // add new ones
		this.properties['sortState'][1] = this.sortState; // and change value
		// And set properties
		deleteProperties(removeProperties); // Deletes old properties used as placeholders
		overwriteProperties(this.properties);
		this.sort(void(0), true); // uses current sort state and repaint
	}
	
	this.sort = (sortMethod = this.sortMethods(false)[this.methodState][this.sortState], bPaint = false) => {
		const plsSel = this.indexes.length ? this.indexes.map((idx) => this.data[idx]) : [];
		this.collapseFolders();
		const bManual = this.methodState === this.manualMethodState();
		if (bManual) {
			let bSave = false;
			if (this.sortingFile.length) {
				// Assign Ids and remove not present playlists
				this.sortingFile = this.sortingFile.filter((plsSort) => this.dataAll.some((pls) => pls.nameId === plsSort));
				this.dataAll.forEach((pls) => {
					const idx = this.sortingFile.findIndex((plsSort) => pls.nameId === plsSort);
					pls.sortIdx = idx !== -1 ? idx : this.sortingFile.push(pls.nameId);
					if (idx === -1) {bSave = true;}
				});
			} else { // Create new one sorted by name
				const defSort = this.sortMethods(false)[this.defaultMethodState()][this.defaultSortState()];
				this.dataAll.sort(defSort)
				this.dataAll.forEach((pls, i) => {
					this.sortingFile.push(pls.nameId);
					pls.sortIdx = i;
				});
				bSave = true;
			}
			if (bSave) {this.saveManualSorting();}
		}
		this.data.sort(sortMethod); // Can use arbitrary methods...
		this.dataAll.sort(sortMethod); // This is done, because filter uses a copy of dataAll when resetting to no filter! So we need a sorted copy
		if (!bManual && this.bApplyAutoTags) {
			const {bFirst, bLast} = this.data.reduce((acc, pls) => {
					if (!acc.bFirst && pls.tags.includes('bPinnedFirst')) {acc.bFirst = true;}
					if (!acc.bLast && pls.tags.includes('bPinnedLast')) {acc.bLast = true;}
					return acc;
				}, {bFirst: false, bLast: false});
			if (bFirst) {
				const method = this.sortMethods().Pinned.First;
				this.data.sort(method);
				this.dataAll.sort(method);
			}
			if (bLast) {
				const method = this.sortMethods().Pinned.Last;
				this.data.sort(method);
				this.dataAll.sort(method);
			}
		}
		this.processFolders();
		if (plsSel.length) {
			this.indexes = plsSel.map((pls) => this.data.indexOf(pls)).filter((idx) => idx !== -1);
		}
		if (bMaintainFocus) {this.jumpLastPosition();}
		if (bPaint) {this.repaint();}
	}
	
	this.saveManualSorting = () => {
		_save(this.filename.replace('.json','_sorting.json'), JSON.stringify(this.sortingFile, this.replacer, '\t'), false); // No BOM
	}
	
	this.setManualSortingForPls = (plsArr, toIdx) => {
		if (plsArr.every((pls) => this.dataAll.includes(pls))) {
			if (!this.sortingFile.length) {this.sort();}
			const cache = [...this.sortingFile];
			const bInverted = this.getSortState() !== this.defaultSortState(this.manualMethodState());
			if (bInverted) {this.sortingFile = this.sortingFile.reverse();} // For reverse sorting, list must be sorted first too!
			const toMove = plsArr.reverse().map((pls) => {
				const sortIdx = this.sortingFile.findIndex((n) => n === pls.nameId);
				return sortIdx !== -1 ? this.sortingFile.splice(sortIdx, 1)[0] : null;
			}).filter((n) => n !== null).reverse();
			if (toMove.length) {
				if (isFunction(toIdx)) {
					const ref = cache.findIndex((n) => n === toMove[0]);
					toIdx = ref !== -1 ? toIdx(ref) : -1;
				}
				if (toIdx !== -1 && (toMove.length !== 1 || (toMove[0] !== cache.slice(-1)[0] || toIdx < cache.length))) { // Don't move past limits...
					if (toIdx > this.sortingFile.length) {toIdx = this.sortingFile.length;}
					this.sortingFile.splice(toIdx, 0, ...toMove);
					if (this.indexes.length) {this.indexes = toMove.map((_, i) => toIdx + i);}
					if (bInverted) {this.sortingFile = this.sortingFile.reverse();} // And revert back
					this.saveManualSorting();
					this.sort();
				} else {this.sortingFile = cache;}
			} else {this.sortingFile = cache;}
		} else {console.log('Playlist Manager: invalid data array.');}
	}
	
	this.switchFolder = (z, bRepaint = true) => {
		if (z === -1) {return false;}
		if (!Array.isArray(z)) {z = [z];}
		for (let zz of z) {
			const folder = this.data[zz];
			if (!folder || !folder.isFolder) {console.log('switchFolder: item is not a folder. Name: ' + (folder ? folder.name : null) + ', Index: ' + zz); return false;}
			const folderSize = folder.pls.lengthFilteredAll; // May be affected by current filter
			if (folderSize > 0) {
				if (folder.isOpen) {
					const top = zz + folderSize;
					for (let i = top; i > zz; i--) {
						if (this.data[i].inFolder === folder.nameId) {
							if (this.data[i].isFolder && this.data[i].isOpen) {this.switchFolder(i);}
							const pos = this.indexes.indexOf(i);
							if (pos !== -1) {
								this.indexes.splice(pos, 1);
							}
						}
					}
					this.indexes = this.indexes.map((idx) => idx > top ? idx - folderSize : idx);
					if (this.index > top) {
						this.index -= folderSize;
					}
					this.offset = Math.min(this.offset, this.items - this.rows - folderSize);
				} else {
					this.indexes = this.indexes.map((idx) => idx > zz ? idx + folderSize : idx);
					if (this.index > zz) {
						this.index += folderSize;
						this.offset += folderSize;
					}
				}
			}
			this.data[zz].isOpen = !this.data[zz].isOpen;
		}
		this.processFolders();
		if (this.index < 0) {this.index = 0;}
		if (this.offset < 0) {this.offset = 0;}
		this.filter({bReusePlsFilter: true, bRepaint});
		return true;
	}
	
	this.processFolders = () => {
		if (this.data.some((item) => item.isFolder)) {
			const expandedData = this.data.filter((item) => !this.isInFolder(item));
			expandedData.forEach((item, i) => { // Reuse the same object
				if (item.isFolder && item.isOpen && item.pls.length) {
					this.processFolder(item, i, expandedData);
				}
			});
			this.data = [...new Set(expandedData)]; // Deduplicate
			this.items = this.data.length;
		}
	}
	
	this.processFolder = (item, i, expandedData) => {
		const pls = this.sortFolder([...item.pls].filter((subItem) => subItem.inFolder === item.nameId));
		if (pls.some((subItem) => subItem.isFolder)) {
			pls.forEach((subItem, j) => {
				if (subItem.isFolder && subItem.isOpen && subItem.pls.length) {
					this.processFolder(subItem, j, pls);
				}
			});
		}
		expandedData.splice(i + 1, 0, ...pls);
	}
	
	this.sortFolder = (folder, sortMethod = this.sortMethods()[this.methodState][this.sortState]) => {
		folder.sort(sortMethod);
		return folder;
	}
	
	this.collapseFolders = () => {
		if (this.data.some((item, i) => item.isFolder)) {
			this.data = this.data.filter((item) => !this.isInFolder(item));
			this.items = this.data.length;
		}
	}
	
	this.update = (bReuseData = false, bNotPaint = false, currentItemIndex = -1, bInit = false) => {
		const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
		const oldCategories = this.categories();
		const oldTags = this.tags();
		// Saves currently selected item for later use
		const bMaintainFocus = (currentItemIndex !== -1); // Skip at init or when mouse leaves panel
		if (!bReuseData) { // Recalculates from files
			// AutoPlaylist and FPL From json
			console.log('Playlist manager: reading files from ' + _q(this.playlistsPath));
			this.dataAutoPlaylists = [];
			this.dataFpl = [];
			this.dataXsp = [];
			this.dataUI = [];
			this.dataFolder = [];
			this.indexes = [];
			if (_isFile(this.filename)) {
				const bUpdateTags = this.bAutoTrackTag && this.bAutoTrackTagAutoPls && (this.bUpdateAutoplaylist || this.bAutoTrackTagAutoPlsInit && bInit);
				const bColumns = this.isColumnsEnabled('size');
				const bUpdateSize = this.bUpdateAutoplaylist && (this.bShowSize || bUpdateTags || bColumns);
				if (bUpdateSize || bUpdateTags) {var test = new FbProfiler(window.Name + ': ' + 'Refresh AutoPlaylists');}
				const data = _jsonParseFileCheck(this.filename, 'Playlists json', window.Name, utf8);
				if (!data) {return;}
				else if (!data) {return;}
				let i = 0;
				const promises = [];
				data.forEach((item) => {
					// Check missing metadata and fill
					const diffKeys = defPlsKeys.difference(new Set(Object.keys(item)));
					if (diffKeys.size) {diffKeys.forEach((key) => {item[key] = defPls[key];});}
					// Process
					if (item.isAutoPlaylist || item.query) {
						if (!item.hasOwnProperty('duration')) {item.duration = -1;}
						i++;
						if (bUpdateSize) { // Updates size for AutoPlaylists. Warning takes a lot of time! Only when required...
							// Only re-checks query when forcing update of size for performance reasons
							// Note the query is checked on user input, external json loading and just before loading the playlist
							// So checking it every time the panel is painted is totally useless...
							const cacheSize = item.size;
							const cacheDuration = item.duration;
							let bDone = false;
							promises.push(new Promise((resolve) => {
								loadAutoPlaylistAsync(item, i).then((handleList = null) => { // Update async delay i * 500 ms
									if (this.properties.bBlockUpdateAutoPls[1] && !pop.isEnabled()) {
										pop.enable(true, 'Updating AutoPls...', 'Updating AutoPlaylists...\nPanel will be disabled during the process.');
									}
									if (handleList && item.size && bUpdateTags) {
										if (item.hasOwnProperty('trackTags') && item.trackTags && item.trackTags.length) { // Merge tag update if already loading query...
											const bUpdated = this.updateTags(handleList, item);
											if (bUpdated) {console.log('Playlist Manager: Auto-tagging playlist ' + item.name);}
										}
									}
									if (handleList && (cacheSize !== item.size || cacheDuration !== item.duration)) {
										console.log('Updating ' + (item.isAutoPlaylist ? 'AutoPlaylist' : 'Smart Playlist') + ' size: ' + item.name);
										if (item.extension === '.xsp') {
											if (item.hasOwnProperty('type') && item.type === 'songs') {
												let xspPlaylist = this.dataXsp.find((pls) => {return pls.name === item.name;});
												if (xspPlaylist) {
													xspPlaylist.size = item.size;
													xspPlaylist.duration = item.duration;
												}
											}
										}
										this.repaint();
									}
									resolve('done');
								});
							}));
						} else { // Updates tags for AutoPlaylists. Warning takes a lot of time! Only when required...
							if (bUpdateTags) {
								if (item.hasOwnProperty('trackTags') && item.trackTags && item.trackTags.length) {
									promises.push(new Promise((resolve) => {
										loadAutoPlaylistAsync(item, i).then((handleList = null) => {
											if (this.properties.bBlockUpdateAutoPls[1] && !pop.isEnabled()) {
												pop.enable(true, 'Updating AutoPls...', 'Updating AutoPlaylists...\nPanel will be disabled during the process.');
											}
											if (handleList && item.size) {
												const bUpdated = this.updateTags(handleList, item);
												if (bUpdated) {console.log('Playlist Manager: Auto-tagging done for playlist ' + item.name);}
											}
											if (handleList && (cacheSize !== item.size || cacheDuration !== item.duration)) {
												console.log('Updating ' + (item.isAutoPlaylist ? 'AutoPlaylist' : 'Smart Playlist') + ' size: ' + item.name);
												if (item.extension === '.xsp') {
													if (item.hasOwnProperty('type') && item.type === 'songs') {
														let xspPlaylist = this.dataXsp.find((pls) => {return pls.name === item.name;});
														if (xspPlaylist) {
															xspPlaylist.size = item.size;
															xspPlaylist.duration = item.duration;
														}
													}
												}
												this.repaint();
											}
											resolve('done');
										});
									}));
								} else {
									promises.push(new Promise((resolve) => {resolve('done');})); // To ensure logging, saving and dynamic menu update
								}
							}
						}
						if (item.isAutoPlaylist) {this.dataAutoPlaylists.push(item);}
						else if (item.extension === '.xsp') {this.dataXsp.push(item);}
					} else if (item.extension === '.fpl') {
						this.dataFpl.push(item);
					} else if (item.extension === '.ui') {
						this.dataUI.push(item);
					} else if (item.isFolder) {
						this.dataFolder.push(item);
					}
				});
				if (promises.length) { // Updates this.dataAutoPlaylists when all are processed
					Promise.all(promises).then((_) => {
						test.Print(); 
						this.save();
						if (this.properties.bBlockUpdateAutoPls[1] && pop.isEnabled()) {pop.disable(true);}
					});
				}
			}
			this.itemsAutoplaylist = this.dataAutoPlaylists.length;
			this.itemsFpl = this.dataFpl.length;
			this.itemsXsp = this.dataXsp.length;
			this.itemsFolder = this.dataFolder.length;
			this.data = [];
			if (!this.bLiteMode) {
				this.data = loadPlaylistsFromFolder(this.playlistsPath).map((item) => {
						if (item.extension === '.fpl') { // Workaround for fpl playlist limitations... load cached playlist size and other data
							if (this.bFplLock) {item.isLocked = true;}
							let fplPlaylist = this.dataFpl.find((pls) => {return pls.name === item.name;});
							if (fplPlaylist) {
								item.category = fplPlaylist.category;
								item.tags = fplPlaylist.tags;
								item.size = fplPlaylist.size;
								item.duration = fplPlaylist.duration;
								item.author = fplPlaylist.author;
								item.description = fplPlaylist.description;
							}
							if (!this.properties.bSetup[1]) {this.fplPopup();}
						} else if (item.extension === '.pls') {
							if (!this.properties.bSetup[1]) {this.plsPopup();}
						} else if (item.extension === '.xspf') {
							if (!this.properties.bSetup[1]) {this.xspfPopup();}
						} else if (item.extension === '.xsp') {
							let xspPlaylist = this.dataXsp.find((pls) => {return pls.name === item.name;});
							if (xspPlaylist) {
								item.category = xspPlaylist.category;
								item.tags = xspPlaylist.tags;
								item.size = xspPlaylist.size;
								item.duration = xspPlaylist.duration;
								item.isLocked = xspPlaylist.isLocked;
								item.author = xspPlaylist.author;
								item.description = xspPlaylist.description;
							}
							if (!this.properties.bSetup[1]) {this.xspPopup();}
						}
						return item;
					});
			}
			this.data = this.data.concat(this.dataAutoPlaylists);
			// Auto-Tags & Actions
			this.data.forEach((item, z) => {
				let bSave = false;
				let oriTags = [...item.tags];
				// Auto-Tags
				if (this.bAutoLoadTag && item.tags.indexOf('bAutoLoad') === -1) {item.tags.push('bAutoLoad'); bSave = true;}
				if (this.bAutoLockTag && item.tags.indexOf('bAutoLock') === -1) {item.tags.push('bAutoLock'); bSave = true;}
				if (this.bMultMenuTag && item.tags.indexOf('bMultMenu') === -1) {item.tags.push('bMultMenu'); bSave = true;}
				if (this.bAutoCustomTag) {
					this.autoCustomTag.forEach( (tag) => {
						if (!(new Set(item.tags).has(tag))) {item.tags.push(tag); bSave = true;}
					});
				}
				if (bSave) {
					// Backup
					const path = item.path || '';
					const backPath = path && path.length? path + '.back' : '';
					if (item.extension === '.m3u' || item.extension === '.m3u8' || item.extension === '.xspf') {_copyFile(path, backPath);}
					// Edit
					let bDone, reason;
					if (item.extension === '.m3u' || item.extension === '.m3u8') {
						[bDone, reason] = editTextFile(path,'#TAGS:' + oriTags.join(';'),'#TAGS:' + item.tags.join(';'), this.bBOM); // No BOM
						if (!bDone && reason === 1) { // Retry with new header
							bDone = rewriteHeader(this, item); 
							if (bDone) {bDone = editTextFile(path,'#TAGS:' + oriTags.join(';'),'#TAGS:' + item.tags.join(';'), this.bBOM);} // No BOM
						}
					} else if (item.extension === '.xspf') {
						[bDone, reason] = editTextFile(path,'<meta rel="tags">' + oriTags.join(';'),'<meta rel="tags">' + item.tags.join(';'), this.bBOM); // No BOM
						if (!bDone && reason === 1) { // Retry with new header
							bDone = rewriteHeader(this, item); 
							if (bDone) {bDone = editTextFile(path,'<meta rel="tags">' + oriTags.join(';'),'<meta rel="tags">' + item.tags.join(';'), this.bBOM);} // No BOM
						}
					} else {bDone = true;} // Another format? Skip
					if (!bDone) {
						_renameFile(backPath, path); // Restore backup in case something goes wrong
						console.log('Error writing Auto-Tag(s) to playlist file: ' + item.name + '(' + path + ')\nThis usually happens when the playlist has been created by an external program. Load the playlist within foobar2000 and force and update to save it with the required format.');
						console.log('Playlist manager: Restoring backup...');
					} else if (backPath.length && _isFile(backPath)) {_deleteFile(backPath);}
				}
				// Perform Auto-Tags actions
				if (this.bApplyAutoTags) {
					if (item.tags.indexOf('bAutoLock') !== -1) {item.isLocked = true;}
				}
			});
			this.dataAll = [...this.data];
		}
		// Playlists on UI
		if (this.bAllPls) {
			// Remove any previous UI pls on update
			this.indexes = [];
			this.dataAll = this.dataAll.filter((pls) => {return pls.extension !== '.ui';});
			this.data = this.data.filter((pls) => {return pls.extension !== '.ui';});
			// And refresh
			this.dataFoobar = [];
			const fooPls = getPlaylistNames();
			fooPls.forEach((pls) => {
				if (!this.dataAll.some((dataPls) => {return dataPls.nameId === pls.name;})) {
					if (!this.dataFoobar.some((dataPls) => {return dataPls.nameId === pls.name;})) { // Remove duplicates
						const now = Date.now();
						const item = new oPlaylist({
							name: pls.name,
							extension: '.ui',
							size: plman.PlaylistItemCount(pls.idx),
							bLocked: plman.IsPlaylistLocked(pls.idx),
							category: 'fooPls',
							duration: plman.GetPlaylistItems(pls.idx).CalcTotalDuration(),
							author: 'Foobar2000',
							created: now,
							modified: now
						});
						const cacheItem = this.dataUI.find((dataPls) => {return dataPls.nameId === item.name;});
						if (cacheItem) {
							item.created = cacheItem.created;
							item.modified = cacheItem.modified;
							item.tags = cacheItem.tags;
							item.category = cacheItem.category;
						}
						this.dataFoobar.push(item);
					}
				}
			});
			if (this.dataFoobar.length) {
				this.dataUI = [...this.dataFoobar];
				this.dataAll = this.dataAll.concat(this.dataFoobar);
				this.data = this.data.concat(this.dataFoobar);
			}
			this.itemsFoobar = this.dataFoobar.length;
		} else {this.itemsFoobar = 0;}
		// Folders
		if (this.itemsFolder) {
			if (!bReuseData) {
				this.dataFolder.forEach((folder) => {
					const list = new Set(folder.pls.map((subPls) => subPls.nameId + subPls.extension));
					folder.pls = folder.pls.map((subPls) => { // Find matches by name and extension, filter duplicates or non found items
						const id = subPls.nameId + subPls.extension;
						if (list.has(id)) {
							list.delete(id);
							const subItem = subPls.isFolder
								? this.dataFolder.find((folder) => (folder.nameId === subPls.nameId))
								: this.data.find((pls) => (pls.nameId === subPls.nameId && pls.extension === subPls.extension));
							if (subItem) {
								subItem.inFolder = folder.nameId;
								return subItem;
							} else {return null;}
						} else {
							return null;
						}
					}).filter(Boolean);
					this.addFolderProperties(folder);
				});
				this.data = this.data.filter((item) => !this.isInFolder(item));
				this.data = this.data.concat(this.dataFolder);
				this.dataAll = this.dataAll.concat(this.dataFolder);
			} else {
				this.dataAll.forEach((folder) => {
					if (folder.isFolder) {
						folder.pls.forEach((subPls, i, thisArr) => {
							if (subPls.extension === '.ui') {
								const idx = this.dataUI.findIndex((pls) => pls.nameId === subPls.nameId);
								if (idx !== -1) {
									thisArr[i] = this.dataUI[idx];
									thisArr[i].inFolder = folder.nameId;
								} else {thisArr[i] = null;}
							};
						});
						folder.pls = folder.pls.filter(Boolean);
						this.addFolderProperties(folder);
					}
				});
				this.data = this.data.filter((item) => !this.isInFolder(item));
			}
		}
		// Always
		this.items = this.data.length;
		this.itemsAll = this.dataAll.length;
		let totalFileSize = 0;
		for (let i = 0; i < this.itemsAll; i++) {
			totalFileSize += this.dataAll[i].fileSize; // For auto-updating check...
		}
		this.totalFileSize = totalFileSize; // Better to set it on one step to not call autoupdate in the middle of this update!
		this.sort(); // Sorts data according to current sort state
		if (!bMaintainFocus) {this.offset = 0;} // Don't move the list focus...
		else {this.jumpLastPosition();}
		this.save(bInit); // Updates this.dataAutoPlaylists
		this.itemsAutoplaylist = this.dataAutoPlaylists.length;
		if (this.bUpdateAutoplaylist) {this.bUpdateAutoplaylist = false;}
		if (!bInit && !isArrayEqual(oldCategories, this.categories())) { // When adding new files, new categories may appear, but those must not be filtered! Skip this on init
			this.categoryState = this.categoryState.concat([...new Set(this.categories()).difference(new Set(oldCategories))]); // Add new ones
			this.categoryState = [...new Set(this.categoryState).intersection(new Set(this.categories()))]; // Remove missing ones
		}
		if (!bInit && !isArrayEqual(oldTags, this.tags())) { // When adding new files, new tags may appear, but those must not be filtered! Skip this on init
			this.tagState = this.tagState.concat([...new Set(this.tags()).difference(new Set(oldTags))]); // Add new ones
			this.tagState = [...new Set(this.tagState).intersection(new Set(this.tags()))]; // Remove missing ones
		}
		this.headerTextUpdate();
		if (!bNotPaint){this.repaint();}
		if (this.bCheckDuplWarnings) {this.checkDuplicates();}
		clearInterval(delay);
	}
	
	this.checkDuplicates = (bSkipUI = true) => {
		const dataNames = new Set();
		const reportDup = new Set();
		this.dataAll.forEach((pls) => {
			if (bSkipUI && pls.extension === '.ui') {return;}
			if (dataNames.has(pls.name)) {reportDup.add(pls.name + ': ' + (pls.path ? pls.path : pls.isAutoPlaylist ? '-AutoPlaylist-' : pls.extension === '.ui' ? '- UI playlist-' : ''));} 
			else {dataNames.add(pls.name);}
		});
		if (reportDup.size) {
			fb.ShowPopupMessage('Duplicated playlist names within the manager are not allowed. Rename them:\n\n' + [...reportDup].join('\n'), window.Name);
		}
	}
	
	this.updateAllUUID = () => {
		this.dataAll.forEach((pls, z) => {if (pls.extension !== '.pls' && pls.extension !== '.ui') {this.updateUUID(pls, z);}}); // Changes data on the other arrays too since they link to same object
		this.update(true, true);
		this.filter();
	}
	
	this.updateUUID = (playlistObj, z) => {
		const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
		const oldName = playlistObj.name;
		const oldId = playlistObj.ud;
		const oldNameId = playlistObj.nameId;
		const newId = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate(), true) : ''; // May have enabled/disabled UUIDs just before renaming
		const newNameId = oldName + ((this.bUseUUID) ? newId : '');
		if (newNameId !== oldNameId) {
			playlistObj.id = newId;
			playlistObj.nameId = newNameId;
			let duplicated = plman.FindPlaylist(newNameId);
			if (duplicated !== -1) { // Playlist already exists on foobar2000...
				fb.ShowPopupMessage('Duplicated playlist names within foobar2000 are not allowed: ' + oldName + '\n' + 'Choose another unique name for renaming.', window.Name);
			} else {
				const plsIdx = plman.FindPlaylist(oldNameId);
				if (plsIdx !== -1) {
					if (playlistObj.isAutoPlaylist || playlistObj.extension === '.fpl' || playlistObj.extension === '.xsp' || playlistObj.extension === '.ui') {
						this.updatePlman(newNameId, oldNameId); // Update with new id
					} else {
						const path = playlistObj.path;
						if (_isFile(path)) {
							if (!playlistObj.isLocked) {
								const backPath = path + '.back';
								_copyFile(path, backPath);
								let bDone, reason;
								if (playlistObj.extension === '.m3u' || playlistObj.extension === '.m3u8') {
										let originalStrings = ['#PLAYLIST:' + oldName, '#UUID:' + oldId];
										let newStrings = ['#PLAYLIST:' + oldName, '#UUID:' + newId];
										[bDone, reason] = editTextFile(path, originalStrings, newStrings, this.bBOM); // No BOM
										if (!bDone && reason === 1) { // Retry with new header
											bDone = rewriteHeader(this, playlistObj); 
											if (bDone) {bDone = editTextFile(path, originalStrings, newStrings, this.bBOM);}
										}
								} else if (playlistObj.extension === '.xspf') {
									let originalStrings = ['<title>' + oldName, '<meta rel="uuid">' + oldId];
									let newStrings = ['<title>' + oldName, '<meta rel="uuid">' + newId];
									[bDone, reason] = editTextFile(path, originalStrings, newStrings, this.bBOM); // No BOM
									if (!bDone && reason === 1) { // Retry with new header
										bDone = rewriteHeader(this, playlistObj); 
										if (bDone) {bDone = editTextFile(path, originalStrings, newStrings, this.bBOM);}
									}
								} else {bDone = true;}
								if (!bDone) {
									fb.ShowPopupMessage('Error editing playlist file: ' + oldNameId + ' --> ' + newNameId + '\n\nPath: ' + path + '\n\nRestoring backup...', window.Name);
									_renameFile(backPath, path); // Restore backup in case something goes wrong
									console.log('Playlist manager: Restoring backup...');
								} else {
									if (_isFile(backPath)) {_deleteFile(backPath);}
									this.updatePlman(newNameId, oldNameId); // Update with new id
								}
							}
						} else {fb.ShowPopupMessage('Playlist file does not exist: ' + playlistObj.name + '\nPath: ' + path, window.Name);}
					}
				}
			}
		}
		clearInterval(delay);
	}
	
	this.getPlaylistNum = (bAll = false) => {
		return (bAll ? this.itemsAll : this.itemsAll - this.itemsAutoplaylist - this.itemsFoobar - this.itemsFolder);
	}
	
	this.switchTracking = (forced = null, bNotify = false) => {
		this.bTracking = forced !== null ? forced : !this.bTracking;
		if (this.bTracking) {
			this.cacheLibTimer = debouncedCacheLib(false, 'Updating...');
			this.clearSelPlaylistCache();
		} else if (this.cacheLibTimer !== null) {
			clearTimeout(this.cacheLibTimer);
			this.cacheLibTimer = null;
			this.bLibraryChanged = true;
		}
		if (bNotify) {window.NotifyOthers('Playlist manager: switch tracking', this.bTracking);}
		this.repaint();
		return this.bTracking;
	}
	
	this.backupRestore = () => {
		const files = getFiles(this.playlistsPath, new Set(['.back']));
		if (files.length) {
			const answer = WshShell.Popup('Playlist(s) backup file(s) have been found.\nDo you want to restore them?\n(Pressing \'No\' will open the playlists folder)\n\n' + files.map((f) => f.replace(this.playlistsPath, '')).joinEvery(', ', 3), 0, window.Name, popup.question + popup.yes_no);
			if (answer === popup.yes) {
				files.forEach((file) => _renameFile(file, file.replace('.back', '')));
				this.update(void(0), void(0), currentItemIndex);
				return true;
			}
			_explorer(this.playlistsPath);
		}
		return false;
	}
	
	this.disableAutosaveForPls = (nameId) => {
		if (this.disableAutosave.indexOf(nameId) === -1) {
			this.disableAutosave.push(nameId);
			return true;
		}
		return salse;
	}
	
	this.enableAutosaveForPls = (nameId) => {
		const idx = this.disableAutosave.indexOf(nameId);
		if (idx !== -1) {
			this.disableAutosave.splice(idx, 1);
			return true;
		}
		return false;
	}
	
	this.enableAutosave = () => {
		this.disableAutosave.length = 0;
		return true;
	}
	
	this.isAutosave = (nameId) => {
		return this.disableAutosave.indexOf(nameId) === -1;
	}
	
	this.checkTrackedFolderChanged = () => {
		if (this.bLiteMode) {return false;}
		const test = bProfile ? new FbProfiler(window.Name + ': ' + 'checkTrackedFolderChanged') : null;
		const playlistPathArray = getFiles(this.playlistsPath, loadablePlaylistFormats); // Workaround for win7 bug on extension matching with utils.Glob()
		const playlistPathArrayLength = playlistPathArray.length;
		let bDone = false;
		if (playlistPathArrayLength !== (this.getPlaylistNum())) {bDone = true;}
		else {
			let totalFileSize = 0;
			for (let i = 0; i < playlistPathArrayLength; i++) {
				totalFileSize += utils.GetFileSize(playlistPathArray[i]);
				if (totalFileSize > this.totalFileSize) {break;}
			}
			if (totalFileSize !== this.totalFileSize) {bDone = true;}
		}
		if (bProfile) {test.Print();}
		return bDone;
	}

	this.init = () => {
		
		this.save = (bInit = false) => {
			this.dataAutoPlaylists = [];
			this.dataFpl = [];
			this.dataXsp = [];
			this.dataUI = [];
			this.dataFolder = [];
			if (this.dataAll && this.dataAll.length) {
				this.dataAll.forEach((item) => {
					if (item.isAutoPlaylist) { // Saves autoplaylists to json
						this.dataAutoPlaylists.push(item);
					} else if (item.extension === '.fpl') { // Save fpl size and name ID cache too
						this.dataFpl.push(item);
					} else if (item.extension === '.xsp') { // Save xsp as autoplaylists
						this.dataXsp.push(item);
					} else if (item.extension === '.ui') { // Save UI creation and last modified
						this.dataUI.push(item);
					} else if (item.isFolder) { // Save folders
						this.dataFolder.push(item);
					}
				});
				const data = clone([...this.dataAutoPlaylists, ...this.dataFpl, ...this.dataXsp, ...this.dataUI, ...this.dataFolder]);
				const formatFolder = (pls) => {
					if (pls.hasOwnProperty('pls')) {
						const list = new Set(pls.pls.map((subPls) => subPls.nameId + subPls.extension));
						pls.pls = pls.pls.map((subPls) => {
							const id = subPls.nameId + subPls.extension;
							if (list.has(id)) {
								list.delete(id);
								if (subPls.isFolder) {
									return {
										nameId: subPls.nameId,
										isFolder: true
									};
								} else {
									return {
										nameId: subPls.nameId,
										extension: subPls.extension
									};
								}
							} else {
								return null;
							}
						}).filter(Boolean);
					}
					return pls;
				};
				const stripMeta = ['sortIdx', 'inFolder'];
				data.forEach((pls) => {
					stripMeta.forEach((key) => delete pls[key]);
					// Strip unnecessary folder data and filter duplicates
					if (pls.hasOwnProperty('pls')) {
						formatFolder(pls);
					}
				});
				_save(this.filename, JSON.stringify(data, this.replacer, '\t'), this.bBOM); // No BOM
			}
			if (!bInit) {
				if (this.bDynamicMenus) {
					this.createMainMenuDynamic().then((result) => {
						this.exportPlaylistsInfo(); callbacksListener.checkPanelNamesAsync();});
					}
				else if (this.mainMenuDynamic.length) {this.deleteMainMenuDynamic();}
			}
		}
		
		this.addToData = (objectPlaylist) => {
			const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
			if (isArray(objectPlaylist)) {
				const dataIdx = [];
				const dataAllIdx = [];
				for (const objectPlaylist_i of objectPlaylist) {
					const newIdx = this.addToData(objectPlaylist_i);
					dataIdx.push(newIdx.dataIdx);
					dataAllIdx.push(newIdx.dataAllIdx);
				}
				return {dataIdx, dataAllIdx};
			}
			if (objectPlaylist.isAutoPlaylist) {
				this.dataAutoPlaylists.push(objectPlaylist);
				this.itemsAutoplaylist++;
			} else if (objectPlaylist.extension === '.fpl') {
				this.dataFpl.push(objectPlaylist);
				this.itemsFpl++;
			} else if (objectPlaylist.extension === '.xsp') {
				this.dataXsp.push(objectPlaylist);
				this.itemsXsp++;
			} else if (objectPlaylist.isFolder) {
				this.dataFolder.push(objectPlaylist);
				this.itemsFolder++;
			}
			const dataIdx = this.data.push(objectPlaylist) - 1;
			this.items++;
			const dataAllIdx = this.dataAll.push(objectPlaylist) - 1;
			this.itemsAll++;
			clearInterval(delay);
			return {dataIdx, dataAllIdx}
		}
		
		this.editData = (objectPlaylist, properties, bSave = false) => {
			const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
			if (isArray(objectPlaylist)) {
				for (const objectPlaylist_i of objectPlaylist) {this.editData(objectPlaylist_i);}
				return;
			}
			const index = this.dataAll.indexOf(objectPlaylist);
			if (index !== -1) { // Changes data on the other arrays too since they link to same object
				Object.keys(properties).forEach((property) => {this.dataAll[index][property] = properties[property];});
			} else {console.log('Playlist Manager: error editing playlist object from \'this.dataAll\'. Index was expect, but got -1.\n' + JSON.stringify(objectPlaylist));}
			if (bSave) {this.save();}
			clearInterval(delay);
		}
		
		this.removeFromData = (objectPlaylist) => {
			const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
			if (isArray(objectPlaylist)) {
				for (const objectPlaylist_i of objectPlaylist) {this.removeFromData(objectPlaylist_i);}
				return;
			}
			let index;
			if (objectPlaylist.isAutoPlaylist) {
				index = this.dataAutoPlaylists.indexOf(objectPlaylist);
				if (index !== -1) {
					this.dataAutoPlaylists.splice(index, 1);
					this.itemsAutoplaylist--;
				} else {console.log('Playlist Manager: error removing playlist object from \'this.dataAutoPlaylists\'. Index was expect, but got -1.\n' + JSON.stringify(objectPlaylist));}
			} else if (objectPlaylist.extension === '.fpl') {
				index = this.dataFpl.indexOf(objectPlaylist);
				if (index !== -1) {
					this.dataFpl.splice(index, 1);
					this.itemsFpl--;
				} else {console.log('Playlist Manager: error removing playlist object from \'this.dataFpl\'. Index was expect, but got -1.\n' + JSON.stringify(objectPlaylist));}
			} else if (objectPlaylist.extension === '.xsp') {
				index = this.dataXsp.indexOf(objectPlaylist);
				if (index !== -1) {
					this.dataXsp.splice(index, 1);
					this.itemsXsp--;
				} else {console.log('Playlist Manager: error removing playlist object from \'this.dataXsp\'. Index was expect, but got -1.\n' + JSON.stringify(objectPlaylist));}
			} else if (objectPlaylist.isFolder) {
				index = this.dataFolder.indexOf(objectPlaylist);
				if (index !== -1) {
					this.dataFolder.splice(index, 1);
					this.itemsFolder--;
				} else {console.log('Playlist Manager: error removing playlist object from \'this.dataFolder\'. Index was expect, but got -1.\n' + JSON.stringify(objectPlaylist));}
			}
			index = this.data.indexOf(objectPlaylist);
			if (index !== -1) {
				this.data.splice(index, 1);
				this.items--;
			} else {console.log('Playlist Manager: error removing playlist object from \'this.data\'. Index was expect, but got -1.\n' + JSON.stringify(objectPlaylist));}
			index = this.dataAll.indexOf(objectPlaylist);
			if (index !== -1) {
				this.dataAll.splice(index, 1);
				this.itemsAll--;
			} else {console.log('Playlist Manager: error removing playlist object from \'this.dataAll\'. Index was expect, but got -1.\n' + JSON.stringify(objectPlaylist));}
			clearInterval(delay);
		}
		
		this.replacer = (key, value) => {
			return key === 'width' ? void(0) : value;
		}
		
		this.addFolder = (name = '', toFolder = null) => {
			if (!name.length) {
				try {name = utils.InputBox(window.ID, 'Enter folder name:', window.Name, name, true);}
				catch (e) {return false;}
				if (!name.length) {return false;}
				if (this.dataAll.some((pls) => pls.nameId === name)) {
					fb.ShowPopupMessage('Name already used: ' + name + '\n' + 'Choose an unique name for new folder.', window.Name);
					return false;
				}
			}
			const now = Date.now();
			const defaults = new oPlaylist({name, bLocked: false, category: '', author: 'Foobar2000', created: now, modified: now});
			const folder = {...defaults, isFolder: true, isOpen: false, pls: []};
			this.addFolderProperties(folder);
			// Add tags of current view
			if (this.tagState.indexOf(this.tags(0)) === -1) {this.tagState.forEach((tag) => {if (! new Set(folder.tags).has(tag)) {folder.tags.push(tag);}});}
			// Categories
			// Add Category of current view if none was forced
			if (this.categoryState.length === 1 && this.categoryState[0] !== this.categories(0) && !folder.category.length) {folder.category = this.categoryState[0];} 
			// Save
			this.addToData(folder);
			this.update(true, true); // We have already updated data before only for the variables changed
			this.filter();
			if (toFolder !== null) {
				this.addToFolder(folder, toFolder);
				this.save();
				if (this.methodState === this.manualMethodState()) {this.saveManualSorting();}
				this.sort();
				if (!toFolder.isOpen) {this.switchFolder(this.data.indexOf(toFolder)) && this.save();}
			}
			// Set focus on new playlist if possible (if there is an active filter, then pls may be not found on this.data)
			this.showPlsByObj(folder);
			return folder;
		}
		
		this.addFolderProperties = (folder) => {
			const filterData = this.filterData;
			Object.defineProperty(folder.pls, 'filtered', {
				configurable: true, enumerable: true,
				get: function () {
					return (this.length ? filterData({data: this, bReusePlsFilter: true, bSkipSearch: true}) : []);
				}
			});
			Object.defineProperty(folder.pls, 'lengthFilteredAll', {
				configurable: true, enumerable: true,
				get: function () {
					return this.filtered.length;
				}
			});
			Object.defineProperty(folder.pls, 'lengthFiltered', {
				configurable: true, enumerable: true,
				get: function () {
					return this.filtered.filter((item) => !item.isFolder).length;
				}
			});
			Object.defineProperty(folder.pls, 'lengthFilteredDeep', {
				configurable: true, enumerable: true,
				get: function () {
					const count = (acc, item) => {
						if (item.isFolder) {
							return acc + filterData({data: item.pls, bReusePlsFilter: true, bSkipSearch: true}).reduce(count, 0);
						} else {
							return acc + 1;
						}
					};
					return this.filtered.reduce(count, 0);
				}
			});
			Object.defineProperty(folder.pls, 'lengthDeep', {
				configurable: true, enumerable: true,
				get: function () {
					const count = (acc, item) => {
						if (item.isFolder) {
							return acc + item.pls.reduce(count, 0);
						} else {
							return acc + 1;
						}
					};
					return this.reduce(count, 0);
				}
			});
		}
		
		this.addToFolder = (pls, folderObj) => {
			if (this.isInFolder(pls)) {this.removeFromFolder(pls);}
			pls.inFolder = folderObj.nameId;
			folderObj.pls.push(pls);
		}
		
		this.removeFromFolder = (pls) => {
			const folder = this.data.find((item) => pls.inFolder === item.nameId && item.isFolder);
			if (!folder) {return false;}
			const idx = folder.pls.indexOf(pls);
			if (idx !== -1) {
				folder.pls.splice(idx, 1);
				pls.inFolder = '';
				return true;
			}
			return false;
		}
		
		this.isInFolder =(pls) => {
			return (pls.hasOwnProperty('inFolder') && typeof pls.inFolder !== 'undefined' && pls.inFolder !== null && pls.inFolder.length > 0);
		}
		
		this.addUIplaylist = ({name = 'New playlist', bInputName = !name.length, toFolder = null} = {}) => {
			let input = name;
			if (bInputName) {
				input = Input.string('string', name, 'Input playlist name:', 'Playlist Manager', 'New playlist');
				if (input === null && !Input.isLastEqual) {return -1;}
			}
			let i = 0;
			let newName;
			while (!newName || plman.FindPlaylist(newName) !== -1) {
				newName = (input || 'New playlist') + (i ? ' ' + _p(i) : '');
				i++;
			}
			if (this.dataAll.some((pls) => pls.nameId === newName)) {
				fb.ShowPopupMessage('Name already used: ' + newName + '\n\nChoose another unique name for renaming.', window.Name);
				return -1;
			}
			plman.ActivePlaylist = plman.CreatePlaylist(plman.PlaylistCount, newName);
			// Set focus on new playlist if possible
			if (plman.ActivePlaylist !== -1) {
				setTimeout(() => { // Required since input popup invokes move callback after this func
					if (newName === plman.GetPlaylistName(plman.ActivePlaylist)) {
						const objectPlaylist = this.data.find((pls) => {return pls.nameId === newName;})
						if (toFolder !== null && objectPlaylist !== null) {
							this.addToFolder(objectPlaylist, toFolder);
							this.save();
							if (this.methodState === this.manualMethodState()) {this.saveManualSorting();}
							this.sort();
							if (!toFolder.isOpen) {this.switchFolder(this.data.indexOf(toFolder)) && this.save();}
						}
						this.cacheLastPosition();
						this.showCurrPls();
					}
				}, 10);
			}
			return plman.ActivePlaylist;
		}
		
		this.addAutoplaylist = (pls = null, bEdit = true, toFolder = null) => {
			// Check if there are initial values
			const bPls = pls ? true : false;
			const hasName = bPls && pls.hasOwnProperty('name'), hasQuery = bPls && pls.hasOwnProperty('query'), hasSort = bPls && pls.hasOwnProperty('sort');
			const hasSize = bPls && pls.hasOwnProperty('size') && pls.size !== '?', hasCategory = bPls && pls.hasOwnProperty('category');
			const hasTags = bPls && pls.hasOwnProperty('tags') && pls.tags.length, hasTrackTags = bPls && pls.hasOwnProperty('trackTags') && pls.trackTags.length;
			// Create oPlaylist
			let newName = hasName ? pls.name : '';
			if (!newName.length || bEdit) {
				try {newName = utils.InputBox(window.ID, 'Enter AutoPlaylist name:', window.Name, newName, true);}
				catch (e) {return false;}
				if (!newName.length) {return false;}
			}
			const UUID = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate()) : '';
			const nameId = newName + UUID;
			if (this.dataAll.some((pls) => pls.nameId === nameId)) {
				fb.ShowPopupMessage('Name already used: ' + nameId + '\n\nChoose another unique name for renaming.', window.Name);
				return false;
			}
			let newQuery = hasQuery ? pls.query : '';
			if (!newQuery.length || bEdit) {
				try {newQuery = utils.InputBox(window.ID, 'Enter AutoPlaylist query:', window.Name, newQuery, true);}
				catch (e) {return false;}
			}
			if (!checkQuery(newQuery, false, true)) {fb.ShowPopupMessage('Query not valid:\n' + newQuery, window.Name); return false;}
			const newSort = !hasSort || bEdit ? utils.InputBox(window.ID, 'Enter sort pattern:\n\n(optional)', window.Name, hasSort ? pls.sort : '') : (hasSort ? pls.sort : '');
			const newForced = (newSort.length ? WshShell.Popup('Force sort?', 0, window.Name, popup.question + popup.yes_no) : popup.no) === popup.yes;
			const newQueryObj = {query: newQuery, sort: newSort, bSortForced: newForced};
			const handleList = hasSize && hasQuery && pls.query === newQuery ? null: fb.GetQueryItems(fb.GetLibraryItems(), stripSort(newQuery));
			const queryCount = hasSize && hasQuery && pls.query === newQuery ? pls.size : handleList.Count;
			const duration = hasSize && hasQuery && pls.query === newQuery ? pls.duration : handleList.CalcTotalDuration();
			const objectPlaylist = new oPlaylist({
				id: UUID,
				name: newName,
				size: queryCount,
				bAutoPlaylist: true,
				queryObj: newQueryObj, 
				category: hasCategory ? pls.category : '',
				tags: hasTags ? pls.tags : [],
				trackTags: hasTrackTags ? pls.trackTags : [],
				duration
			});
			// Auto-Tags
			if (this.bAutoLockTag && objectPlaylist.tags.indexOf('bAutoLock') === -1) {objectPlaylist.tags.push('bAutoLock');}
			if (this.bAutoLoadTag && objectPlaylist.tags.indexOf('bAutoLoad') === -1) {objectPlaylist.tags.push('bAutoLoad');}
			if (this.bMultMenuTag && objectPlaylist.tags.indexOf('bMultMenu') === -1) {objectPlaylist.tags.push('bMultMenu');}
			if (this.bAutoCustomTag) {this.autoCustomTag.forEach( (tag) => {if (! new Set(objectPlaylist.tags).has(tag)) {objectPlaylist.tags.push(tag);}});}
			// Add tags of current view
			if (this.tagState.indexOf(this.tags(0)) === -1) {this.tagState.forEach((tag) => {if (! new Set(objectPlaylist.tags).has(tag)) {objectPlaylist.tags.push(tag);}});}
			// Categories
			// Add Category of current view if none was forced
			if (this.categoryState.length === 1 && this.categoryState[0] !== this.categories(0) && !objectPlaylist.category.length) {objectPlaylist.category = this.categoryState[0];} 
			// Save
			this.addToData(objectPlaylist);
			this.update(true, true); // We have already updated data before only for the variables changed
			this.filter();
			if (toFolder !== null) {
				this.addToFolder(objectPlaylist, toFolder);
				this.save();
				if (this.methodState === this.manualMethodState()) {this.saveManualSorting();}
				this.sort();
				if (!toFolder.isOpen) {this.switchFolder(this.data.indexOf(toFolder)) && this.save();}
			}
			// Set focus on new playlist if possible (if there is an active filter, then pls may be not found on this.data)
			this.showPlsByObj(objectPlaylist);
			return objectPlaylist;
		}
		
		this.addSmartplaylist = (pls = null, bEdit = true, toFolder = null) => {
			this.xspPopup();
			// Check if there are initial values
			const bPls = pls ? true : false;
			const hasName = bPls && pls.hasOwnProperty('name'), hasQuery = bPls && pls.hasOwnProperty('query'), hasSort = bPls && pls.hasOwnProperty('sort');
			const hasSize = bPls && pls.hasOwnProperty('size') && pls.size !== '?', hasCategory = bPls && pls.hasOwnProperty('category');
			const hasTags = bPls && pls.hasOwnProperty('tags') && pls.tags.length, hasTrackTags = bPls && pls.hasOwnProperty('trackTags') && pls.trackTags.length;
			const hasLimit = bPls && pls.hasOwnProperty('limit') && pls.limit;
			// Create oPlaylist
			let newName = hasName ? pls.name : '';
			if (!newName.length || bEdit) {
				try {newName = utils.InputBox(window.ID, 'Enter Smart Playlist name', window.Name, newName, true);}
				catch (e) {return false;}
				if (!newName.length) {return false;}
			}
			const UUID = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate()) : '';
			const nameId = newName + UUID;
			if (this.dataAll.some((pls) => pls.nameId === nameId)) {
				fb.ShowPopupMessage('Name already used: ' + nameId + '\n\nChoose another unique name for renaming.', window.Name);
				return false;
			}
			let newQuery = hasQuery ? pls.query : '';
			if (!newQuery.length || bEdit) {
				try {newQuery = utils.InputBox(window.ID, 'Enter Smart Playlist query\n(#PLAYLIST# may be used as "source" too)', window.Name, newQuery, true);}
				catch (e) {return false;}
			}
			const bPlaylist = newQuery.indexOf('#PLAYLIST# IS') !== -1;
			if (!checkQuery(newQuery, false, true, bPlaylist)) {fb.ShowPopupMessage('Query not valid:\n' + newQuery, window.Name); return false;}
			const {rules, match} = XSP.getRules(newQuery);
			if (!rules.length) {fb.ShowPopupMessage('Query has no equivalence on XSP format:\n' + newQuery + '\n\nhttps://kodi.wiki/view/Smart_playlists/Rules_and_groupings', window.Name); return false;}
			const newSort = !hasSort || bEdit ? utils.InputBox(window.ID, 'Enter sort pattern\n\n(optional)', window.Name, hasSort ? pls.sort : '') : (hasSort ? pls.sort : '');
			const newForced = false;
			const newQueryObj = {query: newQuery, sort: newSort, bSortForced: newForced};
			const handleList = hasSize && hasQuery && pls.query === newQuery ? null: (!bPlaylist ? fb.GetQueryItems(fb.GetLibraryItems(), stripSort(newQuery)) : null);
			const queryCount = hasSize && hasQuery && pls.query === newQuery ? pls.size : (!bPlaylist ? handleList.Count : '?');
			const duration = hasSize && hasQuery && pls.query === newQuery ? pls.duration : (!bPlaylist ? handleList.CalcTotalDuration() : -1);
			let newLimit = 0;
			if (hasLimit) {
				if (isFinite(pls.limit)) {newLimit = pls.limit;}
			} else if (bEdit) {
				try {newLimit = Number(utils.InputBox(window.ID, 'Set limit of tracks to retrieve\n(0 equals Infinity)', window.Name, newLimit, true));}
				catch (e) {return false;}
				if (Number.isNaN(newLimit)) {return false;}
				if (!Number.isFinite(newLimit)) {newLimit = 0;}
			}
			const playlistPath = this.playlistsPath + sanitize(newName) + '.xsp';
			const objectPlaylist = new oPlaylist({
				id: UUID,
				path: playlistPath,
				name: newName,
				extension: '.xsp',
				size: queryCount,
				queryObj: newQueryObj,
				category: hasCategory ? pls.category : '',
				tags: hasTags ? pls.tags : [],
				trackTags: hasTrackTags ? pls.trackTags : [],
				limit: newLimit,
				duration,
				type: 'songs'
			});
			// Auto-Tags
			if (this.bAutoLockTag && objectPlaylist.tags.indexOf('bAutoLock') === -1) {objectPlaylist.tags.push('bAutoLock');}
			if (this.bAutoLoadTag && objectPlaylist.tags.indexOf('bAutoLoad') === -1) {objectPlaylist.tags.push('bAutoLoad');}
			if (this.bMultMenuTag && objectPlaylist.tags.indexOf('bMultMenu') === -1) {objectPlaylist.tags.push('bMultMenu');}
			if (this.bAutoCustomTag) {this.autoCustomTag.forEach( (tag) => {if (! new Set(objectPlaylist.tags).has(tag)) {objectPlaylist.tags.push(tag);}});}
			// Add tags of current view
			if (this.tagState.indexOf(this.tags(0)) === -1) {this.tagState.forEach((tag) => {if (! new Set(objectPlaylist.tags).has(tag)) {objectPlaylist.tags.push(tag);}});}
			// Categories
			// Add Category of current view if none was forced
			if (this.categoryState.length === 1 && this.categoryState[0] !== this.categories(0) && !objectPlaylist.category.length) {objectPlaylist.category = this.categoryState[0];} 
			if (rules.length) {
				const jspPls = XSP.emptyJSP('songs');
				jspPls.playlist.name = newName;
				jspPls.playlist.rules = rules;
				jspPls.playlist.match = match;
				jspPls.playlist.limit = newLimit;
				jspPls.playlist.sort = XSP.getOrder(newSort);
				const xspText = XSP.toXSP(jspPls);
				if (xspText && xspText.length) {bDone = _save(playlistPath, xspText.join('\r\n'));}
			} else {return false;}
			// Save
			this.addToData(objectPlaylist);
			this.update(true, true); // We have already updated data before only for the variables changed
			this.filter();
			if (toFolder !== null) {
				this.addToFolder(objectPlaylist, toFolder);
				this.save();
				if (this.methodState === this.manualMethodState()) {this.saveManualSorting();}
				this.sort();
				if (!toFolder.isOpen) {this.switchFolder(this.data.indexOf(toFolder)) && this.save();}
			}
			// Set focus on new playlist if possible (if there is an active filter, then pls may be not found on this.data)
			this.showPlsByObj(objectPlaylist);
			return objectPlaylist;
		}
		
		this.add = ({bEmpty = true, name = '', bShowPopups = true, bInputName = !name.length, toFolder = null} = {}) => { // Creates new playlist file, empty or using the active playlist. Changes both total size and number of playlists,,,
			if (!bEmpty && plman.ActivePlaylist === -1) {return;}
			const oldNameId = plman.GetPlaylistName(plman.ActivePlaylist);
			const oldName = removeIdFromStr(oldNameId);
			let input = name || '';
			if (bInputName) {
				let boxText = bEmpty ? 'Enter playlist name:' : 'Enter playlist name:\n(cancel to skip playlist file creation)\n\nIf you change the current name, then a duplicate of the active playlist will be created with the new name and it will become the active playlist.';
				try {input = utils.InputBox(window.ID, boxText, window.Name, (bEmpty ? '' : oldName) || input, true);} 
				catch(e) {return false;}
				if (!input.length) {return false;}
			}
			const newName = input;
			const oPlaylistPath = this.playlistsPath + sanitize(newName) + this.playlistsExtension;
			// Auto-Tags
			const oPlaylistTags = [];
			let objectPlaylist = null;
			if (this.bAutoLoadTag) {oPlaylistTags.push('bAutoLoad');}
			if (this.bAutoLockTag) {oPlaylistTags.push('bAutoLock');}
			if (this.bMultMenuTag) {oPlaylistTags.push('bMultMenu');}
			if (this.bAutoCustomTag) {this.autoCustomTag.forEach((tag) => {if (! new Set(oPlaylistTags).has(tag)) {oPlaylistTags.push(tag);}});}
			// Add tags of current view
			if (this.tagState.indexOf(this.tags(0)) === -1) {this.tagState.forEach((tag) => {if (! new Set(oPlaylistTags).has(tag)) {oPlaylistTags.push(tag);}});}
			// Categories
			// Add Category of current view
			let oPlaylistCategory = void(0);
			if (this.categoryState.length === 1 && this.categoryState[0] !== this.categories(0)) {oPlaylistCategory = this.categoryState[0];} 
			// Save file
			// const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer)
			if (!_isFile(oPlaylistPath)) { // Just for safety
				const UUID = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate()) : ''; // Last UUID or nothing for pls playlists...
				const nameId = newName + UUID;
				if (this.dataAll.some((pls) => pls.nameId === nameId)) {
					fb.ShowPopupMessage('Name already used: ' + nameId + '\n\nChoose another unique name for renaming.', window.Name);
					return false;
				}
				// Creates the file on the folder
				if (!_isFolder(this.playlistsPath)) {_createFolder(this.playlistsPath);} // For first playlist creation
				let done = savePlaylist({playlistIndex: (bEmpty ? -1 : plman.ActivePlaylist), handleList: (bEmpty ?  new FbMetadbHandleList() : null), playlistPath: oPlaylistPath, ext: this.playlistsExtension, playlistName: newName, UUID, category: oPlaylistCategory, tags: oPlaylistTags, relPath: (this.bRelativePath ? this.playlistsPath : ''), bBom: this.bBOM});
				if (done) {
					const now = Date.now();
					objectPlaylist = new oPlaylist({
						id: UUID,
						path: oPlaylistPath,
						name: newName,
						extension: this.playlistsExtension,
						size: bEmpty ? 0 : plman.PlaylistItemCount(plman.ActivePlaylist),
						fileSize: utils.GetFileSize(done),
						category: oPlaylistCategory,
						tags: oPlaylistTags,
						duration: bEmpty ? -1 : plman.GetPlaylistItems(plman.ActivePlaylist).CalcTotalDuration(),
						created: now,
						modified: now
					});
					// Adds to list of objects and update variables
					this.addToData(objectPlaylist);
					if (bEmpty) { // Empty playlist
						let indexFound = plman.FindPlaylist(newName);
						if (indexFound === -1) { 
							let new_playlist = plman.CreatePlaylist(plman.PlaylistCount, newName + UUID);
							plman.ActivePlaylist = new_playlist;
						} else { // If there is a playlist with the same name, ask to bind
							let answer = bShowPopups ? WshShell.Popup('Created empty playlist file \'' + newName + '\' but there is already a playlist loaded with the same name.\nWant to update playlist file with all tracks from that playlist?', 0, window.Name, popup.question + popup.yes_no) : popup.no;
							if (answer === popup.yes) {
								plman.ActivePlaylist = indexFound;
								if (UUID.length) {
									const currentLocks = plman.GetPlaylistLockedActions(indexFound) || [];
									if (!currentLocks.includes('RenamePlaylist')) {plman.RenamePlaylist(indexFound, newName + UUID);}
									else {console.popup('add: can not rename playlist due to lock. ' + newName);}
								}
								this.updatePlaylist({playlistIndex: plman.ActivePlaylist, bCallback: true}); // This updates size too. Must replicate callback call since the playlist may not be visible on the current filter view!
							}
						}
					} else { // If we changed the name of the playlist but created it using the active playlist, then clone with new name
						if (newName !== oldName) {
							let new_playlist = plman.DuplicatePlaylist(plman.ActivePlaylist, newName + UUID);
							plman.ActivePlaylist = new_playlist;
						} else if (UUID.length) {
							const currentLocks = plman.GetPlaylistLockedActions(plman.ActivePlaylist) || [];
							if (!currentLocks.includes('RenamePlaylist')) {plman.RenamePlaylist(plman.ActivePlaylist, newName + UUID);}
							else {console.popup('add: can not rename playlist due to lock. ' + oldName);}
						}
					}
					// Warn about dead items
					const selItems = plman.GetPlaylistItems(plman.ActivePlaylist).Convert();
					if (selItems && selItems.length) {
						selItems.some((handle, i) => {
							if (!_isLink(handle.Path) && !_isFile(handle.Path)) {
								console.popup('Warning! There is at least one dead item among the tracks used to create the playlist, there may be more.\n\n(' + i + ') ' + handle.RawPath, window.Name, bShowPopups); 
								return true;
							}
							return false;
						});
					}
				} else {
					console.popup(
						'Playlist generation failed while writing file:\n' + oPlaylistPath +
						'\n\nTrace:' +
						'\nadd' + _p({bEmpty, name, bShowPopups, bInputName}.toStr()) + 
						 '\n\nsavePlaylist' + _p({playlistIndex: (bEmpty ? -1 : plman.ActivePlaylist), handleList: (bEmpty ?  'new FbMetadbHandleList()' : null), playlistPath: oPlaylistPath, ext: this.playlistsExtension, playlistName: newName, useUUID: this.optionsUUIDTranslate(), category: oPlaylistCategory, tags: oPlaylistTags, relPath: (this.bRelativePath ? this.playlistsPath : ''), bBom: this.bBOM}.toStr())
					, window.Name, bShowPopups);
					return false;
				}
			} else {
				console.popup('Playlist \'' + newName + '\' already exists on path: \'' + oPlaylistPath + '\'', window.Name, bShowPopups); 
				return false;
			}
			this.update(true, true); // We have already updated data
			this.filter();
			if (toFolder !== null) {
				this.addToFolder(objectPlaylist, toFolder);
				this.save();
				if (this.methodState === this.manualMethodState()) {this.saveManualSorting();}
				this.sort();
				if (!toFolder.isOpen) {this.switchFolder(this.data.indexOf(toFolder)) && this.save();}
			}
			// Set focus on new playlist if possible (if there is an active filter, then pls may be not found on this.data)
			this.showPlsByObj(objectPlaylist);
			return objectPlaylist;
		}
		
		this.loadPlaylistOrShow = (idx, bAlsoHidden = false) => {
			if (idx < 0 || (!bAlsoHidden && idx >= this.items) || (bAlsoHidden && idx >= this.itemsAll)) {
				console.log('Playlist Manager: Error loading/showing playlist. Index '+ _p(idx) + ' out of bounds. (loadPlaylistOrShow)');
				return false;
			}
			const pls = bAlsoHidden ? this.dataAll[idx] : this.data[idx];
			const duplicated = getPlaylistIndexArray(pls.nameId);
			if (duplicated.length === 0) {this.loadPlaylist(idx, bAlsoHidden);} 
			else if (duplicated.length === 1) {this.showBindedPlaylist(idx, bAlsoHidden);}
			else if (duplicated.length > 1 && pls.extension === '.ui') { // Cycle through all playlist with same name
				let i = 0;
				const ap = plman.ActivePlaylist;
				if (duplicated[duplicated.length - 1] !== ap) {while (duplicated[i] <= ap) {i++;}}
				plman.ActivePlaylist = duplicated[i];
			}
		}
		
		this.loadPlaylist = (idx, bAlsoHidden = false) => {
			if (idx < 0 || (!bAlsoHidden && idx >= this.items) || (bAlsoHidden && idx >= this.itemsAll)) {
				console.log('Playlist Manager: Error loading playlist. Index '+ _p(idx) + ' out of bounds. (loadPlaylist)');
				return false;
			}
			const pls = bAlsoHidden ? this.dataAll[idx] : this.data[idx];
			if (pls.extension === '.xsp' && pls.hasOwnProperty('type') && pls.type !== 'songs') { // Don't load incompatible files
				fb.ShowPopupMessage('XSP has a non compatible type: ' + pls.type + '\nPlaylist: ' + pls.name + '\n\nRead the playlist formats documentation for more info', window.Name); 
				return;
			}
			const oldNameId = pls.nameId;
			const oldName = pls.name;
			const duplicated = getPlaylistIndexArray(oldNameId);
			if (duplicated && duplicated.length > 1) {
				fb.ShowPopupMessage('You can not have duplicated playlist names within foobar2000: ' + oldName + '\n' + 'Please delete all playlist with that name first; you may leave one. Then try loading the playlist again.', window.Name);
				return false;
			} else {
				if (autoBackTimer && debouncedUpdate && !this.bLiteMode) {backup(this.properties.autoBackN[1], true);} // Async backup before future changes
				let [fbPlaylistIndex] = clearPlaylistByName(oldNameId); //only 1 index expected after previous check. Clear better than removing, to allow undo
				if (pls.isAutoPlaylist) { // AutoPlaylist
					if (!fbPlaylistIndex) {fbPlaylistIndex = plman.PlaylistCount;}
					if (!checkQuery(pls.query, true, true)) {fb.ShowPopupMessage('Query not valid:\n' + pls.query, window.Name); return;}
					plman.CreateAutoPlaylist(fbPlaylistIndex, oldName, pls.query, pls.sort, pls.bSortForced ? 1 : 0);
					plman.ActivePlaylist = fbPlaylistIndex;
					const handleList = plman.GetPlaylistItems(fbPlaylistIndex);
					this.editData(pls, {
						size: handleList.Count,
						duration: handleList.CalcTotalDuration()
					}, true); // Update size on load
					if (this.bAutoTrackTag && this.bAutoTrackTagAutoPls && handleList.Count) {
						this.updateTags(handleList, pls);
					}
				} else { // Or file
					if (_isFile(pls.path)) {
						if (!fbPlaylistIndex) {fbPlaylistIndex = plman.CreatePlaylist(plman.PlaylistCount, oldNameId);} //If it was not loaded on foobar2000, then create a new one
						plman.ActivePlaylist = fbPlaylistIndex;
						// Try to load handles from library first, greatly speeds up non fpl large playlists
						// But it will fail as soon as any track is not found on library
						// Always use tracked folder relative path for reading, it will be discarded if playlist does not contain relative paths
						const remDupl = pls.extension === '.xsp' && this.bRemoveDuplicatesSmartPls ? this.removeDuplicatesAutoPls : [];
						let bDone = loadTracksFromPlaylist(pls.path, plman.ActivePlaylist, this.playlistsPath, remDupl);
						if (!bDone) {plman.AddLocations(fbPlaylistIndex, [pls.path], true);}
						else if (pls.query) { // Update size on load for smart playlists
							const handleList = plman.GetPlaylistItems(fbPlaylistIndex);
							this.editData(pls, {
								size: handleList.Count, 
								duration: handleList.CalcTotalDuration()
							}, true);
							if (this.bAutoTrackTag && this.bAutoTrackTagAutoPls && handleList.Count) {
								this.updateTags(handleList, pls);
							}
						}
						if (pls.extension === '.fpl') { // Workaround for fpl playlist limitations...
							setTimeout(() => {this.updatePlaylistFpl(fbPlaylistIndex);}, 2000);
						}
					} else {fb.ShowPopupMessage('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name); return false;}
				}
			}
			this.lastPlsLoaded.push(pls);
			return true;
		}
		
		this.hasPlaylists = (names = []) => {
			const namesSet = new Set(names);
			this.dataAll.forEach((pls, idx) => {
				if (!namesSet.size) {return;}
				if (namesSet.has(pls.name)) {namesSet.delete(pls.name);}
			});
			return !namesSet.size;
		}
		
		this.getPlaylistsIdxByName = (names = []) => {
			let plsArr = [];
			const namesSet = new Set(names);
			this.dataAll.forEach((pls, idx) => {
				if (!namesSet.size) {return;}
				if (namesSet.has(pls.name)) {plsArr.push(idx); namesSet.delete(pls.name);}
			});
			return plsArr;
		}
		
		this.getPlaylistsIdxByObj = (objPls = []) => {
			let plsArr = [];
			const plsSet = new Set(objPls);
			this.dataAll.forEach((pls, idx) => {
				if (!plsSet.size) {return;}
				if (plsSet.has(pls)) {plsArr.push(idx); plsSet.delete(pls);}
			});
			return plsArr;
		}
		
		this.getHandleFromPlaylists = (names = [], bSort = true) => {
			let playlistsManager = new Set();
			let playlistsUI = new Set();
			const namesSet = new Set(names);
			// Try to match first playlists by manager
			this.dataAll.forEach((pls, idx) => {
				if (!namesSet.size) {return;}
				if (namesSet.has(pls.name)) {playlistsManager.add(idx); namesSet.delete(pls.name);}
			});
			// Otherwise playlists loaded
			namesSet.forEach((name) => {playlistsUI = playlistsUI.union(new Set(getPlaylistIndexArray(name)));});
			// Join
			let output = new FbMetadbHandleList();
			playlistsManager.forEach((idx) => {output.AddRange(this.getHandleFrom(idx));});
			playlistsUI.forEach((idx) => {output.AddRange(plman.GetPlaylistItems(idx));});
			if (bSort) {output.Sort();}
			return output;
		}
		
		this.getHandleFrom = (idx) => {
			const pls = this.dataAll[idx];
			let handleList = new FbMetadbHandleList();
			if (pls.isAutoPlaylist) { // AutoPlaylist
				if (!checkQuery(pls.query, true, true)) {console.popup('Query not valid:\n' + pls.query, window.Name);}
				else {
					handleList = fb.GetQueryItems(fb.GetLibraryItems(), pls.query);
					this.editData(pls, {size: handleList.Count, duration: handleList.CalcTotalDuration()}, true); // Update size on load
				}
			} else { // Or file
				if (_isFile(pls.path)) {
					// Try to load handles from library first, greatly speeds up non fpl large playlists
					// But it will fail as soon as any track is not found on library
					// Always use tracked folder relative path for reading, it will be discarded if playlist does not contain relative paths
					const remDupl = pls.extension === '.xsp' && this.bRemoveDuplicatesSmartPls ? this.removeDuplicatesAutoPls : [];
					handleList = getHandlesFromPlaylist(pls.path, this.playlistsPath, void(0), remDupl);
					if (handleList) {this.editData(pls, {size: handleList.Count, duration: handleList.CalcTotalDuration()}, true);}  // Update size on load for smart playlists
				} else {console.popup('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name);}
			}
			return handleList || new FbMetadbHandleList();
		}
		
		this.showBindedPlaylist = (idx, bAlsoHidden = false) => {
			if (idx < 0 || (!bAlsoHidden && idx >= this.items) || (bAlsoHidden && idx >= this.itemsAll)) {
				console.log('Playlist Manager: Error showing playlist. Index '+ _p(idx) + ' out of bounds. (showBindedPlaylist)');
				return false;
			}
			const pls = bAlsoHidden ? this.dataAll[idx] : this.data[idx];
			const newNameId = pls.nameId;
			const index = plman.FindPlaylist(newNameId);
			plman.ActivePlaylist = index;
		}
		
		this.removePlaylist = (idx, bAlsoHidden = false) => {
			if (idx < 0 || (!bAlsoHidden && idx >= this.items) || (bAlsoHidden && idx >= this.itemsAll)) {
				console.log('Playlist Manager: Error removing playlist. Index '+ _p(idx) + ' out of bounds. (removePlaylist)');
				return false;
			}
			const pls = bAlsoHidden ? this.dataAll[idx] : this.data[idx];
			// Adds timestamp to filename
			const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
			const bUI = pls.extension === '.ui';
			if (!pls.isAutoPlaylist && !bUI && !pls.isFolder) { // Only for not AutoPlaylists
				if (_isFile(pls.path)) {
					let newPath = pls.path.split('.').slice(0,-1).join('.').split('\\');
					const newName = newPath.pop() + '_ts_' + (new Date().toDateString() + Date.now()).split(' ').join('_');
					newPath = newPath.concat([newName]).join('\\') + pls.extension;
					_renameFile(pls.path, newPath);
					// And delete it
					// Beware of calling this while pressing shift. File will be removed without sending to recycle bin!
					if (utils.IsKeyPressed(VK_SHIFT)) {
						const debouncedRecycle = debounce(() => {
							if (utils.IsKeyPressed(VK_SHIFT)) {
								delayAutoUpdate();
								debouncedRecycle(newPath);
								return;
							} else {
								_recycleFile(newPath, true);
								console.log('Delete done');
							}
						}, this.autoUpdateDelayTimer);
						debouncedRecycle();
					} else {_recycleFile(newPath, true); console.log('Delete done');}
					this.editData(pls, {
						path: newPath,
					});
				} else {
					fb.ShowPopupMessage('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name);
					return;
				}
			}
			if (pls.isFolder) { // Folders must be closed first!
				if (pls.isOpen) {this.switchFolder(idx);}
				// Remove child items
				if (pls.pls.length) {
					pls.pls.forEach((item) => {
						this.removeFromFolder(item);
					});
				}
				// Remove from folder
				if (this.isInFolder(pls)) {
					this.removeFromFolder(pls);
				}
			}
			// Delete from data
			const oldNameId = pls.nameId;
			const duplicated = plman.FindPlaylist(oldNameId);
			const currentLocks = duplicated !== -1 ? plman.GetPlaylistLockedActions(duplicated) || [] : [];
			if (currentLocks.includes('RemovePlaylist') && bUI) {fb.ShowPopupMessage('UI-Playlist is locked: ' + pls.name, window.Name); return;}
			if (pls.size) {this.totalFileSize -= pls.size;}
			this.deletedItems.unshift(pls);
			this.removeFromData(pls); // Use this instead of this.data.splice(idx, 1) to remove from all data arrays!
			if (!bAlsoHidden) {this.cacheLastPosition(Math.min(idx, this.items - 1));}
			if (!bUI) {
				this.update(true, true, currentItemIndex); // Call this immediately after removal! If paint fires before updating things get weird
				// Delete category from current view if needed
				// Easy way: intersect current view + with refreshed list
				const categoryState = [...new Set(this.categoryState).intersection(new Set(this.categories()))];
				this.filter({categoryState});
			}
			clearInterval(delay);
			if (duplicated !== -1) {
				if (!currentLocks.includes('RemovePlaylist')) {
					const answer = bUI ? popup.yes : WshShell.Popup('Delete also the playlist loaded within foobar2000?', 0, window.Name, popup.question + popup.yes_no);
					if (answer === popup.yes) {
						plman.RemovePlaylistSwitch(duplicated);
					}
				}
			}
			// Needed after removing the playlist on UI
			if (bUI) {
				this.update(true, true, currentItemIndex);
				const categoryState = [...new Set(this.categoryState).intersection(new Set(this.categories()))];
				this.filter({categoryState});
				setTimeout(() => { // Required since input popup invokes move callback after this func!
					this.cacheLastPosition(Math.min(idx, this.items - 1));
					this.jumpLastPosition();
				}, 10);
			}
			// Remove item from current selection (otherwise it would crash)
			if (!bAlsoHidden && this.indexes.length && this.indexes.indexOf(idx) !== -1) {
				this.multSelect(idx);
			}
		}
		
		this.updatePlman = (name, oldName) => {
			let i = 0;
			while (i < plman.PlaylistCount) {
				if (plman.GetPlaylistName(i) === oldName) {
					const currentLocks = plman.GetPlaylistLockedActions(i) || [];
					if (currentLocks.includes('RenamePlaylist')) {i++; console.log('UI-Playlist is locked and can not be renamed: ' + oldName, window.Name); continue;}
					else {plman.RenamePlaylist(i, name);}
				} else {
					i++;
				}
			}
		}
		
		this.xspPopup = (bForce = false) => {
			if (!this.properties['bFirstPopupXsp'][1] || bForce) {
				this.properties['bFirstPopupXsp'][1] = true;
				overwriteProperties(this.properties); // Updates panel
				fb.ShowPopupMessage('Playlist manager has loaded a .xsp playlist (Smart Playlist) for the first time. This is an informative popup.\n\n-.xsp playlists, despite being a writable format, can not store extra metadata. Size and other data (UUID, category, lock status or tags) will be cached between sessions, as soon as it\'s set for the first time, on the panel.\n-By default they are set as locked files (so they will never be autosaved), since they behave like AutoPlaylists.\n-To edit category or tags, unlock the playlist, set the desired values and lock it again. The data will be saved between sessions.\n-Playlist size can only be retrieved when the playlist is loaded within foobar2000, so the first time it\'s loaded, the value will be stored for future sessions. Note size may change on subsequent loads if the query retrieves a different number of tacks.\n-Query, sort and limit of tracks may be edited following the same procedure done on AutoPlaylists.\n-Note not all queries and TF functions are allowed on Smart Playlists, due to compatibility reasons with Kodi and XBMC systems.\n-Queries will be translated into XBMC\'s format after editing them via popups, you can check the result on the tooltip.', 'Playlist Manager');
			}
			return;
		}
		this.xspfPopup = (bForce = false) => {
			if (!this.properties['bFirstPopupXspf'][1] || bForce) {
				this.properties['bFirstPopupXspf'][1] = true;
				overwriteProperties(this.properties); // Updates panel
				fb.ShowPopupMessage('Playlist manager has loaded a .xspf playlist for the first time. This is an informative popup.\n\n-.pls playlists format allow all extra data like UUID, category, lock status or tags, ... on file (like M3U format).\n-Items on these playlists are matched against the library by path like any other format.\n-In case files are not found by path, then it will try to match by tags using queries. Therefore .xspf playlists are shareable between different users/libraries, since they will work no matter the media structure.\n-Note query matching involves much more processing time, so it\'s much faster to use them as an \'standard\' playlist.\n-If you are using default another format (extension) on the panel, as soon as a playlist update is required on the file, it will be converted to the new format (auto-save or forcing update). This can be avoided by locking the file.', 'Playlist Manager');
			}
			return;
		}
		this.plsPopup = (bForce = false) => {
			if (!this.properties['bFirstPopupPls'][1] || bForce) {
				this.properties['bFirstPopupPls'][1] = true;
				overwriteProperties(this.properties); // Updates panel
				fb.ShowPopupMessage('Playlist manager has loaded a .pls playlist for the first time. This is an informative popup.\n\n-.pls playlists format doesn\'t allow extra data like UUID, category, lock status or tags, ... use .m3u or .m3u8 for full data support.\n-The related menu entries to set that data (or lock status) are disabled (greyed).\n-If you are using another default format (extension) on the panel, as soon as a playlist update is required on the file, it will be converted to the new format  (auto-save or forcing update). This can be avoided by locking the file.', 'Playlist Manager');
			}
			return;
		}
		this.fplPopup = (bForce = false) => {
			if (!this.properties['bFirstPopupFpl'][1]) {
				this.properties['bFirstPopupFpl'][1] = true;
				overwriteProperties(this.properties); // Updates panel
				fb.ShowPopupMessage('Playlist manager has loaded a .fpl playlist for the first time. This is an informative popup.\n\n-.fpl playlists are non writable, but size and other data (UUID, category, lock status or tags) may be cached between sessions as soon as it\'s set for the first time.\n-By default they are set as locked files (so they will never be autosaved), if you want to convert them to another editable extension, just force a playlist update.\n-To edit category or tags, unlock the playlist, set the desired values and lock it again. The data will be saved between sessions.\n-Playlist size can only be retrieved when the playlist is loaded within foobar2000, so the first time it\'s loaded, the value will be stored for future sessions.', 'Playlist Manager');
			}
			return;
		}
		
		this.initProperties = () => { // Some properties require code fired after setting them...
			let bDone = false;
			let removeProperties = {};
			let newProperties = {};
			if (!this.properties['methodState'][1]) {
				removeProperties['methodState'] = [this.properties['methodState'][0], null]; // need to remove manually since we change the ID (description)!
				// Fill description and first method will be default
				this.properties['methodState'][0] += Object.keys(this.sortMethods(false)); // We change the description, but we don't want to overwrite the value
				newProperties['methodState'] = [this.properties['methodState'][0], this.getMethodState()];
				bDone = true;
			} 
			if (!this.properties['sortState'][1]) { // This one changes according to the previous one! So we need to load the proper 'methodState'
				removeProperties['sortState'] = [this.properties['sortState'][0], null]; // need to remove manually since we change the ID (description)!
				// Fill description and first state of the method will be default
				let savedMethodState = window.GetProperty(this.properties['methodState'][0], this.getMethodState()) || this.getMethodState(); // Note this will get always a value
				this.properties['sortState'][0] += Object.keys(this.sortMethods(false)[savedMethodState]); // We change the description, but we don't want to overwrite the value
				newProperties['sortState'] = [this.properties['sortState'][0], this.getSortState()];
				bDone = true;
			}
			if (!this.properties['optionUUID'][1]) {
				removeProperties['optionUUID'] = [this.properties['optionUUID'][0], null]; // need to remove manually since lass step does not overwrite!
				newProperties['optionUUID'] = [this.properties['optionUUID'][0], this.optionsUUID().pop()]; // Last option is default
				bDone = true;
			} 
			if (Object.keys(removeProperties).length) {deleteProperties(removeProperties);} // Deletes old properties used as placeholders
			if (bDone) {  // Set new properties with description changed, but does not overwrites old values
				setProperties(newProperties, '', 0, false, false);
				this.properties = getPropertiesPairs(this.properties, '', 0, false); // And update
			}
		}
		
		this.checkConfig = ({bSilenSorting = false} = {}) => { // Forces right settings
			let bDone = false;
			// Check playlists path
			if (!this.playlistsPath.endsWith('\\')) {
				this.playlistsPath += '\\';
				this.playlistsPathDirName = this.playlistsPath.split('\\').filter(Boolean).pop();
				this.playlistsPathDisk = this.playlistsPath.split('\\').filter(Boolean)[0].replace(':','').toUpperCase();
				this.properties['playlistPath'][1] += '\\';
				bDone = true;
			}
			if (!_isFolder(this.playlistsPathDisk + ':\\')) {fb.ShowPopupMessage('Disk associated to tracked folder doesn\'t exist:\nTracked folder:\t' + this.playlistsPath +'\nDrive letter:\t' + this.playlistsPathDisk + ':\\\n\nReconfigure it at the header menu if needed.', window.Name);}
			// Check playlist extension
			if (!writablePlaylistFormats.has(this.playlistsExtension)){
				if (writablePlaylistFormats.has(this.playlistsExtension.toLowerCase())){
					this.playlistsExtension = this.playlistsExtension.toLowerCase();
				} else {
					fb.ShowPopupMessage('Wrong extension set at properties panel:' + '\n\'' + this.properties['extension'][0] + '\':\'' + this.playlistsExtension + '\'\n' + 'Only allowed ' + [...writablePlaylistFormats].join(', ') + '\nUsing \'.m3u8\' as fallback', window.Name);
					this.playlistsExtension = '.m3u8';
				}
				this.properties['extension'][1] = this.playlistsExtension;
				bDone = true;
			}
			// Check UUID option
			if (this.optionsUUID().indexOf(this.optionUUID) !== -1) {
				if (this.optionUUID !== this.optionsUUID().pop()) { // Last option is no UUID
					this.bUseUUID = true;
				} else {this.bUseUUID = false;}
			} else {
				fb.ShowPopupMessage('Wrong UUID method set at properties panel: \'' + this.optionUUID + '\'\n' + 'Only allowed: \n\n' + this.optionsUUID().join('\n') + '\n\nUsing default method as fallback', window.Name);
				this.bUseUUID = false;
			}
			// No UUID for .pls playlists since we can not save it into the format (and .fpl are never saved with native format)
			if (this.playlistsExtension === '.pls' && this.bUseUUID) {
				this.bUseUUID = false;
			}
			// Check sorting is valid
			if (!this.sortMethods(false).hasOwnProperty(this.methodState)) {
				if (!bSilenSorting) {
					fb.ShowPopupMessage('Wrong sorting method set at properties panel: \'' + this.methodState + '\'\n' + 'Only allowed: \n\n' + Object.keys(this.sortMethods(false)).join('\n') + '\n\nUsing default method as fallback', window.Name);
				}
				this.methodState = this.getMethodState(); // On first call first state of that method will be default
				this.properties['methodState'][1] = this.methodState;
				bDone = true;
			}
			if (!this.sortMethods(false)[this.methodState].hasOwnProperty(this.sortState)) {
				if (!bSilenSorting) {
					fb.ShowPopupMessage('Wrong sorting order set at properties panel: \'' + this.sortState + '\'\n' + 'Only allowed: ' + Object.keys(this.sortMethods(false)[this.methodState]) + '\nUsing default sort state as fallback', window.Name);
				}
				this.sortState = this.getSortState(); // On first call first state of that method will be default
				this.properties['sortState'][1] = this.sortState;
				bDone = true;
			}
			if (this.bSaveFilterStates) { // Rotate current filters until it matches the saved ones
				const rotations = this.properties['filterStates'][1].split(',');
				this.autoPlaylistStates = this.constAutoPlaylistStates().rotate(rotations[0]);
				this.lockStates = this.constLockStates().rotate(rotations[1]);
				this.extStates = this.constExtStates().rotate(rotations[2]);
				this.mbidStates = this.constMbidStates().rotate(rotations[3]);
			}
			// Check colors
			if (!this.colors || !Object.keys(this.colors).length) { // Sets default colors
				this.colors = {};
				this.colors.lockedPlaylistColor = RGB(...toRGB(0xFFDC143C)); // Red
				this.colors.autoPlaylistColor = blendColors(panel.colors.text, RGB(...toRGB(0xFFFF629B)), 0.6);
				this.colors.smartPlaylistColor = blendColors(panel.colors.text, RGB(...toRGB(0xFF65CC32)), 0.6);
				this.colors.selectedPlaylistColor = RGB(...toRGB(0xFF0080C0)); // Blue
				this.colors.uiPlaylistColor = blendColors(panel.colors.text, RGB(...toRGB(0xFF00AFFD)), 0.8); // Blue
				this.colors.folderColor = panel.colors.text;
				bDone = true;
			}
			if (this.colors && Object.keys(this.colors).length !== 5) { // Fills missing colors
				if (!this.colors.lockedPlaylistColor) {this.colors.lockedPlaylistColor = RGB(...toRGB(0xFFDC143C));} // Red
				if (!this.colors.autoPlaylistColor) {this.colors.autoPlaylistColor = blendColors(panel.colors.text, RGB(...toRGB(0xFFFF629B)), 0.6);}
				if (!this.colors.smartPlaylistColor) {this.colors.smartPlaylistColor = blendColors(panel.colors.text, RGB(...toRGB(0xFF65CC32)), 0.6);}
				if (!this.colors.selectedPlaylistColor) {this.colors.selectedPlaylistColor = RGB(...toRGB(0xFF0080C0));} // Blue
				if (!this.colors.uiPlaylistColor) {this.colors.uiPlaylistColor = blendColors(panel.colors.text, RGB(...toRGB(0xFF00AFFD)), 0.8);} // Blue
				if (!this.colors.folderColor) {this.colors.folderColor = panel.colors.text;}
				bDone = true;
			}
			if (this.searchInput) {
				this.searchInput.textcolor = panel.colors.highlight;
				this.searchInput.backcolor = panel.getColorBackground();
				this.searchInput.bordercolor = panel.getColorBackground();
				this.searchInput.backselectioncolor = this.colors.selectedPlaylistColor;
			}
			// Check Shortcuts
			const shortcutsL = this.getDefaultShortcuts('L');
			const shortcutsLKeys = shortcutsL.options.map((_) => {return _.key;});
			if (!this.lShortcuts || this.lShortcuts && !isArrayEqual(shortcutsLKeys, Object.keys(this.lShortcuts))) {
				if (!this.lShortcuts) {this.lShortcuts = {};}
				const shortcutsLActions = shortcutsL.actions.map((_) => {return _.key;});
				shortcutsLKeys.forEach((key) => {
					if (!this.lShortcuts.hasOwnProperty(key)) {this.lShortcuts[key] = shortcutsLActions[0];}
				});
				Object.keys(this.lShortcuts).forEach((key) => {
					if (shortcutsLKeys.indexOf(key) === -1) {delete this.lShortcuts[key];}
				});
				this.properties['lShortcuts'][1] = JSON.stringify(this.lShortcuts);
				bDone = true;
			}
			const shortcutsM = this.getDefaultShortcuts('M');
			const shortcutsMKeys = shortcutsM.options.map((_) => {return _.key;});
			if (!this.mShortcuts || this.mShortcuts && !isArrayEqual(shortcutsMKeys, Object.keys(this.mShortcuts))) {
				if (!this.mShortcuts) {this.mShortcuts = {};}
				const shortcutsMActions = shortcutsL.actions.map((_) => {return _.key;});
				shortcutsMKeys.forEach((key) => {
					if (!this.mShortcuts.hasOwnProperty(key)) {this.mShortcuts[key] = shortcutsMActions[0];}
				});
				Object.keys(this.mShortcuts).forEach((key) => {
					if (shortcutsMKeys.indexOf(key) === -1) {delete this.mShortcuts[key];}
				});
				this.properties['mShortcuts'][1] = JSON.stringify(this.mShortcuts);
				bDone = true;
			}
			// Check UI elements
			const uiELementsDef = JSON.parse(this.properties['uiElements'][3]);
			if (!isArrayEqual(Object.keys(this.uiElements), Object.keys(uiELementsDef))) {
				for (let key in uiELementsDef) {
					this.uiElements[key] = uiELementsDef[key];
				}
				this.properties['uiElements'][1] = JSON.stringify(this.uiElements);
				bDone = true;
			}
			const headerButtons = this.uiElements['Header buttons'].elements;
			const headerButtonsDef = uiELementsDef['Header buttons'].elements;
			if (!isArrayEqual(Object.keys(headerButtons), Object.keys(headerButtonsDef))) {
				for (let key in headerButtonsDef) {
					headerButtons[key] = headerButtonsDef[key];
				}
				this.properties['uiElements'][1] = JSON.stringify(this.uiElements);
				bDone = true;
			}
			// Check by features enabled
			const showMenus = JSON.parse(this.properties.showMenus[1]);
			const bSearch = this.uiElements['Search filter'].enabled; // this.searchInput is null at this point before painting
			if (!showMenus['Tags']) {
				if (bSearch && this.searchMethod.bTags) { // Check search
					this.searchMethod.bTags = false;
					bDone = true;
				}
			}
			if (!showMenus['Category']) {
				if (bSearch && this.searchMethod.bCategory) { // Check search
					this.searchMethod.bCategory = false;
					bDone = true;
				}
			}
			// Check filters
			const filters = this.properties['filterMethod'][1].split(',');
			const availableFilters = this.availableFilters();
			if (filters.some((filter) => !availableFilters.includes(filter))) {
				filters.forEach((filter, i) => {
					if (!availableFilters.includes(filter)) {
						filters[i] = availableFilters[0];
					}
				});
				this.properties['filterMethod'][1] = filters.join(',');
				// Update buttons
				buttonsPanel.buttons.filterOneButton.method = filters[0];
				buttonsPanel.buttons.filterTwoButton.method = filters[1];
				bDone = true;
			}
			// Check folders config
			if (this.folders.maxDepth === null) {this.folders.maxDepth = Infinity;}
			// Lite mode
			if (this.bLiteMode) {
				// Disable features
				const disabledFeatures = ['Tags', 'Online sync', 'Relative paths handling', 'Export and copy', 'File locks'];
				const showMenusDef = JSON.parse(this.properties.showMenus[3]);
				disabledFeatures.forEach((key) => {showMenusDef[key] = false;});
				this.properties.showMenus[3] = JSON.stringify(showMenusDef);
				// Disable tracking
				this.switchTracking(false);
				bDone = true;
			}
			return bDone;
		}
		
		this.checkConfigPostUpdate = (bDone) => { // Forces right settings
			// Restore categories shown between sessions if bSaveFilterStates is false, or at first init
			if (!this.categoryState || !this.categoryState.length || (!this.bSaveFilterStates && !isArrayEqual(this.categoryState, this.categories()))) {
				this.categoryState = this.categories(); // No need to save properties since it will be done at filter stage
			}
			if (!this.tagState || !this.tagState.length || (!this.bSaveFilterStates && !isArrayEqual(this.tagState, this.tags()))) {
				this.tagState = this.tags(); // No need to save properties since it will be done at filter stage
			}
			// Force search reset when bound to filters
			if (!this.bSaveFilterStates && this.searchMethod.bResetFilters && !this.searchMethod.bResetStartup) {
				this.searchMethod.bResetStartup = true;
			}
			// Set tooltip timer values
			this.tooltip.SetDelayTime(0, this.properties['iTooltipTimer'][1]); // TTDT_AUTOMATIC
			if (bDone) {overwriteProperties(this.properties);}
		}
		
		this.loadConfigFile = (file = this.filename.replace('.json','_config.json')) => {
			if (!file.length) {this.configFile = null; return;}
			if (_isFile(file)) {this.configFile = _jsonParseFileCheck(file, 'Config json', window.Name, utf8);}
			else {this.configFile = null;}
		}
		
		this.loadSortingFile = (file = this.filename.replace('.json','_sorting.json')) => {
			if (!file.length) {this.sortingFile = []; return;}
			if (_isFile(file)) {this.sortingFile = _jsonParseFileCheck(file, 'Sorting json', window.Name, utf8);}
			else {this.sortingFile = [];}
		}
		
		this.createMainMenuDynamic = ({file = folders.ajquerySMP + 'playlistmanagerentries.json', bRetry = true} = {}) => {
			this.deleteMainMenuDynamic();
			let currId = this.mainMenuDynamic.length;
			const bToFile = file && file.length;
			try {
				const listExport = {};
				const listMenuTypes = {};
				const data = bToFile ? _jsonParseFile(file, utf8) || {} : {};
				const wName = window.Name;
				data[wName] = {};
				// Per playlist
				const menusPls = [
					{type:'load playlist',	name: 'Load playlist/', 		description: 'Load playlist into UI.',				skipExt: ['.ui'],		skipProp: []},
					{type:'lock playlist',	name: 'Lock playlist/',			description: 'Lock playlist file.',					skipExt: ['.ui'],		skipProp: ['isLocked']},
					{type:'lock playlist',	name: 'Unlock playlist/',		description: 'Unlock playlist file.',				skipExt: ['.ui'],		skipProp: ['!isLocked']},
					{type:'delete playlist',name: 'Delete playlist/', 		description: 'Delete playlist file.',				skipExt: ['.ui'],		skipProp: []},
					{type:'clone in ui',	name: 'Clone playlist in UI/',	description: 'Load a copy of the playlist file.',	skipExt: ['','.ui'],	skipProp: ['!size']},
					{type:'copy selection',	name: 'Copy selection to/',		description: 'Copy selection to playlist file.',	skipExt: ['','.fpl'],	skipProp: ['query', 'isAutoPlaylist' ,'isLocked']},
					{type:'move selection',	name: 'Move selection to/',		description: 'Move selection to playlist file.',	skipExt: ['','.fpl'],	skipProp: ['query', 'isAutoPlaylist' ,'isLocked']},
				];
				menusPls.forEach((menu) => {listExport[menu.type] = [];});
				this.dataAll.forEach((pls, i) => {
					if (!this.bAllPls && pls.extension === '.ui') {return;}
					if (pls.tags.includes('bSkipMenu')) {return;}
					menusPls.forEach((menu) => {
						if (menu.skipExt.indexOf(pls.extension) !== -1) {return;}
						if (menu.skipProp.some((key) => {
							const notKey = key.startsWith('!') ? key.slice(1) : null;
							return (notKey 
								? pls.hasOwnProperty(notKey) && !pls[notKey] && !isString(pls[notKey]) && !isArrayStrings(pls[notKey])
								: pls.hasOwnProperty(key) && (isBoolean(pls[key]) && pls[key] || isString(pls[key]) || isArrayStrings(pls[notKey])) 
							);
						})) {return;}
						const type = menu.type;
						const name = menu.name + pls.name;
						const description = menu.description;
						this.mainMenuDynamic.push({type, arg: [i], name, description});
						fb.RegisterMainMenuCommand(currId, this.mainMenuDynamic[currId].name, this.mainMenuDynamic[currId].description);
						if (!name.endsWith('\t (input)')) { // Don't export when requiring input
							listExport[type].push({name: wName + '/' + name}); // File/Spider Monkey Panel/Script commands
						}
						currId++;
					});
				});
				// Per panel
				const menusGlobal = [
					{type:'manual refresh',			name: 'Manual refresh',					description: 'Refresh the manager.'},
					{type:'new playlist (empty)',	name: 'New empty playlist',				description: 'Create a new empty playlist file.'},
					{type:'new playlist (ap)',		name: 'New playlist (active)',			description: 'Create new playlist file from active playlist.'},
					{type:'load playlist (mult)',	name: 'Load tagged playlists',			description: 'Load all playlists tagged with \'bMultMenu\'.'},
					{type:'clone in ui (mult)',		name: 'Clone tagged playlists in UI',	description: 'Load a copy of all playlists tagged with \'bMultMenu\'.'}
				];
				(() => {
					const defaultMenu = {type:'export convert (mult)',	name: 'Export and Convert',description: 'Export all playlists tagged with \'bMultMenu\'.'};
					const presets = JSON.parse(this.properties.converterPreset[1]);
					presets.forEach((preset) => {
						const path = preset.path;
						const dsp = preset.dsp;
						const tf = preset.tf;
						let tfName = preset.hasOwnProperty('name') && preset.name.length ? preset.name : preset.tf;
						const extension = preset.hasOwnProperty('extension') && preset.extension.length ? preset.extension : '';
						const menu = clone(defaultMenu);
						menu.arg = [preset];
						menu.name += ' ' + _b(tfName);
						if (!path.length || !dsp.length || !tf.length || !extension.length) {menu.name += '\t (input)';} // Warn about requiring popups
						menusGlobal.push(menu);
					});
				})()
				menusGlobal.forEach((menu) => {listExport[menu.type] = [];});
				const promiseArr = [];
				return new Promise((resolve) => {
					const test = new FbProfiler(window.Name + ': ' + 'createMainMenuDynamic()');
					menusGlobal.forEach((menu, i) => {
						const type = menu.type;
						const name = menu.name;
						const description = menu.description;
						const arg = menu.arg || [i];
						this.mainMenuDynamic.push({type, arg, name, description});
						fb.RegisterMainMenuCommand(currId, this.mainMenuDynamic[currId].name, this.mainMenuDynamic[currId].description);
						if (!name.endsWith('\t (input)')) { // Don't export when requiring input
							listExport[type].push({name: wName + '/' + name}); // File/Spider Monkey Panel/Script commands
						}
						currId++;
						if (test.Time > 250) {throw new Error('Script aborted by user');}
					});
					resolve(true);
				})
				.then(() => {
					data[wName] = listExport;
					// Don try to export for ajquery-xxx integration when it isn't installed
					if (bToFile && file.indexOf('ajquery-xxx') !== -1 && !folders.ajqueryCheck()) {return true;}
					return (bToFile ? _save(file, JSON.stringify(data, null, '\t')) : true);
				})
				.catch((e) => {
					if (bRetry) {
						if (e.message === 'Script aborted by user') {
							console.log('this.createMainMenuDynamic: retrying menu creation due to slow processing'); 
							return Promise.wait(5000).then(() => this.createMainMenuDynamic({file, bRetry: false}));
						}
					}
					console.log('this.createMainMenuDynamic: unknown error'); 
					console.log(e.message);
					return false;
				});
			} catch (e) {
				// Retry once
				if (bRetry) {
					if (e.message === 'Script aborted by user') {
						console.log('this.createMainMenuDynamic: retrying menu creation due to slow processing'); 
						return Promise.wait(5000).then(() => this.createMainMenuDynamic({file, bRetry: false}));
					}
				}
 				console.log('this.createMainMenuDynamic: unknown error'); 
				console.log(e.message);
			}
			return Promise.resolve(false);
		}
		
		this.deleteMainMenuDynamic = () => {
			this.mainMenuDynamic.forEach((pls, i) => {
				try {fb.UnregisterMainMenuCommand(i);} catch (e) {};
			});
			this.mainMenuDynamic.splice(0, this.mainMenuDynamic.length);
		}
		
		this.exportPlaylistsInfo = ({file = folders.ajquerySMP + 'playlistmanagerpls.json', bDelete = false} = {}) => {
			const bToFile = file && file.length;
			// Don try to export for ajquery-xxx integration when it isn't installed
			if (!bToFile || file.indexOf('ajquery-xxx') !== -1 && !folders.ajqueryCheck()) {return false;}
			try {
				const data = _jsonParseFile(file, utf8) || {};
				const wName = window.Name;
				let listExport = [];
				this.dataAll.forEach((pls, i) => {
					if (pls.extension === '.ui') {return;}
					listExport.push(pls);
				});
				data[wName] = listExport;
				return _save(file, JSON.stringify(data, null, '\t'));
			} catch (e) {console.log('this.exportPlaylistsInfo: unknown error'); console.log(e.message);}
			return false;
		}
		
		this.deleteExportInfo = (files = [
				folders.ajquerySMP + 'playlistmanagerpls.json', 
				folders.ajquerySMP + 'playlistmanagerentries.json'
			]) => {
			const wName = window.Name;
			files.forEach((file) => {
				const bToFile = file && file.length;
				if (!bToFile || file.indexOf('ajquery-xxx') !== -1 && !folders.ajqueryCheck()) {return;}
				const data = _jsonParseFile(file, utf8) || {};
				data[wName] = null;
				delete data[wName];
				_save(file, JSON.stringify(data, null, '\t'));
			});
		}
		
		this.startupPlaylist = (name = this.activePlsStartup) => {
			let re, flag, idx = -1, bRegExp = false;
			try {
				[, re, flag] = name.match(/\/(.*)\/([a-z]+)?/);
				if (re) {
					name = new RegExp(re, flag); 
					bRegExp = true;
				}
			} catch (e) {}
			if (bRegExp) {
				const playlists = getPlaylistNames();
				const pls = (playlists.find((pls) => {return name.test(pls.name);}) || {idx: -1}).idx;
				idx = pls.idx;
			} else {
				idx = plman.FindPlaylist(name);
			}
			if (idx === -1) { // Give priority to playlist on UI, then to manager playlists
				const plsIdx = this.getPlaylistsIdxByName([name]);
				if (plsIdx.length) {
					idx = plman.FindPlaylist(this.dataAll[plsIdx[0]].nameId);
				}
			}
			if (idx !== -1 && plman.ActivePlaylist !== idx) {plman.ActivePlaylist = idx;}
			else {console.log('Playlist Manager: active playlist at startup not found - ' + name);}
			return idx;
			

		}
		
		this.reset = () => {
			this.inRange = false;
			this.items = 0;
			this.itemsAll = 0;
			this.itemsAutoplaylist = 0;
			this.itemsFpl = 0;
			this.itemsXsp = 0;
			this.itemsFoobar = 0;
			this.itemsFolder = 0;
			this.bUpdateAutoplaylist = this.properties['bUpdateAutoplaylist'][1];
			this.totalFileSize = 0;
			this.index = -1;
			this.indexes = [];
			this.lastIndex = -1;
			this.lastOffset = 0;
			this.internalPlsDrop = [];
			this.data = []; // Data to paint
			this.dataAll = []; // Everything cached (filtering changes this.data but not this one)
			this.dataAutoPlaylists = []; // Only autoplaylists to save to json
			this.dataFpl = []; // Only fpl playlists to save to json
			this.dataXsp = []; // Only xsp playlists to save to json
			this.dataUI = []; // Only foobar2000 playlists on UI
			this.dataFoobar = []; // Only foobar2000 playlists on UI
			this.dataFolder = []; // Only folders for sorting
			this.deletedItems = [];
			this.lastPlsLoaded = [];
			this.disableAutosave = [];
			this.clearSelPlaylistCache();
			this.deleteMainMenuDynamic();
			this.lastCharsPressed = {str: '', ms: Infinity, bDraw: false};
			this.lockStates = this.constLockStates();
			this.autoPlaylistStates = this.constAutoPlaylistStates();
			this.categoryState = JSON.parse(this.properties['categoryState'][1]);
			this.methodState = this.properties['methodState'][1];
			this.sortState = this.properties['sortState'][1];
			this.optionUUID = this.properties['optionUUID'][1];
			this.bShowSep = this.properties['bShowSep'][1];
			this.colors = convertStringToObject(this.properties['listColors'][1], 'number');
			this.bRelativePath = this.properties['bRelativePath'][1];
			this.bAutoLoadTag = this.properties['bAutoLoadTag'][1];
			this.bAutoLockTag = this.properties['bAutoLockTag'][1];
			this.bMultMenuTag = this.properties['bMultMenuTag'][1];
			this.bSkipMenuTag = this.properties['bSkipMenuTag'][1];
			this.bAutoCustomTag = this.properties['bAutoCustomTag'][1];
			this.autoCustomTag = this.properties['autoCustomTag'][1].split(',');
			this.bApplyAutoTags = this.properties['bApplyAutoTags'][1];
			this.bAutoTrackTag = this.properties['bAutoTrackTag'][1];
			this.bAutoTrackTagAlways = this.properties['bAutoTrackTagAlways'][1];
			this.bAutoTrackTagPls = this.properties['bAutoTrackTagPls'][1];
			this.bAutoTrackTagLockPls = this.properties['bAutoTrackTagLockPls'][1];
			this.bAutoTrackTagAutoPls = this.properties['bAutoTrackTagAutoPls'][1];
			this.bAutoTrackTagAutoPlsInit = this.properties['bAutoTrackTagAutoPlsInit'][1];
			this.bForbidDuplicates = this.properties['bForbidDuplicates'][1];
			this.bDeadCheckAutoSave = this.properties['bDeadCheckAutoSave'][1];
			this.bBOM = this.properties['bBOM'][1];
			this.removeDuplicatesAutoPls = JSON.parse(this.properties['removeDuplicatesAutoPls'][1]).filter((n) => n);
			this.bRemoveDuplicatesAutoPls = this.properties['bRemoveDuplicatesAutoPls'][1];
			this.bRemoveDuplicatesSmartPls = this.properties['bRemoveDuplicatesSmartPls'][1];
			this.bAdvTitle = this.properties['bAdvTitle'][1];
			this.bSavingWarnings = this.properties['bSavingWarnings'][1];
			this.bShowMenuHeader = this.properties['bShowMenuHeader'][1];
			this.bCheckDuplWarnings = this.properties['bCheckDuplWarnings'][1];
			this.bAllPls = this.properties['bAllPls'][1];
			this.activePlsStartup = this.properties['activePlsStartup'][1];
			this.searchMethod = JSON.parse(this.properties['searchMethod'][1]);
			this.bTracking = true;
			this.trackedFolderChanged = false;
		}
		
		this.manualRefresh = () => {
			const test = bProfile ? new FbProfiler(window.Name + ': ' + 'Manual refresh') : null;
			this.trackedFolderChanged = false;
			this.loadConfigFile();
			const z = this.offset + Math.round(this.rows / 2 - 1);
			this.cacheLastPosition(z);
			this.bUpdateAutoplaylist = true; // Forces AutoPlaylist size update and track autotagging according to query and tags
			this.update(void(0), true, z);
			this.filter();
			this.lastPlsLoaded = [];
			if (typeof xspCache !== 'undefined') {xspCache.clear();} // Discard old cache to load new changes
			if (typeof xspfCache !== 'undefined') {xspfCache.clear();}
			if (bProfile) {test.Print();}
		}
		
		this.methodState = this.getMethodState(); // On first call first method will be default
		this.sortState = this.getSortState(); // On first call first state of that method will be default
		
		if (!_isFolder(folders.data)) {_createFolder(folders.data);}
		this.filename = folders.data + 'playlistManager_' + this.playlistsPathDirName.replace(':','') + '.json'; // Replace for relative paths folder names!
		let test = bProfile ? new FbProfiler(window.Name + ': ' + 'Init') : null;
		_recycleFile(this.filename + '.old', true); // recycle old backup
		_copyFile(this.filename, this.filename + '.old'); // make new backup
		this.loadConfigFile(); // Extra json files available?
		this.loadSortingFile();
		this.initProperties(); // This only set properties if they have no values...
		this.reset();
		let bDone = this.checkConfig();
		if (bProfile) {test.Print('Load config files');}
		if (!this.properties.bSetup[1]) {this.update(false, true, void(0), true);} // bInit is true to avoid reloading all categories
		this.checkConfigPostUpdate(bDone);
		this.updatePlaylistIcons();
		// Uses last view config at init, categories and filters are previously restored according to bSaveFilterStates
		if (!this.uiElements['Search filter'].enabled || !this.searchMethod.text.length || this.searchMethod.bResetStartup) {
			this.filter();
		}
		if (bProfile) {test.Print('Load playlists');}
		if (this.bDynamicMenus) { // Init menus unless they will be init later after Autoplaylists processing
			const queryItems = this.itemsAutoplaylist + this.itemsXsp;
			const bColumns = this.isColumnsEnabled('size');
			const bUpdateSize = this.properties['bUpdateAutoplaylist'][1] && (this.bShowSize || bColumns);
			const bAutoTrackTag = this.bAutoTrackTag && this.bAutoTrackTagAutoPls && this.bAutoTrackTagAutoPlsInit;
			if ((!bUpdateSize && !bAutoTrackTag) || queryItems === 0) {
				Promise.wait(5000).then(() => {
					return this.createMainMenuDynamic();
				}).then((result) => {
					if (result) {console.log('Playlist Manager: created dynamic menus');}
					this.exportPlaylistsInfo(); 
					callbacksListener.checkPanelNamesAsync();
				});
			}
		} else {this.deleteExportInfo();}
		if (folders.ajqueryCheck()) {exportComponents(folders.ajquerySMP);}
		if (this.activePlsStartup.length) {this.startupPlaylist();}
		if (bProfile) {test.Print('Post startup'); test = null;}
		setInterval(() => {this.trackedFolderChanged = this.checkTrackedFolderChanged();}, Number(this.properties.autoUpdate[1]) || 5000);
	}
	
	this.optionsUUIDTranslate = (optionUUID = this.optionUUID) => { // See nextId() on helpers_xxx.js
		const idx = this.optionsUUID().indexOf(optionUUID);
		switch (idx) {
			case 0:
				return 'invisible';
			case 1:
				return 'letters';
			case 2:
				return 'indicator';
			case 3:
				return null;
			default:
				return null;
		}
	}
	
	panel.listObjects.push(this);
	this.inRange = false;
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.mx = -1;
	this.my = -1;
	this.bMouseOver = false;
	this.index = -1;
	this.indexes = [];
	this.lastIndex = -1;
	this.offset = 0;
	this.lastOffset = 0;
	this.items = 0;
	this.itemsAll = 0;
	this.itemsAutoplaylist = 0;
	this.itemsFpl = 0;
	this.itemsXsp = 0;
	this.itemsFoobar = 0;
	this.itemsFolder = 0;
	this.text_x = 0;
	this.timeOut = null;
	this.bDoubleclick = false;
	this.bSelMenu = false;
	this.filename = '';
	this.configFile = null;
	this.sortingFile = [];
	this.internalPlsDrop = [];
	this.totalFileSize = 0; // Stores the file size of all playlists for later comparison when autosaving
	this.lastPlsLoaded = [];
	this.mainMenuDynamic = [];
	this.disableAutosave = [];
	// Properties
	this.defaultProperties = clone(properties); // Load once! [0] = descriptions, [1] = values set by user (not defaults!)
	this.properties = getPropertiesPairs(properties, 'plm_'); // Load once! [0] = descriptions, [1] = values set by user (not defaults!)
	this.playlistsPath = this.properties['playlistPath'][1].startsWith('.') ? findRelPathInAbsPath(this.properties['playlistPath'][1]) : this.properties['playlistPath'][1];
	this.playlistsPathDirName = this.playlistsPath.split('\\').filter(Boolean).pop();
	this.playlistsPathDisk = this.playlistsPath.split('\\').filter(Boolean)[0].replace(':','').toUpperCase();
	this.playlistsExtension = this.properties['extension'][1].toLowerCase();
	// Playlist behavour
	this.bUpdateAutoplaylist = this.properties['bUpdateAutoplaylist'][1]; // Forces AutoPlaylist size update on startup according to query. Requires also this.bShowSize = true!
	this.bUseUUID = this.properties['bUseUUID'][1];
	this.optionsUUID = () => {return ['Yes: Using invisible chars plus (*) indicator (experimental)','Yes: Using a-f chars','Yes: Using only (*) indicator','No: Only the name'];};
	this.optionUUID = this.properties['optionUUID'][1];
	this.bFplLock = this.properties['bFplLock'][1];
	this.bSaveFilterStates = this.properties['bSaveFilterStates'][1];
	// UI
	this.bShowSize = this.properties['bShowSize'][1];
	this.bShowSep = this.properties['bShowSep'][1];
	this.bShowIcons = this.properties['bShowIcons'][1];
	this.bShowTips = this.properties['bShowTips'][1];
	this.playlistIcons = JSON.parse(this.properties['playlistIcons'][1]);
	this.lShortcuts = JSON.parse(this.properties['lShortcuts'][1]);
	this.mShortcuts = JSON.parse(this.properties['mShortcuts'][1]);
	this.rShortcuts = JSON.parse(this.properties['rShortcuts'][1]);
	this.lShortcutsHeader = JSON.parse(this.properties['lShortcutsHeader'][1]);
	this.mShortcutsHeader = JSON.parse(this.properties['mShortcutsHeader'][1]);
	this.modeUI = 'modern'
	this.categoryHeaderOffset = 0;
	this.uiElements = JSON.parse(this.properties['uiElements'][1]);
	this.iDoubleClickTimer = this.properties['iDoubleClickTimer'][1];
	this.columns = JSON.parse(this.properties['columns'][1]);
	// Folders
	this.folders = JSON.parse(this.properties['folders'][1]);
	// Panel behavior
	this.bRelativePath = this.properties['bRelativePath'][1];
	this.bAutoLoadTag = this.properties['bAutoLoadTag'][1];
	this.bAutoLockTag = this.properties['bAutoLockTag'][1];
	this.bMultMenuTag = this.properties['bMultMenuTag'][1];
	this.bSkipMenuTag = this.properties['bSkipMenuTag'][1];
	this.bAutoCustomTag = this.properties['bAutoCustomTag'][1];
	this.autoCustomTag = this.properties['autoCustomTag'][1].split(',');
	this.bApplyAutoTags = this.properties['bApplyAutoTags'][1];
	this.bAutoTrackTag = this.properties['bAutoTrackTag'][1];
	this.bAutoTrackTagAlways = this.properties['bAutoTrackTagAlways'][1];
	this.bAutoTrackTagPls = this.properties['bAutoTrackTagPls'][1];
	this.bAutoTrackTagLockPls = this.properties['bAutoTrackTagLockPls'][1];
	this.bAutoTrackTagAutoPls = this.properties['bAutoTrackTagAutoPls'][1];
	this.bAutoTrackTagAutoPlsInit = this.properties['bAutoTrackTagAutoPlsInit'][1];
	this.bForbidDuplicates = this.properties['bForbidDuplicates'][1];
	this.bDeadCheckAutoSave = this.properties['bDeadCheckAutoSave'][1];
	this.bBOM = this.properties['bBOM'][1];
	this.removeDuplicatesAutoPls = JSON.parse(this.properties['removeDuplicatesAutoPls'][1]).filter((n) => n);
	this.bRemoveDuplicatesAutoPls = this.properties['bRemoveDuplicatesAutoPls'][1];
	this.bAdvTitle = this.properties['bAdvTitle'][1];
	this.bRemoveDuplicatesSmartPls = this.properties['bRemoveDuplicatesSmartPls'][1];
	this.bSavingWarnings = this.properties['bSavingWarnings'][1];
	this.bSavingDefExtension = this.properties['bSavingDefExtension'][1];
	this.bCheckDuplWarnings = this.properties['bCheckDuplWarnings'][1];
	this.bSavingXsp = this.properties['bSavingXsp'][1];
	this.bShowMenuHeader = this.properties['bShowMenuHeader'][1];
	this.bAllPls = this.properties['bAllPls'][1];
	this.bDynamicMenus = this.properties['bDynamicMenus'][1];
	this.activePlsStartup = this.properties['activePlsStartup'][1];
	this.searchMethod = JSON.parse(this.properties['searchMethod'][1]);
	this.bTracking = true;
	this.bLibraryChanged = false;
	this.cacheLibTimer = null;
	this.bLiteMode = this.properties['bLiteMode'][1];
	// Other
	this.dropUp = this.dropDown = this.dropIn = false;
	this.showMenusDef = JSON.parse(this.properties.showMenus[3]);
	this.trackedFolderChanged = false;
	this.bIsDragDrop = false;
	this.dragDropText = '';
	this.lastCharsPressed = {str: '', ms: Infinity, bDraw: false};
	this.selPaths = {pls: new Set(), sel: []};
	this.colors = convertStringToObject(this.properties['listColors'][1], 'number');
	this.autoUpdateDelayTimer = Number(this.properties.autoUpdate[1]) !== 0 ? Number(this.properties.autoUpdate[1]) / 100 : 1; // Timer should be at least 1/100 autoupdate timer to work reliably
	this.up_btn = new _sb(chars.up, this.x, this.y, _scale(12), _scale(12), () => { return this.offset > 0 && (this.uiElements['Up/down buttons'].enabled || this.bIsDragDrop || this.isInternalDrop()); }, () => { this.wheel({s: 1}); });
	this.down_btn = new _sb(chars.down, this.x, this.y, _scale(12), _scale(12), () => { return (this.offset < this.items - this.rows) && (this.uiElements['Up/down buttons'].enabled || this.bIsDragDrop || this.isInternalDrop()); }, () => { this.wheel({s: -1}); });
	this.headerButtonsDef = {};
	this.headerButtons = {
		search: {
			x: 0, y: 0, w: 0, h: 0, inFocus: false, text: (x, y, mask, parent) => {
					return (this.searchInput.text.length || this.isFilterActive('Playlist')
						? 'Clear search\n----------------------------------------------\n(Escape to clear search text)\n(Ctrl + E to set focus on search box)\n(Shift + L. Click to open search settings)'
						: 'Search settings...\n----------------------------------------------\n(Escape to clear search text)\n(Ctrl + E sets focus on search box)') + (this.searchMethod.bPath 
								? '\n(Drag n\' drop track(s) to copy filename(s))' 
								: '');
			}, func: (x, y, mask, parent) => {
				if (this.searchInput.text.length && getKeyboardMask() !== kMask.shift) {
					this.searchInput.on_key_down(VK_ESCAPE); 
					this.search();
				} else if (this.isFilterActive('Playlist')) {
					this.filter({plsState: []});
				} else {
					createMenuSearch().btn_up(x, y);
				}
			}
		},
		action: {
			x: 0, y: 0, w: 0, h: 0, inFocus: false, text: (x, y, mask, parent) => {
				return 'Action button...\n----------------------------------------------\n' + this.headerTooltip(mask, true, true);
			}, func: null
		},
		resetFilters: {
			x: 0, y: 0, w: 0, h: 0, inFocus: false, text: (x, y, mask, parent) => {
				const filters = this.getFilter(true);
				const filterKeys = Object.keys(filters);
				let info = 'Reset all filters...';
				info += '\n----------------------------------------------\n';
				info += filterKeys.length 
					? 'Active:\t' + filterKeys.joinEvery(', ', 3, '\n\t')
					: 'No active filters.'
				if (filters.Search && !this.searchMethod.bResetFilters) {
					info += '\nSearch filter set to be ommited.';
				}
				return info;
			}, func: this.resetFilter,
			altColor: (x, y, mask, parent) => {
				const filterKeys = Object.keys(this.getFilter(true));
				return this.searchMethod.bResetFilters 
					? filterKeys.length
					: filterKeys.filter((key) => key !== 'Search').length;
			}
		},
		columns: {
			x: 0, y: 0, w: 0, h: 0, inFocus: false, text: (x, y, mask, parent) => {
				const showMenus = JSON.parse(this.properties.showMenus[1]);
				return (this.uiElements['Columns'].enabled ? 'Hide' : 'Show') + ' columns...' + (
					showMenus['Statistics mode'] ?
						'\n----------------------------------------------\n' + '(Shift + L. Click to switch Statistics mode)'
						: ''
					);
			}, func: (x, y, mask, parent) => {
				if (mask === MK_SHIFT) {
					const showMenus = JSON.parse(this.properties.showMenus[1]);
					if (showMenus['Statistics mode']) {
						stats.bEnabled = !stats.bEnabled;
						this.properties['bStatsMode'][1] = stats.bEnabled;
						if (stats.bEnabled) {stats.init();}
						overwriteProperties(this.properties);
						this.updateUIElements(); // Buttons, etc.
					}
				} else {
					this.uiElements['Columns'].enabled = !this.uiElements['Columns'].enabled;
					this.properties.uiElements[1] = JSON.stringify(this.uiElements);
					overwriteProperties(this.properties);
					this.updateUIElements();
				}
			}
		},
		newPls: {x: 0, y: 0, w: 0, h: 0, inFocus: false, text: 'List menu...', func: (x, y, mask, parent) => createMenuRight().btn_up(x, y)},
		settings: {
			x: 0, y: 0, w: 0, h: 0,
			inFocus: false,
			text: (x, y, mask, parent) => {
				const bhighlighting = parent.highlighting(x, y, mask, parent);
				return 'Playlist Manager settings...' + (bhighlighting || !this.bLiteMode ? '\n----------------------------------------------\n' : '') + (
					bhighlighting
						? 'Library has changed since tracking was disabled.\n' +
							'Paths cache needs rebuilding.'
						: ''
				) + (
					this.bLiteMode 
						?	''
						: (!this.bTracking ? 'Library tracking disabled\n' : '') + '(Shift + L. Click to switch library tracking)'
				);
			},
			func: (x, y, mask, parent) => {
				if (!this.bLiteMode && mask === MK_SHIFT) {
					this.switchTracking(void(0), true);
				} else {
					createMenuRightTop().btn_up(x, y)
				}
			},
			highlighting: (x, y, mask, parent) => {
				return this.bLibraryChanged && !this.bTracking && !this.bLiteMode;
			}
		},
		folder: {
			x: 0, y: 0, w: 0, h: 0, inFocus: false,
			text: (x, y, mask, parent) => {
				const bhighlighting = parent.highlighting(x, y, mask, parent);
				return 'Open playlists folder' +  (bhighlighting || !this.bLiteMode ? '\n----------------------------------------------\n' : '') + (
					bhighlighting
						?  'Playlists tracked folder has new changes.\n' +
							'Use manual refresh or enable auto-loading.'
						: ''
				) + (
					this.bLiteMode 
						? ''
						: '(Shift + L. Click to manual refresh)'
				);
			},
			func: (x, y, mask, parent) => {
				if (!this.bLiteMode && mask === MK_SHIFT) {
					this.manualRefresh();
				} else {
					_explorer(this.playlistsPath);
				}
			},
			highlighting: (x, y, mask, parent) => this.trackedFolderChanged
		},
		help: {
			x: 0, y: 0, w: 0, h: 0, inFocus: false, 
			text: 'Open documentation...\n----------------------------------------------\n(Shift + L. Click to show quick help)',
			func: (x, y, mask, parent) => {
				if (mask === MK_SHIFT) {
					// Enabled menus
					const showMenus = JSON.parse(this.properties.showMenus[1]);
					fb.ShowPopupMessage(
						'Global shortcuts:' +
						'\n-------------------' +
						this.listGlobalShortcuts() +
						'\n- º, \\ or Numpad /: hide/show the playlist\'s metadata columns.' +
						'\n- DEL: delete playlist.' +
						(this.searchInput ? '\n- CTRL + E: focus on search box.' : '') +
						'\n' +
						(showMenus['Quick-search']
							? '\nQuick-search:' +
								'\n-------------------' +
								'\nPress any letter / number to jump by current sorting' + 
								'\n(i.e. sorting by category jumps by it instead of name).' +
								'\n'
							: '') +
						'\nTooltip:' +
						'\n-------------------' +
						'\nShift / Ctrl on buttons / playlists will show the associated action.' +
						'\n' +
						'\nSorting & Filters:' +
						'\n-------------------' +
						'\nRight click on buttons allow to switch current filters and sorting.' +
						'\n' +
						'\nList view shortcuts:' +
						'\n-------------------' +
						'\n- Up / Down: scroll down / up.' +
						'\n- Re Pag / Av Pag: scroll down / up page.' +
						'\n- Home / End: scroll to top / bottom.'
					, window.Name + ': Quick help');
				} else {
					createMenuRightTop().btn_up(x, y, void(0), 'Open documentation...');
				}
			}
		},
	};
	this.searchCurrent = '';
	this.searhHistory = [];
	this.searchInput = null;
	callbacksListener.listenNames = this.bDynamicMenus;
	this.init();
	if (this.bApplyAutoTags && this.itemsAll) {
		setTimeout(() => {
			this.dataAll.forEach((item, z) => {
				if (item.tags.indexOf('bAutoLoad') !== -1) {this.loadPlaylist(z, true);}
			});
		}, 300);
	}
}

// Calculate auto-playlist in steps to not freeze the UI, returns the handle list. Size is updated on the process
function loadAutoPlaylist(pls, i) {
	return new Promise((resolve) => {
		setTimeout(() => {
			if (!checkQuery(pls.query, false, true)) {
				if (pls.query.indexOf('#PLAYLIST# IS') === -1) {fb.ShowPopupMessage('Query not valid:\n' + pls.query, window.Name); resolve(null);}
				else {resolve(null);}
			} else {
				const handleList = fb.GetQueryItems(fb.GetLibraryItems(), stripSort(pls.query));
				pls.size = handleList.Count;
				pls.duration = handleList.CalcTotalDuration();
				resolve(handleList);
			}
		}, 500 * i);
	});
}

async function loadAutoPlaylistAsync(pls, i) {
	return await loadAutoPlaylist(pls, i);
}