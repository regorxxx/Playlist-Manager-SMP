# Changelog

## [Table of Contents]
- [Unreleased](#unreleased)
- [0.2.0](#220---2021-05-04)
- [0.1.0](#010---2021-05-02)

## [Unreleased][]
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
- Check while painting to avoid situations where the code fails but doesn't crash.
- Menu framework: 'playlist_manager_menu.js' contains now the rbtn contextual menus.
- Menu framework: 'menu_xxx.js' added.
- Changing UUID option now updates all already created playlists (both files and associated playlists within foobar), not only new ones.

### Changed
- Bugfix when removing playlist from the bottom of the list. The panel had a silent bug while repainting and showed a weird behaviour without crashing. Fixed the source of the problem.
- Buttons framework: icon bugfix.
- Bugfix on "sort by..." menu.
- Menu framework: Converted all menus (instead of methods by index).

### Removed

## [0.1.0] - 2021-05-02
### Added
- First beta release.

### Changed

### Removed

[Unreleased]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/regorxxx/Playlist-Manager-SMP/compare/623c80a...v0.1.0
