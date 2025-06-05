'use strict';
//04/06/25

/* exported FPL */

// https://github.com/rr-/fpl_reader/blob/master/fpl-format.md
/*
AutoPlaylists are exposed at playlists-vX.X\index.dat
	00 00 00|NAME|...|55 65 F1 82 CB 7A 8C 43 9C 4B 55 E1 D8 4D 15 64|....|QUERY|00 00 00 00|01 00 00 00|UI-ID(E8 68 7C 02 52 59 88 F7 22 9D 64 B2 BE 3A 45 49)
*/
include('..\\helpers-external\\xspf-to-jspf-parser\\xspf_parser.js');
/* global XSPF:readable*/

const FPL = {
	bDebug: false,
	MAGIC: ['\xE1', '\xA0', '\x9C', '\x91', '\xF8', '\x3C', '\x77', '\x42', '\x85', '\x2C', '\x3B', '\xCC', '\x14', '\x01', '\xD3', '\xF2'].join(''),
	MAGICAUTOPLS: ['\x55', '\x65', '\xF1', '\x82', '\xCB', '\x7A', '\x8C', '\x43', '\x9C', '\x4B', '\x55', '\xE1', '\xD8', '\x4D', '\x15', '\x64'].join(''),
	readFile: function (path) {
		const file = new ActiveXObject('ADODB.Stream');
		const doc = new ActiveXObject('Msxml2.DOMDocument.3.0');
		const element = doc.createElement('temp');
		element.dataType = 'bin.hex';
		file.Type = 1;
		file.Open();
		file.LoadFromFile(path);
		const hexArr = [];
		let i = file.Size;
		while (i--) {
			element.nodeTypedValue = file.Read(1);
			hexArr.push(String.fromCharCode(parseInt(element.text, 16)));
		}
		file.Close();
		return hexArr;
	},
	parseFile: function (path) {
		const jspf = this.toJSPF(this.readFile(path));
		jspf.playlist.title = path.split('\\').pop().replace('.fpl', '');
		return jspf;
	},
	parseDatFile: function (path) {
		return this.toFoobarV1Pls(this.readFile(path));
	},
	parseSqliteFile: function (path) {
		return this.toFoobarV2Pls(this.readFile(path), path);
	},
	toJSPF: function (hexArr) {
		const jspf = XSPF.emptyJSPF();
		const playlist = jspf.playlist;
		const fileMagic = hexArr.slice(0, 16);
		if (fileMagic.join('') === this.MAGIC) { // Exported FPL playlists
			hexArr = hexArr.join('').split('\x00').slice(0, -1);
			playlist.meta.push({ magic: this.MAGIC });
		} else {
			hexArr = hexArr.join('').split('\x00').slice(16, -1);
			playlist.meta.push({ magic: fileMagic.join() });
		}
		const fileRegex = /^file(-relative)?:\/+/i;
		const tracks = hexArr.map((s) => (fileRegex.test(s) ? s : null)).filter(Boolean);
		const tracksLen = tracks.length;
		playlist.creator = 'foobar2000';
		playlist.meta.push({ playlistSize: tracksLen });
		if (tracksLen) { // Tracks from playlist
			for (let i = 0; i < tracksLen; i++) {
				playlist.track.push({
					location: 'file:///' + encodeURIComponent(tracks[i].replace(fileRegex, '').replace(/\\/g, '/')),
					annotation: void (0),
					title: void (0),
					creator: void (0),
					info: void (0),
					image: void (0),
					album: void (0),
					duration: void (0),
					trackNum: void (0),
					identifier: void (0),
					extension: {},
					link: [],
					meta: [],
				});
			}
		}
		return jspf;
	},
	toFoobarV1Pls: function (hexArr) {
		const data = hexArr.join('').split('\x00\x00\x00');
		const autoRegExp = new RegExp(this.MAGICAUTOPLS, 'i');
		const info = { autoPls: [], pls: [] };
		const stack = [];
		const autoPlsData = [];
		let count = 0;
		data.forEach((line, i) => {
			if (i < 3) { return; }
			stack.push(line);
			if (autoRegExp.test(line)) {
				count += 4;
			} else if (count) {
				count--;
				if (!count) {
					autoPlsData.push(stack.slice(-8)
						.filter(Boolean)
						.filter((d) => d !== '\x00' && d !== '\x01' && d !== '\x00\x01'));
					stack.length = 0;
				}
			}
		});
		const autoPlsCount = (hexArr.join('').match(new RegExp(this.MAGICAUTOPLS, 'gi')) || []).length;
		if (autoPlsCount === autoPlsData.length) {
			const ctrlChar = /[\0-\cZ]/i;
			const alphabet = /([^\W]|[[\]()_Á-ü])$/;
			const queryKeys = ['PRESENT', 'HAS', 'IS', 'LESS', 'GREATER', 'EQUAL', 'MISSING', 'BEFORE', 'AFTER', 'SINCE', 'DURING'];
			autoPlsData.forEach((pls) => {
				if (this.bDebug) { pls.forEach((l, i) => console.log(i, JSON.stringify(l))); }
				const plsObj = { name: '', query: '', sort: '', bSortForced: false };
				try {
					plsObj.name = pls[0].split('\xFF')[0] || '';
					if (ctrlChar.test(plsObj.name)) { plsObj.name = pls[1].split('\xFF')[0] || ''; }
					let i = 3;
					while (!queryKeys.some((key) => plsObj.query.includes(key)) && i < pls.length) {
						plsObj.query = pls[i++] || '';
					}
					if (ctrlChar.test(plsObj.query)) {
						plsObj.sort = pls[i].split('\xE3\x14\x3B')[0] || '';
					}
					for (const key in plsObj) {
						if (typeof plsObj[key] === 'string') {
							plsObj[key] = plsObj[key].replace(/[\0-\cZ]/gi, '');
							if (!alphabet.test(plsObj[key])) {
								plsObj[key] = plsObj[key].slice(0, -1);
							}
						}
					}
					info.autoPls.push(plsObj);
				} catch (e) { console.log(e.message); }
			});
		}
		return info;
	},
	toFoobarV2Pls: function (hexArr, path) {
		const id = path.split('\\').slice(-1)[0].replace(/(^playlist-)|(-props.sqlite$)/gi, '');
		const data = hexArr.join('').split('\x00\x00\x00').filter(Boolean);
		// eslint-disable-next-line no-control-regex
		const autoRegExp = new RegExp('\xF4\x53\xB6\x51\xD7\xA2\x10\x48\x99\xBD\x06\x72\x47\x12\x17\x5A', 'i'); // NOSONAR
		const stack = [];
		const autoPlsData = [];
		let count = 0;
		data.some((line) => {
			stack.push(line);
			if (autoRegExp.test(line)) {
				count += 3;
			} else if (count) {
				count--;
				if (!count) {
					autoPlsData.push(...stack.slice(-4));
					stack.length = 0;
					return true;
				}
			}
		});
		if (autoPlsData.length) {
			if (this.bDebug) { autoPlsData.forEach((l, i) => console.log(i, JSON.stringify(l))); }
			try {
				const plsObj = { name: '', query: '', sort: '', bSortForced: false, id };
				plsObj.query = (autoPlsData[1] || '');
				plsObj.sort = (autoPlsData[2] || '').replace(/\x37.*/gi, '');
				const alphabet = /([^\W]|[[\]()_Á-ü])$/;
				for (const key in plsObj) {
					if (typeof plsObj[key] === 'string') {
						plsObj[key] = plsObj[key].replace(/[\0-\cZ]/gi, '');
						if (!alphabet.test(plsObj[key])) {
							plsObj[key] = plsObj[key].slice(0, -1);
						}
					}
				}
				return plsObj;
			} catch (e) { console.log(e.message); }
		}
		return null;
	}
};