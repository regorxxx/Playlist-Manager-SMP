'use strict';
//22/07/26

/* exported _background */

include('window_xxx_helpers.js');
/* global folders:readable */
/* global debounce:readable, isFunction:readable, getNested:readable, addNested:readable */
/* global _resolvePath:readable, getFiles:readable, strNumCollator:readable, lastModified:readable, _isFolder:readable */
/* global RGBA:readable, toRGB:readable , _scale:readable, applyAsMask:readable, applyMask:readable, applyEffect:readable, applyEffectAsMaskEffect:readable, getBrightness:readable, invert:readable, blendColors:readable, applyManipulation:readable, tintColor:readable, _gdiFont:readable */
/* global IDC_HAND:readable, IDC_ARROW:readable */
/* global InterpolationMode:readable, RotateFlipType:readable, Effects:readable, BorderMode:readable, BlendMode:readable, SmoothingMode:readable */
/* global DT_RIGHT:readable, DT_TOP:readable */

/**
 * Background for panel with different cover options
 *
 * @class
 * @name _background
 * @param {{ x: number, y: number, w: number, h: number, offsetH?: number, coverMode: CoverMode, coverModeOptions: CoverModeOptions, colorMode: ColorMode, colorModeOptions: ColorModeOptions, timer: number, callbacks: Callbacks, logging: Logging }} { x, y, w, h, offsetH, coverMode, coverModeOptions, colorMode, colorModeOptions, timer, callbacks, logging }?
 */
