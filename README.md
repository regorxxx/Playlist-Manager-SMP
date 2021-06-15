# Playlist-Manager-SMP
[![version][version_badge]][changelog]
[![CodeFactor][codefactor_badge]](https://www.codefactor.io/repository/github/regorxxx/Playlist-Manager-SMP/overview/main)
[![CodacyBadge][codacy_badge]](https://www.codacy.com/gh/regorxxx/Playlist-Manager-SMP/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=regorxxx/Playlist-Manager-SMP&amp;utm_campaign=Badge_Grade)
![GitHub](https://img.shields.io/github/license/regorxxx/Playlist-Manager-SMP)  
A playlist manager for [foobar2000](https://www.foobar2000.org) and [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel) to save and load (auto)playlists on demand, synchronizing, ... along many more utilities. 

![Animation2](https://user-images.githubusercontent.com/83307074/116749102-f8b7b900-a9ef-11eb-9054-08fcb349813d.gif)

## Features
![Animation3](https://user-images.githubusercontent.com/83307074/116749322-4d5b3400-a9f0-11eb-9e55-cdd91370f624.gif)

* Manages Playlist files and AutoPlaylists.  
  * Playlist files are linked to physical files (.m3u8, .m3u, .pls or .fpl).
  * AutoPlaylists are saved into json format.
  * All playlist are loaded in cache once, filtering just changes the "painted" playlist on the list.
  * Paths within the playlist may be absolute or relative to a folder (configurable).
* AutoPlaylists: contains all functionality on Auto-playlist Manager by marc2003 plus more.
  * Create, rename, delete AutoPlaylists.
  * Edit query, sort pattern and sort forcing.
  * Adds tooltip info, UI features, filters, etc.
  * Number of tracks output is updated at foobar startup. (and/or 'at manual refresh')
* Loads .m3u8, .m3u and .pls playlists x100 times faster than standard foobar (if all items are on library). i.e. "As fast as the native format".
* Auto-saves changes within foobar to binded playlists files. (configurable)
* Automatically updates changes within the tracked folder. (configurable)
* New updates are delayed when performing internal updates/processing to avoid conflicts.
* Bind playlist to files:
  * Tracks playlists for changes and update binded files.
  * Auto-saving (configurable).
  * Deleting the file also ask to delete the binded playlist.
  * Renaming the files also renames the binded playlist.
  * Show binded playlist (becomes active playlist).
* Lock/unlock playlists (so they are read-only).
  * Automatically locking of native foobar playlists files (.fpl). (configurable)
  * When locked, playlists can not be updated nor edited. They can be deleted.
  * Filename can be changed, but not playlist name (inside the file). This allows to set different playlist and file names if required.
* Playlist unique IDs. You can have multiple playlists with same name on the UI and binded to different files. (configurable)
  * If changing UUIDs config while having playlists already loaded, then new config will be used whenever they get updated.
  * You can manually force new UUID config just by renaming the files.
* Show playlist size on the list. (some limits apply for .fpl playlist files (*)) (configurable)
  * All (refresh autoplaylists queries)
  * Only standard playlist
  * No size
* If you choose not to refresh autoplaylist sizes, then the first calculated size gets used: when imported from json or creating the autoplaylist.
* Tooltips show different playlist info:
  * Name plus UUID.
  * Playlist size (tracks). Also for AutoPlaylists (the number of tracks output by the query).
  * Category / Tag(s).
  * Status (lock).
  * Query. Sort Pattern. (AutoPlaylists)
* Cyclic filters:
  * Show All | Only Autoplaylists | Only Playlists
  * Show All | Not locked | Only locked
* Cyclic Sorting:
  * Name: Az | Za
  * Size: Ascd. | Desc.
  * Category: Az | Za
* UUIDs: added to the name, so they are separated from non tracked playlist by name when loaded in foobar. Some also allow some level of names duplication.
  * Invisible unicode chars plus (*)
  * (a-f)
  * (*) 
  * Or none
* Category filters: playlist may be filtered by category (like virtual folders), multiple selection allowed in a menu.
  * When lists are being filtered by category, an indicator is shown in the header text.
* Additional tools for playlists:
  * Check for dead items on playlists files (without having to load them on foobar!).
  * Check for playlists with mixed relative and absolute paths.
  * Check for playlists with items not present on library.
* 3 different writable formats. (some limits apply for .pls playlist files (**)) (configurable)
* Filter (configurable) and sorting gets saved between reloads.
* RecycleBin: deleting and restoring.
  * Uses timestamps to uniquely identify files: no collisions with other files within the RecycleBin.
* A backup of the previous playlist json file is created every time the panel is loaded. Old backups are sent to recycle bin.
* Properties descriptions change according to things set on the panel, not just the values. i.e. if you change the sort method, then the description reflects the associated states dynamically.
* UI:
  * UI resizable on the fly.
  * Selection indicators.
  * Now playing and loaded playlist indicators.
  * Empty / not empty playlist indicators. To be used as fallback when size is not shown.
  * Size (configurable).
  * Separators between different names/categories (configurable).
  * Colours for different playlists types and status (configurable).
* Shortcuts:
  * Double Click: Load playlist / Make binded playlist active
  * Left Click: playlist contextual menu
  * Rigth Click: panel menu
  * Ctrl + Left Button: Load playlist / Make binded playlist active
  * Shift + Left Button: Send current selection to playlist
  * Ctrl + Shift + Left Button: Delete playlist
* Other scripts integration:
  * [Playlist-Tools-SMP](https://github.com/regorxxx/Playlist-Tools-SMP): Pools may use tracks from playlists files tracked by the manager, not requiring to have playlists loaded within foobar. i.e. Random Pools component-like playlist creation, using not only queries as sources, but also other playlists or playlists files.

(*)	.fpl playlists are non writable, but size and other data (UUID, category, lock status or tags) may be cached between sessions as soon as it's set for the first time.  
(**) .pls playlists format doesn't allow extra data like UUID, category, lock status or tags, ... use .m3u or .m3u8 for full data support.
 
![Animation1](https://user-images.githubusercontent.com/83307074/116749095-f6555f00-a9ef-11eb-9723-7229766bed90.gif)

### Current limitations
.fpl playlists (native format) are read only and can not be autosaved since the format is closed source and there are no methods on [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel) to save them on a path (without showing the 'save as' window), neither load them as handle lists (without loading on playlist tabs, for example to update the track count).  
Whenever that changes, I will add full support for .fpl, and end pre-release state.


## Also integrates
 1. [Menu-Framework-SMP](https://github.com/regorxxx/Menu-Framework-SMP): Helper which allows to easily create customizable and dynamic menus.

## Installation
Copy all files from the zip into YOUR_FOOBAR_PROFILE_PATH\scripts\SMP\xxx-scripts  
Any other path WILL NOT work without editing the scripts. (see images\_Installation_*jpg)  
For ex: mine is c:\Users\xxx\AppData\Roaming\foobar2000\scripts\SMP\xxx-scripts\...  
For portable installations >= 1.6: .\foobar2000\profile\scripts\SMP\xxx-scripts\...  
For portable installations <= 1.5: .\foobar2000\scripts\SMP\xxx-scripts\...  
Then load 'playlist_manager.js' into a SMP panel within foobar.

[changelog]: CHANGELOG.md
[version_badge]: https://img.shields.io/github/release/regorxxx/Playlist-Manager-SMP.svg?include_prereleases
[codacy_badge]: https://api.codacy.com/project/badge/Grade/329cf09cbffc46618a64d04e51f32011
[codefactor_badge]: https://www.codefactor.io/repository/github/regorxxx/Playlist-Manager-SMP/badge/main
