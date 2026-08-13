'use strict';
//11/08/26

/* exported downloadText, paginatedFetch, abortWebRequests, addUrlParams, sendV2, downloadFile, downloadFileV2, downloadImg, checkUpdate, getWikiImg, HTMLFile */

include('helpers_xxx.js');
/* global folders:readable, compareVersions:readable, globSettings:readable */
include('helpers_xxx_prototypes.js');
/* global tryActiveX:readable, doOnce:readable */
/* global _q:readable */
include('helpers_xxx_file.js');
/* global doc:readable, _exec:readable, _runCmd:readable, _isFile:readable, _resolvePath:readable, popup:readable, WshShell:readable, _runCmd:readable, popup:readable, _explorer:readable, _open:readable */

// Http Requests when utils.HTTPRequestAsync is available. Properties are duplicated
// with different casing so it works as 1:1 replacement for XMLHttp and
// WinHttp.WinHttpRequest.5.1 ActiveX objects.
function XMLHttpRequest(bBuiltIn = true) { // eslint-disable-line no-redeclare
	return utils.HTTPRequestAsync && bBuiltIn
		? {
			url: void (0), type: void (0), onreadystatechange: void (0), headers: void (0),
			id: null, readyState: 0, status: 0, responseText: null,
			get Status() { return this.status; },
			get ResponseText() { return this.responseText; },
			get ReadyState() { return this.readyState; },
			open: function (type, url) {
				this.url = url;
				this.type = type.toUpperCase() === 'GET' ? 0 : 1;
				this.readyState = 1;
			},
			get Open() { return this.open; },
			setRequestHeader: function (key, value) {
				if (!this.headers) { this.headers = {}; }
				this.headers[key] = value;
			},
			get SetRequestHeader() { return this.setRequestHeader; },
			abort: function () {
				this.readyState = 0;
				this.status = 0;
				this.id = null;
				this.responseText = null;
				window.WebRequests.delete(this);
			},
			get Abort() { return this.abort; },
			send: function (body) {
				window.WebRequests.add(this);
				this.id = utils.HTTPRequestAsync(
					this.type,
					this.url,
					this.headers ? JSON.stringify(this.headers) : '',
					this.type === 1 ? body : ''
				);
				this.readyState = 2;
			},
			get Send() { return this.send; },
			SetTimeouts: () => void (0),
			WaitForResponse: () => void (0),
		}
		: new ActiveXObject('Microsoft.XMLHTTP');
}

