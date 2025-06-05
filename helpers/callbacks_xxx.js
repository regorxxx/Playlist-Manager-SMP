'use strict';
//04/06/25

/* exported addEventListener, removeEventListener, removeEventListeners, removeEventListenerSelf, registerAllCallbacks */


/*
	Usage:
		- addEventListener(): to attach a new function to a callback. For ex: to display a text on console when using L. Button click
			const listener = () => {console.log('Hello world!');};
			const id = addEventListener('on_mouse_lbtn_up', listener);
		- removeEventListener(): to remove a previously added listener. For ex:
			removeEventListener('on_mouse_lbtn_up', listener); // Previous id may also be used
		- findEventListener(): to find if some listener is attached to a callback. For ex:
			const idx = findEventListener('on_mouse_lbtn_up', listener); // -1 since it has been previously removed
		- removeEventListeners(): to remove all listeners attached to a callback. For ex:
			removeEventListeners('on_focus'); // true

		Following [Mozilla implementation](https://developer.mozilla.org/es/docs/Web/API/EventTarget/removeEventListener)
		event listeners may be removed using their UUID or event listener function itself.
		addEventListener() returns the UUID for the provided function, which may be useful for anonymous or inline functions.
		removeEventListener() accepts both the listener (2nd arg) or UUID (3rd arg) as arguments.

		Callback registering is done under the hood automatically although it may be done manually using
		registerCallback() or registerAllCallbacks(). Note registering a callback multiple times will effectively duplicate
		the listener calls, so it should be avoided. Removing all listeners associated to a callback will not unregister
		the callback itself, which would be an undesirable effect in some cases and harmless in any other case.

		Callbacks previously added to any script will be wrapped and used along those added with event listeners as long as
		callback registering is done automatically, so they may work in conjunction.

		See examples for more info.
*/

const callbacks = {
	on_always_on_top_changed:				{listeners: [], bRegistered: false},
	on_char: 								{listeners: [], bRegistered: false},
	on_colours_changed:						{listeners: [], bRegistered: false},
	on_cursor_follow_playback_changed:		{listeners: [], bRegistered: false},
	on_drag_drop:							{listeners: [], bRegistered: false},
	on_drag_enter:							{listeners: [], bRegistered: false},
	on_drag_leave:							{listeners: [], bRegistered: false},
	on_drag_over:							{listeners: [], bRegistered: false},
	on_dsp_preset_changed:					{listeners: [], bRegistered: false},
	on_focus:								{listeners: [], bRegistered: false},
	on_font_changed:						{listeners: [], bRegistered: false},
	on_get_album_art_done:					{listeners: [], bRegistered: false},
	on_item_focus_change:					{listeners: [], bRegistered: false},
	on_item_played:							{listeners: [], bRegistered: false},
	on_key_down:							{listeners: [], bRegistered: false},
	on_key_up:								{listeners: [], bRegistered: false},
	on_library_items_added:					{listeners: [], bRegistered: false},
	on_library_items_changed:				{listeners: [], bRegistered: false},
	on_library_items_removed:				{listeners: [], bRegistered: false},
	on_load_image_done:						{listeners: [], bRegistered: false},
	on_main_menu:							{listeners: [], bRegistered: false},
	on_main_menu_dynamic:					{listeners: [], bRegistered: false},
	on_metadb_changed:						{listeners: [], bRegistered: false},
	on_mouse_lbtn_dblclk:					{listeners: [], bRegistered: false},
	on_mouse_lbtn_down:						{listeners: [], bRegistered: false},
	on_mouse_lbtn_up:						{listeners: [], bRegistered: false},
	on_mouse_leave:							{listeners: [], bRegistered: false},
	on_mouse_mbtn_dblclk:					{listeners: [], bRegistered: false},
	on_mouse_mbtn_down:						{listeners: [], bRegistered: false},
	on_mouse_mbtn_up:						{listeners: [], bRegistered: false},
	on_mouse_move:							{listeners: [], bRegistered: false},
	on_mouse_rbtn_dblclk:					{listeners: [], bRegistered: false},
	on_mouse_rbtn_down:						{listeners: [], bRegistered: false},
	on_mouse_rbtn_up:						{listeners: [], bRegistered: false},
	on_mouse_wheel:							{listeners: [], bRegistered: false},
	on_mouse_wheel_h:						{listeners: [], bRegistered: false},
	on_notify_data:							{listeners: [], bRegistered: false},
	on_output_device_changed:				{listeners: [], bRegistered: false},
	on_paint:								{listeners: [], bRegistered: false},
	on_playback_dynamic_info:				{listeners: [], bRegistered: false},
	on_playback_dynamic_info_track:			{listeners: [], bRegistered: false},
	on_playback_edited:						{listeners: [], bRegistered: false},
	on_playback_follow_cursor_changed:		{listeners: [], bRegistered: false},
	on_playback_new_track:					{listeners: [], bRegistered: false},
	on_playback_order_changed:				{listeners: [], bRegistered: false},
	on_playback_pause:						{listeners: [], bRegistered: false},
	on_playback_queue_changed:				{listeners: [], bRegistered: false},
	on_playback_seek:						{listeners: [], bRegistered: false},
	on_playback_starting:					{listeners: [], bRegistered: false},
	on_playback_stop:						{listeners: [], bRegistered: false},
	on_playback_time:						{listeners: [], bRegistered: false},
	on_playlist_item_ensure_visible:		{listeners: [], bRegistered: false},
	on_playlist_items_added:				{listeners: [], bRegistered: false},
	on_playlist_items_removed:				{listeners: [], bRegistered: false},
	on_playlist_items_reordered:			{listeners: [], bRegistered: false},
	on_playlist_items_selection_change:		{listeners: [], bRegistered: false},
	on_playlist_stop_after_current_changed:	{listeners: [], bRegistered: false},
	on_playlist_switch:						{listeners: [], bRegistered: false},
	on_playlists_changed:					{listeners: [], bRegistered: false},
	on_replaygain_mode_changed:				{listeners: [], bRegistered: false},
	on_script_unload:						{listeners: [], bRegistered: false},
	on_selection_changed:					{listeners: [], bRegistered: false},
	on_size:								{listeners: [], bRegistered: false},
	on_volume_change:						{listeners: [], bRegistered: false}
};

