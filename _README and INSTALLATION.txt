REQUISITES:
-------------
Spider Monkey Panel:
https://theqwertiest.github.io/foo_spider_monkey_panel/

INSTALLATION: 
-------------
Copy all files from the zip into YOUR_FOOBAR_PROFILE_PATH\scripts\SMP\xxx-scripts
Any other path WILL NOT work without editing the scripts. (see images\_Installation_*jpg)
For ex: mine is 			c:\Users\xxx\AppData\Roaming\foobar2000\scripts\SMP\xxx-scripts\...
For portable installations >= 1.6: .\foobar2000\profile\scripts\SMP\xxx-scripts\... 
For portable installations <= 1.5: .\foobar2000\scripts\SMP\xxx-scripts\... 
Then load any script into a SMP panel within foobar. See info for usage. 

PORTABLE TIP: 
-------------
Some scripts have configurable paths to save json data, track playlists, etc. Those can be found on the properties panel.
Instead of using the menus and adding an absolute path, it would be advisable to edit them manually to ensure they are relative too:
For ex. for the playlist manager, the tracked folder:
H:\\MySoftware\foobar2000\profile\playlist_manager\ --> .\profile\playlist_manager\	(>= 1.6:)
													--> .\playlist_manager\			(<= 1.5:)

INFO: 
-------------
This is general info for all the scripts. Within all files you will find 4 big scripts (playlist manager, search_bydistance, world map and buttons framework).
And a collection of small utilities (search same by..., top tracks, remove duplicates, etc.). 
All files have extensive comments and descriptions at the header and all along the code, so you can check specific info about what everything does in its own file.

There is a thread at hydrogenaud.io which contains several images and explanations of what each thing does. 
https://hydrogenaud.io/index.php?topic=120394

The '_images' folder shows screenshots to show how the scripts look in my pc:

The main folder (the one you found this readme) contains these scripts. Linked buttons are added below their main script for convenience:
	+ top_tracks.js
		- buttons_search_top_tracks.js (*)
		- buttons_playlist_tools_menu.js (*)
	+ top_tracks_from_date.js
		- buttons_search_top_tracks_from_date.js (*)
		- buttons_playlist_tools_menu.js (*)
	+ tags_automation.js
		- buttons_tags_automation.js (*)
		- buttons_playlist_tools_menu.js (*)
	+ search_same_by.js
		- buttons_search_same_by.js (*)
		- buttons_playlist_tools_menu.js (*)
	+ search_same_style_moods.js
		- buttons_search_same_style_moods.js (*)
	+ search_same_style.js
		- buttons_search_same_style.js (*)
	+ search_bydistance.js
		- ALSO READ: helpers\music_graph_descriptors_xxx.js
		- ALSO SEE: Draw Graph.html
		- buttons_search_bydistance_customizable.js (*)
		- buttons_search_bydistance.js (*)
		- buttons_playlist_tools_menu.js (*)
	+ Draw Graph.html
		- ALSO READ: helpers\music_graph_descriptors_xxx.js
		- ALSO SEE: search_bydistance.js
		- NOT meant to be used within foobar.
		- Load the file in any browser to use it.
	+ remove_duplicates.js
		- buttons_remove_duplicates.js (*)
		- buttons_playlist_tools_menu.js (*)
	+ playlist_manager.js (*)
		- Playlist manager requires some fonts.
			- _resources\Wingdings 3.ttf
			- _resources\Wingdings 2.ttf
			- _resources\guifx_v2_transports.ttf
			- _resources\fontawesome-webfont.ttf
	+ playlist_tools_menu.js
		- buttons_playlist_tools_menu.js (*)
	+ mainmenu_edit.js (*)
		- ALSO SEE: skip_tag_from_playback.js
		- Adds menu entries to File menu.
	+ skip_tag_from_playback.js
		- ALSO SEE: mainmenu_edit.js
		- Meant to be used along standard foobar buttons.
		- Link button to File\Spider Monkey Panel\x...
	+ find_remove_from_playlists.js
		- ALSO SEE: playlist_tools_menu.js
		- buttons_playlist_tools_menu.js (*)
	+ world_map.js (*)
		- May be used along Biography 1.1.3.
		
All these js files (except those with (*)) contain only the functions, i.e. they will not do anything if you load them on a panel. 
You would need a button, a main menu call, etc. to use them. So they are meant to be called by other scripts.
If you want to use them as standalone scripts within a panel, check the examples at 'buttons' folder. 
Those are individual working -as is- buttons (check list). Since they are working standalone examples, all are marked with (*).
	+ buttons_playlist_tools_menu.js (*)
	+ buttons_remove_duplicates.js (*)
	+ buttons_search_bydistance.js (*)
	+ buttons_search_bydistance_customizable.js (*)
	+ buttons_search_same_style.js (*)
	+ buttons_search_same_style_moods.js
	+ buttons_search_same_by.js (*)
	+ buttons_search_top_tracks.js (*)
	+ buttons_search_top_tracks_from_date.js (*)
	+ buttons_tags_automation.js (*)

For complete buttons bar with merged buttons, check list below. Adding/removing buttons to create your own bar is easy.
A matter of adding/removing 1 line at those files (check 'buttonsPath'). You can use '..._example_merged' files too as template.
	+ search_bydistance.js
		- _buttons_merged_sbd_customizable.js (*)
	+ ALL:
		- _buttons_merged.js (*)

The buttons framework has some examples that can be used to create your own combinations of buttons and bars.
They do nothing by their-selves, since they have no functionality associated to pressing the button.
	+ _buttons_panel_blank.js
	+ _buttons_example_merged_double.js
	+ _buttons_example_merged.js
	+ _buttons_example.js
	+ _buttons_blank_merged.js
	+ _buttons_blank.js
	
The 'helpers' folder contains common files used by most of the scripts. Don't touch or load these alone, although there are 2 exceptions.
'music_graph_descriptors_xxx.js', 'music_graph_descriptors_xxx_user.js' and 'dyngenre_map_xxx.js' files, which are related to 'search_bydistance' & 'search_same_by'. 
Look at those files to understand what they do and why some users may want to add their own genres/styles there.

The 'ngraph' folder is another helper folder. Don't touch these. They are required to create graphs within foobar or for html rendering.
Read 'music_graph_descriptors_xxx.js' and check 'Draw Graph.html' in your browser (drag n drop) to see what they do.