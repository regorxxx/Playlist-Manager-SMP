# Changelog

## [Table of Contents]
- [Unreleased](#unreleased)
- [0.4.0](#040---2021-06-07)
- [0.3.1](#031---2021-05-28)
- [0.3.0](#030---2021-05-26)
- [0.2.2](#022---2021-05-19)
- [0.2.1](#021---2021-05-05)
- [0.2.0](#020---2021-05-04)
- [0.1.0](#010---2021-05-02)

## [Unreleased][]
### Added
- Integration: Listeners to share tracked playlist path with other panels (use 'window.NotifyOthers('Playlist manager: playlistPath', null)'). Used on [Playlist-Tools-SMP](https://github.com/regorxxx/Playlist-Tools-SMP) to use tracked playlist files as source for pools. i.e. Playlist A would match first a playlist within foobar with same name, then a playlist file with matching '#PLAYLIST:Playlist A' tag and finally any playlist file named 'Playlist A.m3u8'. Autoplaylists are excluded (use queries instead) and fpl files too. This feature allows to use virtual playlists as containers, where you can easily collect tracks (since Playlist Manager allows to send tracks directly to a file without loading it) to be used later on pools without polluting the UI with tons of dummy playlists.
### Changed
- Portable: first time properties use now relative paths on profile folder for portable installations (>= 1.6).
- Integration: Moved some functions to 'playlist_manager_helpers.js' to easily integrate others scripts with the playlists objects.
- Data: json file for playlists is now formatted to be readable.
### Removed
### Fixed

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

[Unreleased]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/623c80a...v0.1.0
