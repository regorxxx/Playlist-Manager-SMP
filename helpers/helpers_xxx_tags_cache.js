'use strict';
//07/08/25

include('callbacks_xxx.js');
include('helpers_xxx.js');
/* global isFoobarV2:readable, iStepsLibrary:readable, iDelayLibrary:readable, isFoobarV2:readable */
include('helpers_xxx_file.js');
/* global _createFolder:readable, _save:readable, _deleteFile:readable, _asciify:readable, _isFolder:readable, _open:readable, utf8:readable, getFiles:readable, _jsonParse:readable */
include('helpers_xxx_prototypes.js');
/* global MapReplacer:readable, isArray:readable, */
include('helpers_xxx_crc.js');
/* global crc32:readable */
if (!isFoobarV2) { console.log('Tags Cache is being used on foobar2000 <2.0. This is not recommended.'); }

// Tags cache
// Tag retrieval is too slow when retrieving tags on foobar2000 2.0+
const tagsCache = {
	files: {}, // one per tag
	folder: fb.ProfilePath + 'js_data\\tagsCache\\',
	cache: new Map(), // [ID, [Value, ...], ...], where ID = handle.RawPath + handle.SubSong
	filesCRC: {},
	currCRC: {},
	toStr: {},
	updateFromHook: false,
	enabled: false,
	listeners: []
};

_createFolder(tagsCache.folder);
_save(tagsCache.folder + '_XXX-SCRIPTS_CACHE_FILES', null); // Add info files

tagsCache.cacheTags = function (tagNames, iSteps, iDelay, libItems = fb.GetLibraryItems().Convert(), bForce = false) {
	if (!isArray(libItems)) { return null; }
	return new Promise((resolve) => {
		let items = [];
		// Filter only items not cached before
		tagNames.forEach((tag) => {
			if (bForce) {
				if (!this.cache.has(tag)) { this.cache.set(tag, new Map()); }
				items = libItems;
			} else {
				if (this.cache.has(tag)) {
					const tagCache = this.cache.get(tag);
					libItems.forEach((item) => {
						if (!tagCache.has(item.RawPath + ',' + item.SubSong)) { items.push(item); }
					});
				} else {
					this.cache.set(tag, new Map());
					items = libItems;
				}
			}
		});
		const count = items.length;
		const total = Math.ceil(count / iSteps);
		const promises = [];
		const tf = tagNames.map((tag) => { return fb.TitleFormat(tag); });
		if (!count) { promises.push('done'); }
		else {
			let prevProgress = -1;
			for (let i = 1; i <= total; i++) {
				promises.push(new Promise((resolve) => {
					setTimeout(() => {
						tagNames.forEach((tag, j) => {
							const tagCache = this.cache.has(tag) ? this.cache.get(tag) : null;
							if (tagCache && tagCache.size !== count) {
								const iItems = new FbMetadbHandleList(items.slice((i - 1) * iSteps, i === total ? count : i * iSteps));
								const newValues = tf[j].EvalWithMetadbs(iItems);
								newValues.forEach((newVal, h) => {
									const item = iItems[h];
									tagCache.set(item.RawPath + ',' + item.SubSong, newVal.split(', '));
								});
								const progress = Math.round(i / total * 100);
								if (progress % 10 === 0 && progress > prevProgress) { prevProgress = progress; console.log('Caching tags ' + progress + '%.'); }
								resolve('done');
							}
						});
					}, iDelay * i);
				}));
			}
		}
		Promise.all(promises).then(() => {
			console.log('cacheTags: got ' + JSON.stringify(tagNames) + ' tags from ' + count + ' items.');
			tagNames.forEach((tag) => {
				this.updateCacheCRC(tag);
			});
			resolve(this.cache);
		}, (error) => { throw new Error(error); });
	});
};

tagsCache.getTags = function (tagNames, libItems, bFillWithTF = true) {
	const tags = Object.fromEntries(tagNames.map((tag) => { return [tag, []]; }));
	const tf = bFillWithTF ? tagNames.map((tag) => { return fb.TitleFormat(tag); }) : null;
	tagNames.forEach((tag, i) => {
		if (tag.toLowerCase() === 'skip') { return; }
		let bUpdate = false;
		if (this.cache.has(tag)) {
			const tagCache = this.cache.get(tag);
			libItems.forEach((item) => {
				const id = item.RawPath + ',' + item.SubSong;
				const bCached = tagCache.has(id);
				const newVal = bCached ? tagCache.get(id) : (bFillWithTF ? tf[i].EvalWithMetadb(item).split(', ') : null);
				if (!bCached) { tagCache.set(id, newVal); bUpdate = true; }
				tags[tag].push(newVal);
			});
		} else if (bFillWithTF) {
			this.cache.set(tag, new Map());
			const tagCache = this.cache.get(tag);
			libItems.forEach((item) => {
				const id = item.RawPath + ',' + item.SubSong;
				const newVal = tf[i].EvalWithMetadb(item).split(', ');
				tagCache.set(id, newVal);
				tags[tag].push(newVal);
			});
			bUpdate = true;
		}
		if (bUpdate) {
			this.updateCacheCRC(tag);
		}
	});
	return tags;
};

