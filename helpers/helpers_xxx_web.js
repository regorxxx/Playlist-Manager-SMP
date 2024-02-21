'use strict';
//21/02/24

/* exported getText, paginatedFetch */

function getText(URL) {
	return URL.indexOf('http://') !== -1 || URL.indexOf('https://') !== -1
		? send({ method: 'GET', URL, bypassCache: true })
		: Promise.reject(new Error('Input is not a link.'));
}

function onStateChange(timer, resolve, reject, func = null) {
	if (this !== null && timer !== null) { // this is xmlhttp bound
		if (this.readyState === 4) {
			clearTimeout(timer); timer = null;
			if (this.status === 200) {
				if (func) { return func(this.responseText); }
				else { resolve(this.responseText); }

			} else if (!func) { reject({ status: this.status, responseText: this.responseText }); }
		}
	} else if (!func) { reject({ status: 408, responseText: this.responseText }); } // 408 Request Timeout
	return null;
}

// May be used to async run a func for the response or as promise
function send({ method = 'GET', URL, body = void (0), func = null, requestHeader = [/*[header, type]*/], bypassCache = false }) {
	const p = new Promise((resolve, reject) => {
		let timer = null;
		const xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
		// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#bypassing_the_cache
		// Add ('&' + new Date().getTime()) to URLS to avoid caching
		xmlhttp.open(
			method,
			URL + (bypassCache
				? (/\?/.test(URL) ? '&' : '?') + new Date().getTime()
				: '')
		);
		requestHeader.forEach((pair) => {
			if (!pair[0] || !pair[1]) { console.log('HTTP Headers missing: ' + pair); return; }
			xmlhttp.setRequestHeader(...pair);
		});
		if (bypassCache) {
			xmlhttp.setRequestHeader('Cache-Control', 'private');
			xmlhttp.setRequestHeader('Pragma', 'no-cache');
		}
		timer = setTimeout((xmlhttp) => {
			xmlhttp.abort();
			timer = null;
			if (!func) { // 408 Request Timeout
				let status = 408;
				try { status = xmlhttp.status; } catch (e) { /* empty */ }
				reject({ status, responseText: 'Request Timeout' });
			}
		}, 30000, xmlhttp);
		xmlhttp.onreadystatechange = onStateChange.bind(xmlhttp, timer, resolve, reject, func);
		xmlhttp.send(method === 'POST' ? body : void (0));
	});
	return p;
}

// Send consecutive GET request, incrementing queryParams.offset or queryParams.page
// Keys are the response object path, which point to an array, to concatenate for the final response
function paginatedFetch({ URL, queryParams = {}, requestHeader, keys = [], increment = 1, previousResponse = [] }) {
	const urlParams = Object.keys(queryParams).length ? '?' + Object.entries(queryParams).map((pair) => pair[0] + '=' + pair[1]).join('&') : '';
	return send({ method: 'GET', URL: URL + urlParams, requestHeader, bypassCache: true })
		.then(
			(resolve) => {
				if (!keys.length) {
					return resolve ? JSON.parse(resolve) : [];
				} else {
					return resolve
						? keys.reduce((acc, key) => { return acc && Object.hasOwn(acc, key) ? acc[key] : null; }, JSON.parse(resolve)) || []
						: [];
				}
			},
			() => []
		)
		.then((newResponse) => {
			const response = [...previousResponse, ...newResponse];
			if (newResponse.length !== 0) {
				if (Object.hasOwn(queryParams, 'offset')) { queryParams.offset += increment; }
				else if (Object.hasOwn(queryParams, 'page')) { queryParams.page += increment; }
				return paginatedFetch({ URL, queryParams, requestHeader, keys, increment, previousResponse: response });
			}
			return response;
		});
}