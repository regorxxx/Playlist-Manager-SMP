'use strict';
//19/04/26

/* exported dynamicColors, mostContrastColors */

/* global Chroma:readable */
include('..\\..\\helpers\\helpers_xxx_UI.js');
/* global RGB:readable, blendColors:readable */

function mostContrastColor(refColor, palette = [RGB(255, 255, 255), RGB(0, 0, 0)]) {
	if (Array.isArray(refColor)) {
		const options = new Map();
		palette.forEach((c) => options.set(c, 0));
		refColor.forEach((o) => {
			const mcc = mostContrastColor(o.col, palette);
			options.set(mcc.color, options.get(mcc.color) + o.freq * mcc.contrast);
		});
		return Object.fromEntries([...options.entries()].sort((a, b) => b[1] - a[1])[0].map((c, i) => [i === 0 ? 'color' : 'contrast', c]));
	} else {
		return palette.reduce((prev, color) => {
			if (color === -1) { color = 4294967295; } // 32 to 64 bit color
			const contrast = Chroma.contrast(color, refColor);
			return prev.contrast <= contrast
				? { color, contrast }
				: prev;
		}, { color: null, contrast: 0 });
	}
}

function dynamicColors(colorScheme, bgColor, bAdvanced = false) {
	let main = mostContrastColor(bgColor, colorScheme).color;
	const tint = mostContrastColor(main, colorScheme).color;
	const note = Chroma.contrast(tint, bgColor) > 2
		? tint
		: blendColors(main, tint, 0.5);
	let sec = colorScheme.filter((c) => c !== main && c !== tint)
		.sort((a, b) => Chroma.contrast(b, note) - Chroma.contrast(a, note))[0];
	if (typeof sec === 'undefined') { sec = blendColors(tint, note, 0.5); }
	if (bAdvanced) {
		const chromaColors = colorScheme.map((c) => Chroma(c));
		if (chromaColors.every((c) => c.get('hsl.s') < 0.1)) { // It's mostly a B&W scheme
			let cMain = Chroma(main);
			let cSec = Chroma(sec);
			if (cMain.hsv()[1] - cSec.hsv()[1] > 0.2) {
				[cMain, cSec] = [cSec, cMain];
				if (cMain.luminance() - cSec.luminance() > 0.4) {
					[cMain, cSec] = [cSec, cMain];
				} else if (cMain.luminance() - cSec.luminance() > 0.2 || cSec.luminance() < 0.3) {
					cSec = cSec.luminance(cSec.luminance() + 0.2);
				}
			} else {
				if (cMain.luminance() - cSec.luminance() > 0.2) {
					[cMain, cSec] = [cSec, cMain];
				}
				if (cMain.luminance() - cSec.luminance() > 0.2 || cMain.luminance() > 0.5) {
					cMain = cMain.luminance(cMain.luminance() - 0.1);
				}
				if (cSec.luminance() < 0.5) {
					if (cSec.hsv()[1] < 0.1 && cMain.luminance() > 0.2) {
						cSec = cSec.luminance(cSec.luminance() - 0.1);
					} else {
						cSec = cSec.luminance(cSec.luminance() + 0.1);
					}
					if (Math.abs(cMain.luminance() - cSec.luminance()) < 0.3) {
						cMain = cMain.luminance(cMain.luminance() + (cMain.luminance() > 0.3 ? 0.1 : - 0.1));
						cSec = cSec.luminance(cSec.luminance() + (cSec.luminance() > 0.3 ? 0.1 : -0.1));
					}
				}
				if (Chroma.deltaE(cMain, cSec) < 15) {
					const lum = cMain.luminance();
					cMain = lum > 0.01
						? cMain.luminance(Math.min(lum * 1 / 2, lum - 0.1))
						: cMain.luminance(Math.max(lum * 3 / 2, lum + 0.1));
					if (cMain.get('hsl.s') > 0.3) { cMain = cMain.desaturate(2); }
				}
			}
			main = cMain.android();
			if (main === -1) { main = 4294967295; }
			sec = cSec.android();
			if (sec === -1) { sec = 4294967295; }
		} else {
			let cMain = Chroma(main);
			let cSec = Chroma(sec);
			if (cMain.hsv()[1] - cSec.hsv()[1] > 0.2) {
				[cMain, cSec] = [cSec, cMain];
				if (cMain.luminance() - cSec.luminance() > 0.4) {
					[cMain, cSec] = [cSec, cMain];
				} else if (cMain.luminance() - cSec.luminance() > 0.2 || cSec.luminance() < 0.3) {
					cSec = cSec.luminance(cSec.luminance() + 0.2).saturate(10);
				}
			} else {
				if (cMain.luminance() - cSec.luminance() > 0.2) {
					[cMain, cSec] = [cSec, cMain];
				}
				if (cMain.luminance() - cSec.luminance() > 0.2 || cMain.luminance() > 0.5) {
					cMain = cMain.luminance(cMain.luminance() - 0.1);
				}
				if (cSec.luminance() < 0.5) {
					if (cSec.hsv()[1] < 0.1 && cMain.luminance() > 0.2) {
						cSec = cSec.luminance(cSec.luminance() - 0.1);
					} else {
						cSec = cSec.luminance(cSec.luminance() + 0.1).saturate(20);
					}
					if (Math.abs(cMain.luminance() - cSec.luminance()) < 0.3) {
						cMain = cMain.luminance(cMain.luminance() + (cMain.luminance() > 0.3 ? 0.1 : - 0.1));
						cSec = cSec.luminance(cSec.luminance() + (cSec.luminance() > 0.3 ? 0.1 : -0.1));
					}
				}
				if (Chroma.deltaE(cMain, cSec) < 15) {
					const lum = cMain.luminance();
					cMain = lum > 0.01
						? cMain.luminance(Math.min(lum * 1 / 2, lum - 0.1))
						: cMain.luminance(Math.max(lum * 3 / 2, lum + 0.1));
					if (cMain.get('hsl.s') > 0.3) { cMain = cMain.desaturate(2); }
				}
			}
			main = cMain.android();
			if (main === -1) { main = 4294967295; }
			sec = cSec.android();
			if (sec === -1) { sec = 4294967295; }
		}
	}
	return {
		main,
		sec,
		note,
		mainAlt: blendColors(main, Chroma.contrast(note, bgColor) > 2 ? note : bgColor, 0.5),
		secAlt: blendColors(sec, Chroma.contrast(note, bgColor) > 2 ? note : bgColor, 0.5),
	};
}