function HTMLFile(bBuiltIn = true) {
	const isNativeParser = utils.ParseHtml && bBuiltIn;
	const htmlDoc = isNativeParser
		? null
		: typeof doc !== 'undefined' && doc ? doc : tryActiveX('htmlfile');
	/**
	 * Converts an HTML response into an HTML object. If JS-Host provides an {@link utils.ParseHtml} method, that's preferred over ActiveX. Otherwise remember to close htmlDoc. When using ActiveX, don't forget to call  {@link _downloader.close } afterwards.
	 *
	 * @method
	 * @name parseHtml
	 * @kind method
	 * @memberof _downloader
	 * @param {string} response
	 * @returns {HtmlDocument}
	 */
	this.parse = (response) => {
		let doc;
		if (isNativeParser) {
			doc = utils.ParseHtml(response);
		} else if (htmlDoc) {
			htmlDoc.open();
			doc = htmlDoc.createElement('div');
			doc.innerHTML = response;
		}
		return this.extendPrototype(doc);
	};
	/**
	 * Extends ActiveX object prototype to mimic JSplitter html parsing
	 *
	 * @method
	 * @name extendPrototype
	 * @kind method
	 * @memberof _downloader
	 * @param {HtmlDocument|ActiveXObject} div
	 * @returns {HtmlDocument}
	 */
	this.extendPrototype = (div) => {
		const type = isNativeParser ? 'HtmlDocument' : 'ActiveXObject';
		const wrapper = { [type]: div };
		if (isNativeParser) {
			// Patch methods
			['getElementsByTagName', 'querySelector', 'querySelectorAll'].forEach((method) => {
				if (method in wrapper.HtmlDocument) {
					wrapper[method] = function () {
						return this.HtmlDocument[method](...arguments).map((n) => extend(n));
					};
				}
			});
			// Patch getters
			['childNodes', 'children'].forEach((getter) => {
				if (getter in wrapper.HtmlDocument) {
					Object.defineProperty(wrapper, getter, {
						get: function () {
							return this.HtmlDocument[getter].map((n) => extend(n));
						}
					});
				}
			});
			['firstChild', 'body', 'documentElement', 'head', 'root'].forEach((getter) => {
				if (getter in wrapper.HtmlDocument) {
					Object.defineProperty(wrapper, getter, {
						get: function () {
							return extend(this.HtmlDocument[getter]);
						}
					});
				}
			});
			// Map getters
			['className', 'innerHTMl', 'innerText', 'outerHTML', 'tagName', 'textContent', 'isElement'].forEach((getter) => {
				if (getter in wrapper.HtmlDocument) {
					Object.defineProperty(wrapper, getter, {
						get: function () {
							return this.HtmlDocument[getter];
						}
					});
				}
			});
			// Map methods
			['getAttribute', 'hasAttribute', 'hasClass', 'query'].forEach((method) => {
				if (method in wrapper.HtmlDocument) {
					wrapper[method] = function () {
						return this.HtmlDocument[method](...arguments);
					};
				}
			});
		} else {
			// Patch methods
			wrapper.getElementsByTagName = function () { // ActiveX arrays to js Arrays
				return Array.from(this.ActiveXObject.getElementsByTagName(...arguments), (n) => extend(n))
					.filter((n) => n.ActiveXObject.getAttribute); // Filter invalid parsed objects
			};
			wrapper.getAttribute = function (key) {
				return getAttribute(this.ActiveXObject, key);
			};
			// Patch getters
			Object.defineProperty(wrapper, 'childNodes', { // ActiveX arrays to js Arrays
				get: function () {
					return Array.from(this.ActiveXObject.childNodes, (n) => extend(n))
						.filter((n) => n.ActiveXObject.getAttribute); // Filter invalid parsed objects
				}
			});
			// Map getters
			Object.defineProperty(wrapper, 'innerHTML', {
				get: function () {
					return this.ActiveXObject.innerHTML || '';
				}
			});
			Object.defineProperty(wrapper, 'innerText', {
				get: function () {
					return this.tagName === 'script'
						? this.innerHTML.trim()
						: this.ActiveXObject.innerText || '';
				}
			});
			Object.defineProperty(wrapper, 'outerHTML', {
				get: function () {
					return this.ActiveXObject.outerHTML || '';
				}
			});
			if (wrapper.ActiveXObject.href) {
				Object.defineProperty(wrapper, 'href', {
					get: function () {
						return this.ActiveXObject.href;
					}
				});
			}
			if (wrapper.ActiveXObject.className) {
				Object.defineProperty(wrapper, 'className', {
					get: function () {
						return this.ActiveXObject.className.toLowerCase();
					}
				});
			}
			Object.defineProperty(wrapper, 'tagName', {
				get: function () {
					return (this.ActiveXObject.tagName || '').toLowerCase();
				}
			});
			// Add missing properties
			Object.defineProperty(wrapper, 'textContent', {
				get: function () {
					return this.innerText || '';
				}
			});

		}
		// New methods
		wrapper.toString = function () {
			return 'Object "' + type + ' HTML node {}';
		};
		wrapper.getElementsByClassName = function (className) {
			return ('root' in this ? this.root.childNodes : this.childNodes)
				.filter((n) => n.className === className);
		};
		wrapper.getElementById = function (id) {
			return ('root' in this ? this.root : this)
				.getElementsByTagName('*')
				.find((n) => n.getAttribute('id') === id) || null;
		};
		return wrapper;
	};
	const extend = this.extendPrototype.bind(this);
	/**
	 * Closes ActiveX object used for html parsing, if needed. Should always be called after {@link _downloader.parse } usage.
	 *
	 * @method
	 * @name closeHtml
	 * @kind method
	 * @memberof _downloader
	 * @returns {void}
	 */
	this.close = () => {
		if (!isNativeParser) { htmlDoc.close(); }
	};
	/**
	 * Emulates .getAttribute over ActiveX objects or uses native JS-Host methods if available.
	 *
	 * @method
	 * @name getAttribute
	 * @kind method
	 * @memberof _downloader
	 * @param {HtmlNode|Object} node
	 * @param {string} key
	 * @returns {HtmlDocument|ActiveXObject}
	 */
	this.getAttribute = (node, key) => {
		return this.formatAttribute(
			key,
			this.isAttributeProperty(key)
				? node[key]
				: node.getAttribute(this.mapAttribute(key)) || ''
		);
	};
	const getAttribute = this.getAttribute.bind(this);
	/**
	 * Maps html attributes to ActiveX objects names.
	 *
	 * @method
	 * @name mapAttribute
	 * @kind method
	 * @memberof _downloader
	 * @param {string} key
	 * @returns {string}
	 */
	this.mapAttribute = (key) => {
		if (!isNativeParser) {
			switch (key) { // NOSONAR
				case 'class': return 'className';
			}
		}
		return key;
	};
	/**
	 * Checks wether and ActiveX attribute must be accessed as a property.
	 *
	 * @method
	 * @name isAttributeProperty
	 * @kind method
	 * @memberof _downloader
	 * @param {string} key
	 * @returns {string}
	 */
	this.isAttributeProperty = (key) => {
		if (!isNativeParser) {
			switch (key) { // NOSONAR
				case 'href': return true;
			}
		}
		return false;
	};
	/**
	 * Formats attribute values for compatibility with HtmlDocument from JSplitter.
	 *
	 * @method
	 * @name formatAttribute
	 * @kind method
	 * @memberof _downloader
	 * @param {string} key
	 * @param {any} value
	 * @returns {any}
	 */
	this.formatAttribute = (key, value) => {
		if (!isNativeParser) {
			switch (key) { // NOSONAR
				case 'src':
				case 'href':
					return typeof value === 'string'
						? value.replace('about:', '')
						: value;
			}
		}
		return value;
	};
}

