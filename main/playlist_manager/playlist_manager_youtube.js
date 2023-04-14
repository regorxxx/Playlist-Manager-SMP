'use strict';
//14/04/23

include('..\\..\\helpers\\helpers_xxx_basic_js.js');
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
include('..\\..\\helpers\\helpers_xxx_web.js');
const regExyoutubeURL = /(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^&\s?]+(?!\S))\/)|(?:\S*v=|v\/)))([^&\s?]+)/g;

async function searchForYoutubeTrack({title, creator = '', onAccountError = () => {return void(0);}} = {}) {
	return await send({ 
		method: 'POST',
		URL: 'https://www.youtube.com/youtubei/v1/search?',
		body: JSON.stringify({
			'context': {
				'client': {
					'clientName': 'WEB',
					'clientVersion': '2.20210224.06.00',
					'newVisitorCookie': true,
					'sp': 'EgIQAQ%253D%253D'
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
				const videos = nodes.map((node) => { 
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
				}).filter(Boolean);
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
				const mTags = false;
				const bestVidTags = (vid) => {
					const track = capitalize(title);
					const artist = capitalizeAll(creator);
					return {
						title: vid.title,
						length: vid.length,
						url: '3dydfy://www.youtube.com/watch?' + (!mTags 
								? 'fb2k_title=' + encodeURIComponent(track) + 
									'&fb2k_search_title=' + encodeURIComponent(vid.title) + 
									'&fb2kx_length=' + encodeURIComponent(vid.length) + 
									'&fb2kx_title=' + encodeURIComponent(track) + 
									'&fb2k_artist=' + encodeURIComponent(artist) + '&'
								: ''
							) + 'v=' + vid.id
					};
				};
				return bestVidTags(videos[0]);
			}
			return null;
		},
		(reject) => { // Retry once
			console.log('searchForYoutubeTrackV2: ' + reject.status + ' ' + reject.responseText);
			if (reject.status === 401) {
				try {
					return searchForYoutubeTrackV3({title, creator, onAccountError: void(0)});
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