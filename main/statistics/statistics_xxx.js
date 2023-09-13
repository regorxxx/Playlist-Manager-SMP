'use strict';
//13/09/23

include('statistics_xxx_helper.js');
include('..\\..\\helpers\\popup_xxx.js');
include('..\\..\\helpers\\helpers_xxx_UI_flip.js');
const Chroma = require('..\\helpers-external\\chroma.js-2.4.0\\chroma'); // Relative to helpers folder

function _chart({
				data /* [[{x, y}, ...]]*/,
				dataAsync = null, /* function returning a promise or promise, resolving to data, see above*/
				colors = [/* rgbSerie1, ... */],
				chroma = {/* scheme, colorBlindSafe */}, // diverging, qualitative, sequential, random or [color, ...] see https://vis4.net/chromajs/#color-scales
				graph = {/* type, borderWidth, point */},
				dataManipulation = {/* sort, filter, slice, distribution , probabilityPlot*/},
				background = {/* color, image*/},
				grid = {x: {/* show, color, width */}, y: {/* ... */}},
				axis = {x: {/* show, color, width, ticks, labels, key, singleLabels, bAltLabels/}, y: {/* ... */}}, // singleLabels & bAltLabels only for X axis
				margin = {/* left, right, top, bottom */}, 
				x = 0,
				y = 0,
				w = window.Width,
				h = window.Height,
				title,
				gFont = _gdiFont('Segoe UI', _scale(10)),
				tooltipText = '',
				configuration = {/* bLoadAsyncData: true , bAltVerticalText: false, bPopupBackground: false */}
		} = {}) {
	// Global tooltip
	this.tooltip = new _tt(null);
	
	/*
		Paint
	*/
	this.paintBg = (gr) => {
		if (this.background.imageGDI) {
			gr.DrawImage(this.background.imageGDI, this.x, this.y, this.w, this.h, 0, 0, this.w, this.h);
		} else if (this.background.color !== null) {
			gr.FillSolidRect(this.x, this.y, this.w, this.h, this.background.color);
		}
	};
	
	this.paintScatter = (gr, serie, i, x, y, w, h, maxY, tickW) => {
		// Antialias for lines use gr.SetSmoothingMode(4) before calling
		const selBar = this.graph.borderWidth * 2;
		let valH;
		const borderColor = RGBA(...toRGB(invert(this.colors[i], true)), getBrightness(...toRGB(this.colors[i])) < 50 ? 300 : 25);
		serie.forEach((value, j) => {
			valH = value.y / maxY * (y - h);
			const xPoint = x + j * tickW;
			const yPoint = y - valH;
			const bFocused = this.currPoint[0] === i && this.currPoint[1] === j;
			if (bFocused) {
				gr.FillSolidRect(xPoint - selBar / 2, yPoint, selBar, valH, borderColor)
			}
			if (!this.graph.point || this.graph.point.toLowerCase() === 'circle') {
				this.dataCoords[i][j] = {x: xPoint, y: yPoint -  this.graph.borderWidth / 2, w: selBar, h: valH};
				const paintPoint = (color) => {
					gr.DrawEllipse(xPoint - this.graph.borderWidth / 2, yPoint - this.graph.borderWidth / 2, this.graph.borderWidth, this.graph.borderWidth, this.graph.borderWidth, color);
				};
				paintPoint(this.colors[i]);
				if (bFocused) {paintPoint(borderColor);}
			} else if (this.graph.point.toLowerCase() === 'circumference') {
				this.dataCoords[i][j] = {x: xPoint, y: yPoint -  this.graph.borderWidth / 2, w: selBar, h: valH};
				const paintPoint = (color) => {
					gr.DrawEllipse(xPoint - this.graph.borderWidth * 2 / 3, yPoint - this.graph.borderWidth  * 2 / 3, this.graph.borderWidth * 4 / 3, this.graph.borderWidth * 4 / 3, this.graph.borderWidth / 2, color);
				};
				paintPoint(this.colors[i]);
				if (bFocused) {paintPoint(borderColor);}
			} else if (this.graph.point.toLowerCase() === 'cross') {
				this.dataCoords[i][j] = {x: xPoint, y: yPoint -  this.graph.borderWidth, w: selBar, h: valH};
				const paintPoint = (color) => {
					gr.DrawLine(xPoint - this.graph.borderWidth, yPoint - this.graph.borderWidth, xPoint + this.graph.borderWidth, yPoint + this.graph.borderWidth, this.graph.borderWidth / 2, color);
					gr.DrawLine(xPoint - this.graph.borderWidth, yPoint + this.graph.borderWidth, xPoint + this.graph.borderWidth, yPoint - this.graph.borderWidth, this.graph.borderWidth / 2, color);
				};
				paintPoint(this.colors[i]);
				if (bFocused) {paintPoint(borderColor);}
			} else if (this.graph.point.toLowerCase() === 'plus') {
				this.dataCoords[i][j] = {x: xPoint, y: yPoint -  this.graph.borderWidth, w: selBar, h: valH};
				const paintPoint = (color) => {
					gr.DrawLine(xPoint - this.graph.borderWidth, yPoint, xPoint + this.graph.borderWidth, yPoint, this.graph.borderWidth / 2, color);
					gr.DrawLine(xPoint, yPoint + this.graph.borderWidth, xPoint, yPoint - this.graph.borderWidth, this.graph.borderWidth / 2, color);
				};
				paintPoint(this.colors[i]);
				if (bFocused) {paintPoint(borderColor);}
			} else if (this.graph.point.toLowerCase() === 'triangle') {
				this.dataCoords[i][j] = {x: xPoint, y: yPoint -  this.graph.borderWidth, w: selBar, h: valH};
				const paintPoint = (color) => {
					gr.DrawLine(xPoint - this.graph.borderWidth, yPoint + this.graph.borderWidth, xPoint + this.graph.borderWidth, yPoint + this.graph.borderWidth, this.graph.borderWidth / 2, color);
					gr.DrawLine(xPoint - this.graph.borderWidth, yPoint + this.graph.borderWidth, xPoint + this.graph.borderWidth / 8, yPoint - this.graph.borderWidth, this.graph.borderWidth / 2, color);
					gr.DrawLine(xPoint + this.graph.borderWidth, yPoint + this.graph.borderWidth, xPoint - this.graph.borderWidth / 8, yPoint - this.graph.borderWidth, this.graph.borderWidth / 2, color);
				};
				paintPoint(this.colors[i]);
				if (bFocused) {paintPoint(borderColor);}
			}
		});
	};
	
	this.paintLines = (gr, serie, i, x, y, w, h, maxY, tickW, last) => {
		// Antialias for lines use gr.SetSmoothingMode(4) before calling
		const selBar = tickW;
		// Values
		let valH;
		const borderColor = RGBA(...toRGB(invert(this.colors[i], true)), getBrightness(...toRGB(this.colors[i])) < 50 ? 300 : 25);
		serie.forEach((value, j) => {
			valH = value.y / maxY * (y - h);
			const xPoint = x + j * tickW;
			const yPoint = y - valH;
			const bFocused = this.currPoint[0] === i && this.currPoint[1] === j;
			this.dataCoords[i][j] = {x: j > 0 ? xPoint - selBar / 2 : xPoint, y: yPoint, w: (j > 0 && j !== last ? selBar : selBar / 2), h: valH};
			const point = this.dataCoords[i][j];
			if (bFocused) {
				gr.FillSolidRect(point.x, point.y, point.w, point.h, borderColor)
			}
			if (j !== 0) {
				const paintPoint = (color) => {
					const newValH = serie[j - 1].y / maxY * (y - h);
					const newXPoint = x + (j - 1) * tickW;
					const newYPoint = y - newValH;
					gr.DrawLine(newXPoint, newYPoint, xPoint, yPoint, this.graph.borderWidth, color);
				};
				paintPoint(this.colors[i]);
				if (bFocused) {paintPoint(borderColor);}
			}
		});
	};
	
	this.paintBars = (gr, serie, i, x, y, w, h, maxY, tickW, barW) => {
		// Antialias for lines use gr.SetSmoothingMode(4) before calling
		// Values
		const xValues = x + i * barW;
		let valH;
		const borderColor = RGBA(...toRGB(invert(this.colors[i], true)), getBrightness(...toRGB(this.colors[i])) < 50 ? 300 : 25);
		serie.forEach((value, j) => {
			valH = value.y / maxY * (y - h);
			const xPoint = xValues + j * tickW;
			const yPoint = y - valH;
			const bFocused = this.currPoint[0] === i && this.currPoint[1] === j;
			this.dataCoords[i][j] = {x: xPoint, y: yPoint, w: barW, h: valH};
			const point = this.dataCoords[i][j];
			gr.FillSolidRect(point.x, point.y, point.w, point.h, this.colors[i]);
			if (bFocused) {gr.FillSolidRect(point.x, point.y, point.w, point.h, borderColor);}
			// Borders
			if (this.graph.borderWidth) {
				gr.DrawRect(point.x, point.y, point.w, point.h, this.graph.borderWidth, borderColor);
			}
		});
	};
	
	this.paintPie = (gr, serie, i, x, y, w, h, maxY, r) => {
		// Antialias for lines use gr.SetSmoothingMode(4) before calling
		// Values
		let valH;
		let circleArr = [];
		const labelCoord = [];
		const c = {x:  x + (w - x) / 2, y: (y + h) / 2};
		const ticks = r * 2 * Math.PI;
		let iY, iX;
		for (let j = 0; j < ticks; j++) {
			iY = r * Math.sin(2 * Math.PI / ticks * j)
			iX = r * Math.cos(2 * Math.PI / ticks * j)
			circleArr.push(c.x + iX, c.y + iY);
		}
		gr.FillPolygon(invert(this.background.color, true), 0, circleArr);
		let alpha = 0;
		serie.forEach((value, j, thisSerie) => {
			const borderColor = RGBA(...toRGB(invert(this.colors[i][j], true)), getBrightness(...toRGB(this.colors[i][j])) < 50 ? 300 : 25);
			const bFocused = this.currPoint[0] === i && this.currPoint[1] === j;
			circleArr = [...Object.values(c)];
			const sumY = thisSerie.reduce((acc, val) => acc + val.y, 0);
			const perc = value.y / sumY;
			const sliceTicks = perc * ticks;
			const iAlpha = 2 * Math.PI * perc;
			for (let h = 0; h < sliceTicks; h++) {
				iY = r * Math.sin(alpha + iAlpha / sliceTicks * h)
				iX = r * Math.cos(alpha + iAlpha / sliceTicks * h)
				circleArr.push(c.x + iX, c.y + iY);
			}
			if (circleArr.length) {
				gr.FillPolygon(this.colors[i][j], 0, circleArr);
				if (bFocused) {gr.FillPolygon(borderColor, 0, circleArr);}
				// Borders
				if (this.graph.borderWidth) {
					gr.DrawPolygon(borderColor, this.graph.borderWidth, circleArr);
				}
			}
			circleArr.push(... Object.values(c));
			alpha += iAlpha;
			this.dataCoords[i][j] = {c: {...c}, r1: 0, r2: r, alpha1: alpha - iAlpha, alpha2: alpha};
			labelCoord.push({from: {...c}, to: {x: c.x + iX, y: c.y + iY}, val: perc * 100, alpha});
		});
		return labelCoord;
	};
	
	this.paintDoughnut = (gr, serie, i, x, y, w, h, maxY, r, rInner) => {
		// Antialias for lines use gr.SetSmoothingMode(4) before calling
		// Values
		let valH;
		let circleArr = [];
		const labelCoord = [];
		const c = {x:  x + (w - x)/ 2, y: (y + h) / 2};
		const ticks = r * 2 * Math.PI;
		let iY, iX;
		let alpha = 0;
		serie.forEach((value, j, thisSerie) => {
			const borderColor = RGBA(...toRGB(invert(this.colors[i][j], true)), getBrightness(...toRGB(this.colors[i][j])) < 50 ? 300 : 25);
			const bFocused = this.currPoint[0] === i && this.currPoint[1] === j;
			circleArr = [];
			const sumY = thisSerie.reduce((acc, val) => acc + val.y, 0);
			const perc = value.y / sumY;
			const sliceTicks = perc * ticks;
			const iAlpha = 2 * Math.PI * perc;
			for (let h = 0; h < sliceTicks; h++) {
				iY = rInner * Math.sin(alpha + iAlpha / sliceTicks * h)
				iX = rInner * Math.cos(alpha + iAlpha / sliceTicks * h)
				circleArr.push(c.x + iX, c.y + iY);
			}
			for (let h = sliceTicks; h > 0; h--) {
				iY = r * Math.sin(alpha + iAlpha / sliceTicks * h)
				iX = r * Math.cos(alpha + iAlpha / sliceTicks * h)
				circleArr.push(c.x + iX, c.y + iY);
			}
			if (circleArr.length) {
				gr.FillPolygon(this.colors[i][j], 0, circleArr);
				if (bFocused) {gr.FillPolygon(borderColor, 0, circleArr);}
				// Borders
				if (this.graph.borderWidth) {
					gr.DrawPolygon(borderColor, this.graph.borderWidth, circleArr);
				}
			}
			circleArr.push(... Object.values(c));
			alpha += iAlpha;
			this.dataCoords[i][j] = {c: {...c}, r1: 0, r2: r, alpha1: alpha - iAlpha, alpha2: alpha};
			labelCoord.push({from: {...c}, to: {x: c.x + iX, y: c.y + iY}, val: perc * 100, alpha});
		});
		return labelCoord;
	};
	
	this.paintGraph = (gr) => {
		this.dataCoords = this.dataDraw.map((serie) => {return [];});
		let x, y, w, h, xOffsetKey, yOffsetKey;
		
		// Max Y value for all series
		let maxY = 0, minY = 0;
		this.dataDraw.forEach((serie) => {
			serie.forEach((value) => {
				if (value.y > maxY) {maxY = value.y;}
				if (value.y < minY) {minY = value.y;}
			});
		});
		this.stats.maxY = maxY;
		this.stats.minY = minY;
		// Ticks
		const ticks = this.steps(0, maxY, this.axis.y.ticks === 'auto' ? void(0) : Number(this.axis.y.ticks));
		const tickText = ticks.map((tick) => {return this.nFormatter(tick, 1);});
		// Retrieve all different label on all series
		const xAsisValues = new Set();
		this.dataDraw.forEach((serie) => {
			serie.forEach((value) => {xAsisValues.add(value.x);});
		});
		const labelOver = {coord: []}; // For pie Graphs
		/*
			Draw for all graphs
		*/
		w = this.w - this.margin.right;
		h = this.y + this.margin.top;
		x = this.x + this.margin.leftAuto;
		y = this.h - this.margin.bottom;
		xOffsetKey = 0;
		yOffsetKey = 0;
		switch (this.graph.type) {
			case 'doughnut':
			case 'pie': 
				// XY Titles
				if (this.axis.x.show && this.axis.x.key.length && this.axis.x.showKey) {
					yOffsetKey = gr.CalcTextHeight(this.axis.x.key, this.gFont) + _scale(2);
					y -= yOffsetKey;
				}
				if (this.axis.y.show && this.axis.y.key.length && this.axis.y.showKey) {
					xOffsetKey = gr.CalcTextHeight(this.axis.y.key, this.gFont) + _scale(2);
					x += xOffsetKey;
					w -= xOffsetKey;
				}
				break;
			default:
				// XY Titles
				if (this.axis.x.show && this.axis.x.key.length && this.axis.x.showKey) {
					yOffsetKey = gr.CalcTextHeight(this.axis.x.key, this.gFont) + _scale(2);
					y -= yOffsetKey;
				}
				if (this.axis.y.show && this.axis.y.key.length && this.axis.y.showKey) {
					xOffsetKey = gr.CalcTextHeight(this.axis.y.key, this.gFont) + _scale(2);
					x += xOffsetKey;
					w -= xOffsetKey;
				}
				// Ticks
				if (this.axis.y.show && this.axis.y.labels) {
					tickText.forEach((tick) => {
						const yTickW = gr.CalcTextWidth(tick, this.gFont) + this.axis.y.width / 2 + _scale(4);
						if (this.margin.leftAuto <= yTickW) {this.margin.leftAuto += this.margin.left; x += this.margin.left;}
					});
				}
				// XY Axis
				if (this.axis.x.show) {
					gr.DrawLine(x, y - this.axis.x.width / 2, x + w - this.margin.leftAuto, y - this.axis.x.width / 2, this.axis.x.width, this.axis.x.color);
				}
				if (this.axis.y.show) {
					gr.DrawLine(x, y, x, h, this.axis.y.width, this.axis.y.color);
				}
		}
		x += this.axis.x.width / 2;
		w -= this.axis.y.width / 2;
		y -= this.axis.y.width;
		let tickW, barW, offsetTickText = 0;
		switch (this.graph.type) {
			case 'lines': {
				x -= this.axis.x.width * 1/2;
				tickW = (w - this.margin.leftAuto) / ((xAsisValues.size - 1) || 1);
				barW = 0;
				offsetTickText = - tickW / 2;
				// Values
				const last = xAsisValues.size - 1;
				gr.SetSmoothingMode(4); // Antialias for lines
				this.dataDraw.forEach((serie, i) => {
					this.paintLines(gr, serie, i, x, y, w, h, maxY, tickW, last);
				});
				gr.SetSmoothingMode(0);
				break;
			}
			case 'scatter': {
				x -= this.axis.x.width * 1/2;
				tickW = (w - this.margin.leftAuto) / ((xAsisValues.size - 1) || 1);
				barW = 0;
				offsetTickText = - tickW/ 2;
				// Values
				gr.SetSmoothingMode(4); // Antialias for lines
				this.dataDraw.forEach((serie, i) => {
					this.paintScatter(gr, serie, i, x, y, w, h, maxY, tickW);
				});
				gr.SetSmoothingMode(0);
				break;
			}
			case 'q-q plot':
			case 'p-p plot': { // Mixes scatter and lines (last serie)
				x -= this.axis.x.width * 1/2;
				tickW = (w - this.margin.leftAuto) / ((xAsisValues.size - 1) || 1);
				barW = 0;
				offsetTickText = - tickW / 2;
				// Values
				const last = xAsisValues.size - 1;
				gr.SetSmoothingMode(4); // Antialias for lines
				const len = this.dataDraw.length - 1;
				if (len > 0) { // Paint first the line, then the points
					this.paintLines(gr, this.dataDraw[len], len, x, y, w, h, maxY, tickW, last);
					for (let i = 0; i < len; i++) {
						const serie = this.dataDraw[i];
						this.paintScatter(gr, serie, i, x, y, w, h, maxY, tickW);
					}
				}
				gr.SetSmoothingMode(0);
				break;
			}
			case 'pie': {
				x -= this.axis.x.width * 1/2;
				tickW = Math.min((w - this.margin.leftAuto) / 2, (y - h - this.margin.top - this.margin.bottom) / 2);
				barW = 0;
				offsetTickText = - tickW/ 2;
				// Values
				gr.SetSmoothingMode(4); // Antialias for lines
				const series = this.dataDraw.length;
				this.dataDraw.forEach((serie, i) => {
					const r = tickW * (series - i) / series;
					const serieCoord = this.paintPie(gr, serie, i, x, y, w, h, maxY, r);
					labelOver.coord.push([{from: {x: x + (w - x) / 2, y: (y + h) / 2}, to: {x: x + (w - x) / 2 + r, y: (y + h) / 2}, val: void(0), alpha: 0}, ...serieCoord]);
					this.dataCoords[i].forEach((point) => {point.r1 = (series - i - 1) / series * r;});
				});
				labelOver.r = tickW;
				gr.SetSmoothingMode(0);
				break;
			}
			case 'doughnut': {
				x -= this.axis.x.width * 1/2;
				tickW = Math.min((w - this.margin.leftAuto) / 2, (y - h - this.margin.top - this.margin.bottom) / 2);
				barW = 0;
				offsetTickText = - tickW/ 2;
				// Values
				gr.SetSmoothingMode(4); // Antialias for lines
				const series = this.dataDraw.length + 1;
				this.dataDraw.forEach((serie, i) => {
					const r1 = tickW * (series - i) / series;
					const r2 = tickW * (series - i - 1) / series;
					const serieCoord = this.paintDoughnut(gr, serie, i, x, y, w, h, maxY, r1, r2);
					labelOver.coord.push([{from: {x: x + (w - x) / 2, y: (y + h) / 2}, to: {x: x + (w - x) / 2 + r1, y: (y + h) / 2}, val: void(0), alpha: 0}, ...serieCoord]);
					this.dataCoords[i].forEach((point) => {point.r1 = (series - i - 1) / series * r1;});
				});
				labelOver.r = tickW;
				gr.SetSmoothingMode(0);
				break;
			}
			case 'bars':
			default: {
				tickW = (w - this.margin.leftAuto) / xAsisValues.size;
				barW = tickW / this.series;
				// Values
				this.dataDraw.forEach((serie, i) => {
					this.paintBars(gr, serie, i, x, y, w, h, maxY, tickW, barW);
				});
			}
		}
		
		/*
			Draw for all graphs
		*/
		switch (this.graph.type) {
			case 'doughnut':
			case 'pie':
				// Y Axis ticks
				if (this.axis.y.show || this.axis.x.show) {
					if (this.axis.y.labels || this.axis.x.labels) {
						const series = this.dataDraw.length + (this.graph.type === 'doughnut' ? 1 : 0);
						this.dataDraw.forEach((serie, i) => {
							const labels = labelOver.coord[i];
							let prevLabel = labels[0];
							labels.slice(1).forEach((label, j) => {
								const tetha = (label.alpha - prevLabel.alpha) / 2 + prevLabel.alpha;
								if (this.axis.y.labels) { // Value labels
									const labelText = round(label.val, 0) + '%';
									const tickH = gr.CalcTextHeight(labelText, this.gFont);
									const tickW = gr.CalcTextWidth(labelText, this.gFont);
									const centroid = labelOver.r / series * ((series - (i + 1))/2 + (series - i)/2);
									const yTickText = label.from.y + centroid * Math.sin(tetha) - tickH / 2;
									const xTickText = label.from.x + centroid * Math.cos(tetha) - tickW / 2;
									const flags = DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
									gr.GdiDrawText(labelText, this.gFont, this.axis.y.color, xTickText, yTickText, tickW, tickH, flags);
								}
								if (this.axis.x.labels && i === 0 || !this.axis.x.singleLabels) { // keys
									const labelText = [...xAsisValues][j];
									const tickH = gr.CalcTextHeight(labelText, this.gFont);
									const tickW = gr.CalcTextWidth(labelText, this.gFont);
									const border = labelOver.r / series * (series - i);
									const yTickText = label.from.y + (border + tickH /2) * Math.sin(tetha) - tickH / 2;
									const xTickText = label.from.x + (border + tickW) * Math.cos(tetha) - tickW / 2;
									const flags = DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
									const borderColor = RGBA(...toRGB(invert(this.colors[i][j], true)), 150);
									const offsetR = Math.max(Math.max(xTickText + tickW + _scale(2) + this.margin.right / 3, w) - w - x, 0);
									const offsetL = Math.max(Math.max(xTickText, this.x + _scale(2) + this.margin.left / 3) - xTickText, 0);
									// Lines to labels
									if (this.axis.x.bAltLabels) {
										const centroid = labelOver.r / series * ((series - (i + 1))/2 + (series - i)/2); // Set to zero to draw from center
										const centerX = label.from.x + centroid * Math.cos(tetha);
										const centerY = label.from.y + centroid * Math.sin(tetha); 
										const borderX = xTickText - _scale(2) - offsetR + offsetL;
										gr.DrawEllipse(centerX, centerY, 1, 1, 4, borderColor)
										const anchorX = (borderX < centerX && borderX + tickW > centerX)
											? centerX
											: (borderX > label.from.x ? Math.min : Math.max)(borderX, borderX + tickW / 2);
										const anchorY = (yTickText < centerY && yTickText + tickH > centerY)
											? centerY
											: (yTickText > label.from.y ? Math.min : Math.max)(yTickText, yTickText + tickH);
										gr.DrawLine(label.from.x + centroid * Math.cos(tetha), label.from.y + centroid * Math.sin(tetha), anchorX, anchorY, this.graph.borderWidth, borderColor);
									}
									// Labels
									gr.FillSolidRect(xTickText - _scale(2) - offsetR + offsetL, yTickText, tickW + _scale(4), tickH, borderColor);
									gr.GdiDrawText(labelText, this.gFont, this.colors[i][j], xTickText - offsetR + offsetL, yTickText, tickW, this.h, flags);
								}
								prevLabel = label;
							});
						});
					}
					if (this.axis.y.key.length && this.axis.y.showKey && labelOver.coord.length) {
						const key = this.configuration.bAltVerticalText ? this.axis.y.key.flip() : this.axis.y.key;
						const maxTickW = gr.CalcTextWidth(tickText[tickText.length - 1], this.gFont);
						const keyW = gr.CalcTextWidth(key, this.gFont);
						const keyH = gr.CalcTextHeight(key, this.gFont);
						if (this.configuration.bAltVerticalText) { // Flip chars
							gr.SetTextRenderingHint(TextRenderingHint.ClearTypeGridFit);
							gr.DrawString(key, this.gFont, this.axis.y.color, labelOver.coord[0][0].from.x - labelOver.r - keyH * 2 , this.y + (this.h - this.y) / 2 - keyW*2/3, w, this.h, StringFormatFlags.DirectionVertical);
							gr.SetTextRenderingHint(TextRenderingHint.SystemDefault);
						} else { // Draw vertical text in 2 passes, with different rendering hinting and alpha channel to enhance readability
							const img = gdi.CreateImage(keyW, keyH);
							const _gr = img.GetGraphics();
							_gr.SetTextRenderingHint(TextRenderingHint.SingleBitPerPixelGridFit);
							_gr.DrawString(key, this.gFont, RGBA(...toRGB(this.axis.y.color), 200), 0 ,0, keyW, keyH, StringFormatFlags.NoWrap);
							_gr.SetTextRenderingHint(TextRenderingHint.AntiAliasGridFit);
							_gr.DrawString(key, this.gFont, RGBA(...toRGB(this.axis.y.color), 123), 0 ,0, keyW, keyH, StringFormatFlags.NoWrap);
							img.RotateFlip(RotateFlipType.Rotate90FlipXY)
							img.ReleaseGraphics(_gr);
							gr.SetInterpolationMode(InterpolationMode.NearestNeighbor);
							gr.DrawImage(img, labelOver.coord[0][0].from.x - labelOver.r - keyH * 2, this.y + (this.h - this.y) / 2 - keyW * 2/3, keyH, keyW, 0, 0, img.Width, img.Height);
							gr.SetInterpolationMode(InterpolationMode.Default);
						}
					}
				}
				// X Axis ticks
				if (this.axis.x.show) {
					if (this.axis.x.key.length && this.axis.x.showKey && labelOver.coord.length) {
						const keyW = gr.CalcTextWidth(this.axis.x.key, this.gFont);
						gr.GdiDrawText(this.axis.x.key, this.gFont, this.axis.x.color, labelOver.coord[0][0].from.x - keyW/2, y + this.axis.x.width, keyW, this.h, DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX);
					}
				}
				break;
			case 'bars':
				if (this.axis.x.show && this.axis.x.labels && this.axis.x.bAltLabels) {
					if (w / tickW < 30) { // Don't paint labels when they can't be fitted properly
						[...xAsisValues].forEach((valueX,  i) => {
							const xLabel= x + i * tickW;
							valueX = this.configuration.bAltVerticalText ? valueX.flip() : valueX;
							const xTickW = gr.CalcTextWidth(valueX, this.gFont);
							if (this.configuration.bAltVerticalText) { // Flip chars
								gr.SetTextRenderingHint(TextRenderingHint.ClearTypeGridFit);
								gr.DrawString(valueX, this.gFont, this.axis.x.color, xLabel, y - xTickW - this.axis.x.width, tickW, this.h, StringFormatFlags.DirectionVertical);
								gr.SetTextRenderingHint(TextRenderingHint.SystemDefault);
							} else {
								const keyH = gr.CalcTextHeight(valueX, this.gFont);
								const img = gdi.CreateImage(xTickW, keyH);
								const _gr = img.GetGraphics();
								_gr.SetTextRenderingHint(TextRenderingHint.SingleBitPerPixelGridFit);
								_gr.DrawString(valueX, this.gFont, RGBA(...toRGB(this.axis.x.color), 255), 0 ,0, xTickW, keyH, StringFormatFlags.NoWrap);
								_gr.SetTextRenderingHint(TextRenderingHint.AntiAliasGridFit);
								_gr.DrawString(valueX, this.gFont, RGBA(...toRGB(this.axis.x.color), 123), 0 ,0, xTickW, keyH, StringFormatFlags.NoWrap);
								img.RotateFlip(RotateFlipType.Rotate90FlipXY)
								img.ReleaseGraphics(_gr);
								gr.SetInterpolationMode(InterpolationMode.NearestNeighbor);
								gr.DrawImage(img, xLabel, y - xTickW - this.axis.x.width, keyH, xTickW, 0, 0, img.Width, img.Height);
								gr.SetInterpolationMode(InterpolationMode.Default);
							}
						});
					}
				}
			default:
				// Y Axis ticks
				if (this.axis.y.show) {
					ticks.forEach((tick, i) => {
						const yTick = y - tick / maxY * (y - h) || y;
						if (yTick < 0) {return;}
						const tickH = gr.CalcTextHeight(tickText[i], this.gFont);
						const yTickText = yTick - tickH / 2;
						if (yTickText < 0) {return;}
						gr.DrawLine(x - this.axis.x.width * 2, yTick, x + this.axis.x.width, yTick, this.axis.y.width / 2, this.axis.y.color);
						if (this.axis.y.labels) {
							const flags = DT_RIGHT | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
							gr.GdiDrawText(tickText[i], this.gFont, this.axis.y.color, this.x - this.axis.y.width / 2 - _scale(4) + xOffsetKey, yTickText, this.margin.leftAuto, tickH, flags);
						}
					});
					if (this.axis.y.key.length && this.axis.y.showKey) {
						const key = this.configuration.bAltVerticalText ? this.axis.y.key.flip() : this.axis.y.key;
						const maxTickW = gr.CalcTextWidth(tickText[tickText.length - 1], this.gFont);
						const keyW = gr.CalcTextWidth(key, this.gFont);
						const keyH = gr.CalcTextHeight(key, this.gFont);
						if (this.configuration.bAltVerticalText) { // Flip chars
							gr.SetTextRenderingHint(TextRenderingHint.ClearTypeGridFit);
							gr.DrawString(key, this.gFont, this.axis.y.color, x - yOffsetKey - maxTickW - _scale(4), this.y + (this.h - this.y) / 2 - keyW/2, w, this.h, StringFormatFlags.DirectionVertical);
							gr.SetTextRenderingHint(TextRenderingHint.SystemDefault);
						} else { // Draw vertical text in 2 passes, with different rendering hinting and alpha channel to enhance readability
							const img = gdi.CreateImage(keyW, keyH);
							const _gr = img.GetGraphics();
							_gr.SetTextRenderingHint(TextRenderingHint.SingleBitPerPixelGridFit);
							_gr.DrawString(key, this.gFont, RGBA(...toRGB(this.axis.y.color), 200), 0 ,0, keyW, keyH, StringFormatFlags.NoWrap);
							_gr.SetTextRenderingHint(TextRenderingHint.AntiAliasGridFit);
							_gr.DrawString(key, this.gFont, RGBA(...toRGB(this.axis.y.color), 123), 0 ,0, keyW, keyH, StringFormatFlags.NoWrap);
							img.RotateFlip(RotateFlipType.Rotate90FlipXY)
							img.ReleaseGraphics(_gr);
							gr.SetInterpolationMode(InterpolationMode.NearestNeighbor);
							gr.DrawImage(img, x - yOffsetKey - maxTickW - _scale(5), this.y + (this.h - this.y) / 2 - keyW/2, keyH, keyW, 0, 0, img.Width, img.Height);
							gr.SetInterpolationMode(InterpolationMode.Default);
						}
					}
				}
				// X Axis ticks
				if (this.axis.x.show) {
					if (w / tickW < 30) { // Don't paint labels when they can't be fitted properly
						const last = xAsisValues.size - 1;
						[...xAsisValues].forEach((valueX,  i) => {
							const xLabel= x + i * tickW;
							if (this.axis.x.labels && this.graph.type !== 'bars' || !this.axis.x.bAltLabels) {
								if (i === 0 && offsetTickText) { // Fix for first label position
									const xTickW = gr.CalcTextWidth(valueX, this.gFont);
									const flags = DT_LEFT | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
									const zeroW = xLabel + offsetTickText + tickW - this.x - this.margin.leftAuto / 2;
									gr.GdiDrawText(valueX, this.gFont, this.axis.x.color, this.x + this.margin.leftAuto / 2 + xOffsetKey, y + this.axis.y.width, zeroW, this.h, flags);
								} else if (i === last) { // Fix for last label position
									const lastW = xLabel + offsetTickText + tickW > w - this.margin.right ? this.x + w - (xLabel + offsetTickText) + this.margin.right : tickW;
									const flags = DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
									gr.GdiDrawText(valueX, this.gFont, this.axis.x.color, xLabel + offsetTickText + xOffsetKey, y + this.axis.y.width, lastW - xOffsetKey, this.h, flags);
								} else {
									const flags = DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
									gr.GdiDrawText(valueX, this.gFont, this.axis.x.color, xLabel + offsetTickText, y + this.axis.y.width, tickW, this.h, flags);
								}
							}
							const xLine = xLabel + barW;
							gr.DrawLine(xLine, y + this.axis.x.width * 2, xLine, y - this.axis.x.width, this.axis.x.width / 2, this.axis.x.color);
						});
					}
					if (this.axis.x.key.length && this.axis.x.showKey) {
						const offsetH = this.axis.x.labels ? gr.CalcTextHeight('A', this.gFont) : 0;
						gr.GdiDrawText(this.axis.x.key, this.gFont, this.axis.x.color, x, y + this.axis.x.width + offsetH, w, this.h, DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX);
					}
				}
				// Grid
				if (this.grid.y.show) {
					ticks.forEach((tick, i) => {
						const yTick = y - tick / maxY * (y - h);
						const flags = DT_RIGHT | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
						gr.DrawLine(x, yTick, w, yTick, this.grid.y.width, this.grid.y.color);
					});
				}
				if (this.grid.x.show) {
					[...xAsisValues].forEach((tick, i) => {
						const flags = DT_RIGHT | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
						const xLine = x + barW + i * tickW;
						gr.DrawLine(xLine, y - this.grid.y.width, xLine, h, this.grid.x.width, this.grid.x.color);
					});
				}
		}
	};
	
	this.paint = (gr) => {
		if (!window.ID) {return;}
		if (!window.Width || !window.Height) {return;}
		this.paintBg(gr);
		this.paintGraph(gr);
		this.pop.paint(gr);
	};
	
	this.repaint = () => {
		window.RepaintRect(this.x, this.y, this.x + this.w, this.y + this.h);
	}
	
	/*
		Helpers
	*/
	this.steps = (min, max, num = 10) => {
		const len = this.h - this.y - this.margin.bottom - this.margin.top;
		const minSep = Math.round(len / 5);
		if (len / num < minSep) {num = Math.round(len / minSep);}
		const step = Math.floor((max - min) / num);
		return min !== max ? range(min, max, step || 1) : [min]; 
	};
	
	this.randomColor = () => {
		return RGB(Math.round(Math.random() * 255), Math.round(Math.random() * 255), Math.round(Math.random() * 255));
	};
	
	this.chromaColor = (scheme = this.chroma.scheme, len = this.series) => {
		return Chroma.scale(scheme).colors(len, 'rgb').map((arr) => {return RGB(...arr);});
	}
	
	this.nFormatter = (num, digits) => { // Y axis formatter
		const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];
		const tier = Math.log10(Math.abs(num)) / 3 | 0;
		// if zero, we don't need a suffix
		if (tier === 0) {return num;}
		// get suffix and determine scale
		const suffix = SI_SYMBOL[tier];
		const scale = Math.pow(10, tier * 3);
		// scale the number
		const scaled = num / scale;
		// format number and add suffix
		return scaled.toFixed(1) + suffix;
	};
	
	this.cleanPoints = () => {
		this.dataCoords = this.dataDraw.map((serie) => {return [];})
		this.currPoint = [-1, -1];
		this.stats = {maxY: 0, minY: 0};
	};
	
	/*
		Callbacks
	*/
	this.tracePoint = (x, y) => {
		switch (this.graph.type) {
			case 'doughnut':
			case 'pie':
				for (let i = 0;  i < this.series; i++) {
					const serie = this.dataCoords[i];
					const len = serie.length;
					for (let j = 0; j < len; j++) {
						const point = serie[j];
						const xc = x - point.c.x;
						const yc = y - point.c.y;
						const r = (xc**2 + yc**2)**(1/2);
						const phi = xc >= 0 
							? yc >= 0
								? Math.asin(yc/r)
								: Math.asin(yc/r) + 2 * Math.PI
							: -Math.asin(yc/r) + Math.PI;
						if (phi >= point.alpha1 && phi <= point.alpha2 && r >= point.r1 && r <= point.r2) {
							return [i, j];
						}
					}
				}
				break;
			default:
				for (let i = 0;  i < this.series; i++) {
					const serie = this.dataCoords[i];
					const len = serie.length;
					for (let j = 0; j < len; j++) {
						const point = serie[j];
						if (x >= point.x && x <= point.x + point.w && y >= point.y && y <= point.y + point.h) {
							return [i, j];
						}
					}
				}
		}
		return [-1, -1];
	};
	
	this.trace = (x, y) => {
		return (x >= this.x && x <= this.x + this.w && y >= this.y && y <= this.y + this.h);
	};
	
	this.move = (x, y) => {
		if (!window.ID) {return false;}
		if (this.trace(x,y)) {
			if (this.pop.isEnabled()) {this.pop.move(x, y);}
			else {
				const [serie, idx] = this.tracePoint(x, y);
				const bPaint = this.currPoint[0] !== serie || this.currPoint[1] !== idx;
				this.currPoint = [serie, idx];
				if (bPaint) {this.repaint();}
				if (this.currPoint[0] !== -1 && this.currPoint[1] !== -1) {
					const serieData = this.dataDraw[serie];
					const point = serieData[idx];
					const bPercent = this.graph.type === 'doughnut' || this.graph.type === 'pie';
					const percent = bPercent ? Math.round(point.y * 100 / serieData.reduce((acc, point) => acc + point.y, 0)) : null;
					this.tooltip.SetValue(
						point.x + ': ' + point.y + (this.axis.y.key ?  ' ' + this.axis.y.key : '') +
						(bPercent ? ' ' + _p(percent + '%') : '') +
						(this.tooltipText && this.tooltipText.length ? tooltipText : '')
					, true);
					return true;
				} else {
					this.tooltip.SetValue(null);
				}
			}
		}
		this.leave();
		return false;
	};
	
	this.leave = () => {
		if (this.currPoint[0] !== -1 || this.currPoint[1] !== -1) {
			this.currPoint = [-1, -1];
			this.repaint();
			return true;
		}
		return false;
	};
	
	this.initPopup = () => {
		if (!this.pop.isEnabled()) {
			this.pop.enable(true, 'Calculating...', 'Calculating statistics...\nPanel will be disabled during the process.');
		}
	}
	
	/*
		Data manipulation
	*/
	this.sort = () => { // Sort points with user provided function
		if (!this.dataManipulation.sort) {return;}
		this.dataDraw = this.dataDraw.map((serie) => {return serie.sort(this.dataManipulation.sort)});
	};
	
	this.cleanData = () => { // Filter points without valid x or y values
		if (!this.dataDraw) {return;}
		this.dataDraw = this.dataDraw.map((serie) => {return serie.filter((point) => {
				return (point.hasOwnProperty('x') && point.x !== null && point.x !== '' && point.hasOwnProperty('y') && Number.isFinite(point.y));
			});
		});
	};
	
	this.filter = () => { // Filter points with user provided function
		if (!this.dataManipulation.filter) {return;}
		this.dataDraw = this.dataDraw.map((serie) => {return serie.filter(this.dataManipulation.filter)});
	};
	
	this.slice = () => { // Draw only selected points
		const slice = this.dataManipulation.slice;
		if (!slice || !slice.length === 2 || (slice[0] === 0 && slice[1] === Infinity)) {return;}
		// If end is greater than the length of the array, it uses the length of the array
		this.dataDraw = this.dataDraw.map((serie) => {return serie.slice(...this.dataManipulation.slice)});
	};

	this.normal = (bInverse = false) => { // Sort as normal distribution
		this.dataDraw = this.normalApply(this.dataDraw, bInverse);
	};
	
	this.normalApply = (series, bInverse = false) => { // Sort as normal distribution
		const sort = bInverse ? (a, b) => {return b.y - a.y;} : (a, b) => {return a.y - b.y;}
		series = series.map((serie) => {return serie.sort(sort).reduceRight((acc, val, i) => {return i % 2 === 0 ? [...acc, val] : [val, ...acc];}, []);});
		const slice = this.dataManipulation.slice;
		if (!slice || !slice.length === 2 || (slice[0] === 0 && slice[1] === Infinity)) {return series;}
		series = series.map((serie) => {
			const len = serie.length;
			const tail = slice[1];
			const center = Math.round(len / 2) + slice[0];
			const left = Math.max(center - tail, 1);
			const right = center + tail;
			return serie.slice(left - (bInverse ? 2 : 1), right);
		});
		return series;
	};
	
	this.normalInverse = () => { // Tails of normal distribution
		this.normal(true);
	};
	
	this.distribution = (dist = this.dataManipulation.distribution || '') => { // Apply known distributions
		switch (dist.toLowerCase()) {
			case 'normal':
				this.normal();
				return true;
			case 'normal inverse':
				this.normalInverse();
				return true;
			case 'none':
			default: 
				return false;
		}
	};
	
	this.probabilityPlot = (pPlot = this.dataManipulation.probabilityPlot || '') => {
		let bCumulative = false;
		switch (pPlot.toLowerCase()) {
			case 'cdf plot': {bCumulative = true;}
			case 'cumulative distribution plot': {bCumulative = true;}
			case 'distribution plot': {
				let newSerie;
				if (this.series === 1 && this.dataManipulation.distribution) {
					const dist = this.dataManipulation.distribution.toLowerCase();
					if (dist === 'normal inverse') {this.normal();}
					const serie = this.dataDraw[0];
					const total = serie.reduce((curr, val) => {return curr + val.y;}, 0);
					const statistics = this.computeStatistics(serie);
					if (dist === 'normal inverse') {this.normalInverse();}
					console.log(statistics);
					newSerie = new Array(statistics.total).fill(0);
					const fNorm = (x) => Math.exp(-((x - statistics.mean)**2/statistics.sigma**2)/2) / (statistics.sigma * Math.sqrt(2 * Math.PI));
					const fAcumNorm = (x) => 1/2 + fNorm(x) * (x + x**3/3 + x**5/15);
					switch (dist) {
						case 'normal':
							newSerie = newSerie.map((_, i) => {return {x: serie[i].x, y: fNorm(i) * statistics.count};});
							break;
						case 'normal inverse':
							newSerie = newSerie.map((_, i) => {return {x: serie[i].x, y: (1 - fNorm(i)) * statistics.count / statistics.total};});
							break;
						case 'none':
						default: 
							break;
					}
				}
				if (newSerie) {this.dataDraw.push(newSerie);}
				if (bCumulative) { // Create new objects to not overwrite original references...
					this.dataDraw.forEach((serie) => {serie.forEach((val, i, arr) => {arr[i] = {x: val.x, y: val.y + (i ? arr[i - 1].y : 0)};});});
				}
				return true;
			}
			case 'p-p plot': {
				let newSerie;
				if (this.series === 1 && this.dataManipulation.distribution) {
					const dist = this.dataManipulation.distribution.toLowerCase();
					if (dist === 'normal inverse') {this.normal();}
					const serie = this.dataDraw[0];
					const total = serie.reduce((curr, val) => {return curr + val.y;}, 0);
					const statistics = this.computeStatistics(serie);
					if (dist === 'normal inverse') {this.normalInverse();}
					newSerie = new Array(statistics.total).fill(0);
					const fNorm = (x) => Math.exp(-((x - statistics.mean)**2/statistics.sigma**2)/2) / (statistics.sigma * Math.sqrt(2 * Math.PI));
					const fAcumNorm = (x) => 1/2 + fNorm(x) * (x + x**3/3 + x**5/15);
					switch (dist.toLowerCase()) {
						case 'normal':
						case 'normal inverse':
							newSerie = newSerie.map((_, i) => {return {x: serie[i].x, y: (1 - fNorm(i)) / statistics.total};});
							break;
						case 'none':
						default: 
							break;
					}
				}
				this.dataDraw.forEach((serie) => {
					const total = serie.reduce((curr, val) => {return curr + val.y;}, 0);
					serie.forEach((val, i, arr) => {val.y = val.y / total});
				});
				if (newSerie) {this.dataDraw.push(newSerie);}
				this.dataDraw.forEach((serie) => {serie.forEach((val, i, arr) => {val.y = i ? arr[i - 1].y + val.y : val.y;});});
				const last = this.dataDraw[this.dataDraw.length -1];
				// "Fix" float errors and round
				const error = this.dataDraw.map((serie) => (1 - serie[serie.length - 1].y));
				this.dataDraw.forEach((serie, j) => {
					const len = serie.length;
					serie.forEach((val, i) => {
						val.y += error[j] / len * (2 * i - len);
						val.y = round(val.y, 3, 10**-3);
					});
				});
				// Change axis
				this.dataDraw.forEach((serie, j) => {
					serie.forEach((val, i) => {
						val.x = last[i].y;
					});
				});
				return true;
			}
			case 'q-q plot':
				return true;
			case 'none':
			default: 
				return false;
		}
	};
	
	this.computeStatistics = (serie) => {
		const statistics = {max: -Infinity, maxCount: 0, min: Infinity, minCount: 0, mean: null, sigma: 0, range: null, total: 0, count: 0};
		statistics.total = serie.length;
		serie.forEach((p, i) => {
			const val = p.y;
			if (val > statistics.max) {statistics.max = val;}
			if (val < statistics.min) {statistics.min = val;}
			statistics.mean += i * val;
			statistics.count += val;
		});
		statistics.range = statistics.max - statistics.min;
		statistics.mean = statistics.mean / statistics.count;
		serie.forEach((p, i) => {
			const val = p.y;
			if (val === statistics.max) {statistics.maxCount++;}
			else if (val === statistics.min) {statistics.minCount++;}
			statistics.sigma += val * (i - statistics.mean) ** 2;
		});
		statistics.sigma = Math.sqrt(statistics.sigma / (statistics.count - 1));
		return statistics;
	};
	
	this.manipulateData = () => {
		if (!this.data) {return false;}
		this.dataDraw = this.data.map((serie) => {return [...(serie || [])];})
		this.cleanData();
		this.filter();
		if (!this.distribution()) {
			this.sort();
			this.slice();
		}
		this.probabilityPlot();
	};
	
	/*
		Config related
	*/
	
	this.changeConfig = ({data, dataAsync = null, colors, chroma, graph, dataManipulation, background, grid, axis, margin, x, y, w, h, title, configuration, gFont, bPaint = true}) => {
		if (gFont) {this.gFont = gFont;}
		if (data) {this.data = data; this.dataDraw = data; this.series = data.length;}
		if (dataAsync) {this.dataAsync = dataAsync;}
		if (dataManipulation) {this.dataManipulation = {...this.dataManipulation, ...dataManipulation};}
		if (graph) {this.graph = {...this.graph, ...graph};}
		if (background) {this.background = {...this.background, ...background}; this.background.imageGDI = this.background.image ? gdi.Image(this.background.image) : null;}
		if (colors) {this.colors = colors;}
		if (chroma) {this.chroma = {...this.chroma, ...chroma}; this.checkScheme();}
		if ((colors || chroma) && !dataAsync && !this.dataAsync) {this.checkColors();}
		if (axis) {
			if (axis.x) {this.axis.x = {...this.axis.x, ...axis.x};}
			if (axis.y) {this.axis.y = {...this.axis.y, ...axis.y};}
		}
		if (grid) {
			if (grid.x) {this.grid.x = {...this.grid.x, ...grid.x};}
			if (grid.y) {this.grid.y = {...this.grid.y, ...grid.y};}
		}
		if (margin) {this.margin = {...this.margin, ...margin};}
		if (typeof x !== 'undefined') {this.x = x; this.pop.x = x;}
		if (typeof y !== 'undefined') {this.y = y; this.pop.y = y;}
		if (typeof w !== 'undefined') {this.w = w; this.pop.resize(w, this.pop.h);}
		if (typeof h !== 'undefined') {this.h = h; this.pop.resize(this.pop.w, h - this.y);}
		if (title) {this.title = title;}
		if (configuration) {
			for (let key in configuration) {
				this.configuration[key] = configuration[key];
			}
		}
		this.checkConfig();
		if (data || dataManipulation || graph) {this.initData();}
		if (this.configuration.bLoadAsyncData && dataAsync) {
			this.initDataAsync();
			if (colors || chroma) {this.checkColors();}
		} // May be managed by the chart or externally
		this.repaint();
		return this;
	};
	
	this.checkScheme = () => { // Check if the scheme is a valid string
		if (!this.chroma) {this.chroma = {scheme: 'random', colorBlindSafe: false}; return false;}
		if (this.chroma.scheme) {
			if (typeof this.chroma.scheme === 'string') {
				let schemeStr = this.chroma.scheme.toLowerCase();
				if (schemeStr === 'random' || schemeStr === 'rand') {return true;}
				else {
					if (colorbrewer.hasOwnProperty(schemeStr)) {return true;}
					for (let key in colorbrewer) {
						if (colorbrewer[key].indexOf(this.chroma.scheme) !== -1) {return true;}
					}
				}
				this.chroma.scheme = 'random'; // Use random as default for non valid values
				return false;
			} else {return true;}
		} else {this.chroma.scheme = 'random'; return false;}
	}
	
	this.checkColors = (bForce = false) => { // Fill holes and add missing colors at end
		if (!this.colors || bForce) {this.colors = [];}
		const series = Math.max(this.series, this.dataDraw.length);
		switch (this.graph.type) {
			case 'doughnut':
			case 'pie': {
				if (this.colors.filter(Boolean).length !== series) {
					for (let i = 0; i < series; i++) {
						if (!this.colors[i]) {this.colors[i] = [];}
					}
				}
				const len = this.colors.length;
				for (let i = 0; i < len; i++) {
					if (!Array.isArray(this.colors[i])) {this.colors[i] = [];}
				}
				if (series && this.colors.some((arrCol, i) => arrCol.filter(Boolean).length !== this.dataDraw[i].length)) {
					this.colors.forEach((arrCol, i) => {
						const serieLen = this.dataDraw[i].length;
						// Random colors or using Chroma scale with specific scheme or array of colors
						let schemeStr = this.chroma.scheme && typeof this.chroma.scheme === 'string' ? this.chroma.scheme.toLowerCase() : null;
						let bRandom = !this.chroma.scheme || schemeStr === 'random' || schemeStr === 'rand';
						if (bRandom) {
							arrCol.forEach((color, j) => {
								if (!color) {arrCol[j] = this.randomColor();}
							});
							for (let j = arrCol.length; j < serieLen; j++) {
								arrCol.push(this.randomColor());
							}
						} else { // Chroma scale method
							let scheme;
							// May be a key to use a random colorbrewer palette: diverging, qualitative & sequential
							if (schemeStr && colorbrewer.hasOwnProperty(schemeStr)) {
								const arr = this.chroma.colorBlindSafe ? colorbrewer.colorBlind[schemeStr] : colorbrewer[schemeStr];
								scheme = arr[Math.floor(Math.random() * arr.length)];
							} else { // An array of colors or colorbrewer palette (string)
								scheme = this.chroma.scheme;
							}
							const scale = this.chromaColor(scheme, serieLen);
							let k = 0;
							arrCol.forEach((color, j) => {
								if (!color) {
									arrCol[j] = scale[k]; 
									k++;
								}
							});
							for (let j = arrCol.length; j < serieLen; j++) {
								arrCol.push(scale[k]);
								k++;
							}
						}
					});
				}
				break;
			}
			default: {
				const len = this.colors.length;
				for (let i = 0; i < len; i++) {
					if (Array.isArray(this.colors[i])) {this.colors[i] = this.colors[i][0];}
				}
				if (this.colors.filter(Boolean).length !== series) {
					// Random colors or using Chroma scale with specific schems or array of colors
					let schemeStr = this.chroma.scheme && typeof this.chroma.scheme === 'string' ? this.chroma.scheme.toLowerCase() : null;
					let bRandom = !this.chroma.scheme || schemeStr === 'random' || schemeStr === 'rand';
					if (bRandom) {
						this.colors.forEach((color, i) => {
							if (!color) {this.colors[i] = this.randomColor();}
						});
						for (let i = this.colors.length; i < series; i++) {
							this.colors.push(this.randomColor());
						}
					} else { // Chroma scale method
						let scheme;
						// May be a key to use a random colorbrewer palette: diverging, qualitative & sequential
						if (schemeStr && colorbrewer.hasOwnProperty(schemeStr)) {
							const arr = this.chroma.colorBlindSafe ? colorbrewer.colorBlind[schemeStr] : colorbrewer[schemeStr];
							scheme = arr[Math.floor(Math.random() * arr.length)];
						} else { // An array of colors or colorbrewer palette (string)
							scheme = this.chroma.scheme;
						}
						const scale = this.chromaColor(scheme, series);
						let j = 0;
						this.colors.forEach((color, i) => {
							if (!color) {
								this.colors[i] = scale[j]; 
								j++;
							}
						});
						for (let i = this.colors.length; i < series; i++) {
							this.colors.push(scale[j]);
							j++;
						}
					}
				}
			}
		}
	};
	
	this.checkConfig = () => {
		if (this.graph.type) {this.graph.type = this.graph.type.replace('–','-');}
		if (this.dataManipulation.probabilityPlot) {this.dataManipulation.probabilityPlot = this.dataManipulation.probabilityPlot.replace('–','-');}
		const pPlot = this.dataManipulation.probabilityPlot ? this.dataManipulation.probabilityPlot.toLowerCase() : null;
		const dist = this.dataManipulation.distribution ? this.dataManipulation.distribution.toLowerCase() : null;
		let bPass = true;
		if (this.dataManipulation.sort && dist && dist !== 'none') {
			console.log('Statistics: sort can not be set while using a distribution.');
			bPass = false;
		}
		if (pPlot && pPlot !== 'none') {
			if (this.series === 1 && !dist) {
				if (pPlot === 'cdf plot' || pPlot === 'cumulative distribution plot' || pPlot === 'distribution plot') {
					console.log('Statistics: distribution has not been set and there is only a single serie for ' + pPlot + '. Using normal by default.');
					this.dataManipulation.distribution = 'normal';
					bPass = false;
				} else if (pPlot === 'p-p plot') {
					console.log('Statistics: distribution has not been set and there is only a single serie for ' + pPlot + '. Using normal inverse by default.');
					this.dataManipulation.distribution = 'normal inverse';
					this.axis.x.key = 'Theoretical cumulative distribution';
					this.axis.y.key = 'Empirical cumulative distribution';
					if (!this.graph.point) {this.graph.point = 'circumference';}
					bPass = false;
				}
			}
		}
		// Fix stringify/parse Infinity becoming null
		if (this.dataManipulation.slice && this.dataManipulation.slice[1] === null) {this.dataManipulation.slice[1] = Infinity;}
		return bPass;
	}
	
	this.exportConfig = () => {
		return {
			colors:	[...this.colors],
			chroma:	{...this.chroma},
			graph:	{...this.graph},
			dataManipulation: {...this.dataManipulation},
			background: {...this.background},
			grid:	{x: {...this.grid.x},  y: {...this.grid.y}},
			axis:	{x: {...this.axis.x},  y: {...this.axis.y}},
			margin: {...this.margin},
			x:		this.x,
			y:		this.y,
			w:		this.w,
			h:		this.h,
			title:	this.title
		};
	}
	
	this.initData = () => {
		// Clean calculated offsets
		this.margin.leftAuto = this.margin.left;
		// Clean and manipulate data
		this.manipulateData();
		this.cleanPoints();
		// Missing colors
		this.checkScheme();
		if (this.data.length) {this.checkColors();}
	}
	
	this.initDataAsync = () => {
		if (!this.dataAsync) {return null;}
		this.initPopup();
		if (isFunction(this.dataAsync)) {this.dataAsync = this.dataAsync();}
		return this.dataAsync.then((data) => {
			this.changeConfig({data, dataAsync: null});
			this.pop.disable(true);
			this.repaint();
			return true;
		});
	}
	
	this.init = () => {
		// Bg Image
		this.background.imageGDI = this.background.image ? gdi.Image(this.background.image) : null;
		this.checkConfig();
		this.initData();
		if (this.configuration.bLoadAsyncData && this.dataAsync) {this.initDataAsync();} // May be managed by the chart or externally
	};
	
	this.setDefaults = () => {
		this.colors = [];
		this.chroma = {scheme: 'sequential', colorBlindSafe: true}; // diverging, qualitative, sequential, random or [color, ...] see https://vis4.net/chromajs/#color-scales
		this.graph = {type: 'bars', borderWidth: _scale(1), point: null};
		this.dataManipulation = {sort: (a, b) => {return b.y - a.y;}, filter: null, slice: [0, 10], distribution: null, probabilityPlot: null};
		this.background = {color: RGB(255 , 255, 255), image: null};
		this.grid = {x: {show: false, color: RGB(0,0,0), width: _scale(1)}, y: {show: false, color: RGB(0,0,0), width: _scale(1)}};
		this.axis = {
				x: {show: true, color: RGB(0,0,0), width: _scale(2), ticks: 'auto', labels: true, singleLabels: true, key: '', showKey: true, bAltLabels: false},
				y: {show: true, color: RGB(0,0,0), width: _scale(2), ticks: 10, labels: true, key: 'tracks', showKey: true}
		};
		this.margin = {left: _scale(20), right: _scale(20), top: _scale(20), bottom: _scale(20)};
		this.title = window.Name + ' {' + this.axis.x.key + ' - ' + this.axis.y.key + '}';
		this.tooltipText = '';
	}
	
	this.setDefaults();
	this.gFont = gFont;
	this.data = data;
	this.dataAsync = dataAsync;
	this.dataDraw = data || [];
	this.dataCoords = this.dataDraw.map((serie) => {return [];});
	this.dataManipulation = {...this.dataManipulation, ...dataManipulation};
	this.series = data ? data.length : 0;
	this.graph = {...this.graph, ...graph};
	this.background = {...this.background, ...background};
	this.colors = colors;
	this.chroma = {...this.chroma, ...chroma};
	if (axis) {
		if (axis.x) {this.axis.x = {...this.axis.x, ...axis.x};}
		if (axis.y) {this.axis.y = {...this.axis.y, ...axis.y};}
	}
	if (grid) {
		if (grid.x) {this.grid.x = {...this.grid.x, ...grid.x};}
		if (grid.y) {this.grid.y = {...this.grid.y, ...grid.y};}
	}
	this.margin = {...this.margin, ...margin};
	this.currPoint = [-1, -1];
	this.stats = {maxY: 0, minY: 0};
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.title = typeof title !== 'undefined' ? title : window.Name + ' {' + this.axis.x.key + ' - ' + this.axis.y.key + '}';
	this.tooltipText = tooltipText;
	this.configuration = {bLoadAsyncData: true, bAltVerticalText: false, bPopupBackground: false, ...(configuration || {})};
	/* 
	Animation
	*/
	this.pop = new _popup({
		x, y, w, h: h - y,
		offsetY: margin.top / 2 - (h - y) / 5,
		offsetX: + margin.left,
		UI: 'MATERIAL',
		scale: 2,
		configuration: {
			border: {enabled: false}, 
			icon: {enabled: true}, 
			...(this.configuration.bPopupBackground 
				? {color: {panel: opaqueColor(0xFF4354AF, 30), text: invert(this.background.color, true)}} // Blue overlay
				: {})
			}
	});
	this.init();
}