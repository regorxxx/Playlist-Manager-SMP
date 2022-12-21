'use strict';
//19/12/22

const Chroma = require('..\\..\\helpers-external\\chroma.js-2.4.0\\chroma');
const createMenuRightTopBack = createMenuRightTop;

function createMenuRightTop() {
	const menu = createMenuRightTopBack();
	{	// Presets
		const subMenuSecondName = 'Presets...';
		const presets = [ /*[autoPlaylistColour, smartPlaylistColour, uiPlaylistColour, lockedPlaylistColour, selectedPlaylistColour, standard text, buttons, background ]*/
		];
		colorbrewer.sequential.forEach((palette, i) => {
			if (i === 0) {presets.push({name: 'sep'});}
			const scale = Chroma.scale(palette).colors(5, 'rgb').map((arr) => {return RGB(...arr);});
			presets.push({name: palette, colors: [scale[1], scale[1], scale[2], scale[2], scale[3], scale[3], colorBlind.black[2], colorBlind.black[2]]});
		});
		presets.forEach((preset) => {
			if (preset.name.toLowerCase() === 'sep') {menu.newEntry({menuName: subMenuSecondName, entryText: 'sep'}); return;}
			menu.newEntry({menuName: subMenuSecondName, entryText: preset.name, func: () => {
				if (preset.name.toLowerCase() === 'default') {
					panel.properties.coloursMode[1] = panel.colours.mode = 0;
					panel.properties.buttonsTextColor[1] = panel.colours.buttonsTextColor = RGB(0,0,0);
					panel.properties.bCustomText[1] = panel.colours.bCustomText = false;
					list.colours = {};
				}
				else {
					panel.properties.coloursMode[1] = panel.colours.mode = 2;
					panel.properties.customBackground[1] = panel.colours.custom_background = preset.colors[7];
					panel.properties.buttonsTextColor[1] = panel.colours.buttonsTextColor = preset.colors[6];
					panel.properties.bCustomText[1] = panel.colours.bCustomText = true;
					panel.properties.customText[1] = panel.colours.customText = preset.colors[5];
					list.colours.autoPlaylistColour = preset.colors[0];
					list.colours.smartPlaylistColour = preset.colors[1];
					list.colours.uiPlaylistColour = preset.colors[2];
					list.colours.lockedPlaylistColour = preset.colors[3];
					list.colours.selectedPlaylistColour = preset.colors[4];
				}				
				list.properties.listColours[1] = convertObjectToString(list.colours);
				overwriteProperties(list.properties);
				overwriteProperties(panel.properties);
				panel.coloursChanged();
				list.checkConfig();
				window.Repaint();
			}});
		});
	}
	return menu;
}