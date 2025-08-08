﻿'use strict';
// 07/08/25
// Copyright Regorxxx 2024
// Based on works by J. Chris Anderson 2007
// https://github.com/jchris/xspf-to-jspf-parser
// Retain this notice.
// Released under the AGPLv3
// https://www.gnu.org/licenses/agpl-3.0.html

const XSP = {
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
	toJSP: function (xml_dom) {
		const pl = this.parsePlaylist(xml_dom);
		return { playlist: pl };
	},
	emptyJSP: function (type = 'songs') {
		const pl = this.parsePlaylist(this.XMLfromString(''), type);
		return { playlist: pl };
	},
	toXSP: function (jsp) {
		const playlist = jsp.playlist;
		let code = [];
		// XML Header
		code.push('<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>');
		code.push('<smartplaylist type="' + jsp.playlist.type + '">');
		// Playlist Header [required]
		const headerKeys = ['name', 'match'];
		headerKeys.forEach((key) => {
			if (Object.hasOwn(playlist, key) && typeof playlist[key] !== 'undefined') {
				code.push('	<' + key + '>' + playlist[key] + '</' + key + '>');
			}
		});
		// Rules
		const rules = playlist.rules;
		for (const rule of rules) {
			if (rule && Object.hasOwn(rule, 'field') && Object.hasOwn(rule, 'operator') && Object.hasOwn(rule, 'value')) {
				if (typeof rule.field !== 'undefined' && typeof rule.operator !== 'undefined') {
					code.push('	<rule field="' + rule.field + '" operator="' + rule.operator + '">');
					for (const val of rule.value) {
						if (typeof val !== 'undefined') { code.push('		<value>' + val + '</value>'); }
					}
					code.push('	</rule>');
				}
			}
		}
		// Order, group and limit [optional]
		const order = playlist.order[0];
		if (typeof order !== 'undefined') {
			const dir = Object.keys(order);
			code.push('	<order direction="' + dir + '">' + order[dir] + '</order>'); // One line per key
		}
		const optKeys = ['group', 'limit'];
		optKeys.forEach((key) => {
			if (Object.hasOwn(playlist, key) && typeof playlist[key] !== 'undefined') {
				code.push('	<' + key + '>' + playlist[key] + '</' + key + '>'); // One line per key
			}
		});
		code.push('</smartplaylist>');
		return code;
	},
	parsePlaylist: function (xsp, defType = '') {
		const playlist = new Object;
		const xsp_playlist = xsp.getElementsByTagName('smartplaylist')[0] || new ActiveXObject('Microsoft.XMLDOM');
		playlist.type = xsp_playlist.getAttribute ? xsp_playlist.getAttribute('type') : defType;

		[playlist.name, playlist.match, playlist.group, playlist.limit] = this.getContents(xsp_playlist, ['name', 'match', 'group', 'limit'], 1);
		playlist.name = playlist.name[0];
		playlist.match = playlist.match[0];
		playlist.group = playlist.group[0];
		playlist.limit = playlist.limit[0] ? this.strWh(playlist.limit[0]) / 1 : void (0);

		const order = this.getDirectChildrenByTagName(xsp_playlist, ['order']);
		if (order && order[0]) { playlist.order = this.getRelValuePairs(order[0], true, 'direction'); }
		if (!playlist.order || !playlist.order.length) { playlist.order = [{}]; }
		Object.defineProperty(playlist, 'sort', { // Remap sort to order
			set: function (x) { this.order = x; },
			get: function () { return this.order; }
		});

		playlist.rules = this.parse_rules(xsp_playlist);

		return playlist;
	},
	getExtensionReader: function (appName, pltr) {
		if (XSP.extensionParsers[pltr][appName]) {
			return XSP.extensionParsers[pltr][appName];
		} else {
			return function (node) { return XSP.getUniqueKeyValuePairs(node); };
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
		const length = node.childNodes.length;
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
	getRelValuePairs: function (nodes, preserve_whitespace, attr) {
		const length = nodes.length;
		let result = [];
		for (let y = 0; y < length; y++) {
			const ln = nodes[y];
			const rel = ln ? ln.getAttribute(attr) : null;
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
	parse_rules: function (xml) {
		const xsp_rules = this.getDirectChildrenByTagName(xml, 'rule')[0];
		const xsp_rules_length = xsp_rules.length;
		let rules = new Array(xsp_rules_length);
		for (let i = 0; i < xsp_rules_length; i++) {
			let t = new Object;
			const xsp_rule = xsp_rules[i];
			if (xsp_rule) {
				t.field = xsp_rule.getAttribute('field');
				t.operator = xsp_rule.getAttribute('operator');
				t.value = this.getKeyValuePairs(xsp_rule, ['value'], true);
				t.value = this.strWh(t.value[0]);
				rules[i] = t;
			}
		}
		return rules;
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
			string = string.replace(/^\s*/, '');
			string = string.replace(/\s*$/, '');
			result.push(string);
		}
		if (scalar) {
			return result[0];
		} else {
			return result;
		}
	}
};