const parentWindow = this; // This is Window in this context without SMP wrapping
parentWindow.eventListener = {event: null, id: null};

/**
 * Adds a listener to any SMP callback
 *
 * @function
 * @name addEventListener
 * @kind function
 * @param {('on_always_on_top_changed'|'on_char'|'on_colours_changed'|'on_cursor_follow_playback_changed'|'on_drag_drop'|'on_drag_enter'|'on_drag_leave'|'on_drag_over'|'on_dsp_preset_changed'|'on_focus'|'on_font_changed'|'on_get_album_art_done'|'on_item_focus_change'|'on_item_played'|'on_key_down'|'on_key_up'|'on_library_items_added'|'on_library_items_changed'|'on_library_items_removed'|'on_load_image_done'|'on_main_menu'|'on_main_menu_dynamic'|'on_metadb_changed'|'on_mouse_lbtn_dblclk'|'on_mouse_lbtn_down'|'on_mouse_lbtn_up'|'on_mouse_leave'|'on_mouse_mbtn_dblclk'|'on_mouse_mbtn_down'|'on_mouse_mbtn_up'|'on_mouse_move'|'on_mouse_rbtn_dblclk'|'on_mouse_rbtn_down'|'on_mouse_rbtn_up'|'on_mouse_wheel'|'on_mouse_wheel_h'|'on_notify_data'|'on_output_device_changed'|'on_paint'|'on_playback_dynamic_info'|'on_playback_dynamic_info_track'|'on_playback_edited'|'on_playback_follow_cursor_changed'|'on_playback_new_track'|'on_playback_order_changed'|'on_playback_pause'|'on_playback_queue_changed'|'on_playback_seek'|'on_playback_starting'|'on_playback_stop'|'on_playback_time'|'on_playlist_item_ensure_visible'|'on_playlist_items_added'|'on_playlist_items_removed'|'on_playlist_items_reordered'|'on_playlist_items_selection_change'|'on_playlist_stop_after_current_changed'|'on_playlist_switch'|'on_playlists_changed'|'on_replaygain_mode_changed'|'on_script_unload'|'on_selection_changed'|'on_size'|'on_volume_change'|'on_locations_added')} event - Event type
 * @param {Function} listener - Callback function
 * @param {boolean} bRegister? - Add to global context
 * @returns {false | { event: any; id: string; }}
 */
