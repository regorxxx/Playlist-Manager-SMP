'use strict';
//28/02/23

include('..\\..\\helpers\\helpers_xxx_basic_js.js');
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
include('..\\..\\helpers\\helpers_xxx_web.js');
const SimpleCrypto = require('..\\helpers-external\\SimpleCrypto-js\\SimpleCrypto.min');
const regExyoutubeURL = /(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^&\s?]+(?!\S))\/)|(?:\S*v=|v\/)))([^&\s?]+)/g;

async function searchForYoutubeTrack(apiKey, trackName, artistName,	releaseName = '', refreshToken = () => {return new Promise();}, onAccountError = () => {return void(0);}) {
	if (!apiKey) {return null;}
	let query = trackName || '';
	if (artistName) {query += ' ' + artistName;}
	// Considering we cannot tell the Youtube API that this should match only an album title,
	// results are paradoxically sometimes worse if we add it to the query (YT will find random matches for album title words)
	if (releaseName) {query += ' ' + releaseName;}
	if (!query.length) {return null;}
	
	const response = await send({ 
		method: 'GET',
		URL: 'https://youtube.googleapis.com/youtube/v3/search?part=snippet&q=' + encodeURIComponent(query) + ' &videoEmbeddable=true&type=video&key=' + apiKey,
		requestHeader: [
			['Content-Type', 'application/json; charset=UTF-8'],
			['Referer', 'https://listenbrainz.org/'],
			['User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/110.0'],
		],
	}).then(
		(resolve) => {
			console.log('searchForYoutubeTrack: ' + resolve);
			if (resolve) {
				const response = JSON.parse(resolve);
				if (response.items) {
					const tracks = response.items;
					const videoIds = tracks.map((track) => track.id.videoId);
					return videoIds.length ? response.playlist_mbid : null;
				}
				return null;
			}
			return null;
		},
		(reject) => {
			console.log('syncToListenBrainz: ' + reject.status + ' ' + reject.responseText);
			if (reject.status === 401) {
				if (refreshToken) {
					try {
						return searchForYoutubeTrack(apiKey, trackName, artistName, releaseName, void(0));
					} catch (error) {
						// Run onAccountError if we can't refresh the token
						if (isFunction(onAccountError)) {
							onAccountError();
						}
					}
				}
				// Run onAccountError if we already tried refreshing the token but still getting 401
				if (isFunction(onAccountError)) {onAccountError();}
			}
			return null;
		}
	);
};

async function searchForYoutubeTrackV2(trackName, artistName = '', releaseName = '', refreshToken = () => {return new Promise();}, onAccountError = () => {return void(0);}) {
	let query = trackName || '';
	if (artistName) {query += ' ' + artistName;}
	// Considering we cannot tell the Youtube API that this should match only an album title,
	// results are paradoxically sometimes worse if we add it to the query (YT will find random matches for album title words)
	if (releaseName) {query += ' ' + releaseName;}
	if (!query.length) {return null;}
	query = encodeURIComponent(query);
	const response = await send({ 
		method: 'GET',
		URL: 'https://www.youtube.com/results?search_query=' + query + '&oq=' + query,
		requestHeader: [['Content-Type', 'application/json']],
	}).then(
		(resolve) => {
			if (resolve) {
				console.log(escapeRegExpV2('<ytd-video-renderer class="style-scope ytd-item-section-renderer"'));
				const reElement = /<ytd\-video\-renderer class="style\-scope ytd\-item\-section\-renderer".*/gi;
				const reTrack = new RegExp('.*' + escapeRegExpV2(trackName) + '.*', 'gi');
				const reArtist = new RegExp('.*' + escapeRegExpV2(artistName) + '.*', 'gi');
				console.log(resolve);
				const matches = resolve.match(reElement);
				console.log(matches);
				matches.every((match) => {
					// get track info from youtube data element
					if (reArtist.test(match[0]) && reTrack.test(match[0])) {
						const youtube = [...match[0].matchAll(regExyoutubeURL)];
						console.log(youtube);
					}
				});
				return null;
			}
			return null;
		},
		(reject) => {
			console.log('searchForYoutubeTrackV2: ' + reject.status + ' ' + reject.responseText);
			if (reject.status === 401) {
				if (refreshToken) {
					try {
						return searchForYoutubeTrackV2(trackName, artistName, releaseName, void(0));
					} catch (error) {}
				}
			}
			return null;
		}
	);
};

async function searchForYoutubeTrackV3(trackName, artistName = '', releaseName = '', refreshToken = () => {return new Promise();}, onAccountError = () => {return void(0);}) {
	const response = await send({ 
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
			'query': artistName + ' ' + trackName
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
					{re: new RegExp('.*' + escapeRegExpV2(trackName) + '.*', 'i'), match: true, score: 35},
					{re: new RegExp('.*' + escapeRegExpV2(artistName) + '.*', 'i'), match: true, score: 35},
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
					const track = capitalize(trackName);
					const artist = capitalizeAll(artistName);
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
				console.log(JSON.stringify(bestVidTags(videos[0]), null, '\t'));
				return null;
			}
			return null;
		},
		(reject) => {
			console.log('searchForYoutubeTrackV2: ' + reject.status + ' ' + reject.responseText);
			if (reject.status === 401) {
				if (refreshToken) {
					try {
						return searchForYoutubeTrackV3(trackName, artistName, releaseName, void(0));
					} catch (error) {}
				}
			}
			return null;
		}
	);
};