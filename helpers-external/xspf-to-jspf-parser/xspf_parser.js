// Copyright J. Chris Anderson 2007 
// Retain this notice. 
// Released under the LGPL 3
// http://www.gnu.org/licenses/lgpl.html
'use strict';

const XSPF = {
	XMLfromString: function(string) {
		let doc = null;
		if (window.ActiveXObject || ActiveXObject) {
			doc = new ActiveXObject("Microsoft.XMLDOM");
			doc.async = "false";
			doc.loadXML(string);
		} else {
			let parser = new DOMParser();
			doc = parser.parseFromString(string,"text/xml");
		}
		return doc;
	},
	toJSPF : function(xml_dom, bParseTracks = true) {
		const pl =  this.parse_playlist(xml_dom, bParseTracks);
		return {playlist:pl};
	},
	emptyJSPF : function() {
		const pl =  this.parse_playlist(this.XMLfromString(''), false);
		return {playlist:pl};
	},
	parse_playlist : function(xspf, bParseTracks = true) {
		const playlist = new Object;
		const xspf_playlist = xspf.getElementsByTagName('playlist')[0] || new ActiveXObject("Microsoft.XMLDOM");
		const trackList = xspf_playlist.getElementsByTagName('trackList')[0] || new ActiveXObject("Microsoft.XMLDOM");
		
		let license;
		[playlist.title, playlist.creator, playlist.annotation, playlist.info, playlist.location, playlist.identifier, playlist.image, playlist.date, license] = this.get_contents(xspf_playlist, ['title','creator','annotation','info','location','identifier','image','date','license'], 1);
		playlist.title = playlist.title[0];
		playlist.creator = playlist.creator[0];
		playlist.annotation = playlist.annotation[0];
		playlist.info = this.strWh(playlist.info[0]);
		playlist.location = this.strWh(playlist.location[0]);
		playlist.identifier = this.strWh(playlist.identifier[0]);
		playlist.image = this.strWh(playlist.image[0]);
		playlist.date = this.strWh(playlist.date[0]);
		
		const [attrs, linknodes, metanodes, extnodes] = this.getDirectChildrenByTagName(xspf_playlist,['attribution','link','meta','extension']);
		if (attrs && attrs.length) {playlist.attribution = this.getKeyValuePairs(attrs,['location','identifier']).flat();}
		if (linknodes && linknodes.length) {playlist.link = this.getRelValuePairs(linknodes);}
		if (metanodes && metanodes.length) {playlist.meta = this.getRelValuePairs(metanodes, true);}
		 
		playlist.license = this.strWh(license[0]);
		
		playlist.extension = {};
		if (extnodes) {
			const length = extnodes.length;
			for (var i=0; i < length; i++) {
				const node = extnodes[i];
				const app = node ? node.getAttribute('application') : null;
				if (app) {
					playlist.extension[app] = playlist.extension[app] || [];
					const extension = this.getExtensionReader(app,'playlist')(node);
					playlist.extension[app].push(extension);
				}
			}
		}
		playlist.track = this.parse_tracks(trackList, bParseTracks);
		
		return playlist;
	},
	getExtensionReader: function(appname,pltr) {
		if (XSPF.extensionParsers[pltr][appname]) {
			return XSPF.extensionParsers[pltr][appname];
		} else {
			return function(node) {return XSPF.getUniqueKeyValuePairs(node)};
		}
	},
	extensionParsers: {
		playlist: {},
		track: {}
	},
	getUniqueKeyValuePairs: function(node,filter) {
		const length = node.childNodes.length;
		let result = {};
		for (let y=0; y < length; y++) {
			const attr = node.childNodes[y];
			if (attr.tagName) {
				if (!filter || (filter && (filter.indexOf(attr.tagName) != -1))) {
					result[attr.tagName] = this.node_text(attr);
				}
			} 
		}
		return result;
	},
	getKeyValuePairs: function(node,filter,nowrap) {
		const length = node.childNodes ? node.childNodes.length : 0;
		let result = filter ? [...Array(filter.length)].map((_) => {return [];}) : [];
		for (let y = 0; y < length; y++) {
			let value = {};
			const attr = node.childNodes[y];
			if (attr.tagName) {
				if (!filter) {
					value[attr.tagName] = this.node_text(attr);
					result.push(nowrap ? this.node_text(attr) : value);
				} else {
					const pos = filter.indexOf(attr.tagName);
					if (pos !== -1) {
						value[attr.tagName] = this.node_text(attr);
						result[pos].push(nowrap ? this.node_text(attr) : value);
					}
				}
			} 
		}
		return result;
	},
	getRelValuePairs: function(nodes,preserve_whitespace) {
		const length = nodes.length;
		let result = [];
		for (let y=0; y < length; y++) {
			const ln = nodes[y];
			const rel = ln ? ln.getAttribute('rel') : null;
			if (rel) {
				let link = {};
				link[rel] = preserve_whitespace ? this.node_text(ln) : this.strWh(this.node_text(ln));
				result.push(link);
			}
		}
		return result;
	},
	getDirectChildrenByTagName: function(source_node,tag_name,val) {
		const nodes = source_node.childNodes;
		const length = nodes.length;
		let matches = [...Array(tag_name.length)].map((_) => {return new Array(val);});
		let j = [...Array(tag_name.length)].map((_) => {return 0;});
		for (let i=0; i < length; i++) {
			const node = nodes[i];
			const pos = tag_name.indexOf(node.tagName);
			if (j[pos] >= length) {continue;}
			if (pos !== -1) {
				matches[pos][j[pos]] = node;
				j[pos]++;
			}
		}
		return matches;
	},
	parse_tracks : function(xml, bParseTracks = true) {
		const xspf_tracks = this.getDirectChildrenByTagName(xml,'track')[0].filter(Boolean);
		const xspf_playlist_length = xspf_tracks.length;
		let tracks = new Array(xspf_playlist_length);
		if (bParseTracks) { // This is the slowest part of the code, ~3 secs per 800 tracks
			for (let i=0; i < xspf_playlist_length; i++) {
				let t = new Object;
				const xspf_track = xspf_tracks[i];
				
				[t.annotation, t.title, t.creator, t.info, t.image, t.album, t.trackNum, t.duration] = this.get_contents(xspf_track, ['annotation','title','creator','info','image','album','trackNum','duration'], 1);
				t.annotation = t.annotation[0];
				t.title = t.title[0];
				t.creator = t.creator[0];
				t.info = t.info[0];
				t.image = t.image[0];
				t.album = t.album[0];
				t.trackNum = this.strWh(t.trackNum)/1;
				
				[t.location, t.identifier] = this.getKeyValuePairs(xspf_track,['location','identifier'],true);
				t.duration = this.strWh(t.duration[0])/1;
				t.location = this.strWh(t.location);
				t.identifier = this.strWh(t.identifier);
				
				t.extension = new Object;
				const [linknodes, metanodes, extnodes] = this.getDirectChildrenByTagName(xspf_track,['link','meta','extension']);
				if (linknodes && linknodes.length) {t.link = this.getRelValuePairs(linknodes);}
				if (metanodes && metanodes.length) {t.meta = this.getRelValuePairs(metanodes);}
				if (extnodes) {
					const length = extnodes.length;
					if (length > 0) {
						for (let j=0; j < length; j++) {
							const node = extnodes[j];
							const app = node ? node.getAttribute('application') : null;
							if (app) {
								t.extension[app] = t.extension[app] || [];
								const extension = this.getExtensionReader(app,'track')(node);
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
	get_contents : function(xml_node, tag, val = Infinity) {
		const xml_contents = xml_node.childNodes;
		const xml_contentsLength = xml_contents.length;
		const length = xml_contentsLength >= val ? val : xml_contentsLength;
		let contents = [...Array(tag.length)].map((_) => {return new Array(val);});
		let j = [...Array(tag.length)].map((_) => {return 0;});;
		for (let i = 0; i < xml_contentsLength; i++) {
			const xml_content = xml_contents[i];
			const pos = tag.indexOf(xml_content.tagName);
			if (j[pos] >= length) {continue;}
			if (pos !== -1) {
				contents[pos][j[pos]] = this.node_text(xml_content);
				j[pos]++;
			}
		}
		return contents;
	},
	node_text : function(node) {
		if (node.childNodes && node.childNodes.length > 1) {
			return node.childNodes[1].nodeValue;
		} else if (node.firstChild) {
			return node.firstChild.nodeValue;
		}
	},
	strWh: function(arr) {
		if (!arr) return;
		let scalar;
		if(typeof arr == 'string') {
			arr = [arr];
			scalar = true;
		} else {
			scalar = false;	   
		}
		let result = [];
		const length = arr.length;
		for (let i=0; i < length; i++) {
			let string = arr[i];
			string = string.replace(/^\s*/,'');
			string = string.replace(/\s*$/,'');
			result.push(string);
		}
		if (scalar) {
			return result[0];
		} else {
			return result;
		}
	}
};