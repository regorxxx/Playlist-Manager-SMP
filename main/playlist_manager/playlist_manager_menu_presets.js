'use strict';
//20/11/24

/* global require:readable, RGB:readable, colorBlind:readable, panel:readable, list:readable, convertObjectToString:readable,  overwriteProperties:readable */
const Chroma = require('..\\..\\helpers-external\\chroma.js\\chroma.min');
/* global colorbrewer:readable */
const createMenuRightTopBack = createMenuRightTop;

function createMenuRightTop() {
	/** @type {_menu} */
	const menu = createMenuRightTopBack();
	{	// Presets
		const subMenuSecondName = 'Presets...';
		const presets = [ /*[autoPlaylistColor, smartPlaylistColor, uiPlaylistColor, lockedPlaylistColor, selectedPlaylistColor, buttons, background ]*/
		];
		colorbrewer.sequential.forEach((palette, i) => {
			if (i === 0) { presets.push({ name: 'sep' }); }
			const scale = Chroma.scale(palette).colors(5, 'rgb').map((arr) => { return RGB(...arr); });
			presets.push({ name: palette, colors: [scale[1], scale[1], scale[2], scale[2], scale[3], scale[3], colorBlind.black[2]] });
		});
		presets.forEach((preset) => {
			if (menu.isSeparator(preset)) { menu.newSeparator(subMenuSecondName); return; }
			menu.newEntry({
				menuName: subMenuSecondName, entryText: preset.name, func: () => {
					if (preset.name.toLowerCase() === 'default') {
						panel.properties.colorsMode[1] = panel.colors.mode = 0;
						panel.properties.buttonsTextColor[1] = panel.colors.buttonsTextColor = RGB(0, 0, 0);
						panel.properties.bCustomText[1] = panel.colors.bCustomText = false;
						list.colors = {};
					}
					else {
						panel.properties.colorsMode[1] = panel.colors.mode = 2;
						panel.properties.customBackground[1] = panel.colors.customBackground = preset.colors[6];
						panel.properties.bCustomText[1] = panel.colors.bCustomText = true;
						panel.properties.customText[1] = panel.colors.customText = preset.colors[5];
						list.colors.autoPlaylistColor = preset.colors[0];
						list.colors.smartPlaylistColor = preset.colors[1];
						list.colors.uiPlaylistColor = preset.colors[2];
						list.colors.lockedPlaylistColor = preset.colors[3];
						list.colors.selectedPlaylistColor = preset.colors[4];
					}
					list.properties.listColors[1] = convertObjectToString(list.colors);
					panel.colorsChanged();
					panel.setDefault({ all: true });
					if (Object.hasOwn(preset, 'buttonColors') && preset.buttonColors.length) {
						if (preset.buttonColors[0] !== null) { panel.properties.buttonsTextColor[1] = panel.colors.buttonsTextColor = preset.buttonColors[0]; }
						if (preset.buttonColors[1] !== null) { panel.properties.buttonsToolbarColor[1] = panel.colors.buttonsToolbarColor = preset.buttonColors[1]; }
						panel.colorsChanged();
					}
					overwriteProperties(list.properties);
					overwriteProperties(panel.properties);
					list.checkConfig();
					list.repaint();
				}
			});
		});
	}
	return menu;
}