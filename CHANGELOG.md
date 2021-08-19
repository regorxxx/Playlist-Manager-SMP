# Changelog

## [Table of Contents]
- [Unreleased](#unreleased)
- [0.5.0](#050---2021-07-25)
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
- Playlist Auto-tagging: expanding the tag feature, playlists may now be automatically tagged with 'bAutoLoad', 'bAutoLock' or a custom set of tags. The first two keywords are meant to be used along Auto-Functions.
- Auto-Functions: automatically applies some actions whenever a playlist is loaded on the panel (i.e. folder tracking) according to the tags present on it. 'bAutoLoad' makes the playlist to be loaded within foobar automatically. 'bAutoLock' locks the playlist as soon as it's loaded on the panel. Functionality can be switched on/off. This feature allows to automatically load playlists (either selectively or all) from the tracked folder into foobar without any user interaction (specially useful for servers and syncing).
- Track Auto-tagging: option to automatically add tag values to newly added tracks to a playlist. TF expressions (or %tags%), JavaScript functions (defined at 'helpers_xxx_utils.js') and strings/numbers can be assigned to tag(s). For ex, this would be an easy method to automatically tag as genre 'Rock' any track added to a 'Rock Playlist'. Obviously the use cases can be much more complex as soon as TF expressions or JavaScript is used. Values are appended to any existing tag value, it will not replace previous ones and will not add duplicates. It will also skip auto-tagging as soon as the same track was already at the playlist (thus not running multiple times for same tracks). Track Auto-tagging can be applied whether auto-save is enabled or not, as soon as a track is added. As result, it may be possible to apply it to native playlists by disabling auto-saving and creating a virtual copy of the playlist on the Playlist Manager (changes will never be saved to the physical file, but tracks will be auto-tagged anyway). Can be configured to apply it on standard playlists, locked ones and/or AutoPlaylists.
- Relative Paths: new menu entry for playlists which allows to convert (force) all paths to relative paths, stripping all but filenames. i.e. the tracks are expected at the same Dir the playlist resides in. Meant to be used after tracks conversion, exporting, etc.
- Exporting Playlists: new menu entries for playlist exporting, allowing to just copy the playlist file, the playlist file along its tracks (thus converting the paths to relative paths too) or the playlist file plus the tracks converted using DSP presets. The latter option is configurable on the header menu at top 'Export and convert...'. Meant to be used for exporting playlists in one step, not having to edit playlists manually after converting files to match the new files... Can also be used as a 'one way sync' utility at servers, portable players, etc.
- Duplicates: New tool to find duplicated items on playlists without loading them (R. Click, 'Check playlists consistency...' menu).
- Tooltip & Duplicates: While pressing shift over a playlist, apart from the tooltip hint, a warning will be given if the current selection is already present on the destination playlist (to avoid adding duplicates). Note Shift + L.Click is the action associated to sending current selection to a playlist file.
- Skip duplicates: new option to skip duplicates when adding selected items to a playlist. Checks both, if any of the new items is already on the playlist file and if the current selection contains duplicates. Console log shows when this happen without additional warnings or functionality changes (they are simply skipped). Configuration can be toggled at header menu. Only applies when sending selection directly to a playlist file (does not prevent adding duplicates via auto-save).
- Categories: double clicking on the header cycles through the categories shown one by one.
- Added tag filtering menu to only show playlists which contain selected tags. Tag filtering is always reset on startup, no matter what 'Save filtering between sessions' is set to. Use categories for 'virtual folders' or permanent playlist categorization, tags are meant only for informative purpose or auto-tag actions (thus not needing permanent filtering).
- Popup warnings when finding dead items sending selection to playlist (Shift + L. Click), creating a new playlist from active playlist, manually saving a playlist or auto-saving (configurable). Note checking on auto-saving is disabled by default since it may affect performance and also result on popups being thrown multiple times until dead items are fixed.
### Changed
- Relative Paths: Improved relative path support. Playlist folder may now be at a different level than the library folders as long as they share the same root For ex. 'H:\_Playlists' and 'H:\Music\Cds'.
- Relative Paths: Loading playlists, checking items on library and finding dead items now evaluates relative paths whether they start with .\ or not. Playlists created with the manager always use '.\', but this improves compatibility with playlists created with other software or manually.
- Cache: Paths from current library items are cached at script loading, it's done async and in iterative steps so it doesn't freeze the UI. It was done previously once, per panel, when loading the first playlist. The change should greatly speed up the loading of the first playlist since most of the work is already done at that step, thus being as fast as consecutive playlist loading before.
- AutoPlaylists: use of 'SORT BY', 'SORT DESCENDING BY' or 'SORT ASCENDING BY' at the end of the query is now allowed. Validity of those sort patterns is also checked (along query's validity), to minimize input typos. They should cover now 100% functionality of native Autoplaylists. (Note marc2003's manager did not check their validity, so it simply crashed if something was wrong on the query or failed silently). 
- Installation: Installation path may now be changed by editing 'folders.xxxName' variable at '.\helpers\helpers_xxx.js'. This is a workaround for some SMP limitations when working with relative paths and text files, images or dynamic file loading.
- Tooltip: Header tooltip now shows current filters applied and number of playlists / Autoplaylists. Note the header text always show the number of tracked playlists on the current folder, while the tooltip shows only those on the current view.
- Categories: Current category view is now saved only when 'Save filtering between sessions' is enabled, otherwise it will be reset to show 'All' on startup.
- UI: Tooltip shortcuts are updated as soon as the key modifiers are pressed, even if the the mouse has not been moved (tooltip is redrawn). That should make easier to see the action which would be applied without needing to move the mouse constantly to update the tooltip.
- UI: Header tooltip (with current filter view) is updated after double clicking, even if the the mouse has not been moved  (tooltip is redrawn). That should make easier to see the current category applied while cycling without needing to move the mouse constantly to update the tooltip.
- UI: current selection rectangle now has its width adjusted according to 'Show name/category separators', so it doesn't overlap with the letters at the right when enabled.
- UI: when opening the contextual menu for a playlist (L. Click) the selection rectangle will be shown until the menu close. Previously it was cleared as soon as the menu was created or the mouse leave the panel. Opening menus for things not directly related to an specific playlist will maintain the previous behavior.
- UI: entire panel is repaint when moving the mouse over it instead of currently selected playlist only to ensure selection is always properly drawn even with extreme movements.
- Helpers: Split 'helpers_xxx_playlists.js' into 2 files (new one is 'helpers_xxx_playlists_files.js').
- Helpers: updated. Whenever a folder needs to be created to save a new file, the entire tree is now created if needed. Previously it would fail as soon as any folder did not exist. This greatly speeds up setting panels since now the final folder does not need to exists at all to work, since it will be created on the fly.
- Tooltip: Pressing shit, control or both will show on the tooltip the action which will be performed on playlists. If usage info is enabled on tooltips, then only the current action associated to the keys will be shown while pressing them (so it becomes obvious which one is from the list); otherwise -disabled- nothing will be shown until a key is pressed.
- Tooltip: Adjusted max width to 600 px before splitting lines.
- General speed improvements loading playlists, checking items on library and finding dead items.
- Added descriptions at top of most menus.
- Minor code cleanup.
### Removed
### Fixed
- Autosave: playlists were not being auto-saved when current filter view did not show them on the panel. Now updates them in any case (as it should have been from the start).
- Categories: adding or removing playlists updates the category filter accordingly. i.e. when adding a new playlist with a new category, it doesn't get filtered but added to the current view, no matter what the current filtering is. Previously the new playlist would be hidden by default, since the category filter did only showed currently selected categories. The same when removing the last playlist within a category.
- Categories: due to a copy/paste typo, the menu to filter categories only worked when using custom background colors on the panel.
- Menus: crash when selected playlist index was out of bounds on L. Click menu creation due to menu being created 100 ms later than clicking. If the mouse was moved really fast out of the list within that 100 ms delay, the selected playlist was considered null (crash). It would also change the playlist to which the menu applied if the mouse was moved to another playlist really fast (bug). Fixed both cases now, forcing the playlist index at the exact moment the L. Click was done (on button up).
- Fonts: missing font due to a typo (wingdings 2 -> Wingdings 2).
- Properties: fixed some instances where unused old properties were not being deleted due to property checking firing when setting them to null.
- Playlist Manager Path: checks if user set path has a '\' at the end, and adds it if missing (otherwise playlists are not saved into the folder but using the folder name as prefix!).
- Playlists paths: filenames are sanitized before saving playlists to file, replacing illegal chars. Note that filenames and playlists names can be different, so the original name -non-sanitized- is still used as playlist name.
- Playlists names: loading playlists from files now correctly retrieve ':' char on all text values (name, tags, categories, ...).
- Importing JSON: solved error when importing Autoplaylists from marc2003's manager and the Autoplaylists used 'SORT BY', 'SORT DESCENDING BY' or 'SORT ASCENDING BY' within the query at query check step. They should be now 100% compatible, while still checking validity of those sort patterns (note marc2003's manager did not check their validity, so it simply crashed if something was wrong on the query).
- UI: names on playlist list now are truncated a few px before the category letters separators and playing/loaded indicators so they don't overlap anymore.
- UI: crash when setting custom font size.
- UI: When a playlist of current view had no category, next category letter was not being shown on the letter separators. i.e. Jumping from none (-) to B, skipping A, when there were playlists with categories starting with A, B and some without categories. Long time UI only bug since first releases. Only happened for the category sorting view; when sorting by name, playlist always have a name by design, so first item header was never 'empty' and thus the next one was always shown fine.
- Dead items: the menu entry to find dead items on playlists now skips streams (http or https).
- Adding current selection to a playlist file when it's loaded and it's also the current playlist no longer reinserts tracks, thus duplicating them.
- Adding a new playlist while current filter view doesn't show it will now update the playlist file right (similar bug to the 'autosave' one).
- Checking if all items on a playlist are in the library now works as expected when some items -file paths- are duplicated.
- Restore menu list not working when deleting playlists.
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

[Unreleased]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/623c80a...v0.1.0
