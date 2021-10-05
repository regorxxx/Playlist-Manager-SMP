'use strict';

include('helpers_xxx_playlists_files.js');




let doc = new ActiveXObject('Microsoft.XMLDOM');
doc.async = 'false';
let plsText = utils.ReadTextFile('d:\\foobar2000\\profile\\playlist_manager\\playlist.xspf');
const codePage = checkCodePage(plsText.split('\r\n'), '.xspf');
if (codePage !== -1) {plsText = utils.ReadTextFile(playlistPath, codePage);}
doc.loadXML(plsText);
console.log(doc.getElementsByTagName('playlist')[0].childNodes.length);

include('d:\\foobar2000\\profile\\scripts\\SMP\\xxx-scripts\\helpers-external\\xspf-to-jspf-parser\\xspf_parser.js');

var xmldom = XSPF.XMLfromString(plsText);
var jspf = XSPF.toJSPF(xmldom);
// console.log(jspf.playlist);

var jspf = XSPF.emptyJSPF();
console.log(jspf.playlist);

writeXSPF(jspf)

// TODO: playlist object to XSPF


function writeXSPF(jspf) {
	const playlist = jspf.playlist;
	const rows = playlist.track;
	const rowsLength = rows.length;
	
	let code = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n';
	code += '<playlist version=\"1\" xmlns=\"http://xspf.org/ns/0/\">\n';
	if (playlist.title) {code += '	<title>' + playlist.title + '<\title>\n';}
	if (playlist.creator) {code += '	<creator>' + playlist.creator + '<\creator>\n';}
	if (playlist.annotation) {code += '	<annotation>' + playlist.annotation + '<\annotation>\n';}
	if (playlist.info) {code += '	<info>' + playlist.info + '<\info>\n';}
	if (playlist.location) {code += '	<location>' + playlist.location + '<\location>\n';}
	if (playlist.identifier) {code += '	<identifier>' + playlist.identifier + '<\identifier>\n';}
	if (playlist.image) {code += '	<image>' + playlist.image + '<\image>\n';}
	if (playlist.date) {code += '	<date>' + playlist.date + '<\date>\n';}
	if (playlist.license) {code += '	<license>' + playlist.license + '<\license>\n';}
	if (playlist.link) {code += '	<link>' + playlist.link + '<\link>\n';} // Array
	if (playlist.meta) {code += '	<meta>' + playlist.meta + '<\meta>\n';} // Array
	if (playlist.extension) {code += '	<extension>' + playlist.extension + '<\extension>\n';} // Array
	code += '	<trackList>\n';
	
	for (let index = 0; index < rowsLength; index++) {
		const inputFields = rows[index];
		
		code += "		<track>\n";
		
		for (const key in inputFields) {
			let type = '';
			let value = inputFields[key];
			const typeVal = typeof value;
			let bWrite = false;
			switch (key) {
				case 'location':
					type = 'location';
					if (typeVal === 'array' && value.length) {value = value[0];} // Array
					bWrite = true;
					break;
				case 'identifier':
					type = 'identifier';
					if (typeVal === 'array' && value.length) {value = value[0];} // Array
					bWrite = true;
					break;
				case 'link':
					type = 'link';
					if (typeVal === 'array' && value.length) {value = value[0];} // Array
					bWrite = true;
					break;
				case 'title':
					type = 'title';
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'creator':
					type = 'creator';
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'album':
					type = 'album';
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'annotation':
					type = 'annotation';
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'info':
					type = 'info';
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'image':
					type = 'image';
					bWrite = (typeVal === 'string' && value.length);
					break;
				case 'trackNum':
					type = 'trackNum';
					bWrite = (typeVal === 'number' && Number.isInteger(value) && value > 0);
					break;
				case 'duration':
					type = 'duration';
					bWrite = (typeVal === 'number' && Number.isInteger(value) && value > 0);
					break;
			}
			if (bWrite) {
				code += '			<' + type + '>' + htmlentities(value, typeVal) + '</' + type + '>\n';
			}
			
		}
		
		code += '		</track>\n';
	}
	
	code += '	</trackList>\n';
	code += '</playlist>';
	
	console.log(code);
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