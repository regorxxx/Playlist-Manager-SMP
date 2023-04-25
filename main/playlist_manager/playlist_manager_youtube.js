'use strict';
//25/04/23

include('..\\..\\helpers\\helpers_xxx_basic_js.js');
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
include('..\\..\\helpers\\helpers_xxx_web.js');
include('playlist_manager_listenbrainz.js');

const youtube = {
	regEx: /(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^&\s?]+(?!\S))\/)|(?:\S*v=|v\/)))([^&\s?]+)/g,
	key: new SimpleCrypto('xxx').decrypt('2bb4f0f02b806d21c6845503a2a7217144fd704bc2f5575c321492466bd126bbczJl0PQ45sUqh6aFpWaHzIq4SFOZiZlgCWF6n0TK2Lw1YweE7OU0/OpN358conVS56fcf54cc4120a2f24b985f5e6b496c57c24908b5a0cde72d8bda082efb3ed43')
};

youtube.searchForYoutubeTrack = async function searchForYoutubeTrack({title, creator = '', tags = {}, order = 'relevance' /* relevance | views */, onAccountError = () => {return void(0);}} = {}) {
	return await send({ 
		method: 'POST',
		URL: 'https://www.youtube.com/youtubei/v1/search?' + (youtube.key.length ? 'key=' + youtube.key : ''),
		body: JSON.stringify({
			'context': {
				'client': {
					'clientName': 'WEB',
					'clientVersion': '2.20210224.06.00',
					'newVisitorCookie': true,
					'sp': order.toLowerCase() === 'relevance' ? 'EgIQAQ%253D%253D' : 'CAMSAhAB'
				},
				'user': {
					'lockedSafetyMode': false
				}
			},
			'query': creator + ' ' + title
		})
	}).then(
		(resolve) => {
			if (resolve) {
				const response = JSON.parse(resolve);
				const keys = ['contents','twoColumnSearchResultsRenderer','primaryContents','sectionListRenderer','contents',['itemSectionRenderer','contents']];
				// Find the video nodes
				let nodes;
				keys.forEach((key, i) => {
					if (i === 0) {nodes = response;}
					if (Array.isArray(key)) {
						nodes = nodes.find((node) => node.hasOwnProperty(key[0]));
						key.forEach((subKey) => nodes = nodes[subKey]);
					} else {
						nodes = nodes[key];
					}
				});
				// Get video id and title
				const videos = nodes && Array.isArray(nodes) 
					? nodes.map((node) => { 
						if (node.hasOwnProperty('videoRenderer') && node.videoRenderer.hasOwnProperty('videoId')) {
							let title, id, length;
							try {title = node.videoRenderer.title.runs[0].text} catch (e) {title = '';}
							try {id = node.videoRenderer.videoId} catch (e) {id = '';}
							try {
								length = node.videoRenderer.lengthText.simpleText
								length = length.split(':').reduce((acc,time) => (60 * acc) + +time);
							} catch (e) {id = '';}
							return (id && title && length ? {id, title, length, score: 0} : null);
						} else {return null;}
					}).filter(Boolean) : [];
				if (videos.length) {
					// Find best matches
					const conditions = [
						{re: new RegExp('.*' + escapeRegExpV2(title) + '.*', 'i'), match: true, score: 35},
						{re: new RegExp('.*' + escapeRegExpV2(creator) + '.*', 'i'), match: true, score: 35},
						{re: new RegExp('.*(live|bootleg|cover|karaoke|performed by).*', 'i'), match: false, score: 30},
					];
					videos.forEach((vid) => {
						conditions.forEach((cond) => {
							if (cond.re.test(vid.title) === cond.match) {
								vid.score += cond.score;
							}
						});
					});
					videos.sort((a, b) => b.score - a.score);
					// Create link
					const mTags = false;
					const vid = videos[0];
					const track = capitalize(title);
					const artist = capitalizeAll(creator);
					return {
						title: track,
						artist,
						length: vid.length,
						url: 'fy+https://www.youtube.com/watch?' + 
							'v=' + vid.id + 
							'&fb2k_title=' + encodeURIComponent(track) + 
							'&fb2k_search_title=' + encodeURIComponent(vid.title) + 
							'&fb2kx_length=' + encodeURIComponent(vid.length) + 
							'&fb2kx_title=' + encodeURIComponent(track) + 
							'&fb2k_artist=' + encodeURIComponent(artist) + 
							(
								tags 
									? Object.entries(tags).map((entry) => '&fb2k_' + entry[0] + '=' + encodeURIComponent(entry[1])).join('')
									: ''
							),
						...(tags || {})
					};
				}
			}
			return null
		},
		(reject) => { // Retry once
			// console.log('searchForYoutubeTrack: ' + reject.status + ' ' + reject.responseText);
			if (reject.status === 401) {
				try {
					return searchForYoutubeTrack({title, creator, onAccountError: void(0)});
				} catch (error) {
					// Run onAccountError if we can't refresh the token
					if (isFunction(onAccountError)) {
						onAccountError();
					}
				}
			}
			return null;
		}
	);
};

youtube.cleanTitle = function cleanTitle(title) {
	return n.replace(/&amp(;|)/g, '&').replace(/&quot(;|)/g, '"').replace(/&#39(;|)/g, "'").replace(/&gt(;|)/g, '>').replace(/&nbsp(;|)/g, '').replace(/(\.mv4|1080p|1080i|1080|\d(\d|)(\.|\s-)|explicit( version|)|full HD|HD full|full HQ|full song|(high |HD - |HD-|HD )quality|(| |with |& |w( |)\/( |)|\+ )lyric(s(!|) on Screen|s|)|(official |)music video( |)|official (music|version|video)( |)|(song |official (fan |)|)audio( version| only| clean|)|(| |\+ )official( solo| |)|uncensored|vevo presents|video( |))|\.wmv/gi, '').replace(/(HD|HQ)(\s-\s|)/g, '').replace(/\((|\s+)\)/g, '').replace(/\[(|\s+)\]/g, '').replace(/\(\)/g, '').replace(/\[\]/g, '').replace(/\s+/g, ' ').replace(/[\s-/\\+]+$/g, '').trim();
};