function addEventListener(event, listener, bRegister = true) { // eslint-disable-line no-redeclare
	if (!Object.hasOwn(callbacks, event)) {console.log('addEventListener: event does not exist -> ' + event); return false;}
	const id = UUID();
	callbacks[event].listeners.push({id, listener});
	if (bRegister && !callbacks[event].bRegistered) {registerCallback(event);} // Only add those callbacks needed to the global context
	return {event, id};
}

/**
 * Retrieves the listener idx from any SMP callback using either the name, function or UUID
 *
 * @function
 * @name findEventListener
 * @kind function
 * @param {('on_always_on_top_changed '|'on_char '|'on_colours_changed '|'on_cursor_follow_playback_changed: '|'on_drag_drop '|'on_drag_enter '|'on_drag_leave '|'on_drag_over '|'on_dsp_preset_changed '|'on_focus '|'on_font_changed '|'on_get_album_art_done '|'on_item_focus_change '|'on_item_played '|'on_key_down '|'on_key_up '|'on_library_items_added '|'on_library_items_changed '|'on_library_items_removed '|'on_load_image_done '|'on_main_menu '|'on_main_menu_dynamic '|'on_metadb_changed '|'on_mouse_lbtn_dblclk '|'on_mouse_lbtn_down '|'on_mouse_lbtn_up '|'on_mouse_leave '|'on_mouse_mbtn_dblclk '|'on_mouse_mbtn_down '|'on_mouse_mbtn_up '|'on_mouse_move '|'on_mouse_rbtn_dblclk '|'on_mouse_rbtn_down '|'on_mouse_rbtn_up '|'on_mouse_wheel '|'on_mouse_wheel_h '|'on_notify_data '|'on_output_device_changed '|'on_paint '|'on_playback_dynamic_info '|'on_playback_dynamic_info_track '|'on_playback_edited '|'on_playback_follow_cursor_changed '|'on_playback_new_track '|'on_playback_order_changed '|'on_playback_pause '|'on_playback_queue_changed '|'on_playback_seek '|'on_playback_starting '|'on_playback_stop '|'on_playback_time '|'on_playlist_item_ensure_visible '|'on_playlist_items_added '|'on_playlist_items_removed '|'on_playlist_items_reordered: '|'on_playlist_items_selection_change: '|'on_playlist_stop_after_current_changed '|'on_playlist_switch '|'on_playlists_changed '|'on_replaygain_mode_changed '|'on_script_unload '|'on_selection_changed'|'on_size'|'on_volume_change')} event - Event type
 * @param {Function} listener? - Callback function
 * @param {string} id? - UUID
 * @returns {number}
 */
function findEventListener(event, listener = null, id = null) {
	if (!Object.hasOwn(callbacks, event)) {return -1;}
	if (!listener && !id) {return -1;}
	return callbacks[event].listeners.findIndex((event) => (event.id === id || event.listener === listener));
}

/**
 * Deletes the listener from any SMP callback using either the name, function or UUID
 *
 * @function
 * @name removeEventListener
 * @kind function
 * @param {('on_always_on_top_changed '|'on_char '|'on_colours_changed '|'on_cursor_follow_playback_changed: '|'on_drag_drop '|'on_drag_enter '|'on_drag_leave '|'on_drag_over '|'on_dsp_preset_changed '|'on_focus '|'on_font_changed '|'on_get_album_art_done '|'on_item_focus_change '|'on_item_played '|'on_key_down '|'on_key_up '|'on_library_items_added '|'on_library_items_changed '|'on_library_items_removed '|'on_load_image_done '|'on_main_menu '|'on_main_menu_dynamic '|'on_metadb_changed '|'on_mouse_lbtn_dblclk '|'on_mouse_lbtn_down '|'on_mouse_lbtn_up '|'on_mouse_leave '|'on_mouse_mbtn_dblclk '|'on_mouse_mbtn_down '|'on_mouse_mbtn_up '|'on_mouse_move '|'on_mouse_rbtn_dblclk '|'on_mouse_rbtn_down '|'on_mouse_rbtn_up '|'on_mouse_wheel '|'on_mouse_wheel_h '|'on_notify_data '|'on_output_device_changed '|'on_paint '|'on_playback_dynamic_info '|'on_playback_dynamic_info_track '|'on_playback_edited '|'on_playback_follow_cursor_changed '|'on_playback_new_track '|'on_playback_order_changed '|'on_playback_pause '|'on_playback_queue_changed '|'on_playback_seek '|'on_playback_starting '|'on_playback_stop '|'on_playback_time '|'on_playlist_item_ensure_visible '|'on_playlist_items_added '|'on_playlist_items_removed '|'on_playlist_items_reordered: '|'on_playlist_items_selection_change: '|'on_playlist_stop_after_current_changed '|'on_playlist_switch '|'on_playlists_changed '|'on_replaygain_mode_changed '|'on_script_unload '|'on_selection_changed'|'on_size'|'on_volume_change')} event - Event type
 * @param {Function} listener? - Callback function
 * @param {string} id? - UUID
 * @returns {Boolean}
 */