function _background({
	x, y, w, h,
	offsetH = _scale(1),
	/* eslint-disable no-unused-vars */
	coverMode, coverModeOptions,
	colorMode, colorModeOptions,
	timer,
	callbacks,
	logging
	/* eslint-enable no-unused-vars */
} = {}) {
	/**
	 * Retrieves default settings
	 * @property
	 * @name defaults
	 * @kind method
	 * @memberof _background
	 * @type {function}
	 * @param {Boolean} bPosition - [=false]
	 * @param {Boolean?} bCallbacks - [=false]
	 * @returns {object}
	 */
	this.defaults = _background.defaults;
	/**
	 * @typedef {(bChanged:boolean, coverImg:{ art: { path: string, image: GdiBitmap|null, colors: {col:number, freq:number}[]|null, histogram: number[]|null, blendImage: GdiBitmap|null, blendUiImage: GdiBitmap|null }, handle: FbMetadbHandle|null, id: string|null }) => any} updateImageBgOnDone - Callback after bg img is updated
	 */
	/**
	 * Updates background image based from preferred handle and calls color callbacks.
	 * @function
	 * @name updateImageBg
	 * @kind method
	 * @memberof _background
	 * @type {(bForce:boolean, onDone: updateImageBgOnDone, bRepaint:boolean) => void}
	 * @param {Boolean} bForce - [=false]
	 * @param {updateImageBgOnDone} onDone - [=null]
	 * @param {Boolean} bRepaint - [=true]
	 * @returns {Promise.<boolean>}
	 */
	this.updateImageBg = debounce(async (bForce = false, /** @type {updateImageBgOnDone} */ onDone = null, bRepaint = true) => {
		let handle;
		if (this.coverModePriority.length) {
			handle = this.getHandle();
			if (handle) {
				for (let mode of this.coverModePriority) {
					const artPromise = await this.getHandleArt(handle, mode, true);
					if (artPromise.path.length) {
						this.coverMode = mode;
						break;
					}
				}
			}
		}
		if (!this.useCover) { this.resetArt(); }
		if (!this.coverModeOptions.bProcessColors) { this.coverImg.art.colors = null; }
		if (!this.useColors || this.useColorsBlend) { this.colorImg = null; }
		else if (!this.useCover) { this.colorsChanged(bRepaint, true, false); }
		if (!this.useCover) { return false; }
		if (!handle) { handle = this.getHandle(); }
		const bPath = ['path', 'folder'].includes(this.coverMode);
		const path = bPath ? this.getArtPath(void (0), handle) : '';
		const bFoundPath = bPath && path.length !== 0;
		if (this.logging.bDebug) { console.log('Background - updateImageBg - art file: ' + path + ' (path)'); }
		if (this.logging.bDebug) { console.log('Background - updateImageBg - handle: ' + (handle ? handle.RawPath : '') + ' (handle)'); }
		if (bPath && !bFoundPath && !this.coverModeOptions.bFallbackFront) { this.resetArt(); }
		if (!bForce && (handle && this.coverImg.handle === handle.RawPath || bPath && this.coverImg.art.path === path)) { return false; }
		let id = null;
		if (this.coverModeOptions.bCacheAlbum && handle) {
			const tf = fb.TitleFormat('%ALBUM%|$directory(%PATH%,1)');
			id = tf.EvalWithMetadb(handle);
			if (!bForce && id === this.coverImg.id) {
				if (onDone && isFunction(onDone)) { onDone(false, this.coverImg); }
				return false;
			}
		}
		let profiler;
		if (this.logging.bProfile) { profiler = new FbProfiler('Background - loadImg'); }
		const promise = bFoundPath
			? gdi.LoadImageAsyncV2('', path)
			: (!bPath || this.coverModeOptions.bFallbackFront) && handle
				? this.getHandleArt(handle, this.coverMode)
				: Promise.reject(new Error('No handle/art'));
		promise.then((result) => {
			if (this.logging.bProfile) { profiler.Print(); }
			this.resetArt();
			if (bFoundPath) {
				if (!result) { throw new Error('Corrupt image file'); }
				this.coverImg.art.image = result;
				this.coverImg.handle = this.coverImg.art.path = path;
			} else {
				if (!result || !result.image) { throw new Error('Image not available'); }
				this.coverImg.art.image = result.image;
				this.coverImg.art.path = result.path;
				this.coverImg.handle = handle.RawPath;
				this.coverImg.id = id;
				if (this.logging.bDebug) { console.log('Background - updateImageBg - art handle: ' + result.path + ' (handle)'); }
			}
			this.processArtColors();
			this.processArtEffects();
			return true;
		}).catch((error) => {
			if (this.logging.bDebug || this.logging.bError && (!bPath || bFoundPath)) { console.log('Background - updateImageBg: image error\n\n' + error.toString() + '\n' + error.stack); }
			this.resetArt();
			return false;
		}).finally(() => {
			if (this.logging.bDebug) { console.log('Background - updateImageBg - art colors: ' + this.getArtColors()); }
			this.applyArtColors(bRepaint);
			this.notifyArtColors();
			if (bRepaint) { this.repaint(); }
			if (onDone && isFunction(onDone)) { onDone(true, this.coverImg); }
		});
	}, 250);
	/**
	 * Processes and retrieves art colors according to panel settings
	 * @property
	 * @name processArtColors
	 * @kind method
	 * @memberof _background
	 * @returns {{col:number, freq:number}[]|null}
	 */
	this.processArtColors = () => {
		let profiler;
		if (this.logging.bProfile) { profiler = new FbProfiler('Background - processArtColors'); }
		if (this.coverImg.art.image && this.coverModeOptions.bProcessColors) {
			this.coverImg.art.colors = this.coverImg.art.image.GetColourSchemeJSONV2
				? JSON.parse(this.coverImg.art.image.GetColourSchemeJSONV2(6))
				: JSON.parse(this.coverImg.art.image.GetColourSchemeJSON(6));
		}
		if (this.logging.bProfile) { profiler.Print(); }
		return this.coverImg.art.colors;
	};
	/**
	 * Formats art image according with different effects to panel settings
	 * @property
	 * @name processArtEffects
	 * @kind method
	 * @memberof _background
	 * @returns {void}
	 */
	this.processArtEffects = () => {
		let profiler;
		if (this.logging.bProfile) { profiler = new FbProfiler('Background - processArtEffects'); }
		if ((this.showCover || this.useColorsBlend) && !!this.coverImg.art.image) {
			let intensity;
			if (this.coverModeOptions.bFlipX && this.coverModeOptions.bFlipY) {
				this.coverImg.art.image.RotateFlip(RotateFlipType.RotateNoneFlipXY);
			} else if (this.coverModeOptions.bFlipX) {
				this.coverImg.art.image.RotateFlip(RotateFlipType.RotateNoneFlipX);
			} else if (this.coverModeOptions.bFlipY) {
				this.coverImg.art.image.RotateFlip(RotateFlipType.RotateNoneFlipY);
			}
			if (this.useD2D) {
				this.coverImg.art.image = applyEffect(this.coverImg.art.image, (img) => {
					let prevEffect, effect;
					if (this.coverModeOptions.mute !== 0 && Number.isInteger(this.coverModeOptions.mute)) {
						intensity = Math.max(Math.min(this.coverModeOptions.mute / 100, 1), 0);
						const brightness = d2d.Effect(Effects.Brightness.ID);
						brightness.SetInput(0, img);
						brightness.SetValue(Effects.Brightness.BlackPoint, new Float32Array([0, 1 - intensity]));
						const blur = d2d.Effect(Effects.GaussianBlur.ID);
						blur.SetInputEffect(0, brightness);
						blur.SetValue(Effects.GaussianBlur.StandardDeviation, 1);
						blur.SetValue(Effects.GaussianBlur.BorderMode, BorderMode.Hard);
						effect = d2d.Effect(Effects.Blend.ID);
						if (prevEffect) { effect.SetInputEffect(0, prevEffect); }
						else { effect.SetInput(0, img); }
						effect.SetInputEffect(1, blur);
						effect.SetValue(Effects.Blend.Mode, BlendMode.Luminosity);
						prevEffect = effect;
						const tint = d2d.Effect(Effects.TemperatureTint.ID);
						tint.SetInput(0, img);
						tint.SetValue(Effects.TemperatureTint.Temperature, -0.25);
						effect = d2d.Effect(Effects.Blend.ID);
						effect.SetInputEffect(0, prevEffect);
						effect.SetInputEffect(1, tint);
						effect.SetValue(Effects.Blend.Mode, BlendMode.Darken);
						prevEffect = effect;
						effect = d2d.Effect(Effects.HighlightsShadows.ID);
						effect.SetInputEffect(0, prevEffect);
						effect.SetValue(Effects.HighlightsShadows.Shadows, 0.75);
						effect.SetValue(Effects.HighlightsShadows.Highlights, -0.25);
						effect.SetValue(Effects.HighlightsShadows.Clarity, -1);
						effect.SetValue(Effects.HighlightsShadows.MaskBlurRadius, 5);
						prevEffect = effect;
					}
					if (this.coverModeOptions.edgeGlow !== 0 && Number.isInteger(this.coverModeOptions.edgeGlow)) {
						intensity = Math.max(Math.min(this.coverModeOptions.edgeGlow / 100, 1), 0);
						effect = d2d.Effect(Effects.EdgeDetection.ID);
						if (prevEffect) { effect.SetInputEffect(0, prevEffect); }
						else { effect.SetInput(0, img); }
						effect.SetValue(Effects.EdgeDetection.Strength, intensity);
						prevEffect = effect;
					}
					if (this.coverModeOptions.bloom !== 0 && Number.isInteger(this.coverModeOptions.bloom)) {
						intensity = Math.max(Math.min(this.coverModeOptions.bloom / 100, 1), 0);
						const brightness = d2d.Effect(Effects.Brightness.ID);
						brightness.SetInput(0, img);
						brightness.SetValue(Effects.Brightness.WhitePoint, new Float32Array([0.5, intensity]));
						intensity = Math.max(img.Width, img.Height) / 100;
						const blur = d2d.Effect(Effects.GaussianBlur.ID);
						blur.SetInputEffect(0, brightness);
						blur.SetValue(Effects.GaussianBlur.StandardDeviation, intensity);
						blur.SetValue(Effects.GaussianBlur.BorderMode, BorderMode.Hard);
						effect = d2d.Effect(Effects.Blend.ID);
						if (prevEffect) { effect.SetInputEffect(0, prevEffect); }
						else { effect.SetInput(0, img); }
						effect.SetInputEffect(1, blur);
						effect.SetValue(Effects.Blend.Mode, prevEffect ? BlendMode.SoftLight : BlendMode.Screen);
						prevEffect = effect;
					}
					if (this.coverModeOptions.blur !== 0 && Number.isInteger(this.coverModeOptions.blur)) {
						intensity = this.coverModeOptions.bCircularBlur
							? Math.min(Math.max(this.coverModeOptions.blur, 0) / 5 / 2, 1)
							: Math.max(this.coverModeOptions.blur, 0);
						const id = this.coverModeOptions.bDirectionalBlur
							? Effects.DirectionalBlur.ID
							: Effects.GaussianBlur.ID;
						effect = d2d.Effect(id);
						if (prevEffect) { effect.SetInputEffect(0, prevEffect); }
						else { effect.SetInput(0, img); }
						effect.SetValue(Effects.GaussianBlur.StandardDeviation, intensity);
						effect.SetValue(Effects.GaussianBlur.BorderMode, BorderMode.Hard);
						prevEffect = effect;
						if (this.coverModeOptions.bCircularBlur) {
							intensity = Math.max(this.coverModeOptions.blur, 0) / 2;
							prevEffect = effect = applyEffectAsMaskEffect(img, effect, (img, effect) => {
								const innerBlur = d2d.Effect(id);
								innerBlur.SetInputEffect(0, effect);
								innerBlur.SetValue(Effects.GaussianBlur.StandardDeviation, intensity);
								return innerBlur;
							}, (mask, gr) => {
								gr.FillEllipse(mask.Width / 4, mask.Height / 4, mask.Width / 2, mask.Height / 2, 0xFF000000);
								mask.ReleaseGraphics(gr);
								mask.StackBlur(mask.Width / 10);
								return true;
							}, true);
						}
					}
					if (this.coverModeOptions.bGrayScale) {
						effect = d2d.Effect(Effects.Grayscale.ID);
						if (prevEffect) { effect.SetInputEffect(0, prevEffect); }
						else { effect.SetInput(0, img); }
						prevEffect = effect;
					}
					if (this.coverModeOptions.vignette !== 0 && Number.isInteger(this.coverModeOptions.vignette)) {
						intensity = Math.max(Math.min(this.coverModeOptions.vignette / 100, 1), 0);
						effect = d2d.Effect(Effects.Vignette.ID);
						if (prevEffect) { effect.SetInputEffect(0, prevEffect); }
						else { effect.SetInput(0, img); }
						const color = [...toRGB(this.coverModeOptions.vignetteColor || this.getAvgUiColor()).map((v) => v / 255), 1];
						effect.SetValue(Effects.Vignette.Color, new Float32Array(color));
						effect.SetValue(Effects.Vignette.TransitionSize, intensity);
						effect.SetValue(Effects.Vignette.Strength, 0.8);
						prevEffect = effect; // NOSONAr
					}
					if (this.coverModeOptions.histogram !== 0 && Number.isInteger(this.coverModeOptions.histogram)) {
						intensity = Math.round(Math.max(Math.min(this.coverModeOptions.histogram, 1024), 0));
						const hist = d2d.Effect(Effects.Histogram.ID);
						hist.SetInput(0, img);
						hist.SetValue(Effects.Histogram.NumBins, intensity);
						const imgGr = img.GetGraphics();
						imgGr.DrawEffect(hist, 0, 0, 0, 0, img.Width, img.Height);
						img.ReleaseGraphics(imgGr);
						this.coverImg.art.histogram = hist.GetValue(Effects.Histogram.HistogramOutput);
					}
					return effect;
				});
			} else {
				if (this.coverModeOptions.mute !== 0 && Number.isInteger(this.coverModeOptions.mute)) {
					intensity = Math.max(Math.min(this.coverModeOptions.mute / 100 * 255, 255), 0);
					applyMask(this.coverImg.art.image, (mask, gr, w, h) => {
						gr.DrawImage(this.coverImg.art.image, 0, 0, w, h, 0, 0, w, h, 0, intensity / 2);
						mask.ReleaseGraphics(gr);
						mask.StackBlur(5);
						return true;
					});
					applyMask(this.coverImg.art.image, (mask, gr, w, h) => {
						gr.DrawImage(this.coverImg.art.image.InvertColours(), 0, 0, w, h, 0, 0, w, h, 0, intensity);
						mask.ReleaseGraphics(gr);
						mask.StackBlur(10);
						return true;
					});
				}
				if (this.coverModeOptions.edgeGlow !== 0 && Number.isInteger(this.coverModeOptions.edgeGlow)) {
					intensity = Math.max(Math.min(this.coverModeOptions.edgeGlow / 100 * 255, 255), 0);
					applyAsMask(
						this.coverImg.art.image,
						(img, gr, w, h) => {
							gr.FillSolidRect(0, 0, w, h, RGBA(0, 0, 0));
						},
						(mask, gr, w, h) => {
							gr.DrawImage(this.coverImg.art.image.InvertColours(), 0, 0, w, h, 0, 0, w, h, 0, intensity);
							mask.ReleaseGraphics(gr);
							mask.StackBlur(1);
							return true;
						}, true
					);
				}
				if (this.coverModeOptions.bloom !== 0 && Number.isInteger(this.coverModeOptions.bloom)) {
					intensity = Math.max(Math.min(this.coverModeOptions.bloom / 100 * 255, 255), 0);
					applyAsMask(
						this.coverImg.art.image,
						(img, gr, w, h) => {
							gr.FillSolidRect(0, 0, w, h, RGBA(255, 255, 255));
						},
						(mask, gr, w, h) => {
							gr.DrawImage(this.coverImg.art.image.InvertColours(), 0, 0, w, h, 0, 0, w, h, 0, intensity);
							mask.ReleaseGraphics(gr);
							mask.StackBlur(50);
							return true;
						}, true
					);
					applyAsMask(
						this.coverImg.art.image,
						(img, gr) => {
							img.ReleaseGraphics(gr);
							img.StackBlur(10);
							return true;
						},
						(mask, gr, w, h) => { gr.DrawImage(this.coverImg.art.image.InvertColours(), 0, 0, w, h, 0, 0, w, h); },
					);
				}
				if (this.coverModeOptions.blur !== 0 && Number.isInteger(this.coverModeOptions.blur)) {
					intensity = Math.max(this.coverModeOptions.blur, 0);
					if (this.coverModeOptions.bCircularBlur) {
						this.coverImg.art.image.StackBlur(Math.min(intensity / 5, 1));
						applyAsMask(
							this.coverImg.art.image,
							(img, gr) => {
								img.ReleaseGraphics(gr);
								img.StackBlur(intensity);
								return true;
							},
							(mask, gr, w, h) => {
								gr.FillEllipse(w / 4, h / 4, w / 2, h / 2, 0xFFFFFFFF);
								mask.ReleaseGraphics(gr);
								mask.StackBlur(w / 10);
								return true;
							},
						);
					} else {
						this.coverImg.art.image.StackBlur(intensity);
					}
				}
				if (this.coverModeOptions.vignette !== 0 && Number.isInteger(this.coverModeOptions.vignette)) {
					intensity = Math.max(Math.min(this.coverModeOptions.vignette / 100, 1), 0);
					applyAsMask(
						this.coverImg.art.image,
						(img, gr, w, h) => gr.FillSolidRect(0, 0, w, h, RGBA(...toRGB(this.coverModeOptions.vignetteColor || this.getAvgUiColor()))),
						(mask, gr, w, h) => {
							const x = intensity * w / 7;
							const y = intensity * h / 7;
							const ww = w - 2 * x;
							const hh = h - 2 * y;
							gr.FillEllipse(x, y, ww, hh, 0xFFFFFFFF);
							mask.ReleaseGraphics(gr);
							mask.StackBlur(w / 3.5);
						},
					);
				}
			}
		}
		if (this.logging.bProfile) { profiler.Print(); }
	};
	/**
	 * Paints art
	 * @property
	 * @name paintImage
	 * @kind method
	 * @memberof _background
	 * @param {Object} o - Arguments
	 * @param {GdiGraphics} o.gr - From on_paint
	 * @param {{x?:number, y?:number, w?:number, h?:number, offsetH?:number}} o.limits - Drawing coordinates
	 * @param {number} o.rotateFlip - Rotation/flip transformation
	 * @param {(mask, gr, w, h) => boolean|null} o.fadeMask - [=null] Fading mask for reflections. Use something like (mask, gr, w, h) => gr.FillGradRect(w / 2, 0, w, h, 0, 0xFFFFFFFF, 0xFF000000). To maintain D2D compatibility, don't use mask rotation without releasing mask gr first (when doing so, return true)
	 * @param {{opacity:number}|null} o.fill - [=null] Used for panel filling instead of internal settings
	 * @param {CoverModeOptions} o.options - Set cover mode options, by default uses panel settings
	 * @returns {void}
	 */
	this.paintImage = ({
		gr,
		img = this.coverImg.art.image,
		limits = { x, y, w, h, offsetH },
		rotateFlip = RotateFlipType.RotateNoneFlipNone,
		fadeMask = null,
		fill = null,
		options
	} = {}) => {
		options = { ... this.coverModeOptions, ...options };
		if (img && options.alpha > 0) {
			// No need for fancy interpolation if image will be already blurred in some way
			const interpolation = (options.blur !== 0 && Number.isInteger(options.blur) || options.bloom !== 0 && Number.isInteger(options.bloom)) && fill !== null
				? InterpolationMode.LowQuality
				: InterpolationMode.HighQualityBicubic;
			gr.SetInterpolationMode(interpolation);
			img = fadeMask || rotateFlip !== RotateFlipType.RotateNoneFlipNone
				? img.Clone(0, 0, img.Width, img.Height)
				: img;
			if (rotateFlip !== RotateFlipType.RotateNoneFlipNone) { img.RotateFlip(rotateFlip); }
			if (fadeMask) {
				applyMask(
					img,
					fadeMask,
					true
				);
			}
			const zoomX = options.zoom > 0
				? Math.max(Math.min(options.zoom / 100, 0.99), 0) * img.Width / 2
				: 0;
			const zoomY = options.zoom > 0
				? Math.max(Math.min(options.zoom / 100, 0.99), 0) * img.Height / 2
				: 0;
			let x, y, w, h, bFilled;
			if (options.bFill && options.bProportions) {
				bFilled = true;
				const prop = (limits.w / ((limits.h - limits.offsetH) || 1)) || 1;
				const imgProp = img.Width / img.Height;
				if (fill !== null) { gr.FillSolidRect(limits.x, limits.y, limits.w, limits.h, fill); }
				if (imgProp > prop) {
					x = img.Width * (1 - prop / imgProp) / 2 + zoomX * prop / imgProp;
					y = zoomY;
					w = (img.Width - zoomX * 2) * prop / imgProp;
					h = img.Height - zoomY * 2;
				} else {
					switch (options.fillCrop) {
						case 'top': {
							x = zoomX;
							y = zoomY / prop;
							w = img.Width - zoomX * 2;
							h = (img.Width - zoomY * 2) / prop;
							break;
						}
						case 'bottom': {
							x = zoomX;
							y = (img.Height - img.Width / prop) + zoomY / prop;
							w = img.Width - zoomX * 2;
							h = (img.Width - zoomY * 2) / prop;
							break;
						}
						case 'center':
						default: {
							x = zoomX;
							y = (img.Height - img.Width / prop) / 2 + zoomY / prop;
							w = img.Width - zoomX * 2;
							h = (img.Width - zoomY * 2) / prop;
						}
					}
				}
				gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, x, y, w, h, options.angle, options.alpha);
			} else {
				if (options.bProportions) {
					const prop = (limits.w / ((limits.h - limits.offsetH) || 1)) || 1;
					const imgProp = img.Width / img.Height;
					if (imgProp > prop) {
						w = limits.w;
						h = (limits.h - limits.offsetH) / imgProp * prop;
					} else {
						w = limits.w * imgProp / prop;
						h = (limits.h - limits.offsetH);
					}
				} else { [w, h] = [limits.w, limits.h]; }
				x = limits.x + (limits.w - w) / 2;
				y = Math.max((limits.h - limits.y - h) / 2 + limits.y, limits.y);
				if (fill !== null) { gr.FillSolidRect(x, y, w - 6, h - 6, fill); }
				gr.DrawImage(img, x, y, w, h, zoomX, zoomY, img.Width - zoomX * 2, img.Height - zoomY * 2, options.angle, options.alpha);
			}
			if (options.pathCycleCount > 0 && this.coverMode === 'folder' && artFiles.num > 0) {
				if (bFilled) {
					this.paintImageCounter({ gr, limits: { x: limits.x, y: limits.y, w: limits.w, h: limits.h }, options: { size: options.pathCycleCount } });
				} else {
					this.paintImageCounter({ gr, limits: { x, y, w: w, h }, options: { size: options.pathCycleCount } });
				}
			}
			gr.SetInterpolationMode();
		}
	};
	this.paintHistogram = ({
		gr,
		limits = { x, y, w, h, offsetH },
		points = this.coverImg.art.histogram,
		bGradient = false,
		alpha = 200
	} = {}) => {
		if (!points) { return false; }
		const maxY = Math.max(...points);
		const w = limits.w;
		const h = limits.h;
		const y = Math.min(w / 8, h / 10);
		const x = Math.min(w / 8, h / 10);
		const barW = (w - x * 2) / (points.length || 1);
		const barH = (h - y * 2);
		let valH;
		const color = RGBA(...toRGB(this.getAvgArtColor()), alpha);
		const borderColor = RGBA(
			...toRGB(invert(color, true)),
			getBrightness(...toRGB(color)) < 50 ? 50 : 25
		);
		gr.SetSmoothingMode(SmoothingMode.AntiAlias);
		points.forEach((value, i) => {
			const scale = value / (maxY || 1);
			valH = scale * barH;
			const xPoint = x + i * barW;
			const yPoint = y - valH + barH;
			const topColor = bGradient
				? blendColors(color, invert(color, false, false), scale, false)
				: color;
			if (color === topColor) {
				gr.FillSolidRect(xPoint, yPoint, barW, valH, color);
			} else {
				gr.FillGradRect(xPoint, yPoint, barW, valH, 90.1, topColor, color);
			}
			gr.DrawRect(xPoint, yPoint, barW, valH, Math.max(barW / 10, 1), borderColor);
		});
		gr.SetSmoothingMode();
		return true;
	};
	/**
	 * Paints reflected art
	 * @property
	 * @name paintReflection
	 * @kind method
	 * @memberof _background
	 * @param {Object} o - Arguments
	 * @param {GdiGraphics} o.gr - From on_paint
	 * @param {ReflectionMode} o.mode - Drawing coordinates
	 * @returns {void}
	 */
	this.paintReflection = ({
		gr,
		mode
	}) => {
		if (!!this.coverImg.art.image && this.showCover) {
			const prop = this.w / ((this.h - this.offsetH) || 1);
			const imgProp = this.coverImg.art.image.Width / this.coverImg.art.image.Height;
			switch (mode) {
				case 'asymmetric': {
					const offsetX = Math.max(0, this.coverModeOptions.bProportions && !this.coverModeOptions.bFill
						? prop > 2 * imgProp
							? this.w / 2 - this.h * imgProp
							: 0
						: 0
					);
					const x = this.x + this.w / 8;
					const w = this.w / 2;
					this.paintImage({ gr, limits: { x: Math.round(x + (prop > 2 * imgProp ? offsetX / 4 : 0)), y: this.y, w: Math.ceil(w), h: this.h, offsetH: this.offsetH } });
					this.paintImage({
						gr,
						limits: { x: Math.floor(x + w - offsetX + (prop > 2 * imgProp ? offsetX / 4 : 0)), y: this.y, w: Math.ceil(w), h: this.h, offsetH: this.offsetH },
						rotateFlip: RotateFlipType.RotateNoneFlipX,
						fadeMask: (mask, gr, w, h) => gr.FillGradRect(0, 0, w / 2, h, 0.1, 0xFF000000, 0xFFFFFFFF),
						options: { alpha: this.coverModeOptions.alpha * 0.4 }
					});
					break;
				}
				case 'symmetric':
				default: {
					const offsetX = Math.round(this.coverModeOptions.bProportions && !this.coverModeOptions.bFill
						? prop > 2 * imgProp
							? this.w / 2 - this.h * imgProp
							: this.w / 2 - this.h * imgProp - this.h * imgProp / prop
						: 0
					);
					const w = Math.round(this.coverModeOptions.bProportions && !this.coverModeOptions.bFill
						? prop > 2 * imgProp
							? this.w / 2
							: this.w / 2 + this.h * imgProp / prop * 2
						: this.w / 2
					);
					const x = Math.max(0, Math.round(this.x - this.w / 4 + offsetX));
					this.paintImage({
						gr,
						limits: { x, y: this.y, w, h: this.h, offsetH: this.offsetH },
						rotateFlip: RotateFlipType.RotateNoneFlipX,
						fadeMask: (mask, gr, w, h) => gr.FillGradRect(w / 4, 0, w / 2, h, 0.1, 0xFFFFFFFF, 0xFF000000),
						options: { alpha: this.coverModeOptions.alpha * 0.75 }
					});
					this.paintImage({
						gr,
						limits: { x: this.w - x - w, y: this.y, w, h: this.h, offsetH: this.offsetH },
						rotateFlip: RotateFlipType.RotateNoneFlipX,
						fadeMask: (mask, gr, w, h) => gr.FillGradRect(0, 0, w / 2 + w / 4, h, 0.1, 0xFF000000, 0xFFFFFFFF),
						options: { alpha: this.coverModeOptions.alpha * 0.75 }
					});
					this.paintImage({ gr, limits: { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } });
				}
			}
		}
	};
	/**
	 * Paints color fill
	 * @property
	 * @name paintColors
	 * @kind method
	 * @memberof _background
	 * @param {Object} o - Arguments
	 * @param {GdiGraphics} o.gr - From on_paint
	 * @param {{x?:number, y?:number, w?:number, h?:number}} o.limits - Drawing coordinates
	 * @returns {void}
	 */
	this.paintColors = ({
		gr,
		limits = { x, y, w, h }
	}) => {
		const colorMode = this.colorMode;
		let grImg, bCreateImg;
		if (this.colorModeOptions.bDither && !['single', 'none', 'blend'].includes(colorMode)) {
			if (!this.colorImg || this.colorImg.Width !== limits.w || this.colorImg.Height !== limits.h) { this.colorImg = gdi.CreateImage(limits.w, limits.h); bCreateImg = true; }
			grImg = this.colorImg.GetGraphics();
		}
		const color = this.colorModeOptions.color;
		switch (colorMode) {
			case 'single': {
				gr.FillSolidRect(limits.x, limits.y, limits.w, limits.h, color[0]);
				break;
			}
			case 'blend': { // NOSONAR
				if (this.coverImg.art.image || this.coverImg.art.blendUiImage) { break; }
			}
			case 'bigradient': { // eslint-disable-line no-fallthrough
				if (bCreateImg || !this.colorModeOptions.bDither) {
					const gradColors = [color[0], color[1] || color[0]];
					if (this.colorModeOptions.bDarkBiGradOut && (this.colorModeOptions.angle < 200 || this.colorModeOptions.angle > 350) && this.colorModeOptions.focus <= 0.5) {
						if (getBrightness(...toRGB(gradColors[0])) > getBrightness(...toRGB(gradColors[1]))) { gradColors.reverse(); }
					}
					(grImg || gr).FillGradRect(limits.x, limits.y, limits.w, limits.h / 2, Math.abs(360 - this.colorModeOptions.angle), gradColors[0], gradColors[1], this.colorModeOptions.focus);
					(grImg || gr).FillGradRect(limits.x, limits.h / 2, limits.w, limits.h / 2, this.colorModeOptions.angle, gradColors[0], gradColors[1], this.colorModeOptions.focus);
				}
				break;
			}
			case 'gradient': {
				if (bCreateImg || !this.colorModeOptions.bDither) {
					(grImg || gr).FillGradRect(limits.x, limits.y, limits.w, limits.h, this.colorModeOptions.angle, color[0], color[1] || color[0]);
				}
				break;
			}
			case 'none':
			default:
				break;
		}
		if (this.colorModeOptions.bDither && this.colorImg) {
			gr.SetInterpolationMode(InterpolationMode.LowQuality);
			if (bCreateImg) { this.dither(this.colorImg, grImg); }
			else { this.colorImg.ReleaseGraphics(grImg); }
			gr.DrawImage(this.colorImg, limits.x, limits.y, limits.w, limits.h, 0, 0, this.colorImg.Width, this.colorImg.Height);
			gr.SetInterpolationMode();
		}
	};
	/**
	 * Paints blend fill from art
	 * @property
	 * @name paintBlend
	 * @kind method
	 * @memberof _background
	 * @param {Object} o - Arguments
	 * @param {GdiGraphics} o.gr - From on_paint
	 * @param {{x?:number, y?:number, w?:number, h?:number}} o.limits - Drawing coordinates
	 * @param {number} o.alpha
	 * @returns {boolean}
	 */
	this.paintBlend = ({
		gr,
		limits = { x, y, w, h },
		alpha = this.colorModeOptions.blendAlpha
	} = {}) => {
		if (limits.h > 1 && limits.w > 1) {
			let img;
			const intensity = 91.05 - Math.min(Math.max(this.colorModeOptions.blendIntensity, 1.05), 90);
			if (this.coverImg.art.image) {
				// To mimic Biography blend, HighQuality interpolation must be used. Cache img for given size
				if (!this.coverImg.art.blendImage || this.coverImg.art.blendImage.Width !== limits.w || this.coverImg.art.blendImage.Height !== limits.h) {
					this.coverImg.art.blendImage = this.coverImg.art.image
						.Resize(Math.max(limits.w * intensity / 100, 1), Math.max(limits.h * intensity / 100, 1), InterpolationMode.HighQuality)
						.Resize(limits.w, limits.h, InterpolationMode.HighQuality);
				}
				img = this.coverImg.art.blendImage;

			} else {
				if (!this.coverImg.art.blendUiImage) {
					this.coverImg.art.blendUiImage = applyManipulation(gdi.CreateImage(500, 500), (img, grImg, w, h) => {
						grImg.SetSmoothingMode(SmoothingMode.HighQuality);
						const bgCol = window.InstanceType === 0 ? window.GetColourCUI(3) : window.GetColourDUI(1);
						const textCol = tintColor(window.InstanceType === 0 ? window.GetColourCUI(0) : window.GetColourDUI(0), 10, bgCol);
						grImg.FillSolidRect(0, 0, w, h, textCol);
						grImg.FillGradRect(-1, 0, w + 5, h, 90, bgCol & 0xbbffffff, bgCol, 1);
						grImg.SetSmoothingMode();
						if (!this.fonts.noSel) { this.fonts.noSel = _gdiFont('Segoe UI', _scale(90, true), 1); }
						grImg.DrawString('       NO       \n SELECTION', this.fonts.noSel, textCol & 0x25ffffff, 0, 100, w, h, 0);
						grImg.FillSolidRect(60, 388, 380, 50, textCol & 0x15ffffff);
					})
						.Resize(Math.max(limits.w * intensity / 100, 1), Math.max(limits.h * intensity / 100, 1), InterpolationMode.HighQuality)
						.Resize(limits.w, limits.h, InterpolationMode.HighQuality);;
				}
				img = this.coverImg.art.blendUiImage;
			}
			gr.FillSolidRect(limits.x, limits.y, limits.w, limits.h, this.getUiColors()[0]);
			// To mimic Biography blend, coords must be translated to img source before interpolation
			gr.SetInterpolationMode(InterpolationMode.LowQuality);
			const offset = 90 - intensity;
			const destOffsetW = offset / ((limits.w - limits.x + offset * 2) / img.Width || 1);
			const destOffsetH = offset / ((limits.h - limits.y + offset * 2) / img.Height || 1);
			gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, destOffsetW, destOffsetH, img.Width - 2 * destOffsetW, img.Height - 2 * destOffsetH, this.coverModeOptions.angle, alpha);
			gr.SetInterpolationMode();
			return true;
		}
		return false;
	};
	/**
	 * Paints film strip from art folder
	 * @property
	 * @name paintFilmStrip
	 * @kind method
	 * @memberof _background
	 * @param {Object} o - Arguments
	 * @param {GdiGraphics} o.gr - From on_paint
	 * @param {{x?:number, y?:number, w?:number, h?:number}} o.limits - Drawing coordinates
	 * @returns {boolean}
	 */
	this.paintFilmStrip = ({
		gr,
		limits = { x, y, w, h },
		columnW,
		alpha = this.filmStripOptions.alpha,
		path
	} = {}) => {
		if (limits.h > 1 && limits.w > 1) {
			const files = this.getArtFilePaths(path);
			const imgCount = this.filmStrip.images.length;
			if (this.filmStrip.id !== path || imgCount === 0 && files.length !== 0) {
				// Background
				gr.FillSolidRect(limits.x, limits.y, limits.w, limits.h, RGBA(...toRGB(this.getAvgArtColor()), alpha));
				this.loadFilmStripImages({ files, path });
				return true;
			} else if (imgCount !== 0) {
				// Background
				const columns = this.w / (this.filmStripOptions.columnW || 1);
				if (imgCount <= columns) {
					gr.FillSolidRect(limits.x, limits.y, limits.w, limits.h, RGBA(...toRGB(this.getAvgArtColor()), alpha));
				}
				let x = limits.x;
				const currentImg = [...artFiles.shown].at(-1);
				// Image columns
				this.filmStrip.images.slice(this.filmStrip.offset, this.filmStrip.offset + columns + 1).forEach((img, i) => {
					gr.DrawImage(img, x, limits.y, columnW, limits.h, 0, 0, img.Width, img.Height, 0, alpha);
					// Bezel
					if (this.filmStripOptions.bezelAlpha && this.filmStrip.paths[i] === currentImg) { gr.DrawRect(x, limits.y + 1, columnW - 1, limits.h - 2, 2, RGBA(...toRGB(this.filmStripOptions.bezelColor), this.filmStripOptions.bezelAlpha)); }
					x += columnW;
				});
				return true;
			}
		}
		return false;
	};
	/**
	 * Paints image counter for art folder
	 * @property
	 * @name paintImageCounter
	 * @kind method
	 * @memberof _background
	 * @param {Object} o - Arguments
	 * @param {GdiGraphics} o.gr - From on_paint
	 * @param {{x?:number, y?:number, w?:number, h?:number}} o.limits - Drawing coordinates
	 * @param {CoverModeOptions} o.options
	 * @returns {boolean}
	 */
	this.paintImageCounter = ({
		gr,
		limits = { x, y, w, h },
		options
	} = {}) => {
		options = { ... this.coverModeOptions, ...options };
		if (limits.h > 1 && limits.w > 1) {
			const bgCol = RGBA(
				...toRGB(blendColors(
					RGBA(0, 0, 0),
					getBrightness(this.coverImg.art.colors[0].col) > 100
						? this.coverImg.art.colors[0].col
						: getBrightness(this.coverImg.art.colors[1].col) > 100
							? this.coverImg.art.colors[1].col
							: invert(this.coverImg.art.colors[0].col, true),
					0.3
				))
				, 200
			);
			const textCol = getBrightness(bgCol) > 186 ? RGBA(22, 22, 22) : RGBA(233, 233, 233);
			if (!this.fonts.artCounter) { this.fonts.artCounter = _gdiFont('Segoe UI', _scale(options.size, true), 1); }
			const text = artFiles.shown.size + '\\' + artFiles.num;
			const textW = gr.CalcTextWidth(text, this.fonts.artCounter);
			const textH = gr.CalcTextHeight(text, this.fonts.artCounter);
			const offsetW = textH / 3;
			if (options.bPathCycleCountBg) {
				gr.FillSolidRect(limits.w - offsetW - textW - _scale(3), limits.y + textH / 6, textW + _scale(6), textH * 5 / 6, bgCol);
			} else {
				gr.GdiDrawText(text, this.fonts.artCounter, invert(textCol), limits.x, limits.y, limits.w - offsetW, limits.h, DT_RIGHT | DT_TOP);
			}
			gr.GdiDrawText(text, this.fonts.artCounter, textCol, limits.x, limits.y, limits.w - offsetW, limits.h, DT_RIGHT | DT_TOP);
		}
		return false;
	};
	/**
	 * Panel painting
	 * @property
	 * @name paint
	 * @kind method
	 * @memberof _background
	 * @param {GdiGraphics} gr - From on_paint
	 * @returns {void}
	 */
	this.paint = (gr) => {
		if (this.w <= 1 || this.h <= 1) { return; }
		let profiler;
		if (this.logging.bProfile) { profiler = fb.CreateProfiler('paint'); }
		if (repaintElements.colors) {
			if (this.useColorsBlend) {
				this.paintBlend({ gr, limits: { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } });
				if (this.logging.bProfile) { profiler.Print('blend'); profiler.Reset(); }
			}
			this.paintColors({ gr, limits: { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } });
		}
		if (this.logging.bProfile) { profiler.Print('colors'); profiler.Reset(); }
		if (repaintElements.image) {
			switch (this.coverMode) {
				case 'front':
				case 'front_stub':
				case 'front_embedded':
				case 'back':
				case 'back_stub':
				case 'back_embedded':
				case 'disc':
				case 'disc_stub':
				case 'disc_embedded':
				case 'icon':
				case 'icon_stub':
				case 'icon_embedded':
				case 'artist':
				case 'artist_stub':
				case 'artist_embedded':
				case 'path':
				case 'folder': {
					if (this.coverModeOptions.fadeMask > 0 && this.coverMasks.images.length === 0) { this.loadImgMasks(); }
					if (this.coverModeOptions.reflection !== 'none' && !this.coverModeOptions.bFill && this.coverModeOptions.bProportions) {
						this.paintReflection({ gr, mode: this.coverModeOptions.reflection });
					} else {
						this.paintImage({
							gr,
							limits: { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH },
							fadeMask: this.coverModeOptions.fadeMask > 0 ? this.getFadeMask() : null,
						});
					}
					break;
				}
				case 'none':
				default:
					break;
			}
			if (this.logging.bProfile) { profiler.Print('image'); }
		}
		if (repaintElements.histogram) {
			if (this.coverImg.art.histogram) {
				this.paintHistogram({ gr, limits: { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } });
				if (this.logging.bProfile) { profiler.Print('histogram'); }
			}
		}
		if (repaintElements.filmStrip) {
			if (this.filmStripOptions.bShow && this.coverMode === 'folder') {
				const path = this.getPanelArtPath();
				if (_isFolder(path)) {
					const columnW = this.filmStripOptions.columnW;
					this.paintFilmStrip({ gr, limits: { x: this.x, y: this.h - columnW, w: this.w, h: columnW, offsetH: this.offsetH }, columnW, path });
				}
			}
		}
		this.resetRepaintElement();
	};
	/**
	 * Color image dithering
	 * @property
	 * @name dither
	 * @kind method
	 * @memberof _background
	 * @param {GdiBitmap} img - Color image
	 * @param {GdiGraphics} gr - From on_paint
	 * @returns {GdiBitmap}
	 */
	this.dither = (img, gr) => {
		const color1 = RGBA(...toRGB(this.colorModeOptions.color[0]), 20);
		const color2 = RGBA(...toRGB(this.colorModeOptions.color[1]), 10);
		const scale = Math.round(img.Height / 300);
		let rand;
		for (let i = Math.randomNum(0, 6); i < img.Height; i += Math.randomNum(0, 6)) {
			for (let j = Math.randomNum(0, 6); j < img.Width; j += Math.randomNum(0, 6)) {
				rand = Math.randomNum(0, 50);
				gr.DrawEllipse(j + rand, i + rand, 1, 1, scale, color1);
				rand = Math.randomNum(0, 50);
				gr.DrawEllipse(j - rand, i - rand, 1, 1, scale, color2);
			}
		}
		img.ReleaseGraphics(gr);
		img.StackBlur(scale * 2);
		return img;
	};
	/**
	 * Helper for debounced repainting
	 *
	 * @constant
	 * @name debounced
	 * @kind variable
	 * @private
	 * @memberof _background.constructor
	 * @type {{ [key:number]: (x:number, y:number, w:number, h:number, bForce:boolean) => void }}
	 */
	const debounced = {
		[this.timer]: debounce(window.RepaintRect, this.timer, false, window)
	};
	/**
	 * Helper for optimizing repainting
	 *
	 * @constant
	 * @name repaintElements
	 * @kind variable
	 * @private
	 * @memberof _background.constructor
	 * @type {{ filmStrip: true, image: true, colors: true, histogram: true }}
	 */
	const repaintElements = {
		filmStrip: true,
		image: true,
		colors: true,
		histogram: true
	};
	/**
	 * Panel repainting (debounced)
	 * @property
	 * @name repaint
	 * @kind method
	 * @memberof _background
	 * @param {number} timeout - [=0] If >0 it's debounced
	 * @returns {void}
	 */
	this.repaint = (timeout = 0) => {
		if (timeout === 0) { window.RepaintRect(this.x, this.y, this.x + this.w, this.y + this.h); }
		else {
			if (!Object.hasOwn(debounced, timeout)) { debounced[timeout] = debounce(window.RepaintRect, timeout, false, window); }
			debounced[timeout](this.x, this.y, this.x + this.w, this.y + this.h, true);
		}
	};
	/**
	 * Specifies elements which should be painted on next repaint call
	 * @property
	 * @name setRepaintElement
	 * @kind method
	 * @memberof _background
	 * @param {string|string[]} element
	 * @returns {void}
	 */
	this.setRepaintElement = (element) => {
		if (!Array.isArray(element)) { element = [element]; }
		for (let key in repaintElements) { repaintElements[key] = false; }
		element.forEach((key) => repaintElements[key] = true);
	};
	/**
	 * Specifies elements which should be painted on next repaint call
	 * @property
	 * @name setRepaintElement
	 * @kind method
	 * @memberof _background
	 * @param {string|string[]} element
	 * @returns {void}
	 */
	this.resetRepaintElement = () => {
		for (let key in repaintElements) { repaintElements[key] = true; }
	};
	/**
	 * Helper for debounced repainting
	 *
	 * @constant
	 * @name debouncedFilmStrip
	 * @kind variable
	 * @private
	 * @memberof _background.constructor
	 * @type {{ [key:number]: (x:number, y:number, w:number, h:number, bForce:boolean) => void }}
	 */
	const debouncedFilmStrip = {
		[this.timer]: debounce(window.RepaintRect, this.timer, false, window)
	};
	/**
	 * Panel film strip repainting (debounced)
	 * @property
	 * @name repaint
	 * @kind method
	 * @memberof _background
	 * @param {number} timeout - [=0] If >0 it's debounced
	 * @returns {void}
	 */
	this.repaintFilmStrip = (timeout = 0) => {
		this.setRepaintElement('filmStrip');
		if (timeout === 0) { window.RepaintRect(this.x, this.h - this.filmStripOptions.columnW, this.x + this.w, this.filmStripOptions.columnW); }
		else {
			if (!Object.hasOwn(debouncedFilmStrip, timeout)) { debouncedFilmStrip[timeout] = debounce(window.RepaintRect, timeout, false, window); }
			debouncedFilmStrip[timeout](this.x, this.h - this.filmStripOptions.columnW, this.x + this.w, this.filmStripOptions.columnW, true);
		}
	};
	/**
	 * Panel mouse tracing
	 * @property
	 * @name trace
	 * @kind method
	 * @memberof _background
	 * @param {number} x
	 * @param {number} y
	 * @returns {Boolean}
	 */
	this.trace = (x, y) => {
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
	};
	/**
	 * Panel film strip mouse tracing
	 * @property
	 * @name trace
	 * @kind method
	 * @memberof _background
	 * @param {number} x
	 * @param {number} y
	 * @returns {Boolean}
	 */
	this.traceFilmStrip = (x, y) => {
		return this.filmStripOptions.bShow && x > this.x && x < this.x + this.w && y > this.h - this.filmStripOptions.columnW && y < this.y + this.h;
	};
	/**
	 * Panel resizing
	 * @property
	 * @name resize
	 * @kind method
	 * @memberof _background
	 * @param {{ x?: number, y?: number, w?:number, h?:number, bRepaint?:boolean }}
	 * @returns {void}
	 */
	this.resize = ({ x = this.x, y = this.y, w = this.w, h = this.h, bRepaint = true } = {}) => {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		if (bRepaint) { this.repaint(this.timer); }
	};
	/**
	 * Change panel config and call .change callback if provided to save to properties
	 *
	 * @method
	 * @name changeConfig
	 * @kind variable
	 * @memberof _background
	 * @param {object} o - arguments
	 * @param {{x: number, y: number, w: number, h: number, offsetH?: number, coverMode: CoverMode, coverModeOptions: CoverModeOptions, colorMode: ColorMode, colorModeOptions: ColorModeOptions, timer: number, callbacks: Callbacks }} o.config
	 * @param {boolean} o.bRepaint
	 * @param {(config, arguments, callbackArgs) => void} o.callback
	 * @param {any} o.callbackArgs
	 * @returns {void}
	 */
	this.changeConfig = ({ config, bRepaint = true, callback = this.callbacks.change /* (config, arguments, callbackArgs) => void(0) */, callbackArgs = null } = {}) => {
		if (!config) { return; }
		Object.entries(config).forEach((pair) => {
			const key = pair[0];
			const value = pair[1];
			if (typeof value !== 'undefined') {
				if (Object.hasOwn(this, key)) {
					if (value && Array.isArray(value)) {
						this[key] = [...value];
					} else if (value && typeof value === 'object') {
						this[key] = { ...this[key], ...value };
					} else {
						this[key] = value;
					}
				} else { console.log('_background: invalid config key ' + key); }
			}
		});
		this.checkConfig();
		if (config.coverModeOptions && Object.hasOwn(config.coverModeOptions, 'pathCycleCount')) { this.fonts.artCounter = null; }
		if (config.coverMode || config.coverModeOptions || config.coverModePriority) { this.updateImageBg(true); }
		if (config.colorMode || config.colorModeOptions) {
			this.colorImg = null;
			if (this.colorModeOptions.bUiColors) { this.colorsChanged(false, false, false); }
			if (config.colorMode || config.colorModeOptions && Object.hasOwn(config.colorModeOptions, 'blendIntensity')) { this.resetBlendUi(); }
		}
		this.resize({ bRepaint });
		if (callback && isFunction(callback)) { callback.call(this, this.exportConfig(true), arguments[0], callbackArgs); }
	};
	/**
	 * Checks and normalizes panel settings
	 *
	 * @method
	 * @name checkConfig
	 * @kind variable
	 * @memberof _background
	 * @returns {void}
	 */
	this.checkConfig = () => {
		this.coverMode = (this.coverMode || 'none').toLowerCase();
		this.colorMode = (this.colorMode || 'none').toLowerCase();
		this.coverModeOptions.reflection = (this.coverModeOptions.reflection || 'none').toLowerCase();
		this.coverModeOptions.fillCrop = (this.coverModeOptions.fillCrop || 'center').toLowerCase();
		this.coverModeOptions.path = this.coverModeOptions.path || '';
		this.coverModeOptions.pathCycleSort = (this.coverModeOptions.pathCycleSort || 'date').toLowerCase();
		if (!this.useCover && this.useColorsBlend) { this.colorMode = 'bigradient'; }
	};
	/**
	 * Gets panel settings ready to be saved as properties
	 * @property
	 * @name exportConfig
	 * @kind method
	 * @param {boolean} bPosition - Flag to include panel position
	 * @memberof _background
	 * @returns {{coverMode: CoverMode, coverModeOptions: CoverModeOptions, colorMode: ColorMode, x?:number, y?:number, w?:number, h?:number, offsetH?:number, timer: number }}
	 */
	this.exportConfig = (bPosition = false) => {
		return {
			coverMode: this.coverMode,
			coverModePriority: [...this.coverModePriority],
			coverModeOptions: { ...this.coverModeOptions },
			colorMode: this.colorMode,
			colorModeOptions: { ...this.colorModeOptions },
			filmStripOptions: { ...this.filmStripOptions },
			...(bPosition ? { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } : {}),
			timer: this.timer,
			logging: this.logging
		};
	};
	/**
	 * Gets art from handle
	 * @property
	 * @name getHandleArt
	 * @kind method
	 * @memberof _background
	 * @param {FbMetadbHandle} handle
	 * @param {CoverMode} mode - Art type
	 * @param {Boolean} bNoLoadImg - If true, then no art loading will be performed and only path to art will be returned in
	 * @returns {Promise.<ArtPromiseResult>}
	 */
	this.getHandleArt = (handle, mode, bNoLoadImg = false) => {
		const AlbumArtId = {
			front: 0, back: 1, disc: 2, icon: 3, artist: 4,
			front_stub: 5, back_stub: 6, disc_stub: 7, icon_stub: 8, artist_stub: 9,
			front_embedded: 10, back_embedded: 11, disc_embedded: 12, icon_embedded: 13, artist_embedded: 14
		};
		const id = AlbumArtId[mode] || 0;
		return utils.GetAlbumArtAsyncV2(void (0), handle, id % 5, id < 10, id >= 10, bNoLoadImg);
	};
	/**
	 * Gets current art path which may link to a static file or file within folder set
	 * @property
	 * @name getPanelArtPath
	 * @kind method
	 * @memberof _background
	 * @param {FbMetadbHandle?} handle - Handle to evaluate path. If not provided, uses the panel handle according to settings
	 * @returns {string}
	 */
	this.getPanelArtPath = (handle) => {
		let path = _resolvePath(this.coverModeOptions.path);
		if (path.includes('$') || path.includes('%')) {
			if (!handle) { handle = this.getHandle(); }
			path = handle
				? fb.TitleFormat(path).EvalWithMetadb(handle)
				: fb.TitleFormat(path).Eval();
		}
		if (this.coverMode === 'folder' && path.length && !path.endsWith('\\')) { path += '\\'; }
		if (this.logging.bDebug) { console.log('Background - getArtPath - art TF: ' + path + ' (TF)'); }
		return path;
	};
	/**
	 * Gets current art path which may link to a static file or file within folder set
	 * @property
	 * @name getArtPath
	 * @kind method
	 * @memberof _background
	 * @param {1|-1|void} next - Use next image for folder path
	 * @param {FbMetadbHandle?} handle - Handle to evaluate path. If not provided, uses the panel handle according to settings
	 * @returns {string}
	 */
	this.getArtPath = (next, handle) => {
		const path = this.getPanelArtPath(handle);
		if (path.length) {
			if (this.coverMode === 'folder') {
				if (artFiles.root !== path) { this.resetArtFiles(path); next = 1; }
				if (typeof next === 'number') {
					this.setArtCycleTimer();
					const files = this.getArtFilePaths(path);
					if (this.logging.bDebug) { console.log('Background - getArtPath - art found: ' + files.length + ' (#)'); }
					return this.traverseArtFiles(files, Math.sign(next));
				} else {
					return this.traverseArtFiles();
				}
			} else if (path.endsWith('*.*') || path.endsWith('.*')) {
				const [folder, mask] = path.split(/([^\\]+\.\*|\*\.\*)$/i);
				const files = this.getArtFilePaths(folder, void(0), mask);
				if (this.logging.bDebug) { console.log('Background - getArtPath - art found: ' + files.length + ' (#)'); }
				return files[0] || path;
			} else {
				let file;
				['.png', '.jpg', '.jpeg', '.gif'].some((ext) => {
					if (path.endsWith('*' + ext)) {
						const [folder, mask] = path.split(/([^\\]+\.\*|\*\.\*)$/i);
						const files = this.getArtFilePaths(folder, [ext], mask);
						if (this.logging.bDebug) { console.log('Background - getArtPath - art found: ' + files.length + ' (#)'); }
						file = files[0];
						return true;
					}
				});
				return file || path;
			}
		}
		return path;
	};
	/**
	 * Retrieves matched file list within given folder
	 * @property
	 * @name getArtFilePaths
	 * @kind method
	 * @memberof _background
	 * @param {string} path - Folder path
	 * @param {string[]} extArr - [=['.png', '.jpg', '.jpeg', '.gif']]
	 * @param {string} mask - [='']
	 * @returns {string[]}
	 */
	this.getArtFilePaths = (path, extArr = ['.png', '.jpg', '.jpeg', '.gif'], mask = '') => {
		if (!_isFolder(path)) { return []; }
		return this.coverModeOptions.pathCycleSort === 'date'
			? getFiles(path, new Set(extArr), mask)
				.map((file) => { return { file, date: lastModified(file, true) }; })
				.sort((a, b) => b.date - a.date).map((o) => o.file)
			: getFiles(path, new Set(extArr))
				.sort((a, b) => strNumCollator.compare(a, b));
	};
	/**
	 * Cycles files within set art folder
	 * @property
	 * @name traverseArtFiles
	 * @kind method
	 * @memberof _background
	 * @param {string[]} files - Paths array
	 * @param {1|-1|void} delta - [=1] Cycle steps
	 * @returns {string} New image path
	 */
	this.traverseArtFiles = (files, delta) => {
		if (typeof delta === 'number') {
			artFiles.num = files.length;
			if (delta < 0) {
				files.reverse();
				for (let file of files) {
					if (file && file.length && artFiles.shown.has(file)) {
						artFiles.shown.delete(file);
						delta++;
						if (delta === 0) { return file; }
					}
				}
			} else {
				for (let file of files) {
					if (file && file.length && !artFiles.shown.has(file)) {
						artFiles.shown.add(file);
						delta--;
						if (delta === 0) { return file; }
					}
				}
			}
			if (files[0] && files[0].length) {
				artFiles.shown.clear();
				artFiles.shown.add(files[0]);
				return files[0];
			}
			return '';
		} else {
			return [...artFiles.shown].pop() || '';
		}
	};
	/**
	 * Cycles files within set art folder
	 * @property
	 * @name cycleArtFolder
	 * @kind method
	 * @memberof _background
	 * @param {1|-1|void} next - [=1] Cycle direction
	 * @returns {string} New image path
	 */
	this.cycleArtFolder = (next = 1) => {
		const path = this.getArtPath(next);
		this.updateImageBg(!!path);
		return path;
	};
	/**
	 * Cycles art mode between front-back-disc-icon-artist
	 * @property
	 * @name cycleArtMode
	 * @kind method
	 * @memberof _background
	 * @param {1|-1} next - [=1] Cycle direction
	 * @param {any} callbackArgs - [=null]
	 * @returns {string} New art mode
	 */
	this.cycleArtMode = (next = 1, callbackArgs = null) => {
		const modes = [...trackCoverModes].rotate(trackCoverModes.indexOf(this.coverMode) + Math.sign(next));
		this.changeConfig({ config: { coverMode: modes[0] }, callbackArgs });
		return modes[0];
	};
	/**
	 * Cycles art mode between front-back-disc-icon-artist but only if such art type exists
	 * @property
	 * @async
	 * @name cycleArtModeAsync
	 * @kind method
	 * @memberof _background
	 * @param {1|-1} next - [=1] Cycle direction
	 * @param {any} callbackArgs - [=null]
	 * @returns {Promise.<string>} New art mode
	 */
	this.cycleArtModeAsync = async (next = 1, callbackArgs = null) => {
		const modes = [...trackCoverModes].rotate(trackCoverModes.indexOf(this.coverMode) + Math.sign(next));
		let bDone;
		const handle = this.getHandle();
		for (let i = 0; i < modes.length; i++) { // NOSONAR
			bDone = await this.getHandleArt(handle, modes[0], true)
				.then((artPromise) => {
					if (artPromise.path.length) {
						this.changeConfig({ config: { coverMode: modes[0] }, callbackArgs });
						return true;
					}
					return false;
				});
			if (bDone) { break; }
			modes.rotate();
		}
		return modes[0];
	};
	/**
	 * Cycles art mode (all) or folder image according to current mode
	 * @property
	 * @name cycleArt
	 * @kind method
	 * @memberof _background
	 * @param {1|-1} next - [=1] Cycle direction
	 * @param {any} callbackArgs - [=null]
	 * @returns {string}
	 */
	this.cycleArt = (next = 1, callbackArgs = null) => {
		if (this.coverMode === 'folder') { return this.cycleArtFolder(next); }
		else if (trackCoverModes.includes(this.coverMode)) { return this.cycleArtMode(next, callbackArgs); }
	};
	/**
	 * Cycles art mode (only between those available) or folder image according to current mode
	 * @property
	 * @name cycleArt
	 * @kind method
	 * @memberof _background
	 * @param {1|-1} next - [=1] Cycle direction
	 * @param {any} callbackArgs - [=null]
	 * @returns {Promise.<string>}
	 */
	this.cycleArtAsync = (next = 1, callbackArgs = null) => {
		if (this.coverMode === 'folder') { return Promise.resolve(this.cycleArtFolder(next)); }
		else if (trackCoverModes.includes(this.coverMode)) { return this.cycleArtModeAsync(next, callbackArgs); }
	};
	/**
	 * Sets art cycling timer
	 * @property
	 * @name setArtCycleTimer
	 * @kind method
	 * @memberof _background
	 * @returns {number} Timer id
	 */
	this.setArtCycleTimer = () => {
		if (this.coverModeOptions.pathCycleTimer > 0) {
			if (artFiles.timer !== null) { clearTimeout(artFiles.timer); }
			artFiles.timer = setTimeout(() => this.cycleArtFolder(), this.coverModeOptions.pathCycleTimer);
		}
		return artFiles.timer;
	};
	/**
	 * Resets visited art files history
	 * @property
	 * @name resetArtFiles
	 * @kind method
	 * @memberof _background
	 * @param {string?} root
	 * @returns {string}
	 */
	this.resetArtFiles = (root) => {
		artFiles.root = root || '';
		artFiles.num = -1;
		artFiles.shown.clear();
		clearTimeout(artFiles.timer);
		artFiles.timer = null;
	};
	/**
	 * Art files history
	 *
	 * @constant
	 * @name debounced
	 * @kind variable
	 * @private
	 * @memberof _background
	 * @type {{num: number, root: string, shown: Set<String>}}
	 */
	const artFiles = {
		root: '',
		num: 0,
		shown: new Set(),
		timer: null
	};
	/**
	 * Reset art img
	 * @property
	 * @name resetArt
	 * @kind method
	 * @memberof _background
	 * @param {Boolean?} bRepaint - [=false] Repaint panel on reset if it already had an image cached
	 * @returns {Boolean} True if panel had an image cached and was reset
	 */
	this.resetArt = (bRepaint = false) => {
		const bHadImage = !!this.coverImg.art.image;
		this.coverImg.art.path = null;
		this.coverImg.art.image = null;
		this.coverImg.art.colors = null;
		this.coverImg.art.histogram = null;
		this.coverImg.art.blendImage = null;
		this.coverImg.handle = null;
		this.coverImg.id = null;
		if (bRepaint && bHadImage) { this.repaint(); }
		return !bHadImage;
	};
	/**
		 * Reset blend stub image
		 * @property
		 * @name resetBlendUi
		 * @kind method
		 * @memberof _background
		 * @returns {void}
		 */
	this.resetBlendUi = () => {
		this.coverImg.art.blendUiImage = null;
	};
	/**
	 * Reset film strip
	 * @property
	 * @name resetFilmStrip
	 * @kind method
	 * @memberof _background
	 * @returns {void}
	 */
	this.resetFilmStrip = () => {
		this.filmStrip.images = [];
		this.filmStrip.paths = [];
		this.filmStrip.offset = 0;
		this.filmStrip.id = null;
	};
	/**
	 * Returns available cover modes plus 'none' as first value
	 * @property
	 * @name getCoverModes
	 * @kind method
	 * @memberof _background
	 * @param {boolean} bNone - If true, includes none
	 * @returns {CoverMode[]}
	 */
	this.getCoverModes = (bNone = true) => {
		return bNone
			? ['none', ...trackCoverModes]
			: [...trackCoverModes];
	};
	/**
	 * Returns first available cover mode
	 * @property
	 * @name getDefaultCoverMode
	 * @kind method
	 * @memberof _background
	 * @returns {CoverMode}
	 */
	this.getDefaultCoverMode = () => {
		return trackCoverModes[0];
	};
	/**
	 * Gets panel handle
	 * @property
	 * @name getHandle
	 * @kind method
	 * @memberof _background
	 * @returns {FbMetadbHandle}
	 */
	this.getHandle = () => {
		return (this.coverModeOptions.bNowPlaying ? fb.GetNowPlaying() : null) || (this.coverModeOptions.bNowPlaying && this.coverModeOptions.bNoSelection ? null : fb.GetFocusItem(true));
	};
	/**
	 * Retrieves and loads (if not previously cached) filmstrip images for given path
	 * @property
	 * @name getFilmStripImages
	 * @kind method
	 * @memberof _background
	 * @param {Object} o - Arguments
	 * @param {string[]} o.files - List of image files. If not provided, retrieves current list from path.
	 * @param {string} o.path - Root
	 * @returns {Promise.<{ images: GdiBitmap[], paths: string[] offset: number, id: string|null }>}
	 */
	this.getFilmStripImages = ({
		files,
		path
	} = {}) => {
		if (!files) { files = this.getArtFilePaths(path); }
		return this.filmStrip.id !== path || this.filmStrip.images.length === 0 && files.length
			? this.loadFilmStripImages({ files, path })
			: Promise.resolve(this.filmStrip);
	};
	/**
	 * Loads filmstrip images for given path, overriding any current ones
	 * @property
	 * @name loadFilmStripImages
	 * @kind method
	 * @memberof _background
	 * @param {Object} o - Arguments
	 * @param {string[]} o.files - List of image files. If not provided, retrieves current list from path.
	 * @param {string} o.path - Root
	 * @returns {Promise.<{ images: GdiBitmap[], paths: string[] offset: number, id: string|null }>}
	 */
	this.loadFilmStripImages = ({
		files,
		path
	} = {}) => {
		if (!files) { files = this.getArtFilePaths(path); }
		return Promise.parallel(files, (p) => gdi.LoadImageAsyncV2(window.ID, p).then((img) => { return { img, path: p }; }))
			.then((result) => {
				const imgArr = result.map((r) => r.status === 'fulfilled' ? r.value : null)
					.filter((v) => v && v.img && v.img.Width && v.img.Height);
				this.filmStrip.images = imgArr.map((v) => v.img);
				this.filmStrip.paths = imgArr.map((v) => v.path);
				this.filmStrip.id = path;
				this.repaint(this.timer);
				return this.filmStrip;
			});
	};
	/**
	 * Loads all available mask files (png)
	 * @property
	 * @name loadImgMasks
	 * @kind method
	 * @memberof _background
	 * @param {number} max - [=50] Limit of files to load
	 * @returns {Boolean}
	 */
	this.loadImgMasks = (max = 50) => {
		this.coverMasks.paths = [];
		this.coverMasks.images = [];
		let count = 0;
		getFiles(folders.xxx + 'images\\masks\\', new Set(['.png']))
			.some((path) => {
				try {
					const img = gdi.Image(path);
					if (img) {
						this.coverMasks.paths.push(path);
						this.coverMasks.images.push(img);
						count++;
					}
				} catch (e) {
					if (this.logging.bError) { console.log('Background - loadImgMasks: img loading error ' + path + '\n\t' + e.message); }
				}
				if (count === max) { return true; }
			});
		return this.coverMasks.images.length !== 0;
	};
	/**
	 * Retrieves mask function to be used on this.paintImage
	 * @property
	 * @name getFadeMask
	 * @kind method
	 * @memberof _background
	 * @param {number} idx - [=this.coverModeOptions.fadeMask - 1] Image mask idx
	 * @returns {((mask, gr, w, h) => void)|null}
	 */
	this.getFadeMask = (idx = this.coverModeOptions.fadeMask - 1) => {
		return this.coverMasks.images.length // Paint the mask with the same logic than main img
			? (mask, gr, w, h) => {
				this.paintImage({
					gr,
					limits: { x: 0, y: 0, w, h, offsetH: this.offsetH },
					img: this.coverMasks.images[idx],
					fill: RGBA(0, 0, 0),
					options: { alpha: 255 }
				});
				mask.StackBlur(3);
			}
			: null;
	};
	/**
	 * Gets all art colors from panel if available
	 * @property
	 * @name getArtColors
	 * @kind method
	 * @memberof _background
	 * @returns {number[]|null}
	 */
	this.getArtColors = () => {
		return this.useCover && !!this.coverImg.art.image && !!this.coverImg.art.colors
			? this.coverImg.art.colors.map((c) => c.col)
			: null;
	};
	/**
	 * Gets colors from color settings
	 * @property
	 * @name getDrawColors
	 * @kind method
	 * @memberof _background
	 * @returns {[number, number?]|null}
	 */
	this.getDrawColors = () => {
		return this.colorMode === 'none'
			? null
			: (this.colorModeOptions.color.filter(Boolean).length
				? [
					this.colorModeOptions.color[0],
					this.colorMode === 'bigradient' || this.colorMode === 'gradient'
						? this.colorModeOptions.color[1] || this.colorModeOptions.color[0]
						: null
				]
				: [
					window.InstanceType === 0 ? window.GetColourCUI(3) : window.GetColourDUI(1),
					this.colorMode === 'bigradient' || this.colorMode === 'gradient'
						? window.InstanceType === 0 ? window.GetColourCUI(3) : window.GetColourDUI(1)
						: null
				]
			).filter((c) => c !== null);
	};
	/**
	 * Gets colors from DUI/CUI settings
	 * @property
	 * @name getUiColors
	 * @kind method
	 * @memberof _background
	 * @returns {[number]}
	 */
	this.getUiColors = () => {
		let color;
		if (window.InstanceType === 0) {
			color = window.GetColourCUI(3);
		} else {
			color = window.GetColourDUI(1);
			// Workaround for foo_flowin using DUI and not matching global CUI theme (at least on foobar v1.6)
			if (window.IsDark && color === 4293059298) { color = RGBA(25, 25, 25); }
		}
		return [color, color];
	};
	/**
	 * Gets upt to 2 main colors from panel (either art or color settings)
	 * @property
	 * @name getPanelColors
	 * @kind method
	 * @memberof _background
	 * @returns {[number, number?]|null}
	 */
	this.getPanelColors = () => {
		return (this.getArtColors() || this.getDrawColors() || this.getUiColors()).slice(0, 2);
	};
	/**
	 * Gets average color of a color scheme
	 * @property
	 * @name getAvgColor
	 * @kind method
	 * @memberof _background
	 * @param {{col:number, freq:number}[]|number[]} colorScheme
	 * @returns {number|null}
	 */
	this.getAvgColor = (colorScheme) => {
		if (!colorScheme) { return null; }
		const len = colorScheme.length;
		if (!len) { return null; }
		let rgb = [0, 0, 0];
		let total = 0;
		colorScheme.map((c) => {
			return { col: Object.hasOwn(c, 'col') ? c.col : c, freq: Object.hasOwn(c, 'freq') ? c.freq : 1 / len };
		}).forEach((c) => {
			toRGB(c.col).forEach((v, i) => rgb[i] += v ** 2 * c.freq);
			total += c.freq;
		});
		return RGBA(...rgb.map((v) => Math.min(Math.max(Math.round(Math.sqrt(v / total)), 0), 255)));
	};
	/**
	 * Gets average color of art color scheme
	 * @property
	 * @name getAvgArtColor
	 * @kind method
	 * @memberof _background
	 * @returns {number|null}
	 */
	this.getAvgArtColor = () => {
		return this.getAvgColor(this.coverImg.art.colors);
	};
	/**
	 * Gets average color from color settings
	 * @property
	 * @name getAvgDrawColor
	 * @kind method
	 * @memberof _background
	 * @returns {number|null}
	 */
	this.getAvgDrawColor = () => {
		return this.getAvgColor(this.getDrawColors());
	};
	/**
	 * Gets average color from DUI/CUI settings
	 * @property
	 * @name getAvgDrawColor
	 * @kind method
	 * @memberof _background
	 * @returns {number|null}
	 */
	this.getAvgUiColor = () => {
		return this.getUiColors()[0];
	};
	/**
	 * Gets average color of panel, taking into consideration actual art, color and transparency settings, and the composition of background art and different color modes.
	 * @property
	 * @name getAvgColor
	 * @kind method
	 * @memberof _background
	 * @param {{col:number, freq:number}[]} extraColors
	 * @returns {number|null}
	 */
	this.getAvgPanelColor = (extraColors = []) => {
		const artAlpha = this.useCover && this.useColorsBlend
			? this.coverModeOptions.alpha + this.colorModeOptions.blendAlpha * (1 - this.coverModeOptions.alpha / 255)
			: this.useCover
				? this.coverModeOptions.alpha
				: 0;
		const bgColors = [
			{ col: this.getAvgArtColor(), freq: artAlpha / 255 },
			{ col: this.getAvgDrawColor(), freq: this.useCover && !this.useColorsBlend && this.useColors ? (255 - artAlpha) / 255 : (this.useColors ? 1 : 0) },
			{ col: this.getAvgUiColor(), freq: this.useCover && !this.useColorsBlend && !this.useColors ? (255 - artAlpha) / 255 : (!this.useCover && !this.useColors ? 1 : 0) }
		].filter((c) => c.col !== null);
		if (extraColors) {
			const len = extraColors.length;
			if (len) {
				const extraFreq = extraColors.reduce((prev, curr) => prev + Object.hasOwn(curr, 'freq') ? curr.freq : 0, 0);
				if (extraFreq === 0) {
					const freqLeft = Math.max(1 - bgColors.reduce((prev, curr) => prev + curr.freq, 0), 0);
					extraColors.map((c) => {
						return { col: Object.hasOwn(c, 'col') ? c.col : c, freq: Object.hasOwn(c, 'freq') ? c.freq : freqLeft / len };
					}).forEach((c) => bgColors.push(c));
				} else {
					const freqLeft = Math.max(1 - extraFreq, 0);
					bgColors.forEach((c) => c.freq = c.freq ? freqLeft / c.freq : 0);
				}
			}
		}
		return this.getAvgColor(bgColors.filter((c) => c.col !== null));
	};
	/**
	 * Called when colors are extracted from art, to apply colors to other elements within panel
	 * @property
	 * @name applyArtColors
	 * @kind method
	 * @memberof _background
	 * @param {Boolean} bRepaint
	 * @returns {void}
	 */
	this.applyArtColors = (bRepaint) => {
		if (!this.callbacks.artColors) { return false; }
		this.callbacks.artColors(this.getArtColors(), void (0), bRepaint);
	};
	/**
	 * Called when colors are extracted from art, to use as color server
	 * @property
	 * @name notifyArtColors
	 * @kind method
	 * @memberof _background
	 * @returns {void}
	 */
	this.notifyArtColors = () => {
		if (!this.callbacks.artColorsNotify) { return false; }
		return this.callbacks.artColorsNotify(this.getArtColors());
	};
	/** @type {boolean} */
	this.useColors; // NOSONAR
	Object.defineProperty(this, 'useColors', {
		enumerable: true,
		configurable: false,
		get: () => this.colorMode !== 'none'
	});
	/** @type {boolean} */
	this.useColorsBlend; // NOSONAR
	Object.defineProperty(this, 'useColorsBlend', {
		enumerable: true,
		configurable: false,
		get: () => this.colorMode === 'blend' && this.useCover
	});
	/** @type {boolean} - Flag which indicates wether panel is using any art or not  */
	this.useCover; // NOSONAR
	Object.defineProperty(this, 'useCover', {
		enumerable: true,
		configurable: false,
		get: () => this.coverMode !== 'none'
	});
	/** @type {boolean} - Flag which indicates if panel is using any art and also if it's visible */
	this.showCover; // NOSONAR
	Object.defineProperty(this, 'showCover', {
		enumerable: true,
		configurable: false,
		get: () => this.useCover && this.coverModeOptions.alpha > 0
	});
	/** @type {boolean} - Flag which indicates if panel can be used as color server  */
	this.useCoverColors; // NOSONAR
	Object.defineProperty(this, 'useCoverColors', {
		enumerable: true,
		configurable: false,
		get: () => this.useCover && this.coverModeOptions.bProcessColors
	});
	/** @type {boolean} - Flag which indicates if panel uses D2D rendering */
	this.useD2D; // NOSONAR
	Object.defineProperty(this, 'useD2D', {
		enumerable: true,
		configurable: false,
		get: () => window.DrawMode === 1 && typeof Effects !== 'undefined' && !this.coverModeOptions.bGdiEffects
	});
	/**
	 * Called on on_mouse_move.
	 *
	 * @property
	 * @name move
	 * @kind method
	 * @memberof _background
	 * @param {number} x
	 * @param {number} y
	 * @returns {boolean}
	*/
	this.move = (x, y) => {
		if (!window.ID) { return false; }
		if (this.trace(x, y)) {
			this.mX = x;
			this.mY = y;
			if (this.filmStripOptions.bShow) {
				if (this.traceFilmStrip(x, y)) { window.SetCursor(IDC_HAND); }
				else { window.SetCursor(IDC_ARROW); }
			}
			return true;
		}
		this.leave();
		return false;
	};
	/**
	 * Called on on_mouse_move.
	 *
	 * @property
	 * @name leave
	 * @kind method
	 * @memberof _background
	 * @returns {boolean}
	*/
	this.leave = () => {
		if (!window.ID) { return false; }
		this.mX = -1;
		this.mY = -1;
		return true;
	};
	/**
	 * Called on on_mouse_wheel.
	 *
	 * @property
	 * @name wheelResize
	 * @kind method
	 * @memberof _background
	 * @param {number} step
	 * @param {boolean} bForce
	 * @returns {boolean}
	*/
	this.wheelResize = (step, bForce, callbackArgs) => {
		if ((this.trace(this.mX, this.mY) || bForce) && step !== 0) {
			let key, min, max, delta = Math.sign(step);
			switch (true) { // NOSONAR
				case true:
					key = ['offsetH']; min = 0; max = this.h - 1; delta = - Math.sign(step) * _scale(5); break;
			}
			if (key) {
				const newConfig = {};
				const value = Math.min(Math.max(min, getNested(this, ...key) + delta), max);
				addNested(newConfig, value, ...key);
				this.changeConfig({ config: newConfig, bRepaint: true, callbackArgs });
			} else { return; }
			this.repaint(this.timer);
			return true;
		}
		return false;
	};
	/**
	 * Called on on_mouse_wheel. Scrolls through film strip.
	 *
	 * @property
	 * @name wheelFilmStrip
	 * @kind method
	 * @memberof _background
	 * @param {number} step
	 * @param {boolean} bForce
	 * @returns {boolean}
	*/
	this.wheelFilmStrip = (step, bForce, callbackArgs) => {
		if (this.filmStripOptions.bShow && (this.traceFilmStrip(this.mX, this.mY) || bForce) && step !== 0) {
			const imgCount = this.filmStrip.images.length;
			const columns = this.w / (this.filmStripOptions.columnW || 1);
			if (imgCount < columns) { return false; }
			const offset = Math.max(
				Math.min(
					this.filmStrip.offset - step,
					imgCount - 1,
					imgCount - Math.ceil(columns)
				),
				0
			);
			this.changeConfig({ config: { filmStrip: { offset } }, bRepaint: false, callbackArgs });
			this.repaintFilmStrip();
			return true;
		}
		return false;
	};
	/**
	 * Called on on_mouse_lbtn_up. Displays selected image and resets art cycling to start from such index.
	 *
	 * @property
	 * @name wheelFilmStrip
	 * @kind method
	 * @memberof _background
	 * @param {number} step
	 * @param {boolean} bForce
	 * @returns {boolean}
	*/
	this.lbtnUpFilmStrip = (x, y) => {
		if (this.filmStripOptions.bShow && this.traceFilmStrip(x, y)) {
			const idx = Math.floor((x - this.x) / (this.filmStripOptions.columnW || 1));
			if (idx >= 0 && idx < this.filmStrip.paths.length) {
				artFiles.shown.clear();
				const path = this.traverseArtFiles(this.filmStrip.paths, this.filmStrip.offset + idx + 1);
				console.log(this.filmStrip.offset + idx + 1, path);
				this.setArtCycleTimer();
				this.updateImageBg(!!path);
				this.repaint(this.timer);
				return true;
			}
		}
		return false;
	};
	/**
	 * Called on on_colors_changed.
	 *
	 * @property
	 * @name colorsChanged
	 * @kind method
	 * @memberof _background
	 * @param {boolean} bRepaint
	 * @returns {boolean}
	*/
	this.colorsChanged = (bRepaint = true, bSaveProperties = true, bChangeConfig = true) => {
		this.resetBlendUi();
		if (this.colorModeOptions.bUiColors) {
			const color = [window.InstanceType === 0 ? window.GetColourCUI(3) : window.GetColourDUI(1)];
			color[1] = RGBA(...toRGB(this.colorModeOptions.color[0]).map((v) => v + 5));
			if (bChangeConfig) { this.changeConfig({ bRepaint, config: { colorModeOptions: { color } }, callbackArgs: { bSaveProperties } }); }
			else { this.colorModeOptions.color = color; }
			return true;
		}
		return this.useColorsBlend;
	};
	/**
	 * Panel init.
	 * @property
	 * @name init
	 * @kind method
	 * @memberof _background
	 * @returns {void}
	 */
	this.init = () => {
		Object.entries(this.defaults(true, true)).forEach((pair) => {
			const key = pair[0];
			const value = pair[1];
			this[key] = value;
		});
		this.changeConfig({ config: arguments[0], bRepaint: false });
		this.updateImageBg();
	};
	/** @type {Number} - Image for internal use. Drawing colors */
	this.colorImg = null;
	/** @type {{ art: { path: string, image: GdiBitmap|null, colors: {col:number, freq:number}[]|null, histogram: number[]|null, blendImage: GdiBitmap|null, blendUiImage: GdiBitmap|null, filmStrip: GdiBitmap[] }, handle: FbMetadbHandle|null, id: string|null }} - Img properties */
	this.coverImg = { art: { path: '', image: null, colors: null, histogram: null, blendImage: null, blendUiImage: null, filmStrip: [] }, handle: null, id: null };
	/** @type {{ images: GdiBitmap[], paths: string[]}} - Image masks */
	this.coverMasks = { images: [], paths: [] };
	/** @type {{ images: GdiBitmap[], paths: string[], offset: number, id: string|null }} - Film strip properties */
	this.filmStrip = { images: [], paths: [], offset: 0, id: null };
	/**
	 * @typedef {object} filmStripOptions - Film strip settings
	 * @property {Boolean} bShow - Flag to show the film strip
	 * @property {number} columnW - Column img size
	 * @property {number} alpha - Blend effect alpha (0-255)
	 * @property {number} bezelColor - Current image bezel color
	 * @property {number} bezelAlpha - Current image bezel alpha (0-255)
	 */
	/** @type {filmStripOptions} - Film strip settings */
	this.filmStripOptions = {};
	/** @type {Number} - Panel position */
	this.x = this.y = this.w = this.h = 0;
	/** @type {Number} - Height margin for image drawing */
	this.offsetH = 0;
	/**
	 * @typedef {'none'|'front'|'back'|'disc'|'icon'|'artist'|'path'|'folder'} CoverMode - Available art modes
	 */
	/** @type {CoverMode} - Art type used by panel */
	this.coverMode = '';
	/** @type {CoverMode[]} - Art types used by priority */
	this.coverModePriority = [];
	/** @type {CoverMode[]} - Art types used by panel */
	const trackCoverModes = ['front', 'back', 'disc', 'icon', 'artist'];
	/** @typedef {'symmetric'|'asymmetric'|'none'} ReflectionMode - Available reflection modes */
	/** @typedef {'top'|'center'|'bottom'} FillCropMode - Available fill panel modes */
	/**
	 * @typedef {object} CoverModeOptions - Art settings
	 * @property {number} blur - Blur effect in px
	 * @property {number} angle - Image angle drawing (0-360)
	 * @property {number} alpha - Image opacity (0-255)
	 * @property {number} mute - Image mute effect (0-100)
	 * @property {number} vignette - Image vignette effect (0-100)
	 * @property {number} vignetteColor - Image vignette color
	 * @property {number} histogram - Image histogram display (0-1024)
	 * @property {number} fadeMask - Image mask file idx
	 * @property {boolean} bGrayScale - GrayScale effect
	 * @property {boolean} bGdiEffects - Force GDI effects while using D2D rendering
	 * @property {String} path - File or folder path for 'path' and 'folder' coverMode
	 * @property {number} pathCycleTimer - Art cycling when using 'folder' coverMode (ms)
	 * @property {'name'|'date'} pathCycleSort - Art sorting when using 'folder' coverMode
	 * @property {number} pathCycleCount - Art counter size when using 'folder' coverMode (0-Inf)
	 * @property {boolean} bPathCycleCountBg - Art counter background
	 * @property {boolean} bNowPlaying - Follow now playing
	 * @property {boolean} bNoSelection - Skip updates on selection changes
	 * @property {boolean} bProportions - Maintain art proportions
	 * @property {boolean} bFill - Fill panel
	 * @property {ReflectionMode} reflection - Reflection mode
	 * @property {FillCropMode} fillCrop - Fill panel mode
	 * @property {number} zoom - Image zoom (0-100)
	 * @property {boolean} bFlipX - Flip X-axis
	 * @property {boolean} bFlipY - Flip Y-axis
	 * @property {boolean} bCacheAlbum - Cache art from same album/folder
	 * @property {boolean} bFallbackFront - Fallback to front art if TF art is not found
	 * @property {boolean} bProcessColors - Process art colors (required as color server)
	 */
	/** @type {CoverModeOptions} - Panel art settings */
	this.coverModeOptions = {};
	/** @typedef {'single'|'gradient'|'bigradient'|'blend'|'none'} ColorMode - Available color modes */
	/** @type {ColorMode} - Color type used by panel */
	this.colorMode = '';
	/**
	 * @typedef {object} ColorModeOptions - Art settings
	 * @property {Boolean} bDither - Flag to apply dither effect
	 * @property {Boolean} bUiColors - Flag to use colors from DUI/CUI
	 * @property {boolean} bDarkBiGradOut - Flag to ensure the darkest color is used on bigradient mode
	 * @property {number} angle - Gradient angle (0-360)
	 * @property {number} focus - Gradient focus (0-1)
	 * @property {[Number, Number]} color - Array of colors (at least 2 required for gradient usage)
	 * @property {number} blendIntensity - Blend effect (0-90)
	 * @property {number} blendAlpha - Blend effect alpha (0-255)
	 */
	/** @type {ColorModeOptions} - Color settings */
	this.colorModeOptions = {};
	/** @type {{artCounter?: GdiFont, noSel?: GdiFont}} - Font objects. Init when needed */
	this.fonts = { artCounter: null, noSel: null };
	/** @type {Number} - Repainting max refresh rate */
	this.timer = 0;
	/**
	 * @typedef {object} Callbacks - Callbacks for third party integration
	 * @property {(config, arguments, callbackArgs) => void} change - Called on config changes
	 * @property {(colorArray:num[], bForced:boolean, bRepaint:boolean) => void} artColors - Called when colors are extracted from art, to apply colors to other elements within panel
	 * @property {(colorArray:num[], bForced:boolean) => void} artColorsNotify - Called when colors are extracted from art, to use as color server
	 */
	/** @type {Callbacks} - Callbacks for third party integration */
	this.callbacks = {};
	/** @type {number} - Cached X position */
	this.mX = -1;
	/** @type {number} - Cached Y position */
	this.mY = -1;
	/**
	 * @typedef {object} Logging - Panel logging related settings
	 * @property {boolean} [bProfile] - Profiling logging flag
	 * @property {boolean} [bDebug] - Debug logging flag
	 * @property {boolean} [bError] - Error logging flag
	 */
	/** @type {Logging} - Panel logging related settings */
	this.logging = {};

	this.init();
}