// Add handling to terminate activeX objects on foobar shutdown to avoid crashes
// If a panel error is thrown while a web request is active, the entire foobar2000
// instance may also crash; also the activeX object seems to be dispatched a few ms
// later than abort() is called
function addWebCallbacks() {
	if (typeof addEventListener !== 'undefined') {
		doOnce('addWebCallbacks', () => {
			addEventListener('on_script_unload', () => {
				window.IsUnload = true;
				abortWebRequests();
			});
			if (utils.HTTPRequestAsync) {
				addEventListener('on_http_request_done', (task_id, success, response_text, status) => {
					window.WebRequests.forEach((request) => {
						if (request.id === task_id) {
							request.readyState = 4;
							request.status = status;
							request.responseText = response_text;
							request.onreadystatechange();
							request.abort();
						}
					});
				});
			}
		})();
	}
}

// Helpers
function onStateChange(timer, resolve, reject, func = null, type = null, request = {}) {
	if (this !== null && timer !== null) { // this is xmlhttp bound
		if (this.readyState === 4) {
			if (window.WebRequests) { window.WebRequests.delete(this); }
			clearTimeout(timer); timer = null;
			if (this.status === 200) {
				if (func) { return func(this.responseText, this.response); }
				else {
					if (type !== null) {
						const contentType = this.getResponseHeader('Content-Type');
						if (!contentType.includes(type)) {
							reject({ status: this.status, responseText: 'Type mismatch: ' + contentType + ' is not ' + type });
						}
						resolve(contentType.includes('text') ? this.responseText : this.response);
					}
					resolve(this.responseText);
				}
			} else if (!func) {
				if (this.responseText.includes('CRYPT_E_REVOCATION_OFFLINE (0x80092013)') && !(this instanceof ActiveXObject)) {
					request.bBuiltIn = false;
					resolve(send(request));
				} else if (this.status === 403 && request.bCurlFallback) {
					downloadFile(request.URL, folders.temp + utils.MD5(request.URL))
						.then((path) => resolve(_open(path) || ''));
				} else {
					window.IsUnload
						? reject({ status: 408, responseText: 'Forced shutdown' })
						: reject({ status: this.status, responseText: this.responseText });
				}
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

function onStateChangeV2(resolve, reject, func = null, type = null) {
	if (this !== null) { // this is winHttp bound
		if (this.Status === 200) {
			if (window.WebRequests) { window.WebRequests.delete(this); }
			if (func) { return func(this.ResponseText, this.ResponseBody); }
			else {
				if (type !== null) {
					const contentType = this.GetResponseHeader('Content-Type');
					if (!contentType.includes(type)) {
						reject({ status: this.Status, responseText: 'Type mismatch: ' + contentType + ' is not ' + type });
					}
					resolve(contentType.includes('text') ? this.ResponseText : this.ResponseBody);
				}
				resolve(this.ResponseText);
			}
		} else if (!func) {
			window.IsUnload
				? reject({ status: 408, responseText: 'Forced shutdown' })
				: reject({ status: this.Status, responseText: this.ResponseText });
		}
	} else if (!func) {
		if (window.WebRequests) { window.WebRequests.delete(this); }
		window.IsUnload
			? reject({ status: 408, responseText: 'Forced shutdown' })
			: reject({ status: this.Status, responseText: this.ResponseText });
	}
	return null;
}

// May be used to async run a func for the response or as promise
function send({ method = 'GET', URL, body = void (0), func = null, requestHeader = [/*[header, type]*/], bypassCache = false, timeOut = 30000, type, bBuiltIn = true, bCurlFallback = true }) { // eslint-disable-line no-unused-vars
	addWebCallbacks();
	const p = new Promise((resolve, reject) => {
		if (window.IsUnload) { reject({ status: 408, responseText: 'Forced shutdown' }); return; } // NOSONAR
		let timer = null;
		const xmlhttp = new XMLHttpRequest(bBuiltIn);
		if (window.WebRequests) { window.WebRequests.add(xmlhttp); }
		// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#bypassing_the_cache
		// Add ('&' + new Date().getTime()) to URLS to avoid caching
		xmlhttp.open(
			method,
			URL + (bypassCache
				? (/\?/.test(URL) ? '&' : '?') + Date.now()
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
				try { status = xmlhttp.status; } catch (e) { status = 408; } // eslint-disable-line no-unused-vars
				reject({ status, responseText: 'Request Timeout' });  // NOSONAR
			}
		}, timeOut, xmlhttp);
		xmlhttp.onreadystatechange = onStateChange.bind(xmlhttp, timer, resolve, reject, func, type, { method, URL, body, func, requestHeader, bypassCache, timeOut, type, bBuiltIn, bCurlFallback });
		xmlhttp.send(method === 'POST' ? body : void (0));
	});
	return p;
}

function sendV2({ method = 'GET', URL, body = void (0), func = null, requestHeader = [/*[header, type]*/], bypassCache = false, timeOut = 30000, type }) {
	addWebCallbacks();
	const p = new Promise((resolve, reject) => {
		if (window.IsUnload) { reject({ status: 408, responseText: 'Forced shutdown' }); return; }  // NOSONAR
		const winHttp = new ActiveXObject('WinHttp.WinHttpRequest.5.1');
		if (window.WebRequests) { window.WebRequests.add(winHttp); }
		// https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#bypassing_the_cache
		// Add ('&' + new Date().getTime()) to URLS to avoid caching
		winHttp.Open(
			method,
			URL + (bypassCache
				? (/\?/.test(URL) ? '&' : '?') + Date.now()
				: ''),
			true
		);
		requestHeader.forEach((pair) => {
			if (!pair[0] || !pair[1]) { console.log('HTTP Headers missing: ' + pair); return; }
			winHttp.SetRequestHeader(...pair);
		});
		if (bypassCache) {
			winHttp.SetRequestHeader('Cache-Control', 'private');
			winHttp.SetRequestHeader('Pragma', 'no-cache');
			winHttp.SetRequestHeader('Cache', 'no-store');
			winHttp.SetRequestHeader('If-Modified-Since', 'Sat, 1 Jan 2000 00:00:00 GMT');
		}
		winHttp.SetTimeouts(timeOut, timeOut, timeOut, timeOut);
		winHttp.Send(method === 'POST' ? body : void (0));
		const timer = setTimeout(() => {
			clearInterval(checkResponse);
			if (!window.WebRequests || !window.WebRequests.has(winHttp)) { return; }
			else { window.WebRequests.delete(winHttp); }
			try {
				winHttp.WaitForResponse(-1);
				onStateChangeV2.call(winHttp, resolve, reject, func, type);
			} catch (e) {
				let status = 400;
				if (e.message.includes('0x80072ee7')) { /* do nothing */ }
				else if (e.message.includes('0x80072ee2')) { status = 408; }
				else if (e.message.includes('0x8000000a')) { status = 408; }
				winHttp.Abort();
				if (!func) { reject({ status, responseText: e.message }); } // NOSONAR
			}
		}, timeOut);
		const checkResponse = setInterval(() => {
			if (!window.WebRequests || !window.WebRequests.has(winHttp)) {
				clearInterval(checkResponse);
				clearTimeout(timer);
				return;
			}
			let response;
			try { response = winHttp.Status && winHttp.ResponseText; } catch (e) { } // eslint-disable-line no-unused-vars, no-empty
			if (!response) { return; }
			onStateChangeV2.call(winHttp, resolve, reject, func, type);
		}, 30);
	});
	return p;
}

// Send consecutive GET request, incrementing queryParams.offset or queryParams.page
// Keys are the response object path, which point to an array, to concatenate for the final response
function paginatedFetch({ URL, queryParams = {}, requestHeader, keys = [], increment = 1, previousResponse = [] }) {
	// ListenBrainz: https://community.metabrainz.org/t/allow-getting-more-user-data-through-the-api/653689/2
	// Use min_ts as lower limit and break there
	let min_ts;
	let paramsArr = Object.entries(queryParams);
	if (Object.hasOwn(queryParams, 'max_ts') && Object.hasOwn(queryParams, 'min_ts')) {
		min_ts = queryParams.min_ts;
		paramsArr = paramsArr.filter((pair) => pair[0] !== 'min_ts');
	}
	const urlParams = paramsArr.length
		? '?' + paramsArr.map((pair) => pair[0] + '=' + pair[1]).join('&')
		: '';
	return send({ method: 'GET', URL: URL + urlParams, requestHeader, bypassCache: true })
		.then(
			(resolve) => {
				if (keys.length) {
					return resolve
						? keys.reduce((acc, key) => { return acc && Object.hasOwn(acc, key) ? acc[key] : null; }, JSON.parse(resolve)) || []
						: [];
				} else {
					return resolve ? JSON.parse(resolve) : [];
				}
			},
			() => []
		)
		.then((newResponse) => {
			let bBreak = false;
			const len = newResponse.length;
			// ListenBrainz: https://community.metabrainz.org/t/allow-getting-more-user-data-through-the-api/653689/2
			// Use min_ts as lower limit and break there
			if (min_ts && len) {
				if (newResponse[len - 1].listened_at <= min_ts) {
					newResponse = newResponse.filter((listen) => listen.listened_at > min_ts);
					bBreak = true;
				}
			}
			const response = [...previousResponse, ...newResponse];
			if (len !== 0 && !bBreak) {
				// Standard pagination
				if (Object.hasOwn(queryParams, 'offset')) { queryParams.offset += increment; }
				else if (Object.hasOwn(queryParams, 'page')) { queryParams.page += increment; }
				// ListenBrainz: https://community.metabrainz.org/t/allow-getting-more-user-data-through-the-api/653689/2
				else if (Object.hasOwn(queryParams, 'max_ts') && len > 1) { queryParams.max_ts = newResponse[len - 1].listened_at; }
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

function addUrlParams(params) {
	return Object.keys(params).length
		? '?' + encodeUrlParams(params)
		: '';
}

function encodeUrlParams(params) {
	return Object.entries(params).map((pair) => {
		return Array.isArray(pair[1])
			? pair[1].map((val) => [pair[0], val].map(encodeURIComponent).join('=')).join('&')
			: pair.map(encodeURIComponent).join('=');
	}).join('&');
}

function getCurl(impersonate = globSettings.curlImpersonate) {
	const curl = [
		folders.binaries,
		folders.xxx + folders.binariesName,
		folders.xxx + 'helpers-external\\',
		fb.ComponentPath + folders.binariesName,
		fb.FoobarPath + folders.binariesName
	]
		.map((p) => {
			return {
				path: p + 'curl\\' + (impersonate || 'curl.exe'),
				certs: p + 'curl\\curl-ca-bundle.crt'
			};
		})
		.find((c) => _isFile(c.path)) || { path: '', certs: '' };
	if (!_isFile(curl.certs)) {
		WshShell.popup('Download certificates from:\nhttps://github.com/bagder/ca-bundle\nhttps://curl.se/docs/caextract.html\n\nFile should be named \'curl-ca-bundle.crt\' and placed next to the curl executable.', 60, 'Curl certificates not found', popup.ok);
		return '';
	}
	if (!curl.path) {
		WshShell.popup('Missing curl executable.', 60, 'Curl certificates not found', popup.ok);
		return '';
	}
	return curl.path;
}

// Methods
function downloadFile(url, path, { referer = typeof url === 'string' ? url.split('/').slice(0, -1).join('/') : '', timeout = 10, retry = 3 } = {}) {
	if (!url) { return Promise.resolve(null); }
	const curl = getCurl();
	if (!curl) { return Promise.resolve(null); }
	return new Promise((resolve) => {
		let id = setInterval(() => { if (_isFile(path)) { clearInterval(id); id = null; resolve(path); } }, 50);
		setTimeout(() => { if (id) { clearInterval(id); id = null; resolve(null); } }, 10000);
		_runCmd('CMD /C ' + _q(_q(curl) + (timeout ? ' --connect-timeout ' + timeout + ' --max-time ' + timeout : '') + (retry ? ' --retry ' + retry + ' --retry-max-time ' + (timeout || 5) : '') + (referer ? ' --referer ' + _q(referer) : '') + ' -L -o ' + _q(_resolvePath(path) + '_') + ' ' + _q(url) + ' & MOVE ' + _q(_resolvePath(path) + '_') + ' ' + _q(path)), false);
	})
		.catch(() => void (0))
		.then((path) => path || null);
}

function downloadImg(url, path, method = 'v1') {
	if (!url) { return Promise.resolve(null); }
	return (method.toLowerCase() === 'v1' ? downloadFile : downloadFileV2)(url, path)
		.then((path) => path ? gdi.LoadImageAsyncV2(window.IDBCursor, path) : Promise.resolve(null));
}


function downloadFileV2(url, path, { referer = typeof url === 'string' ? url.split('/').slice(0, -1).join('/') : '', timeout = 10, retry = 3 } = {}) {
	if (!url) { return Promise.resolve(null); }
	const curl = getCurl();
	if (!curl) { return Promise.resolve(null); }
	return _exec(_q(curl) + (timeout ? ' --connect-timeout ' + timeout + ' --max-time ' + timeout : '') + (retry ? ' --retry ' + retry + ' --retry-max-time ' + (timeout || 5) : '') + (referer ? ' --referer ' + _q(referer) : '') + ' -L -o ' + _q(_resolvePath(path) + '_') + ' ' + _q(url))
		.catch(() => void (0))
		.then(() => _isFile(path) ? path : null);

}

function downloadText(URL) {
	return URL.includes('http://') || URL.includes('https://')
		? send({ method: 'GET', URL, bypassCache: true })
		: Promise.reject(new Error('Input is not a link.'));
}

function getWikiImg(value, { fileType = '', assessment = '' } = {}) {
	const url = 'https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent(value) + '&title=Special:MediaSearch&go=Go&type=image' + (fileType ? '&filemime=' + fileType : '') + (assessment ? '&assessment=' + assessment : '');
	return send({
		method: 'GET',
		bypassCache: true,
		requestHeader: [
			['user-agent', globSettings.userAgent]
		],
		URL: url
	})
		.then((response) => {
			const match = (response.match(/data-src="(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+?\.(jpg|png|webp))"/mi) || [null, null, null]);
			if (!match[1] || !match[2]) { throw new Error('No image match'); }
			const url = match[1].replace('thumb/', '').split('/').slice(0, -1).join('/');
			const file = url.split('/').at(-1);
			return { url, file, ext: '.' + match[2] };
		})
		.catch((reject) => {
			console.log('getWikiImg(): ' + (reject.message || reject.status + ' - ' + reject.responseText) + '\n\t' + url);
			return null;
		});
};

function checkUpdate({
	scriptName = window.ScriptInfo.Name,
	repository = 'https://github.com/' + window.ScriptInfo.Author + '/' + (scriptName || '').replace(/ /g, '-') + ((scriptName || '').endsWith('-SMP') ? '' : '-SMP'),
	version = window.ScriptInfo.Version,
	bDownload = false,
	bOpenWeb = true,
	bDisableWarning = true
} = {}) {
	const bGithub = repository.startsWith('https://github.com/');
	const versionURL = bGithub
		? repository.replace('github.com', 'raw.githubusercontent.com').replace(/\/$/, '') + '/main/VERSION'
		: repository;
	return downloadText(versionURL)
		.then((lastVersion) => {
			if (!compareVersions(version, lastVersion.replace(/^v/i, ''))) {
				console.log('A new version has been found for ' + scriptName + ' script: ' + lastVersion.replace(/^v/i, ''));
				const nameIsUUID = /{.{8}-.{4}-.{4}-.{4}-.{12}}/.test(window.Name);
				const answer = WshShell.Popup('A new version is available: ' + lastVersion + (bGithub && bDownload ? '\nDownload?' : bOpenWeb ? '\nOpen script webpage?' : '') + (bDisableWarning ? '\n\n(Automatic update checking can be disabled at settings)' : ''), 0, nameIsUUID ? scriptName : window.Name + ': ' + scriptName, popup.info + popup.yes_no);
				const packageName = repository.replace(/\/$/, '').split('/').at(-1);
				if (bDownload && answer === popup.yes) {
					let file, fileURL;
					if (bGithub) {
						file = packageName + '-' + lastVersion.replace(/^v/i, '').replace(/\./g, '-') + '-package.zip';
						fileURL = repository.replace(/\/$/, '') + '/releases/latest/download/' + file;
					}
					const output = folders.xxx + 'packages\\' + file;
					_runCmd('CMD /C ' + folders.xxx + '\\helpers-external\\curl\\curl.exe -L -o ' + output + ' ' + fileURL + ' & ECHO. & ECHO File downloaded to ' + _q(output) + ' & ECHO A new window will show the file' + (bOpenWeb ? ' and the browser the release page' : '') + ' & ECHO Press any key to exit & EXPLORER /SELECT,' + output + ' & PAUSE>nul', false, 1);
				}
				if (bOpenWeb && answer === popup.yes) {
					if (bGithub) {
						_explorer(repository.replace(/\/$/, '') + '/releases/latest/');
					} else {
						_explorer(repository);
					}
				}
				return true;
			}
			return false;
		}).catch((reason) => {
			if (typeof reason === 'object') { reason = reason.responseText || reason.status; }
			switch (reason) {
				case 12007: reason = 'Network error'; break;
				case '': reason = 'Unknown error'; break;
			}
			console.log('downloadText(): ' + reason + '\n\t ' + versionURL);
			return false;
		});
}

window.WebRequests = new Set();
if (typeof addEventListener !== 'undefined') { addWebCallbacks(); }