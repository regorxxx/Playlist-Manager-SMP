# Playlist-Manager-SMP
[![version][version_badge]][changelog]
[![CodeFactor][codefactor_badge]](https://www.codefactor.io/repository/github/regorxxx/Playlist-Manager-SMP/overview/main)
[![CodacyBadge][codacy_badge]](https://www.codacy.com/gh/regorxxx/Playlist-Manager-SMP/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=regorxxx/Playlist-Manager-SMP&amp;utm_campaign=Badge_Grade)
![GitHub](https://img.shields.io/github/license/regorxxx/Playlist-Manager-SMP)  
A playlist manager for [foobar2000](https://www.foobar2000.org) and [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel)/[JSplitter](https://foobar2000.ru/forum/viewtopic.php?t=6378) to save and load (auto)playlists on demand, synchronizing, ... along many more utilities. 

<p align="center">
<img src="https://github.com/regorxxx/Playlist-Manager-SMP/assets/83307074/cc22416b-734f-4751-b6df-6e10ecc83573">
</p>

## Features
![plm2](https://github.com/regorxxx/Playlist-Manager-SMP/assets/83307074/3d8152e4-78ab-4fdd-a52d-de005107ffb3)

* **Manages Playlist files and AutoPlaylists.** 
  * Playlist files are linked to physical files (.m3u8, .m3u, .pls, .xspf, .xsp or .fpl).
  * UI-only playlists can also be managed without a physical file.
  * AutoPlaylists are saved into json format.
  * Works with shareable playlists (.xspf) and Kodi-like smart playlists (.xsp).
  * All playlist are loaded in cache once, filtering just changes the "painted" playlist on the list.
  * Paths within the playlist may be absolute or relative to a folder (configurable).
  * Apply actions on batch to multiple playlists at once.
  * Merge the content of different playlists and load them all into one with a few clicks.
  * Remove duplicated tracks by TF and RegExp on loading.
* **AutoPlaylists: contains all functionality on Auto-playlist Manager by marc2003 plus more.**
  * Create, rename, delete AutoPlaylists.
  * Edit query, sort pattern and sort forcing.
  * Adds tooltip info, UI features, filters, etc.
  * Number of tracks output is updated at foobar startup. (and/or 'at manual refresh')
  * Queries and sort patterns are checked for validity before using them, instead of crashing.
* **Smart Playlists: contains all functionality found on XBMC or Kodi:**
  * Use XBMC or Kodi playlists within foobar seamlessly.
  * Multiple exporting options.
  * Allow to limit the number of tracks output by a query.
  * Allows to use other playlists as source (even AutoPlaylists) via queries.
  * Have the same advanced UI features than AutoPlaylists.
  
 ![plm4](https://github.com/regorxxx/Playlist-Manager-SMP/assets/83307074/e576931d-d5aa-44a7-98a3-04d04dd93bc8)

* Input search box with RegExp and track searching support. Also quick-searching by chars (like album list).
* **[ListenBrainz](https://listenbrainz.org/) integration**: sync user's playlists, import by playlist's MBID; track content resolution by Title, Recording MBID, ...
* **[Spotify](https://open.spotify.com/) integration**: sync user's playlists to ListenBrainz and Spotify at the same time.
* **Loads .m3u8, .m3u and .pls playlists x100 times faster than standard foobar** (if all items are on library). i.e. "As fast as the native format".
* **Auto-saves changes** within foobar to bound playlists files. (configurable)
* Automatically updates changes within the tracked folder. (configurable)
* New updates are delayed when performing internal updates/processing to avoid conflicts.
* **Multiple exporting options: directly compatible with Foobar2000 mobile, Kodi and XBMC systems, etc.**
  * Copy playlist file to location.
  * Export playlist file along its tracks.
  * Export playlist file and convert its tracks to another format (using Foobar2000 converter presets).
  * **Also work on multiple selected playlists on batch.**
* **Bind playlist to physical files:**
  * Tracks playlists for changes and update bound files.
  * Auto-saving (configurable).
  * Deleting the file also ask to delete the bound playlist.
  * Renaming the files also renames the bound playlist.
  * Show bound playlist (becomes active playlist).
* **Lock/unlock playlists** (so they are read-only).
  * Automatically locking of native foobar playlists files (.fpl). (configurable)
  * When locked, playlists can not be updated nor edited. They can be deleted.
  * Filename can be changed, but not playlist name (inside the file). This allows to set different playlist and file names if required.
* **Playlist unique IDs.** You can have multiple playlists with same name on the UI and bound to different files. (configurable)
  * Changing UUIDs config while having playlists already	loaded, will defer UUID refresh until next update.
  * New UUID can also be forced just by renaming the files.
* **Show playlist size on the panel.** (some limits apply for .fpl playlist files [^1]) (configurable)
  * All (refresh AutoPlaylists queries)
  * Only standard playlist
  * No size
* If you choose not to refresh AutoPlaylists sizes, then the first calculated size gets used: when imported from json or creating the AutoPlaylist.
* **Playlist Tags and actions**: 
  * Playlists may be tagged with 'bAutoLoad', 'bAutoLock' or a custom set of tags (for arbitrary purposes).
  * Auto-Functions: automatically applies some actions whenever a playlist is loaded on the panel according to the tags present on it. 
    * 'bAutoLoad' makes the playlist to be loaded within foobar automatically (on the UI). Meant to be used on remote servers with online controllers.
    * 'bAutoLock' locks the playlist as soon as it's loaded on the panel.
* **Track Auto-tagging:** add tag values automatically to any track added on playlist.
  * Can be configured separately for standard playlists, Autoplaylists, locked playlists and individual playlists.
  * Standard playlists may be used to easily tag your library just by sending them to the right playlist (which don't need to be loaded at all).
  * Autoplaylists Auto-tagging allows to automatically (and periodically) apply some tagging logic to the current library following some condition.
  * Multiple playlists may be used as pools, using a final Autoplaylist which checks for an specific added tag (by other playlists -aka pools-).
  * Allows multiple inputs:
    * TF expressions (or %tags%).
    * JavaScript functions (defined at 'helpers_xxx_utils.js').
    * Value (string or number).
* **Tooltips show different playlist info:**
  * Header with filters, categories and total number of playlists.
  * Gives a warning when tracks from current selection are already on the playlist file (duplicates).
  * Playlists:
    * Name plus UUID.
    * Playlist size (tracks). Also for AutoPlaylists (the number of tracks output by the query).
    * Category / Tag(s).
    * Track Tag(s).
    * Status (lock).
    * Query. Sort Pattern. (AutoPlaylists) Output limit. (Smart Playlists)
* **Filters:**
  * Show All | Only Autoplaylists & Smart Playlists | Only standard Playlists
  * Show All | Not locked | Only locked
  * Upladed | Not uploaded to ListenBrainz
  * By extension
  * By tag
  * By category
* **Sorting:**
  * Manually
  * Pinned Playlists (to be used with the other sorting modes)
  * Name: Az | Za
  * Size: Ascd. | Desc.
  * Category: Az | Za
  * Tags (first one): Az | Za
  * Creation Date: Ascd. | Desc.
  * Last Modified Date: Az | Za
* UUIDs: added to the name, so they are separated from non tracked playlist by name when loaded in foobar. Some also allow some level of names duplication.
  * Invisible Unicode chars plus (*)
  * (a-f)
  * (*) 
  * Or none
* **Category filters:** playlist may be filtered by category (like virtual folders), multiple selection allowed in a menu.
  * When lists are being filtered by category, an indicator is shown in the header text.
* **Additional tools for playlists:**
  * Check -on demand- for dead items on playlists files (without having to load them on foobar!). [^2]
  * Check -on demand- for duplicate items on playlists files (without having to load them on foobar!). [^3]
    * Before adding new tracks to a playlist file, duplicates may be filtered from selected tracks on real time.
  * Check -on demand- for playlists with mixed relative and absolute paths.
  * Check -on demand- for playlists with items not present on library. [^4]
  * Check -on demand- for playlists with blank lines.
* **4 different writable formats.** (some limits apply for .pls playlist files [^5]) (configurable)
* Filter (configurable) and sorting gets saved between reloads.
* RecycleBin: deleting and restoring.
  * Uses timestamps to uniquely identify files: no collisions with other files within the RecycleBin.
* A backup of the previous playlist json file is created every time the panel is loaded. Old backups are sent to recycle bin.
* Properties descriptions change according to things set on the panel, not just the values. i.e. if you change the sort method, then the description reflects the associated states dynamically.
* **UI:**
  * UI resizable on the fly.
  * UI elements can be selectivel enabled or disabled.
  * Customizable columns with playlist's metadata (for size, etc)
  * Fully configurable mouse shortcuts.
  * Selection indicators.
  * Now playing and loaded playlist indicators.
  * Empty / not empty playlist indicators. To be used as fallback when size is not shown.
  * Font Size (configurable).
  * Separators between different names/categories (configurable).
  * Ready to use presets. Also specific ones for Color Blindness (deuteranopia) and Grey Scale
  * Scrollbar and drag n' drop.
  * Icons for different playlists types (configurable). Can also be hidden.
  * Colors for different playlists types, status, text, background and selection (configurable).
* **Shortcuts:** modifiers allow to directly apply different actions on playlists. See manual.
* **Wine - Unix - non IE SOs compatible:** all the UI, tools, popups, configuration and external helpers have been carefully designed to work in all systems without requiring IE installation, HTML popups or editing the panel properties. Scripts are expected to work 100% the same in any SO.
* **Other scripts integration:**
  * [Playlist-Tools-SMP](https://github.com/regorxxx/Playlist-Tools-SMP): Pools may use tracks from playlists files tracked by the manager, not requiring to have playlists loaded within foobar. i.e. Random Pools component-like playlist creation, using not only queries as sources, but also other playlists or playlists files.
  * [ajquery-xxx](https://github.com/regorxxx/ajquery-xxx): Online controller fully compatible with the manager, allows to browse playlist files, load, edit them, etc.
  * **SMP Dynamic menus:** playlist actions are also available as main menu entries -if enabled-, which allows to bind them to keyboard shortcuts, toolbar buttons or executing them using command line.

[^1]: .fpl playlists are non writable, but size and other data (UUID, category, lock status or tags) may be cached between sessions as soon as it's set for the first time.

[^2]: also recognizes streams (http and https) and skips them.

[^3]: also recognizes subsongs from a same physical file (for example iso files).

[^4]: also recognizes relative paths on playlists (with or without .\) when trying to match files against the library.

[^5]: .pls playlists format doesn't allow extra data like UUID, category, lock status or tags, ... use .m3u or .m3u8 for full data support.
 
![plm3](https://github.com/regorxxx/Playlist-Manager-SMP/assets/83307074/8c5b300d-e66e-48f0-b608-9008beea1b9d)

### Current limitations
.fpl playlists (native format) are read only and can not be auto-saved since the format is closed source and there are no methods on [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel) to save them on a path (without showing the 'save as' window), neither load them as handle lists (without loading on playlist tabs, for example to update the track count).  
Whenever that changes, I will add full support for .fpl, and end pre-release state.

Tracking playlists within a network drive requires additional steps to make use of the Recycle Bin. See Readme (pdf).

## Also integrates
 1. [Menu-Framework-SMP](https://github.com/regorxxx/Menu-Framework-SMP): Helper which allows to easily create customizable and dynamic menus.
 
## Requirements
 1. [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel): Component required to install this javaScript addon. Only x32.
 2. [JSplitter](https://foobar2000.ru/forum/viewtopic.php?t=6378): Component required to install this javaScript addon. Both x32 and x64.
 3. FontAwesome: found at ’.\ resources\fontawesome-webfont.ttf’. See installation notes.
 
## Installation
See the [Wiki](https://github.com/regorxxx/Playlist-Manager-SMP/wiki/Installation). There are more extensive instructions at the [Readme (pdf)](https://github.com/regorxxx/Playlist-Manager-SMP/blob/main/readmes/playlist_manager.pdf) or [_INSTALLATION (txt)](https://github.com/regorxxx/Playlist-Manager-SMP/blob/main/_INSTALLATION.txt) file.
Not properly following the installation instructions will result in scripts not working as intended. Please don't report errors before checking this.

## Documentation
Full documentation notes can be found at the <a href="https://github.com/regorxxx/Playlist-Manager-SMP/raw/main/readmes/playlist_manager.pdf" target="_blank" class="image fit" type="application/pdf">PDF Manual.</a>

## Support
 1. [Issues tracker](https://github.com/regorxxx/Playlist-Manager-SMP/issues).
 2. [Hydrogenaudio forum](https://hydrogenaud.io/index.php/topic,120979.0.html).
 3. [Wiki](https://github.com/regorxxx/Playlist-Manager-SMP/wiki).

## Nightly releases
Automatic package [built from GitHub](https://nightly.link/regorxxx/Playlist-Manager-SMP/workflows/build/main/file.zip) (using the latest commit).

[changelog]: CHANGELOG.md
[version_badge]: https://img.shields.io/github/release/regorxxx/Playlist-Manager-SMP.svg?include_prereleases
[codacy_badge]: https://api.codacy.com/project/badge/Grade/329cf09cbffc46618a64d04e51f32011
[codefactor_badge]: https://www.codefactor.io/repository/github/regorxxx/Playlist-Manager-SMP/badge/main
