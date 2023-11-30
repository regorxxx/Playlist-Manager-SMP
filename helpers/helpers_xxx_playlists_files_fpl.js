'use strict';
//30/11/23

// https://github.com/rr-/fpl_reader/blob/master/fpl-format.md
include('..\\helpers-external\\xspf-to-jspf-parser\\xspf_parser.js');

const FPL = {
	MAGIC: ['\xE1', '\xA0', '\x9C', '\x91', '\xF8', '\x3C', '\x77', '\x42', '\x85', '\x2C', '\x3B', '\xCC', '\x14', '\x01', '\xD3', '\xF2'].join(),
	readFile: function(path) {
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
	parseFile: function(path) {
		const jspf = this.toJSPF(this.readFile(path));
		jspf.playlist.title = path.split('\\').pop().replace('.fpl', '');
		return jspf;
	},
	toJSPF: function(hexArr) {
		const jspf = XSPF.emptyJSPF();
		const playlist = jspf.playlist;
		const fileMagic = hexArr.slice(0, 16); 
		if (fileMagic.join() === this.MAGIC) { // Exported FPL playlists
			hexArr = hexArr.join('').split('\x00').slice(0, -1);
			playlist.meta.push({magic: this.MAGIC});
		} else {
			hexArr = hexArr.join('').split('\x00').slice(16, -1);
			playlist.meta.push({magic: fileMagic.join()});
		}
		const tracks = hexArr.map((s) => (s.startsWith('file://') ? s : null)).filter(Boolean);
		const tracksLen = tracks.length;
		playlist.creator = 'foobar2000';
		playlist.meta.push({playlistSize: tracksLen});
		if (tracksLen) { // Tracks from playlist
			for (let i = 0; i < tracksLen; i++) {
				playlist.track.push({
					location: encodeURI(tracks[i].replace('file://', 'file:///').replace(/\\/g,'/').replace(/&/g,'%26')),
					annotation: void(0),
					title: void(0),
					creator: void(0),
					info: void(0),
					image: void(0),
					album: void(0),
					duration: void(0),
					trackNum: void(0),
					identifier: void(0),
					extension: {},
					link: [],
					meta:[],
				});
			}
		}
		return jspf;
	}
};