function removeEventListener(event, listener = null, id = null) { // eslint-disable-line no-redeclare
	if (!Object.hasOwn(callbacks, event)) {return false;}
	if (!listener && !id) {return false;}
	const idx = findEventListener(event, listener, id);
	return idx !== -1 && callbacks[event].listeners.splice(idx, 1);
}

/**
 * Deletes all listeners for any SMP callback using either the event/callback name
 *
 * @function
 * @name removeEventListeners
 * @kind function
 * @param {('on_always_on_top_changed '|'on_char '|'on_colours_changed '|'on_cursor_follow_playback_changed: '|'on_drag_drop '|'on_drag_enter '|'on_drag_leave '|'on_drag_over '|'on_dsp_preset_changed '|'on_focus '|'on_font_changed '|'on_get_album_art_done '|'on_item_focus_change '|'on_item_played '|'on_key_down '|'on_key_up '|'on_library_items_added '|'on_library_items_changed '|'on_library_items_removed '|'on_load_image_done '|'on_main_menu '|'on_main_menu_dynamic '|'on_metadb_changed '|'on_mouse_lbtn_dblclk '|'on_mouse_lbtn_down '|'on_mouse_lbtn_up '|'on_mouse_leave '|'on_mouse_mbtn_dblclk '|'on_mouse_mbtn_down '|'on_mouse_mbtn_up '|'on_mouse_move '|'on_mouse_rbtn_dblclk '|'on_mouse_rbtn_down '|'on_mouse_rbtn_up '|'on_mouse_wheel '|'on_mouse_wheel_h '|'on_notify_data '|'on_output_device_changed '|'on_paint '|'on_playback_dynamic_info '|'on_playback_dynamic_info_track '|'on_playback_edited '|'on_playback_follow_cursor_changed '|'on_playback_new_track '|'on_playback_order_changed '|'on_playback_pause '|'on_playback_queue_changed '|'on_playback_seek '|'on_playback_starting '|'on_playback_stop '|'on_playback_time '|'on_playlist_item_ensure_visible '|'on_playlist_items_added '|'on_playlist_items_removed '|'on_playlist_items_reordered: '|'on_playlist_items_selection_change: '|'on_playlist_stop_after_current_changed '|'on_playlist_switch '|'on_playlists_changed '|'on_replaygain_mode_changed '|'on_script_unload '|'on_selection_changed'|'on_size'|'on_volume_change')} event - Event type
 * @returns {Boolean}
 */
function removeEventListeners(event) {
	if (Array.isArray(event)) {
		event.forEach((ev) => {removeEventListeners(ev);});
	} else {
		if (!Object.hasOwn(callbacks, event)) {console.log('removeEventListeners: event does not exist -> ' + event); return false;}
		callbacks[event].listeners = [];
	}
	return true;
}

// Should only be called within an event listener, since 'this' points to 'parentWindow'
const removeEventListenerSelf = () => removeEventListener(this.eventListener.event, null, this.eventListener.id);

/*
	Register callbacks
*/
const fireEvents = function(event) {
	return function() {
		let bReturn = event === 'on_mouse_rbtn_up' && callbacks[event].listeners.length; // To be used by on_mouse_rbtn_up to disable default menu
		callbacks[event].listeners.forEach((eventListener) => {
			if (typeof this === 'undefined') {console.log(event); console.log(eventListener.listener.toString());}
			if (!eventListener.listener) {console.log(event); console.log(JSON.stringify(eventListener));}
			this.eventListener = {event, id: eventListener.id};
			bReturn = eventListener.listener.apply(this, arguments);
			this.eventListener = {event: null, id: null};
		});
		return bReturn;
	};
};

