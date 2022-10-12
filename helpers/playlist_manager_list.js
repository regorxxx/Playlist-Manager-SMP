'use strict';
//12/10/22

include('helpers_xxx.js');
include('helpers_xxx_UI.js');
include('helpers_xxx_UI_draw.js');
include('helpers_xxx_prototypes.js');
include('helpers_xxx_properties.js');
include('helpers_xxx_playlists.js');
include('helpers_xxx_playlists_files.js');
include('helpers_xxx_tags.js');
include('helpers_xxx_file.js');
include('helpers_xxx_utils.js');
include('playlist_manager_panel.js');
include('playlist_manager_helpers.js');
include('..\\helpers-external\\keycode-2.2.0\\index.js');
include('helpers_xxx_controller.js');

function _list(x, y, w, h) {
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
	var idxHighlight = -1;
	var animation = {bHighlight: false, fRepaint: null};
	
	// Global tooltip
	this.tooltip = new _tt(null, void(0), void(0), 600); 
	
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
	
	this.size = () => {
		const oldW = this.w, oldH = this.h;
		this.w = panel.w - (this.x * 2);
		this.h = panel.h - this.y;
		this.index = 0;
		this.offset = 0;
		if (oldH > 0 && this.h > 0) {yOffset = (_scale(6) + panel.row_height / 4) * (this.h / oldH);}
		this.rows = Math.floor((this.h - _scale(24) - yOffset) / panel.row_height); // 24
		this.up_btn.x = this.x + Math.round((this.w - _scale(12)) / 2);
		this.down_btn.x = this.up_btn.x;
		this.up_btn.y = this.y + _scale(1);
		this.down_btn.y = this.y + this.h - _scale(12) - buttonCoordinatesOne.h; // Accommodate space for buttons!
		this.headerTextUpdate();
		this.updatePlaylistIcons();
	}
	
	this.headerText = window.Name;
	
	this.headerTextUpdate = () => {
		const bCategoryFilter = !isArrayEqual(this.categoryState, this.categories());
		this.headerText = (this.playlistsPath && this.itemsAll) ? 'Playlists: ' + this.playlistsPathDirName + ' (' + this.itemsAll + ' pls.)' + (bCategoryFilter ? '[*]' : '') : 'Playlist Manager: empty folder';
		if (this.w < _gr.CalcTextWidth(this.headerText, panel.fonts.title) + 15) {
			this.headerText = this.headerText.replace('Playlists: ','').replace('Playlist Manager: ','');
		}
	}
	
	this.paint = (gr) => {
		// Bg
		const panelBgColor = panel.getColorBackground();
		// HEADER
		const bCatIcon = this.categoryState.length === 1 && this.configFile && this.configFile.ui.icons.category.hasOwnProperty(this.categoryState[0]);
		const catIcon = bCatIcon ? this.configFile.ui.icons.category[this.categoryState[0]] : iconCharHeader; // Try setting customized button from json
		const offsetHeader = yOffset / 10;
		const gfontHeader= _gdiFont('FontAwesome', _scale((panel.fonts.size <= 14) ? panel.fonts.size - 3 : panel.fonts.size - 7), 0);
		const iconHeaderColour = this.headerButton.inFocus ? blendColours(RGB(...toRGB(panel.colours.text)), this.colours.selectedPlaylistColour, 0.8) : blendColours(panel.colours.highlight, panelBgColor, 0.1);
		const iconW = gr.CalcTextWidth(catIcon, gfontHeader);
		const iconH = gr.CalcTextHeight(catIcon, gfontHeader);
		const headerTextH = gr.CalcTextHeight(this.headerText, panel.fonts.title);
		const maxHeaderH = Math.max(iconH, headerTextH);
		[this.headerButton.x, this.headerButton.y, this.headerButton.w, this.headerButton.h] = [LM, (maxHeaderH - iconH) / 2, iconW, iconH] // Update button coords
		gr.GdiDrawText(catIcon, gfontHeader, iconHeaderColour, LM, 0, iconW, maxHeaderH, DT_BOTTOM | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX);
		gr.GdiDrawText(this.headerText, panel.fonts.title, panel.colours.highlight, LM + iconW + 5, 0, panel.w - (LM * 2), TM, LEFT);
		let lineY = maxHeaderH % 2 ? maxHeaderH + 2 : maxHeaderH + 1;
		lineY += offsetHeader;
		gr.DrawLine(this.x, lineY , this.x + this.w, lineY, 1, panel.colours.highlight);
		headerW = LM + iconW + 5;
		headerH = lineY;
		// Empty Panel
		this.text_x = 0;
		this.text_width = this.w;
		if (this.items === 0) {
			let emptyText = '';
			if (this.itemsAll !== 0) {
				emptyText = 'No matches for the current filters.';
			} else {
				emptyText = 'Playlist folder is currently empty:\n\'' + this.playlistsPath + '\'\n\nAdd playlist files moving them to tracked folder, creating new playlists or importing them from json (right button).' + '\n\nReadable playlist formats:\n\'' + Array.from(loadablePlaylistFormats).join('\', \'') + '\'\nWritable formats:\n\'' + Array.from(writablePlaylistFormats).join('\', \'') + '\'';
			}
			const cache = this.rows;
			this.rows = (emptyText.match(/\n/g) || []).length; // # lines of previous text = # \n
			const emptyTextWrapped = gr.EstimateLineWrap(emptyText, panel.fonts.normal, panel.w - (LM * 2));
			for (let i = 0; i < emptyTextWrapped.length; i++) {
				if (i % 2) {
					gr.GdiDrawText(emptyTextWrapped[i - 1], panel.fonts.normal, panel.colours.text, this.x,  this.y + (i * panel.row_height / 2), emptyTextWrapped[i], panel.row_height, LEFT); // Divide height by 2 since the loop is text rows * 2 !
				}
			}
			this.rows = cache;
			return;
		}
		// List
		const playingChar = String.fromCharCode(9654);
		const loadedChar = String.fromCharCode(9644);
		const standardPlaylistIconColour = blendColours(panel.colours.highlight, panelBgColor, 0.1);
		const lockedPlaylistIconColour = blendColours(standardPlaylistIconColour, this.colours.lockedPlaylistColour, 0.8);
		const autoPlaylistIconColour = blendColours(RGB(...toRGB(panelBgColor)), this.colours.autoPlaylistColour, 0.8);
		const smartPlaylistIconColour = blendColours(RGB(...toRGB(panelBgColor)), this.colours.smartPlaylistColour, 0.8);
		const uiPlaylistIconColour = blendColours(RGB(...toRGB(panelBgColor)), this.colours.uiPlaylistColour, 0.8);
		const categoryHeaderOffset = _scale(panel.fonts.size - 4);
		const categoryHeaderColour = blendColours(panelBgColor, panel.colours.text, 0.6);
		const categoryHeaderLineColour = blendColours(panelBgColor, categoryHeaderColour, 0.5);
		const altColorRow = RGBA(...toRGB(invert(panelBgColor, true)), getBrightness(...toRGB(panelBgColor)) < 50 ? 15 : 7);
		const indexSortStateOffset = !this.getIndexSortState() ? -1 : 1; // Compare to the next one or the previous one according to sort order
		const rows = Math.min(this.items, this.rows);
		// Highlight
		if (idxHighlight !== -1) {
			const currSelIdx = idxHighlight;
			const currSelOffset = idxHighlight !== - 1 ? this.offset : 0;
			if ((currSelIdx - currSelOffset) >= 0 && (currSelIdx - currSelOffset) < this.rows) {
				// Rectangle
				const selWidth =  this.bShowSep ?  this.x + this.w - 20 :  this.x + this.w; // Adjust according to UI config
				gr.DrawRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, 0, opaqueColor(this.colours.selectedPlaylistColour, 50));
				gr.FillSolidRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, opaqueColor(this.colours.selectedPlaylistColour, 30));
			}
			if (this.lastCharsPressed.bDraw) {animation.bHighlight = false;}
			if (animation.bHighlight) {
				if ((currSelIdx - currSelOffset) >= 0 && (currSelIdx - currSelOffset) < this.rows) {
					const selWidth =  this.bShowSep ?  this.x + this.w - 20 :  this.x + this.w; // Adjust according to UI config
					gr.DrawRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, 0, opaqueColor(this.colours.selectedPlaylistColour, 50));
					gr.FillSolidRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, opaqueColor(this.colours.selectedPlaylistColour, 30));
				}
				animation.bHighlight = false;
				animation.fRepaint = setTimeout(() => {animation.fRepaint = null; window.RepaintRect(0, this.y, window.Width, this.h);}, 600);
			} else if (!this.lastCharsPressed.bDraw) {
				idxHighlight = -1;
			}
		} else {animation.bHighlight = false;}
		// Rows
		for (let i = 0; i < rows; i++) {
			// Safety check: when deleted a playlist from data and paint fired before calling this.update()... things break silently. Better to catch it
			if (i + this.offset >= this.items) {
				console.log('Playlist manager: Warning. i + this.offset (' + (i + this.offset) + ') is >= than this.items (' + this.items + ') on paint.'); 
				break;
			}
			// Alternate row colors
			if (panel.colours.bAltRowsColor && (i + this.offset) % 2) {
				const selWidth =  this.x + this.w; // Ignore separator UI config
				gr.FillSolidRect(this.x - 5, this.y + yOffset + i * panel.row_height, selWidth, panel.row_height, altColorRow);
			}
			const currIdx = i + this.offset;
			const pls = this.data[currIdx];
			// Add category sep
			if (this.bShowSep) {
				let dataKey = ''; // Use this.data[dataKey] notation instead of this.data.dataKey, so we can apply the same code to all use-cases
				if (this.methodState.split('\t')[0] === 'By category'){dataKey = 'category';}
				else if (this.methodState.split('\t')[0] === 'By name'){dataKey = 'name';}
				else if (this.methodState.split('\t')[0] === 'By tags'){dataKey = 'tags';}
				if (dataKey.length){
					const data = isArray(pls[dataKey]) ? pls[dataKey][0] : pls[dataKey]; // If it's an array get first value
					// Show always current letter at top. Also shows number
					if (indexSortStateOffset === -1 && i === 0) {
						let sepLetter = data.length ? data[0].toUpperCase() : '-';
						if (!isNaN(sepLetter)) {sepLetter = '#';} // Group numbers
						drawDottedLine(gr, this.x, this.y + yOffset + (i * panel.row_height), this.x + this.w - categoryHeaderOffset, this.y + yOffset + (i * panel.row_height) , 1, categoryHeaderLineColour, _scale(2));
						gr.GdiDrawText(sepLetter, panel.fonts.small, categoryHeaderColour, this.x, this.y + yOffset + (i * panel.row_height) - panel.row_height / 2, this.text_width , panel.row_height , RIGHT);
					}
					// The rest... note numbers are always at top or at bottom anyway
					if (i < (Math.min(this.items, this.rows) - indexSortStateOffset) && i + indexSortStateOffset >= 0) {
						const sepLetter = data.length ? data[0].toUpperCase() : '-';
						const nextIdx = currIdx + indexSortStateOffset;
						const nextData = isArray(this.data[nextIdx][dataKey]) ? this.data[nextIdx][dataKey][0] : this.data[nextIdx][dataKey]; // If it's an array get first value
						const nextsepLetter = nextData.length ? nextData[0].toUpperCase() : '-';
						if (sepLetter !== nextsepLetter && isNaN(sepLetter)) {
							let sepIndex = indexSortStateOffset < 0 ? i : i + indexSortStateOffset;
							drawDottedLine(gr, this.x, this.y + yOffset + (sepIndex * panel.row_height), this.x + this.w - categoryHeaderOffset, this.y + yOffset + (sepIndex * panel.row_height) , 1, categoryHeaderLineColour, _scale(2));
							gr.GdiDrawText(sepLetter, panel.fonts.small, categoryHeaderColour, this.x, this.y + yOffset + (sepIndex * panel.row_height) - panel.row_height / 2, this.text_width , panel.row_height , RIGHT);
						}
					}
					// Show always current letter at bottom. Also shows number
					if (indexSortStateOffset === 1 && i === Math.min(this.items, this.rows) - 1) {
						let sepIndex = i + indexSortStateOffset;
						let sepLetter = data.length ? data[0].toUpperCase() : '-';
						if (!isNaN(sepLetter)) {sepLetter = '#';} // Group numbers
						drawDottedLine(gr, this.x, this.y + yOffset + (sepIndex * panel.row_height), this.x + this.w - categoryHeaderOffset, this.y + yOffset + (sepIndex * panel.row_height) , 1, categoryHeaderLineColour, _scale(2));
						gr.GdiDrawText(sepLetter, panel.fonts.small, categoryHeaderColour, this.x, this.y + yOffset + (sepIndex * panel.row_height) - panel.row_height / 2, this.text_width , panel.row_height , RIGHT);
					}
				}
			}
			// Playlists
			let playlistDataText =  pls.name + (this.bShowSize ? ' (' + pls.size + ')' : '');
			const iconFont = gfontIconChar();
			const iconFontAlt = gfontIconCharAlt();
			// Set colors and icons according to playlist type
			let playlistColour = panel.colours.text, iconColour = standardPlaylistIconColour;
			const plsExtension = pls.isAutoPlaylist ? 'autoPlaylist' : pls.extension;
			let extension = pls.isLocked ? 'locked' : pls.isAutoPlaylist ? 'autoPlaylist' : plsExtension;
			if (extension === 'locked') {playlistColour = this.colours.lockedPlaylistColour; iconColour = lockedPlaylistIconColour;}
			else if (extension === 'autoPlaylist') {playlistColour = this.colours.autoPlaylistColour; iconColour = autoPlaylistIconColour;}
			else if (extension === '.xsp') {playlistColour = this.colours.smartPlaylistColour; iconColour = smartPlaylistIconColour;}
			else if (extension === '.ui') {playlistColour = this.colours.uiPlaylistColour; iconColour = uiPlaylistIconColour;}
			if (pls.size === 0) {extension = 'blank';}
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
					gr.GdiDrawText(iconBg, iconFont, iconColour, this.text_x + 5, this.y + yOffset + (i * panel.row_height), maxIconWidth, panel.row_height, CENTRE);
					if (icon) {
						gr.GdiDrawText(icon, iconFontAlt, blendColours(panelBgColor, iconColour, 0.2), this.text_x + 5, this.y + yOffset + (i * panel.row_height), maxIconWidth, panel.row_height, CENTRE);
					}
				} else if (icon) {
					gr.GdiDrawText(icon, iconFont, iconColour, this.text_x + 5, this.y + yOffset + (i * panel.row_height), maxIconWidth, panel.row_height, CENTRE);
				}
			}
			gr.GdiDrawText(playlistDataText, panel.fonts.normal, playlistColour, this.bShowIcons ? this.x + maxIconWidth : this.x, this.y + yOffset + (i * panel.row_height), this.text_width - 25, panel.row_height, LEFT);
			// Add playing now indicator
			let playlistDataTextRight = '';
			const findPlsIdx = plman.FindPlaylist(pls.nameId);
			if (findPlsIdx !== -1 && plman.IsAutoPlaylist(findPlsIdx) === pls.isAutoplaylist) {
				if (fb.IsPlaying && findPlsIdx === plman.PlayingPlaylist) {playlistDataTextRight += playingChar;}
				// Add loaded indicator
				else {playlistDataTextRight += loadedChar;}
			}
			// Draw
			gr.GdiDrawText(playlistDataTextRight, panel.fonts.small, panel.colours.text, this.x, this.y + yOffset + (i * panel.row_height), this.text_width, panel.row_height, RIGHT);
			// Multiple selection
			if (this.indexes.length) {
				if (this.indexes.indexOf(this.offset + i) !== -1) {
					const selWidth =  this.bShowSep ?  this.x + this.w - 20 :  this.x + this.w; // Adjust according to UI config
					gr.DrawRect(this.x - 5, this.y + yOffset + i * panel.row_height, selWidth, panel.row_height, 0, opaqueColor(this.colours.selectedPlaylistColour, 50));
					gr.FillSolidRect(this.x - 5, this.y + yOffset + i * panel.row_height, selWidth, panel.row_height, opaqueColor(this.colours.selectedPlaylistColour, 30));
				}					
			}
		}
		// Selection indicator
		// Current playlist selection is also drawn when a menu is opened if related to the selected playlist (this.bSelMenu)
		if (this.colours.selectedPlaylistColour !== panelBgColor && this.bMouseOver) {
			const currSelIdx = typeof this.index !== 'undefined' && (this.index !== -1 || !this.bSelMenu) ? this.index : (this.bSelMenu ? currentItemIndex : -1);
			const currSelOffset = typeof this.index !== 'undefined' && (this.index !== -1 || !this.bSelMenu) ? this.offset : (this.bSelMenu ? this.lastOffset : 0);
			if (typeof currSelIdx !== 'undefined' && typeof this.data[currSelIdx] !== 'undefined') {
				if ((currSelIdx - currSelOffset) >= 0 && (currSelIdx - currSelOffset) < this.rows) {
					// Rectangle
					const selWidth =  this.bShowSep ?  this.x + this.w - 15 :  this.x + this.w; // Adjust according to UI config
					gr.DrawRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, 0, this.colours.selectedPlaylistColour);
				}
			}
		}
		// Char popup as animation
		if (this.lastCharsPressed.bDraw) {
			const popupCol = opaqueColor(tintColor(panel.getColorBackground() || RGB(0, 0, 0), 20), 80);
			const borderCol = opaqueColor(invert(popupCol), 50);
			const textCol = panel.colours.text;
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
				gr.GdiDrawText(this.lastCharsPressed.str.toUpperCase(), panel.fonts.title, blendColours(textCol, this.colours.selectedPlaylistColour, 0.5), popX + textOffset, popY, sizeX - textOffset * 2, sizeY, CENTRE);
				const textW = Math.min(gr.CalcTextWidth(this.lastCharsPressed.str.toUpperCase(), panel.fonts.title), sizeX - textOffset) + 10;
				const lineX = Math.max(popX + sizeX / 2 - textW / 2 - 1, popX + textOffset / 2 );
				const lineW = Math.min(popX + sizeX / 2 + textW / 2 - 1, popX + sizeX - textOffset / 2);
				gr.DrawLine(lineX, popY + sizeY / 2, lineW, popY + sizeY / 2, 1, opaqueColor(this.colours.selectedPlaylistColour, 70));
			} else { // when found
				gr.GdiDrawText(this.lastCharsPressed.str.toUpperCase(), panel.fonts.title, textCol, popX + textOffset, popY, sizeX - textOffset * 2, sizeY, CENTRE);
				// And highlight a few ms the found playlist
				const currSelIdx = idxHighlight;
				const currSelOffset = idxHighlight !== - 1 ? this.offset : 0;
				if ((currSelIdx - currSelOffset) >= 0 && (currSelIdx - currSelOffset) < this.rows) {
					const selWidth =  this.bShowSep ?  this.x + this.w - 20 :  this.x + this.w; // Adjust according to UI config
					gr.DrawRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, 0, opaqueColor(this.colours.selectedPlaylistColour, 80));
					gr.FillSolidRect(this.x - 5, this.y + yOffset + ((((currSelIdx) ? currSelIdx : currSelOffset) - currSelOffset) * panel.row_height), selWidth, panel.row_height, opaqueColor(this.colours.selectedPlaylistColour, 50));
				}
			}
			this.lastCharsPressed.bDraw = false;
			animation.fRepaint = setTimeout(() => {animation.fRepaint = null; window.RepaintRect(0, this.y, window.Width, this.h);}, 600);
		}
		// Up/down buttons
		this.up_btn.paint(gr, this.up_btn.hover ? blendColours(RGB(...toRGB(panel.colours.text)), this.colours.selectedPlaylistColour, 0.8) : panel.colours.text);
		this.down_btn.paint(gr, this.down_btn.hover ? blendColours(RGB(...toRGB(panel.colours.text)), this.colours.selectedPlaylistColour, 0.8) : panel.colours.text);
	}

	this.trace = (x, y) => { // On panel
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
	}
	
	this.traceHeader = (x, y) => { // On Header
		return x > 0 && x < panel.w && y > 0 && y < headerH;
	}
	
	this.traceHeaderButton = (x, y) => { // On Header
		return x > this.headerButton.x && x < this.headerButton.x + this.headerButton.w && y > this.headerButton.y && y < this.headerButton.y + this.headerButton.h;
	}
	
	this.wheel = ({s, bPaint = true, bForce = false} = {}) => {
			if (this.trace(this.mx, this.my) || !bPaint || bForce) {
			if (this.items > this.rows) {
				let offset = this.offset - (s * 3); // Offset changes by 3 on every step
				if (offset < 0) {
					offset = 0;
				}
				if (offset + this.rows > this.items) {
					offset = this.items - this.rows;
				}
				if (this.offset !== offset) {
					this.offset = offset;
					if (bPaint) {window.Repaint();}
				}
			}
			return true;
		} else {
			return false;
		}
	}
	
	this.simulateWheelToIndex = ({toIndex, currentItemIndex = this.lastIndex, originalOffset = this.lastOffset} = {}) => {
		if (this.items < this.rows) {this.offset = 0; return;} // Safecheck
		this.index = toIndex;
		let iDifference = currentItemIndex - originalOffset;
		this.offset = 0;
		if (iDifference >= 0 && iDifference < currentItemIndex) {
			if (iDifference === 0 && this.index) {this.offset = originalOffset;}
			let cache = 0;
			while (this.index - this.offset > iDifference) {
				this.wheel({s: -1, bPaint: false});
				if (cache === this.offset) {break;}
				cache = this.offset;
			}
			// Move a bit the list to center the search if possible....
			if (this.index < (this.items - this.rows) && (this.offset + this.rows) >= this.index) {
				this.offset -= 3;
				if (this.offset <= 0) {this.offset = 0;}
			}
		}
	}
	
	this.showCurrPls = ({bPlayingPls = false} = {}) => {
		const name = plman.GetPlaylistName(bPlayingPls ? plman.PlayingPlaylist : plman.ActivePlaylist);
		const idx = this.data.findIndex((pls, idx) => {return pls.nameId === name;});
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
			idxHighlight = idx;
			animation.bHighlight = true;
			this.simulateWheelToIndex({toIndex: idx, currentItemIndex: currentItemIndex > 0 ? currentItemIndex : 1, originalOffset: this.lastOffset ? this.lastOffset : 1});
			currentItemIndex = idx;
			window.RepaintRect(0, this.y, window.Width, this.h);
			return true;
		}
	}
	
	this.onMouseLeaveList = () => {  // Removes selection indicator
		this.cacheLastPosition(); // When pressing right button, the index gets cleared too... but we may want to use it on the menus
		this.index = -1;
		this.bMouseOver = false;
		// this.offset = 0;
		this.clearSelPlaylistCache();
		this.up_btn.hover = false;
		this.down_btn.hover = false;
		this.headerButton.inFocus = false;
		window.Repaint();
	}
	
	this.move = (x, y, mask) => {
		this.bMouseOver = true;
		const bMoved = this.mx !== x || this.my !== y;
		this.mx = x;
		this.my = y;
		if (bMoved) {window.SetCursor(IDC_ARROW);}
		if (this.traceHeader(x,y)) { // Tooltip for header
			if (this.traceHeaderButton(x,y)) {
				window.SetCursor(IDC_HAND);
				this.tooltip.SetValue('Open playlists folder', true);
				this.headerButton.inFocus = true;
			} else {
				this.headerButton.inFocus = false;
				let headerText = this.playlistsPath;
				headerText += '\n' + 'Categories: '+ (!isArrayEqual(this.categoryState, this.categories()) ? this.categoryState.join(', ') + ' (filtered)' : '(All)' );
				headerText += '\n' + 'Filters: ' + (this.autoPlaylistStates[0] !== this.constAutoPlaylistStates()[0] ? this.autoPlaylistStates[0] : '(All)') + ' | ' + (this.lockStates[0] !== this.constLockStates()[0] ?  this.lockStates[0] : '(All)');
				const autoPlsCount = this.data.reduce((sum, pls, idx) => {return (pls.query.length ? sum + 1 : sum);}, 0); // Counts autoplaylists and smart playlists
				headerText += '\n' + 'Current view: '+ this.items + ' Playlists (' + autoPlsCount + ' AutoPlaylists)';
				// Tips
				const lShortcuts = this.getShortcuts('L');
				const mShortcuts = this.getShortcuts('M');
				const multSelAction = 'Multiple selection'; // All actions are shared for M or L mouse
				if (this.bShowTips) {
					headerText += '\n----------------------------------------------';
					headerText += '\n(R. Click for config menus)';
					headerText += '\n(L. Click to highlight active\\playing playlist)';
					headerText += '\n(Double Click to cycle categories)';
					// Middle button
					headerText += mShortcuts['SG_CLICK'].key === multSelAction ? '\n(M. Click to Select all playlists)' : '';
					headerText += mShortcuts[MK_CONTROL].key === multSelAction ? '\n(Ctrl + M. Click to Select all playlists)' : '';
					headerText += mShortcuts[MK_SHIFT].key === multSelAction ? '\n(Shift + M. Click to Select all playlists)' : '';
					headerText += mShortcuts[MK_SHIFT + MK_CONTROL].key === multSelAction ? '\n(Ctrl + Shift + M. Click to Select all playlists)' : '';
				} else {
					if (mask === MK_CONTROL) {
						headerText += lShortcuts[MK_CONTROL].key === multSelAction ? '\n(Ctrl + L. Click to Select all playlists)' : '';
						headerText += mShortcuts[MK_CONTROL].key === multSelAction ? '\n(Ctrl + M. Click to Select all playlists)' : '';
					} else if (mask === MK_SHIFT) {
						headerText += lShortcuts[MK_SHIFT].key === multSelAction ? '\n(Shift + L. Click to Select all playlists)' : '';
						headerText += mShortcuts[MK_SHIFT].key === multSelAction ? '\n(Shift + M. Click to Select all playlists)' : '';
					} else if (mask === MK_SHIFT + MK_CONTROL) {
						headerText += lShortcuts[MK_SHIFT + MK_CONTROL].key === multSelAction ? '\n(Ctrl + Shift + L. Click to Select all playlists)' : '';
						headerText += mShortcuts[MK_SHIFT + MK_CONTROL].key === multSelAction ? '\n(Ctrl + Shift + M. Click to Select all playlists)' : '';
					}
				}
				this.tooltip.SetValue(headerText, true);
			}
			this.index = -1;
			this.inRange = false;
			this.up_btn.hover = false;
			this.down_btn.hover = false;
			window.Repaint(); // Removes selection indicator
		} else {this.headerButton.inFocus = false;}
		if (this.trace(x, y)) {
			this.cacheLastPosition();
			this.index = Math.floor((y - this.y - yOffset) / panel.row_height) + this.offset;
			this.inRange = this.index >= this.offset && this.index < this.offset + Math.min(this.rows, this.items);
			switch (true) {
				case this.up_btn.move(x, y):
				case this.down_btn.move(x, y):
					break;
				case !this.inRange: {
					this.tooltip.SetValue(null); // Removes tt when not over a list element
					this.index = -1;
					// this.lastOffset = 0;
					window.Repaint(); // Removes selection indicator
					break;
				}
				default: {
					switch (true) {
						case (x > this.x && x < this.x + (this.bShowSep ? this.x + this.w - 20 : this.x + this.w)):	{
							// Cursor
							window.SetCursor(IDC_HAND);
							// Selection indicator
							window.Repaint();
							// Tooltip for playlists
							const pls = this.data[this.index];
							if (pls) {
								const path = (pls.path) ? '(' + pls.path.replace(this.playlistsPath,'')  + ')' : '';
								const locks = getLocks(pls.nameId);
								let playlistDataText = pls.isAutoPlaylist ? 'AutoPlaylist: ' : (pls.extension === '.xsp' ? 'Smart Playlist: ' : 'Playlist: ');
								playlistDataText += pls.nameId + ' - ' +  pls.size + ' Tracks ' + path;
								playlistDataText += '\n' + 'Status: ' + (pls.isLocked ? 'Locked (read-only)' : 'Writable');
								playlistDataText +=  locks.isLocked ? ' ' + _b((pls.extension !== '.ui' ? 'UI-locked: ' : '' ) + locks.name) : '';
								playlistDataText +=  locks.isLocked ? '\n' + 'Locks: ' + locks.types.joinEvery(', ', 4, '\n          ') : '';
								playlistDataText += '\n' + 'Category: ' + (pls.category ? pls.category : '-');
								playlistDataText += '\n' + 'Tags: ' + (isArrayStrings(pls.tags) ? pls.tags.join(', ') : '-');
								playlistDataText += '\n' + 'Track Tags: ' + (isArray(pls.trackTags) ? pls.trackTags.map((_) => {return Object.keys(_)[0];}).join(', ') : '-');
								playlistDataText += '\n' + 'Duration: ' +  (pls.duration !== -1 ? utils.FormatDuration(pls.duration) : '?');
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
								const defaultAction = this.getDefaultShortcutAction('M'); // All actions are shared for M or L mouse
								if (this.bShowTips || mask === MK_CONTROL || mask === MK_SHIFT || mask === MK_SHIFT + MK_CONTROL || iDup > 1) {
									playlistDataText += '\n---------------------------------------------------';
								}
								if (mask === MK_CONTROL) {
									playlistDataText += lShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + L. Click to ' + lShortcuts[MK_CONTROL].key + ')' : '';
									playlistDataText += mShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + M. Click to ' + mShortcuts[MK_CONTROL].key + ')' : '';
								} else if (mask === MK_SHIFT) {
									playlistDataText += lShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + L. Click to ' + lShortcuts[MK_SHIFT].key + ')' : '';
									playlistDataText += mShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + M. Click to ' + mShortcuts[MK_SHIFT].key + ')' : '';
								} else if (mask === MK_SHIFT + MK_CONTROL) {
									playlistDataText += lShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + L. Click to ' + lShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
									playlistDataText += mShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + M. Click to ' + mShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
								} else if (this.bShowTips) { // All Tips
									playlistDataText += '\n(L. Click to manage playlist)';
									playlistDataText += lShortcuts['DB_CLICK'].key !== defaultAction ? '\n(Double L. Click to ' + lShortcuts['DB_CLICK'].key + ')' : '';
									playlistDataText += '\n(R. Click for other tools / new playlists)';
									playlistDataText += lShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + L. Click to ' + lShortcuts[MK_CONTROL].key + ')' : '';
									playlistDataText += lShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + L. Click to ' + lShortcuts[MK_SHIFT].key + ')' : '';
									playlistDataText += lShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + L. Click to ' + lShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
									// Middle button
									playlistDataText += mShortcuts['SG_CLICK'].key !== defaultAction ? '\n(M. Click to ' + mShortcuts['SG_CLICK'].key + ')' : '';
									playlistDataText += mShortcuts[MK_CONTROL].key !== defaultAction ? '\n(Ctrl + M. Click to ' + mShortcuts[MK_CONTROL].key + ')' : '';
									playlistDataText += mShortcuts[MK_SHIFT].key !== defaultAction ? '\n(Shift + M. Click to ' + mShortcuts[MK_SHIFT].key + ')' : '';
									playlistDataText += mShortcuts[MK_SHIFT + MK_CONTROL].key !== defaultAction ? '\n(Ctrl + Shift + M. Click to ' + mShortcuts[MK_SHIFT + MK_CONTROL].key + ')' : '';
								}
								// Adding Duplicates on selection hint
								if (lShortcuts.hasOwnProperty(mask) && lShortcuts[mask].key === 'Send selection to playlist' || mShortcuts.hasOwnProperty(mask) && mShortcuts[mask].key === 'Send selection to playlist') {
									if (pls.isAutoPlaylist || pls.query) {playlistDataText += '\n' + '(' + (pls.isAutoPlaylist ? 'AutoPlaylists' : 'Smart Playlists') + ' are non editable, convert it first)';}
									else if (pls.extension === '.fpl') {playlistDataText += '\n(.fpl playlists are non editable, convert it first)';}
									else if (pls.isLocked) {playlistDataText += '\n(Locked playlists are non editable, unlock it first)';}
									else {
										const selItems = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
										if (!selItems || !selItems.Count) {playlistDataText += '\n(No items on active playlist current selection)';}
									}
									if (this.checkSelectionDuplicatesPlaylist({playlistIndex: this.index})) {playlistDataText += '\nWarning! Some track(s) already present...';}
								}
								if (iDup > 1) {playlistDataText += '\nWarning! Multiple UI playlists ' + _p(iDup) + ' have the same name.';}
								this.tooltip.SetValue(playlistDataText, true);
							}
							break;
						}
						default: {
							this.clearSelPlaylistCache();
							this.tooltip.SetValue(null); // Removes tt when not over a list element
							window.Repaint(); // Removes selection indicator
							break;
						}
					}
					break;
				}
			}
			return true;
		} else {
			this.up_btn.hover = false;
			this.down_btn.hover = false;
			return false;
		}
	}
	
	this.cacheLastPosition = () => { // Saves info to restore position later!
		if (this.inRange && this.index !== -1) {
			this.lastIndex = this.index;
			this.lastOffset = this.offset;
		}
		currentItemIndex = this.lastIndex;
		if (currentItemIndex >= this.items) {currentItemIndex = this.items - 1;}
		bMaintainFocus = (currentItemIndex !== -1); // Skip at init or when mouse leaves panel
		currentItemPath = bMaintainFocus ? this.data[currentItemIndex].path : null;
		currentItemNameId = bMaintainFocus ? this.data[currentItemIndex].nameId : null;
		currentItemIsAutoPlaylist = bMaintainFocus ? this.data[currentItemIndex].isAutoPlaylist : null;
	}
	
	this.clearLastPosition = () => { // Clears position
		if (this.inRange && this.index !== -1) {
			this.lastIndex = this.index;
			this.lastOffset = this.offset;
		}
		currentItemIndex = -1;
		bMaintainFocus = (currentItemIndex !== -1); // Skip at init or when mouse leaves panel
		currentItemPath = bMaintainFocus ? this.data[currentItemIndex].path : null;
		currentItemNameId = bMaintainFocus ? this.data[currentItemIndex].nameId : null;
		currentItemIsAutoPlaylist = bMaintainFocus ? this.data[currentItemIndex].isAutoPlaylist : null;
		this.index = -1;
		this.offset = 0;
	}
	
	this.lbtn_up = (x, y, mask) => {
		const shortcuts = this.getShortcuts('L');
		if (this.trace(x, y)) {
			this.cacheLastPosition();
			switch (true) {
				case this.up_btn.lbtn_up(x, y):
				case this.down_btn.lbtn_up(x, y):
				case !this.inRange:
					if (!shortcuts.hasOwnProperty(mask) || shortcuts[mask].key === 'Multiple selection') {this.resetMultSelect();}
					break;
				default: {
					const z = this.index;
					if (x > this.x && x < this.x + (this.bShowSep ? this.x + this.w - 20 : this.x + this.w)) {
						if (shortcuts.hasOwnProperty(mask)) {
							if (shortcuts[mask].key === 'Send selection to playlist') {
								const cache = [this.offset, this.index];
								let bSucess = false;
								if (this.indexes.length) {
									this.indexes.forEach((z) => {
										if (this.sendSelectionToPlaylist({playlistIndex: z, bCheckDup: true, bPaint: false})) {
											bSucess = true;
										}
									});
								} else {bSucess = this.sendSelectionToPlaylist({playlistIndex: z, bPaint: false});}
								if (bSucess) {
									[this.offset, this.index] = cache;
									window.RepaintRect(0, this.y, window.Width, this.h); // Don't reload the list but just paint with changes to avoid jumps
								}
							} else {
								this.executeAction(z, shortcuts[mask]);
							}
						} else { // Only mouse
							if (!this.bDoubleclick) { // It's not a second lbtn click
								this.timeOut = delayFn((x,y) => {
									this.bSelMenu = true; // Used to maintain current selection rectangle while drawing the menu
									if (this.indexes.length) {
										createMenuLeftMult(this.indexes).btn_up(x,y);
									} else {
										createMenuLeft(z).btn_up(x,y); // Must force index here since the mouse may move on the 100 ms delay to another pls (bug) or even out of range (crash)
									}
									this.bSelMenu = false;
								}, 100)(x,y); // Creates the menu and calls it later
							} else {this.bDoubleclick = false;}
						}
					}
					break;
				}
			}
			return true;
		} else if (this.traceHeader(x, y)) { // Highlight active playlist or playing playlist
			// Select all from current view or clean selection
			if (shortcuts.hasOwnProperty(mask) && shortcuts[mask].key === 'Multiple selection') {
				if (this.indexes.length) {this.resetMultSelect();}
				else {this.indexes = range(0, this.data.length - 1, 1);}
			}
			if (this.traceHeaderButton(x,y)) {
				_explorer(this.playlistsPath);
			} else {
				this.showCurrPls() || this.showCurrPls({bPlayingPls: true});
			}
			this.move(this.mx, this.my); // Updates tooltip even when mouse hasn't moved
			return true;
		} else {
			if (!shortcuts.hasOwnProperty(mask) || shortcuts[mask].key === 'Multiple selection') {this.resetMultSelect();}
			return false;
		}
	}
	
	this.mbtn_up = (x, y, mask) => {
		const shortcuts = this.getShortcuts('M');
		if (this.trace(x, y)) {
			this.cacheLastPosition();
			switch (true) {
				case !this.inRange:
					if (shortcuts[shortcuts.hasOwnProperty(mask) ? mask : 'SG_CLICK'].key === 'Multiple selection') {this.resetMultSelect();}
					break;
				default: {
					const z = this.index;
					if (x > this.x && x < this.x + (this.bShowSep ? this.x + this.w - 20 : this.x + this.w)) {
						if (shortcuts.hasOwnProperty(mask)) {
							if (shortcuts[mask].key === 'Send selection to playlist') {
								const cache = [this.offset, this.index];
								let bSucess = false;
								if (this.indexes.length) {
									this.indexes.forEach((z) => {
										if (this.sendSelectionToPlaylist({playlistIndex: z, bCheckDup: true, bPaint: false})) {
											bSucess = true;
										}
									});
								} else {bSucess = this.sendSelectionToPlaylist({playlistIndex: z, bPaint: false});}
								if (bSucess) {
									[this.offset, this.index] = cache;
									window.RepaintRect(0, this.y, window.Width, this.h); // Don't reload the list but just paint with changes to avoid jumps
								}
							} else {
								this.executeAction(z, shortcuts[mask]);
							}
						} else { // Only mouse
							this.executeAction(z, shortcuts['SG_CLICK']);
						}
					}
					break;
				}
			}
			return true;
		} else if (this.traceHeader(x, y)) {
			// Select all from current view or clean selection
			if (shortcuts[shortcuts.hasOwnProperty(mask) ? mask : 'SG_CLICK'].key === 'Multiple selection') {
				if (this.indexes.length) {this.resetMultSelect();}
				else {this.indexes = range(0, this.data.length - 1, 1);}
			}
			return false;
		} else {
			// Clean selection
			if (shortcuts[shortcuts.hasOwnProperty(mask) ? mask : 'SG_CLICK'].key === 'Multiple selection') {this.resetMultSelect();}
			return false;
		}
	}
	
	this.lbtn_dblclk = (x, y) => {
		const shortcuts = this.getShortcuts('L');
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
					this.executeAction(z, shortcuts['DB_CLICK']);
					break;
				}
			}
			return true;
		} else if (this.traceHeader(x, y)) {
			cycleCategories();
			this.move(this.mx, this.my); // Updates tooltip even when mouse hasn't moved
			return true;
		} else {
			if (!shortcuts.hasOwnProperty(mask) || shortcuts[mask].key === 'Multiple selection') {this.resetMultSelect();}
			return false;
		}
	}
	
	this.key_down = (k) => {
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
					if (offset === this.offset) {window.Repaint(); currentItemIndex = 0; break;} else {offset = this.offset;}
				}
				return true;
			}
			case VK_END: {
				let offset = 0;
				while (true) {
					this.wheel({s: -1, bPaint: false});
					if (offset === this.offset) {window.Repaint(); currentItemIndex = this.items - 1; break;} else {offset = this.offset;}
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
			// Quick-search
			default: { // Search by key according to the current sort method: it extracts the property to check against from the method name 'By + [playlist property]'
				const keyChar = keyCode(k);
				if (keyChar && keyChar.length === 1 && /[_A-z0-9]/.test(keyChar)) {
					if (animation.fRepaint !== null) {clearTimeout(animation.fRepaint);}
					if (isFinite(this.lastCharsPressed.ms) && Math.abs(this.lastCharsPressed.ms - Date.now()) > 600) {this.lastCharsPressed = {str: '', ms: Infinity, bDraw: false};}
					let method = this.methodState.split('\t')[0].replace('By ', '');
					if (method === 'name' || !(new oPlaylist('', '')).hasOwnProperty(method)) {method = 'nameId';} // Fallback to name for sorting methods associated to non tracked variables
					this.lastCharsPressed.str += keyChar;
					this.lastCharsPressed.bDraw = true;
					const idx = this.data.findIndex((pls, idx) => {
						if (pls.hasOwnProperty(method) && pls[method] !== null && pls[method] !== void(0)) {
							const bArray = isArray(pls[method]);
							if (bArray && !pls[method].length) {return false;}
							const val = bArray ? pls[method][0] : pls[method];
							if (typeof val === 'string' && val.length) {return val.toLowerCase().startsWith(this.lastCharsPressed.str);} // Fuzzy search?
							if (typeof val === 'number') {return val.toString().startsWith(this.lastCharsPressed.str);}
							else {return false;}
						} else {return false;}
					});
					this.showPlsByIdx(idx);
					this.lastCharsPressed.ms = Date.now();
				} else {
					this.lastCharsPressed = {str: '', ms: Infinity, bDraw: false};
					return false;
				}
			}
		}
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
	
	this.resetMultSelect = () => {
		this.indexes = [];
		return this.indexes;
	}
	
	this.executeAction = (z, shortcut) => {
		if (shortcut.key !== 'Multiple selection' && this.indexes.length) {
			this.indexes.forEach((z) => {shortcut.func(z);});
		} else {shortcut.func(z);}
	}
	
	this.getDefaultShortcuts = (mouseBtn = 'L') => {
		const shortcuts = {options: null, actions: null};
		switch (mouseBtn.toUpperCase()) {
			case 'L': {
				shortcuts.options = [
					{key: 'Ctrl',			mask: MK_CONTROL},
					{key: 'Shift',			mask: MK_SHIFT},
					{key: 'Ctrl + Shift',	mask: MK_SHIFT + MK_CONTROL},
					{key: 'Double Click',	mask: 'DB_CLICK'}
				];
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
		}
		if (shortcuts.options) { // Are shared for all mouse clicks
			shortcuts.actions = [
				{key: '- None -',					func: () => {void(0);}},
				{key: 'Load / show playlist',		func: this.loadPlaylistOrShow},
				{key: 'Send selection to playlist',	func: null}, // Processed at lbtn_up
				{key: 'Clone playlist in UI',		func: clonePlaylistInUI.bind(this, this)},
				{key: 'Recycle playlist',			func: this.removePlaylist},
				{key: 'Lock/unlock playlist file',	func: switchLock.bind(this, this)},
				{key: 'Lock/unlock UI playlist',	func: switchLockUI.bind(this, this)},
				{key: 'Multiple selection',			func: this.multSelect},
			];
		}
		return shortcuts;
	}
	
	this.getDefaultShortcutAction = (mouseBtn = 'L') => {
		const shortcuts = this.getDefaultShortcuts(mouseBtn);
		return shortcuts.actions ? shortcuts.actions[0].key : '';
	}
	
	this.getShortcuts = (mouseBtn = 'L') => {
		const shortcuts = {};
		const {options, actions} = this.getDefaultShortcuts(mouseBtn);
		let prop;
		switch (mouseBtn.toUpperCase()) {
			case 'M': {prop = this.mShortcuts; break;}
			case 'L': {prop = this.lShortcuts; break;}
		}
		if (prop) {
			for (let key in prop) {
				const mask = options.find((obj) => {return obj.key === key;}).mask || 'none';
				const action = prop[key];
				const func = actions.find((obj) => {return obj.key === action;}).func || (() => {console.popup('Shortcut not properly set: ' + key + ' --> ' + action);});
				shortcuts[mask] = {key: action, func};
			}
		}
		return shortcuts;
	}
	
	// Drag n drop
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
	
	this.checkSelectionDuplicatesPlaylist = ({playlistIndex, bAlsoHidden = false} = {}) => {
		if (playlistIndex < 0 || (!bAlsoHidden && playlistIndex >= this.items) || (bAlsoHidden && playlistIndex >= this.itemsAll)) {
			console.log('Playlist Manager: Error adding tracks to playlist. Index out of bounds.');
			return false;
		}
		const pls = bAlsoHidden ? this.dataAll[playlistIndex] : this.data[playlistIndex];
		let bDup = false;
		if (!pls.isAutoPlaylist && !pls.query && pls.extension !== '.fpl' && pls.size) {
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
		return bDup;
	}
	
	this.sendSelectionToPlaylist = ({playlistIndex, bCheckDup = false, bAlsoHidden = false, bPaint = true} = {}) => {
		if (playlistIndex < 0 || (!bAlsoHidden && playlistIndex >= this.items) || (bAlsoHidden && playlistIndex >= this.itemsAll)) {
			console.log('Playlist Manager: Error adding tracks to playlist. Index out of bounds.');
			return false;
		}
		const pls = bAlsoHidden ? this.dataAll[playlistIndex] : this.data[playlistIndex];
		if (pls.isAutoPlaylist || pls.isLocked || pls.extension === '.fpl' || pls.query) {return false;} // Skip non writable playlists
		let selItems = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
		if (selItems && selItems.Count) {
			if (bCheckDup) {this.checkSelectionDuplicatesPlaylist({playlistIndex, bAlsoHidden});}
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
					if (!handle.Path.startsWith('http://') && !handle.Path.startsWith('https://') && !_isFile(handle.Path)) {
						fb.ShowPopupMessage('Warning! There is at least one dead item among the tracks on current selection, there may be more.\n\n(' + i + ') ' + handle.RawPath, window.Name); 
						return true;
					}
					return false;
				});
				// Add to pls
				this.addTracksToPlaylist({playlistIndex: playlistIndex, handleList: selItems, bAlsoHidden, bPaint});
				const index = plman.FindPlaylist(pls.nameId);
				// Add items to chosen playlist too if it's loaded within foobar unless it's the current playlist
				if (index !== -1 && plman.ActivePlaylist !== index) {plman.InsertPlaylistItems(index, plman.PlaylistItemCount(index), selItems);}
				return true;
			}
		}
		return false;
	}
	
	this.clearSelPlaylistCache = () => {
		this.selPaths = {pls: new Set(), sel: []};
	}
	
	this.addTracksToPlaylist = ({playlistIndex, handleList, bAlsoHidden = false, bPaint = true} = {}) => { // Sends tracks to playlist file directly
		if (playlistIndex < 0 || (!bAlsoHidden && playlistIndex >= this.items) || (bAlsoHidden && playlistIndex >= this.itemsAll)) {
			console.log('Playlist Manager: Error adding tracks to playlist. Index out of bounds.');
			return false;
		}
		if (typeof handleList === 'undefined' || handleList === null || handleList.Count === 0) {
				console.log('Playlist Manager: Error adding tracks to playlist. Handle list has no tracks.');
			return false;
		}
		const pls =  bAlsoHidden ? this.dataAll[playlistIndex] : this.data[playlistIndex];
		if (pls.isLocked) { // Skip locked playlists
			console.log('Playlist Manager: Skipping save on locked playlist.');
			return false;
		}
		console.log('Playlist Manager: Updating playlist... ' + pls.name);
		const [handleUpdate, tagsUpdate] = this.bAutoTrackTag ? this.getUpdateTrackTags(handleList, pls) : [null, null]; // Done at 2 steps, first get tags
		const playlistPath = pls.path;
		const bUI = pls.extension === '.ui';
		let done = bUI ? true : addHandleToPlaylist(handleList, playlistPath, (this.bRelativePath ? this.playlistsPath : ''), this.bBOM);
		if (!done) {
			fb.ShowPopupMessage('Playlist generation failed while writing file \'' + playlistPath + '\'.', window.Name);
			return false;
		}
		// If done, then we repaint later. Now we manually update the data changes... only one playlist length and/or playlist file size can change here
		this.editData(pls, {
			size: pls.size + handleList.Count,
			duration: (pls.duration !== - 1 ? pls.duration + handleList.CalcTotalDuration() : handleList.CalcTotalDuration()),
			fileSize: bUI ? 0 : utils.GetFileSize(done), // done points to new path, note playlist extension is not always = 'playlistPath
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
		const oldHandles = pls.path && !pls.isAutoPlaylist ? getHandlesFromPlaylist(pls.path, this.playlistsPath) : null;
		const newHandles = handleList.Clone();
		if (oldHandles) {
			oldHandles.Sort();
			newHandles.Sort();
			newHandles.MakeDifference(oldHandles);
		}
		let tagsArr = [];
		const newHandlesNoTags = new FbMetadbHandleList();
		if (newHandles.Count) {
			console.log('Playlist Manager: Auto-tagging enabled, retrieving tags for new tracks...');
			for (let i = 0; i < newHandles.Count; ++i) {
				let tags = {};
				pls.trackTags.forEach((tagObj) => { // TODO: Don't rewrite tags but add?
					const name = Object.keys(tagObj)[0];
					const expression = tagObj[name];
					let value = null;
					if (expression.indexOf('$') !== -1) { // TF
						try {value = fb.TitleFormat(expression).EvalWithMetadb(newHandles[i]);}
						catch (e) {fb.ShowPopupMessage('TF expression is not valid:\n' + expression, window.Name);}
					} else if (expression.indexOf('%') !== -1) { // Tag remapping
						try {value = fb.TitleFormat(expression).EvalWithMetadb(newHandles[i]);}
						catch (e) {fb.ShowPopupMessage('TF expression is not valid:\n' + expression, window.Name);}
					} else if (expression.indexOf('JS:') !== -1) { // JS expression by function name at 'helpers_xxx_utils.js'
						let funcName = expression.replace('JS:', '');
						if (funcDict.hasOwnProperty(funcName)) {
							try {value = funcDict[funcName]();}
							catch (e) {fb.ShowPopupMessage('JS expression failed:\n' + funcName, window.Name);}
						} else {fb.ShowPopupMessage('JS function not found at \'helpers_xxx_utils.js\':\n' + funcName, window.Name);}
					} else if (expression.indexOf(',') !== -1) { // Array (list sep by comma)
						value = expression.split(',');
						value = value.map((_) => {return _.trim();});
					} else {value = expression;} // Strings, numbers, etc.
					if (value) { // Append to current tags
						const currVal = getTagsValues(newHandles[i], [name], true);
						if (currVal && currVal.length) {
							if (currVal.indexOf(value) === -1) {tags[name] = [...currVal, value];} // Don't duplicate values
						} else {tags[name] = value;}
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
		if (arePlaylistNamesDuplicated()) { // Force no duplicate names on foobar playlists when auto-saving...	
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
	
	this.updatePlaylist = ({playlistIndex, bCallback = false} = {}) => { // Only changes total size
		// playlistIndex: We have a foobar playlist and we iterate over playlist files
		// Or we have the playlist file and we iterate over foobar playlists
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
			if (arePlaylistNamesDuplicated()) { // Force no duplicate names on foobar playlists when auto-saving...	
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
					if (bCallback) {return false;} // Skips locked playlists only for auto-saving!
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
						let done = savePlaylist({playlistIndex: fbPlaylistIndex, playlistPath, ext: extension, playlistName, useUUID: this.optionsUUIDTranslate(), bLocked: plsData.isLocked, category: plsData.category, tags: plsData.tags, relPath: (this.bRelativePath ? this.playlistsPath : ''), trackTags: plsData.trackTags, playlist_mbid: plsData.playlist_mbid, bBom: this.bBOM});
						if (!done) {
							fb.ShowPopupMessage('Playlist generation failed while writing file \'' + playlistPath + '\'.', window.Name);
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
							duration: plman.GetPlaylistItems(fbPlaylistIndex).CalcTotalDuration()
						});
						plman.RenamePlaylist(fbPlaylistIndex, plsData.nameId);
						// Warn about dead items
						if (!bCallback || (!bCallback && this.bDeadCheckAutoSave)) {
							const selItems = plman.GetPlaylistItems(fbPlaylistIndex).Convert();
							if (selItems && selItems.length) {
								selItems.some((handle, i) => {
									if (!handle.Path.startsWith('http://') && !handle.Path.startsWith('https://') && !_isFile(handle.Path)) {
										fb.ShowPopupMessage('Warning! There is at least one dead item amongst the tracks used to create the playlist, there may be more.\n\n(' + i + ') '+ handle.RawPath, window.Name); 
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
				this.update(true, true); // We have already updated data before only for the variables changed
				this.filter();
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
		if (!bArray && idx !== -1 && !this.data[idx].isAutoplaylist && !bAllExt && !this.data[idx].extension === '.fpl' && !this.data[idx].extension === '.xsp') {return '';} // Safety check
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
				if ((this.data[i].extension === '.fpl' || this.data[i].extension === '.xsp') && bAllExt) {toSave.push(this.data[i]);}
				else if (this.data[i].isAutoplaylist) {toSave.push(this.data[i]);}
			});
		}
		else if (idx === -1) {toSave = bAllExt ? [...this.dataAutoPlaylists, ...this.dataFpl, ...this.dataXsp] : [...this.dataAutoPlaylists];}
		else {toSave.push(this.data[idx]);}
		_save(path, JSON.stringify(toSave, this.replacer, '\t'), this.bBOM); // No BOM
		return path;
	}
	
	this.loadExternalJson = ({path = '', bOldVersion} = {}) => {
		var test = new FbProfiler(window.Name + ': ' + 'Load json file');
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
				const oAutoPlaylistItem = new oPlaylist('', '', item.name, '', size, 0, false, true, {query: item.query, sort: item.sort, bSortForced: item.forced}, '', [], [], 0, duration, '');
				const diffKeys = defPlsKeys.difference(new Set(Object.keys(item)));
				if (diffKeys.size) {diffKeys.forEach((key) => {item[key] = defPls[key];});}
				// width is done along all playlist internally later...
				dataExternalPlaylists.push(oAutoPlaylistItem);
			});
		} else if (answer === popup.no) {
			data.forEach((item) => { // TODO: .fpl importing?
				if (!item.hasOwnProperty('query') || !item.hasOwnProperty('isAutoPlaylist') || !item.isAutoPlaylist) {return;} // May be a non AutoPlaylist item
				if (!checkQuery(item.query, false, true)) {fb.ShowPopupMessage('Query not valid:\n' + item.query, window.Name); return;} // Don't allow empty but allow sort
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
		test.Print();
		return true;
	}
	// Categories and tags
	this.categories = (idx = null) => {
		const defCateg = '(None)';
		if (idx === 0) {return defCateg;}
		let categ = new Set();
		this.dataAll.forEach( (playlist) => {if (playlist.category.length) {categ.add(playlist.category);}});
		return idx ? [defCateg, ...[...categ].sort()][idx] : [defCateg, ...[...categ].sort()];
	}
	this.categoryState = [];
	this.tags = (idx = null) => {
		const defTag = '(None)';
		if (idx === 0) {return defTag;}
		let tags = new Set();
		this.dataAll.forEach( (playlist) => {if (playlist.tags.length) {playlist.tags.forEach((tag) => {tags.add(tag);});}});
		return idx ? [defTag, ...[...tags].sort()][idx] : [defTag, ...[...tags].sort()];
	}
	this.tagState = [];
	// These are constant
	this.constLockStates = () => {return ['All','Not locked','Locked'];};
	this.constAutoPlaylistStates = (bUI = this.bAllPls) => {return bUI ? this.constAutoPlaylistStates(false).concat(['UI-only Playlists']): ['All','AutoPlaylists && Smart Playlists','Standard Playlists'];};
	this.constExtStates = (bUI = this.bAllPls) => {return bUI ? this.constExtStates(false).concat(['.ui']) : ['All', ...loadablePlaylistFormats];};
	// These rotate over time
	this.lockStates = this.constLockStates();
	this.autoPlaylistStates = this.constAutoPlaylistStates();
	this.extStates = this.constExtStates();
	
	this.isFilterActive = () => {return (this.constLockStates()[0] !== this.lockStates[0] || this.constAutoPlaylistStates()[0] !== this.autoPlaylistStates[0] || this.constExtStates()[0] !== this.extStates[0]);};
	this.filter = ({autoPlaylistState = this.autoPlaylistStates[0], lockState = this.lockStates[0], extState = this.extStates[0], categoryState = this.categoryState, nameState = '', tagState = this.tagState} = {}) => {
		// On first filter we use this.dataAll as origin
		if (autoPlaylistState === this.constAutoPlaylistStates()[0]) { // AutoPlaylists
			this.data = [...this.dataAll]; // Copy of objects
		} else if (autoPlaylistState === this.constAutoPlaylistStates()[1]) {
			this.data = this.dataAll.filter((item) => {return item.isAutoPlaylist || item.query;});
		} else if (autoPlaylistState === this.constAutoPlaylistStates()[2]) {
			this.data = this.dataAll.filter((item) => {return !item.isAutoPlaylist && !item.query && item.extension !== '.ui';});
		} else if (this.bAllPls && autoPlaylistState === this.constAutoPlaylistStates()[3]) {
			this.data = this.dataAll.filter((item) => {return item.extension === '.ui';});
		}
		// And then... we use this.data to filter again by lock state
		if (lockState === this.constLockStates()[0]) {
			// this.data = this.data;
		} else if (lockState === this.constLockStates()[1]) {
			this.data = this.data.filter((item) => {return !item.isLocked;});
		} else if (lockState === this.constLockStates()[2]) {
			this.data = this.data.filter((item) => {return item.isLocked;});
		}
		// And again with extension
		if (extState === this.constExtStates()[0]) {
			// this.data = this.data;
		} else {
			this.data = this.data.filter((item) => {return item.extension === extState;});
		}
		// And again with categories
		if (!isArrayEqual(categoryState, this.categories())) {
			this.data = this.data.filter((item) => {
				if (categoryState.indexOf('(None)') !== -1) {return !item.category.length || categoryState.indexOf(item.category) !== -1;}
				else {return categoryState.indexOf(item.category) !== -1;}
			});
		}
		// And again with tags
		if (!isArrayEqual(tagState, this.tags())) {
			this.data = this.data.filter((item) => {
				if (tagState.indexOf('(None)') !== -1) {return !item.tags.length || new Set(tagState).intersectionSize(new Set(item.tags));}
				else {return new Set(tagState).intersectionSize(new Set(item.tags));}
			});
		}
		// And again with names
		// if (name.length)) {
			// this.data = this.data.filter((item) => {
				// return item.name.indexOf(name) !=== -1;}
			// });
		// }
		// Focus
		this.items = this.data.length;
		if (bMaintainFocus) {
			if (currentItemIndex < this.items) {
				for (let i = 0; i < this.items; i++) { // Also this separate for the same reason, to 
					// Get current index of the previously selected item to not move the list focus when updating...
					// Offset is calculated simulating the wheel, so it moves to the previous location
					if (currentItemIsAutoPlaylist) { // AutoPlaylists
						if (this.data[i].isAutoPlaylist && this.data[i].nameId === currentItemNameId) { 
							this.simulateWheelToIndex({toIndex: i, currentItemIndex, originalOffset: this.lastOffset});
							break;
						}
					} else if (this.data[i].path === currentItemPath) { // Standard Playlists
						this.simulateWheelToIndex({toIndex: i, currentItemIndex, originalOffset: this.lastOffset});
						break;
					}
				}
			} else {
				this.clearLastPosition();
			}
		}
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
		// Categories
		if (!isArrayEqual(categoryState, this.categoryState)) {
			this.categoryState = categoryState;
		}
		// Tags
		if (!isArrayEqual(tagState, this.tagState)) {
			this.tagState = tagState;
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
		window.Repaint();
	}
	this.resetFilter = ({autoPlaylist = true, lock = true, ext = true, tag = true, category = true} = {}) => {
		this.filter({autoPlaylistState: list.constAutoPlaylistStates()[0], lockState: list.constLockStates()[0], extState: list.constExtStates()[0], tagState: list.tags(), categoryState: list.categories()});
	}
	
	this.sortMethods = () => { // These are constant. Expects the first sorting order of every method to be the natural one... also method must be named 'By + [playlist property]' for quick-searching
		return {'By name': 
					{
						'Az': (a, b) => {return a.name.localeCompare(b.name);}, 
						'Za': (a, b) => {return 0 - a.name.localeCompare(b.name);}
					},
				'By size': 
					{
						'(S) Asc.': (a, b) => {return a.size - b.size;},
						'(S) Des.': (a, b) => {return b.size - a.size;}
					},
				'By category': 
					{
						'(C) Az': (a, b) => {return a.category.localeCompare(b.category);}, 
						'(C) Za': (a, b) => {return 0 - a.category.localeCompare(b.category);}
					},
				'By tags\t-first one-': 
					{
						'(T) Az': (a, b) => {return (a.tags[0] || '').localeCompare((b.tags[0] || ''));}, 
						'(T) Za': (a, b) => {return 0 - (a.tags[0] || '').localeCompare((b.tags[0] || ''));}
					},
				'By date': 
					{
						'(D) Asc.': (a, b) => {return lastModified(a.path, true) - lastModified(b.path, true);}, // lastModified returns -1 when file does not exist
						'(D) Des.': (a, b) => {return lastModified(b.path, true) - lastModified(a.path, true);}
					}
		};
	}
	this.getOppositeSortState = (sortState, methodState = this.methodState) => { // first or second key
		const keys = Object.keys(this.sortMethods()[methodState]);
		let index = keys.indexOf(sortState);
		if (index === -1) {return null;}
		return ((index === 0) ? keys[++index] : keys[--index]);
	}
	this.getIndexSortState = (sortState = this.sortState, methodState = this.methodState) => {
		const keys = Object.keys(this.sortMethods()[methodState]);
		const index = keys.indexOf(sortState);
		return index;
	}
	// Use these to always get valid values
	this.getSortState = () => {
		const keys = Object.keys(this.sortMethods()[this.methodState]);
		let index = keys.indexOf(this.sortState);
		if (index === -1) {return Object.keys(this.sortMethods()[this.methodState])[0];}
		return this.sortState;
	}
	this.setSortState = (sortState) => {
		// Check if it's a valid one
		const keys = Object.keys(this.sortMethods()[this.methodState]);
		let index = keys.indexOf(sortState);
		if (index === -1) {return false;}
		// Save it
		this.sortState = sortState;
		this.properties['sortState'][1] = this.sortState;
		overwriteProperties(this.properties);
		return true;
	}
	this.getMethodState = () => {
		const keys = Object.keys(this.sortMethods());
		let index = keys.indexOf(this.methodState);
		if (index === -1) {return Object.keys(this.sortMethods())[0];}
		return this.methodState;
	}
	this.setMethodState = (methodState) => {
		// Check if it's a valid one
		const keys = Object.keys(this.sortMethods());
		let index = keys.indexOf(methodState);
		if (index === -1) {return false;}
		// Save it
		this.methodState = methodState;
		this.properties['methodState'][1] = this.methodState;
		overwriteProperties(this.properties);
		return true;
	}
	this.methodState = this.getMethodState(); // On first call first method will be default
	this.sortState = this.getSortState(); // On first call first state of that method will be default
	
	this.sort = (sortMethod = this.sortMethods()[this.methodState][this.sortState], bPaint = false) => {
		this.data.sort(sortMethod); // Can use arbitrary methods...
		this.dataAll.sort(sortMethod); // This is done, because filter uses a copy of dataAll when resetting to no filter! So we need a sorted copy
		if (bMaintainFocus) {
			for (let i = 0; i < this.items; i++) { // Also this separate for the same reason, to 
				// Get current index of the previously selected item to not move the list focus when updating...
				// Offset is calculated simulating the wheel, so it moves to the previous location
				if (currentItemIsAutoPlaylist) { // AutoPlaylists
					if (this.data[i].isAutoPlaylist && this.data[i].nameId === currentItemNameId) { 
						this.simulateWheelToIndex({toIndex: i, currentItemIndex, originalOffset: this.lastOffset});
						break;
					}
				} else if (this.data[i].path === currentItemPath) { // Standard Playlists
					this.simulateWheelToIndex({toIndex: i, currentItemIndex, originalOffset: this.lastOffset});
					break;
				}
			}
		}
		if (bPaint) {window.Repaint();}
	}
	
	this.update = (bReuseData = false, bNotPaint = false, currentItemIndex = -1, bInit = false) => {
		const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
		const oldCategories = this.categories();
		const oldTags = this.tags();
		// Saves currently selected item for later use
		const bMaintainFocus = (currentItemIndex !== -1); // Skip at init or when mouse leaves panel
		if (bReuseData) {
			// Recalculates from data
			this.data = this.data.map((item) => {
					if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal) + 8 + maxIconWidth;} 
					else {item.width = _textWidth(item.name, panel.fonts.normal) +  + 8 + maxIconWidth;}
					return item;
				});
			this.dataAll = this.dataAll.map((item) => {
					if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal) + 8 + maxIconWidth;} 
					else {item.width = _textWidth(item.name, panel.fonts.normal) +  + 8 + maxIconWidth;}
					return item;
				});
		} else { // Recalculates from files
			// AutoPlaylist and FPL From json
			console.log('Playlist manager: reading files from ' + _q(this.playlistsPath));
			this.dataAutoPlaylists = [];
			this.dataFpl = [];
			this.dataXsp = [];
			this.indexes = [];
			if (_isFile(this.filename)) {
				const bUpdateSize = this.bUpdateAutoplaylist && this.bShowSize;
				const bUpdateTags = this.bAutoTrackTag && this.bAutoTrackTagAutoPls && this.bAutoTrackTagAutoPlsInit && bInit;
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
									if (handleList && item.size && this.bAutoTrackTag && this.bAutoTrackTagAutoPls && this.bAutoTrackTagAutoPlsInit && bInit) {
										if (item.hasOwnProperty('trackTags') && item.trackTags && item.trackTags.length) { // Merge tag update if already loading query...
											const bUpdated = this.updateTags(handleList, item);
											if (bUpdated) {console.log('Playlist Manager: Auto-tagging playlist ' + item.name);}
										}
									}
									if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal)  + 8 + maxIconWidth;}
									if (handleList && (cacheSize !== item.size || cacheDuration !== item.duration)) {
										console.log('Updating ' + (item.isAutoPlaylist ? 'AutoPlaylist' : 'Smart Playlist') + ' size: ' + item.name);
										if (item.extension === '.xsp') {
											let xspPlaylist = this.dataXsp.find((pls) => {return pls.name === item.name;});
											if (xspPlaylist) {
												xspPlaylist.size = item.size;
												xspPlaylist.duration = item.duration;
											}
										}
										window.Repaint();
									}
									resolve('done');
								});
							}));
						} else { // Updates tags for AutoPlaylists. Warning takes a lot of time! Only when required...
							if (bUpdateTags) {
								if (item.hasOwnProperty('trackTags') && item.trackTags && item.trackTags.length) {
									promises.push(new Promise((resolve) => {
										loadAutoPlaylistAsync(item, i).then((handleList = null) => {
											if (handleList && item.size) {
												const bUpdated = this.updateTags(handleList, item);
												if (bUpdated) {console.log('Playlist Manager: Auto-tagging done for playlist ' + item.name);}
											}
											if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal)  + 8 + maxIconWidth;}
											if (handleList && (cacheSize !== item.size || cacheDuration !== item.duration)) {
												console.log('Updating ' + (item.isAutoPlaylist ? 'AutoPlaylist' : 'Smart Playlist') + ' size: ' + item.name);
												if (item.extension === '.xsp') {
													let xspPlaylist = this.dataXsp.find((pls) => {return pls.name === item.name;});
													if (xspPlaylist) {
														xspPlaylist.size = item.size;
														xspPlaylist.duration = item.duration;
													}
												}
												window.Repaint();
											}
											resolve('done');
										});
									}));
								} else {
									promises.push(new Promise((resolve) => {resolve('done');})); // To ensure logging, saving and dynamic menu update
								}
							}
						}
						if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal)  + 8 + maxIconWidth;} 
						else {item.width = _textWidth(item.name, panel.fonts.normal) + 8 + maxIconWidth;}
						if (item.isAutoPlaylist) {this.dataAutoPlaylists.push(item);}
						else if (item.extension === '.xsp') {this.dataXsp.push(item);}
					} else if (item.extension === '.fpl') {
						if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal)  + 8 + maxIconWidth;} 
						else {item.width = _textWidth(item.name, panel.fonts.normal) + 8 + maxIconWidth;}
						this.dataFpl.push(item);
					}
				});
				if (promises.length) {Promise.all(promises).then((_) => {test.Print(); this.save();});} // Updates this.dataAutoPlaylists when all are processed
			}
			this.itemsAutoplaylist = this.dataAutoPlaylists.length;
			this.itemsFpl = this.dataFpl.length;
			this.itemsXsp = this.dataXsp.length;
			this.data = [];
			this.data = loadPlaylistsFromFolder(this.playlistsPath).map((item) => {
					if (item.extension === '.fpl') { // Workaround for fpl playlist limitations... load cached playlist size and other data
						if (this.bFplLock) {item.isLocked = true;}
						let fplPlaylist = this.dataFpl.find((pls) => {return pls.name === item.name;});
						if (fplPlaylist) {
							item.category = fplPlaylist.category;
							item.tags = fplPlaylist.tags;
							item.size = fplPlaylist.size;
							item.duration = fplPlaylist.duration;
						}
						this.fplPopup();
					} else if (item.extension === '.pls') {
						this.plsPopup();
					} else if (item.extension === '.xspf') {
						this.xspfPopup();
					} else if (item.extension === '.xsp') {
						let xspPlaylist = this.dataXsp.find((pls) => {return pls.name === item.name;});
						if (xspPlaylist) {
							item.category = xspPlaylist.category;
							item.tags = xspPlaylist.tags;
							item.size = xspPlaylist.size;
							item.duration = xspPlaylist.duration;
							item.isLocked = xspPlaylist.isLocked;
						}
						this.xspPopup();
					}
					if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal)  + 8 + maxIconWidth;} 
					else {item.width = _textWidth(item.name, panel.fonts.normal) + 8 + maxIconWidth;}
					return item;
				});
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
						console.log('Error writing Auto-Tag(s) to playlist file: ' + item.name + '(' + path + ')\nThis usually happens when the playlist has been created by an external program. Load the playlist within foobar and force and update to save it with the required format.');
						console.log('Playlist manager: Restoring backup...');
					} else if (backPath.length && _isFile(backPath)) {_deleteFile(backPath);}
				}
				// Perform Auto-Tags actions
				if (this.bApplyAutoTags) {
					if (item.tags.indexOf('bAutoLoad') !== -1) {this.loadPlaylist(z);}
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
						this.dataFoobar.push(new oPlaylist('', '', pls.name, '.ui', plman.PlaylistItemCount(pls.idx), 0, plman.IsPlaylistLocked(pls.idx), false, {query: '', sort: '', bSortForced: false}, 'fooPls', void(0), void(0), void(0), plman.GetPlaylistItems(pls.idx).CalcTotalDuration(), ''));
					}
				}
			});
			if (this.dataFoobar.length) {
				this.dataAll = this.dataAll.concat(this.dataFoobar);
				this.data = this.data.concat(this.dataFoobar);
			}
			this.itemsFoobar = this.dataFoobar.length;
		} else {this.itemsFoobar = 0;}
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
		else {
			for (let i = 0; i < this.items; i++) { // Also this separate for the same reason, to 
				// Get current index of the previously selected item to not move the list focus when updating...
				// Offset is calculated simulating the wheel, so it moves to the previous location
				if (currentItemIsAutoPlaylist) { // AutoPlaylists
					if (this.data[i].isAutoPlaylist && this.data[i].nameId === currentItemNameId) { 
						this.simulateWheelToIndex({toIndex: i, currentItemIndex, originalOffset: this.lastOffset});
						break;
					}
				} else if (this.data[i].path === currentItemPath) { // Standard Playlists
					this.simulateWheelToIndex({toIndex: i, currentItemIndex, originalOffset: this.lastOffset});
					break;
				}
			}
		}
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
		if (!bNotPaint){window.Repaint();}
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
		this.dataAll.forEach((pls, z) => {if (pls.extension !== '.pls') {this.updateUUID(pls, z);}}); // Changes data on the other arrays too since they link to same object
		this.update(true, true);
		this.filter();
	}
	
	this.updateUUID = (playlistObj, z) => {
		const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
		const old_name = playlistObj.name;
		const old_id = playlistObj.ud;
		const old_nameId = playlistObj.nameId;
		const new_id = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate(), true) : ''; // May have enabled/disabled UUIDs just before renaming
		const new_nameId = old_name + ((this.bUseUUID) ? new_id : '');
		if (new_nameId !== old_nameId) {
			playlistObj.id = new_id;
			playlistObj.nameId = new_nameId;
			let duplicated = plman.FindPlaylist(new_nameId);
			if (duplicated !== -1) { // Playlist already exists on foobar...
				fb.ShowPopupMessage('Duplicated playlist names within foobar are not allowed: ' + old_name + '\n' + 'Choose another unique name for renaming.', window.Name);
			} else {
				const plsIdx = plman.FindPlaylist(old_nameId);
				if (plsIdx !== -1) {
					if (playlistObj.isAutoPlaylist || playlistObj.extension === '.fpl' || playlistObj.extension === '.xsp' || playlistObj.extension === '.ui') {
						this.updatePlman(new_nameId, old_nameId); // Update with new id
					} else {
						const path = playlistObj.path;
						if (_isFile(path)) {
							if (!playlistObj.isLocked) {
								const backPath = path + '.back';
								_copyFile(path, backPath);
								let bDone, reason;
								if (playlistObj.extension === '.m3u' || playlistObj.extension === '.m3u8') {
										let originalStrings = ['#PLAYLIST:' + old_name, '#UUID:' + old_id];
										let newStrings = ['#PLAYLIST:' + new_name, '#UUID:' + new_id];
										[bDone, reason] = editTextFile(path, originalStrings, newStrings, this.bBOM); // No BOM
										if (!bDone && reason === 1) { // Retry with new header
											bDone = rewriteHeader(this, playlistObj); 
											if (bDone) {bDone = editTextFile(path, originalStrings, newStrings, this.bBOM);}
										}
								} else if (playlistObj.extension === '.xspf') {
									let originalStrings = ['<title>' + old_name, '<meta rel="uuid">' + old_id];
									let newStrings = ['<title>' + new_name, '<meta rel="uuid">' + new_id];
									[bDone, reason] = editTextFile(path, originalStrings, newStrings, this.bBOM); // No BOM
									if (!bDone && reason === 1) { // Retry with new header
										bDone = rewriteHeader(this, playlistObj); 
										if (bDone) {bDone = editTextFile(path, originalStrings, newStrings, this.bBOM);}
									}
								} else {bDone = true;}
								if (!bDone) {
									fb.ShowPopupMessage('Error renaming playlist file: ' + old_nameId + ' --> ' + new_nameId + '\n\nOld Path: ' + oldPath + '\nNew Path: ' + newPath + '\n\nRestoring backup...', window.Name);
									_renameFile(backPath, path); // Restore backup in case something goes wrong
									console.log('Playlist manager: Restoring backup...');
								} else {
									if (_isFile(backPath)) {_deleteFile(backPath);}
									this.updatePlman(new_nameId, old_nameId); // Update with new id
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
		return (bAll ? list.itemsAll : list.itemsAll - list.itemsAutoplaylist - list.itemsFoobar);
	}
	
	this.init = () => {
		
		this.save = (bInit = false) => {
			this.dataAutoPlaylists = [];
			this.dataFpl = [];
			this.dataXsp = [];
			if (this.dataAll) {
				this.dataAll.forEach((item) => {
					if (item.isAutoPlaylist) { // Saves autoplaylists to json
						this.dataAutoPlaylists.push(item);
					} else if (item.extension === '.fpl') { // Save fpl size and name ID cache too
						this.dataFpl.push(item);
					} else if (item.extension === '.xsp') { // Save xsp as autoplaylists
						this.dataXsp.push(item);
					}
				});
				_save(this.filename, JSON.stringify([...this.dataAutoPlaylists, ...this.dataFpl, ...this.dataXsp], this.replacer, '\t'), this.bBOM); // No BOM
			}
			if (!bInit) {
				if (this.bDynamicMenus) {this.createMainMenuDynamic(); this.exportPlaylistsInfo();}
				else if (this.mainMenuDynamic.length) {this.deleteMainMenuDynamic();}
			}
		}
		
		this.addToData = (objectPlaylist) => {
			const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
			if (isArray(objectPlaylist)) {
				for (const objectPlaylist_i of objectPlaylist) {this.addToData(objectPlaylist_i);}
				return;
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
			}
			this.data.push(objectPlaylist);
			this.items++;
			this.dataAll.push(objectPlaylist);
			this.itemsAll++;
			clearInterval(delay);
		}
		
		this.editData = (objectPlaylist, properties, bSave = false) => {
			const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
			if (isArray(objectPlaylist)) {
				for (const objectPlaylist_i of objectPlaylist) {this.editData(objectPlaylist_i);}
				return;
			}
			const index = this.dataAll.indexOf(objectPlaylist);
			if (index !== -1) { // Changes data on the other arrays too since they link to same object
				Object.keys(properties).forEach( (property) => {this.dataAll[index][property] = properties[property];});
			} else {console.log('Playlist Manager: error editing playlist object from \'this.dataAll\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
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
				} else {console.log('Playlist Manager: error removing playlist object from \'this.dataAutoPlaylists\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			} else if (objectPlaylist.extension === '.fpl') {
				index = this.dataFpl.indexOf(objectPlaylist);
				if (index !== -1) {
					this.dataFpl.splice(index, 1);
					this.itemsFpl--;
				} else {console.log('Playlist Manager: error removing playlist object from \'this.dataFpl\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			} else if (objectPlaylist.extension === '.xsp') {
				index = this.dataXsp.indexOf(objectPlaylist);
				if (index !== -1) {
					this.dataXsp.splice(index, 1);
					this.itemsXsp--;
				} else {console.log('Playlist Manager: error removing playlist object from \'this.dataXsp\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			}
			index = this.data.indexOf(objectPlaylist);
			if (index !== -1) {
				this.data.splice(index, 1);
				this.items--;
			} else {console.log('Playlist Manager: error removing playlist object from \'this.data\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			index = this.dataAll.indexOf(objectPlaylist);
			if (index !== -1) {
				this.dataAll.splice(index, 1);
				this.itemsAll--;
			} else {console.log('Playlist Manager: error removing playlist object from \'this.dataAll\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			clearInterval(delay);
		}
		
		this.replacer = (key, value) => {
			return key === 'width' ? void(0) : value;
		}
		
		this.addAutoplaylist = (pls = null, bEdit = true) => {
			// Check if there are initial values
			const bPls = pls ? true : false;
			const hasName = bPls && pls.hasOwnProperty('name'), hasQuery = bPls && pls.hasOwnProperty('query'), hasSort = bPls && pls.hasOwnProperty('sort');
			const hasSize = bPls && pls.hasOwnProperty('size') && pls.size !== '?', hasCategory = bPls && pls.hasOwnProperty('category');
			const hasTags = bPls && pls.hasOwnProperty('tags') && pls.tags.length, hasTrackTags = bPls && pls.hasOwnProperty('trackTags') && pls.trackTags.length;
			// Create oPlaylist
			let newName = hasName ? pls.name : '';
			if (!newName.length || bEdit) {
				try {newName = utils.InputBox(window.ID, 'Enter AutoPlaylist name', window.Name, newName, true);}
				catch (e) {return false;}
				if (!newName.length) {return false;}
			}
			let newQuery = hasQuery ? pls.query : '';
			if (!newQuery.length || bEdit) {
				try {newQuery = utils.InputBox(window.ID, 'Enter AutoPlaylist query', window.Name, newQuery, true);}
				catch (e) {return false;}
			}
			if (!checkQuery(newQuery, false, true)) {fb.ShowPopupMessage('Query not valid:\n' + newQuery, window.Name); return false;}
			const newSort = !hasSort || bEdit ? utils.InputBox(window.ID, 'Enter sort pattern\n\n(optional)', window.Name, hasSort ? pls.sort : '') : (hasSort ? pls.sort : '');
			const newForced = (newSort.length ? WshShell.Popup('Force sort?', 0, window.Name, popup.question + popup.yes_no) : popup.no) === popup.yes;
			const newQueryObj = {query: newQuery, sort: newSort, bSortForced: newForced};
			const handleList = hasSize && hasQuery && pls.query === newQuery ? null: fb.GetQueryItems(fb.GetLibraryItems(), stripSort(newQuery));
			const queryCount = hasSize && hasQuery && pls.query === newQuery ? pls.size : handleList.Count;
			const duration = hasSize && hasQuery && pls.query === newQuery ? pls.duration : handleList.CalcTotalDuration();
			const UUID = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate(), false) : ''; // Last UUID or nothing for pls playlists...
			const objectPlaylist = new oPlaylist(UUID, '', newName, '', queryCount, 0, false, true, newQueryObj, hasCategory ? pls.category : '', hasTags ? pls.tags : [], hasTrackTags ? pls.trackTags : [], 0, duration, '');
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
			return objectPlaylist;
		}
		
		this.addSmartplaylist = (pls = null, bEdit = true) => {
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
			let newQuery = hasQuery ? pls.query : '';
			if (!newQuery.length || bEdit) {
				try {newQuery = utils.InputBox(window.ID, 'Enter Smart Playlist query\n(#PLAYLIST# may be used as "source" too)', window.Name, newQuery, true);}
				catch (e) {return false;}
			}
			const bPlaylist = newQuery.indexOf('#PLAYLIST# IS') !== -1;
			if (!checkQuery(newQuery, false, true, bPlaylist)) {fb.ShowPopupMessage('Query not valid:\n' + newQuery, window.Name); return false;}
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
				if (isNaN(newLimit)) {return false;}
				if (!Number.isFinite(newLimit)) {newLimit = 0;}
			}
			const playlistPath = this.playlistsPath + sanitize(newName) + '.xsp';
			const objectPlaylist = new oPlaylist('', playlistPath, newName, '.xsp', queryCount, 0, false, false, newQueryObj, hasCategory ? pls.category : '', hasTags ? pls.tags : [], hasTrackTags ? pls.trackTags : [], newLimit, duration, '');
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
			const {rules, match} = XSP.getRules(newQuery);
			if (rules.length) {
				const jspPls = XSP.emptyJSP();
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
			return objectPlaylist;
		}
		
		this.add = ({bEmpty = true, name = '', bShowPopups = true} = {}) => { // Creates new playlist file, empty or using the active playlist. Changes both total size and number of playlists,,,
			if (!bEmpty && plman.ActivePlaylist === -1) {return;}
			const oldNameId = plman.GetPlaylistName(plman.ActivePlaylist);
			const oldName = removeIdFromStr(oldNameId);
			let input = name || '';
			if (!input.length) {
				let boxText = bEmpty ? 'Enter playlist name' : 'Enter playlist name.\nIf you change the current name, then a duplicate of the active playlist will be created with the new name and it will become the active playlist.';
				try {input = utils.InputBox(window.ID, boxText, window.Name, bEmpty ? '' : oldName, true);} 
				catch(e) {return false;}
				if (!input.length) {return false;}
			}
			const new_name = input;
			const oPlaylistPath = this.playlistsPath + sanitize(new_name) + this.playlistsExtension;
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
			if (!_isFile(oPlaylistPath)) { // Just for safety
				// Creates the file on the folder
				if (!_isFolder(this.playlistsPath)) {_createFolder(this.playlistsPath);} // For first playlist creation
				let done = savePlaylist({playlistIndex: (bEmpty ? -1 : plman.ActivePlaylist), playlistPath: oPlaylistPath, ext: this.playlistsExtension, playlistName: new_name, useUUID: this.optionsUUIDTranslate(), category: oPlaylistCategory, tags: oPlaylistTags, relPath: (this.bRelativePath ? this.playlistsPath : ''), bBom: this.bBOM});
				if (done) {
					const UUID = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate(), false) : ''; // Last UUID or nothing for pls playlists...
					objectPlaylist = new oPlaylist(UUID, oPlaylistPath, new_name, this.playlistsExtension, bEmpty ? 0 : plman.PlaylistItemCount(plman.ActivePlaylist), utils.GetFileSize(done), void(0), void(0), void(0), oPlaylistCategory, oPlaylistTags, void(0), void(0), bEmpty ? void(0) : plman.GetPlaylistItems(plman.ActivePlaylist).CalcTotalDuration());
					// Adds to list of objects and update variables
					this.addToData(objectPlaylist);
					if (bEmpty) { // Empty playlist
						let indexFound = plman.FindPlaylist(new_name);
						if (indexFound === -1) { 
							let new_playlist = plman.CreatePlaylist(plman.PlaylistCount, new_name + UUID);
							plman.ActivePlaylist = new_playlist;
						} else { // If there is a playlist with the same name, ask to bind
							let answer = bShowPopups ? WshShell.Popup('Created empty playlist file \'' + new_name + '\' but there is already a playlist loaded with the same name.\nWant to update playlist file with all tracks from that playlist?', 0, window.Name, popup.question + popup.yes_no) : popup.no;
							if (answer === popup.yes) {
								plman.ActivePlaylist = indexFound;
								plman.RenamePlaylist(indexFound, new_name + UUID);
								this.updatePlaylist({playlistIndex: plman.ActivePlaylist, bCallback: true}); // This updates size too. Must replicate callback call since the playlist may not be visible on the current filter view!
							}
						}
					} else { // If we changed the name of the playlist but created it using the active playlist, then clone with new name
						if (new_name !== oldName) {
							let new_playlist = plman.DuplicatePlaylist(plman.ActivePlaylist, new_name + UUID);
							plman.ActivePlaylist = new_playlist;
						} else {
							plman.RenamePlaylist(plman.ActivePlaylist, new_name + UUID);
						}
					}
					// Warn about dead items
					const selItems = plman.GetPlaylistItems(plman.ActivePlaylist).Convert();
					if (selItems && selItems.length) {
						selItems.some((handle, i) => {
							if (!handle.Path.startsWith('http://') && !handle.Path.startsWith('https://') && !_isFile(handle.Path)) {
								console.popup('Warning! There is at least one dead item among the tracks used to create the playlist, there may be more.\n\n(' + i + ') ' + handle.RawPath, window.Name, bShowPopups); 
								return true;
							}
							return false;
						});
					}
				} else {
					console.popup('Playlist generation failed while writing file \'' + oPlaylistPath + '\'.', window.Name, bShowPopups);
					return false;
				}
			} else {console.popup('Playlist \'' + new_name + '\' already exists on path: \'' + oPlaylistPath + '\'', window.Name, bShowPopups); return false;}
			this.update(true, true); // We have already updated data
			this.filter();
			return objectPlaylist;
		}
		
		this.loadPlaylistOrShow = (idx, bAlsoHidden = false) => {
			if (idx < 0 || (!bAlsoHidden && idx >= this.items) || (bAlsoHidden && idx >= this.itemsAll)) {
				console.log('Playlist Manager: Error adding tracks to playlist. Index out of bounds.');
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
				console.log('Playlist Manager: Error adding tracks to playlist. Index out of bounds.');
				return false;
			}
			const pls = bAlsoHidden ? this.dataAll[idx] : this.data[idx];
			const old_nameId = pls.nameId;
			const old_name = pls.name;
			const duplicated = getPlaylistIndexArray(old_nameId);
			if (duplicated && duplicated.length > 1) {
				fb.ShowPopupMessage('You can not have duplicated playlist names within foobar: ' + old_name + '\n' + 'Please delete all playlist with that name first; you may leave one. Then try loading the playlist again.', window.Name);
				return false;
			} else {
				let [fbPlaylistIndex] = clearPlaylistByName(old_nameId); //only 1 index expected after previous check. Clear better than removing, to allow undo
				if (pls.isAutoPlaylist) { // AutoPlaylist
					if (!fbPlaylistIndex) {fbPlaylistIndex = plman.PlaylistCount;}
					if (!checkQuery(pls.query, true, true)) {fb.ShowPopupMessage('Query not valid:\n' + pls.query, window.Name); return;}
					plman.CreateAutoPlaylist(fbPlaylistIndex, old_name, pls.query, pls.sort, pls.bSortForced ? 1 : 0);
					plman.ActivePlaylist = fbPlaylistIndex;
					this.editData(pls, {
						size: plman.PlaylistItemCount(fbPlaylistIndex),
						duration: plman.GetPlaylistItems(fbPlaylistIndex).CalcTotalDuration()
					}, true); // Update size on load
				} else { // Or file
					if (_isFile(pls.path)) {
						if (!fbPlaylistIndex) {fbPlaylistIndex = plman.CreatePlaylist(plman.PlaylistCount, old_nameId);} //If it was not loaded on foobar, then create a new one
						plman.ActivePlaylist = fbPlaylistIndex;
						// Try to load handles from library first, greatly speeds up non fpl large playlists
						// But it will fail as soon as any track is not found on library
						// Always use tracked folder relative path for reading, it will be discarded if playlist does not contain relative paths
						const remDupl = pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls ? list.removeDuplicatesAutoPls.split(',').filter((n) => n) : [];
						let bDone = loadTracksFromPlaylist(pls.path, plman.ActivePlaylist, this.playlistsPath, remDupl);
						if (!bDone) {plman.AddLocations(fbPlaylistIndex, [pls.path], true);}
						else if (pls.query) { // Update size on load for smart playlists
							this.editData(pls, {
								size: plman.PlaylistItemCount(fbPlaylistIndex), 
								duration: plman.GetPlaylistItems(fbPlaylistIndex).CalcTotalDuration()
							}, true);
						}
						if (pls.extension === '.fpl') { // Workaround for fpl playlist limitations...
							setTimeout(() => {this.updatePlaylistFpl(fbPlaylistIndex);}, 2000);
						}
					} else {fb.ShowPopupMessage('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name); return false;}
				}
			}
			if (autoBackTimer && debouncedUpdate) {backup(list.properties.autoBackN[1]);} // Backup before autosaving
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
					const remDupl = pls.extension === '.xsp' && list.bRemoveDuplicatesSmartPls ? list.removeDuplicatesAutoPls.split(',').filter((n) => n) : [];
					handleList = getHandlesFromPlaylist(pls.path, this.playlistsPath, void(0), remDupl);
					if (handleList) {this.editData(pls, {size: handleList.Count, duration: handleList.CalcTotalDuration()}, true);}  // Update size on load for smart playlists
				} else {console.popup('Playlist file does not exist: ' + pls.name + '\nPath: ' + pls.path, window.Name);}
			}
			return handleList || new FbMetadbHandleList();
		}
		
		this.showBindedPlaylist = (idx, bAlsoHidden = false) => {
			if (idx < 0 || (!bAlsoHidden && idx >= this.items) || (bAlsoHidden && idx >= this.itemsAll)) {
				console.log('Playlist Manager: Error adding tracks to playlist. Index out of bounds.');
				return false;
			}
			const pls = bAlsoHidden ? this.dataAll[idx] : this.data[idx];
			const newNameId = pls.nameId;
			const index = plman.FindPlaylist(newNameId);
			plman.ActivePlaylist = index;
		}
		
		this.removePlaylist = (idx, bAlsoHidden = false) => {
			if (idx < 0 || (!bAlsoHidden && idx >= this.items) || (bAlsoHidden && idx >= this.itemsAll)) {
				console.log('Playlist Manager: Error adding tracks to playlist. Index out of bounds.');
				return false;
			}
			const pls = bAlsoHidden ? this.dataAll[idx] : this.data[idx];
			// Adds timestamp to filename
			const delay = setInterval(delayAutoUpdate, this.autoUpdateDelayTimer);
			const bUI = pls.extension === '.ui';
			if (!pls.isAutoPlaylist && !bUI) { // Only for not AutoPlaylists
				if (_isFile(pls.path)) {
					let newPath = pls.path.split('.').slice(0,-1).join('.').split('\\');
					const new_name = newPath.pop() + '_ts_' + (new Date().toDateString() + Date.now()).split(' ').join('_');
					newPath = newPath.concat([new_name]).join('\\') + pls.extension;
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
			// Delete from data
			const old_nameId = pls.nameId;
			const duplicated = plman.FindPlaylist(old_nameId);
			if (pls.size) {this.totalFileSize -= pls.size;}
			this.deletedItems.unshift(pls);
			this.removeFromData(pls); // Use this instead of this.data.splice(idx, 1) to remove from all data arrays!
			if (!bUI) {
				this.update(true, true); // Call this immediately after removal! If paint fires before updating things get weird
				// Delete category from current view if needed
				// Easy way: intersect current view + with refreshed list
				const categoryState = [...new Set(this.categoryState).intersection(new Set(this.categories()))];
				this.filter({categoryState});
			}
			clearInterval(delay);
			if (duplicated !== -1) {
				let answer = bUI ? popup.yes : WshShell.Popup('Delete also the playlist loaded within foobar?', 0, window.Name, popup.question + popup.yes_no);
				if (answer === popup.yes) {
					plman.RemovePlaylistSwitch(duplicated);
				}
			}
			if (bUI) {
				this.update(true, true);
				const categoryState = [...new Set(this.categoryState).intersection(new Set(this.categories()))];
				this.filter({categoryState});
			} // Needed after removing the playlist on UI
		}
		
		this.updatePlman = (name, oldName) => {
			let i = 0;
			while (i < plman.PlaylistCount) {
				if (plman.GetPlaylistName(i) === oldName) {
					plman.RenamePlaylist(i, name);
				} else {
					i++;
				}
			}
		}
		
		this.xspPopup = (bForce = false) => {
			if (!this.properties['bFirstPopupXsp'][1] || bForce) {
				this.properties['bFirstPopupXsp'][1] = true;
				overwriteProperties(this.properties); // Updates panel
				fb.ShowPopupMessage('Playlist manager has loaded a .xsp playlist (Smart Playlist) for the first time. This is an informative popup.\n\n-.xsp playlists, despite being a writable format, can not store extra metadata. Size and other data (UUID, category, lock status or tags) will be cached between sessions, as soon as it\'s set for the first time, on the panel.\n-By default they are set as locked files (so they will never be autosaved), since they behave like AutoPlaylists.\n-To edit category or tags, unlock the playlist, set the desired values and lock it again. The data will be saved between sessions.\n-Playlist size can only be retrieved when the playlist is loaded within foobar, so the first time it\'s loaded, the value will be stored for future sessions. Note size may change on subsequent loads if the query retrieves a different number of tacks.\n-Query, sort and limit of tracks may be edited following the same procedure done on AutoPlaylists.\n-Note not all queries and TF functions are allowed on Smart Playlists, due to compatibility reasons with Kodi and XBMC systems.\n-Queries will be translated into XBMC\'s format after editing them via popups, you can check the result on the tooltip.', 'Playlist Manager');
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
				fb.ShowPopupMessage('Playlist manager has loaded a .fpl playlist for the first time. This is an informative popup.\n\n-.fpl playlists are non writable, but size and other data (UUID, category, lock status or tags) may be cached between sessions as soon as it\'s set for the first time.\n-By default they are set as locked files (so they will never be autosaved), if you want to convert them to another editable extension, just force a playlist update.\n-To edit category or tags, unlock the playlist, set the desired values and lock it again. The data will be saved between sessions.\n-Playlist size can only be retrieved when the playlist is loaded within foobar, so the first time it\'s loaded, the value will be stored for future sessions.', 'Playlist Manager');
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
				this.properties['methodState'][0] += Object.keys(this.sortMethods()); // We change the description, but we don't want to overwrite the value
				newProperties['methodState'] = [this.properties['methodState'][0], this.getMethodState()];
				bDone = true;
			} 
			if (!this.properties['sortState'][1]) { // This one changes according to the previous one! So we need to load the proper 'methodState'
				removeProperties['sortState'] = [this.properties['sortState'][0], null]; // need to remove manually since we change the ID (description)!
				// Fill description and first state of the method will be default
				let savedMethodState = window.GetProperty(this.properties['methodState'][0], this.getMethodState()); // Note this will get always a value
				this.properties['sortState'][0] += Object.keys(this.sortMethods()[savedMethodState]); // We change the description, but we don't want to overwrite the value
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
		
		this.checkConfig = () => { // Forces right settings
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
					fb.ShowPopupMessage('Wrong extension set at properties panel:' + '\n\'' + this.properties['extension'][0] + '\':\'' + this.playlistsExtension + '\'\n' + 'Only allowed ' + Array.from(writablePlaylistFormats).join(', ') + '\nUsing \'.m3u8\' as fallback', window.Name);
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
			if (!this.sortMethods().hasOwnProperty(this.methodState)) {
				fb.ShowPopupMessage('Wrong sorting method set at properties panel: \'' + this.methodState + '\'\n' + 'Only allowed: \n\n' + Object.keys(this.sortMethods()).join('\n') + '\n\nUsing default method as fallback', window.Name);
				this.methodState = this.getMethodState(); // On first call first state of that method will be default
				this.properties['methodState'][1] = this.methodState;
				bDone = true;
			}
			if (!this.sortMethods()[this.methodState].hasOwnProperty(this.sortState)) {
				fb.ShowPopupMessage('Wrong sorting order set at properties panel: \'' + this.sortState + '\'\n' + 'Only allowed: ' + Object.keys(this.sortMethods()[this.methodState]) + '\nUsing default sort state as fallback', window.Name);
				this.sortState = this.getSortState(); // On first call first state of that method will be default
				this.properties['sortState'][1] = this.sortState;
				bDone = true;
			}
			if (this.bSaveFilterStates) { // Rotate current filters until it matches the saved ones
				const rotations = this.properties['filterStates'][1].split(',');
				this.autoPlaylistStates = this.constAutoPlaylistStates().rotate(rotations[0]);
				this.lockStates = this.constLockStates().rotate(rotations[1]);
				this.extStates = this.constExtStates().rotate(rotations[2]);
			}
			// Check colors
			if (!this.colours || !Object.keys(this.colours).length) { // Sets default colours
				this.colours = {};
				this.colours['lockedPlaylistColour'] = RGB(...toRGB(0xFFDC143C)); // Red
				this.colours['autoPlaylistColour'] = blendColours(panel.colours.text, RGB(...toRGB(0xFFFF629B)), 0.6);
				this.colours['smartPlaylistColour'] = blendColours(panel.colours.text, RGB(...toRGB(0xFF65CC32)), 0.6);
				this.colours['selectedPlaylistColour'] = RGB(...toRGB(0xFF0080C0)); // Blue
				this.colours['uiPlaylistColour'] = blendColours(panel.colours.text, RGB(...toRGB(0xFF00AFFD)), 0.8); // Blue
				bDone = true;
			}
			if (this.colours && Object.keys(this.colours).length !== 4) { // Fills missing colours
				if (!this.colours['lockedPlaylistColour']) {this.colours['lockedPlaylistColour'] = RGB(...toRGB(0xFFDC143C));} // Red
				if (!this.colours['autoPlaylistColour']) {this.colours['autoPlaylistColour'] = blendColours(panel.colours.text, RGB(...toRGB(0xFFFF629B)), 0.6);}
				if (!this.colours['smartPlaylistColour']) {this.colours['smartPlaylistColour'] = blendColours(panel.colours.text, RGB(...toRGB(0xFF65CC32)), 0.6);}
				if (!this.colours['selectedPlaylistColour']) {this.colours['selectedPlaylistColour'] = RGB(...toRGB(0xFF0080C0));} // Blue
				if (!this.colours['uiPlaylistColour']) {this.colours['uiPlaylistColour'] = blendColours(panel.colours.text, RGB(...toRGB(0xFF00AFFD)), 0.8);} // Blue
				bDone = true;
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
			if (bDone) {overwriteProperties(this.properties);}
		}
		
		this.loadConfigFile = (file = this.filename.replace('.json','_config.json')) => {
			if (!file.length) {this.configFile = null; return;}
			if (_isFile(file)) {this.configFile = _jsonParseFileCheck(file, 'Config json', window.Name, utf8);}
			else {this.configFile = null;}
		}
		
		this.createMainMenuDynamic = ({file = folders.ajquerySMP + 'playlistmanagerentries.json'} = {}) => {
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
					{type:'load playlist',	name: 'Load playlist/', 		description: 'Load playlist into UI.',				skipExt: []			, skipProp: []},
					{type:'lock playlist',	name: 'Lock playlist/',			description: 'Lock playlist file.',					skipExt: []			, skipProp: ['isLocked']},
					{type:'lock playlist',	name: 'Unlock playlist/',		description: 'Unlock playlist file.',				skipExt: []			, skipProp: ['!isLocked']},
					{type:'delete playlist',name: 'Delete playlist/', 		description: 'Delete playlist file.',				skipExt: []			, skipProp: []},
					{type:'clone in ui',	name: 'Clone playlist in UI/',	description: 'Load a copy of the playlist file.',	skipExt: ['']		, skipProp: ['!size']},
					{type:'send selection',	name: 'Send selection to/',		description: 'Send selection to playlist file.',	skipExt: ['','.fpl'], skipProp: ['query', 'isAutoPlaylist' ,'isLocked']},
				];
				menusPls.forEach((menu) => {listExport[menu.type] = [];});
				this.dataAll.forEach((pls, i) => {
					if (pls.extension === '.ui') {return;}
					menusPls.forEach((menu) => {
						if (menu.skipExt.indexOf(pls.extension) !== -1) {return;}
						if (menu.skipProp.some((key) => {
							const notKey = key.startsWith('!') ? key.slice(1) : null;
							return (notKey ? 
								pls.hasOwnProperty(notKey) && !pls[notKey] && !isString(pls[notKey]) 
								:
								pls.hasOwnProperty(key) && (pls[key] || pls[key].length) 
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
				});
				data[wName] = listExport;
				// Don try to export for ajquery-xxx integration when it isn't installed
				if (bToFile && file.indexOf('ajquery-xxx') !== -1 && !folders.ajqueryCheck()) {return true;}
				return (bToFile ? _save(file, JSON.stringify(data, null, '\t')) : true);
			} catch (e) {console.log('this.createMainMenuDynamic: unknown error'); console.log(e.message);}
			return false;
		}
		
		this.deleteMainMenuDynamic = () => {
			this.mainMenuDynamic.forEach((pls, i) => {fb.UnregisterMainMenuCommand(i)});
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
		
		this.reset = () => {
			this.inRange = false;
			this.items = 0;
			this.itemsAll = 0;
			this.itemsAutoplaylist = 0;
			this.itemsFpl = 0;
			this.itemsXsp = 0;
			this.bUpdateAutoplaylist = this.properties['bUpdateAutoplaylist'][1];
			this.totalFileSize = 0;
			this.index = -1;
			this.indexes = [];
			this.lastIndex = -1;
			this.lastOffset = 0;
			this.data = []; // Data to paint
			this.dataAll = []; // Everything cached (filtering changes this.data but not this one)
			this.dataAutoPlaylists = []; // Only autoplaylists to save to json
			this.dataFpl = []; // Only fpl playlists to save to json
			this.dataXsp = []; // Only xsp playlists to save to json
			this.dataFoobar = []; // Only foobar playlists on UI
			this.deletedItems = [];
			this.lastPlsLoaded = [];
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
			this.colours = convertStringToObject(this.properties['listColours'][1], 'number');
			this.bRelativePath = this.properties['bRelativePath'][1];
			this.bAutoLoadTag = this.properties['bAutoLoadTag'][1];
			this.bAutoLockTag = this.properties['bAutoLockTag'][1];
			this.bMultMenuTag = this.properties['bMultMenuTag'][1];
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
			this.removeDuplicatesAutoPls = this.properties['removeDuplicatesAutoPls'][1];
			this.bRemoveDuplicatesAutoPls = this.properties['bRemoveDuplicatesAutoPls'][1];
			this.bRemoveDuplicatesSmartPls = this.properties['bRemoveDuplicatesSmartPls'][1];
			this.bSavingWarnings = this.properties['bSavingWarnings'][1];
			this.bShowMenuHeader = this.properties['bShowMenuHeader'][1];
			this.bCheckDuplWarnings = this.properties['bCheckDuplWarnings'][1];
			this.bAllPls = this.properties['bAllPls'][1];
		}
		
		if (!_isFolder(folders.data)) {_createFolder(folders.data);}
		this.filename = folders.data + 'playlistManager_' + this.playlistsPathDirName.replace(':','') + '.json'; // Replace for relative paths folder names!
		_recycleFile(this.filename + '.old', true); // recycle old backup
		_copyFile(this.filename, this.filename + '.old'); // make new backup
		this.loadConfigFile(); // Extra json config available?
		this.initProperties(); // This only set properties if they have no values...
		this.reset();
		let bDone = this.checkConfig();
		this.update(false, true, void(0), true); // bInit is true to avoid reloading all categories
		this.checkConfigPostUpdate(bDone);
		this.updatePlaylistIcons();
		this.filter(); // Uses last view config at init, categories and filters are previously restored according to bSaveFilterStates
		if (this.bDynamicMenus) { // Init menus unless they will be init later after autoplaylists processing
			if (!(this.properties['bUpdateAutoplaylist'][1] && this.bShowSize) && !(this.bAutoTrackTag && this.bAutoTrackTagAutoPls && this.bAutoTrackTagAutoPlsInit)) {
				this.createMainMenuDynamic(); this.exportPlaylistsInfo();
			}
		} else {this.deleteExportInfo();}
		if (folders.ajqueryCheck()) {exportComponents(folders.ajquerySMP);}
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
	this.mx = 0;
	this.my = 0;
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
	this.text_x = 0;
	this.timeOut = null;
	this.bDoubleclick = false;
	this.bSelMenu = false;
	this.filename = '';
	this.configFile = null;
	this.totalFileSize = 0; // Stores the file size of all playlists for later comparison when autosaving
	this.lastPlsLoaded = [];
	this.mainMenuDynamic = [];
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
	// Panel behavior
	this.bRelativePath = this.properties['bRelativePath'][1];
	this.bAutoLoadTag = this.properties['bAutoLoadTag'][1];
	this.bAutoLockTag = this.properties['bAutoLockTag'][1];
	this.bMultMenuTag = this.properties['bMultMenuTag'][1];
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
	this.removeDuplicatesAutoPls = this.properties['removeDuplicatesAutoPls'][1];
	this.bRemoveDuplicatesAutoPls = this.properties['bRemoveDuplicatesAutoPls'][1];
	this.bRemoveDuplicatesSmartPls = this.properties['bRemoveDuplicatesSmartPls'][1];
	this.bSavingWarnings = this.properties['bSavingWarnings'][1];
	this.bSavingDefExtension = this.properties['bSavingDefExtension'][1];
	this.bCheckDuplWarnings = this.properties['bCheckDuplWarnings'][1];
	this.bSavingXsp = this.properties['bSavingXsp'][1];
	this.bShowMenuHeader = this.properties['bShowMenuHeader'][1];
	this.bAllPls = this.properties['bAllPls'][1];
	this.bDynamicMenus = this.properties['bDynamicMenus'][1];
	// Other
	this.lastCharsPressed = {str: '', ms: Infinity, bDraw: false};
	this.selPaths = {pls: new Set(), sel: []};
	this.colours = convertStringToObject(this.properties['listColours'][1], 'number');
	this.autoUpdateDelayTimer = Number(this.properties.autoUpdate[1]) !== 0 ? Number(this.properties.autoUpdate[1]) / 100 : 1; // Timer should be at least 1/100 autoupdate timer to work reliably
	this.up_btn = new _sb(chars.up, this.x, this.y, _scale(12), _scale(12), () => { return this.offset > 0; }, () => { this.wheel({s: 1}); });
	this.down_btn = new _sb(chars.down, this.x, this.y, _scale(12), _scale(12), () => { return this.offset < this.items - this.rows; }, () => { this.wheel({s: -1}); });
	this.headerButton = {x: 0, y: 0, w: 0, h: 0, inFocus: false};
	this.init();
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