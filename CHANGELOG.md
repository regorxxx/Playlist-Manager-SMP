# Changelog

## [Table of Contents]
- [Unreleased](#unreleased)
- [0.2.2](#022---2021-05-19)
- [0.2.1](#021---2021-05-05)
- [0.2.0](#020---2021-05-04)
- [0.1.0](#010---2021-05-02)

## [Unreleased][]
### Added
### Changed
### Removed

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
- Bugfix: All data arrays get updated on playlist saving/editing (previously only displayed data was updated, leading to some display bugs).
- Bugfix: Multiple bugfixes for fpl and pls file edits. 
- Helpers: Playlist loading is done using cache for both absolute and relative path playlists, independently  of configuration (for saving).
- Using pls format disables UUIDs menu and forces UUID refresh to none for consistency.
- Using pls format disables some menus for editing data (pls format doesn't allow extra comments).
- Changed the background text when filtering the lists and # items was 0. (previously it showed the default text).
- Playlist loading should be much faster after the first time all libray paths have been cached, since that was the main culprit of loading time (+1 sec for 70k tracks).
### Removed

## [0.2.1] - 2021-05-05
### Added
- Menu framework: 'playlist_manager_menu.js' contains now the lbtn contextual menus.
- Shift + Left button: deletes playlist (same than menu entry).

### Changed
- Bugfix: json importing was not working for files created by the panel.
- Bugfix: json was not updated when removing the last autoplaylist. Now gets updated even if that means writing an empty file.
- Bugfix: crash while painting if there was only 1 item and using sorting + separators.
- Some code cleaning.

### Removed

## [0.2.0] - 2021-05-04
### Added
- Menu framework: 'playlist_manager_menu.js' contains now the rbtn contextual menus.
- Menu framework: 'menu_xxx.js' added.
- Check while painting to avoid situations where the code fails but doesn't crash.
- Changing UUID option now updates all already created playlists (both files and associated playlists within foobar), not only new ones.

### Changed
- Bugfix: when removing playlist from the bottom of the list. The panel had a silent bug while repainting and showed a weird behaviour without crashing. Fixed the source of the problem.
- Bugfix: on "sort by..." menu.
- Buttons framework: icon bugfix.
- Menu framework: Converted all menus (instead of methods by index).

### Removed

## [0.1.0] - 2021-05-02
### Added
- First beta release.

### Changed

### Removed

[Unreleased]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.1...HEAD
[0.2.2]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/623c80a...v0.1.0