function registerCallback(event) {
	if (typeof parentWindow[event] !== 'undefined') {
		const oldFunc = parentWindow[event];
		parentWindow[event] = function() {
			const cache = oldFunc.apply(parentWindow, arguments);
			const output = fireEvents(event).apply(parentWindow, arguments);
			return (cache || output); // To be used by on_mouse_rbtn_up to disable default menu
		};
	} else {
		parentWindow[event] = fireEvents(event).bind(parentWindow);
	}
	callbacks[event].bRegistered = true;
}

function registerAllCallbacks() {
	Object.keys(callbacks).forEach((event) => {registerCallback(event);});
}

/*
	Helpers
*/
if (typeof UUID === 'undefined') {
	// @ts-ignore
	var UUID = () => { // NOSONAR[global]
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g , (c) => {
			const rnd = Math.random() * 16 | 0;
			const v = c === 'x' ? rnd : (rnd&0x3|0x8);
			return v.toString(16);
		});
	};
}

// Recommendable to pass some kind of flag at info
window.NotifyThis = function NotifyThis(name, info) {
	on_notify_data(name, info);
};


/*
	Integration
*/
const callbacksListener = {
	listenNames: false,
	highlight: false,
	step: 0,
	color: ((c = window.InstanceType ? window.GetColourDUI(1) : window.GetColourCUI(3)) => {
		// RGB
		const a = c - 0xFF000000;
		let [r, g, b] = [a >> 16, a >> 8 & 0xFF, a & 0xFF];
		// Invert
		r = 255 - r; g = 255 - g; b = 255 - b;
		return (0xff000000 | (r << 16) | (g << 8) | (b));
	})(),
	transparency: ((c = window.InstanceType ? window.GetColourDUI(1) : window.GetColourCUI(3), alpha = 15) => {
		// RGB
		const a = c - 0xFF000000;
		let [r, g, b] = [a >> 16, a >> 8 & 0xFF, a & 0xFF];
		// Invert
		r = 255 - r; g = 255 - g; b = 255 - b;
		// Opaque
		const res = 0xff000000 | (r << 16) | (g << 8) | (b);
		return (res & 0x00ffffff) | (alpha << 24);
	})()
};

callbacksListener.checkPanelNames = function() {
	if (!window.Name.length) {
		console.popup('Panel has no name: "' + window.Name + '"\n\nChange it at the SMP panel configuration.', 'Buttons: check panel name');
	} else {
		this.listenNames = true;
		window.NotifyOthers('xxx-scripts: panel name', window.Name);
	}
};

callbacksListener.checkPanelNamesAsync = function() {setTimeout(this.checkPanelNames, 2000);};

addEventListener('on_notify_data', (name, info) => {
	if (!name.startsWith('xxx-scripts')) {return;}
	switch (name) {
		case 'xxx-scripts: panel name': {
			window.NotifyOthers('xxx-scripts: panel name reply', window.Name);
			break;
		}
		case 'xxx-scripts: panel name reply': {
			if (callbacksListener.listenNames && info === window.Name) {
				console.popup('There is another panel with same name: "' + info + '"\n\nNames must be different to allow running dynamic menus. Change it at the SMP panel configuration.', window.Name);
				callbacksListener.highlight = true;
				window.Repaint();
			}
			break;
		}
	}
});

addEventListener('on_paint', (gr) => { // Make it flash 3 times
	if (callbacksListener.highlight) {
		gr.FillSolidRect(0, 0, window.Width, window.Height, callbacksListener.transparency);
		gr.DrawRect(0, 0, window.Width - 2, window.Height - 2, 1, callbacksListener.color);
		callbacksListener.step++;
	}
	if (callbacksListener.step && callbacksListener.step < 6) {
		callbacksListener.highlight = !!(callbacksListener.step % 2);
		if (callbacksListener.step === 6) {callbacksListener.step = 0; callbacksListener.highlight = false;}
		else if (!callbacksListener.highlight) {callbacksListener.step++;}
		setTimeout(() => {window.Repaint();} , 600);
	}
});

// Notify the other panels
setTimeout(() => {window.NotifyOthers('xxx-scripts: panel name reply', window.Name);}, 1000);