tagsCache.clear = function (tagNames) {
	tagNames.forEach((tag) => {
		if (this.cache.has(tag)) { this.cache.delete(tag); }
		this.cache.set(tag, new Map());
		this.updateCacheCRC(tag);
	});
};

tagsCache.deleteTags = function (tagNames, libItems) {
	tagNames.forEach((tag) => {
		if (this.cache.has(tag)) {
			const tagCache = this.cache.get(tag);
			libItems.forEach((item) => {
				const id = item.RawPath + ',' + item.SubSong;
				if (tagCache.has(id)) { tagCache.delete(id); }
			});
			this.updateCacheCRC(tag);
		}
	});
};

tagsCache.load = function (folder = this.folder) {
	this.enable();
	if (!_isFolder(folder)) { return; }
	const files = getFiles(folder, new Set(['.json']));
	files.forEach((filePath) => {
		const fileName = utils.SplitFilePath(filePath).slice(1).join();
		const file = _open(filePath, utf8);
		const obj = _jsonParse(file);
		if (obj) {
			const tag = obj.tag;
			const entries = obj.entries;
			if (!this.cache.has(tag)) { this.cache.set(tag, new Map(entries)); }
			else {
				const tagCache = this.cache.get(tag);
				entries.forEach((pair) => { tagCache.set(pair[0], pair[1]); });
			}
		}
		this.filesCRC[fileName] = this.currCRC[fileName] = crc32(file);
		this.toStr[fileName] = file;
		this.files[fileName] = filePath;
	});
	console.log('Tags Cache loaded.');
};

tagsCache.unload = function () {
	[...this.cache.keys()].forEach((tag) => {
		this.cache.get(tag).clear();
	});
	this.cache.clear();
	this.files = this.filesCRC = this.currCRC = this.toStr = {};
	this.enabled = false;
	this.listeners.forEach((listener) => { removeEventListener(listener.event, null, listener.id); });
	this.listeners = [];
};

tagsCache.enable = function () {
	this.enabled = true;
	this.listeners = [
		// Auto-update cache
		addEventListener('on_library_items_added', (handleList) => {
			if (!this.enabled) { return; }
			const keys = [...this.cache.keys()];
			if (keys.length) {
				this.cacheTags(keys, iStepsLibrary, iDelayLibrary, handleList.Convert(), true);
			}
		}),
		addEventListener('on_metadb_changed', (handleList, fromHook) => {
			if (!this.enabled) { return; }
			if (!this.updateFromHook && fromHook) { return; }
			const keys = [...this.cache.keys()];
			if (keys.length) {
				this.cacheTags(keys, iStepsLibrary, iDelayLibrary, handleList.Convert(), true);
			}
		}),
		addEventListener('on_library_items_removed', (handleList) => {
			if (!this.enabled) { return; }
			const keys = [...this.cache.keys()];
			if (keys.length) {
				this.deleteTags(keys, handleList.Convert());
			}
		}),
		addEventListener('on_script_unload', () => {
			if (!this.enabled) { return; }
			this.save();
		})
	];
};

tagsCache.disable = function () {
	this.enabled = false;
};

tagsCache.save = function (folder = this.folder) {
	for (let fileName in this.currCRC) {
		if (this.filesCRC[fileName] !== this.currCRC[fileName]) {
			if (!Object.hasOwn(this.files, fileName)) { this.files[fileName] = folder + fileName + '.json'; }
			_deleteFile(this.files[fileName], true);
			_save(this.files[fileName], this.toStr[fileName]);
		}
	}
};

tagsCache.updateCacheCRC = function (tag) {
	const key = _asciify(tag);
	const tagCache = this.cache.get(tag);
	this.toStr[key] = JSON.stringify({ tag, entries: tagCache }, MapReplacer, '\t');
	this.currCRC[key] = crc32(this.toStr[key]);
};