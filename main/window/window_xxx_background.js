'use strict';
//16/01/26

/* exported _background */

include('window_xxx_helpers.js');
/* global debounce:readable, InterpolationMode:readable, RGBA:readable, toRGB:readable , isFunction:readable , _scale:readable, _resolvePath:readable, applyAsMask:readable, applyMask:readable, getFiles:readable, strNumCollator:readable, lastModified:readable, getNested:readable, addNested:readable, RotateFlipType:readable, getBrightness:readable */

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
	 * Updates background image based from preferred handle and calls color callbacks.
	 * @function
	 * @name updateImageBg
	 * @kind method
	 * @memberof _background
	 * @type {(bForce:boolean, onDone:function) => void}
	 * @param {Boolean} bForce - [=false]
	 * @param {Function?} onDone - [=null]
	 * @returns {void}
	 */
	this.updateImageBg = debounce((bForce = false, onDone = null, bRepaint = true) => {
		if (!this.useCover) {
			this.coverImg.art.path = null; this.coverImg.art.image = null; this.coverImg.art.colors = null;
			this.coverImg.handle = null; this.coverImg.id = null;
		}
		if (!this.coverModeOptions.bProcessColors) { this.coverImg.art.colors = null; }
		if (!this.useColors || this.useColorsBlend) { this.colorImg = null; }
		else if (!this.useCover) { this.colorsChanged(bRepaint, true, false); }
		if (!this.useCover) { return; }
		const handle = this.getHandle();
		const bPath = ['path', 'folder'].includes(this.coverMode);
		const path = bPath ? this.getArtPath(void (0), handle) : '';
		const bFoundPath = bPath && path.length;
		if (!bForce && (handle && this.coverImg.handle === handle.RawPath || bPath && this.coverImg.art.path === path)) { return; }
		let id = null;
		if (this.coverModeOptions.bCacheAlbum && handle) {
			const tf = fb.TitleFormat('%ALBUM%|$directory(%PATH%,1)');
			id = tf.EvalWithMetadb(handle);
			if (!bForce && id === this.coverImg.id) {
				if (onDone && isFunction(onDone)) { onDone(this.coverImg); }
				return;
			}
		}
		const AlbumArtId = { front: 0, back: 1, disc: 2, icon: 3, artist: 4 };
		let profiler;
		if (this.logging.bProfile) { profiler = new FbProfiler('loadImg'); }
		const promise = bFoundPath
			? gdi.LoadImageAsyncV2('', path)
			: handle
				? utils.GetAlbumArtAsyncV2(void (0), handle, AlbumArtId[this.coverMode] || 0, true, false, false)
				: Promise.reject(new Error('No handle/art'));
		promise.then((result) => {
			if (this.logging.bProfile) { profiler.Print(); }
			if (bFoundPath) {
				this.coverImg.art.image = result;
				this.coverImg.handle = this.coverImg.art.path = path;
			} else {
				if (!result.image) { throw new Error('Image not available'); }
				this.coverImg.art.image = result.image;
				this.coverImg.art.path = result.path;
				this.coverImg.handle = handle.RawPath;
				this.coverImg.id = id;
			}
			this.processArtColors();
			this.processArtEffects();
		}).catch(() => {
			this.coverImg.art.path = null; this.coverImg.art.image = null; this.coverImg.art.colors = null;
			this.coverImg.handle = null; this.coverImg.id = null;
		}).finally(() => {
			this.applyArtColors(bRepaint);
			this.notifyArtColors();
			if (bRepaint) { this.repaint(); }
			if (onDone && isFunction(onDone)) { onDone(this.coverImg); }
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
		if (this.logging.bProfile) { profiler = new FbProfiler('processArtColors'); }
		if (this.coverImg.art.image && this.coverModeOptions.bProcessColors) {
			this.coverImg.art.colors = JSON.parse(this.coverImg.art.image.GetColourSchemeJSON(6));
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
		if (this.logging.bProfile) { profiler = new FbProfiler('processArtEffects'); }
		if ((this.showCover || this.useColorsBlend) && !!this.coverImg.art.image) {
			let intensity;
			if (this.coverModeOptions.bFlipX && this.coverModeOptions.bFlipY) {
				this.coverImg.art.image.RotateFlip(RotateFlipType.RotateNoneFlipXY);
			} else if (this.coverModeOptions.bFlipX) {
				this.coverImg.art.image.RotateFlip(RotateFlipType.RotateNoneFlipX);
			} else if (this.coverModeOptions.bFlipY) {
				this.coverImg.art.image.RotateFlip(RotateFlipType.RotateNoneFlipY);
			}
			if (this.coverModeOptions.mute !== 0 && Number.isInteger(this.coverModeOptions.mute)) {
				intensity = Math.max(Math.min(this.coverModeOptions.mute / 100 * 255, 255), 0);
				applyMask(this.coverImg.art.image, (mask, gr, w, h) => {
					gr.DrawImage(this.coverImg.art.image, 0, 0, w, h, 0, 0, w, h, 0, intensity / 2);
					mask.StackBlur(5);
				});
				applyMask(this.coverImg.art.image, (mask, gr, w, h) => {
					gr.DrawImage(this.coverImg.art.image.InvertColours(), 0, 0, w, h, 0, 0, w, h, 0, intensity);
					mask.StackBlur(10);
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
						mask.StackBlur(1);
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
						mask.StackBlur(50);
					}, true
				);
				applyAsMask(
					this.coverImg.art.image,
					(img) => img.StackBlur(10),
					(mask, gr, w, h) => { gr.DrawImage(this.coverImg.art.image.InvertColours(), 0, 0, w, h, 0, 0, w, h); },
				);
			}
			if (this.coverModeOptions.blur !== 0 && Number.isInteger(this.coverModeOptions.blur)) {
				intensity = Math.max(this.coverModeOptions.blur, 0);
				if (this.coverModeOptions.bCircularBlur) {
					this.coverImg.art.image.StackBlur(Math.max(intensity / 5, 1));
					applyAsMask(
						this.coverImg.art.image,
						(img) => img.StackBlur(intensity),
						(mask, gr, w, h) => { gr.FillEllipse(w / 4, h / 4, w / 2, h / 2, 0xFFFFFFFF); mask.StackBlur(w / 10); },
					);
				} else {
					this.coverImg.art.image.StackBlur(intensity);
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
	 * @param {(mask, gr, w, h) => void} o.fadeMask - Fading mask for reflections. Use something like (mask, gr, w, h) => gr.FillGradRect(w / 2, 0, w, h, 0, 0xFFFFFFFF, 0xFF000000)
	 * @param {{opacity:number}|null} o.fill - Used for panel filling instead of internal settings
	 * @returns {void}
	 */
	this.paintImage = ({
		gr,
		limits = { x, y, w, h, offsetH },
		rotateFlip = RotateFlipType.RotateNoneFlipNone,
		fadeMask = null,
		fill = null, alpha = this.coverModeOptions.alpha
	} = {}) => {
		if (this.coverImg.art.image && alpha > 0) {
			gr.SetInterpolationMode(InterpolationMode.InterpolationModeBilinear);
			const img = fadeMask
				? this.coverImg.art.image.Clone(0, 0, this.coverImg.art.image.Width, this.coverImg.art.image.Height)
				: this.coverImg.art.image;
			if (rotateFlip !== RotateFlipType.RotateNoneFlipNone) { img.RotateFlip(rotateFlip); }
			if (fadeMask) {
				applyMask(
					img,
					fadeMask,
					true
				);
			}
			if (fill) {
				gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, 0, img.Height / 2, Math.min(img.Width, limits.w), Math.min(img.Height, limits.h), this.coverModeOptions.angle, fill.opacity);
			} else {
				const zoomX = this.coverModeOptions.zoom > 0
					? Math.max(Math.min(this.coverModeOptions.zoom / 100, 0.99), 0) * img.Width / 2
					: 0;
				const zoomY = this.coverModeOptions.zoom > 0
					? Math.max(Math.min(this.coverModeOptions.zoom / 100, 0.99), 0) * img.Height / 2
					: 0;
				if (this.coverModeOptions.bFill && this.coverModeOptions.bProportions) {
					const prop = limits.w / (limits.h - limits.offsetH);
					const imgProp = img.Width / img.Height;
					if (imgProp > prop) {
						gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
							img.Width * (1 - prop / imgProp) / 2 + zoomX * prop / imgProp,
							zoomY,
							(img.Width - zoomX * 2) * prop / imgProp,
							img.Height - zoomY * 2,
							this.coverModeOptions.angle, alpha
						);
					} else {
						switch (this.coverModeOptions.fillCrop) {
							case 'top': {
								gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
									zoomX,
									zoomY / prop,
									img.Width - zoomX * 2,
									(img.Width - zoomY * 2) / prop,
									this.coverModeOptions.angle, alpha
								);
								break;
							}
							case 'bottom': {
								gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
									zoomX,
									(img.Height - img.Width / prop) + zoomY / prop,
									img.Width - zoomX * 2,
									(img.Width - zoomY * 2) / prop,
									this.coverModeOptions.angle, alpha
								);
								break;
							}
							case 'center':
							default: {
								gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
									zoomX,
									(img.Height - img.Width / prop) / 2 + zoomY / prop,
									img.Width - zoomX * 2,
									(img.Width - zoomY * 2) / prop,
									this.coverModeOptions.angle, alpha
								);
							}
						}
					}
				} else {
					let w, h;
					if (this.coverModeOptions.bProportions) {
						const prop = limits.w / (limits.h - limits.offsetH);
						const imgProp = img.Width / img.Height;
						if (imgProp > prop) {
							w = limits.w;
							h = (limits.h - limits.offsetH) / imgProp * prop;
						} else {
							w = limits.w * imgProp / prop;
							h = (limits.h - limits.offsetH);
						}
					} else { [w, h] = [limits.w, limits.h]; }
					gr.DrawImage(img,
						limits.x + (limits.w - w) / 2,
						Math.max((limits.h - limits.y - h) / 2 + limits.y, limits.y),
						w,
						h,
						zoomX, zoomY, img.Width - zoomX * 2, img.Height - zoomY * 2, this.coverModeOptions.angle, alpha
					);
				}
			}
			gr.SetInterpolationMode(InterpolationMode.Default);
		}
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
			const prop = this.w / (this.h - this.offsetH);
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
						alpha: this.coverModeOptions.alpha * 0.4
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
						alpha: this.coverModeOptions.alpha * 0.75
					});
					this.paintImage({
						gr,
						limits: { x: this.w - x - w, y: this.y, w, h: this.h, offsetH: this.offsetH },
						rotateFlip: RotateFlipType.RotateNoneFlipX,
						fadeMask: (mask, gr, w, h) => gr.FillGradRect(0, 0, w / 2 + w / 4, h, 0.1, 0xFF000000, 0xFFFFFFFF),
						alpha: this.coverModeOptions.alpha * 0.75
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
			case 'blend': {
				if (this.coverImg.art.image) { break; }
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
			if (bCreateImg) { this.dither(this.colorImg, grImg); }
			this.colorImg.ReleaseGraphics(grImg);
			gr.DrawImage(this.colorImg, limits.x, limits.y, limits.w, limits.h, 0, 0, this.colorImg.Width, this.colorImg.Height);
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
	 * @returns {boolean}
	 */
	this.paintBlend = ({
		gr,
		limits = { x, y, w, h },
		alpha = this.colorModeOptions.blendAlpha
	} = {}) => {
		if (this.useColorsBlend && !!this.coverImg.art.image && limits.h > 1 && limits.w > 1) {
			const intensity = 91.05 - Math.min(Math.max(this.colorModeOptions.blendIntensity, 1.05), 90);
			const img = this.coverImg.art.image.Clone(0, 0, this.coverImg.art.image.Width, this.coverImg.art.image.Height)
				.Resize(Math.max(limits.w * intensity / 100, 1), Math.max(limits.h * intensity / 100, 1), 2)
				.Resize(limits.w, limits.h, 2);
			const offset = 90 - intensity;
			gr.FillSolidRect(limits.x, limits.y, limits.w, limits.h, this.getUiColors()[0]);
			gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, offset / 2, offset / 2, img.Width - offset, img.Height - offset, this.coverModeOptions.angle, alpha);
			return true;
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
		this.paintBlend({ gr, limits: { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } });
		if (this.logging.bProfile) { profiler.Print('blend'); profiler.Reset(); }
		this.paintColors({ gr, limits: { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } });
		if (this.logging.bProfile) { profiler.Print('colors'); profiler.Reset(); }
		switch (this.coverMode) {
			case 'front':
			case 'back':
			case 'disc':
			case 'icon':
			case 'artist':
			case 'path':
			case 'folder': {
				if (this.coverModeOptions.reflection !== 'none' && !this.coverModeOptions.bFill && this.coverModeOptions.bProportions) {
					this.paintReflection({ gr, mode: this.coverModeOptions.reflection });
				} else {
					this.paintImage({ gr, limits: { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } });
				}
				break;
			}
			case 'none':
			default:
				break;
		}
		if (this.logging.bProfile) { profiler.Print('image'); }
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
				if (value && Array.isArray(value)) {
					this[key] = [...this[key], ...value];
				} else if (value && typeof value === 'object') {
					this[key] = { ...this[key], ...value };
				} else {
					this[key] = value;
				}
			}
		});
		this.checkConfig();
		if (config.coverMode || config.coverModeOptions) { this.updateImageBg(true); }
		if (config.colorMode || config.colorModeOptions) {
			this.colorImg = null;
			if (this.colorModeOptions.bUiColors) { this.colorsChanged(false, false, false); }
			if (config.colorMode === 'blend' && !(config.coverMode || config.coverModeOptions)) { this.updateImageBg(true); }
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
			coverModeOptions: { ...this.coverModeOptions },
			colorMode: this.colorMode,
			colorModeOptions: { ...this.colorModeOptions },
			...(bPosition ? { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } : {}),
			timer: this.timer
		};
	};
	/**
	 * Gets current art path which may link to a static file or file within folder set
	 * @property
	 * @name getArtPath
	 * @kind method
	 * @memberof _background
	 * @param {1|-1|void} next - Use next image for folder path
	 * @returns {string}
	 */
	this.getArtPath = (next, handle) => {
		let path = _resolvePath(this.coverModeOptions.path);
		if (path.includes('$') || path.includes('%')) {
			if (!handle) { handle = this.getHandle(); }
			path = handle
				? fb.TitleFormat(path).EvalWithMetadb(handle)
				: fb.TitleFormat(path).Eval();
		}
		if (this.coverMode === 'folder' && path.length) {
			if (artFiles.root !== path) { this.resetArtFiles(path); next = 1; }
			if (typeof next === 'number') {
				next = Math.sign(next);
				if (this.coverModeOptions.pathCycleTimer > 0) {
					if (artFiles.timer !== null) { clearTimeout(artFiles.timer); }
					artFiles.timer = setTimeout(() => this.cycleArtFolder(), this.coverModeOptions.pathCycleTimer);
				}
				const files = this.coverModeOptions.pathCycleSort === 'date'
					? getFiles(path, new Set(['.png', '.jpg', '.jpeg', '.gif']))
						.map((file) => { return { file, date: lastModified(file, true) }; })
						.sort((a, b) => b.date - a.date).map((o) => o.file)
					: getFiles(path, new Set(['.png', '.jpg', '.jpeg', '.gif']))
						.sort((a, b) => strNumCollator.compare(a, b));
				artFiles.num = files.length;
				if (next === -1) {
					files.reverse();
					for (let file of files) {
						if (file && file.length && artFiles.shown.has(file)) {
							artFiles.shown.delete(file);
							return file;
						}
					}
				} else {
					for (let file of files) {
						if (file && file.length && !artFiles.shown.has(file)) {
							artFiles.shown.add(file);
							return file;
						}
					}
				}
				if (files[0] && files[0].length) {
					artFiles.shown.clear();
					artFiles.shown.add(files[0]);
					return files[0];
				}
			} else {
				return [...artFiles.shown].pop() || '';
			}
		}
		return path;
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
	 * @param {1|-1|void} next - [=1] Cycle direction
	 * @returns {string} New art mode
	 */
	this.cycleArtMode = (next = 1, callbackArgs) => {
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
	 * @param {1|-1|void} next - [=1] Cycle direction
	 * @returns {Promise.<string>} New art mode
	 */
	this.cycleArtModeAsync = async (next = 1, callbackArgs) => {
		const modes = [...trackCoverModes].rotate(trackCoverModes.indexOf(this.coverMode) + Math.sign(next));
		const AlbumArtId = { front: 0, back: 1, disc: 2, icon: 3, artist: 4 };
		let bDone;
		for (let i = 0; i < modes.length; i++) {
			bDone = await utils.GetAlbumArtAsyncV2(void (0), this.getHandle(), AlbumArtId[modes[0]] || 0, true, false, true)
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
	 * @param {1|-1|void} next - [=1] Cycle direction
	 * @returns {string}
	 */
	this.cycleArt = (next = 1, callbackArgs) => {
		if (this.coverMode === 'folder') { return this.cycleArtFolder(next); }
		else if (trackCoverModes.includes(this.coverMode)) { return this.cycleArtMode(next, callbackArgs); }
	};
	/**
	 * Cycles art mode (only between those available) or folder image according to current mode
	 * @property
	 * @name cycleArt
	 * @kind method
	 * @memberof _background
	 * @param {1|-1|void} next - [=1] Cycle direction
	 * @returns {Promise.<string>}
	 */
	this.cycleArtAsync = (next = 1, callbackArgs) => {
		if (this.coverMode === 'folder') { return Promise.resolve(this.cycleArtFolder(next)); }
		else if (trackCoverModes.includes(this.coverMode)) { return this.cycleArtModeAsync(next, callbackArgs); }
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
	 * Returns available cover modes plus 'none' as first value
	 * @property
	 * @name getCoverModes
	 * @kind method
	 * @memberof _background
	 * @returns {CoverMode[]}
	 */
	this.getCoverModes = () => {
		return ['none', ...trackCoverModes];
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
	 * @param {{col:number, freq:number}[]|number[]}
	 * @returns {number|null}
	 */
	this.getAvgColor = (colorScheme) => {
		if (!colorScheme) { return null; }
		let rgb = [0, 0, 0];
		let total = 0;
		colorScheme.map((c) => {
			return { col: Object.hasOwn(c, 'col') ? c.col : c, freq: Object.hasOwn(c, 'freq') ? c.freq : 1 / colorScheme.length };
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
	 * Gets average color of panel, taking into consideration actual art and color settings
	 * @property
	 * @name getAvgColor
	 * @kind method
	 * @memberof _background
	 * @param {{col:number, freq:number}[]} extraColors
	 * @returns {number|null}
	 */
	this.getAvgPanelColor = (extraColors = []) => {
		const bgColors = [
			{ col: this.getAvgArtColor(), freq: this.useCover ? this.coverModeOptions.alpha / 255 : 0 },
			{ col: this.getAvgDrawColor(), freq: this.useCover && this.useColors ? (255 - this.coverModeOptions.alpha) / 255 : (this.useColors ? 1 : 0) },
			{ col: this.getAvgUiColor(), freq: this.useCover && !this.useColors ? (255 - this.coverModeOptions.alpha) / 255 : (!this.useCover && !this.useColors ? 1 : 0) }
		].filter((c) => c.col !== null);
		if (extraColors && extraColors.length) {
			const extraFreq = extraColors.reduce((prev, curr) => prev + Object.hasOwn(curr, 'freq') ? curr.freq : 0, 0);
			if (extraFreq !== 0) {
				const freqLeft = Math.max(1 - extraFreq, 0);
				bgColors.forEach((c) => c.freq = freqLeft / c.freq);
			} else {
				const freqLeft = Math.max(1 - bgColors.reduce((prev, curr) => prev + curr.freq, 0), 0);
				extraColors.map((c) => {
					return { col: Object.hasOwn(c, 'col') ? c.col : c, freq: Object.hasOwn(c, 'freq') ? c.freq : freqLeft / extraColors.length };
				}).forEach((c) => bgColors.push(c));
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
	this.useColors;
	Object.defineProperty(this, 'useColors', {
		enumerable: true,
		configurable: false,
		get: () => this.colorMode !== 'none'
	});
	/** @type {boolean} */
	this.useColorsBlend;
	Object.defineProperty(this, 'useColorsBlend', {
		enumerable: true,
		configurable: false,
		get: () => this.colorMode === 'blend' && this.useCover
	});
	/** @type {boolean} - Flag which indicates wether panel is using any art or not  */
	this.useCover;
	Object.defineProperty(this, 'useCover', {
		enumerable: true,
		configurable: false,
		get: () => this.coverMode !== 'none'
	});
	/** @type {boolean} - Flag which indicates if panel is using any art and also if it's visible */
	this.showCover;
	Object.defineProperty(this, 'showCover', {
		enumerable: true,
		configurable: false,
		get: () => this.useCover && this.coverModeOptions.alpha > 0
	});
	/** @type {boolean} - Flag which indicates if panel can be used as color server  */
	this.useCoverColors;
	Object.defineProperty(this, 'useCoverColors', {
		enumerable: true,
		configurable: false,
		get: () => this.useCover && this.coverModeOptions.bProcessColors
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
			switch (true) {
				case true:
					key = ['offsetH']; min = 0; max = this.h - 1; delta = - Math.sign(step) * _scale(5); break;
			}
			if (!key) { return; }
			else {
				const newConfig = {};
				const value = Math.min(Math.max(min, getNested(this, ...key) + delta), max);
				addNested(newConfig, value, ...key);
				this.changeConfig({ config: newConfig, bRepaint: true, callbackArgs });
			}
			this.repaint(this.timer);
			return true;
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
		if (this.colorModeOptions.bUiColors) {
			const color = [window.InstanceType === 0 ? window.GetColourCUI(3) : window.GetColourDUI(1)];
			color[1] = RGBA(...toRGB(this.colorModeOptions.color[0]).map((v) => v + 5));
			if (bChangeConfig) { this.changeConfig({ bRepaint, config: { colorModeOptions: { color } }, callbackArgs: { bSaveProperties } }); }
			else { this.colorModeOptions.color = color; }
			return true;
		}
		return false;
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
	/** @type {{ art: { path: string, image: GdiBitmap|null, colors: {col:number, freq:number}[]|null }, handle: FbMetadbHandle|null, id: string|null }} - Img properties */
	this.coverImg = { art: { path: '', image: null, colors: null }, handle: null, id: null };
	/** @type {Number} - Panel position */
	this.x = this.y = this.w = this.h = 0;
	/** @type {Number} - Height margin for image drawing */
	this.offsetH = 0;
	/**
	 * @typedef {'none'|'front'|'back'|'disc'|'icon'|'artist'|'path'|'folder'} CoverMode - Available art modes
	 */
	/** @type {CoverMode} - Art type used by panel */
	this.coverMode = '';
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
	 * @property {String} path - File or folder path for 'path' and 'folder' coverMode
	 * @property {number} pathCycleTimer - Art cycling when using 'folder' coverMode (ms)
	 * @property {'name'|'date'} pathCycleSort - Art sorting when using 'folder' coverMode
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
	 * @property {number} angle - Gradient angle (0-360)
	 * @property {number} focus - Gradient focus (0-1)
	 * @property {[Number, Number]} color - Array of colors (at least 2 required for gradient usage)
	 * @property {boolean} bDarkBiGradOut - Flag to ensure the darkest color is used on bigradient mode
	 */
	/** @type {ColorModeOptions} - Color settings */
	this.colorModeOptions = {};
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
	 * @typedef {object} Logging - Panel logging related settings.
	 * @property {boolean} [bProfile] - Profiling logging flag.
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
		coverModeOptions: { blur: 90, bCircularBlur: false, angle: 0, alpha: 0, mute: 0, edgeGlow: 0, bloom: 0, path: '', pathCycleTimer: 10000, pathCycleSort: 'date', bNowPlaying: true, bNoSelection: false, bProportions: true, bFill: true, fillCrop: 'center', zoom: 0, reflection: 'none', bFlipX: false, bFlipY: false, bCacheAlbum: true, bProcessColors: true },
		colorMode: 'blend',
		colorModeOptions: { bDither: true, bUiColors: false, bDarkBiGradOut: true, angle: 91, focus: 1, color: [0xff2e2e2e, 0xff212121], blendIntensity: 90, blendAlpha: 105 }, // RGB(45,45,45), RGB(33,33,33)
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
		logging: { bProfile: false }
	};
};