_background.defaults = (bPosition = false, bCallbacks = false) => {
	return {
		...(bPosition ? { x: 0, y: 0, w: window.Width, h: window.Height } : {}),
		offsetH: _scale(1),
		timer: 60,
		coverMode: 'front',
		coverModeOptions: { blur: 0, bCircularBlur: false, angle: 0, alpha: 0, mute: 0, edgeGlow: 0, bloom: 0, vignette: 0, vignetteColor: RGBA(0, 0, 0), histogram: 0, fadeMask: 0, bGrayScale: false, bGdiEffects: false, path: '', pathCycleTimer: 10000, pathCycleSort: 'date', pathCycleCount: 30, bPathCycleCountBg: true, bNowPlaying: true, bNoSelection: false, bProportions: true, bFill: true, fillCrop: 'center', zoom: 0, reflection: 'none', bFlipX: false, bFlipY: false, bCacheAlbum: true, bProcessColors: true, bFallbackFront: false },
		colorMode: 'blend',
		colorModeOptions: { bDither: true, bUiColors: false, bDarkBiGradOut: true, angle: 91, focus: 1, color: [0xff2e2e2e, 0xff212121], blendIntensity: 90, blendAlpha: 105 }, // RGB(45,45,45), RGB(33,33,33)
		filmStripOptions: { bShow: false, columnW: 75, alpha: 255, bezelColor: RGBA(0, 0, 0), bezelAlpha: 200 },
		...(bCallbacks
			? {
				callbacks: {
					change: null, /* (config, arguments, callbackArgs) => void(0) */
					artColors: null /* (colorArray, bForced) => void(0) */,
					artColorsNotify: null /* (colorArray, bForced) => void(0) */,
				}
			}
			: {}
		),
		logging: { bProfile: false, bDebug: false, bError: true }
	};
};