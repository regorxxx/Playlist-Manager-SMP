# Changelog

## [Table of Contents]
- [Unreleased](#unreleased)
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
- Clone: new clone option as UI-only playlist, meant to load a playlist into the UI without bounding it to the original file. It's equivalent to previously locking a playlist file and then loading it, but this method skips setting the metadata first and ensures no changes are made in any case.
- UI: added new option to create an AutoPlaylist from currently active playlist (when it's also an AutoPlaylist). AutoPlaylist popup is automatically opened to make it easier to copy/paste the query and sort expressions.
### Changed
- UI: L. Click on header now also tries to highlight the playing playlist, if the active playlist is not present. It does nothing in any case if neither are not tracked by the manager.
- UI: filter buttons now cut the text if it's longer than the button width (for categories or tags).
- UI: minor menu changes.
- Export: modified the default export presets to use track's artist, album and title instead of filenames. Only the first artist is used for the folder name and now it also forces ASCII chars in the path to ensure max. compatibility. This change is made having in mind that now subsongs on playlists are allowed, so the converted tracks use sensible filename instead of repeating the filename of the original .iso file everytime ('my iso (1).flac', 'my iso (2).flac', ...). If updating from a previous release, restoring defaults in the appropriate submenu is required to see the changes.
- Helpers: improved sort and query expressions validity checks.
### Removed
- Logging: non needed profiler logs for sorting/filtering.
### Fixed
- Helpers: avoid file reading crashing in any case (even if it's locked by another process).
- Helpers: fixed query checking not working due to upper/lower case mixing in some cases, should now be pretty robust with RegEx.
- XSP: fixed sorting recognition in some cases, should now be pretty robust with RegEx.
- Dead items: playlists with tracks pointing to subsongs (iso files) were incorrectly reported as dead items. Happened in multiple playlist consistency tools and exporting.
- Metadata inheritance: AutoPlaylists and Smart Playlists (.xsp) did not inherit metadata (tags, category) from current view when creating new playlists.
- Auto-Functions: 'bAutoLock' tag was not being applied to AutoPlaylists and Smart Playlists (.xsp) on creation when Auto-tagging was enabled.
- Logging: removed non needed log warning about sorting direction not being available when a Smart Playlist (.xsp) playlist had no sort tag (since it's optional).
- Logging: Progress code in multiple tools have been fixed to display more accurately the percentage progress in the log.


## [0.5.0-beta.2] - 2021-03-02
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
- Playlist Auto-tagging: expanding the tag feature, playlists may now be automatically tagged with 'bAutoLoad', 'bAutoLock' or a custom set of tags. The first two keywords are meant to be used along Auto-Functions.
- Auto-Functions: automatically applies some actions whenever a playlist is loaded on the panel (i.e. folder tracking) according to the tags present on it. 'bAutoLoad' makes the playlist to be loaded within foobar automatically. 'bAutoLock' locks the playlist as soon as it's loaded on the panel. Functionality can be switched on/off. This feature allows to automatically load playlists (either selectively or all) from the tracked folder into foobar without any user interaction (specially useful for servers and syncing).
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
- UI: Auto-Playlists size now gets updated when loading them (since it's essentially performance free).
- UI: contextual menu for selected playlist can now be invoked on the entire selection rectangle (not only over the name).
- UI: selection rectangle drawing is skipped if color matches the background color.
- UI: sorting method configuration is now opened by R. Clicking directly on the sort button, following the same behavior thane the [new] filter configuration menus.
- UI: Smart Playlists are now identified as such in any text instance where they behave as AutoPlaylists, instead of using the generic 'AutoPlaylist' term for all. For ex. on tooltips warning the playlist can not be edited when trying to add a track. This is just a cosmetic change.
- UI: default text color is now set to black or white automatically according to background color, set to the inverse (once converted to B&W).
- UI: new playlists will now inherit category/tags of the current filtering state. i.e. if the current view is set to display a single category or group of tags, created playlists will also have them by default. Note playlist can only have one category so it only applies when the view is filtered by a single one, this limit does not apply to tags though (the view still requires to be filtered and excluding 'no tags').
- Instances manager: internal change, tracking of other Playlist Manager panels is now done with this new helper. Used to ensure proper cache sharing and forcing only one calculation per foobar instance (previous approach was not working as expected in all use-cases).
- Menus: Reordered menu entries into sub-menus for more logical access: panel behavior, playlist behavior, UI, ...
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
- Autosave & Autoupdate: changing the properties via menus or properties panel could lead to values being formatted as strings instead of numbers, now disallowed at input (menus) and loading (value checking).
- Autosave: playlists were not being auto-saved when current filter view did not show them on the panel. Now updates them in any case (as it should have been from the start).
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

[Unreleased]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/0.5.0-beta.2...HEAD
[0.5.0-beta.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/0.5.0-beta.1...0.5.0-beta.2
[0.5.0-beta.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.4.1...0.5.0-beta.1
[0.4.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/623c80a...v0.1.0
