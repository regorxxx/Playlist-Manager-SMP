'use strict';
//23/07/24

/* exported getText, paginatedFetch, abortWebRequests */

function getText(URL) {
	return URL.indexOf('http://') !== -1 || URL.indexOf('https://') !== -1
		? send({ method: 'GET', URL, bypassCache: true })
		: Promise.reject(new Error('Input is not a link.'));
}

function onStateChange(timer, resolve, reject, func = null, type = null) {
	if (this !== null && timer !== null) { // this is xmlhttp bound
		if (this.readyState === 4) {
			if (window.WebRequests) { window.WebRequests.delete(this); }
			clearTimeout(timer); timer = null;
			if (this.status === 200) {
				if (func) { return func(this.responseText); }
				else {
					if (type !== null) {
						const contentType = this.getResponseHeader('Content-Type');
						if (contentType.indexOf(type) === -1) {
							reject({ status: this.status, responseText: 'Type mismatch: ' + contentType + ' is not ' + type });
						}
					}
					resolve(this.responseText);
				}
			} else if (!func) {
				window.IsUnload
					? reject({ status: 408, responseText: 'Forced shutdown' })
					: reject({ status: this.status, responseText: this.responseText });

			}
		}
	} else if (!func && this !== null) {
		if (window.WebRequests) { window.WebRequests.delete(this); }
		window.IsUnload
			? reject({ status: 408, responseText: 'Forced shutdown' })
			: reject({ status: this.status, responseText: this.responseText });
	} // 408 Request Timeout
	return null;
}

// May be used to async run a func for the response or as promise
function send({ method = 'GET', URL, body = void (0), func = null, requestHeader = [/*[header, type]*/], bypassCache = false, timeOut = 30000, type }) {
	const p = new Promise((resolve, reject) => {
		if (window.IsUnload) { reject({ status: 408, responseText: 'Forced shutdown' }); return; }
		let timer = null;
		const xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
		if (window.WebRequests) { window.WebRequests.add(xmlhttp); }
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
			if (window.WebRequests) { window.WebRequests.delete(xmlhttp); }
			xmlhttp.abort();
			timer = null;
			if (!func) { // 408 Request Timeout
				let status;
				try { status = xmlhttp.status; } catch (e) { status = 408; }
				reject({ status, responseText: 'Request Timeout' });
			}
		}, timeOut, xmlhttp);
		xmlhttp.onreadystatechange = onStateChange.bind(xmlhttp, timer, resolve, reject, func, type);
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

function abortWebRequests(bClear = true) {
	if (window.WebRequests) {
		window.WebRequests.forEach((webObj) => {
			if (webObj.Abort) { webObj.Abort(); }
			else if (webObj.abort) { webObj.abort(); }
		});
		if (bClear) { window.WebRequests.clear(); }
	}
}

// Add handling to terminate activeX objects on foobar shutdown to avoid crashes
// If a panel error is thrown while a web request is active, the entire foobar2000
// instance may also crash; also the activeX object seems to be dispatched a few ms
// later than abort() is called
if (typeof addEventListener !== 'undefined') {
	window.WebRequests = new Set();
	addEventListener('on_script_unload', () => {
		window.IsUnload = true;
		abortWebRequests();
	});
}