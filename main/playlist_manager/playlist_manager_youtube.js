'use strict';
//19/12/22

include('..\\..\\helpers\\helpers_xxx_basic_js.js');
include('..\\..\\helpers\\helpers_xxx_prototypes.js');
include('..\\..\\helpers\\helpers_xxx_web.js');
const SimpleCrypto = require('..\\helpers-external\\SimpleCrypto-js\\SimpleCrypto.min');
var regExyoutubeURL = /(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^&\s?]+(?!\S))\/)|(?:\S*v=|v\/)))([^&\s?]+)/g;

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
		requestHeader: [['Content-Type', 'application/json']],
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