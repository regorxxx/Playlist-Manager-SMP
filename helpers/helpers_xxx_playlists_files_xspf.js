'use strict';
//18/10/21

// https://wiki.xiph.org/XSPF_v1_Notes_and_Errata
// https://wiki.xiph.org/XSPF_Examples_in_the_wild
// https://wiki.xiph.org/XSPF_Wish_List
// https://wiki.xiph.org/XSPF_Conformance_Tests
include('helpers_xxx.js');
include('helpers_xxx_playlists_files.js');
include('..\\helpers-external\\xspf-to-jspf-parser\\xspf_parser.js');

// https://xspf.org/xspf-v1.html#rfc.section.1
XSPF.toXSPF = function(jspf) {
	const playlist = jspf.playlist;
	const rows = playlist.track;
	const rowsLength = rows.length;
	const nameSpacesHeader = new Map();
	// XML Header
	let code = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n';
	code += '<playlist version=\"1\" xmlns=\"http://xspf.org/ns/0/\">\n'; // Name-spaces are added at the end after retrieving them on all objects
	// Playlist Header
	const headerKeys = ['title', 'creator', 'annotation', 'info', 'location', 'identifier', 'image', 'date', 'license', /* Arrays*/ 'link', 'meta', 'extension'];
	headerKeys.forEach((key) => {
		const val = playlist[key];
		const typeVal = typeof val;
		if (playlist.hasOwnProperty(key) && typeVal !== 'undefined') {
			if (typeVal === 'object') { // multiple lines allowed per key
				if (Array.isArray(val) && val.length) { // meta=[{genre="Hard Rock"}, {locked="false"}, ...]
					val.forEach((subValObj) => {
						const subKey = Object.keys(subValObj)[0];
						const subVal = subValObj[subKey];
						const typeSubVal = typeof subVal;
						if (typeSubVal !== 'undefined') {code += '	<' + key + ' rel="' + subKey + '">' + subVal + '</' + key + '>\n';}
					});
				} else { // extension={http://www.videolan.org/vlc/playlist/0=[{vlc:id="0"}]}
					const nameSpaces = Object.keys(val);
					nameSpaces.forEach((space) => {
						const spaceVal = val[space];
						if (spaceVal && Array.isArray(spaceVal) && spaceVal.length) { // meta=[{genre="Hard Rock"}, {locked="false"}, ...]
							let bNodeDone = false;
							spaceVal.forEach((subValObj) => {
								const subKey = Object.keys(subValObj)[0];
								const subVal = subValObj[subKey];
								const typeSubVal = typeof subVal;
								if (typeSubVal !== 'undefined') {
									if (!bNodeDone) {nameSpacesHeader.set(subKey.split(':')[0], space); bNodeDone = true; code += '	<' + key + ' application="' + space + '">\n';}
									code += '		<' + subKey + '>' + subVal + '</' + subKey + '>\n';
								}
							});
							if (bNodeDone) {code += '	</' + key + '>\n';}
						}
					});
				}
			} else {code += '	<' + key + '>' + val + '</' + key + '>\n';} // One line per key
		}
	});
	// Tracks
	code += '	<trackList>\n';
	for (let index = 0; index < rowsLength; index++) {
		const inputFields = rows[index];
		code += "		<track>\n";
		for (const key in inputFields) {
			let value = inputFields[key];
			const typeVal = typeof value;
			let bWrite = false;
			switch (key) {
				case 'location':
					if (typeVal === 'object' && Array.isArray(value) && value.length) {value = value[0]; bWrite = true;} // Array
					break;
				case 'identifier':
					if (typeVal === 'object' && Array.isArray(value) && value.length) {value = value[0]; bWrite = true;} // Array
					break;
				case 'link':
					if (typeVal === 'object' && Array.isArray(value) && value.length) {value = value[0]; bWrite = true;} // Array
					break;
				case 'title':
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'creator':
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'album':
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'annotation':
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'info':
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'image':
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'trackNum':
					bWrite = (typeVal === 'number' && Number.isInteger(value) && value > 0);
					break;
				case 'duration':
					bWrite = (typeVal === 'number' && Number.isInteger(value) && value > 0);
					break;
			}
			if (bWrite) {
				code += '			<' + key + '>' + htmlentities(value, typeVal) + '</' + key + '>\n';
			}
		}
		code += '		</track>\n';
	}
	code += '	</trackList>\n';
	code += '</playlist>';
	// Add found name-spaces
	if (nameSpacesHeader.size) {
		let spaceStr = '';
		nameSpacesHeader.forEach((value, key) => {
			const ver = value.match(/\/[0-9]$/g).pop(); // Use versioning...
			if (ver && ver.length) {spaceStr += ' xmlns:' + key + '="' + value.replace(ver,'/ns' + ver + '/') + '"';}
		});
		if (spaceStr.length) {
			const defSpace = 'xmlns=\"http://xspf.org/ns/0/\"';
			const idx = code.indexOf(defSpace) + defSpace.length;
			code = code.slice(0, idx) + spaceStr + code.slice(idx);
		}
	}
}

function htmlentities(str, typeVal) {
	if (typeVal === 'string') {
		str = str.replace(/&/g, "&amp;");
		str = str.replace(/"/g, "&quot;");
		str = str.replace(/</g, "&lt;");
		str = str.replace(/>/g, "&gt;");
	}
	return str;
}