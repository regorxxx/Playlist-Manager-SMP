'use strict';
//10/06/25

/* exported newInstancesManager*/

include('callbacks_xxx.js');

function newInstancesManager(version = 'v1') {
	switch (version.toLowerCase()) {
		case 'v1': return new _instancesManager();
		case 'v2':
		default: return new _instancesManagerV2();
	}
}

/*
	Instances Manager:
	Workaround to using window.notifyOthers with other panels.
	.remove() must be called via 'on_script_unload' on every panel whenever a instance has been registered using .add(). This ensures there are not dead instances on other panels.
	Alternatively, you can call .get() with forced arg within an interval to ensure it's always updated (i.e. on panel crashes .remove() is never called).
*/
function _instancesManager() {
	this._ = {};
	this._intervalId = {};
	this._timeout = 500;
	this.isWorking = false;

	this.push = function (instance) {
		const key = instance.key;
		if (!this._[key]) { this._[key] = []; }
		this._[key].push(instance);
		this.sort(key);
	};
	this.delete = function (instance) {
		const key = instance.key;
		if (this._[key] && this._[key].length) {
			const idx = this._[key].findIndex((i) => i.id === instance.id);
			if (idx !== -1) {
				this._[key].splice(idx, 1);
				this.sort(key);
			}
		}
	};
	this.add = function (key, bNotify = true) {
		const instance = { id: window.ID, key, date: Date.now(), panelName: window.Name };
		if (bNotify) { window.NotifyOthers('storeInstance', instance); }
		this.push(instance);
	};
	this.sort = function (key) {
		this._[key].sort((a, b) => a.date - b.date);
	};
	this.remove = function (key, bNotify = true) {
		const instance = { id: window.ID, key };
		if (bNotify) { window.NotifyOthers('deleteInstance', instance); }
		this.delete(instance);
	};
	this.get = function (key, bForced = false) {
		if (!bForced && this._[key]) {
			return this._[key];
		} else {
			this.isWorking = true;
			const newInstances = [];
			const listener = addEventListener('on_notify_data', (name, /** @type {{caller:string, name:string, id:string, date:number, panelName:string}} */ info) => {
				if (name === 'getInstance' && info && info.caller === window.ID) {
					newInstances.push({ ...info });
				}
			});
			const self = this.getSelf(key);
			window.NotifyOthers('sendInstance', { caller: window.ID, key, ...(self || {}) });
			return Promise.wait(this._timeout).then(() => {
				removeEventListener(listener.event, null, listener.id);
				if (!this._[key]) { this._[key] = []; }
				else {
					this._[key].length = 0;
					if (self) { this._[key].push(self); }
				}
				newInstances.forEach((i) => this._[key].push(i));
				this.sort(key);
				this.isWorking = false;
				return this._[key];
			});
		}
	};
	this.getSelf = function (key) {
		if (this._[key] && this._[key].length) {
			const instance = this._[key].find((i) => i.id === window.ID);
			return instance ? { ...instance } : null;
		}
		return null;
	};
	this.getMain = function (key, bForced = false) {
		if (!bForced && this._[key]) {
			return this._[key][0];
		} else {
			return this.get(key, true).then((instances) => instances[0]);
		}
	};
	this.getInterval = function (name, timeout) {
		this.clearGetInterval(name);
		this._intervalId[name] = setInterval(() => this.get(name, true), timeout);
		return this._intervalId[name];
	};
	this.clearGetInterval = function (name) {
		if (this._intervalId[name]) {
			clearInterval(this._intervalId[name]);
			this._intervalId[name] = null;
			return true;
		}
		return false;
	};
	this.init = function () {
		const parent = this;
		addEventListener('on_notify_data', (name, /** @type {{caller:string, name:string, id:string, date:number, panelName: window.Name}} */ info) => {
			if (name === 'storeInstance' && info) {
				parent.push({ ...info });
			}
			if (name === 'deleteInstance' && info) {
				parent.delete({ ...info });
			}
			if (name === 'sendInstance' && info && window.ScriptInfo.Name === info.key) {
				const instance = this.getSelf(info.key);
				if (instance) {
					instance.caller = info.caller;
					// SMP Bug notify others doesn't work here without the timeout
					setTimeout(() => window.NotifyOthers('getInstance', instance), 50);
				}
			}
		});
	};
}

