﻿'use strict';
// 07/08/25
// Copyright Regorxxx 2023
// Based on works by J. Chris Anderson 2007
// https://github.com/jchris/xspf-to-jspf-parser
// Retain this notice.
// Released under the AGPLv3
// https://www.gnu.org/licenses/agpl-3.0.html

const XSPF = {
	XMLfromString: function (string) {
		let doc = null;
		if (window.ActiveXObject || ActiveXObject) {
			doc = new ActiveXObject('Microsoft.XMLDOM');
			doc.async = 'false';
			doc.loadXML(string);
		} else {
			let parser = new DOMParser();
			doc = parser.parseFromString(string, 'text/xml');
		}
		return doc;
	},
	toJSPF: function (xml_dom, bParseTracks = true) {
		const pl = this.parsePlaylist(xml_dom, bParseTracks);
		return { playlist: pl };
	},
	emptyJSPF: function () {
		const pl = this.parsePlaylist(this.XMLfromString(''), false);
		return { playlist: pl };
	},
	parsePlaylist: function (xspf, bParseTracks = true) {
		const playlist = new Object;
		const xspf_playlist = xspf.getElementsByTagName('playlist')[0] || new ActiveXObject('Microsoft.XMLDOM');
		const trackList = xspf_playlist.getElementsByTagName('trackList')[0] || new ActiveXObject('Microsoft.XMLDOM');

		let license;
		[playlist.title, playlist.creator, playlist.annotation, playlist.info, playlist.location, playlist.identifier, playlist.image, playlist.date, license] = this.getContents(xspf_playlist, ['title', 'creator', 'annotation', 'info', 'location', 'identifier', 'image', 'date', 'license'], 1);
		playlist.title = playlist.title[0];
		playlist.creator = playlist.creator[0];
		playlist.annotation = playlist.annotation[0];
		Object.defineProperty(playlist, 'description', { // Remap description to annotation
			set: function (x) { this.annotation = x; },
			get: function () { return this.annotation; }
		});
		playlist.info = this.strWh(playlist.info[0]);
		playlist.location = this.strWh(playlist.location[0]);
		playlist.identifier = this.strWh(playlist.identifier[0]);
		playlist.image = this.strWh(playlist.image[0]);
		playlist.date = this.strWh(playlist.date[0]);

		const [attrs, linkNodes, metaNodes, extNodes] = this.getDirectChildrenByTagName(xspf_playlist, ['attribution', 'link', 'meta', 'extension']);
		if (attrs && attrs.length) { playlist.attribution = this.getKeyValuePairs(attrs, ['location', 'identifier']).flat(); }
		if (linkNodes && linkNodes.length) { playlist.link = this.getRelValuePairs(linkNodes); }
		if (metaNodes && metaNodes.length) { playlist.meta = this.getRelValuePairs(metaNodes, true); }

		playlist.license = this.strWh(license[0]);

		playlist.extension = {};
		if (extNodes) {
			const length = extNodes.length;
			for (let i = 0; i < length; i++) {
				const node = extNodes[i];
				const app = node ? node.getAttribute('application') : null;
				if (app) {
					playlist.extension[app] = playlist.extension[app] || [];
					const extension = this.getExtensionReader(app, 'playlist')(node);
					playlist.extension[app].push(extension);
				}
			}
		}
		playlist.track = this.parseTracks(trackList, bParseTracks);

		return playlist;
	},
	getExtensionReader: function (appName, pltr) {
		if (XSPF.extensionParsers[pltr][appName]) {
			return XSPF.extensionParsers[pltr][appName];
		} else {
			return function (node) { return XSPF.getUniqueKeyValuePairs(node); };
		}
	},
	extensionParsers: {
		playlist: {},
		track: {}
	},
	getUniqueKeyValuePairs: function (node, filter) {
		const length = node.childNodes.length;
		let result = {};
		for (let y = 0; y < length; y++) {
			const attr = node.childNodes[y];
			if (attr.tagName) {
				if (!filter || (filter && (filter.indexOf(attr.tagName) != -1))) {
					result[attr.tagName] = this.nodeText(attr);
				}
			}
		}
		return result;
	},
	getKeyValuePairs: function (node, filter, nowrap) {
		const length = node.childNodes ? node.childNodes.length : 0;
		let result = filter ? Array.from({ length: filter.length }, () => []) : [];
		for (let y = 0; y < length; y++) {
			let value = {};
			const attr = node.childNodes[y];
			if (attr.tagName) {
				if (!filter) {
					value[attr.tagName] = this.nodeText(attr);
					result.push(nowrap ? this.nodeText(attr) : value);
				} else {
					const pos = filter.indexOf(attr.tagName);
					if (pos !== -1) {
						value[attr.tagName] = this.nodeText(attr);
						result[pos].push(nowrap ? this.nodeText(attr) : value);
					}
				}
			}
		}
		return result;
	},
	getRelValuePairs: function (nodes, preserve_whitespace) {
		const length = nodes.length;
		let result = [];
		for (let y = 0; y < length; y++) {
			const ln = nodes[y];
			const rel = ln ? ln.getAttribute('rel') : null;
			if (rel) {
				let link = {};
				link[rel] = preserve_whitespace ? this.nodeText(ln) : this.strWh(this.nodeText(ln));
				result.push(link);
			}
		}
		return result;
	},
	getDirectChildrenByTagName: function (source_node, tag_name, val) {
		const nodes = source_node.childNodes;
		const length = nodes.length;
		let matches = Array.from({ length: tag_name.length }, () => new Array(val));
		let j = Array.from({ length: tag_name.length }, () => 0);
		for (let i = 0; i < length; i++) {
			const node = nodes[i];
			const pos = tag_name.indexOf(node.tagName);
			if (j[pos] >= length) { continue; }
			if (pos !== -1) {
				matches[pos][j[pos]] = node;
				j[pos]++;
			}
		}
		return matches;
	},
	parseTracks: function (xml, bParseTracks = true) {
		const xspf_tracks = this.getDirectChildrenByTagName(xml, 'track')[0].filter(Boolean);
		const xspf_playlist_length = xspf_tracks.length;
		let tracks = new Array(xspf_playlist_length);
		if (bParseTracks) { // This is the slowest part of the code, ~3 secs per 800 tracks
			for (let i = 0; i < xspf_playlist_length; i++) {
				let t = new Object;
				const xspf_track = xspf_tracks[i];

				[t.annotation, t.title, t.creator, t.info, t.image, t.album, t.trackNum, t.duration] = this.getContents(xspf_track, ['annotation', 'title', 'creator', 'info', 'image', 'album', 'trackNum', 'duration'], 1);
				t.annotation = t.annotation[0];
				t.title = t.title[0];
				t.creator = t.creator[0];
				t.info = t.info[0];
				t.image = t.image[0];
				t.album = t.album[0];
				t.trackNum = this.strWh(t.trackNum) / 1;

				[t.location, t.identifier] = this.getKeyValuePairs(xspf_track, ['location', 'identifier'], true);
				t.duration = this.strWh(t.duration[0]) / 1;
				t.location = this.strWh(t.location);
				t.identifier = this.strWh(t.identifier);

				t.extension = new Object;
				const [linkNodes, metaNodes, extNodes] = this.getDirectChildrenByTagName(xspf_track, ['link', 'meta', 'extension']);
				if (linkNodes && linkNodes.length) { t.link = this.getRelValuePairs(linkNodes); }
				if (metaNodes && metaNodes.length) { t.meta = this.getRelValuePairs(metaNodes); }
				if (extNodes) {
					const length = extNodes.length;
					if (length > 0) {
						for (let j = 0; j < length; j++) {
							const node = extNodes[j];
							const app = node ? node.getAttribute('application') : null;
							if (app) {
								t.extension[app] = t.extension[app] || [];
								const extension = this.getExtensionReader(app, 'track')(node);
								t.extension[app].push(extension);
							}
						}
					}
				}
				tracks[i] = t;
			}
		}
		return tracks;
	},
	getContents: function (xml_node, tag, val = Infinity) {
		const xml_contents = xml_node.childNodes;
		const xml_contentsLength = xml_contents.length;
		const length = xml_contentsLength >= val ? val : xml_contentsLength;
		let contents = Array.from({ length: tag.length }, () => new Array(val));
		let j = Array.from({ length: tag.length }, () => 0);
		for (let i = 0; i < xml_contentsLength; i++) {
			const xml_content = xml_contents[i];
			const pos = tag.indexOf(xml_content.tagName);
			if (j[pos] >= length) { continue; }
			if (pos !== -1) {
				contents[pos][j[pos]] = this.nodeText(xml_content);
				j[pos]++;
			}
		}
		return contents;
	},
	nodeText: function (node) {
		if (node.childNodes && node.childNodes.length > 1) {
			return node.childNodes[1].nodeValue;
		} else if (node.firstChild) {
			return node.firstChild.nodeValue;
		}
	},
	strWh: function (arr) {
		if (!arr) return;
		let scalar;
		if (typeof arr == 'string') {
			arr = [arr];
			scalar = true;
		} else {
			scalar = false;
		}
		let result = [];
		const length = arr.length;
		for (let i = 0; i < length; i++) {
			let string = arr[i];
			if (string) {
				string = string.replace(/^\s*/, '');
				string = string.replace(/\s*$/, '');
			}
			result.push(string);
		}
		if (scalar) {
			return result[0];
		} else {
			return result;
		}
	}
};