'use strict';
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\helpers_xxx.js');
include(fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers\\playlist_manager_panel.js');

function _list(x, y, w, h) {
	
	// Wingdings
	// const g_font_icon_char = () => {_gdiFont('wingdings 2', _scale(panel.fonts.size), 0);}
	// const icon_char_playlistLocked = String.fromCharCode(79);
	// const icon_char_playlist = String.fromCharCode(44);
	// const icon_char_playlistEmpty = String.fromCharCode(41);
	
	// Font Awesome
	const g_font_icon_char = () => {return _gdiFont('FontAwesome', _scale(panel.fonts.size - 5), 0);};
	// const icon_char_header = '\uf015';
	const icon_char_playlistLocked = '\uf0f6';
	const icon_char_playlist = '\uf0f6';
	const icon_char_playlistEmpty = '\uf016';
	// const icon_char_playlistSelected = '\uf053';
	
	// Icons
	var icon_char_playlistLockedW = _gr.CalcTextWidth(icon_char_playlistLocked, g_font_icon_char());
	var icon_char_playlistW = _gr.CalcTextWidth(icon_char_playlist, g_font_icon_char());
	// var icon_char_playlistEmptyW = _gr.CalcTextWidth(icon_char_playlist, g_font_icon_char());
	
	// UI offset
	const y_offset = _scale(6);
	
	// Cache
	var currentItemIndex = -1;
	this.getCurrentItemIndex = () => {return currentItemIndex;}
	var bMaintainFocus = (currentItemIndex !== -1); // Skip at init() or when mouse leaves panel
	var currentItemPath = bMaintainFocus ? this.data[currentItemIndex].path : null;
	var currentItemNameId = bMaintainFocus ? this.data[currentItemIndex].nameId : null;
	var currentItemIsAutoPlaylist = bMaintainFocus ? this.data[currentItemIndex].isAutoPlaylist : null;
	
	// Global tooltip
	this.tooltip = new _tt(null);  
	
	this.size = () => {
		this.index = 0;
		this.offset = 0;
		this.rows = Math.floor((this.h - _scale(24)) / panel.row_height); // 24
		this.up_btn.x = this.x + Math.round((this.w - _scale(12)) / 2);
		this.down_btn.x = this.up_btn.x;
		this.up_btn.y = this.y + _scale(1);
		this.down_btn.y = this.y + this.h - _scale(12) - buttonCoordinatesOne.h; // Accommodate space for buttons!
		icon_char_playlistLockedW = _gr.CalcTextWidth(icon_char_playlistLocked, g_font_icon_char());
		icon_char_playlistW = _gr.CalcTextWidth(icon_char_playlist, g_font_icon_char());
		// icon_char_playlistEmptyW = _gr.CalcTextWidth(icon_char_playlist, g_font_icon_char());
	}
	
	this.header_text = window.Name;
	
	this.header_textUpdate = () => {
		this.header_text = (this.playlistsPath && this.itemsAll) ? 'Playlists: ' + this.playlistsPathDirName + ' (' + this.itemsAll + ' pls.)' : 'Playlist Manager: empty folder';
	}
	
	this.paint = (gr) => {
		// HEADER
		var g_font_wd2 = _gdiFont('wingdings 2', _scale((panel.fonts.size <= 14) ? panel.fonts.size + 2 : panel.fonts.size), 0);
		var icon_colour = blendColours(panel.colours.highlight, panel.colours.background, 0.1);
		var icon_char = String.fromCharCode(46);
		var iconw = gr.CalcTextWidth(icon_char, g_font_wd2);
		var iconH = gr.CalcTextHeight(icon_char, g_font_wd2);
		// console.log(iconH % 2);
		gr.GdiDrawText(icon_char, g_font_wd2, blendColours(icon_colour, panel.colours.background, 0.35), LM, -1, iconw, TM, LEFT);
		gr.GdiDrawText(this.header_text, panel.fonts.title, panel.colours.highlight, LM + iconw + 5, 0, panel.w - (LM * 2), TM, LEFT);
		let line_y = (panel.fonts.size < 14 && iconH % 2) ? iconH + 2 : iconH + 1;
		gr.DrawLine(this.x, line_y , this.x + this.w, line_y, 1, panel.colours.highlight);
		// Empty Panel
		this.text_x = 0;
		this.text_width = this.w;
		if (this.items === 0) {
			let emptyText = '';
			if (this.itemsAll !== 0) {
				emptyText = 'No matches for the current filters.';
			} else {
				emptyText = 'Playlist folder is currently empty:\n\'' + this.playlistsPath + '\'\n\nAdd playlist files moving them to tracked folder, creating new playlists or importing them from json (right button).' + '\n\nReadable playlist formats:\n\'' + Array.from(readablePlaylistFormats).join('\', \'') + '\'\nWritable formats:\n\'' + Array.from(writablePlaylistFormats).join('\', \'') + '\'';
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
		const playing_char = String.fromCharCode(9654);
		const loaded_char = String.fromCharCode(9644);
		const lockedPlaylistIconColour = blendColours(icon_colour, this.colours.lockedPlaylistColour, 0.8);
		const autoPlaylistIconColour = blendColours(RGB(...toRGB(0xFFFFFFFF)), this.colours.autoPlaylistColour, 0.8);
		const categoryHeaderOffset = _scale(panel.fonts.size - 4);
		const categoryHeaderColour = blendColours(panel.colours.background, panel.colours.text, 0.6);
		const categoryHeaderLineColour = blendColours(panel.colours.background, categoryHeaderColour, 0.5);
		const indexSortStateOffset = !this.getIndexSortState() ? -1 : 1; // We compare to the next one or the previous one according to sort order
		const rows = Math.min(this.items, this.rows);
		for (let i = 0; i < rows; i++) {
			// Safety check: when deleted a playlist from data and paint fired before calling this.update()... things break silently. Better to catch it
			if (i + this.offset >= this.items) {
				console.log('Playlist manager: Warning. i + this.offset (' + (i + this.offset) + ') is >= than this.items (' + this.items + ') on paint.'); 
				break;
			}
			// Add category sep
			if (this.bShowSep) {
				let dataKey = ''; // Use this.data[dataKey] notation instead of this.data.dataKey, so we can apply the same code to both use-cases 
				if (this.methodState === 'By category'){dataKey = 'category';}
				else if (this.methodState === 'By name'){dataKey = 'name';}
				if (dataKey.length){
					// Show always current letter at top. Also shows number
					if (indexSortStateOffset === -1 && i === 0) {
						let sepLetter = (this.data[i + this.offset][dataKey].length) ? this.data[i + this.offset][dataKey][0].toUpperCase() : '-';
						if (!isNaN(sepLetter)) {sepLetter = '#';} // Group numbers
						drawDottedLine(gr, this.x, this.y + y_offset + (i * panel.row_height), this.x + this.w - categoryHeaderOffset, this.y + y_offset + (i * panel.row_height) , 1, categoryHeaderLineColour, _scale(2));
						gr.GdiDrawText(sepLetter, panel.fonts.small, categoryHeaderColour, this.x, this.y + y_offset + (i * panel.row_height) - panel.row_height / 2, this.text_width , panel.row_height , RIGHT);
					}
					// The rest... note numbers are always at top or at bottom anyway
					if (i < (Math.min(this.items, this.rows) - indexSortStateOffset) && i + indexSortStateOffset >= 0 && this.data[i + this.offset][dataKey].length && this.data[i + indexSortStateOffset + this.offset][dataKey].length && this.data[i + this.offset][dataKey][0].toUpperCase() !== this.data[i + indexSortStateOffset + this.offset][dataKey][0].toUpperCase() && isNaN(this.data[i + this.offset][dataKey][0])) {
						let sepIndex = indexSortStateOffset < 0 ? i : i + indexSortStateOffset;
						drawDottedLine(gr, this.x, this.y + y_offset + (sepIndex * panel.row_height), this.x + this.w - categoryHeaderOffset, this.y + y_offset + (sepIndex * panel.row_height) , 1, categoryHeaderLineColour, _scale(2));
						gr.GdiDrawText(this.data[i + this.offset][dataKey][0].toUpperCase(), panel.fonts.small, categoryHeaderColour, this.x, this.y + y_offset + (sepIndex * panel.row_height) - panel.row_height / 2, this.text_width , panel.row_height , RIGHT);
					}
					// Show always current letter at bottom. Also shows number
					if (indexSortStateOffset === 1 && i === Math.min(this.items, this.rows) - 1) {
						let sepIndex = i + indexSortStateOffset;
						let sepLetter = (this.data[i + this.offset][dataKey].length) ? this.data[i + this.offset][dataKey][0].toUpperCase() : '-';
						if (!isNaN(sepLetter)) {sepLetter = '#';} // Group numbers
						drawDottedLine(gr, this.x, this.y + y_offset + (sepIndex * panel.row_height), this.x + this.w - categoryHeaderOffset, this.y + y_offset + (sepIndex * panel.row_height) , 1, categoryHeaderLineColour, _scale(2));
						gr.GdiDrawText(sepLetter, panel.fonts.small, categoryHeaderColour, this.x, this.y + y_offset + (sepIndex * panel.row_height) - panel.row_height / 2, this.text_width , panel.row_height , RIGHT);
					}
				}
			}
			// Playlists
			let playlistDataText =  this.data[i + this.offset].name + (this.bShowSize ? ' (' + this.data[i + this.offset].size + ')' : '');
			if (this.data[i + this.offset].isLocked) { // Highlight read only playlists
				gr.GdiDrawText(icon_char_playlistLocked, g_font_icon_char(), lockedPlaylistIconColour, this.text_x + 5, this.y + y_offset + (i * panel.row_height), this.text_width, panel.row_height, LEFT);
				gr.GdiDrawText(playlistDataText, panel.fonts.normal, this.colours.lockedPlaylistColour,  this.x + 5 + icon_char_playlistLockedW, this.y + y_offset + (i * panel.row_height), this.text_width, panel.row_height, LEFT);
			} else if (this.data[i + this.offset].isAutoPlaylist) { // Highlight autoplaylists
				gr.GdiDrawText(icon_char_playlistLocked, g_font_icon_char(), autoPlaylistIconColour, this.text_x + 5, this.y + y_offset + (i * panel.row_height), this.text_width, panel.row_height, LEFT);
				gr.GdiDrawText(playlistDataText, panel.fonts.normal, this.colours.autoPlaylistColour,  this.x + 5 + icon_char_playlistLockedW, this.y + y_offset + (i * panel.row_height), this.text_width, panel.row_height, LEFT);
			} else {
				gr.GdiDrawText((this.data[i + this.offset].size) ? icon_char_playlist : icon_char_playlistEmpty, g_font_icon_char(), icon_colour, this.text_x + 5, this.y + y_offset + (i * panel.row_height), this.text_width, panel.row_height, LEFT);
				gr.GdiDrawText(playlistDataText, panel.fonts.normal, panel.colours.text, this.x + 5 + icon_char_playlistW, this.y + y_offset + (i * panel.row_height), this.text_width, panel.row_height, LEFT);
			}
			// Add playing now indicator
			let playlistDataTextRight = '';
			if (plman.PlayingPlaylist !== -1 && plman.FindPlaylist(this.data[i + this.offset].nameId) === plman.PlayingPlaylist) {playlistDataTextRight += playing_char;}
			// Add loaded indicator
			else if (plman.FindPlaylist(this.data[i + this.offset].nameId) !== -1) {playlistDataTextRight += loaded_char;}
			// Draw
			gr.GdiDrawText(playlistDataTextRight, panel.fonts.small, panel.colours.text, this.x, this.y + y_offset + (i * panel.row_height), this.text_width, panel.row_height, RIGHT);
		}
		// Selection indicator
		if (typeof this.index !== 'undefined' && typeof this.data[this.index] !== 'undefined') {
			if ((this.index - this.offset) >= 0 && (this.index - this.offset) < this.rows) {
				// Icon
				// gr.GdiDrawText(icon_char_playlistSelected, g_font_icon_char(), this.colours.selectedPlaylistColour, this.x + 5 + this.data[this.index].width , this.y + y_offset + _scale(1) + ((((this.index) ? this.index : this.offset) - this.offset) * panel.row_height), this.text_width, panel.row_height, LEFT);
				// Rectangle
				gr.DrawRect(this.x - 5, this.y + y_offset + ((((this.index) ? this.index : this.offset) - this.offset) * panel.row_height), this.x + this.w, panel.row_height, 0, this.colours.selectedPlaylistColour);
			}
		}
		// Up/down buttons
		this.up_btn.paint(gr, panel.colours.text);
		this.down_btn.paint(gr, panel.colours.text);
	}

	this.trace = (x, y) => {
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
	}
	
	this.wheel = (s, bPaint = true) => {
		if (this.trace(this.mx, this.my)) {
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
					if (bPaint) {window.RepaintRect(this.x, this.y, this.w, this.h);}
				}
			}
			return true;
		} else {
			return false;
		}
	}
	
	this.simulateWheelToIndex = (toIndex, currentItemIndex = this.lastIndex, originalOffset = this.lastOffset) => {
		this.index = toIndex;
		let iDifference = currentItemIndex - originalOffset;
		this.offset = 0;
		let cache = 0;
		if (iDifference >= 0 && iDifference < currentItemIndex) {
			while (this.index - this.offset > iDifference) {
				this.wheel(-1, false);
				if (cache === this.offset) {break;}
				cache = this.offset;
			}
		}
	}
	
	this.onMouseLeaveList = () => {  // Removes selection indicator
		this.cacheLastPosition(); // When pressing right button, the index gets cleared too... but we may want to use it on the menus
		this.index = -1;
		// this.offset = 0;
		window.Repaint();
	}
	
	this.move = (x, y) => {
		this.mx = x;
		this.my = y;
		window.SetCursor(IDC_ARROW);
		if (this.trace(x, y)) {
			this.cacheLastPosition();
			this.index = Math.floor((y - this.y - y_offset) / panel.row_height) + this.offset;
			this.in_range = this.index >= this.offset && this.index < this.offset + Math.min(this.rows, this.items);
			switch (true) {
				case this.up_btn.move(x, y):
				case this.down_btn.move(x, y):
					break;
				case !this.in_range:
				{
					this.tooltip.SetValue(null); // Removes tt when not over a list element
					this.index = -1;
					// this.lastOffset = 0;
					window.Repaint(); // Removes selection indicator
					break;
				}
				default:
				{
					switch (true) {
						case x > this.x && x < this.x + Math.min(this.data[this.index].width, this.text_width):
						{
							// Cursor
							window.SetCursor(IDC_HAND);
							// Selection indicator
							window.RepaintRect(x, y - panel.row_height, this.text_width, (this.index + 2 )* panel.row_height);
							// Tooltip
							const pls = this.data[this.index];
							const path = (pls.path) ? '(' + pls.path.replace(this.playlistsPath,'')  + ')' : '';
							let playlistDataText = (pls.isAutoPlaylist) ? 'Autoplaylist: ' : 'Playlist: ';
							playlistDataText += pls.nameId + ' - ' +  pls.size + ' Tracks ' + path;
							playlistDataText += '\n' + 'Status: ' + (pls.isLocked ? 'Locked (read-only)' : 'Writable');
							playlistDataText += '\n' + 'Category: ' + (pls.category ? pls.category : '-');
							playlistDataText += '\n' + 'Tags: ' + (isArrayStrings(pls.tags) ? pls.tags : '-');
							// Tooltip text for Autoplaylists
							if (pls.isAutoPlaylist) {
								playlistDataText += '\n' + 'Query: ' + (pls.query ? pls.query : '-');
								playlistDataText += '\n' + 'Sort: ' + (pls.sort ? pls.sort + (pls.bSortForced ? ' (forced)' : ''): '-');
							}
							this.tooltip.SetValue(playlistDataText, true);
							break;
						}
						default:
						{
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
			return false;
		}
	}
	
	this.cacheLastPosition = () => { // Saves info to restore position later!
		if (this.in_range && this.index !== -1) {this.lastIndex = this.index;}
		if (this.index > this.rows && this.offset !== 0) {this.lastOffset = this.offset;}
		currentItemIndex = this.lastIndex;
		if (currentItemIndex >= this.data.length) {currentItemIndex = this.data.length - 1;}
		bMaintainFocus = (currentItemIndex !== -1); // Skip at init or when mouse leaves panel
		currentItemPath = bMaintainFocus ? this.data[currentItemIndex].path : null;
		currentItemNameId = bMaintainFocus ? this.data[currentItemIndex].nameId : null;
		currentItemIsAutoPlaylist = bMaintainFocus ? this.data[currentItemIndex].isAutoPlaylist : null;
	}
	
	this.lbtn_up = (x, y) => {
		if (this.trace(x, y)) {
			switch (true) {
				case this.up_btn.lbtn_up(x, y):
				case this.down_btn.lbtn_up(x, y):
				case !this.in_range: //TODO: Add different menu for header
					break;
				default:
				{
					if (x > this.x && x < this.x + Math.min(this.data[this.index].width, this.text_width)) {
						if (utils.IsKeyPressed(VK_CONTROL)) { // Pressing control
							const z = this.index;
							const duplicated = getPlaylistIndexArray(this.data[z].nameId);
							if (duplicated.length === 0) {list.loadPlaylist(z);} 
							else if (duplicated.length === 1) {list.showBindedPlaylist(z);}
						} else if (utils.IsKeyPressed(VK_SHIFT)) { // Pressing control
							this.removePlaylist(this.index);
						} else { // Only mouse
							if (!this.bDoubleclick) { // It's not a second lbtn click
								this.timeOut = delayFn(createMenuLeft().btn_up, 100)(x,y); // Creates the menu and calls it later
							} else {this.bDoubleclick = false;}
						}
					}
					break;
				}
			}
			return true;
		} else {
			return false;
		}
	}
	
	this.lbtn_dblclk = (x, y) => {
		if (this.trace(x, y)) {
			switch (true) {
				case !this.in_range:
					break;
				default:
				{
					clearTimeout(this.timeOut);
					this.timeOut = null;
					this.bDoubleclick = true;
					const z = this.index;
					const duplicated = getPlaylistIndexArray(this.data[z].nameId);
					if (duplicated.length === 0) {list.loadPlaylist(z);} 
					else if (duplicated.length === 1) {list.showBindedPlaylist(z);}
					break;
				}
			}
			return true;
		} else {
			return false;
		}
	}
	
	this.key_down = (k) => {
		switch (k) {
		case VK_UP:
			this.wheel(1);
			return true;
		case VK_DOWN:
			this.wheel(-1);
			return true;
		default:
			return false;
		}
	}
	
	// Drag n drop
	this.onDragDrop = () => {
		if (_isFile(null)) { // Sends files (playlists) to tracked folder
			return true;
		}
		if (this.index !== -1 && this.in_range) { // Sends tracks to playlist file directly
			this.addTracksToPlaylist(this.index, handleList);
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
					const arr = isCompatible('1.4.0') ? utils.SplitFilePath(path) : utils.FileTest(path, 'split'); //TODO: Deprecated
					const fileName = (arr[1].endsWith(arr[2])) ? arr[1] : arr[1] + arr[2]; // <1.4.0 Bug: [directory, filename + filename_extension, filename_extension]
					bDone = _renameFile(filePath[i], playlistsPathDirName + fileName);
				}
				if (!bDone) {
					console.log('Playlist Manager: Error while moving item to tracked folder.\n' + filePath[i]);
					return false;
				}
			}
			console.log('Playlist Manager: drag n drop done.');
			this.update(void(0), true);
			this.filter();
			return true;
		}
		return false;
	}
	
	this.addTracksToPlaylist = (playlistIndex, handleList) => { // Sends tracks to playlist file directly
		if (playlistIndex < 0 || playlistIndex >= this.items) {
			console.log('Playlist Manager: Error adding tracks to playlist. Index out of bounds.');
			return false;
		}
		if (typeof handleList === 'undefined' || handleList === null || handleList.Count === 0) {
				console.log('Playlist Manager: Error adding tracks to playlist. Handle list has no tracks.');
			return false;
		}
		if (this.data[playlistIndex].isLocked) { // Skip locked playlists
			console.log('Playlist Manager: Skipping save on locked playlist.');
			return false;
		}
		console.log('Playlist Manager: Updating playlist...');
		const playlistPath = this.data[playlistIndex].path;
		let done = addHandleToPlaylist(handleList, playlistPath, (this.bRelativePath ? this.playlistsPath : ''));
		if (!done) {
			fb.ShowPopupMessage('Playlist generation failed while writing file \'' + playlistPath + '\'.', window.Name);
			return false;
		}
		// If done, then we repaint later. Now we manually update the data changes... only one playlist length and/or playlist file size can change here
		this.editData(this.data[playlistIndex], {
			size: this.data[playlistIndex].size + handleList.Count, 
			fileSize: isCompatible('1.4.0') ? utils.GetFileSize(done) : utils.FileTest(done,'s'), //TODO: Deprecated // done points to new path, note playlist extension is not always = 'playlistPath
		});
		console.log('Playlist Manager: drag n drop done.');
		this.update(true, true); // We have already updated data before only for the variables changed
		this.filter();
		return true;
	}
	
	this.updatePlaylistFpl = (playlistIndex) => { // Workaround for .fpl playlist limitations...
		const numPlaylist = this.items;
		const playlistNameId = plman.GetPlaylistName(playlistIndex);
		for (let i = 0; i < numPlaylist; i++) {
			const i_pnameId = this.data[i].nameId;
			const dataIndex = i;
			const fbPlaylistIndex = playlistIndex;
			if (playlistNameId === i_pnameId) {
				console.log('Playlist Manager: Updating playlist...');
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
	
	this.updatePlaylist = (playlistIndex, bCallback = false) => { // Only changes total size
		// playlistIndex: We have a foobar playlist and we iterate over playlist files
		// Or we have the playlist file and we iterate over foobar playlists
		if (!playlistIndex || playlistIndex === -1) {return;}
		if (bCallback) { 
			if (playlistIndex >= plman.PlaylistCount) {return;} //May have deleted a playlist before delaying the update... so there is nothing to update
			if (plman.IsAutoPlaylist(playlistIndex)) {return;} // Always skip updates for AutoPlaylists
			if (arePlaylistNamesDuplicated()) { // Force no duplicate names on foobar playlists when auto-saving...	
				const plmanDuplicates = findPlaylistNamesDuplicated();
				let duplicates = [];
				this.dataAll.forEach((item) => { // But only if those names are being used by playlist at the manager
						if (!item.isAutoPlaylist) {
							const idx = plmanDuplicates.indexOf(item.nameId);
							if (idx !== -1) {duplicates.push(idx);}
						}
					});
				if (duplicates.length) {
					fb.ShowPopupMessage('Check playlist loaded, there are duplicated names. You can not have duplicates if using autosave. Names:\n' + duplicates.join(', '), window.Name);
					return;
				}
			}
		} else if (this.data[playlistIndex].isAutoPlaylist) {return;} // Always skip updates for AutoPlaylists
		// TODO: Allow linking an AutoPlaylist to a file and convert it to standard playlist on saving (?)
		const numPlaylist = (bCallback) ? this.items : plman.PlaylistCount;
		const playlistNameId = (bCallback) ? plman.GetPlaylistName(playlistIndex) : this.data[playlistIndex].nameId;
		const playlistName = playlistNameId.substring(0, playlistNameId.length - this.uuiidLength); // name - UUID x chars long
		for (let i = 0; i < numPlaylist; i++) {
			const i_pnameId = (bCallback) ? this.data[i].nameId : plman.GetPlaylistName(i);
			const dataIndex = (bCallback) ? i : playlistIndex; // This one always point to the index of data
			const fbPlaylistIndex = (bCallback) ? playlistIndex : i; // And this one to fb playlists... according to bCallback
			if (playlistNameId === i_pnameId) {
				if (bCallback && this.data[dataIndex].isLocked) { // Skips locked playlists only for auto-saving!
					return;
				}
				delayAutoUpdate();
				console.log('Playlist Manager: Updating playlist...');
				const playlistPath = this.data[dataIndex].path;
				let bDeleted = false;
				if (_isFile(playlistPath)) {
					bDeleted = _recycleFile(playlistPath);
				} else {bDeleted = true;}
				if (bDeleted) {
					let done = savePlaylist(fbPlaylistIndex, playlistPath, this.playlistsExtension, playlistName, this.optionsUUIDTranslate(), this.data[dataIndex].isLocked, this.data[dataIndex].category, this.data[dataIndex].tags, (this.bRelativePath ? this.playlistsPath : ''));
					if (!done) {
						fb.ShowPopupMessage('Playlist generation failed while writing file \'' + playlistPath + '\'.', window.Name);
						_restoreFile(playlistPath); // Since it failed we need to restore the original playlist back to the folder!
						return;
					}
					// If done, then we repaint later. Now we manually update the data changes... only one playlist length and/or playlist file size can change here
					const UUID = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate(), false) : ''; // Last UUID or nothing for .pls playlists...
					this.editData(this.data[dataIndex], {
						size: plman.PlaylistItemCount(fbPlaylistIndex), 
						nameId: this.data[dataIndex].name + UUID, 
						id: UUID, 
						extension: this.playlistsExtension,  // We may have forced saving on a fpl playlist
						path: this.playlistsPath + this.data[dataIndex].name + this.playlistsExtension,
						fileSize: isCompatible('1.4.0') ? utils.GetFileSize(done) : utils.FileTest(done,'s'), //TODO: Deprecated // done points to new path, note playlist extension is not always = 'playlistPath
					});
					plman.RenamePlaylist(fbPlaylistIndex, this.data[dataIndex].nameId);
				} else {
					fb.ShowPopupMessage('Playlist generation failed when overwriting original playlist file \'' + playlistPath + '\'. May be locked.', window.Name);
					return;
				}
				console.log('Playlist Manager: done.');
				this.update(true, true); // We have already updated data before only for the variables changed
				this.filter();
				break;
			}
		}
	
	}
	
	this.loadExternalJson = () => {
		var test = new FbProfiler(window.Name + ': ' + 'Load json file');
		let externalPath = '';
		try {externalPath = utils.InputBox(window.ID, 'Put here the path of the json file', window.Name);}
		catch (e) {return false;}
		if (!externalPath.length){return false;}
		if (!_isFile(externalPath)) {
			fb.ShowPopupMessage('File does not exist:\n\'' + externalPath + '\'', window.Name);
			return false;
		}
		if (!externalPath.endsWith('.json')) {
			fb.ShowPopupMessage('File has not .json extension:\n\'' + externalPath + '\'', window.Name);
			return false;
		}
		let answer = WshShell.Popup('Are you loading a .json file created by Auto-playlist list by marc2003 script?\n (no = json file by this playlist manager)', 0, window.Name, popup.question + popup.yes_no);
		let dataExternalPlaylists = [];
		if (answer === popup.yes) {
			// Then all playlist are AutoPlaylists and all need size updating...
			// {name,query,sort,forced} maps to {...,name,query,sort,bSortForced,...}
			// Need to fill all the other values
			_jsonParseFile(externalPath).forEach((item) => {
				if (!checkQuery(item.query, false)) {fb.ShowPopupMessage('Query not valid:\n' + item.query, window.Name); return;}
				let size = fb.GetQueryItems(fb.GetLibraryItems(), item.query).Count;
				let oAutoPlaylistItem = new oPlaylist('', '', item.name, '', size, 0, false, true, {query: item.query, sort: item.sort, bSortForced: item.forced}, '', []);
				// width is done along all playlist internally later...
				dataExternalPlaylists.push(oAutoPlaylistItem);
			});
		} else {
			_jsonParseFile(externalPath).forEach((item) => {
				if (!checkQuery(item.query, false)) {fb.ShowPopupMessage('Query not valid:\n' + item.query, window.Name); return;}
				item.size = fb.GetQueryItems(fb.GetLibraryItems(), item.query).Count;
				// width is done along all playlist internally later...
				dataExternalPlaylists.push(item);
			});
		}
		if (dataExternalPlaylists.length) {this.addToData(dataExternalPlaylists);} // Add to database
		this.update(true, true); // Updates and saves AutoPlaylist to our own json format
		this.filter(); // Then filter
		test.Print();
		return true;
	}
	
	this.constShowStates = () => {return ['Filter: All','Filter: Not locked','Filter: Locked'];}; // These are constant
	this.constAutoPlaylistStates = () => {return ['All','Autopls','!Autpls'];};
	this.showStates = this.constShowStates(); // These rotate over time
	this.autoPlaylistStates = this.constAutoPlaylistStates();
	this.isFilterActive = () => {return (list.constShowStates()[0] !== list.showStates[0] || list.constAutoPlaylistStates()[0] !== list.autoPlaylistStates[0]);}
	
	this.filter = ({autoPlaylistState = this.autoPlaylistStates[0], showState = this.showStates[0]} = {}) => {
		// On first filter we use this.dataAll as origin
		if (autoPlaylistState === this.constAutoPlaylistStates()[0]) { // AutoPlaylists
			this.data = [...this.dataAll]; // Copy of objects
		} else if (autoPlaylistState === this.constAutoPlaylistStates()[1]) {
			this.data = this.dataAll.filter((item) => {return item.isAutoPlaylist;});
		} else if (autoPlaylistState === this.constAutoPlaylistStates()[2]) {
			this.data = this.dataAll.filter((item) => {return !item.isAutoPlaylist;});
		}
		// And then... we use this.data to filter again
		if (showState === this.constShowStates()[0]) {
			// this.data = this.data;
		} else if (showState === this.constShowStates()[1]) {
			this.data = this.data.filter((item) => {return !item.isLocked;});
		} else if (showState === this.constShowStates()[2]) {
			this.data = this.data.filter((item) => {return item.isLocked;});
		}
		// Focus
		this.items = this.data.length;
		if (bMaintainFocus) {
			for (let i = 0; i < this.items; i++) { // Also this separate for the same reason, to 
				// Get current index of the previously selected item to not move the list focus when updating...
				// Offset is calculated simulating the wheel, so it moves to the previous location
				if (currentItemIsAutoPlaylist) { // AutoPlaylists
					if (this.data[i].isAutoPlaylist && this.data[i].nameId === currentItemNameId) { 
						this.simulateWheelToIndex(i, currentItemIndex, this.lastOffset);
						break;
					}
				} else if (this.data[i].path === currentItemPath) { // Standard Playlists
					this.simulateWheelToIndex(i, currentItemIndex, this.lastOffset);
					break;
				}
			}
		}
		// Save current filter: rotate original matrix until it matches the current one
		if (this.bSaveFilterStates) {
			let rotations = [0,0];
			for (let i = 0; i < this.constAutoPlaylistStates().length; i++) {
				if (this.autoPlaylistStates[0] === this.constAutoPlaylistStates().rotate(i)[0]) {
					rotations[0] = i;
					break;
				}
			}
			for (let i = 0; i < this.constShowStates().length; i++) {
				if (this.showStates[0] === this.constShowStates().rotate(i)[0]) {
					rotations[1] = i;
					break;
				}
			}
			this.properties['filterStates'][1] = rotations[0] + ',' + rotations[1];
			overwriteProperties(this.properties);
		}
		window.Repaint();
	}
	
	this.sortMethods = () => { // These are constant. We expect the first sorting order of every method is the natural one...
				return {'By name': 
							{
							'Az': (a, b) => {return a.name.localeCompare(b.name);}, 
							'Za': (a, b) => {return 0 - a.name.localeCompare(b.name);},
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
							}			
						}
	;}
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
						this.simulateWheelToIndex(i, currentItemIndex, this.lastOffset);
						break;
					}
				} else if (this.data[i].path === currentItemPath) { // Standard Playlists
					this.simulateWheelToIndex(i, currentItemIndex, this.lastOffset);
					break;
				}
			}
		}
		if (bPaint) {window.Repaint();}
	}
	
	this.update = (bJustPaint = false, bNotPaint = false, currentItemIndex = -1) => {
		delayAutoUpdate();
		// Saves currently selected item for later use
		const bMaintainFocus = (currentItemIndex !== -1); // Skip at init or when mouse leaves panel
		if (bJustPaint) {
			// Recalculates from data
			this.data = this.data.map((item) => {
					if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal) + 8 + icon_char_playlistW;} 
					else {item.width = _textWidth(item.name, panel.fonts.normal) +  + 8 + icon_char_playlistW;}
					return item;
				});
			this.dataAll = this.dataAll.map((item) => {
					if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal) + 8 + icon_char_playlistW;} 
					else {item.width = _textWidth(item.name, panel.fonts.normal) +  + 8 + icon_char_playlistW;}
					return item;
				});
		} else { // Recalculates from files
			// AutoPlaylist and FPL From json
			console.log('Playlist manager: reading from files');
			this.dataAutoPlaylists = [];
			this.dataFpl = [];
			if (_isFile(this.filename)) {
				if (this.bUpdateAutoplaylist && this.bShowSize) {var test = new FbProfiler(window.Name + ': ' + 'Refresh AutoPlaylists');}
				_jsonParseFile(this.filename).forEach((item) => {
						if (item.isAutoPlaylist) {
							if (this.bUpdateAutoplaylist && this.bShowSize) { 
								// Only re-checks query when forcing update of size for performance reasons
								// Note the query is checked on user input, external json loading and just before loading the playlist
								// So checking it every time the panel is painted is totally useless...
								if (!checkQuery(item.query, false)) {fb.ShowPopupMessage('Query not valid:\n' + item.query, window.Name); return;}
								item.size = fb.GetQueryItems(fb.GetLibraryItems(), item.query).Count;
								delayAutoUpdate();
							} // Updates size for Autoplaylists. Warning takes a lot of time! Only when required...
							if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal)  + 8 + icon_char_playlistW;} 
							else {item.width = _textWidth(item.name, panel.fonts.normal) + 8 + icon_char_playlistW;}
							this.dataAutoPlaylists.push(item);
						}
						if (item.extension === '.fpl') {
							if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal)  + 8 + icon_char_playlistW;} 
							else {item.width = _textWidth(item.name, panel.fonts.normal) + 8 + icon_char_playlistW;}
							this.dataFpl.push(item);
						}
					});
				if (this.bUpdateAutoplaylist && this.bShowSize) {test.Print();}
			}
			this.itemsAutoplaylist = this.dataAutoPlaylists.length;
			this.data = [];
			this.data = loadPlaylistsFromFolder().map((item) => {
					if (item.extension === '.fpl'){ // Workaround for fpl playlist limitations... load cached playlist size and other data
						if (this.bFplLock) {item.isLocked = true;}
						let fplPlaylist = this.dataFpl.find((pls) => {return pls.name === item.name;});
						if (fplPlaylist) {
							item.category = fplPlaylist.category;
							item.tags = fplPlaylist.tags;
							item.size = fplPlaylist.size;
						}
						if (!this.properties['bFirstPopupFpl'][1]) {
							this.properties['bFirstPopupFpl'][1] = true;
							overwriteProperties(this.properties); // Updates panel
							fb.ShowPopupMessage('Playlist manager has loaded a .fpl playlist for the first time. This is an informative popup.\n\n-.fpl playlists are non writable, but size and other data (UUID, category, lock status or tags) may be cached between sessions as soon as it\'s set for the first time.\n-By default they are set as locked files (so they will never be autosaved), if you want to convert them to another editable extension, just force a playlist update.\n-To edit category or tags, unlock the playlist, set the desired values and lock it again. The data will be saved between sessions.\n-Playlist size can only be retrieved when the playlist is loaded within foobar, so the first time it\'s loaded, the value will be stored for future sessions.', 'Playlist Manager');
						}
					}
					if (item.extension === '.pls') {
						if (!this.properties['bFirstPopupPls'][1]) {
							this.properties['bFirstPopupPls'][1] = true;
							overwriteProperties(this.properties); // Updates panel
							fb.ShowPopupMessage('Playlist manager has loaded a .pls playlist for the first time. This is an informative popup.\n\n-.pls playlists format doesn\'t allow extra data like UUID, category, lock status or tags, ... use .m3u or .m3u8 for full data support.\n-The related menu entries to set that data (or lock status) are disabled (greyed).\n-If you are using another format (extension) on the panel, as soon as a playlist update is required on the file, it will be converted to the new format.', 'Playlist Manager');
						}
					}
					if (this.bShowSize) {item.width = _textWidth(item.name + '(' + item.size + ')', panel.fonts.normal)  + 8 + icon_char_playlistW;} 
					else {item.width = _textWidth(item.name, panel.fonts.normal) + 8 + icon_char_playlistW;}
					return item;
				});
			this.data = this.data.concat(this.dataAutoPlaylists);
			this.dataAll = [...this.data];
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
		if (!bMaintainFocus) {this.offset = 0} // Don't move the list focus...
		else {
			for (let i = 0; i < this.items; i++) { // Also this separate for the same reason, to 
				// Get current index of the previously selected item to not move the list focus when updating...
				// Offset is calculated simulating the wheel, so it moves to the previous location
				if (currentItemIsAutoPlaylist) { // AutoPlaylists
					if (this.data[i].isAutoPlaylist && this.data[i].nameId === currentItemNameId) { 
						this.simulateWheelToIndex(i, currentItemIndex, this.lastOffset);
						break;
					}
				} else if (this.data[i].path === currentItemPath) { // Standard Playlists
					this.simulateWheelToIndex(i, currentItemIndex, this.lastOffset);
					break;
				}
			}
		}
		this.save(); // Updates this.dataAutoPlaylists
		this.itemsAutoplaylist = this.dataAutoPlaylists.length;
		if (this.bUpdateAutoplaylist) {this.bUpdateAutoplaylist = false;}
		this.header_textUpdate();
		if (!bNotPaint){window.Repaint();}
	}
	
	this.updateAllUUID = () => {
		this.dataAll.forEach((pls) => {if (pls.extension !== '.pls') {this.updateUUID(pls);}}); // Changes data on the other arrays too since they link to same object
		this.update(true, true);
		this.filter();
	}
	
	this.updateUUID = (playlistObj) => {
		delayAutoUpdate();
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
				fb.ShowPopupMessage('You can not have duplicated playlist names within foobar: ' + old_name + '\n' + 'Choose another unique name for renaming.', window.Name);
			} else {
				const plsIdx = plman.FindPlaylist(old_nameId);
				if (plsIdx !== -1) {
					if (playlistObj.isAutoPlaylist || playlistObj.extension === '.fpl') {
						this.update_plman(new_nameId, old_nameId); // Update with new id
					} else {
						if (_isFile(playlistObj.path)) {
							if (!playlistObj.isLocked) {
								let originalStrings = ['#PLAYLIST:' + old_name, '#UUID:' + old_id];
								let newStrings = ['#PLAYLIST:' + old_name, '#UUID:' + new_id];
								let bDone = editTextFile(playlistObj.path, originalStrings, newStrings);
								if (!bDone) {
									fb.ShowPopupMessage('Error renaming playlist file: ' + old_name + ' --> ' + old_name + '\nPath: ' + playlistObj.path, window.Name);
								} else {
									this.update_plman(new_nameId, old_nameId); // Update with new id
								}
							}
						} else { fb.ShowPopupMessage('Playlist file does not exist: ' + playlistObj.name + '\nPath: ' + playlistObj.path, window.Name);}
					}
				}
			}
		}
	}
	
	this.init = () => {
		
		this.save = () => {
			this.dataAutoPlaylists = [];
			this.dataFpl = [];
			if (this.dataAll) {
				this.dataAll.forEach((item) => {
					if (item.isAutoPlaylist) { // Saves autoplaylists to json
						this.dataAutoPlaylists.push(item);
					}
					if (item.extension === '.fpl') { // Save fpl size and name ID cache too
						this.dataFpl.push(item);
					}
				});
				_save(this.filename, JSON.stringify([...this.dataAutoPlaylists, ...this.dataFpl], this.replacer));
			}
		}
		
		this.addToData = (objectPlaylist) => {
			delayAutoUpdate();
			if (isArray(objectPlaylist)) {
				for (const objectPlaylist_i of objectPlaylist) {this.addToData(objectPlaylist_i);}
				return;
			}
			if (objectPlaylist.isAutoPlaylist) {
				this.dataAutoPlaylists.push(objectPlaylist);
				this.itemsAutoplaylist++;
			}
			if (objectPlaylist.extension === '.fpl') {
				this.dataFpl.push(objectPlaylist);
				this.itemsFpl++;
			}
			this.data.push(objectPlaylist);
			this.items++;
			this.dataAll.push(objectPlaylist);
			this.itemsAll++;
		}
		
		this.editData = (objectPlaylist, properties) => {
			delayAutoUpdate();
			if (isArray(objectPlaylist)) {
				for (const objectPlaylist_i of objectPlaylist) {this.editData(objectPlaylist_i);}
				return;
			}
			/* let index;
			if (objectPlaylist.isAutoPlaylist) {
				index = this.dataAutoPlaylists.indexOf(objectPlaylist);
				if (index !== -1) {
				Object.keys(properties).forEach( (property) => {this.dataAutoPlaylists[index][property] = properties[property];});
				} else {console.log('Playlist Mananger: error editing playlist object from \'this.dataAutoPlaylists\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			}
			if (objectPlaylist.extension === '.fpl') {
				index = this.dataFpl.indexOf(objectPlaylist);
				if (index !== -1) {
				Object.keys(properties).forEach( (property) => {this.dataFpl[index][property] = properties[property];});
				} else {console.log('Playlist Mananger: error editing playlist object from \'this.dataFpl\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			}
			index = this.data.indexOf(objectPlaylist);
			if (index !== -1) {
				Object.keys(properties).forEach( (property) => {this.data[index][property] = properties[property];});
			} else {console.log('Playlist Mananger: error editing playlist object from \'this.data\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));} 
			index = this.dataAll.indexOf(objectPlaylist);
			*/
			const index = this.dataAll.indexOf(objectPlaylist);
			if (index !== -1) { // Changes data on the other arrays too since they link to same object
				Object.keys(properties).forEach( (property) => {this.dataAll[index][property] = properties[property];});
			} else {console.log('Playlist Mananger: error editing playlist object from \'this.dataAll\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
		}
		
		this.removeFromData = (objectPlaylist) => {
			if (isArray(objectPlaylist)) {
				for (const objectPlaylist_i of objectPlaylist) {this.removeFromData(objectPlaylist_i);}
				return;
			}
			let index;
			if (objectPlaylist.isAutoPlaylist) {
				index = this.dataAutoPlaylists.indexOf(objectPlaylist);
				if (index !== -1) {
					this.dataAutoPlaylists.splice(index ,1);
					this.itemsAutoplaylist--;
				} else {console.log('Playlist Mananger: error removing playlist object from \'this.dataAutoPlaylists\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			}
			if (objectPlaylist.extension === '.fpl') {
				index = this.dataFpl.indexOf(objectPlaylist);
				if (index !== -1) {
					this.dataFpl.splice(index ,1);
					this.itemsFpl--;
				} else {console.log('Playlist Mananger: error removing playlist object from \'this.dataFpl\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			}
			index = this.data.indexOf(objectPlaylist);
			if (index !== -1) {
				this.data.splice(index ,1);
				this.items--;
			} else {console.log('Playlist Mananger: error removing playlist object from \'this.data\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
			index = this.dataAll.indexOf(objectPlaylist);
			if (index !== -1) {
				this.dataAll.splice(index ,1);
				this.itemsAll--;
			} else {console.log('Playlist Mananger: error removing playlist object from \'this.dataAll\'. Index was expect, but got -1.\n' + Array.from(objectPlaylist));}
		}
		
		this.replacer = (key, value) => {
			return key === 'width' ? void(0) : value;
		}
		
		this.addAutoplaylist = () => {
			let new_name = '';
			try {new_name = utils.InputBox(window.ID, 'Enter AutoPlaylist name', window.Name);}
			catch (e) {return;}
			if (!new_name.length) {return;}
			let new_query = '';
			try {new_query = utils.InputBox(window.ID, 'Enter AutoPlaylist query', window.Name);}
			catch (e) {return;}
			if (!checkQuery(new_query, false)) {fb.ShowPopupMessage('Query not valid:\n' + new_query, window.Name); return;}
			
			const new_sort = utils.InputBox(window.ID, 'Enter sort pattern\n\n(optional)', window.Name);
			const new_forced = (new_sort.length ? WshShell.Popup('Force sort?', 0, window.Name, popup.question + popup.yes_no) : popup.no) === popup.yes;
			const new_queryObj = {query: new_query, sort: new_sort, bSortForced: new_forced};
			const queryCount = fb.GetQueryItems(fb.GetLibraryItems(), new_query).Count;
			const objectPlaylist = new oPlaylist('', '', new_name, '', queryCount, 0, false, true, new_queryObj);
			this.addToData(objectPlaylist);
			this.update(true, true); // We have already updated data before only for the variables changed
			this.filter();
		}
		
		this.add = (bEmpty) => { // Creates new playlist file, empty or using the active playlist. Changes both total size and number of playlists,,,
			let input = '';
			const oldNameId = plman.GetPlaylistName(plman.ActivePlaylist);
			const oldName = oldNameId.substring(0, oldNameId.length - this.uuiidLength); // name - UUID x chars long
			let boxText = bEmpty ? 'Enter playlist name' : 'Enter playlist name.\nIf you change the current name, then a duplicate of the active playlist will be created with the new name and it will become the active playlist.'
			try {input = utils.InputBox(window.ID, boxText, window.Name, bEmpty ? '' : oldName, true);} 
			catch(e) {return;}
			if (!input.length) {return;}
			const new_name = input;
			const oPlaylistPath = this.playlistsPath + new_name + this.playlistsExtension;
			if (!_isFile(oPlaylistPath)) { // Just for safety
				// Creates the file on the folder
				if (!_isFolder(this.playlistsPath)) {_createFolder(this.playlistsPath);} // For first playlist creation
				let done = savePlaylist(bEmpty ? -1 : plman.ActivePlaylist, oPlaylistPath, this.playlistsExtension, new_name, this.optionsUUIDTranslate(), false, '', '', (this.bRelativePath ? this.playlistsPath : ''));
				if (done) {
					const UUID = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate(), false) : ''; // Last UUID or nothing for pls playlists...
					const objectPlaylist = new oPlaylist(UUID, oPlaylistPath, new_name, this.playlistsExtension, bEmpty ? 0 : plman.PlaylistItemCount(plman.ActivePlaylist), isCompatible('1.4.0') ? utils.GetFileSize(done) : utils.FileTest(done,'s')) //TODO: Deprecated
					// Adds to list of objects and update variables
					this.addToData(objectPlaylist);
					if (bEmpty) { // Empty playlist
						let indexFound = plman.FindPlaylist(new_name);
						if (indexFound === -1) { 
							let new_playlist = plman.CreatePlaylist(plman.PlaylistCount, new_name + UUID);
							plman.ActivePlaylist = new_playlist;
						} else { // If there is a playlist with the same name, ask to bind
							let answer = WshShell.Popup('Created empty playlist file \'' + new_name + '\' but there is already a playlist loaded with the same name.\nWant to update playlist file with all tracks from that playlist?', 0, window.Name, popup.question + popup.yes_no);
							if (answer === popup.yes) {
								plman.ActivePlaylist = indexFound;
								plman.RenamePlaylist(indexFound, new_name + UUID);
								this.updatePlaylist(this.data.length - 1); // This updates size too // TODO: items
							}
						}
					} else {	// If we changed the name of the playlist but created it using the active playlist, then clone with new name
						if (new_name !== oldName) {
							let new_playlist = plman.DuplicatePlaylist(plman.ActivePlaylist, new_name + UUID);
							plman.ActivePlaylist = new_playlist;
						} else {
							plman.RenamePlaylist(plman.ActivePlaylist, new_name + UUID);
						}
					}
				} else {
					fb.ShowPopupMessage('Playlist generation failed while writing file \'' + oPlaylistPath + '\'.', window.Name);
				}
			} else {fb.ShowPopupMessage('Playlist \'' + new_name + '\' already exists on path: \'' + oPlaylistPath + '\'', window.Name);}
			this.update(true, true); // We have already updated data // TODO: true,true when split this.data from this.dataPaint... 
			this.filter();
        }
		
		this.loadPlaylist = (idx) => {
			const old_nameId = this.data[idx].nameId;
			const old_name = this.data[idx].name;
			const duplicated = getPlaylistIndexArray(old_nameId);
			if (duplicated && duplicated.length > 1) {
				fb.ShowPopupMessage('You can not have duplicated playlist names within foobar: ' + old_name + '\n' + 'Please delete all playlist with that name first; you may leave one. Then try loading the playlist again.', window.Name);
			} else {
				let [fbPlaylistIndex] = clearPlaylistByName(old_nameId); //only 1 index expected after previous check. Clear better than removing, to allow undo
				if (this.data[idx].isAutoPlaylist) { // AutoPlaylist
					if (!fbPlaylistIndex) {fbPlaylistIndex = plman.PlaylistCount;}
					if (!checkQuery(this.data[idx].query, false)) {fb.ShowPopupMessage('Query not valid:\n' + this.data[idx].query, window.Name); return;}
					plman.CreateAutoPlaylist(fbPlaylistIndex, old_name, this.data[idx].query, this.data[idx].sort, this.data[idx].bSortForced ? 1 : 0);
					plman.ActivePlaylist = fbPlaylistIndex;
				} else { // Or file
					if (_isFile(this.data[idx].path)) {
						if (!fbPlaylistIndex) {fbPlaylistIndex = plman.CreatePlaylist(plman.PlaylistCount, old_nameId);} //If it was not loaded on foobar, then create a new one
						plman.ActivePlaylist = fbPlaylistIndex;
						// Try to load handles from library first, greatly speeds up non fpl large playlists
						// But it will fail as soon as any track is not found on library
						// Always use tracked folder relative path for reading, it will be discarded if playlist does not contain relative paths
						let bDone = this.data[idx].extension !== '.fpl' ? loadTracksFromPlaylist(this.data[idx].path, plman.ActivePlaylist, this.playlistsPath) : false;
						if (!bDone) {plman.AddLocations(fbPlaylistIndex, [this.data[idx].path], true);}
						if (this.data[idx].extension === '.fpl') { // Workaround for fpl playlist limitations...
							setTimeout(() => {this.updatePlaylistFpl(fbPlaylistIndex);}, 2000);
						}
					} else {fb.ShowPopupMessage('Playlist file does not exist: ' + this.data[idx].name + '\nPath: ' + this.data[idx].path, window.Name);}
				}
			}
		}
		
		this.showBindedPlaylist = (idx) => {
			const new_nameId = this.data[idx].nameId;
			const index = plman.FindPlaylist(new_nameId);
			plman.ActivePlaylist = index;
		}
		
		this.removePlaylist = (idx) => {
			// Adds timestamp to filename
			delayAutoUpdate();
			if (!this.data[idx].isAutoPlaylist) { // Only for not AutoPlaylists
				if (_isFile(this.data[idx].path)) {
					let newPath = this.data[idx].path.split('.').slice(0,-1).join('.').split('\\')
					const new_name = newPath.pop() + '_ts_' + (new Date().toDateString() + Date.now()).split(' ').join('_');
					newPath = newPath.concat([new_name]).join('\\') + this.data[idx].extension;
					_renameFile(this.data[idx].path, newPath);
					// and delete it
					_recycleFile(newPath);
					this.editData(this.data[idx], {
						path: newPath,
					});
				} else {
					fb.ShowPopupMessage('Playlist file does not exist: ' + this.data[idx].name + '\nPath: ' + this.data[idx].path, window.Name);
					return;
				}
			}
			// Delete from data
			const old_nameId = this.data[idx].nameId;
			const duplicated = plman.FindPlaylist(old_nameId);
			if (this.data[idx].size) {this.totalFileSize -= this.data[idx].size;}
			this.deleted_items.unshift(this.data[idx]);
			this.removeFromData(this.data[idx]); // Use this instead of this.data.splice(idx, 1) to remove from all data arrays!
			this.update(true, true); // Call this inmediatly after removal! If paint fires before updating things get weird
			this.filter();
			if (duplicated !== -1) {
				let answer = WshShell.Popup('Delete also the playlist loaded within foobar?', 0, window.Name, popup.question + popup.yes_no);
				if (answer === popup.yes) {
					plman.RemovePlaylistSwitch(duplicated);
				}
			}
		}
		
		this.update_plman = (name, oldName) => {
			let i = 0;
			while (i < plman.PlaylistCount) {
				if (plman.GetPlaylistName(i) === oldName) {
					plman.RenamePlaylist(i, name);
				} else {
					i++;
				}
			}
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
			if (Object.keys(removeProperties).length) {setProperties(removeProperties, '', 0, false, true);} // Deletes old properties used as placeholders
			if (bDone) {  // Set new properties with description changed, but does not overwrites old values
				setProperties(newProperties, '', 0, false, false);
				this.properties = getPropertiesPairs(this.properties, '', 0, false); // And update
			}
		}
		
		this.checkConfig = () => { // Forces right settings
			// Check playlist extension
			if (!writablePlaylistFormats.has(this.playlistsExtension)){
				fb.ShowPopupMessage('Wrong extension set at properties panel:' + '\n\'' + this.properties['extension'][0] + '\':\'' + this.playlistsExtension + '\'\n' + 'Only allowed ' + Array.from(writablePlaylistFormats).join(', ') + '\nUsing \'.m3u8\' as fallback', window.Name);
				window.ShowProperties();
				this.playlistsExtension = '.m3u8';
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
				this.uuiidLength = 0;
			}
			// Check sorting is valid
			if (!this.sortMethods().hasOwnProperty(this.methodState)) {
				fb.ShowPopupMessage('Wrong sorting method set at properties panel: \'' + this.methodState + '\'\n' + 'Only allowed: \n\n' + Object.keys(this.sortMethods()).join('\n') + '\n\nUsing default method as fallback', window.Name);
				window.ShowProperties();
				this.methodState = this.getMethodState(); // On first call first state of that method will be default
			}
			if (!this.sortMethods()[this.methodState].hasOwnProperty(this.sortState)) {
				fb.ShowPopupMessage('Wrong sorting order set at properties panel: \'' + this.sortState + '\'\n' + 'Only allowed: ' + Object.keys(this.sortMethods()[this.methodState]) + '\nUsing default sort state as fallback', window.Name);
				window.ShowProperties();
				this.sortState = this.getSortState(); // On first call first state of that method will be default
			}
			if (this.bSaveFilterStates) { // Rotate current filters until it matches the saved ones
				const rotations = this.properties['filterStates'][1].split(',');
				this.autoPlaylistStates = this.constAutoPlaylistStates().rotate(rotations[0]);
				this.showStates = this.constShowStates().rotate(rotations[1]);
			}
			if (!this.colours || !Object.keys(this.colours).length) { // Sets default colours
				this.colours = {};
				this.colours['lockedPlaylistColour'] = RGB(...toRGB(0xFFDC143C));
				this.colours['autoPlaylistColour'] = blendColours(panel.colours.text, RGB(...toRGB(0xFFDC143C)), 0.6);
				this.colours['selectedPlaylistColour'] = blendColours(panel.colours.highlight, RGB(...toRGB(0xFFDC143C)), 0.8);
			}
			if (this.colours && Object.keys(this.colours).length !== 3) { // Fills missing colours
				if (!this.colours['lockedPlaylistColour']) {this.colours['lockedPlaylistColour'] = RGB(...toRGB(0xFFDC143C));}
				if (!this.colours['lockedPlaylistColour']) {this.colours['autoPlaylistColour'] = blendColours(panel.colours.text, RGB(...toRGB(0xFF9932CC)), 0.6);}
				if (!this.colours['lockedPlaylistColour']) {this.colours['selectedPlaylistColour'] = blendColours(panel.colours.highlight, RGB(...toRGB(0xFFDC143C)), 0.8);}
			}
		}
		
		this.reset = () => {
			this.items = 0;
			this.itemsAll = 0;
			this.itemsAutoplaylist = 0;
			this.itemsFpl = 0;
			this.bUpdateAutoplaylist = this.properties['bUpdateAutoplaylist'][1];
			this.totalFileSize = 0;
			this.index = -1;
			this.lastIndex = -1;
			this.lastOffset = 0;
			this.data = []; // Data to paint
			this.dataAll = []; // Everything cached (filtering changes this.data but not this one)
			this.dataAutoPlaylists = []; // Only autoplaylists to save to json
			this.dataFpl = []; // Only fpl playlists to save to json
			this.deleted_items = [];
			this.showStates = this.constShowStates();
			this.autoPlaylistStates = this.constAutoPlaylistStates();
			this.methodState = this.properties['methodState'][1];
			this.sortState = this.properties['sortState'][1];
			this.optionUUID = this.properties['optionUUID'][1];
			this.bShowSep = this.properties['bShowSep'][1];
			this.colours = convertStringToObject(this.properties['listColours'][1], 'number');
			this.bRelativePath = this.properties['bRelativePath'][1];
		}
		
		_createFolder(folders.data);
		this.filename = folders.data + 'playlistManager_' + this.playlistsPathDirName.replace(':','') + '.json'; // Replace for relative paths folder names!
		_recycleFile(this.filename + '.old') // recycle old backup
		_copyFile(this.filename, this.filename + '.old'); // make new backup
		this.initProperties() // This only set properties if they have no values...
		this.reset()
		this.checkConfig();
		this.update(false, true);
		this.filter();
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
	
	panel.list_objects.push(this);
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.mx = 0;
	this.my = 0;
	this.index = -1;
	this.lastIndex = -1;
	this.offset = 0;
	this.lastOffset = 0;
	this.items = 0;
	this.itemsAll = 0;
	this.itemsAutoplaylist = 0;
	this.itemsFpl = 0;
	this.text_x = 0;
	this.timeOut = null;
	this.bDoubleclick = false;
	this.filename = '';
	this.totalFileSize = 0; // Stores the file size of all playlists for later comparison when autosaving
	this.properties = getPropertiesPairs(properties, prefix); // Load once! [0] = descriptions, [1] = values set by user (not defaults!)
	this.playlistsPath = this.properties['playlistPath'][1];
	this.playlistsPathDirName = this.playlistsPath.split('\\').filter(Boolean).pop()
	this.playlistsExtension = this.properties['extension'][1];
	this.bShowSize = this.properties['bShowSize'][1];
	this.bUpdateAutoplaylist = this.properties['bUpdateAutoplaylist'][1]; // Forces AutoPlaylist size update on startup according to query. Requires also this.bShowSize = true!
	this.bUseUUID = this.properties['bUseUUID'][1];
	this.optionsUUID = () => {return ['Yes: Using invisible chars plus (*) indicator (experimental)','Yes: Using a-f chars','Yes: Using only (*) indicator','No: Only the name'];}
	this.optionUUID = this.properties['optionUUID'][1];
	this.bFplLock = this.properties['bFplLock'][1];
	this.bSaveFilterStates = this.properties['bSaveFilterStates'][1];
	this.bShowSep = this.properties['bShowSep'][1];
	this.bRelativePath = this.properties['bRelativePath'][1];
	this.colours = convertStringToObject(this.properties['listColours'][1], 'number');
	this.uuiidLength = (this.bUseUUID) ? nextId(this.optionsUUIDTranslate(), false) : 0; // previous UUID before initialization is just the length
	this.up_btn = new _sb(chars.up, this.x, this.y, _scale(12), _scale(12), () => { return this.offset > 0; }, () => { this.wheel(1); });
	this.down_btn = new _sb(chars.down, this.x, this.y, _scale(12), _scale(12), () => { return this.offset < this.items - this.rows; }, () => { this.wheel(-1); });
	this.init();
}