/*
	Instances Manager V2:
	Workaround to using window.notifyOthers with other panels.
	Functions on intervals/timeouts don't update properly variables modified via callbacks, so the actual panels IDs must be read from files.
	'removeInstance' must be called via 'on_script_unload' on every panel whenever a instance is logged
	using 'addInstance'. This ensures the file is empty of IDs when foobar2000 closes. Otherwise, the file
	is cleared on consecutive foobar2000 startups.
*/
function _instancesManagerV2() {
	include('helpers_xxx.js');
	/* global folders:readable, lastStartup:readable */
	include('helpers_xxx_prototypes.js');
	/* global SetReplacer:readable */
	include('helpers_xxx_file.js');
	/* global _isFile:readable, _save:readable, _deleteFile:readable, _jsonParseFileCheck:readable, utf8:readable */
	const file = folders.temp + 'xxxInstances.json';
	const getInstances = () => {
		const newInstances = _jsonParseFileCheck(file, 'Instances json file', void (0), utf8);
		if (newInstances) {
			for (let key of Object.keys(newInstances)) { if (key !== 'date') { newInstances[key] = new Set(newInstances[key]); } }
		}
		return newInstances;
	};
	this.isWorking = false;

	this.add = function (key) {
		const newInstances = getInstances();
		let bDone = false;
		if (newInstances) {
			if (Object.hasOwn(newInstances, key)) { newInstances[key].add(window.ID); bDone = true; }
			else { newInstances[key] = new Set([window.ID]); bDone = true; }
		}
		if (bDone) { _save(file, JSON.stringify(newInstances, (k, v) => { return SetReplacer(null, v); }, '\t')); }
		return bDone;
	};
	this.remove = function (key) {
		const newInstances = getInstances();
		let bDone = false;
		if (newInstances && Object.hasOwn(newInstances, key) && newInstances[key].has(window.ID)) {
			newInstances[key].delete(window.ID);
			if (newInstances[key].size === 0) { delete newInstances[key]; }
			bDone = true;
		}
		if (bDone) { _save(file, JSON.stringify(newInstances, (k, v) => { return SetReplacer(null, v); }, '\t')); }
		return bDone;
	};
	this.get = function (key) {
		return [...((getInstances() || {})[key] || new Set())]
			.map((id) => {
				return { key, id: id, panelName: '' };
			});
	};
	this.getSelf = function (key) {
		const instances = this.get(key);
		return instances.has(window.ID) ? { key, id: window.ID, panelName: window.Name } : null;
	};
	this.getMain = function (key) {
		const main = this.get(key)[0];
		return main ? { key, id: main, panelName: ''} : null;
	};
	this.getInterval = function (name, timeout) { return void (0); }; // eslint-disable-line no-unused-vars
	this.clearGetInterval = function (name) { return true; }; // eslint-disable-line no-unused-vars
	this.init = function () {
		const now = lastStartup().toString(); // Alternative to checking new startup via SDK?
		// Create file the first time and ensure the file is up to date (avoids old Ids on file from previously crashed instances)
		if (!_isFile(file)) { _save(file, JSON.stringify({ date: now }, null, '\t').replace(/\n/g, '\r\n')); }
		else {
			const newInstances = getInstances();
			if (!newInstances || !Object.hasOwn(newInstances, 'date') || now !== newInstances.date) {
				_deleteFile(file);
				_save(file, JSON.stringify({ date: now }, null, '\t').replace(/\n/g, '\r\n'));
			}
		}
	};
}