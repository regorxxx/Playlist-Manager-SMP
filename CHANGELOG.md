# Changelog

## [Table of Contents]
- [Unreleased](#unreleased)
- [1.0.0-beta.4](#100-beta4---2025-11-19)
- [1.0.0-beta.3](#100-beta3---2025-10-28)
- [1.0.0-beta.2](#100-beta2---2025-09-29)
- [1.0.0-beta.1](#100-beta1---2025-09-20)
- [0.19.0](#0190---2024-10-09)
- [0.18.1](#0181---2024-08-13)
- [0.18.0](#0180---2024-07-30)
- [0.17.0](#0170---2024-07-24)
- [0.16.1](#0161---2024-04-26)
- [0.16.0](#0160---2024-04-22)
- [0.15.0](#0150---2024-03-21)
- [0.14.1](#0141---2024-03-16)
- [0.14.0](#0140---2024-03-15)
- [0.13.0](#0130---2024-02-28)
- [0.12.1](#0121---2023-12-09)
- [0.12.0](#0120---2023-12-08)
- [0.11.0](#0110---2023-11-28)
- [0.10.0](#0100---2023-11-24)
- [0.9.0](#090---2023-11-15)
- [0.8.0](#080---2023-10-18)
- [0.7.0](#070---2023-10-05)
- [0.6.2](#062---2023-09-25)
- [0.6.1](#061---2023-09-20)
- [0.6.0](#060---2023-09-13)
- [0.5.3](#053---2023-08-28)
- [0.5.2](#052---2023-08-05)
- [0.5.1](#051---2023-07-29)
- [0.5.0](#050---2023-07-28)
- [0.5.0-beta.25](#050-beta25---2023-07-04)
- [0.5.0-beta.24](#050-beta24---2023-07-03)
- [0.5.0-beta.23](#050-beta23---2023-06-29)
- [0.5.0-beta.22](#050-beta22---2023-06-29)
- [0.5.0-beta.21](#050-beta21---2023-06-27)
- [0.5.0-beta.20](#050-beta20---2023-05-16)
- [0.5.0-beta.19](#050-beta19---2023-05-08)
- [0.5.0-beta.18](#050-beta18---2023-03-08)
- [0.5.0-beta.17](#050-beta17---2023-03-04)
- [0.5.0-beta.16](#050-beta16---2023-02-22)
- [0.5.0-beta.15](#050-beta15---2023-02-19)
- [0.5.0-beta.14](#050-beta14---2023-02-19)
- [0.5.0-beta.13](#050-beta13---2023-02-15)
- [0.5.0-beta.12](#050-beta12---2022-08-22)
- [0.5.0-beta.11](#050-beta11---2022-08-21)
- [0.5.0-beta.10](#050-beta10---2022-08-12)
- [0.5.0-beta.9](#050-beta9---2022-08-09)
- [0.5.0-beta.8](#050-beta8---2022-08-05)
- [0.5.0-beta.7](#050-beta7---2022-05-24)
- [0.5.0-beta.6](#050-beta6---2022-05-23)
- [0.5.0-beta.5](#050-beta5---2022-05-04)
- [0.5.0-beta.4](#050-beta4---2022-04-27)
- [0.5.0-beta.3](#050-beta3---2022-04-13)
- [0.5.0-beta.2](#050-beta2---2022-03-02)
- [0.5.0-beta.1](#050-beta1---2021-12-23)
- [0.4.1](#041---2021-06-15)
- [0.4.0](#040---2021-06-07)
- [0.3.1](#031---2021-05-28)
- [0.3.0](#030---2021-05-26)
- [0.2.2](#022---2021-05-19)
- [0.2.1](#021---2021-05-05)
- [0.2.0](#020---2021-05-04)
- [0.1.0](#010---2021-05-02)

## [Unreleased][]
### Added
- UI: UI elements are now resizable using Alt + Ctrl + Mouse wheel. Like the 'Font scaling' submenu, the scale change is applied depending on the mouse position.
- UI: added mouse wheel actions (data and resizing) to statistics mode.
### Changed
### Removed
### Fixed

## [1.0.0-beta.4] - 2025-11-19
- Search: added configurable tags for query creation at track drag n' drop into search input box. By default it uses TITLE and ALBUM ARTIST (the previous behavior). Similar to [Library Tree mode feature](https://hydrogenaudio.org/index.php/topic,111060.msg1072147.html#msg1072147).
- Paths: added support for compressed files in playlists. They can now reference tracks within zipped files like 'B:\The better life.zip\The better life\02 - Loser.mp3'.
### Changed
- Exporting Playlists: changed TF expression for 'FiiO (playlists folder)' preset to better handle non latin chars.
- UI: tooltip on search input box will now show the entire expression along some info about the current search.
### Removed
- Playlist locks: removed workaround (introduced at [0.16.0](#0160---2024-04-22)) for bugged SMP playlists locks for newest marc2003's SMP mod versions since it was fixed at the component level. 'ExecuteDefaultAction' lock is now available. See [here](https://hydrogenaudio.org/index.php/topic,116669.msg1071792.html#msg1071792).
### Fixed
- UI: replaced offline font awesome cheatsheet link at some places. See [Issue 89](https://github.com/regorxxx/Playlist-Manager-SMP/issues/89).
- Search: fix crash using search in some cases along folders.
- Search: fix crash using search in some cases with queries disabled.
- Search: fix invalid queries using search in cases where tag values were empty for drag n' drop query tags.
- Relative paths: fix relative path protocol handling on foobar2000 v2.25+. Mostly an internal rewrite. 2 warnings: paths will be written as absolute paths on playlists unless specified otherwise at the settings. And when using relative paths for playlists, the actual path written to files will be relative to the playlist folder (not to foobar2000 executable), otherwise playlist would be broken when loaded as file on any software.

## [1.0.0-beta.3] - 2025-10-28
### Added
- Configuration: new setting (at 'Settings\Integration') to auto-delete playlists at startup (both UI-only playlists and playlist files) by name or RegExp. See [here](https://hydrogenaudio.org/index.php/topic,128626.msg1071737).
### Changed
- Saving: popup which warns about saving before changing the playlist format to the default one now offers the possibility to do so, keep the current one or abort saving.
- Configuration: global support for %fb2k_component_path%, %fb2k_profile_path% and %fb2k_path% in any input asking for paths.
- Configuration: improved handling of user definition files found at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\' in case they got corrupted. The corrupted file will be backed up at the same folder and a new one created. Popups will warn about it, no longer requiring user actions. See [here](https://hydrogenaudio.org/index.php/topic,120978.msg1071225.html#msg1071225).
- Export settings: now uses '[FOOBAR PROFILE FOLDER]\js_data\export' folder at exporting.
### Removed
- Playlist locks: removed workaround (introduced at [0.16.0](#0160---2024-04-22)) for bugged SMP playlists locks for JSplitter since it was fixed at the component level. 'ExecuteDefaultAction' lock is now available.
### Fixed
- XSPF: fixed situation where an empty .xspf playlist loaded, without [foo_xspf1](https://github.com/Chocobo1/foo_xspf_1) present, resulted in a playlist within UI with the playlist file handle loaded as track (instead of an empty playlist).
- UI: fix crash when setting columns width to anything other than auto (0).
- UI: fix crash when pressing 'END' or 'HOME' keys to scroll in some cases.
- UI: smooth scrolling fixes.
- UI: fix wrong order of some init methods due to usage of 'listen to color-servers' setting which resulted on tag filtering not being properly applied.
- UI: fix crash using dynamic colors on pseudo-transparent panels.
- Fix crash renaming/moving files in some cases.

## [1.0.0-beta.2] - 2025-09-29
### Added
### Changed
- UI: color extraction from background art is now done before blur is applied. Done after blur returned gray tones in so many unintended cases.
- UI: tweaked how default colors -if not specified by user- are applied according to background and dynamic colors (from artwork). Standard playlists, UI-only playlists and folders should now have more predictable dark/light grey tones and dynamically adjust to background and standard text color.
### Removed
- Installation: fonts are no longer bundled at '_resources' folder, but found at: https://github.com/regorxxx/foobar2000-assets/tree/main/Fonts
### Fixed
- Auto-update: fix error including a file when enabling auto-updates if it was previously disabled.

## [1.0.0-beta.1] - 2025-09-20
### Added
- AutoTags: new 'bMirrorChanges' tag which forces playlists reloading (if playlist was already loaded on UI) when the manager refreshes due to external changes. It may be used to mirror any change on files due to external software. Note this behavior may clash with changes made to playlists within foobar2000, since external changes always take precedence. There is not any kind of specific changes comparison, only the last modified date is checked.
- Search: new setting to search within queries by string matching. i.e. you can look for 'Rock' within all AutoPlaylists queries, and display those which use that word.
- Sorting: new entry at 'Filter and sorting' button menu to apply current panel sorting to playlist tabs. Not available unless UI-only playlists are tracked. Note it follows the folder tree (if folders are present), thus respecting the sorting within (sub)folders. For ex. if there is a folder named 'UI' which is the last one alphabetically, and it contains two playlists named '3', '2', etc. these playlist will be the last one at tabs, since they belong to 'UI' parent. Thus, for items in panel being shown as '4', 'My pls', 'UI'['2',3'], it would result in a sorting for the playlist tabs as '4', 'My pls', '2', '3' instead of '2', '3', '4', 'My pls' (if folders were not considered). Note flat/folder view may easily be switched pressing Ctrl + B. Benefits of this feature over other approaches (as shown [here](https://hydrogenaud.io/index.php/topic,127288)), apart from following folder tree, include being able to sort with any other method supported by the panel. i.e. not only alphabetically, but also by playlist size, date, etc.
- Sorting: new entry at 'Filter and sorting' button menu to alphabetically sort playlist tabs no matter if UI-only playlists are tracked or not (as shown [here](https://hydrogenaud.io/index.php/topic,127288)). Pressing shift while clicking the menu entry will invert order.
- AutoPlaylist: new submenu with AutoPlaylists presets at 'List menu' ('+' button). It has both standard presets and some based on current selection. For ex. 'Rated >3 tracks by selected artist' which outputs a different AutoPlaylist every-time you change the selection. Both query and playlist names are dynamically adjusted. This is based on [Dynamic Queries](https://github.com/regorxxx/Playlist-Tools-SMP), but entries are not configurable (use my other scripts for that). Feel free to suggest additional default entries though.
- AutoPlaylist: UI-only AutoPlaylists have a new menu entry to show the native AutoPlaylist properties window.
- Playlists maintenance tools: new entries to check for duplicates by TF for AutoPlaylists and standard playlists.
- Queue: new entry for folders, multiple and single selection to add playlist(s) contents to queue. See related [thread](https://hydrogenaud.io/index.php/topic,127153.msg1056916/). If any of the playlist is already present on UI, the tracks are sent from them, thus having queue idx associated (which may be used via TF on playlist viewers).
- Installation: new panel menu, accessed through 'Ctrl + Win + R. Click' (which works globally on any script and panel, at any position), used to export/import panel settings and any other associated data. These entries may be used to fully backup the panel data, help when moving between different JS components (JSplitter <-> SMP) or even foobar2000 installations, without needing to manually backup the panel properties or other external files (like .json, playlists, etc.).
- UI: new menu entry to share current UI settings across all available Playlist Manager panels within foobar2000. It can be found at the settings menu 'Panel UI' submenu. Every other panel will be highlighted and show a popup asking to import the new settings or ignore them.
- UI: new menu entry to close a playlist on the contextual menu.
- UI: new menu entries to add new playlists by specified extension (and not only the panel's default one).
- UI: new setting to force quick-searching by name instead of being associated current sorting method (by category, size, etc.). It's enabled by default.
- UI: added multiple popups and info related to the use of non-tracked items on library and files with subsongs (.cue, .iso, etc.).
- UI: settings button tooltip now shows 'Shift + Win + R. Click' shortcut to open SMP/JSpliter panel menu (which works globally on any script and panel, at any position).
- UI: quick help popup also shows the 'Shift + Win + R. Click' shortcut (see above).
- UI: settings to selectively chose what playlist metadata is shown on the tooltip.
- UI: created and last modified date can now be shown on tooltip.
- UI: new settings exposed for scrolling: smooth scrolling, reverse and rows per step. Smooth scrolling displays the animation within intermediate steps. Auto setting for rows per step will dynamically adjust the steps to the current size of the list.
- UI: new settings to control font scaling for different UI elements.
- UI: exposed color settings via window.NotifyOthers() method for themes/multi-panel support. You may pass a color scheme -size 6 recommended- (output from GetColourScheme()) at 'Colors: set color scheme' (applies to all compatible panels) or 'Playlist Manager: set color scheme' (applies only to this script), which will set appropriate colors following panel's color logic; alternatively you may set direct color settings at 'Playlist Manager: set colors' which needs an array of 5 colors or an object {toolbar, text, button, hover, active}. Panel has also independent settings to listen to colors from other panels (but not for sending colors as a color-server to others). See [this](https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/issues/4) and [this](https://hydrogenaudio.org/index.php/topic,120980.msg1069107.html#msg1069107).
- Playlists maintenance tools: new entry to check for subsong items in AutoPlaylists and Smart Playlists.
- Statistics: X-Axis shown values at display menu now allows any custom value.
- Statistics: Y-Axis filter at display menu now allows any custom value for 'greater than'/'lower than' filters.
- Statistics: option to filter data between 2 custom values on Y-Axis at display menu.
- XSP: added support for [foo_playcount_2003](https://marc2k3.github.io/component/playcount-2003/) tags in Smart Playlists. i.e. '%2003_ADDED%', '%2003_LAST_PLAYED%', '%2003_PLAYCOUNT%' and '%2003_RATING%'.
- FPL: new settings to control .fpl playlists behavior, found at 'Playlist behavior\FPL playlists'. This submenu now exposes some previously hidden settings and also new ones related to JSplitter/marc2003's SMP mod.
- Exporting Playlists: 'Export and convert' presets have an additional option (at 'Playlist format' submenu) for .m3u and .m3u8 formats to switch Extended M3U usage. By default is set to true (previous behavior). It can be disabled for devices which can't parse comments prefaced by '#' (like Fiio devices). Fiio default preset has been updated with this setting.
- Console: additional logging options at settings menu.
### Changed
- Installation: added support for foobar v2.25+ file-relative protocols.
- Installation: script may now be installed at any path within the foobar profile folder, no longer limited to '[FOOBAR PROFILE FOLDER]\scripts\SMP\xxx-scripts\' folder. Obviously it may still be installed at such place, which may be preferred if updating an older version.
- Installation: multiple improvements to path handling for portable and non-portable installations. By default scripts will always try to use only relative paths to the profile folder, so scripts will work without any change when exporting the profile to any other installation. This change obviously doesn't apply to already existing installations unless restoring defaults.
- Installation: added popup warnings when scripts are installed outside foobar2000 profile folder. These checks can be tweaked at globSettings.json.
- Playlists maintenance tools: better handling of asynchronous processing, should work now better on slow HDDs when checking physical files (dead items, etc.).
- XSPF: revamped .xspf playlist loading for links and non-tracked files. It will now filter dead items and also there are multiple settings to control if non-tracked files should be loaded (they must exist) and how it's done. Added compatibility with [foo_xspf1](https://github.com/Chocobo1/foo_xspf_1) as fallback loader, which may be specially useful to [load single tracks from non-tracked cue files or other containers](https://github.com/Chocobo1/foo_xspf_1/issues/1#issuecomment-176006843); without the component is not possible to do so, unless the container file is tracked (the manager handles it) since native foobar2000 is unable to load tracks by subsongs from external files.
- Playlist formats: already saved tracks file size and duration values will be rounded to 2 decimals on first init (after updating).
- Exporting Playlists: pressing SHIFT when clicking on any of the 'Export and convert' menu entries will skip tracks conversion and exporting and only process the playlist file. The submenu shows now this tip at the header. [Issue 86](https://github.com/regorxxx/Playlist-Manager-SMP/issues/86).
- Exporting Playlists: 'Export and convert' action on folders or multi-selection will now collect all tracks first and fire a single converter thread for them, instead of one converter window per playlist. Total number of tracks which will be converted is shown on console.
- Exporting Playlists: updated preset for FiiO devices to handle Cyrillic and other special chars.
- Dynamic Menus: setting has been split into 3 options, with a new one omitting all entries related to playlists (by name) since they conflict with the way main menus are handled by Idx on DUI/CUI buttons, thus not pointing to the right entries when the playlists change and menus are refreshed. The option to expose the full list of entries is still available for CMD/foo_httpcontrol, which works fine for that usage (but will be broken on UI buttons).
- Folders: added support for 'External UI-only playlists' on destination folder for newly created playlists according to their format or action. [Issue 83](https://github.com/regorxxx/Playlist-Manager-SMP/issues/83).
- Folders: 'Move to folder' submenus now also display the entire folder tree instead of a plain list with all folders. i.e. a folder containing folders will have its own submenu, etc. In any case folders are still sorted by name.
- Documentation: improved quick help and shortcuts referencing at multiple popups.
- Keyboard shortcuts: pressing Shift + F11 will open the quick help popup.
- Keyboard shortcuts: F6 shortcut now opens a menu to export selected playlists, while Shift + F6 export them to ListenBrainz.
- Instances manager: simplified the way multiple panels are handled (and library cache shared); it should work better now, without the need for an external file. Old method may also be used if new one gives problems on startup (see below).
- Configuration: expanded user configurable file at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json' with a new setting to choose the instances manager used. By default is now set to 'v1' (see above).
- [JSplitter (SMP)](https://foobar2000.ru/forum/viewtopic.php?t=6378&start=360) support for locked playlists.
- Configuration: simplified wording and popups when installing the package for the first time. In lite mode there is an additional popup suggesting to hide the bottom toolbar.
- Statistics: scrolling cursor is displayed when scrolling using mouse + dragging.
- Statistics: added horizontal (x) scrolling using the mouse wheel (for mouses with horizontal moves).
- Statistics: 'fill' chart type.
- Statistics: settings button tooltip now shows 'Shift + Win + R. Click' shortcut to open SMP/JSpliter panel menu (which works globally on any script and panel, at any position).
- Statistics: settings button tooltip now shows 'Double Click' shortcut to force data update (see above).
- Statistics: general improvements and optimizations of point statistics. Now also show the total number of tracks before deduplication.
- Statistics: axis legend is now shown at tooltip and point statistics popup.
- Statistics: X-axis keys are now shown even when not all keys can be displayed, omitting some of the values. This ensures that charts displaying numbers at the axis at least show the initial and some middle values. This applies for bars, lines, scatter, fill and timeline charts.
- Statistics: left scrolling button position is now adjusted following Y-Axis display (except for doughnut and pie charts).
- Statistics: scrolling buttons are now shown only when the chart is not showing all data (no zoom).
- Statistics: multiple menu entries at 'Display settings' have been renamed for clarity's sake.
- Statistics: buttons are now smoothly hidden when panel is not on focus. Transparency may be adjusted from 0 to 255 by setting buttons.alpha, timer to hide them by setting buttons.timer.
- Search: searching by tracks' paths now includes AutoPlaylists.
- Search: timeout for autosearch changed to 700 ms (previously 500 ms).
- Search: the search input box will parse RegExps if they are written in /[expression]/[flags] form, there is no need to enable additional settings.
- Search: the search input box setting to parse RegExp now controls whether all input is parsed as RegExp by default or not. i.e. 'test.*' will be equivalent to /test.*/i. Note 'i' flag is forced in these cases, to specify other flags use /[expression]/[flags] format.
- Search: the search input box will allow the usage of wildcards on plain text search, without the need of RegExp usage. i.e. 'test* ' will be internally converted to /test.* /i.
- Search: drag n' drop multiple tracks using path search is now always allowed no matter if the setting to parse as RegExp is enabled or not.
- Tags: contextual menu on multiple selection to set tags now doesn't switch the presence of the tag value but first tries to add the value to all items and when it's already present, tries to delete it. This should simplify usage, since items already having the tag will not remove it when trying to also add it to those missing it.
- AutoPlaylist: UI-only AutoPlaylists are now treated as AutoPlaylists internally and not only as UI-only playlists (this involves some big changes internally so there may be some minor bugs as consequence). Thanks to these changes a lot of other improvements have been possible.
- AutoPlaylist: new AutoPlaylists created are now automatically loaded.
- AutoPlaylist: 'Clone in UI' menu entry or action also updates metadata now.
- AutoPlaylist: UI-only AutoPlaylists use the AutoPlaylist icon when using Lite mode, otherwise use the locked icon.
- AutoPlaylist: last modified date is now changed whenever the num of tracks (size), tracks file size or duration doesn't match the last saved value (rounded to 2 decimals).
- AutoPlaylist: sorting expressions at end of queries are now recognized at multiple input popups as the desired sorting, instead of asking for sorting again with another popup. For ex. at AutoPlaylist or Smart playlist (.xsp) creation, or when editing an existing playlist's query (in this case, the sorting will be replaced with the new one).
- AutoPlaylist: editing an AutoPlaylist query or sorting will also refresh the the associated UI playlist if loaded.
- XSP: new Smart Playlists created are now automatically loaded.
- XSP: 'Clone in UI' menu entry or action also updates metadata now.
- XSP: improved console logging for Smart Playlists loading, now the query part associated to playlists is also shown.
- XSP: last modified date is now changed whenever the num of tracks (size), tracks file size, playlist file size or duration doesn't match the last saved value (rounded to 2 decimals).
- XSP: editing an Smart Playlist query, sorting or limit will also refresh the the associated UI playlist if loaded.
- Shortcuts: multiple improvements to shortcuts shown on tooltips, adjusting them if lite mode is enabled or playlist is not compatible with such actions.
- Shortcuts: multiple improvements to shortcuts behavior, adjusting them if lite mode is enabled or playlist is not compatible with such actions.
- Shortcuts: multiple improvements to shortcuts available at settings menu, non compatible actions are grayed out.
- Playlists maintenance tools: on playlists with more than 20K tracks, opening the list menu no longer triggers a dead items check to show the count at the related menu entry. This should avoid situations where the menu is not shown immediately since the script is checking if every track exist first.
- UI: unified script updates settings across all my scripts, look for 'Updates' submenu.
- UI: quick-search settings menu is now duplicated at the search button's settings submenu.
- UI: pressing Up/Down arrow keys while quick-searching will jump to next/previous result.
- UI: playlist metadata (like size) is now updated when using the search tool if data was not cached.
- UI: modified and created date on tooltip is now shown as DD/MM/YYYY HH:SS.
- UI: clean up of 'List menu' entries to improve ease of usage.
- UI: clean up of 'Settings menu' entries to improve ease of usage. Import/export settings are now moved to its own submenu and renamed/moved a few other entries.
- UI: bottom toolbar is now adjusted to the font size settings.
- UI: improved bottom toolbar buttons size adjustment according to filter/sorting method.
- UI: improved multiple elements size adjustments according to font size.
- UI: UI-only Playlists load shortcut is displayed as 'Show playlist' instead of 'Load / show playlist', since they can not be (re)loaded.
- UI: general improvements to default color management. If no custom colors are set, text color is adjusted to dark/light backgrounds and they are updated immediately (not on panel reload). Also done some minor tweaks to playlist colors.
- UI: greatly improved repainting performance using columns, values are now cached when possible. This heavily affected the mouse movement smoothness over the panel.
- UI: improved general panel painting performance repainting only needed parts.
- UI: new tooltip settings implementation will reset to defaults any current tooltip related setting upon first init.
- UI: up/down buttons fading when mouse is not over the panel.
- Backup: delayed panel JSON backup and recycling on startup, which sometimes slowed down foobar2000 startup in old machines.
- Readme: updated readme pdf with latest changes, tips about 'Shift + Win + R. Click' shortcut (see above) and JSplitter install instructions.
- Helpers: updated helpers.
- Helpers: general code cleanup on menus internal code. Please report any bug on extra separators or menu entries not working as expected.
- helpers: performance improvements caching library items at multiple places.
### Removed
- FPL: hidden setting to always lock .fpl playlists on load. This setting is now exposed on a more general 'FPL rules' property.
- UI: unnecessary double playlist backup when sending selection to a playlist.
- UI: unnecessary playlist refresh after changing fonts size.
### Fixed
- Backup: auto-backup not including sorting and extra config file.
- Subsongs: fixed path handling for tracks with subsongs for any source different than ISO files (it was broken due to an un-tested change on previous versions). It should now properly handle all cases, even DSD files in .DSF and .WV formats (which report wrong 1 idx value).
- Search: last search not being applied on startup in some cases.
- Search: not excluding folders on internal processing on some cases.
- Auto-loading: manager kept reloading playlist files (auto-load) when tags, categories, etc. where changed via menus due to physical file changes.
- Playlists maintenance tools: fixed 'Revive dead items' maintenance tool changes being overridden by 'Playlist saving\Skip overwriting Playlists on file loading' setting added on [0.19.0](#0190---2024-10-09). It also applies to the version on [Playlist Tools](https://github.com/regorxxx/Playlist-Tools-SMP).
- Playlists maintenance tools: fixed 'Subsong items' maintenance tool report, which did output a wrong number of found items.
- Exporting Playlists: 'Export and convert' not working properly with UI-only AutoPlaylists and Smart Playlists.
- Exporting Playlists: fixed output path option (without a popup asking for it) and filename presets introduced on [0.17.0](#0170---2024-07-24) not working for AutoPlaylists and Smart Playlists.
- Folders: 'Move to folder' submenu was missing nested folders if they were not expanded. Now they are shown, although folders not present in current view/filter state, are still hidden.
- Folders: error restoring a deleted folder.
- FPL: wrong encoding of special chars '; , / ? : @ & = + $ #'.
- FPL: fix parsing of file paths.
- XSPF: wrong encoding of special chars '; , / ? : @ & = + $ #'.
- XSPF: malformed file paths when adding tracks to a .xspf playlist directly by mouse shortcut or drag n' dropping, which broke compatibility with other software.
- XSPF: URLS not being loaded properly in some cases due to forced lower casing. Now they are loaded with original casing. This error was heavily dependent on exotic servers being case sensitive.
- XSPF: container files different to .iso files did not had their subsong index saved.
- XSPF: cache not being cleared after using 'Update playlist' menu entry (or auto-updating), resulting on latest changes not being loaded without a manual panel refresh. It worked fine with other methods for sending tracks (like drag n' drop) though.
- XSP: unnecessary logging when checking for circular references on Smart playlists (.xsp).
- XSP: wrong size reported for Smart Playlists (.xsp) in some cases. For ex. at init or during search caching due to duplicates removal setting not being used in such cases.
- XSP: 'Reload playlist (overwrite)' not working properly for Smart Playlists.
- UI: fixed columns' width not being properly adjusted at 'auto' mode after changing font size (working fine after restarting panel).
- UI: fixed scrollbar resizing after changing font size or adding/deleting UI elements (like the header or bottom toolbar).
- UI: fixed rows resizing not being consistent with panel init.
- UI: fixed rows overlapping in some cases the bottom or header toolbar.
- UI: applying 'Multiple selection (range)' shortcut without a initial selection no longer selects all items up to the mouse position but only selects the current item.
- UI: panel shortcuts like focus on search (Ctrl + E) conflict with quick-searching while pressing Ctrl/Shift (to look at any position).
- UI: wrong column size in some cases -on auto mode- after using the search tool.
- UI: fixed multiple selection behavior when using filters, where random items where being selected after filtering by Idx, even if they were not the original ones. Now it tries to maintain items only when they are also present after filtering, reducing the selection otherwise.
- UI: sorting not being updated in some cases after playlist modifications.
- UI: minor fixes to available actions on playlist menus.
- UI: '&' being displayed as '_' on tooltips.
- UI: minor new line errors on folder button tooltip.
- UI: bottom toolbar tag/category filters showing 'Multiple...' (instead of 'All' by default) while loading the playlists at startup.
- UI: playlist highlighting animation was drawn over quicksearch box in some cases.
- UI: fix to nesting level of items within folders when parent folder was outside the view range.
- UI: fix to 'Export and convert' entry being grayed-out on multi-selection which only contains AutoPlaylists.
- UI: fix crash using 'splitter color' as background color on DUI.
- UI: workaround for dark theme not being identified on DUI foo_flowin panels.
- UI: multiple workarounds for rounded rectangles not being painted properly or producing crashes (SMP limitation).
- UI: fixed repainting errors in some cases at init related to sorting.
- UI: workaround for DPI checking under multiple OSes, specially for Wine (Unix).
- Dynamic menus: missing 'Clone in UI' exposed dynamic menu (at 'File\Spider Monkey Panel\...' for AutoPlaylists.
- Statistics: chart not properly updating after the manager initializes all playlists on startup.
- Statistics: loading popup not being shown while the manager initializes all playlists on startup.
- Crash using drag n' drop or actions which moved the selection to a playlist if the source playlist was not tracked by the manager.
- Statistics: minor fixes.
- Fixed some misspelled terms on UI and variables (which also lead to some minor bugs).

## [0.19.0] - 2024-10-09
### Added
- Auto-saving: new setting at 'Playlist saving\Skip overwriting Playlists on file loading' submenu to avoid overwriting the active playlist when sending selections from the album list or loading a folder or file(s). In such case, auto-saving may also overwrite the associated playlist file which may be undesirable or happen without the user noticing it. When this option is enabled, the playlist will be restored back to the previous state automatically and no saving will be performed. Note playback will start anyway with the selected track(s) although now they will not be visible on any playlist. This "overwrite lock" safeguard is only applied to playlists with a playlist file associated, not to UI-only playlists. Also, if enabled, some extra garbage logging may be produced when manually applying undo on a playlist (which can not be avoided since every undo action counts -internally- as deleting the entire playlist).
### Changed
- UI: 'Export and convert' presets can now be cloned or moved into another position.
- UI: 'Export and convert' presets are now removed directly using every preset submenu instead of the 'Remove preset' submenu.
- UI: filter/sorting bottom toolbar can now be hidden.
- UI: reset filters button is now renamed to 'Filter and sorting' button, and has a dual purpose allowing to clear all filters or set sorting and filtering options via menus (replacing the bottom filter toolbar if desired). Note, however, the filter/sorting bottom toolbar has an advantage since it allows setting 2 filters at the same time.
- UI: header buttons list is now sorted by order of appeareance at the 'UI elements' submenu.
- UI: cleanup of quick help popup.
- Configuration: changed the remove duplicates bias to prefer tracks containing 'BEST' within a 'TRACKDSP' tag.
- [JSplitter (SMP)](https://foobar2000.ru/forum/viewtopic.php?t=6378&start=360) support and ES2021 compatibility.
- Helpers: in case saving a file throws an error due to long paths (+255 chars) a warning popup will be shown.
- Helpers: updated helpers.
### Removed
- UI: categories and tags submenu on settings menu is now hidden if there is a 'Filter and sorting' button on UI, since both offer the same functionality.
### Fixed
- Auto-saving: fix for playlist update debouncing while panel was busy and tracks were deleted.

## [0.18.1] - 2024-08-13
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed
- Subsongs: fixed path handling for tracks with subsongs when using 'Export and convert'. Indexes were being added at the output playlist (like my track.mp3,16), instead of being removed (since the converted tracks are always individual files). Seems to be a long time bug, which was not fixed previously and went unnoticed because the tracks were converted fine with proper paths (but the playlist did not point to the file).
- Playlists maintenance tools: fixed handling of files with tags showing '.' as value at Playlist revive tool, being reported as exact matches in some cases.
- Playlist Manager Path: disk checking not working properly when setting the playlists folder via menus.
- Relative paths: relative path handling not working properly -on saving- if tracks were not on the same disk than the playlist file. Now it uses absolute paths in such cases.
- API: updated with latest ListenBrainz API changes.

## [0.18.0] - 2024-07-30
### Added
- Exporting Playlists: new 'Export and convert' preset for FiiO devices. Uses a SD card named 'external_sd1', but adjust as desired.
### Changed
- AutoPlaylist: AutoPlaylists are now refreshed when exporting them, updating the cached size, duration, etc.
- XSP: Smart Playlists are now refreshed when exporting them, updating the cached size, duration, etc.
- Helpers: updated helpers.
### Removed
### Fixed
- AutoPlaylist: creation and modification date not being added properly to AutoPlaylists.
- XSP: creation and modification date not being added properly to Smart Playlists.

## [0.17.0] - 2024-07-24
### Added
- Folders: new setting to select a destination folder for newly created playlists according to their format or action. [Issue 83](https://github.com/regorxxx/Playlist-Manager-SMP/issues/83).
- Remove Duplicates: added multi-value parsing to features related to duplicates removal. i.e. A track with multiple artists but same title can be considered a duplicated if at least one of those artists matches (instead of requiring all to match). This is used for AutoPlaylist and Smart Playlist cloning, merge-load, etc. This setting can be switched at the 'Duplicates filter...' submenu. See [this](https://github.com/regorxxx/Search-by-Distance-SMP/issues/31#issuecomment-2111061984) for more info.
- Exporting Playlists: new option to set a fixed output path (without a popup asking for it). #EXPORT#, #PLAYLIST#, #EXT# and #PLAYLISTEXT# may also be used as placeholders for the default playlist export folder, playlist name, extension or name + extension.
### Changed
- Exporting Playlists: changed the output path to default output path. At execution, the playlist name and extension will be appended and suggested as output via popups. When left empty, the default folder for the panel will be used instead.
- Folders: enabling or disable the folders feature should now hide/show them instead of totally deleting them from data files. Now is possible to temporarily switch to a flat view without losing the entire folder tree on the process.
- Remove Duplicates: improved performance of duplicates removal in multiple places.
- Configuration: changed the remove duplicates bias to prefer lossless tracks with 16 bits per sample, 44.1 Khz sample rate and greater %DYNAMIC RANGE% values (if present).
- Lite Mode: loading delays set to zero on this mode by default.
- Lite mode: statistics mode feature is now disabled by default.
- Quick-search: pressing Ctrl allows to find the pressed chars/words at any position, equal to Shift behavior. i.e. both can be used now.
- UI: SMP main menus entries (at File\...) are now cut to 50 chars in length before creating them.
- UI: panel now tries to maintain the current position instead of centering the view on the last focused item after some actions (i.e. no "jumping"). [Issue 84](https://github.com/regorxxx/Playlist-Manager-SMP/issues/84).
- UI:  restoring a deleted playlist within the panel will also highlight it afterwards.
- UI: popups opened via contextual menus related to a playlist now show the playlist name at the window title.
- UI: added album art caching for panel background whenever selecting/playing track changes but belongs to the same album. It checks for same album name and parent directory. Setting can be switched a the panel background selection mode submenu.
- UI: renamed most submenus, removing '...'.
- UI: new columns added reuse the last font, width, align and color settings used.
- Online controllers integration: improved exporting of playlists and menu entries.
- Helpers: updated helpers.
- Improved compatibility when running foobar2000 on drives without recycle bin.
### Removed
### Fixed
- ListenBrainz: updated with latest ListenBrainz API changes.
- Lite mode: drag n' drop to new playlist and 'New playlist from selection' not working properly.
- UI: merge-load not working in multiple selection if one of the selected playlists was empty.
- UI: new columns missing the default color.
- UI: re-setting the background to use front cover did not properly disable the font shading option selected if it was already enabled.
- UI: minor UI cosmetic fixes on double click on some buttons or switching columns view.
- UI: minor UI cosmetic fixes on selection and highlight rectangle over bottom buttons in some cases.
- XSP: duplicates not being removed on playlist exporting + convert using SMP main dynamic menus.
- Playlists maintenance tools: fixed handling of files without tags at Playlist revive tool, which were supposed to match by paths similarity.
- Configuration: removed unnecessary saving of cover paths when setting any panel background option.
- Configuration: .json files at 'foobar2000\js_data\presets\global' not being saved with the calculated properties based on user values from other files.
- Fixed possible crash renaming UI-only playlist on main program.
- Fixed possible crash handling web request while closing foobar2000. See [this](https://hydrogenaud.io/index.php/topic,121047.msg1044579.html#msg1044579), although current methods don't use 'WinHttp.WinHttpRequest.5.1' but 'Microsoft.XMLHTTP' which hasn't given any problems yet.

## [0.16.1] - 2024-04-26
### Added
- XSP: new entry at Playlist maintenance tools to check for circular references in all playlists.
### Changed
- XSP: Smart Playlists are now checked for infinite recursion or circular references when they are created, loaded or cached. This avoids situations where Playlist A tries to load Playlist B, which at the same time tries to load Playlist A. Or if it references itself. There is also a new recursion limit of 100 steps; any playlist which tries to look for sources with nesting higher than that will also throw a warning.
- UI: all list items color settings will be lost, make a backup if needed of property plm_15 and reapply later after updating.
### Removed
### Fixed
- UI: tracks duration and size was not properly refreshed in some cases for playlist files.
- UI: wrong handling of colors when upgrading from old versions. Crash when opening the settings menu.

## [0.16.0] - 2024-04-22
### Added
- Playlists maintenance tools: ported the Playlist revive functionality from [Playlist Tools](https://github.com/regorxxx/Playlist-Tools-SMP), available now at Playlist maintenance tools, for the active playlist. Pressing Shift + L. Click on the menu entry will select the dead items instead of replacing them. For more complex usage, check the other script.
- Importing file: feature similar to the one found at [Playlist Tools-SMP](https://github.com/regorxxx/Playlist-Tools-SMP), lets you find matches on library using a mask against a text list (for ex. ARTIST - TITLE per line). Additionally, not found items may be replaced with YouTube links. It also works directly on a URL as long as the content is only text. There is an array of configurable query filters to tweak how tracks are preferred (for ex. non live tracks first).
- UI: total track's size is now available as sorting method, tooltip info (next to duration) and display column. Value is calculated at startup for playlist files (and never saved at the playlist file nor cached) or after loading any of them. This calculation is done without an additional performance impact in case playlist caching is already enabled due to specific search settings (for ex. enabling query searching); it may also be forced with a new setting at 'Playlist behavior\Update other Playlists...' submenu. For UI-only playlists, is always calculated at startup independently of any other setting.
- UI: added tip at quick help popup ('?' button) about tooltip font settings.
- Configuration: expanded user configurable file at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json' with a new setting for console logging to file. Disabled by default. Now this is a change from the previous behavior, where console was always logged to 'console.log' file at the [FOOBAR PROFILE FOLDER]. It can now be switched, but since it's probably not useful for most users is disabled by default.
### Changed
- XSP: Smart Playlists are now also refreshed when the playlist sources change by drag n' drop, mouse actions, deleted or restored, in addition to changes when they are loaded in UI (introduced at [0.13.0](#0130---2024-02-28)).
- Clone: .xsp playlists and Auto Playlists will now make a copy of the loaded playlist (if possible) when cloning as UI playlist, instead of re-calculating the playlist to create the copy. This ensures the clone has the same sorting than the loaded version.
- UI: changed all builtin tooltips during external drag n' drop to use the native ones (which also span outside the panel).
- UI: all sorting methods now also sort elements by name in case they have the same priority (for ex. all 0-sized playlists sorted alphabetically instead of randomly).
- UI: smoother scroll bar movement when using the mouse and dragging the bar.
- Helpers: most json data files are now saved with Windows EOL for compatibility improvements with Windows text editors.
- Helpers: updated helpers.
### Removed
### Fixed
- UI: sorting not applying properly to folders when sorting by size or duration.
- UI: wrong offset for first child item within nested folders when the root folder was not shown on the list.
- Drag and drop: conflict drag n' dropping and pressing Ctrl over the "+" button, unintentionally triggering last edited playlist highlighting at the same time (feature introduced at [0.14.0](#0140---2024-03-15)).
- UI: drag and drop and other features requiring a playlist selection did not work properly with selections from other panels which were not using a playlist as source. Issue #81
- Playlist locks: workaround for [SMP bug](https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/198) related to playback on locked playlists. It should now work fine, but the 'default action' lock can not be switched anymore. Issue #82

## [0.15.0] - 2024-03-21
### Added
- UI: settings to switch the playlist status icons at the right (loaded/playing now/active). Active playlist icon has been added too.
- UI: settings to change the standard playlist color and header buttons independently of general text color. Therefore the playlist status icons color can now be changed without affecting the rest by setting the other colors if desired. Beware this update will probably reset all colors customization on existing panel to default values.
- UI: move to folder submenus now have a 'New folder...' entry to directly create a new folder and move selection to it.
### Changed
### Removed
### Fixed
- UI: fixed crash due to infinite recursion trying to move a folder into one of its own subfolders. In the case of drag n' drop, the tooltip now warns about it. If there are multiple items selected but at least one of them can be moved to the child subfolder (for ex. when selecting both playlists and folders), then non valid items are skipped.

## [0.14.1] - 2024-03-16
### Added
### Changed
- Lite mode: some improvements when switching from/to lite mode to maintain playlist metadata and folder structure. Now it tries to merge old and new data, without overwriting. In any case, it is not recommended to switch modes frequently, since some info may be lost for playlist files (like sorting, which can not be merged).
- UI: move to folder submenus now have a 'No folder' entry to move them to the root.
- UI: move to folder menu entry now highlights the folder destination if the folder is closed. This is in addition to current behavior, playlist highlighting when it's opened.
- UI: panel no longer displays a background message about no playlist files on tracked folder on Lite mode or when playlist loading has been delayed. It now shows a blank list.
### Removed
### Fixed
- Configuration: due to internal changes at init loading, folders were being removed in some cases at startup (but not on panel reload). [Issue 80](https://github.com/regorxxx/Playlist-Manager-SMP/issues/80)
- Configuration: due to internal changes at init loading, no playlists were shown of first setup on lite mode.
- Configuration: 'Panel behavior\Loading delays' input not working.
- UI: filters not applying properly at init in some cases.
- UI: filter button was highlighted while loading playlists (even if no filter was active). Cosmetic change, it was properly set after playlist loading.
- UI: sorting errors in some cases when moving items to folders using menus.

## [0.14.0] - 2024-03-15
### Added
- Playlist formats: new menu entries on playlist contextual menu to convert UI-playlists to physical files. Works in single and multiple selection. [Request 79](https://github.com/regorxxx/Playlist-Manager-SMP/issues/79)
- UI: new action on list button (+), using Shift + L. Click to send selection to a new playlist.
- UI: new action on list button (+), using Ctrl+ L. Click to send selection to last modified playlist. Meant to be used with the previous action to first create a new playlist and then keep sending tracks to it. When pressing Ctrl over the button, the list will jump to target playlist and highlight it. Last modified playlist detection skips any playlist including 'library viewer' or 'filter results' in their name, which are modified frequently and would not be the desired target in any case.
- Configuration: added new settings at 'Panel behavior\Loading delays' submenu to control how the panel delays loading\applying some actions. It may come useful in cases where foobar2000 startup takes a lot of time, for ex. delaying playlist loading 30 secs after startup.
- Configuration: expanded user configurable file at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json' with a new setting for panel repaint debugging purpose. Disabled by default.
- Configuration: expanded user configurable file at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json' with a new setting to check OS features on every panel startup. Enabled by default. This has been the default behavior since OS' features check was implemented, but it can now be disabled to improve init performance a bit, specially at foobar2000 startup (since it seems to hang in some cases when running it on slow HDDs or systems).
### Changed
- UI: current position on list is now maintained while resizing the panel (instead of jumping to the top).
### Removed
### Fixed
- Playlist formats: creating a playlist file from active playlist when the playlist was an UI-only playlist did not properly convert it in some cases, complaining duplicated names. [Request 79](https://github.com/regorxxx/Playlist-Manager-SMP/issues/79)

## [0.13.0] - 2024-02-28
### Added
- Importing JSON: allows to import any available playlist metadata from UI-only playlists, .fpl, .xsp, .pls and .srtm files (which is only saved in the JSON file). In such case, the playlist file (with same filename and name) must already reside in the tracked folder to be matched at the importing step and overwritten with the metadata found.
- Importing JSON: allows to import the folder structure saved in the JSON file.
- Importing JSON: allows to selectively choose which formats will be imported. i.e. files, AutoPlaylists and Smart Playlists, UI-only playlists, folders, ...
- AutoPlaylists: it's now possible to directly import all AutoPlaylists from native foobar2000 (v1.6 and V2.0+) to the manager using 'Import AutoPlaylists from UI...'. It will read the config files at the profile folder and try to parse the playlists found there (retrieving the query, name and sorting). This should automate the process of importing AutoPlaylists the first time the manager is installed, instead of going one by one.
- Search: new search mode against tracks' metadata. Internally loads all tracks from every playlists and looks for the search input within specific tags (by default ALBUM ARTIST, ALBUM, TITLE and DATE). It may produce some lag while searching if there are a lot of playlists, so disable it if not needed. The tracks are cached, so consecutive searches are faster (or performing it some seconds after startup); but it greatly increases startup time when using search is maintained at startup (since cache has not been built). In such cases, make sure to have the setting 'Reset search on startup' enabled.
- Search: new search mode against playlists' metadata. Retrieves track's metadata from the playlist file (available on .m3u8, .m3u, .xspf and .pls formats) and tries to match ARTIST or TITLE. This mode is much faster than looking for the track's tags (see above).
- Search: new search mode using queries. If the query outputs at least a track from a playlist, is considered a match. Caching is used (see above).
- Search: using drag n' drop on search box when query search mode is enabled will create a query to show only playlists containing such tracks by title and artist.
- Search: using drag n' drop on search box when tags search mode is enabled will show only playlists containing tracks matching title and artist.
- Search: the different drag n' drop search modes can now be set by priority. i.e. If query and path search are both enabled, query search may be set as as higher priority than path search, so it will always use queries if possible. In case query search is disabled, path search would be used instead.
- XSP: Smart Playlists are now automatically refreshed whenever a playlist source changes (not in any other case, use AutoPlaylists for that). i.e. if a Smart Playlist has a query like "#PLAYLIST# IS A", and "A" playlist changes, the Smart Playlist is automatically refreshed now (tracks added/removed). If the playlist is not loaded, only metadata is updated (like duration or size). This behavior can be disabled at settings.
- Backup: added more backup procedures when editing playlists. Original file is restored in case of errors.
- Statistics: new 'size' data mode for statistics, which shows statistics according to playlist's size (num of tracks) grouped by 25. Ex. Empty, >0, >25, >50, ... Clicking on any data point will filter the panel, as usual, with playlists with such condition.
- Statistics: data source can now be set to All playlists, Playlist files, AutoPlaylists, UI-only playlists or Selected playlists (by name).
- Configuration: added integrity checks to global user settings files, found at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\[...].json'. In particular queries are now check to ensure they are valid and will throw a popup at init otherwise. Other settings are check to ensure they contain valid values too.
- Configuration: expanded user configurable file at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json' with a new setting to output to console profiling logs at script init. They work globally. Disabled by default.
- Folders: added menu entries to create [child] playlists from current selection or active playlists at the folder contextual menu. [Request 71](https://github.com/regorxxx/Playlist-Manager-SMP/issues/71)
- Folders: playlists can now be created within folders using drag n' drop (pressing ALT or ALT + CONTROL as usual). [Request 71](https://github.com/regorxxx/Playlist-Manager-SMP/issues/71)
- UI: added drag n' drop actions to the quick help popup (shift click on help button).
- UI: added settings for UI-only bound playlists deletion behavior when deleting a playlist file: always ask, delete both (file and UI-only playlist) or delete only playlist file. [Request 76](https://github.com/regorxxx/Playlist-Manager-SMP/issues/76)
### Changed
- Importing JSON: importing logic has been rewritten to be more robust. If an existing playlist has the same name than one imported, a popup will ask to overwrite or omit it. In case extensions differ, will show an error (since they are probably not the same playlist). Overwriting a playlist involves replacing the old metadata with the new one, which in the case of AutoPlaylists means the query is replaced (plus other data), but for other playlists formats, things like tags, categories, etc. are also transferred. Items will also be compared before overwriting, so in case there is no changes (filtering on-init properties like folders being opened or not), they will skipped.
- Importing JSON: suggested JSON file path is now automatically retrieved from clipboard (instead of being empty).
- Search: added validity checks to input to avoid crashes or errors.
- AutoPlaylists: added checks to sorting inputs to ensure they are valid expressions.
- AutoPlaylists: AutoPlaylists created via native foobar2000, instead of the manager, are now flagged as 'AutoPlaylist (UI)' when opening their contextual menu at the manager, as an indication of playlist being an UI-only playlist. Some menu entries also show a warning about cloning needed to fully integrate them.
- AutoPlaylists: cloning an AutoPlaylist created via native foobar2000, instead of the manager, also opens the AutoPlaylists properties now to easily copy the query and sort patterns.
- XSP: added checks to sorting inputs to ensure they are valid expressions.
- XSP: Smart Playlists are now locked when loading them, similar to AutoPlaylists behavior. If there is no sorting, then tracks can be reorder, otherwise sorting is also locked.
- XSP: improved caching in multiple playlist actions.
- XSPF: improved caching in multiple playlist actions.
- XSPF: .xspf playlists now follow the complete specification, allowing multiple locations per track. In case one is not found, the next one is used. Previously only one location per track was allowed. Content resolution via tags has not changed since that was already implemented.
- Folders: drag n' drop now allows to move items to any specific position within a folder, not just to the end, on manual sorting.
- Folders: improved filtering in some cases with nested folders or showing only specific playlists within a folder.
- UI: 'Move to folder...' submenu now shows an indicator when there are no other folders to move to.
- UI: Added a tip at all input popups for sorting, to specify when 'SORT BY' and similar statements must be used.
- UI: optimized repainting to use less resources on statistics mode.
- UI: changed tooltip for multiple selection to only show the available actions which work on the entire selection.
- Shortcuts: global shortcut to search (F9) uses now the new search methods added for tracks.
- Shortcuts: Shift + F9 now displays the report with selected tracks (previously it was only used when pressing F9 if no compatible search methods was enabled to look for tracks).
- Shortcuts: all global shortcuts related to playlists (F1 - F6) now work recursively on multiple selection and folders (without level limits). Exceptions: F2-Rename (since renaming on batch is not allowed), and DEL-Remove playlist (deleting in batch can only be done via menus and multiple selection to avoid accidental deletions of multiple items).
- Shortcuts: global shortcut are now shown on the related menu entries and/or buttons. For ex. the menu entry to create a new playlist now displays the shortcut F7 if global shortcuts are enabled.
- Clone: wrong warning about not found tracks when using relative paths in some cases.
- Clone: when cloning playlists within a folder (via menus or shortcuts), the new items will be created now at the same folder level (not at the root of the list).
- Playlist formats: added some checks when parsing corrupted playlists to avoid crashes (and instead omit the line).
- ListenBrainz: input when using playlist importing by MBID is now checked to ensure it's a valid UUID (before attempting the web retrieval).
- Startup processing has been changed to not run any secondary process while caching the library (for ex. AutoPlaylist size updating, etc.); these steps will be run sequentially after library caching has been done. Using multiple panels, one of them will cache the library and the rest run the other steps if possible.
- Configuration: changed the remove duplicates bias to prefer tracks with higher play-counts and positive feedback tag (love/hate).
- Helpers: updated helpers.
- Console: improved log file formatting on windows text editors which parse new lines only with CR+LF instead of LF.
- Code cleanup.
### Removed
- UI: internal logging when checking .xsp playlists.
### Fixed
- UI: single click actions not working in some cases. [Issue 74](https://github.com/regorxxx/Playlist-Manager-SMP/issues/74)
- UI: multiple selection was lost in some cases after executing actions if UI-only playlists were tracked.
- UI: extra separator on 'Restore...' playlists submenu in some cases.
- UI: AutoPlaylists contextual menu missing 'Load playlist' entry on lite mode.
- UI: playlists missing 'Delete' entry on lite mode.
- UI: fixed misspelling of 'bound' in multiple places.
- UI: renaming a playlist/folder changed the position when using manual sorting, sending the item to the end of the list (instead of keeping the original position).
- Drag and Drop: source playlist's size was not properly updated after using drag n' drop on move tracks actions. It was increasing the size instead of decreasing it.
- Search: search history not applying the term when clicking.
- Folders: playlist deletion within folders did not update the UI properly in some cases. [Issue 72](https://github.com/regorxxx/Playlist-Manager-SMP/issues/72)
- Folders: nested folders not working in some cases or producing crashes. [Issue 73](https://github.com/regorxxx/Playlist-Manager-SMP/issues/73)
- Folders: internal drag n' drop not working properly on sorting methods different than manual one. i.e. to move items into/out of a folder.
- Search: crash on multiple settings menu entries due to a typo on variable.
- ListenBrainz: crash when importing an existing playlist in some cases.
- Exporting Playlists: crash when clicking on a point -to filter- while using folders data.
- Exporting Playlists: error while exporting an AutoPlaylist with sorting.
- Exporting Playlists: crash while reporting malformed .xsp playlist.
- XSP: wrong cache handling for .xsp playlist when rewriting the queries.
- XSP: UI-only playlists were not working as playlist sources.
- XSPF: playlist was rewritten when some tracks were not found (by link, content resolver and path) after loading it.
- XSPF: identifier tag was not working properly at the content resolution step (usually used for MUSICBRAINZ_TRACKID).
- XSPF: .xspf playlists not loading properly when content resolution was used in some cases.
- XSPF: malformed track paths using relative paths in some cases.
- AutoPlaylists: crash when changing AutoPlaylists sort TF expression if the value was not changed.
- Links: multiple fixes to YouTube web links handling.
- Remove duplicates: advanced RegEx title matching option not being applied in some cases.
- Colors: crash if a color was missing from an older version, after updating, if the settings menu was opened. [Issue 70](https://github.com/regorxxx/Playlist-Manager-SMP/issues/70)
- Shortcuts: 'Single click' header submenu, to set the single click actions on header, was duplicated.
- Lite mode: fixed some minor errors when switching to/from lite mode (after installation process only).
- Rare crash on mouse L. button up if a menu from other panel was displayed over the manager panel, the action affected a playlist and the click fell on the list.
- Minor fixes.

## [0.12.1] - 2023-12-09
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed
- Helpers: added missing helpers (namethatcolor) which made the script crash on init.
- Package: update package builder with missing .fpl playlist helper.

## [0.12.0] - 2023-12-08
### Added
- Playlist formats: .fpl format enhanced support. Tracks can now be read by path from .fpl files and playlist size calculated on startup (contrary to previous behavior which required loading of the file).
- Playlists maintenance tools: added .fpl support, in particular: mixed paths, external items, dead items, duplicates, size mismatch, duration mismatch and format errors.
### Changed
- Playlist formats: optimization of .xsp and .xspf caching.
- Playlist formats: .fpl playlists update the duration tag whenever duration mismatch maintenance tool is used (no need to load the playlist anymore).
- Playlists maintenance tools: optimization of all tools.
- Helpers: updated helpers.
### Removed
### Fixed
- Playlists maintenance tools: folders are now skipped (instead of being logged as errors on console).
- Playlists maintenance tools: multiple fixes to maintenance tools and format compatibility.

## [0.11.0] - 2023-11-28
### Added
- UI: added setting to disable tooltip on all scripts. Found at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json', by changing 'bTooltip'. By default tooltip is always shown. This setting will never be exposed within foobar, only at this file.
### Changed
- Helpers: updated helpers.
- Improved error messages about features not working related to OS checks (at startup) with tips and warnings.
### Removed
### Fixed
- UI: minor fix to settings button's tooltip.

## [0.10.0] - 2023-11-24
### Added
- Statistics: click on point to jump to list mode and filter by selected key.
- Statistics: added buttons to statistics mode. Menus are now opened via buttons, no longer with R. click. There is also a button to directly exit statistics mode.
- Statistics: added sorting options according to Y axis.
- Statistics: colors are now forced with a scheme based on selection color and background.
- UI: transparency input menu entries now have a hint about which value is opaque and which transparent.
### Changed
- Lite mode: config json files are now saved with an UUID on filename, so they can't conflict with playlist managers panels associated to a physical tracking folder anymore.
- Lite mode: it's now possible to have multiple playlist managers panels in lite mode tracking different AutoPlaylist or with different manual sorting/folder structures.
- Helpers: updated helpers.
- Console: reduced max log file size to 1 MB.
### Removed
### Fixed
- UI: minor fix to settings button's tooltip.

## [0.9.0] - 2023-11-15
### Added
- Auto-update: added -optional- automatic checks for updates on script load; enabled by default. Compares version of current file against GitHub repository. Manual checking can also be found at the settings menu. Setting may also be globally switched at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json', by changing 'bAutoUpdateCheck'. It will apply by default to any new installed script (previous scripts will still need to be manually configured to change them).
- Added setting to disable popups related to features not being supported by the OS (at startup). Found at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json', by changing 'bPopupOnCheckSOFeatures'. By default popups are always shown. This setting will never be exposed within foobar, only at this file.
### Changed
- UI: color menu entries now show the color name along the menu entry.
- UI: panel background can now use both 'Maintain proportions' and 'Fill panel' options at the same time when using the front cover.
- Helpers: updated statistics mode with new graphs and features from the latest [Statistics-Framework-SMP](https://github.com/regorxxx/Statistics-Framework-SMP) version.
- Helpers: replaced library [chroma.js with own version](https://regorxxx.github.io/chroma.js/).
- Helpers: updated helpers.
### Removed
### Fixed

## [0.8.0] - 2023-10-18
### Added
- Search: fuzzy search can be enabled by adding '~' to the beginning/end of the search term (when not using RegExp). There are 2 modes, one which only works with single words (fast) and a full fledged fuzzy search for multiple word input (slower).
- Quick-search: pressing Shift allows to find the pressed chars/words at any position of the name, contrary to the default behavior which only looks at the start of the name. Popup on Quick-search has been adjusted to indicate this.
### Changed
- Configuration: the installation process now asks to enable the items contextual menu if desired.
- Configuration: after changing the playlists path, a popup now asks to enable relative path handling menu entries.
- Configuration: improved feature switching in some settings combinations.
- Search: last search may be reset or restored on startup. Configuration at search button.
### Removed
### Fixed
- Search: infinite search interval in some cases while using the search function along folders.
- Renaming a playlist is not allowed if name (+UUID) matches any other item tracked by the manager.
- Creating a playlist, Smart Playlist, AutoPlaylist or UI-only playlist is not allowed if name (+UUID) matches any other item tracked by the manager.

## [0.7.0] - 2023-10-05
### Added
### Changed
- Configuration: expanded user configurable files at '[FOOBAR PROFILE FOLDER]\js_data\presets\global' with new queries. File will be automatically updated with new values (maintaining the user settings).
- Configuration: improved the user configurable files update check for missing keys.
- Helpers: updated helpers.
### Removed
### Fixed

## [0.6.3] - 2023-09-26
### Added
### Changed
### Removed
### Fixed
- UI: crash while using internal drag n' drop if the number of elements was lower than the available rows and mouse moved to an empty row.

## [0.6.2] - 2023-09-25
### Added
### Changed
- Helpers: updated helpers.
- Documentation: updated readme PDF to be up to date with all latest changes.
### Removed
### Fixed
- UI: wrong tooltip on folder button.

## [0.6.1] - 2023-09-20
### Added
- Folders: added a 'Move to folder...' submenu in the playlist and multiple selection contextual menu, to easily send playlists to a folder without using drag n' drop.
- Folders: added submenu to create playlists/folders within folders (simplified version of the entries found at the list menu on the header).
- Folders: color is now configurable (found at the general UI or the folders submenu).
### Changed
### Removed
### Fixed
- Exporting Playlists: playlist files were not overwritten properly -if chosen to do so- using 'Copy playlist files to...' for multiple selection.
- Exporting Playlists: output folder was not shown using 'Copy playlist files to...' for multiple selection.
- Exporting Playlists: AutoPlaylists are now filtered 'Export and Copy Tracks to...' for multiple selection, instead of being logged as error.
- Folders: custom icon setting crash.
- Lite mode: 'new playlist from active...' was not hidden while using lite mode.
- Lite mode: minor fixes to separators on list menu while using lite mode.
- Lite mode: minor fixes to separators on header buttons tooltips while using lite mode.

## [0.6.0] - 2023-09-13
- Folders: items may now be grouped in folders, with unlimited level depth support and the ability to be expanded/collapsed. Adding or removing items is done via drag n' drop, similar to the way manual sorting works. Folders have an unique contextual menu which allow to apply some actions to their content or multiple-select them. Feature can be disabled if desired.
- ListenBrainz: export to ListenBrainz is now available on the multiple selection contextual menu. i.e. can work on batch.
- UI: added tooltip at scrollbar about double click action.
- UI: switch columns button.
- Statistics: added statistics mode. Use it to display general metadata stats about the current panel; for ex. number of playlists per extension. See [ Statistics-Framework-SMP](https://github.com/regorxxx/Statistics-Framework-SMP).
### Changed
- Quick-search: can be now be disabled.
- UI: improvements on how shortcuts are shown on quick help popup.
- UI: Del, º, \, / shortcuts now work even when F1-F12 shortcuts are disabled.
- UI: new shortcut, F7 + Shift, which creates a new folder.
- ListenBrainz: network errors when caching library paths (usually at startup) are not reported anymore (since they don't give useful info on real use-cases).
- Helpers: updated helpers
### Removed
### Fixed
- UI: avoid jumping to the top after auto-updating a playlist if mouse never entered the list and was only used at the scroll bar.

## [0.5.3] - 2023-08-28
### Added
### Changed
### Removed
### Fixed
- UI: filters reset on init due to bugfix introduced on [0.5.0-beta.21](#050-beta21---2023-06-27). which was only intended on first init (after setup).
- UI: offset improperly set after filtering in some corner cases.
- UI: text shadows sometimes not being cut to the same length than the main text. [Issue 69](https://github.com/regorxxx/Playlist-Manager-SMP/issues/69).

## [0.5.2] - 2023-08-05
### Added
### Changed
- Lite mode: fully disabled auto-backup on lite mode. Minor performance improvements.
- Lite mode: fully disabled auto-load on lite mode. Minor performance improvements.
- Lite mode: fully disabled library path tracking on lite mode. Minor performance improvements.
- Lite mode: auto-save timer is now set to 1000 ms on lite mode, and back to default values when disabling it. It will be faster showing changes on UI-only playlists.
- UI: internal drag n' drop now allows to move an item below or over the current position (instead of just moving it before it). UI has been adjusted to show a bold line at the target position.
- UI: list now jumps to new position after renaming a playlist [file] via menus/actions. For ex. sorting alphabetically, playlist may be found at a different position after renaming.
- UI: playlist [file] is highlighted when renaming the bound playlist on native foobar2000 UI.
- UI: current panel position should be maintained -if possible- after [auto]updating playlist files from folder.
- UI: improved text shading performance up to 90%. It should now be working much better on low-end systems.
- UI: font shading is now disabled when disabling panel art background and a popup warns about the performance impact when enabling it.
- UI: panel art background is now better adjusted to fill the entire list.
### Removed
### Fixed
- Lite mode: 'Export and convert' settings being shown on lite mode.
- Lite mode: tracking disabled after disabling lite mode.
- UI: selection focus was not being updated while scrolling using the wheel or buttons.
- UI: missing separator at header from Playlist items' contextual menu.
- UI: minor fixes to multiple selection contextual menus.
- UI: settings button not being updated in some instances after switching library tracking.
- UI: wrong size for vertical line before buttons.

## [0.5.1] - 2023-07-29
### Added
### Changed
### Removed
### Fixed
- Configuration: some fixes for ALBUM ARTIST usage instead of ARTIST.  To apply the change on existing installations, delete '[foobar_profile]\js_data\presets\global\globQuery.json' and '[foobar_profile]\foobar2000\js_data\presets\global\globTags.json' files. Also click on settings menut at 'Playlist Behavior\Export and Convert\Restore defaults'.
- Crash due to list.checkPanelNames method missing after using some menu entries.

## [0.5.0] - 2023-07-28
### Added
- AutoPlaylists: new 'Clone in UI' menu entry for AutoPlaylists.
- XSP: new 'Clone in UI' menu entry for XSP playlists.
### Changed
- XSP: wrong queries when creating a new Smart Playlist now show an informative popup instead of silently failing and logging to console.
- UI: improvements to text shading depending on the background/art color.
- UI: mouse cursor now reflects when an internal drag n drop for manual sorting is not allowed. Selection is also shown using the inverted selection color (usually red/orange).
- UI: shift clicking on folder button will manually refresh the panel. Tooltip has been adjusted.
- UI: shift clicking on settings button will switch library tracking. Tooltip has been adjusted.
- Configuration: ALBUM ARTIST is now used instead of ARTIST by default (on new installations). This ensures better compatibility with classical music, where the artist is the actual performer but the album artist is the original composer/artist. To apply the change on existing installations, delete '[foobar_profile]\js_data\presets\global\globQuery.json' and '[foobar_profile]\foobar2000\js_data\presets\global\globTags.json' files. Further configuration may be needed via menus.
### Removed
### Fixed
- Export: multiple fixes to TF paths.
- AutoPlaylists: fixed non valid query warning for queries containing 'SORT' as string/tag, like "%ALBUMARTISTSORT%%ALBUMTYPE%%ARTISTS%%ARTISTSORT%%ARTWORKGUID% PRESENT".
- AutoPlaylists: AutoPlaylists not filtering duplicates -if enabled- when using keyboard shortcut F3.
- XSP: XSP playlists not filtering duplicates -if enabled- when using shortcut actions or keyboard shortcut F3.
- Lite mode: switching lite mode no longer overrides default features enabled when lite mode is disabled afterwards. This made restoring defaults to not work as expected since it would only enable the features available on lite mode. A panel refresh fixed this behavior.
- Lite mode: tooltip fix at settings button when switching lite mode during the same session.
- Lite mode: minor fixes to AutoPlaylists contextual menu on lite mode.
- UI: focus sometimes not being set on newly created AutoPlaylist.
- UI: focus sometimes not being set on newly created Smart Playlists.
- UI: focus not being set on newly created UI-Only Playlists.
- UI: minor fixes and improvements to quick help (shift click on help button).
- UI: minor fixes to multiple selection contextual menus.
- UI: in some cases the filter buttons were miss-clicked when clicking on the scrollbar if distance was lower than the cursor size and the mouse entered first on the button(s), should be much precise now.
- UI: size and duration was not properly updated in some cases for UI-only playlists after using drag n' drop or copy/move tracks actions.
- UI: current view was vertically shifted sometimes after editing the query of an AutoPlaylist or Smart Playlist (instead of maintaining the position).
- UI: categories and tags not being sorted following current locale. i.e. "World" being shown before "foobar", due to uppercase usage, or "_first" at the end due to "_" usage. Now it follows the expected behavior: _first, foobar, World, ...
- UI: cosmetic internal drag n' drop fixes when releasing outside the allowed range.
- UI: workaround for GDI/SMP bugs or weird behaviors using text shading.
- UI: effects not being updated properly after releasing internal drag n drop for manual sorting on header or buttons.
- UI: cursor not being updated in some cases after releasing internal drag n drop for manual sorting on header or buttons.
- Fix for non [standard hyphen chars](https://jakubmarian.com/hyphen-minus-en-dash-and-em-dash-difference-and-usage-in-english/) on playlist names.
- Crash when deleting a multiple selection.
- Crash when creating UI-Only Playlists.

## [0.5.0-beta.25] - 2023-07-04
### Added
- UI: added option to use bold font for playlists.
- UI: added light shadows to playlists' text when using art as background to improve readability. It's now the default, but it may be disabled.
- UI: added blur setting for the panel background art.
- UI: added setting to tint UI elements (apart from the playlist list) while using the panel background art.
### Changed
- UI: multiple optimizations to panel background art usage.
### Removed
### Fixed

## [0.5.0-beta.24] - 2023-07-03
### Added
- UI: panel background can now use the now playing/selection art or an external file. Different proportion/filling settings available, along transparency.
### Changed
- UI: while using multiple selection, R. clicking on another playlist appends it to the current selection and immediately calls the context menu. This only happens in case R. Click action is associated to the playlists context menu.
- Search: in case current view is filtered by specific playlist (for ex. using the 'Playlist maintenance tools'), if there is a text on the search box, the results are also filtered by the search.
- UI: some improvements to menus while managing locked UI-only playlists (specially for native AutoPlaylists) or loaded playlists with UI-locks.
### Removed
### Fixed
- Search: current search did not update properly after adding/removing a playlist (for ex. cloning).
- UI: selection rectangle not being shown when opening the playlist contextual menu.
- Playlist locks: multiple fixes to handling of playlists with rename/delete locks.

## [0.5.0-beta.23] - 2023-06-29
### Added
### Changed
- Lite mode: disable library path caching on lite mode.
### Removed
### Fixed
- Helpers: fixed incorrect warning about missing font.

## [0.5.0-beta.22] - 2023-06-29
### Added
- UI: new menu entry to create UI-only playlists.
- Lite mode: new lite mode to exclusively track UI-only playlists, thus behaving like a simple replacement for foo_plorg. Extends the current settings to disable/enable features, changing how the panel works at low level. i.e. no playlist files, no folder tracking, etc.
### Changed
- UI: configurable playlist menus is now at 'Features...' submenu within the settings menu. No longer associated to "menu entries" since it now affects other settings.
- UI: settings menu, new playlist menu, keyboard shortcuts and filter buttons now follow the settings for shown/hidden features. i.e. if menu entries to edit tags are hidden, then all other features depending on it will also be hidden (like filtering or sorting by tag). (see above)
### Removed
### Fixed
- Playlist locks: menu entries not working properly for multiple selection mode (when lock was set by another component). Now mimics the behavior of single selection menu.
- UI: workaround for a SMP crash with some combinations of sizes drawing rounded boxes. This doesn't solve the underlying problem but at least bypass the crash and just omits painting the element.
- UI: another workaround for a SMP crash with some combinations of sizes drawing rounded boxes, this time aiming to avoid the previous situation by properly adjusting arc of rounded boxes whenever it's possible.

## [0.5.0-beta.21] - 2023-06-27
### Added
- Tags: new auto-tags named 'bPinnedFirst' and 'bPinnedLast' which force showing the tagged playlists at top/bottom of the list, for any sorting/filtering combination.
- Configuration: script will be completely disabled after installing for the first time until user clicks on the setup button (which will initiate a serie of popups). This is a workaround for a [SMP bug](https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/210) during the installation process.
- UI: added manual sorting. It must be enabled on the sorting button and works independently to the automatic sorting methods. Playlist can be reordered by drag n' dropping within the panel or using the sorting submenu. It also works with multiple selection. Pinned playlists are ignored in this mode. Sorting indexes are stored at '.\js_data\'.
- UI: configurable columns to display playlist metadata. Width, metadata, font size, order, num of columns, borders and colors can be set. In the case of playlist's size, a configurable unit may be set. The entire feature may be disabled using the configurable UI elements submenu.
- UI: added sorting by creation date.
- UI: added sorting by duration.
- UI: added configurable R. click mouse actions (like the previous L. click and Middle click ones).
- UI: added configurable timer for [double clicking](https://en.wikipedia.org/wiki/Double-click).
- UI: added configurable timer for tooltip (on properties panel). By default is now 2 times the double clicking timer, also if changed, a popup will ask to update its value.
- UI: settings header button is now animated when library tracking has been disabled and path cache needs to be rebuilt.
- UI: folder header button is now animated when tracked playlists folder contains new changes. In case auto-loading has been disabled, it can be used as a warning to know when manual refresh is needed.
- UI: filter header button is now highlighted whenever a filter is active, It follows the 'Also reset search filter' setting, thus not being highlighted while using the search filter if it's disabled.
- UI: added new menu entry to create a playlist from current selection (which does the same than drag n' drop + ALT).
- Drag and Drop: added tooltip on drag n drop giving hints about the action used: sending to new playlist, to selected playlist, to search box, ...
- Keyboard shortcuts: pressing F1 will lock / unlock the highlighted playlist file or UI-only playlist.
- Keyboard shortcuts: pressing F2 will rename the highlighted playlist.
- Keyboard shortcuts: pressing F3 will create a clone on UI of the highlighted playlist.
- Keyboard shortcuts: pressing F4 load the highlighted playlist (or jump to it if it was already loaded).
- Keyboard shortcuts: pressing F5 will create a copy of the highlighted playlist with same extension. AutoPlaylists, Smart Playlists and UI-only playlists will maintain their format.
- Keyboard shortcuts: pressing F6 will export the highlighted playlist to ListenBrainz (+ Spotify if configured to do so).
- Keyboard shortcuts: pressing F7 will create a new empty playlist.
- Keyboard shortcuts: pressing F8 will cycle current view by category.
- Keyboard shortcuts: pressing F9 will filter the manager showing playlists with the selected tracks (if the search box and path searching are enabled) or show a popup with the results (otherwise).
- Keyboard shortcuts: pressing F10 will open the settings menu or the list menu (when also pressing shift).
- Keyboard shortcuts: pressing F11 will open the documentation (pdf).
- Keyboard shortcuts: pressing F12 will open playlists tracked folder.
- Keyboard shortcuts: pressing DEL will delete the highlighted playlist.
- Keyboard shortcuts: pressing 'º', '\' or 'Numpad /' will globally hide/show the playlist's metadata columns.
- Playlist formats: creation and last modified date values are now cached for UI-only playlists and AutoPlaylists. To be used along the new date sorting options.
- Playlist formats: UI-only playlists metadata (tag, category and tracks' tags) is now editable (and cached between sessions). This allows for sorting and categorization of UI-only playlists.
- ListenBrainz: playlists can now be exported to Spotify (when exporting to ListenBrainz). Requires Spotify's service to be connected to the user profile, and \'Play music on ListenBrainz\' [enabled](https://listenbrainz.org/profile/music-services/details/).
- Clone: added 'Clone as Smart Playlist' entry for AutoPlaylists and Smart Playlists. This allows to easily switch between formats or clone existing XSP playlists.
- Exporting Playlists: added a 'Copy playlist files to...' entry to the multiple playlist selection contextual menu.
- Exporting Playlists: added a 'Export and Copy Tracks to...' entry to the multiple playlist selection contextual menu.
### Changed
- ListenBrainz: YouTube searches are now cached (during the same session). i.e. matches are found much faster for tracks already searched.
- ListenBrainz: matches on library -for playlist creation- are now preferred by higher rating and not live tracks (if possible).
- ListenBrainz: optimizations finding tracks on library.
- ListenBrainz: key for the token is cached during the same session.
- ListenBrainz: user name is cached during same session.
- Merge load: when removing duplicates, tracks are now preferred by higher rating and not live.
- Exporting Playlists: when removing duplicates, tracks are now preferred by higher rating and not live.
- XSP: matches on library -for playlist creation- are now preferred by higher rating and not live tracks (if possible).
- XSPF: matches on library -for playlist creation- are now preferred by higher rating and not live tracks (if possible).
- XSPF: optimizations finding tracks on library.
- Playlist formats: creation and last modified date values are calculated when loading the playlist files, and cached during the entire session. Sorting by date is now much faster.
- Drag and Drop: sending tracks to blank space or list menu button (plus shape) will create a new playlist.
- UI: 'show size' option is now disabled by default. i.e. columns offer the same functionality now.
- UI: renamed some menu entries for playlist creation.
- UI: R. clicking now opens the contextual menu for the selected playlists (previously on L. Click). Shift + R. Clicking opens the playlist's items native contextual menu.
- UI: L. single click action is now configurable. 
- UI: 'Send selection to playlist' now creates a backup before editing the playlist file (to restore it in case it fails).
- UI: added presets to UI elements configuration menu. Fast settings to enable/disable search box and multiple buttons at the same time.
- UI: added presets to available menu entries configuration menu.
- UI: improved checks to ensure there is at least one UI element able to open the settings menu.
- UI: improved tooltip of power action button. Mouse shortcuts tips are always shown, including the settings menu by R. clicking.
- UI: added new entries to configurable playlist menus: File locks, UI playlist locks and Sorting.
- UI: now applies configurable playlist menus when using multiple selection.
- UI: clicking anywhere on scrollbar will move list up/down depending on relative position, up to the current mouse position (mimics Win behavior).
- UI: adjusted playing now / loaded playlist indicators and letters/numbers separators at right according to the scrollbar state. When it is enabled, those indicators are shifted a bit to the left. Alignment also changes according to the toolbar state (visible or minimized).
- Console: improved console logging for empty playlists (no longer reporting 0 items found).
- Console: improved error logging at multiple places.
- Documentation: updated readme PDF to be up to date with all latest changes.
- Documentation: added a quick help summary at the help button (by pressing shift).
- Dynamic menus: delayed dynamic menus initialization some seconds after panel is loaded (to avoid foobar2000 hiccups due to SMP bad behavior).
- Dynamic menus: retried 5 secs after first try in case it fails or gets blocked.
### Removed
### Fixed
- UI: category filter is no longer set on first init in case panel is installed to track UI-only playlists and/or old playlists files with category set.
- UI: weird behaviors (cursor changing and buttons being focused) when pressing shift/ctrl after opening a menu and clicking outside the panel.
- UI: settings menu opening when clicking at blank space within the buttons toolbar at header instead of just the settings and power action buttons.
- UI: incorrect settings for panel/buttons colors using dark mode in foobar2000.
- UI: list view not maintaining current position at some instances. 'Online sync...'.
- UI: focus was lost in some cases when editing an UI-only playlist.
- UI: scrollbar not working properly when list exceeded current window size by one row.
- UI: scrollbar not hiding in some cases.
- UI: multiple minor fixes to menu entry checks (the tick shown if setting is enabled).
- UI: loaded and playing now indicators not working for AutoPlaylists.
- Quick-search: no longer works when the mouse is not over the panel.
- Export: export to JSON not working for AutoPlaylists in some cases.
- AutoTags: fix 'bAutoLoad' improper loading in some cases.
- Error while saving a playlist which was the first one on UI.

## [0.5.0-beta.20] - 2023-05-16
### Added
### Changed
- ListenBrainz: network errors when caching library paths (usually at startup) are not reported anymore (since they don't give useful info on real use-cases).
### Removed
### Fixed

## [0.5.0-beta.19] - 2023-05-08
### Added
- Search: search toolbar to filter the current view according to the input. Supports case insensitive matching by playlist name, tag, category or tracks' file or folder names (this one disabled by default). Works pretty similar to the search filters found on Library Tree or the album viewer (except no query support). Enabling the path searching allows to easily find tracks within playlists (both loaded and non loaded ones). Path level is configurable. There is also an additional setting to parse RegExp expressions (which allow more advanced searches).
- XSP: 'datemodified', 'dateadded', 'datenew', 'noofchannels', 'samplerate', 'musicbitrate', 'time', 'origyear' and 'bpm' support. This covers all tags on the [specs](https://github.com/xbmc/xbmc/blob/master/xbmc/playlists/SmartPlayList.cpp), except 'source' tag which has no correspondence in foobar2000.
- ListenBrainz: on first init, panel will try to retrieve user token from other panels (like [ListenBrainz-SMP](https://github.com/regorxxx/ListenBrainz-SMP)).
- ListenBrainz: new menu entry to retrieve user token on demand from other panels (like [ListenBrainz-SMP](https://github.com/regorxxx/ListenBrainz-SMP)).
- ListenBrainz: new option to look for not found tracks on library at YouTube when retrieving playlists from ListenBrainz. Requires 'foo_youtube' component installed. When links are loaded, the entire process is asynchronous and playlist filling may take some seconds. Track order is ensured in the process (contrary to other scripts relying on foobar path loading).
- Backup: in case a playlist backup file is found on startup, panel asks to restore it. This usually happens if the panel crashes while editing a playlist file.
- Package: new installation method as package.
### Changed
- ListenBrainz: improvements to error handling and reports given to user.
- ListenBrainz: playlist MBID is now cached on import menu entry (during same session).
- ListenBrainz: .xspf playlists now save user-name at 'creator' tag, user's web page at 'info' tag, playlist's web page at 'location' tag and description metadata.
- ListenBrainz: .m3u8 playlists now save user-name at 'author' tag and description metadata.
- ListenBrainz: panel is now blocked with an animation while retrieving playlists.
- Playlist formats: all playlists created by the manager will now have 'author' metadata present and set to 'Playlist-Manager-SMP'.
- UI: revamp of UI, moving list and header menus to buttons at the header along a more modern look. Header actions (and tooltip info) are now available at the bolt button.
- UI: up/down buttons are replaced by a smart scroll bar which is automatically hidden when the mouse is not over. Double clicking on the bar will jump to the active/playing playlist. Double clicking on the up/down bar buttons will jump to the top/bottom of the list.
- UI: -by default- up/down buttons are now only shown while drag n' dropping to easily scroll the list.
- UI: main UI elements can now be enabled/disabled via the settings menu. i.e. it's possible to revert all new UI additions by disabling them, showing only a header with the tracked folder.
- Playlist locks: locks are now easily switched in a submenu list, showing action descriptions, instead of using popups. It will also state when the lock is applied by other components.
- Drag and Drop: tracks can now be dropped to the search toolbar to parse their filenames for filtering (when file/folder searching is enabled). This is equivalent to the 'Find current selection...' menu entry, but direclty filtering the current view (instead of showing a report popup).
- Menus: restore feature also supports playlists closed outside the panel (i.e. UI-only playlists even if they are not tracked). Name also shows if it's assigned to a file or UI.
- Playlist loading: some minor optimizations.
- Console: multiple improvements when logging to file for FbMetadbHandle, FbMetadbHandleList, Error and unknown instances (totally irrelevant except for debug purposes).
- Documentation: updated readme PDF to be up to date with all latest changes. Added all XSP -> foobar2000 tag equivalences.
- Console: menu entries are no longer logged to console after clicking.
- Helpers: updated helpers.
### Removed
### Fixed
- Renaming: auto-renaming of playlist tracked on manager if renaming was done within playlists tabs not working on some cases (still only possible for active playlist).
- AutoPlaylists: 'Reload playlist (overwrite)' was not working properly, creating a duplicated playlist instead of overwriting the existing one.
- ListenBrainz: crash due to renamed 'contentResolver' function call.
- ListenBrainz: workaround for windows caching of server requests (so sometimes playlists were not updated with changes on real time).
- ListenBrainz: relative paths not being used -if configured to do so- when importing playlists from ListenBrainz.
- Clone: relative paths not being used -if configured to do so- when cloning a playlist file.
- Clone: links being reported as non found when cloning a playlist file. Now they are silently omitted. Non found paths are still reported.
- UI: MBIDs filtering not being saved between sessions.
- UI: resetting all filters did not reset MBID filtering.
- UI: selected and highlighted playlist rectangles did not match in size (again).
- UI: crash when using 'UI\Set custom colours...\Reset all to default' menu entry.
- Links: multiple fixes to web links handling, specially for YouTube links (which should now properly use the 'fy+' scheme in all cases).
- Links: fix web links identification, using '\\' or '//' convention.
- Paths: multiple fixes to inconsistent path handling, specially for items with subsong indexes or links (at the playlist maintenance tools).
- Playlists maintenance tools: fixed relative path handling for 'Duplicated items...' tool when there were multiple relative levels.
- Playlists maintenance tools: fixed report for 'Absolute/relative paths...' tool; displaying always none even when results where found.
- Playlists maintenance tools: fixed report for 'Duplicated items...' tool; popup said 'dead items' instead of 'duplicated items'.
- XSP: sorting not properly saved on smart playlist creation.
- XSP: type ('songs') not properly set on smart playlist creation.

## [0.5.0-beta.18] - 2023-03-08
### Added
- UI: native contextual menu for items within loaded or UI-only playlists.
- UI: configurable playlist menus. Multiple entries may be hidden if not used, thus making it easier for users without more advanced needs.
### Changed
- UI: on first init, advanced features will be hidden by default.
- UI: focus is now set on new playlist after playlist creation.
### Removed
### Fixed
- Dynamic menus: not being created on init when the manager had no AutoPlaylists and AutoPlaylist size updating was enabled.
- Crash after deleting playlists using multiple selection actions, since the selection was not being reset.

## [0.5.0-beta.17] - 2023-03-04
### Added
### Changed
- UI: popup when cloning an AutoPlaylist now adds a tip to cancel, thus skipping playlist file creation.
- Auto-saving: renamed property, config will be reset on update (this doesn't affect to most users since this config is usually not touched).
- Documentation: updated readme PDF to be up to date with all changes.
- Internal code cleanup of menus.
### Removed
### Fixed
- Console: logging of null value not working properly (totally irrelevant except for debug purposes).

## [0.5.0-beta.16] - 2023-02-22
### Added
- UI: default fonts (buttons and tooltip) may now be changed at '[foobar profile]\js_data\presets\global\globFonts.json'.
### Changed
- UI: improved compatibility with some fonts under Unix systems (using Wine). Sometimes weird chars appeared on menu entries.
### Removed
### Fixed
- UI: header text did not respect the right margin when the tracked folder name was too long. Now the name is sliced to accommodate the available width after the extra info is taken into account. Example: "Playlists: My folder is too long..." is now displayed as "Playlists: My folder... (10 pls.)" or "My folder... (10 pls.)". If the text is too long, it will also respect the margin, not using the full panel width.
- Crash at multiple points when number of playlists shown was lower than available rows on panel (due to a UI change on [0.5.0-beta.13](#050-beta13---2023-02-15)).

## [0.5.0-beta.15] - 2023-02-19
### Added
- Merge load: when selecting multiple playlists, it's now possible to load them merged in a single playlist within UI. There is also an additional option to remove duplicates. It also works for UI-only playlists, i.e. selecting and merge-loading them will simply join them (but along the remove duplicates option, it may be used to merge playlists without duplicates in a really fast way).
### Changed
- UI: 'Clone playlists in UI' multiple selection option now also works for AutoPlaylists.
- UI: 'Clone playlist in UI' mouse shortcut now also works for AutoPlaylists.
### Removed
### Fixed

## [0.5.0-beta.14] - 2023-02-19
### Added
### Changed
- Helpers: updated helpers
### Removed
### Fixed

## [0.5.0-beta.13] - 2023-02-15
### Added
- Configuration: added user configurable files at '[FOOBAR PROFILE FOLDER]\js_data\presets\global' to edit default queries and tags for multiple tools. Usually used internally or on properties panel. Don't forget to reload the panels/restart foobar and restore defaults on all relevant buttons and menus to use the new values. For Playlist Manager, it's only used for the default values of Duplicates Removal feature, so only that sub-menu needs to be restored to defaults (not the entire panel).
- Drag and Drop: tracks can now be sent to a playlist directly with Drag and Drop, instead of using key shortcuts + mouse. Both move and copy (pressing Control) are allowed. Only tracks within foobar2000 context can be drop, trying to drop any other thing, track from outside or file is not allowed. Pressing 'Alt' on drop will create a new playlist instead of sending it to the selected playlist. To warn about this behavior, no playlist is highlighted while pressing the key (contrary to the usual drag and drop). List can be scrolled up or down by moving the mouse to the arrow buttons while dragging.
- ListenBrainz: playlist ListenBrainz integration may be added with an [user token](https://listenbrainz.org/profile/). Token encryption is allowed with a password.
- ListenBrainz: new options at L. Click menu, 'Online sync...', to export (create new/update) and import playlists from ListenBrainz. Exporting a playlist requires tracks to have 'MUSICBRAINZ_TRACKID' tags present; there is an additional option to perform MBIDs lookups on exporting when tags are missing.
- ListenBrainz: new options at L. Click menu, 'Online sync...', to get the URL of the playlist on ListenBrainz or directly open it on web.
- ListenBrainz: new options at R. Click menu to create a playlist from ListenBrainz importing by MBID.
- ListenBrainz: playlist importation may be done on any writable format, including '.xspf' format (which is essentially equivalent to '.jspf' format used internally by ListenBrainz). Saving to the latter format, allows content resolution -on load- on any library by artist, title or recording MBID and also store not found items on the playlist file. Using other formats will skip not found items on importing step.
- ListenBrainz: 'PLAYLIST_MBID' is now saved on playlist's metadata and displayed on tooltips if available. Meant to be used along ListenBrainz integration. Id is resolved to an online playlist at 'https://listenbrainz.org/playlist/(PLAYLIST_MBID)'.
- XSPF: identifier tag linked to 'MUSICBRAINZ_TRACKID' for content resolution.
- Tags: new auto-tag named 'bMultMenu' which associates tagged playlists to specific dynamic main menu entries which apply an action to a group of playlists.
- Tags: new auto-tag 'bSkipMenu' which makes the tagged playlist to be skipped on dynamic menu creation.
- Dynamic menus: new dynamic main menu entries which apply an action to a group of playlists tagged with 'bMultMenu'. These are meant to be associated to an standard Foobar2000 button (or CMD commands), to easily load or apply generic actions to a group of playlists at once.
- Dynamic Menus: menu warns about entries needing input via popups and those are skipped on the Online Controller actions.
- Dynamic menus: new 'Move selection to playlist' dynamic menu.
- Startup playlist: added new option at integration header menu to set the active playlist at panel startup, allowing to start Foobar2000 automatically with a given playlist. In case it's a playlist present on the manager but not loaded, it's required to set 'bAutoLoad' tag on playlist file to load it automatically on startup too. RegExp may be used too, returning the first match found.
- Playlist locks: UI lock status is now displayed on playlist tooltips, along the actions locked.
- UI: filter/sorting buttons are now fully configurable (background, colors, toolbar mode, ...).
- UI: show an icon related to the current filter state. For ex. the extension filter will show the associated playlist icon.
- UI: keyboard modifiers on L. Click now also allow 'Clone playlist in UI', 'Lock/unlock playlist file', 'Lock/unlock UI playlist' and 'Multiple selection' actions (along the previous ones).
- UI: added M. Click actions, configurable the same way than L. Click actions. Set by default to 'Multiple selection'.
- UI: added L. Click and M. Click actions on header, configurable the same way than the other actions. Set by default to 'Cycle categories' (previous behaviour) and 'Multiple selection (all)' (toggles selection for all playlists of current view).
- UI: added 'Multiple selection (range)' shortcut action, which emulates the usual Shift + Click action to select a range on files on explorer.
- UI: multiple playlist selection. Using any other mouse shortcut will apply the action to the entire selection, instead of a single playlist. Opening the playlist menu (L. Click) while using multiple selection, will display a different list of actions to apply to the entire selection.
- UI: new 'Move selection to playlist' shortcut action, which copies the track to the selected playlist and removes it from the source.
- UI: new 'Find current selection' menu entry, on R. Click, to find the selected tracks on the tracked playlists. A report is shown with category and playlist name.
- UI: new filter for playlist with(out) MBID (i.e. to filter playlist synced with ListenBrainz).
- UI: filter and sorting menu entries are now sorted.
- Track Auto-tagging: added new JS functions to retrieve properties from playlist: ('JS:' +) playlistName, playlistCategory, playlistTags and playlistMBID.
- Cache: new option on header's menu to stop library path caching until next startup. This allows to perform path changes to files without constantly having the panel processing the changes, when done, deactivate it to update. This action is shared across all playlist manager panels (i.e. activating it in one, will activate it in the others).
- Cache: whenever library paths cache is outdated, a warning is shown on the header and playlists' tooltips.
- Playlists maintenance tools: added tool to check for subsong items (usually files from ISO files, etc.). They are fully supported within by the manager, but it's not guaranteed to work on other software.
- Playlists maintenance tools: added tool to check for format specific errors (like XSP types not supported, wrong queries, etc.). The errors are shown on the report along the playlist name/path.
### Changed
- Exporting Playlists: entry to copy playlist file will now ask to overwrite it, in case such file already exists, instead of failing.
- Playlists maintenance tools: playlist consistency tools renamed to playlists maintenance tools.
- Playlists maintenance tools: list is now filtered with the results found -if any- (in addition the popup showing the report). Makes much easier to work with the problematic playlists, not having to manually search them. Output also honors the current filtering configuration, so in case only M3U playlists are shown, the output will only show results being M3U (the report will list all results though).
- Quick-search: added new settings for its behavior when a key is pressed multiple times and also to allow cycling between results.
- XSP: 'playcount' XSP tag now gets translated into '$max(%PLAY_COUNT%,%LASTFM_PLAY_COUNT%)' within foobar when 'foo_enhanced_playcount' is installed. This offers better support for scrobbles.
- XSP: 'lastplayed' XSP tag now gets translated into '%LAST_PLAYED_ENHANCED%' within foobar when 'foo_enhanced_playcount' is installed. This offers better support for scrobbles.
- XSP: 'virtualfolder' XSP tag now gets translated into '#PLAYLIST#' within foobar. It simply remaps the tag to behave like 'playlist' XSP tag.
- XSP: XSP playlists with a non compatible type now show a warning at tooltip, contextual menu and when trying to load/export them. Most other actions are disabled. Currently only 'songs' type is allowed.
- Track Auto-tagging: reworked entire feature to fine-tune overwriting or value addition behavior, in particular for JS functions. Empty values will now delete the tag, otherwise added to current tag by default. Check documentation for further details.
- Filter: category playlist filter on header menu now allows directly selecting a single value by pressing shift.
- Filter: tag playlist filter on header menu now allows directly selecting a single value by pressing shift.
- Filter: count for tags and category entries for filters on header menu.
- Cache: reworked path caching, now will process 100 items at the same time until all tracks are done instead of forcing an specific total startup time. Adjusted delays for Foobar 2000 2.0+ tag retrieval. It should lead to faster startups in both cases, specially for small libraries (< 70K tracks).
- Backup: asynchronous on script unloading (at shutdown for example) and playlist loading.
- UI: current view position will be maintained in most use-cases now (after updating a playlist, loading new files, manual refresh, ...) if possible.
- UI: buttons' colors are now set by default according to the inverse of the background color. The same applies when applying presets, or changing the toolbar style.
- UI: colours presets menu now show a check in case one of them is active.
- UI: keyboard modifiers on L. Click are now fully configurable using the header menu. See 'UI\Shortcuts...'. Playlist's tooltip will reflect the config too.
- UI: tooltip now also shows Double L. Click action when 'Show usage info on tooltips' is enabled. The same applies to Single M. Click action. Actions not set are hidden to not clutter the UI.
- UI: 'Send selection to playlist' renamed to 'Copy selection to playlist'. Reconfigure the shortcut on the menus before using.
- UI: 'Send selection to playlist' now creates an undo backup point before inserting the new tracks if the playlist is loaded on UI.
- UI: keyboard modifier on L. Click + Ctrl is now set by default to 'Copy selection to playlist'. Shift + L. Click to 'Load / show playlist'. i.e. they are swapped; this is done to be consistent with drag and drop modifiers, since Ctrl is associated to copy.
- UI: additional tips on 'edit sort' popup, and invalid sort expressions are now checked.
- UI: panel is now animated while performing asynchronous tasks on 'Playlist maintenance tools'.
- UI: panel is now animated while saving a playlist or loading new playlist files, this makes easier to check changes (without looking at the console). Skipped for UI-only playlists.
- UI: new config to lock the panel and animate it while checking AutoPlaylists on startup.
- UI: quick-search color is now inverted when no result is found.
- UI: initial popup and panel text (with empty tracked folder) now points more clearly to set the tracked folder as needed.
- UI: on first installation, in case another panel has the same tracked folder, a popup is thrown warning about setting another folder for the new panel.
- UI: loaded playlist indicator has been changed to '>>' which is adjusted better to different DPI settings.
- Dynamic menus: dynamic menus no longer skip UI-only playlists by default unless they are not shown in the manager. 'Copy and move selection' menu entries are the only ones allowed for these playlists in any case.
- Dynamic menus: the panel warns about other panels having the same name if the feature is enabled at startup or when enabling it. Panel flashes for some seconds while the popup is shown.
- XSP: errors loading Smart Playlists are now both output to console and popups, instead of just popups.
- XSPF: content resolution for identifier tag supports now both raw tags and 'https://musicbrainz.org/recording/('MUSICBRAINZ_TRACKID)' format. This is done for compatibility with [JSPF format from ListenBrainz](https://musicbrainz.org/doc/jspf).
- Tags: auto-tags are now displayed on the tag list (on set tag menu) ready to be used, instead of only displaying the present user set tags.
- Properties: additional checks to properties to ensure they don't get broken with manual edits.
- Remove duplicates: all uses of function changed to make use of '$year(%DATE%)' and '$ascii($lower($trim(%TITLE%))' instead of 'DATE' and 'TITLE'. This is a changed ported from Search by Distance, to ensure the most matches possible.
- Remove duplicates: advanced RegEx title matching option. For example, tracks like these would be considered to be duplicates: 'My track (live)', 'My track (acoustic)', 'My track (2022 remix)', ' My track [take 3]', ... but not those with keywords like 'part', 'pt.', 'act' or Roman numerals.
- Remove duplicates: advanced RegEx title matching option. Words with "-in'" and a list of verbs ending in "-in" are matched against "-ing" verbs to further refine the search. For ex. "walkin", "walkin'" and "walking" are all considered equivalent.
- Helpers: updated helpers.
- Minor performance improvement (usually on subsequent calls) caching all TitleFormat expressions.
### Removed
### Fixed
- Relative paths: broken playlists path when playlist folder contained special [RegExp chars](https://github.com/regorxxx/Playlist-Manager-SMP/issues/36). Now fixed, they are escaped properly internally.
- Auto-Saving: playlists were not auto-saved after a path cache reload -if needed- as intended.
- XSP: crash loading an Smart Playlist which tries to load another playlist with a query when it is not found.
- XSP: preventive fixes to Smart Playlists having empty rules, without operators or values.
- XSP: undefined sort order on files.
- XSP: playlists are no longer rewritten every time sort order is not set.
- XSP: duplicates were not removed on all use-cases (exporting, cloning, ...) when option was activated.
- XSPF: crash on some malformed playlists.
- Dynamic menus: dynamic menus were not being set properly in some cases due to a typo.
- Dynamic Menus: changed code logic to only create menus once after all init processes instead of multiple times. Should improve loading time by a few ms.
- Filter: '-inherit-' warning was shown on all tags on filter header menu, even for those not being shown. Cosmetic bug.
- UI: double clicking on header no longer shows the active/playing playlist while cycles between the categories. Now it checks when double clicking is performed to not fire the single click action too.
- UI: filter buttons will display 'Multiple...' instead of 'All' when multiple values have been selected via header menu, thus properly displaying the manager is currently being filtered when not cycling tag/categories.
- UI: panel will not consider a playlist bound to a playlist file when the playlist type does not match (i.e. AutoPlaylists to standard playlists and viceversa) for now playing and loaded indicators.
- UI: fix text on playlist type filter button. '&' being displayed as '_'.
- UI: adding new files with new tags did not updated properly the current view, showing by default the new tags too. Similar to past bug with categories.
- UI: after sending a track to a playlist(s), the UI was being repaint even if no changes were made (for ex. on duplicated track). Implies no change for final user.
- UI: tags entries were not properly shown with a check in the upper list of 'Set tag' submenu.
- UI: fix to quick-searching / show active playlist not jumping to playlist in some cases (also appeared at [0.5.0-beta.8] and before). Method has been rewritten from scratch and now puts the result on the middle of the window whenever it's possible resulting in a more natural behavior.
- UI: selected and highlighted playlist rectangles did not match in size, neither were properly adjusted to playlist name text in some cases.
- UI: size not being shown when playlist name was too long. Now the name is sliced to accommodate the available width after the size info is taken into account. Example: "My too long playlist..." is now displayed as "My too long pl... (100)".
- Auto-Saving: panel will not consider a playlist bound to a playlist file when the playlist type does not match (i.e. AutoPlaylists to standard playlists and vice-versa). Previously, it would ask to change the playlist format, which made no sense since no changes could be applied to those playlists.
- Track Auto-tagging: crash when applying Tracks AutoTags on init due to typo.
- Playlist formats: fixed some internal inconsistencies about multiple format files and actions available for them which did not translate into bugs reachable by regular users.
- Playlist formats: any missing metadata on playlists is now filled with default values on load for compatibility purpose on future updates, which avoid crashes due to missing variables.
- Online controllers integration: fixed some inconsistencies on ajquery-xxx export files.
- Online controllers integration: fixed crash when data file was not found.
- Track Auto-tagging: crash editing track auto-tags.
- Track Auto-tagging: not being applied on AutoPlaylists / Smart Playlists loading.
- Track Auto-tagging: JS functions being applied multiple times.
- Instances manager: crash on instances file deleted while panel is being reloaded.

## [0.5.0-beta.12] - 2022-08-22
### Added
- Playlist locks: new menu entry to lock/unlock playlists (L. Click menu). Allows fine-grained control of lock types. Note playlists locked by other components or main program can not be edited via SMP.
### Changed
- UI: minor improvements to word lists within popups in some instances. Now split in new lines after X elements.
- Helpers: updated helpers.
### Removed
### Fixed

## [0.5.0-beta.11] - 2022-08-21
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed
- UI: left click actions not working (playlists, buttons, etc). Present on [0.5.0-beta.10](#050-beta10---2022-08-12).
- Console: fixed console logging to file (lines were not being split properly).

## [0.5.0-beta.10] - 2022-08-12
### Added
### Changed
- Helpers: updated helpers.
- Helpers: switched all callbacks to [event listeners](https://github.com/regorxxx/Callbacks-Framework-SMP).
### Removed
### Fixed
- Workaround for some instances where the scripts would warn about some feature not being supported by the OS (due to an OS or SMP bug).

## [0.5.0-beta.9] - 2022-08-09
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed

## [0.5.0-beta.8] - 2022-08-05
### Added
- UI: configuration menu to show/hide playlist icons as a global switch.
- UI: configuration menu to edit icons per playlist type or status (lock, empty). Uses default one when an icon is not set in the menu. Also, setting an icon or background to null will disable it.
- Dynamic menus: new dynamic menus available with [SMP 1.6.1](https://github.com/TheQwertiest/foo_spider_monkey_panel/releases/tag/v1.6.1) which allow to execute panel actions via main menus and even associate them to a keyboard shortcut or toolbar buttons. There is no limit (the old method was limited to 10 entries), so it can be used independently to other panels. It also allows to control the manager via CMD. Current actions allowed: load, lock/unlock, delete or clone any playlist file. Sending selection to a playlist, creating new playlists (empty or from active playlist) and refresh the panel. Every manager panel has its own set of associated playlists, so every panel must have different panel names to work. Entries may be found at 'File\Spider Monkey Panel\Script Commands\\[Panel Name]\\...'.
- Online controllers integration: full integration with [foo_httpcontrol](https://hydrogenaud.io/index.php/topic,62218.0.html) has been added when using the preset [ajquery-xxx](https://github.com/regorxxx/ajquery-xxx). Any playlist manager can be used with the online controller, allowing to: load, lock/unlock, delete or clone any playlist file. Sending selection to a playlist, creating new playlists (empty or from active playlist) and refresh the panel. All available playlists are shown on the controller, along basic metadata. Multiple panels are allowed at the same time, showing playlists from all of them in an aggregated list. [foo_runcmd](https://foosion.foobar2000.org/components/?id=runcmd) and [foo_run_main](https://marc2k3.github.io/run-main/) are needed. It makes use of the new dynamic menus from [SMP 1.6.1](https://github.com/TheQwertiest/foo_spider_monkey_panel/releases/tag/v1.6.1) (only has been tested with foobar 1.6.11). Every manager panel has its own set of associated playlists, so every panel must have different panel name to work.
- Readmes: added new menu entry on header menu to open the documentation (PDF).
### Changed
- UI: themed buttons are replaced with manually drawn buttons when the first method fails (on Wine for ex.). Console will output: "window.CreateThemeManager('Button') failed, using experimental buttons" in such case.
- UI: enforced SMP version checking via popups.
- Helpers: temp files are now written at 'js_data\temp' instead of 'js_data'.
- Helpers: updated helpers.
- Readmes: rewritten readmes to avoid line wrapping wen showing them within popup for a cleaner presentation.
- Minor speed optimization on multiple tools/buttons using duplicates removal code.
### Removed
### Fixed
- UI: fix to quick-searching not jumping to found playlist was it was on last rows.
- UI: Cycling UI playlists was not working while pressing control on them. Introduced on [0.5.0-beta.4](#050-beta4---2022-04-27).
- UI: after adding a track to a playlist using the keyboard shortcuts, playlist did not restored position properly in some cases.
- UI: filter button showing 'undefined' for UI playlists.
- UI: crash due to themed buttons not being available on wine.
- Importing JSON: All filtering is reset after importing playlists to ensure all new are shown on the panel.
- XSP: values with '-', '+' or '<' were not recognized properly in queries. For ex. '#PLAYLIST# IS Chill Hip-Hop' was cut right after 'Hip'.
- Helpers: added additional checks for 32 bits systems to use 32 bits binaries for external tools. Should solve multiple issues on Wine when using 32 prefix.
- Panel crash due to a typo when font was missing.

## [0.5.0-beta.7] - 2022-05-24
### Added
### Changed
### Removed
### Fixed
- UI: panel was not being shown properly on startup, required manual resizing after foobar init to work as intended (or manually reloading the panel).
- UI: small repaint glitches while scrolling.

## [0.5.0-beta.6] - 2022-05-23
### Added
- Exporting Playlists: new config only accessible via the properties panel to disable the popup and explorer window on exporting.
- UI: added UI-only playlists color config on menus.
- UI: added new option to darken/lighten background of alternate rows on the list.
- UI: added presets to easily switch all the colors on the UI at the same time to pre-defined sets. Also added specific presets for Color Blindness (deuteranopia) and Grey Scale to improve accessibility, having special care with background / text contrast and playlist identification.
- UI: clicking on the icon at header now opens the playlists folder.
### Changed
- Categories: entry to set playlist category has been reworked as a sub-menu which now displays all existing categories to easily reuse them, along an option to set it to none or adding a new one (the previous method).
- Tags: entry to set playlist tags has been reworked as a sub-menu which now displays all existing tags to easily reuse them, along an option to set it to none or adding a new one (the previous method).
- UI: every playlist type now has an specific icon associated, so playlist should now be identifiable by tooltip text, color and/or icon. This is done to improve accessibility for color blind people.
- UI: selection rectangle default color is now set to blue.
- UI: cursor is changed to a loading icon while panel is being loaded or blocked.
- UI: minor UI size adjustments and resize improvements.
- Exporting Playlists: TF expression shown on window is now split in lines when required (instead of forcing a huge window).
- Helpers: updated helpers.
### Removed
### Fixed
- UI: small repaint glitches while scrolling.
- UI: extension filter button skipping 'All' while cycling.
- Crash when cloning playlist to UI.

## [0.5.0-beta.5] - 2022-05-04
### Added
- UI: pressing End or Home keys on the panel scrolls directly to the bottom or top.
- UI: pressing Av Pag or Re Pag keys on the panel scrolls entire pages down or up (instead of a few rows like using the wheel).
### Changed
- Backup: in case there is an error while setting tags, category, lock status, renaming, ... a backup of the original playlist before editing is restored to ensure no data is lost. (This is in addition to the regular backups)
### Removed
### Fixed
- Renaming: error while renaming with : and – chars.
- Renaming: error while renaming when name was different but sanitized path matched original one (for example when renaming "Playlist A xxx" to "Playlist A: xxx").
- Playlists consistency tools: error while checking for external items for tracks with subsong idx on the path.
- Playlists consistency tools: wrong logging text on blank lines checking.
- Playlists consistency tools: .xsp playlists not being correctly checked for duration or size mismatch.

## [0.5.0-beta.4] - 2022-04-27
### Added
### Changed
- AutoPlaylists: can now be exported and tracks converted directly without having to clone them as standard playlists first. It's equivalent to using 'Clone as standard playlist...' and then 'Export and Convert tracks to' on the copy -duplicates removal is also done if enabled-, although this method maintains the original name.
- XSP: can now be exported and tracks converted directly without having to clone them as standard playlists first. See previous comment.
- UI: disabled warnings about having duplicated names on UI-only playlists.
- UI: only one entry is shown for UI-only playlists with duplicated names (instead of multiple entries). The entry is linked to the first found playlist (by index) for all purposes (adding tracks, size, etc.). Double clicking on a UI-only playlist which has a name shared by multiple playlists now cycles through them.
- Console: removed non needed instances of logging related to UI-only playlists (like refreshing size).
- Existence of tracked folder drive is now checked on startup. A popup is shown if it is not found (for ex. a missing network drive).
### Removed
### Fixed
- UI: duplicated playlist popup now outputs the playlist names instead of the indexes.
- AutoPlaylists: duplicates removal was not being applied on cloning due to a typo on the code.
- XSP: fixed crash on playlist loading when there was a filter active on the manager.
- Exporting Playlists: fixed error in some cases where playlist file was not being written properly if there was already a file present with same name. I.e. exporting multiple times the same playlist -without deleting the file afterwards- did not overwrite the file properly leading in some cases to tracks being added multiple times. Bug has only been reproduced after the changes on AutoPlaylists and XSP playlists exporting though.

## [0.5.0-beta.3] - 2022-04-13
### Added
- Clone: new clone option as UI-only playlist, meant to load a playlist into the UI without bounding it to the original file. It's equivalent to previously locking a playlist file and then loading it, but this method skips setting the metadata first and ensures no changes are made in any case.
- UI: added new option to create an AutoPlaylist from currently active playlist (when it's also an AutoPlaylist). AutoPlaylist popup is automatically opened to make it easier to copy/paste the query and sort expressions.
### Changed
- Network: changed behavior of file recycling logic to check for network drives. Previously, when trying to delete a file on a network drive, a popup would appear asking to permanently delete the file. This is due to network drives not having a Recycle Bin by default on windows. In such case, now the file will be automatically deleted without popups. Deleted playlists list will also be disabled on the menus. As a warning, whenever the tracked playlist folder is set within a network drive, a popup will be shown with this info along hints to enable the Recycle Bin via a registry hack.
- UI: L. Click on header now also tries to highlight the playing playlist, if the active playlist is not present. It does nothing in any case if neither are not tracked by the manager.
- UI: filter buttons now cut the text if it's longer than the button width (for categories or tags).
- UI: extension filtering now skips non-present playlist extensions (so it only cycle among the ones found). Tooltip has also been reworked to show a cross on those not present.
- UI: minor menu changes.
- Export: modified the default export presets to use track's artist, album and title instead of filenames. Only the first artist is used for the folder name and now it also forces ASCII chars in the path to ensure max. compatibility. This change is made having in mind that now subsongs on playlists are allowed, so the converted tracks use sensible filename instead of repeating the filename of the original .iso file everytime ('my iso (1).flac', 'my iso (2).flac', ...). If updating from a previous release, restoring defaults in the appropriate submenu is required to see the changes.
- Helpers: improved sort and query expressions validity checks.
### Removed
- Console: non needed profiler logs for sorting/filtering.
### Fixed
- Renaming: error on playlist renaming when trying to rename a file with exotic chars. Now path is sanitized before renaming (so filename and playlist name may not match 100%).
- Skip duplicates: rare error when trying to add a non-duplicated track, marked as duplicated, needed a second try to actually add the track successfully.
- XSP: fixed sorting recognition in some cases, should now be pretty robust with RegEx.
- XSP: rewritten query analysis (foobar query to XSP query) to fix some problems with extra spaces, quotes, etc.
- Dead items: playlists with tracks pointing to subsongs (iso files) were incorrectly reported as dead items. Happened in multiple playlist consistency tools and exporting.
- Metadata inheritance: AutoPlaylists and Smart Playlists (.xsp) did not inherit metadata (tags, category) from current view when creating new playlists.
- AutoTags: 'bAutoLock' tag was not being applied to AutoPlaylists and Smart Playlists (.xsp) on creation when Auto-tagging was enabled.
- Console: removed non needed log warning about sorting direction not being available when a Smart Playlist (.xsp) playlist had no sort tag (since it's optional).
- Console: progress code in multiple tools have been fixed to display more accurately the percentage progress in the log.
- Helpers: rewritten sorting analysis to account for quotes not being needed at sorting for functions.
- Helpers: avoid file reading crashing in any case (even if it's locked by another process).
- Helpers: fixed query checking not working due to upper/lower case mixing in some cases, should now be pretty robust with RegEx.
- Helpers: fixed UI slowdowns when required font is not found (due to excessive console logging). Now a warning popup is shown and logging is only done once per session.
- Crash due to unknown key pressed while quick-searching.

## [0.5.0-beta.2] - 2022-03-02
### Added
- UI: added UI-only playlists to Playlist type and Extension filters. i.e. manager can be set to only show those playlists now using the filters.
- UI: playlist files are now automatically renamed when using foobar UI to rename a loaded playlist (only with no UUID option). This is an alternate method to using the manager itself to rename the playlist.
- Subsongs: subsongs are now allowed in M3U and XSPF playlist formats. i.e. tracks from an ISO file may be referenced within a playlist; when loaded it will load only the selected track instead of the entire ISO file (bypassing Foobar2000's playlist limitations). Obviously, these tracks will not load in other players (but they did fail previously anyway). XSPF is an exception to this rule, since compliant players should be able to use fuzzy matching. Playlist referencing ISO files must be re-saved after updating the scripts.
### Changed
- Backup: json playlist file is also included in the zip backup now (current one and .old file), to ensure not only physical playlists have a backup but also the virtual ones along their metadata (Autoplaylists, .fpl, etc.)
- UI: default custom background colour is now dark grey instead of pure black. Default custom text colour is now light grey instead of pure white (the non-custom version still uses the inverted b&w version of the background colour).
- UI: icons for the sorting button now change according to the sorting method (category, date, etc.).
- Tooltip: minor changes to shortcuts display.
- Helpers: updated helpers.
- General cleanup of code and json file formatting.
- Removed all code and compatibility checks for SMP <1.4.0.
- Added missing sanitizing path checks at presets path input and playlist folder input.
### Removed
### Fixed
- Backup: backup now only stores playlist files recognized by the manager. i.e. it omits any other file found on the tracked folder not matching the known formats. Previously, it would try to zip anything in that folder, which could lead to high processing times if the user had other files there not related at all with the manager.
- UI: 'Background colour mode' property had a spelling error. The fix will reset the panel background colour mode, reconfigure it to the desired mode via menus if needed.
- Helpers: file deletion failed when file was read-only.
- Helpers: file recycling has been overhauled to bypass Unix errors and shift pressing limitation (file was being deleted permanently). Now it tries 3 different methods, the last one requires an external executable and permissions may be asked by the SO.
- XSPF: track paths with '&' were not properly URI encoded and broke playlists, now manually replaced.
- XSPF: playlist metadata containing illegal characters like '&' broke playlists, now replaced with the proper HTML entities
- Auto-save: is now disabled while library paths cache is being refreshed. Tries to auto-save after that and ensures the playlist matches the one that needed to be updated.
- Popup: fixed position within panel.
- Playlist files whose extension was not in lowercase were not being recognized properly.
- Some exporting tools were not writing the playlist files to the right paths due to an error on path sanitizing logic.
- Manager kept reloading playlist files (auto-load) even if it was not needed when UI-only playlists were enabled. Now it works as intended, only re-loading them when there were file changes.
- Fixed rare crash when a playlist file was deleted while the panel was loading all playlists info. Only happened in extreme tests, probably not relevant on real world usage.

## [0.5.0-beta.1] - 2021-12-23
### Added
- Playlist formats: new option to also show UI-only playlists on the manager panel, to use it as a simple playlist organizer. UI-only playlists are non editable but they can be renamed, deleted or restored. Sending current selection to playlist is also allowed. They have its own custom color too. To be able to use all the other features of the manager, consider creating playlist files instead. At any point you may use 'Create new playlist from Active playlist...' to save UI-only playlists as a tracked file.
- Playlist formats: [.xsp format](https://kodi.wiki/view/Smart_playlists) full compatibility (read, edit and create). They are Smart Playlists which work on Kodi-like/XBMC systems, pretty similar to AutoPlaylists. Has been added a full layer of translations between XBMC-queries and Foobar-queries which allows conversion on the fly between both formats whenever it's possible. Some exceptions may apply, like most foobar TF functions not being available on .xsp format (check readme for more info). For all purposes Smart Playlists are treated like AutoPlaylists, being locked by default, having a query and sort, can be cloned as standard playlist or AutoPlaylist, etc. Metadata is also saved on the panel .json file, along AutoPlaylists and .fpl playlists metadata. Note queries checking for other playlists by name are also allowed (so it can use as source any playlist format read by the manager, even AutoPlaylists); this can be easily used as a way to merge different playlists as pools (the same it works on Kodi).
- Playlist formats: [.xspf format](https://en.wikipedia.org/wiki/XML_Shareable_Playlist_Format) full compatibility (read, edit and create). Follows [the complete specification](https://www.xspf.org/xspf-v1.html): items not found don't break playlist loading (it continues with next item). If  an item is not found at the set the path, it also tries to find matches on library by query using fuzzy matching according to the playlist metadata (Title + Artist + Album + Track number or a combination of those). By default, if lock flag is not set on file, it's loaded as a locked file.
- Playlist formats: added read-only support for .strm format. Since format only allows one URL per playlist, M3U formats are preferred to create new playlists for the same purpose (which can also be read by streaming players).
- Backup: new option to automatically backup the playlist files by interval, when unloading the script and just after loading a playlist file on UI (if auto-saving is enabled). Setting the interval to zero completely disables the feature on any case; to only backup on script unloading/playlist loading, set it to 'Infinity'.
- Quick-search: pressing any key while focus is on panel will scroll the list to the first playlist whose name matches the string typed (sorting by name), category (sorting by category), tag (sorting by tag) or size (sorting by size).
- UI: added warnings when multiple playlist share the same name on the tracked folder (configurable).
- UI: buttons' text color can now be customized via menus.
- UI: Header icon can now be customized according to category being shown with an extra json config file. Check readme for instructions ('Advanced tips').
- UI: new option to enable/disable header on selected playlist contextual menu. The header shows the playlist format and name.
- UI: popup within the panel while caching library paths. Interaction with the panel is disabled during the process. This is done to ensure the manager is blocked until it's ready to be used.
- UI: new sorting option by last modified date. Playlists without physical files associated are considered as 'more recent'.
- UI: new sorting option by first tag. Playlists without tags are considered as 'first'. Note it uses only the first tag of all the available tags for a given playlist, so order is relevant.
- AutoPlaylists: new option on contextual menu to export selected AutoPlaylist as json file (ready to be imported by other instances of the manager). Not backwards compatible with marc2003's panel. 
- AutoPlaylists: new option on list menu to export all AutoPlaylist (and optionally .fpl virtual files too) as json file at once (ready to be imported by other instances of the manager). Not backwards compatible with marc2003's panel.
- AutoPlaylists: new option on contextual menu to clone the selected AutoPlaylists as a standard playlist. i.e. automatizes the process of loading it, copying the track, pasting them into a new playlist and creating a new playlist file from it. At that point, the new exporting tools may be used.
- AutoPlaylists: new filtering option on header menu for AutoPlaylists on cloning process to remove duplicates according to some tag(s) or TF expression(s). By default is set to 'artist,date,title'. Automatizes the process of removing duplicates by tags after cloning using tools like those found on Playlist-Tools-SMP and automatically fixes one of their worst quirks (having multiple versions of the same tracks).
- Playlist Auto-tagging: expanding the tag feature, playlists may now be automatically tagged with 'bAutoLoad', 'bAutoLock' or a custom set of tags. The first two keywords are meant to be used along automatic actions.
- AutoTags: automatically applies some actions whenever a playlist is loaded on the panel (i.e. folder tracking) according to the tags present on it. 'bAutoLoad' makes the playlist to be loaded within foobar automatically. 'bAutoLock' locks the playlist as soon as it's loaded on the panel. Functionality can be switched on/off. This feature allows to automatically load playlists (either selectively or all) from the tracked folder into foobar without any user interaction (specially useful for servers and syncing).
- Track Auto-tagging: option to automatically add tag values to newly added tracks to a playlist. TF expressions (or %tags%), JavaScript functions (defined at 'helpers_xxx_utils.js') and strings/numbers can be assigned to tag(s). For ex, this would be an easy method to automatically tag as genre 'Rock' any track added to a 'Rock Playlist'. Obviously the use cases can be much more complex as soon as TF expressions or JavaScript is used. Values are appended to any existing tag value, it will not replace previous ones and will not add duplicates. It will also skip auto-tagging as soon as the same track was already at the playlist (thus not running multiple times for same tracks). Track Auto-tagging can be applied whether auto-save is enabled or not, as soon as a track is added. As result, it may be possible to apply it to native playlists by disabling auto-saving and creating a virtual copy of the playlist on the Playlist Manager (changes will never be saved to the physical file, but tracks will be auto-tagged anyway). Can be configured to apply it on standard playlists, locked ones and/or AutoPlaylists. Autoplaylists automatic track tagging is done asynchronously (if feature is enabled), thus having a minimum impact on loading time at startup.
- Relative Paths: new menu entry for playlists which allows to convert (force) all paths to relative paths, stripping all but filenames. i.e. the tracks are expected at the same Dir the playlist resides in. Meant to be used after tracks conversion, exporting, etc.
- Exporting Playlists: new menu entries for playlist exporting, allowing to just copy the playlist file, the playlist file along its tracks (thus converting the paths to relative paths too) or the playlist file plus the tracks converted using DSP presets. The latter option is configurable on the header menu at top 'Export and convert...'. Meant to be used for exporting playlists in one step, not having to edit playlists manually after converting files to match the new files... Can also be used as a 'one way sync' utility at servers, portable players, etc. Export and copy tracks can be configured to be executed asynchronously copy files, not blocking the UI (default behavior).
- Blank lines: new entry to check for blank lines on playlists, although they may be allowed in some formats, some players may behave incorrectly with such playlists (for ex. with .strm files)
- Duplicates: New tool to find duplicated items on playlists without loading them (R. Click, 'Check playlists consistency...' menu).
- Tooltip & Duplicates: While pressing shift over a playlist, apart from the tooltip hint, a warning will be given if the current selection is already present on the destination playlist (to avoid adding duplicates). Note Shift + L.Click is the action associated to sending current selection to a playlist file.
- Skip duplicates: new option to skip duplicates when adding selected items to a playlist. Checks both, if any of the new items is already on the playlist file and if the current selection contains duplicates. Console log shows when this happen without additional warnings or functionality changes (they are simply skipped). Configuration can be toggled at header menu. Only applies when sending selection directly to a playlist file (does not prevent adding duplicates via auto-save).
- Categories: double clicking on the header cycles through the categories shown one by one.
- Added tag filtering menu to only show playlists which contain selected tags. Tag filtering is always reset on startup, no matter what 'Save filtering between sessions' is set to. Use categories for 'virtual folders' or permanent playlist categorization, tags are meant only for informative purpose or auto-tag actions (thus not needing permanent filtering).
- Popup warnings when finding dead items sending selection to playlist (Shift + L. Click), creating a new playlist from active playlist, manually saving a playlist or auto-saving (configurable). Note checking on auto-saving is disabled by default since it may affect performance and also result on popups being thrown multiple times until dead items are fixed.
- Menus: new option on header menu to set intervals for auto-loading and auto-saving files (previously done only via properties).
- Menus: new entry to 'Clone AutoPlaylist and edit query'. Creates a clone of the selected AutoPlaylist and allows to edit the query afterwards; for easy AutoPlaylist creation using a generic query as base (instead of copying/pasting queries).
- Menus: new menu entry on selected playlist menu to clone current playlist as another format. Shortcut to easily convert playlists between different formats without using the exporting tools. Checks the paths on the process, so dead items are reported and skipped.
- Menus: new menu entry to edit limit of tracks output when loading playlist's query (currently only available for .xsp format).
- Helpers: added full script console logging to file at foobar profile folder ('console.log'). File is reset when reaching 5 MB. Logging is also sent to foobar2000's console (along other components logging)
- Tooltip: limit is shown for AutoPlaylists (infinite) and .xsp playlists (set by playlist file).
- Shortcut: L. Click on header highlights active playlist on manager if possible (an associated file exists).
### Changed
- Auto-saving: playlists are not immediately auto-saved after loading them, but only after a change is made. This is done caching the last playlists loaded until auto-saves fires for the first time later. This change makes unwanted format changing a bit more difficult, requiring explicit user interaction with the playlist to change it.
- Send selection: loaded playlists are not immediately auto-saved after sending selected tracks to it (menu or shortcut actions). This behavior follows previous comments about not needing to rewrite the playlist. Note sending the selection already edits the playlist file, so this skips the auto-saving step (since its also loaded in the UI) which could involve changing the playlist format.
- Edit query (.xsp only): query is now translated into an XBMC query after user input. Structure may change during the process (specially parenthesis and how things are grouped) and non recognized tags/expressions are skipped (those which have no XBMC counterpart). Please recheck query after edition on the tooltip to ensure it has been recognized properly. See readme for more usage info.
- Selected playlist menu: Renamed 'Open playlist folder' to 'Show playlist file' on explorer.
- Properties: added extensive checks to most properties.
- Remove duplicates: optimized the code, now runs at least x2 times faster. Updated all instances where the functions were being used to call the new version (currently on AutoPlaylist cloning).
- Playlist formats: new configuration to maintain original format on playlist saving. Disabled by default (i.e. it always tries to use the default format even if it means changing it), following previous behavior.
- Requisites: Script requires at minimum SMP 1.5.2. now.
- Playlists consistency tools: all are now executed asynchronously: Absolute/relative paths..., external items, dead items, duplicated items and playlist size mismatch.
- Workaround for SMP limits on automatic code-page detection for text files (playlists). If code-page is present in M3U files (#EXTENC:...), encoding is forced instead of using the detected code-page (which may be wrong). .m3u8 files are always considered as UTF-8 files. This should cover most UTF-8 problems (when BOM is not present) on M3U files. .pls format still relies on code-page detection.
- Relative Paths: Improved relative path support. Playlist folder may now be at a different level than the library folders as long as they share the same drive disk For ex. 'H:\_Playlists' and 'H:\Music\CDs'.
- Relative Paths: Loading playlists, checking items on library and finding dead items now evaluates relative paths whether they start with .\ or not. Playlists created with the manager always use '.\', but this improves compatibility with playlists created with other software or manually.
- Playlist Manager Path: Playlists folder may now be set too using full relative paths. i.e. not only something like '.\profile\playlist_manager\' but also something like '..\..\_Playlists\', in any case relative to foobar exe path. This may be used to load a playlist folder on same drive but not necessarily within the foobar installation, specially useful when the drive letter changes. Previously you were forced to use only relative nested paths within foobar main folder for that use-case.
- Cache: Paths from current library items are cached at script loading, it's done async and in iterative steps so it doesn't freeze the UI. It was done previously once, per panel, when loading the first playlist. The change should greatly speed up the loading of the first playlist since most of the work is already done at that step, thus being as fast as consecutive playlist loading before. The cache is shared between different panels, so it's only executed once even if there are multiple manager panels.
- AutoPlaylists: use of 'SORT BY', 'SORT DESCENDING BY' or 'SORT ASCENDING BY' at the end of the query is now allowed. Validity of those sort patterns is also checked (along query's validity), to minimize input typos. They should cover now 100% functionality of native Autoplaylists. (Note marc2003's manager did not check their validity, so it simply crashed if something was wrong on the query or failed silently). 
- Installation: Installation path may now be changed by editing 'folders.xxxName' variable at '.\helpers\helpers_xxx.js'. This is a workaround for some SMP limitations when working with relative paths and text files, images or dynamic file loading.
- Tooltip: Header tooltip now shows current filters applied and number of playlists / Autoplaylists. Note the header text always show the number of tracked playlists on the current folder, while the tooltip shows only those on the current view.
- Categories: Current category view is now saved only when 'Save filtering between sessions' is enabled, otherwise it will be reset to show 'All' on startup.
- AutoPlaylists: Autoplaylists size now gets updated asynchronously (if feature is enabled), thus having a minimum impact on loading time at startup.
- UI: Tweaked a bit the default colors to differentiate better every type of playlist, should look better by default now when changing the background to black too.
- UI: .xsp playlists can be set to have their own color.
- UI: popup warning if saving a playlist will involve changing the playlist format. This should avoid accidental changes. Configurable on header menu.
- UI: Minor UI adjustments to the header.
- UI: Tooltip shortcuts are updated as soon as the key modifiers are pressed, even if the the mouse has not been moved (tooltip is redrawn). That should make easier to see the action which would be applied without needing to move the mouse constantly to update the tooltip.
- UI: Header tooltip (with current filter view) is updated after double clicking, even if the the mouse has not been moved  (tooltip is redrawn). That should make easier to see the current category applied while cycling without needing to move the mouse constantly to update the tooltip.
- UI: current selection rectangle now has its width adjusted according to 'Show name/category separators', so it doesn't overlap with the letters at the right when enabled.
- UI: when opening the contextual menu for a playlist (L. Click) the selection rectangle will be shown until the menu gets closed. Previously it was cleared as soon as the menu was created or the mouse leave the panel. Opening menus for things not directly related to an specific playlist will maintain the previous behavior.
- UI: entire panel is repaint when moving the mouse over it instead of currently selected playlist only to ensure selection is always properly drawn even with extreme movements.
- UI: AutoPlaylists size now gets updated when loading them (since it's essentially performance free).
- UI: contextual menu for selected playlist can now be invoked on the entire selection rectangle (not only over the name).
- UI: selection rectangle drawing is skipped if color matches the background color.
- UI: sorting method configuration is now opened by R. Clicking directly on the sort button, following the same behavior thane the [new] filter configuration menus.
- UI: Smart Playlists are now identified as such in any text instance where they behave as AutoPlaylists, instead of using the generic 'AutoPlaylist' term for all. For ex. on tooltips warning the playlist can not be edited when trying to add a track. This is just a cosmetic change.
- UI: default text color is now set to black or white automatically according to background color, set to the inverse (once converted to B&W).
- UI: new playlists will now inherit category/tags of the current filtering state. i.e. if the current view is set to display a single category or group of tags, created playlists will also have them by default. Note playlist can only have one category so it only applies when the view is filtered by a single one, this limit does not apply to tags though (the view still requires to be filtered and excluding 'no tags').
- Instances manager: internal change, tracking of other Playlist Manager panels is now done with this new helper. Used to ensure proper cache sharing and forcing only one calculation per foobar instance (previous approach was not working as expected in all use-cases).
- Menus: reordered menu entries into sub-menus for more logical access: panel behavior, playlist behavior, UI, ...
- Menus: 'Copy playlist file to...' is now available for .fpl playlist too, since it's the only option which doesn't involve playlist editing.
- Menus: 'Bind active playlist to this file...' is now disabled for locked playlists (must unlock them first) and .fpl playlists (in any case).
- Helpers: Split 'helpers_xxx_playlists.js' into 2 files (new one is 'helpers_xxx_playlists_files.js').
- Helpers: updated. Whenever a folder needs to be created to save a new file, the entire tree is now created if needed. Previously it would fail as soon as any folder did not exist. This greatly speeds up setting panels since now the final folder does not need to exists at all to work, since it will be created on the fly.
- Helpers: additional checks at json loading on all scripts. Warnings via popup when a corrupted file is found.
- Helpers: improved query checks for compatibility with .xsp format.
- Tooltip: Pressing shit, control or both will show on the tooltip the action which will be performed on playlists. If usage info is enabled on tooltips, then only the current action associated to the keys will be shown while pressing them (so it becomes obvious which one is from the list); otherwise -disabled- nothing will be shown until a key is pressed.
- Tooltip: Adjusted max width to 600 px before splitting lines.
- When retrieving paths from M3U files, lines are trimmed (blank spaces). In other words, blank lines are simply skipped for any purpose. Other formats don't allow these "errors".
- Editing metadata on playlists not created by the manager no longer fails neither warns about requiring loading/saving to update the format; now the playlist header is automatically rewritten and then the new metadata added. This change allows to edit metadata for almost any format while not having to rewrite playlists to the currently default format (i.e. allowing .xspf playlists to remain in their format even if the default one is .m3u8).
- General speed improvements loading playlists, checking items on library and finding dead items.
- Added descriptions at top of most menus.
- Minor code cleanup.
- All json files are now saved as UTF-8 without BOM. All json files are now read as UTF-8 (forced).
### Removed
- UI: Removed Wingdings dependencies. Replaced with Font Awesome (already being in use at other places).
### Fixed
- Cache: added safechecks to library cache to ensure loaded item is the one pointed at the playlist. At some instances, after adding/removing library items without reloading the panel cache, some tracks could have been mixed up due to different index.
- Cache: now gets rebuilt whenever an item is added/removed to the library, not only at startup. This is in addition to the previous check (to automatically solve it). Cache is shared between multiple panels (so it's only calculated once per Foobar2000 instance).
- Bind active playlist to file: when canceling the popup that appears trying to bind the active playlist to a playlist file with a non-default format, playlist file binding was properly aborted (no file changes) but the active playlist was already renamed. Now aborting also reverts the renaming, renaming it again back to the original name. This 'fix' also applies in any case where the playlist saving fails or is aborted.
- Auto-saving & Auto-update: changing the properties via menus or properties panel could lead to values being formatted as strings instead of numbers, now disallowed at input (menus) and loading (value checking).
- Auto-saving: playlists were not being auto-saved when current filter view did not show them on the panel. Now updates them in any case (as it should have been from the start).
- Categories: adding or removing playlists updates the category filter accordingly. i.e. when adding a new playlist with a new category, it doesn't get filtered but added to the current view, no matter what the current filtering is. Previously the new playlist would be hidden by default, since the category filter did only showed currently selected categories. The same when removing the last playlist within a category.
- Categories: due to a copy/paste typo, the menu to filter categories only worked when using custom background colors on the panel.
- Menus: crash when selected playlist index was out of bounds on L. Click menu creation due to menu being created 100 ms later than clicking. If the mouse was moved really fast out of the list within that 100 ms delay, the selected playlist was considered null (crash). It would also change the playlist to which the menu applied if the mouse was moved to another playlist really fast (bug). Fixed both cases now, forcing the playlist index at the exact moment the L. Click was done (on button up).
- Menus: send selection to playlist entry has now appropriate flags to be disabled when there is no selection, it's an Autoplaylist, the playlist is locked or it's an .fpl playlist.
- Menus: using the menus to rename .pls playlist was failing due to a back coded check even if the playlist was properly renamed.
- Menus: Force relative paths menu entry is now disabled when playlist is locked.
- Fonts: missing font due to a typo (wingdings 2 -> Wingdings 2).
- Properties: fixed some instances where unused old properties were not being deleted due to property checking firing when setting them to null.
- Playlist Manager Path: checks if user set path has a '\' at the end, and adds it if missing (otherwise playlists are not saved into the folder but using the folder name as prefix!).
- Playlist Manager Path: fixed auto-saving problems when playlists folder were set using something like '.\profile\playlist_manager\' (the path was not being evaluated).
- Playlists paths: filenames are sanitized before saving playlists to file, replacing illegal chars. Note that filenames and playlists names can be different, so the original name -non-sanitized- is still used as playlist name.
- Playlists names: loading playlists from files now correctly retrieve ':' char on all text values (name, tags, categories, ...).
- Importing JSON: solved error when importing Autoplaylists from marc2003's manager and the Autoplaylists used 'SORT BY', 'SORT DESCENDING BY' or 'SORT ASCENDING BY' within the query at query check step. They should be now 100% compatible, while still checking validity of those sort patterns (note marc2003's manager did not check their validity, so it simply crashed if something was wrong on the query).
- Importing Json: now skips playlists at importing whenever they don't have a query or are not Autoplaylists. Feature was added at a time where the only playlists items on json where Autoplaylist (so importing from marc2003's panel worked fine), now that .fpl playlists also have a virtual counterpart, additional checks must be done. Should also serve as sanity check for manually created Autoplaylist json files.
- Tooltip: when trying to send selection to a playlist and there is no selection, it's an Autoplaylist, the playlist is locked or it's an .fpl playlist, a warning is shown to note it's not possible to do so.
- Shortcut: send selection (Shift + L. Click) is disabled when it's an Autoplaylist, the playlist is locked or it's an .fpl playlist; instead of simply failing.
- UUID: UUID was not assigned properly on AutoPlaylist creation if option was enabled (thus not allowing multiple playlists with same name).
- UUID: solved all instances where full name was not properly retrieved from Name + UUID strings, no matter if the option was enabled or not by using Regex to replace any possible UUID. This happened when UUID was enabled and trying to create new playlist from active playlist, i.e. the suggested name was not the full name.
- UI: fixed some instances where the list was not properly painted when filtering if current view position was not at the beginning of the list.
- UI: fixed some inconsistencies on menu entry names.
- UI: header tooltip wrongly showed statistics of all tracked playlist instead of the current view (after filtering).
- UI: names on playlist list now are truncated a few px before the category letters separators and playing/loaded indicators so they don't overlap anymore.
- UI: crash when setting custom font size.
- UI: When a playlist of current view had no category, next category letter was not being shown on the letter separators. i.e. Jumping from none (-) to B, skipping A, when there were playlists with categories starting with A, B and some without categories. Long time UI only bug since first releases. Only happened for the category sorting view; when sorting by name, playlist always have a name by design, so first item header was never 'empty' and thus the next one was always shown fine.
- UI: bug with uppercase playlist names not being correctly identified when mixed along lowercase names (spanning of the same separator multiple times).
- UI: cosmetic fix. Fixed 'AutoPlaylists' being written as 'Autoplaylists' on some instances.
- UI: fixed some instances where the current position on the list view got reset after updating a playlist file.
- UI: selection indicator is now only displayed if the mouse is over the panel. It was shown on some instances when updating the current view, while trying to remember the last selected item to maintain the current index.
- UI: fixed some instances where the currently playlist playlist was incorrectly displayed (with playback stopped).
- Cache: fixed report about cache not being up to date on panels set to use relative paths.
- Code-page: improved code-page detection for any XML-based format, in particular for .xsp and .xspf, no matter how encoding is set on the header.
- Dead items: the menu entry to find dead items on playlists now skips streams (http or https).
- While reading Playlist files, they are now split by lines using any of the possible [escape sequence combinations](https://en.wikipedia.org/wiki/Newline) and not only windows ones (\r\n). This should allow to correctly read any playlist file created in any SO (no longer limited to Windows ecosystem).
- Playlist with special characters did not properly update the playlist path at some instances (the chars were not being stripped until manual refresh).
- Crash when deleting an AutoPlaylist right after loading it if Track Tagging was enabled due to callback delays.
- Bug on first playlist not being properly updated at some points (at least on manual update) due to a bad coded check for index !== 0.
- Adding current selection to a playlist file when it's loaded and it's also the current playlist no longer reinserts tracks, thus duplicating them.
- Adding a new playlist while current filter view doesn't show it will now update the playlist file right (similar bug to the 'auto-save' one).
- Checking if all items on a playlist are in the library now works as expected when some items -file paths- are duplicated.
- Restore menu list not working when deleting playlists.
- Fixed crash when trying to load a playlist with non present items and 'omit not found' was enabled (for ex. exporting features).
- Crash after manual refreshing a playlist with less items than the number of rows.
- Rare crash when using manual refresh while the mouse was over a playlist file deleted outside the panel.
- Rare error when trying to create a playlist without a name, the name used was the filename + extension instead of only the filename. Only happened when trying to clone a playlist without UUID but UUIDs were enabled.
- Multiple minor improvements and fixes on path handling for portable installations.
- Multiple minor improvements and fixes when saving files on non existing folder.

## [0.4.1] - 2021-06-15
### Added
- Integration: Listeners to share tracked playlist path with other panels (use 'window.NotifyOthers('Playlist manager: playlistPath', null)'). Used on [Playlist-Tools-SMP](https://github.com/regorxxx/Playlist-Tools-SMP) to use tracked playlist files as source for pools. i.e. Playlist A would match first a playlist within foobar with same name, then a playlist file with matching '#PLAYLIST:Playlist A' tag and finally any playlist file named 'Playlist A.m3u8'. Autoplaylists are excluded (use queries instead) and fpl files too. This feature allows to use virtual playlists as containers, where you can easily collect tracks (since Playlist Manager allows to send tracks directly to a file without loading it) to be used later on pools without polluting the UI with tons of dummy playlists.
- Colors: added menu option to change standard text color, switch between CUI\DUI color or custom one.
### Changed
- Portable: when properties are set for the first time, now use relative paths on profile folder for portable installations (>= 1.6).
- Integration: Moved some functions to 'playlist_manager_helpers.js' to easily integrate others scripts with the playlists objects.
- Data: json file for playlists is now formatted to be readable.
- Colors: background color menu moved to 'Set custom color...' sub-menu. Now all color options reside in the same sub-menu.
- Buttons framework: skip icon drawing if font is not found.
- Buttons: added icons to all buttons.
- Helpers: warn about missing font on console if trying to load a font and it is not found.
### Removed
### Fixed
- Colors: panel did not repaint with default color values in some cases after using 'Reset all to default' entry.
- Avoid 2 possible crashes when playlist json files get corrupted. Warns about it with a popup (to restore a backup).

## [0.4.0] - 2021-06-07
### Added
### Changed
- Helpers: Moved all SMP scripts without UI (those not meant to be loaded directly on panels) to 'main'.
- Helpers: Split 'helpers_xxx.js' file into multiple ones for easier future maintenance.
### Removed
### Fixed

## [0.3.1] - 2021-05-28
### Added
- Menu: entry on header menu to reset all categories shown.
### Changed
- Menu framework: updated.
### Removed
### Fixed
- Changing extension to .pls did not update the UUID to "nothing".

## [0.3.0] - 2021-05-26
### Added
- Menu: tool to check for size mismatch. Compares # paths against size tag on files for .m3u8, .m3u or .pls. Also reports playlist files without those tags.
- Menu: New header menu invoked with R. Click at the top of the panel.
- Menu: Show/hide shortcuts info on tooltips.
- Filter: Playlist may now be filtered by category, multiple selection allowed in a menu.
- Filter: If lists are being filtered by category, an indicator is shown in the header text.
- Tooltip: Tooltip for header with complete path, current category filter and shortcuts info.
- Tooltip: Tooltip for playlists with shortcuts info.
- Shortcut: Shift + Click sends current selection directly to playlist file (without needing to load it first).
### Changed
- Shortcut: Shift + Ctrl + Click deletes selected playlist. (previously it was assigned to Shift).
- Menu: Config menus (R. Click) moved to header menus. For consistency now all contextual menus related to the playlists are invoked within the list, and the rest at the top.
- Menu framework: updated.
### Removed
### Fixed
- Deleting a playlist while pressing shift no longer deletes it without sending the file to the recycle bin (for later restoring). It matches menu behavior now.
- Selection indicator not being removed when moving mouse from list to header.
- Library paths not being cached when 'loading a playlist by comparing paths' fails.

## [0.2.2] - 2021-05-19
### Added
- Portable: Additional checks for portable installations.
- Relative Paths: playlists can now be saved with paths relative to the playlist folder.
- Menu: entry to change playlist extension.
- Menu: entry to relative/abs path config.
- Menu: different tools to check for errors (absolute/relative paths mixing, dead items on playlist files, etc.)
- Fpl playlist data (like tags, size or category) is now saved between sessions (removing some of the intrinsic limitations of the closed format).
- Multiple info popups at some points when working with fpl and pls playlists for the first time.
### Changed
- Helpers: Playlist loading is done using cache for both absolute and relative path playlists, independently  of configuration (for saving).
- Using pls format disables UUIDs menu and forces UUID refresh to none for consistency.
- Using pls format disables some menus for editing data (pls format doesn't allow extra comments).
- Changed the background text when filtering the lists and # items was 0. (previously it showed the default text).
- Playlist loading should be much faster after the first time all libray paths have been cached, since that was the main culprit of loading time (+1 sec for 70k tracks).
### Removed
### Fixed
- All data arrays get updated on playlist saving/editing (previously only displayed data was updated, leading to some display bugs).
- Multiple bugfixes for fpl and pls file edits. 

## [0.2.1] - 2021-05-05
### Added
- Menu framework: 'playlist_manager_menu.js' contains now the lbtn contextual menus.
- Shift + Left button: deletes playlist (same than menu entry).
### Changed
- Some code cleaning.
### Removed
### Fixed
- Json importing was not working for files created by the panel.
- Json was not updated when removing the last autoplaylist. Now gets updated even if that means writing an empty file.
- Crash while painting if there was only 1 item and using sorting + separators.

## [0.2.0] - 2021-05-04
### Added
- Menu framework: 'playlist_manager_menu.js' contains now the rbtn contextual menus.
- Menu framework: 'menu_xxx.js' added.
- Check while painting to avoid situations where the code fails but doesn't crash.
- Changing UUID option now updates all already created playlists (both files and associated playlists within foobar), not only new ones.
### Changed
- Buttons framework: icon bugfix.
- Menu framework: Converted all menus (instead of methods by index).
### Removed
### Fixed
- When removing playlist from the bottom of the list. The panel had a silent bug while repainting and showed a weird behaviour without crashing. Fixed the source of the problem.
- Bug on "sort by..." menu.

## [0.1.0] - 2021-05-02
### Added
- First beta release.
### Changed
### Removed
### Fixed

[Unreleased]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v1.0.0-beta.4...HEAD
[1.0.0-beta.4]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v1.0.0-beta.3...v1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v1.0.0-beta.2...v1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.19.0...v1.0.0-beta.1
[0.19.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.18.1...v0.19.0
[0.18.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.18.0...v0.18.1
[0.18.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.16.1...v0.17.0
[0.16.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.16.0...v0.16.1
[0.16.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.14.1...v0.15.0
[0.14.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.14.0...v0.14.1
[0.14.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.12.1...v0.13.0
[0.12.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.6.3...v0.7.0
[0.6.3]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.6.2...v0.6.3
[0.6.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.3...v0.6.0
[0.5.3]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.25...v0.5.0
[0.5.0-beta.25]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.24...v0.5.0-beta.25
[0.5.0-beta.24]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.23...v0.5.0-beta.24
[0.5.0-beta.23]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.22...v0.5.0-beta.23
[0.5.0-beta.22]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.21...v0.5.0-beta.22
[0.5.0-beta.21]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.20...v0.5.0-beta.21
[0.5.0-beta.20]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.19...v0.5.0-beta.20
[0.5.0-beta.19]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.18...v0.5.0-beta.19
[0.5.0-beta.18]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.17...v0.5.0-beta.18
[0.5.0-beta.17]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.16...v0.5.0-beta.17
[0.5.0-beta.16]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.15...v0.5.0-beta.16
[0.5.0-beta.15]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.14...v0.5.0-beta.15
[0.5.0-beta.14]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.13...v0.5.0-beta.14
[0.5.0-beta.13]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.12...v0.5.0-beta.13
[0.5.0-beta.12]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.11...v0.5.0-beta.12
[0.5.0-beta.11]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.10...v0.5.0-beta.11
[0.5.0-beta.10]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.9...v0.5.0-beta.10
[0.5.0-beta.9]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.8...v0.5.0-beta.9
[0.5.0-beta.8]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.7...v0.5.0-beta.8
[0.5.0-beta.7]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.6...v0.5.0-beta.7
[0.5.0-beta.6]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.5...v0.5.0-beta.6
[0.5.0-beta.5]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.4...v0.5.0-beta.5
[0.5.0-beta.4]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.3...v0.5.0-beta.4
[0.5.0-beta.3]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.2...v0.5.0-beta.3
[0.5.0-beta.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0-beta.1...v0.5.0-beta.2
[0.5.0-beta.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.4.1...v0.5.0-beta.1
[0.4.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/623c80a...v0.1.07