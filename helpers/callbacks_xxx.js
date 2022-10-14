'use strict';
//12/10/22

/*
	Usage:
		- addEventListener(): to attach a new function to a callback. For ex: to display a text on console when using L. Button click
			const listener = () => {console.log('Hello world!');};
			const id = addEventListener('on_mouse_lbtn_up', listener);
		- removeEventListener(): to remove a previously added listener. For ex:
			removeEventListener('on_mouse_lbtn_up', listener); // Previous id may also be useds	
		- findEventListener(): to find if some listener is attached to a callback. For ex:
			const idx = findEventListener('on_mouse_lbtn_up', listener); // -1 since it has been previously removed
		- removeEventListeners(): to remove all listeners atached to a callback. For ex:
			removeEventListeners('on_focus'); // true
			
		Following [mozilla implementation](https://developer.mozilla.org/es/docs/Web/API/EventTarget/removeEventListener)
		event listeners may be removed using their UUID or event listener function itself.
		addEventListener() returns the UUID for the provided	function, which may be useful for anonymous or inline functions.
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
}

const parentWindow = this; // This is Window in this context without SMP wrapping
parentWindow.eventListener = {event: null, id: null};

function addEventListener(event, listener, bRegister = true) {
	if (!callbacks.hasOwnProperty(event)) {console.log('addEventListener: event does not exist -> ' + event); return false;}
	const id = UUID();
	callbacks[event].listeners.push({id, listener});
	if (bRegister && !callbacks[event].bRegistered) {registerCallback(event);} // Only add those callbacks needed to the global context
	return {event, id};
}

function findEventListener(event, listener = null, id = null) {
	if (!callbacks.hasOwnProperty(event)) {return -1;}
	if (!listener && !id) {return -1;}
	const idx = callbacks[event].listeners.findIndex((event) => {
		return event.id === id || event.listener === listener;
	});
	return idx;
}

function removeEventListener(event, listener = null, id = null) {
	if (!callbacks.hasOwnProperty(event)) {return false;}
	if (!listener && !id) {return false;}
	const idx = findEventListener(event, listener, id);
	return idx !== -1 && callbacks[event].listeners.splice(idx, 1);
}

function removeEventListeners(event) {
	if (Array.isArray(event)) {
		event.forEach((ev) => {removeEventListeners(ev);});
	} else {
		if (!callbacks.hasOwnProperty(event)) {console.log('removeEventListeners: event does not exist -> ' + event); return false;}
		callbacks[event].listeners = [];
	}
	return true;
}

// Should only be called within an event listener, since 'this' points to 'parentWindow'
const removeEventListenerSelf = () => {return removeEventListener(this.eventListener.event, null, this.eventListener.id);}

/*
	Register callbacks
*/
const fireEvents = function(event) {
	return function() {
		let bReturn = event === 'on_mouse_rbtn_up' && callbacks[event].length; // To be used by on_mouse_rbtn_up to disable default menu
		callbacks[event].listeners.forEach((eventListener) => {
			if (typeof this === 'undefined') {console.log(event); console.log(eventListener.listener.toString());}
			this.eventListener = {event, id: eventListener.id};
			bReturn = eventListener.listener.apply(this, arguments);
			this.eventListener = {event: null, id: null};
		});
		return bReturn;
	};
}

function registerCallback(event) {
	if (typeof parentWindow[event] !== 'undefined') {
		const oldFunc = parentWindow[event];
		parentWindow[event] = function() {
			const cache = oldFunc.apply(parentWindow, arguments);
			const output = fireEvents(event).apply(parentWindow, arguments);
			return (cache || output); // To be used by on_mouse_rbtn_up to disable default menu
		}
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
	var UUID = () => {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g , function(c) {
				const rnd = Math.random() * 16 | 0, v = c === 'x' ? rnd : (rnd&0x3|0x8) ;
				return v.toString(16);
		});
	};
}