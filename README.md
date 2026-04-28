# Playlist-Manager-SMP
[![version][version_badge]][changelog]
[![CodeFactor][codefactor_badge]](https://www.codefactor.io/repository/github/regorxxx/Playlist-Manager-SMP/overview/main)
[![CodacyBadge][codacy_badge]](https://www.codacy.com/gh/regorxxx/Playlist-Manager-SMP/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=regorxxx/Playlist-Manager-SMP&amp;utm_campaign=Badge_Grade)
![GitHub](https://img.shields.io/github/license/regorxxx/Playlist-Manager-SMP)  
A playlist manager for [foobar2000](https://www.foobar2000.org) and [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel)/[JSplitter](https://foobar2000.ru/forum/viewtopic.php?t=6378) to save and load (auto)playlists on demand, synchronizing, ... along many more utilities. 

<p align="center">
<img width="910" height="327" alt="{4D462805-096D-437B-B0D7-39780FA7C317}" src="https://github.com/user-attachments/assets/cc23f718-9d80-43ab-8c25-d75acf93f64f" />
</p>

## Features
![plm2](https://github.com/regorxxx/Playlist-Manager-SMP/assets/83307074/3d8152e4-78ab-4fdd-a52d-de005107ffb3)

* **Manages Playlist files and AutoPlaylists.** 
  * Playlist files are linked to physical files (.m3u8, .m3u, .pls, .xspf, .xsp or .fpl).
  * UI-only playlists can also be managed without a physical file.
  * Paths within the playlist may be absolute or relative to a folder (configurable).
  * Apply actions on batch to multiple playlists at once, remove duplicates, etc.
* **AutoPlaylists: contains all functionality on Auto-playlist Manager by marc2003 plus more.**
  * Create, rename, edit, delete AutoPlaylists.
  * Adds tooltip info, UI features, filters, etc.
* **Smart Playlists: contains all functionality found on XBMC or Kodi:**
  * Use XBMC or Kodi playlists within foobar seamlessly. Multiple exporting options.
  * Allow to limit the number of tracks output by a query.
  * Allows to use other playlists as source (even AutoPlaylists) via queries.
  
 ![plm4](https://github.com/regorxxx/Playlist-Manager-SMP/assets/83307074/e576931d-d5aa-44a7-98a3-04d04dd93bc8)

* Input search box with RegExp and track searching support. Also quick-searching by chars (like album list).
* **[ListenBrainz](https://listenbrainz.org/) integration**: sync user's playlists, import by playlist's MBID; track content resolution by Title, Recording MBID, ...
* **[Spotify](https://open.spotify.com/) integration**: sync user's playlists to ListenBrainz and Spotify at the same time.
* **Loads .m3u8, .m3u and .pls playlists x100 times faster than standard foobar** (if all items are on library). i.e. "As fast as the native format".
* **Auto-saves changes** within foobar to bound playlists files. (configurable)
* Automatically updates changes within the tracked folder. (configurable)
* **Multiple exporting options: directly compatible with Foobar2000 mobile, Kodi and XBMC systems, etc.**
* **Bind playlist to physical files:**
* **Lock/unlock playlists** (so they are read-only).
* **Playlist unique IDs.** You can have multiple playlists with same name on the UI and bound to different files. (configurable)
* **Playlist Tags and actions**: automatically applies some actions whenever a playlist is loaded on the panel according to the tags present on it. 
* **Track Auto-tagging:** add tag values automatically to any track added on playlist.
* **Tooltips show different playlist info:** Name plus UUID, size (tracks), Category / Tag(s), Track Tag(s), ...
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
* **Category filters:** playlist may be filtered by category (like virtual folders), multiple selection allowed in a menu.
* **Additional tools for playlists:** check dead items, duplicates, format errors, etc.
* RecycleBin: deleting and restoring.
  * Uses timestamps to uniquely identify files: no collisions with other files within the RecycleBin.
* A backup of the previous playlist json file is created every time the panel is loaded. Old backups are sent to recycle bin.
* D2D support (requires JSplitter).
* **UI:**
  * Fully configurable UI, columns, metadata shown, etc.
  * Fully configurable mouse shortcuts.
  * Dynamic colors.
* **Wine - Unix - non IE SOs compatible:** all the UI, tools, popups, configuration and external helpers have been carefully designed to work in all systems without requiring IE installation, HTML popups or editing the panel properties. Scripts are expected to work 100% the same in any SO.
* **Other scripts integration:**
  * [Infinity-Tools-SMP](https://github.com/regorxxx/Infinity-Tools-SMP): Pools may use tracks from playlists files tracked by the manager, not requiring to have playlists loaded within foobar. i.e. Random Pools component-like playlist creation, using not only queries as sources, but also other playlists or playlists files.
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
 
## Requirements (only one host component required)
 1. [Spider Monkey Panel or JSplitter](../../wiki/SMP-vs-JSplitter-notes): JavaScript host component required to install this. Available in x86 and x64.
 2. [Required fonts](https://github.com/regorxxx/foobar2000-assets/tree/main/Fonts): FontAwesome, Segoe UI, Arial Unicode MS
 
## Installation
See [Wiki](../../wiki/Installation). There are more extensive instructions at the [Readme (pdf)](../main/readmes/playlist_manager.pdf) or the [_INSTALLATION (txt)](../main/_INSTALLATION.txt) file.
Not properly following the installation instructions will result in scripts not working as intended. Please don't report errors before checking this.

## Documentation
Full documentation notes can be found at the <a href="https://github.com/regorxxx/Playlist-Manager-SMP/raw/main/readmes/playlist_manager.pdf" target="_blank" class="image fit" type="application/pdf">PDF Manual.</a>

## Support
 1. [Issues tracker](../../issues).
 2. [Hydrogenaudio forum](https://hydrogenaud.io/index.php/topic,120979.0.html).
 3. [Wiki](../../wiki).

## Nightly releases
Automatic package [built from GitHub](https://nightly.link/regorxxx/Playlist-Manager-SMP/workflows/build/main/file.zip) (using the latest commit). Unzip 'file.zip' downloaded and load the '\*-SMP-\*-\*-\*-package.zip' inside as package within your JS host component.

[changelog]: CHANGELOG.md
[version_badge]: https://img.shields.io/github/release/regorxxx/Playlist-Manager-SMP.svg?include_prereleases
[codacy_badge]: https://api.codacy.com/project/badge/Grade/329cf09cbffc46618a64d04e51f32011
[codefactor_badge]: https://www.codefactor.io/repository/github/regorxxx/Playlist-Manager-SMP/badge/main
