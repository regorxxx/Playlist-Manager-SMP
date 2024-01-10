@ECHO off
REM ------------------------------------------------------------------
REM Create packages (zip file) from js files v.19/12/23
REM Requires 7za.exe on windows to compress (otherwise do it manually)
REM If it's not provided, can be downloaded from:
REM 	https://www.7-zip.org/download.html
REM 		Download 7-Zip Extra: standalone console version...
REM 		Move '7za.exe' to 'C:\Windows\' (or equivalent path)
REM 		Alternatively set path at zipExec variable
REM Bat file must be placed at the root of the js files
REM Usage:
REM 	_createPackage.bat [Number] [foobarPath]
REM Key:
REM 	Number		If Number is provided, will build package without
REM					user input
REM 	foobarPath	If provided, will copy the package to the SMP
REM					packages folder at profile, and run foobar2000
REM					If it's already running, is qracefully quit first
REM					If set to '.', will search for the binary file
REM					relative to the current folder (4 folders up)
REM ------------------------------------------------------------------
SETLOCAL
SET packagesFolder=packages
SET zipExec=helpers-external\7z\7za_32.exe
SET hasErrors=false
SET foobarPath=%2
IF [%foobarPath%]==[.] (
	SET foobarPath="..\..\..\..\foobar2000.exe"
)
ECHO ---------------------------------
ECHO ^|	Package creator:	^|
ECHO ---------------------------------
ECHO (1) World-Map-SMP
ECHO (2) Playlist-Manager-SMP
ECHO (3) Not-a-Waveform-Seekbar-SMP
ECHO (4) Timeline-SMP
ECHO.
IF [%~1]==[] (
	CHOICE /C 1234 /N /M "CHOOSE PACKAGE TO BUILD (1-4): "
) ELSE (
	IF [%1] EQU [0] (
		ECHO 9| CHOICE /C 123456789 /N >NUL
	) ELSE (
		ECHO %1| CHOICE /C 123456789 /N /M "CHOOSE PACKAGE TO BUILD (1-4): "
	)
)
IF %ERRORLEVEL% EQU 1 GOTO world_map
IF %ERRORLEVEL% EQU 2 GOTO playlist_manager
IF %ERRORLEVEL% EQU 3 GOTO not_a_waveform_seekbar
IF %ERRORLEVEL% EQU 4 GOTO timeline
IF ERRORLEVEL 5 (
	ECHO Package ^(%1^) not recognized.
	GOTO:EOF
)

REM ------------------------------
REM Packages
REM ------------------------------

:world_map
REM package variables
REM version is automatically retrieved from main js file
REM any text must be JSON encoded
SET name=World-Map-SMP
SET id=FA5A85D5-5C81-4B9B-BF01-52872BA83EA7
SET description=https://regorxxx.github.io/foobar2000-SMP.github.io/scripts/world-map-smp/\r\n\r\nA foobar2000 UI Spider Monkey Panel which displays current artist's country on the world map and lets you generate autoplaylists based on selection and locale tag saving when integrated along WilB's Biography Script.\r\n\r\n• Map image configurable:\r\n   - Full.\r\n   - No Antarctica.\r\n   - Custom. (coordinates may need a transformation to work)\r\n• Configurable X and Y factors for transformation (along custom image maps).\r\n• 2 modes:\r\n   - Standard: Follow now playing track or selection.\r\n   - Library: display statistics of entire library (independtly of the selection/playback).\r\n• Works with multiple selected tracks (draws all points on the map), allowing to show statistics of an entire playlist or library.\r\n• Fully configurable UI.\r\n• On playback the panel fetches tags from (by order of preference):\r\n   - Track's tags.\r\n   - JSON database.\r\n   - WilB's Biography panel.\r\n• WilB's Biography integration\r\n• Tool-tip shows multiple info about the points and tracks selected.\r\n• AutoPlaylist creation on click over a point with any artist on your library from the selected country.\r\n• Fully Wine - Unix - non IE SOs compatible.
REM version
FOR /F "tokens=* USEBACKQ" %%F IN (`findstr /R "version:" world_map.js`) DO (SET version=%%F)
IF "%version%"=="" (
	ECHO Main file not found or wrong version string
	PAUSE>NUL
	EXIT /B 1
)
SET version=%version:if (!window.ScriptInfo.PackageId) { window.DefineScript('World Map', { author: 'regorxxx', version: '=%
SET version=%version:', features: { drag_n_drop: false } }); }=%
REM features
SET enableDragDrop=false
SET shouldGrabFocus=false
REM global variable
SET root=%packagesFolder%\%name: =-%
REM package folder and file
CALL :check_root
CALL :copy_main world_map.js
REM main
CALL :check_folder main
CALL :check_folder main\filter_and_query
CALL :copy_file main\filter_and_query\remove_duplicates.js
CALL :copy_folder main\map
CALL :check_folder main\music_graph
CALL :copy_file main\music_graph\music_graph_descriptors_xxx_countries.js
CALL :copy_folder main\world_map
CALL :check_folder main\statistics
CALL :copy_file main\statistics\statistics_xxx.js
CALL :copy_file main\statistics\statistics_xxx_helper.js
CALL :check_folder main\window
CALL :copy_file main\window\window_xxx_background.js
CALL :copy_file main\window\window_xxx_background_menu.js
CALL :copy_file main\window\window_xxx_button.js
CALL :copy_file main\window\window_xxx_helpers.js
REM helpers
CALL :check_folder helpers
CALL :copy_file helpers\callbacks_xxx.js
CALL :copy_file helpers\helpers_xxx.js
CALL :copy_file helpers\helpers_xxx_basic_js.js
CALL :copy_file helpers\helpers_xxx_cache_volatile.js
CALL :copy_file helpers\helpers_xxx_console.js
CALL :copy_file helpers\helpers_xxx_crc.js
CALL :copy_file helpers\helpers_xxx_dummy.js
CALL :copy_file helpers\helpers_xxx_file.js
CALL :copy_file helpers\helpers_xxx_flags.js
CALL :copy_file helpers\helpers_xxx_foobar.js
CALL :copy_file helpers\helpers_xxx_global.js
CALL :copy_file helpers\helpers_xxx_input.js
CALL :copy_file helpers\helpers_xxx_playlists.js
CALL :copy_file helpers\helpers_xxx_properties.js
CALL :copy_file helpers\helpers_xxx_prototypes.js
CALL :copy_file helpers\helpers_xxx_prototypes_smp.js
CALL :copy_file helpers\helpers_xxx_so.js
CALL :copy_file helpers\helpers_xxx_tags.js
CALL :copy_file helpers\helpers_xxx_tags_cache.js
CALL :copy_file helpers\helpers_xxx_UI.js
CALL :copy_file helpers\helpers_xxx_UI_chars.js
CALL :copy_file helpers\helpers_xxx_UI_flip.js
CALL :copy_file helpers\helpers_xxx_web.js
CALL :copy_file helpers\helpers_xxx_web_update.js
CALL :copy_file helpers\menu_xxx.js
CALL :copy_file helpers\popup_xxx.js
CALL :check_folder helpers\readme
CALL :copy_file helpers\readme\world_map.txt
REM helpers external
CALL :copy_folder helpers-external\bitmasksorterjs
CALL :copy_folder helpers-external\checkso
CALL :copy_folder helpers-external\chroma.js
CALL :copy_folder helpers-external\cmdutils
CALL :copy_folder helpers-external\countries-mercator true
CALL :copy_folder helpers-external\countries-mercator-mask true
CALL :copy_folder helpers-external\namethatcolor
CALL :copy_folder helpers-external\natsort
CALL :delete_file helpers-external\chroma.js\chroma-ultra-light.min.js
CALL :delete_file helpers-external\countries-mercator\_Kosovo.png
CALL :delete_file helpers-external\countries-mercator\"_N. Cyprus.png"
CALL :delete_file helpers-external\countries-mercator\_Somaliland.png
CALL :delete_file helpers-external\countries-mercator\worldmap_natural.png
CALL :delete_file helpers-external\countries-mercator\worldmap_shapes.png
CALL :delete_file helpers-external\countries-mercator-mask\_Kosovo.png
CALL :delete_file helpers-external\countries-mercator-mask\"_N. Cyprus.png"
CALL :delete_file helpers-external\countries-mercator-mask\_Somaliland.png
CALL :delete_file helpers-external\countries-mercator-mask\worldmap_natural.png
CALL :delete_file helpers-external\countries-mercator-mask\worldmap_shapes.png
REM others
CALL :check_folder _images
CALL :copy_file _images\_Installation_v1.5_v1.4.JPG
CALL :copy_file _images\_Installation_v1.6.JPG
CALL :copy_file _images\world_map_01.JPG
CALL :copy_file _images\world_map_02.jpg
CALL :check_folder images
CALL :check_folder images\flags
CALL :copy_folder images\flags\32 true
CALL :copy_folder images\flags\64 true
CALL :copy_file images\MC_WorldMap.jpg
CALL :copy_file images\MC_WorldMap_No_Ant.jpg
CALL :copy_file images\MC_WorldMap_Shapes.png
CALL :copy_file images\MC_WorldMap_Shapes_No_Ant.png
CALL :check_folder images\hires
CALL :copy_file images\hires\MC_WorldMap.jpg
CALL :copy_file images\hires\MC_WorldMap.png
CALL :copy_file images\hires\MC_WorldMap_No_Ant.jpg
CALL :copy_file images\hires\MC_WorldMap_No_Ant.png
CALL :copy_file images\hires\MC_WorldMap_Shapes.png
CALL :copy_file images\hires\MC_WorldMap_Shapes_No_Ant.png
CALL :check_folder presets
CALL :check_folder presets\AutoHotkey
CALL :copy_file presets\AutoHotkey\foobar_preview_play.ahk
CALL :copy_file presets\AutoHotkey\foobar_preview_sel.ahk
CALL :copy_file presets\AutoHotkey\readme.txt
CALL :copy_folder presets\"World Map"
REM package info, zip and report
CALL :finish
GOTO:EOF

:playlist_manager
REM package variables
REM version is automatically retrieved from main js file
REM any text must be JSON encoded
SET name=Playlist-Manager-SMP
SET id=2A6AEDC9-BAE4-4D30-88E2-EDE7225B494D
SET description=https://regorxxx.github.io/foobar2000-SMP.github.io/scripts/playlist-manager-smp/\r\n\r\nPlaylist manager for foobar2000 and Spider Monkey Panel to save and load (auto)playlists on demand, synchronizing, ... along many more utilities.\r\n\r\n• Manages Playlist files, AutoPlaylists and Smart Playlists(XBMC or Kodi).\r\n• ListenBrainz integration: sync user's playlists, ...\r\n• Loads playlist files x100 times faster than standard foobar.\r\n• Multiple exporting options: compatible with Foobar2000 mobile, Kodi and XBMC systems, etc.\r\n• Group by categories, tags and inline searching.\r\n• Filters and Sorting.\r\n• Configurable UI.\r\n• Fully Wine - Unix - non IE SOs compatible.\r\n• Other scripts integration:\r\n   - Playlist-Tools-SMP\r\n   - ajquery-xxx\r\n   - SMP Dynamic menus
REM version
FOR /F "tokens=* USEBACKQ" %%F IN (`findstr /R "version:" playlist_manager.js`) DO (SET version=%%F)
IF "%version%"=="" (
	ECHO Main file not found or wrong version string
	PAUSE>NUL
	EXIT /B 1
)
SET version=%version:if (!window.ScriptInfo.PackageId) { window.DefineScript('Playlist Manager', { author: 'regorxxx', version: '=%
SET version=%version:', features: { drag_n_drop: true, grab_focus: true } }); }=%
REM features
SET enableDragDrop=true
SET shouldGrabFocus=true
REM global variable
SET root=%packagesFolder%\%name: =-%
REM package folder and file
CALL :check_root
CALL :copy_main playlist_manager.js
REM main
CALL :check_folder main
CALL :check_folder main\filter_and_query
CALL :copy_file main\filter_and_query\remove_duplicates.js
CALL :copy_folder main\playlist_manager
CALL :check_folder main\window
CALL :copy_file main\window\window_xxx_button.js
CALL :copy_file main\window\window_xxx_helpers.js
CALL :copy_file main\window\window_xxx_input.js
CALL :copy_file main\window\window_xxx_scrollbar.js
CALL :check_folder main\statistics
CALL :copy_file main\statistics\statistics_xxx.js
CALL :copy_file main\statistics\statistics_xxx_helper.js
CALL :delete_file main\playlist_manager\playlist_manager_listenbrainz_extra.js
REM readmes
CALL :check_folder readmes
CALL :copy_file readmes\playlist_manager.pdf
CALL :check_folder readmes\_images
CALL :copy_file readmes\_images\export.gif
CALL :copy_file readmes\_images\foobarmobile.gif
CALL :copy_file readmes\_images\pools.gif
REM helpers
CALL :check_folder helpers
CALL :copy_file helpers\buttons_panel_xxx.js
CALL :copy_file helpers\callbacks_xxx.js
CALL :copy_file helpers\helpers_xxx.js
CALL :copy_file helpers\helpers_xxx_basic_js.js
CALL :copy_file helpers\helpers_xxx_cache_volatile.js
CALL :copy_file helpers\helpers_xxx_clipboard.js
CALL :copy_file helpers\helpers_xxx_console.js
CALL :copy_file helpers\helpers_xxx_controller.js
CALL :copy_file helpers\helpers_xxx_crc.js
CALL :copy_file helpers\helpers_xxx_dummy.js
CALL :copy_file helpers\helpers_xxx_file.js
CALL :copy_file helpers\helpers_xxx_file_zip.js
CALL :copy_file helpers\helpers_xxx_flags.js
CALL :copy_file helpers\helpers_xxx_foobar.js
CALL :copy_file helpers\helpers_xxx_global.js
CALL :copy_file helpers\helpers_xxx_input.js
CALL :copy_file helpers\helpers_xxx_instances.js
CALL :copy_file helpers\helpers_xxx_levenshtein.js
CALL :copy_file helpers\helpers_xxx_playlists.js
CALL :copy_file helpers\helpers_xxx_playlists_files.js
CALL :copy_file helpers\helpers_xxx_playlists_files_fpl.js
CALL :copy_file helpers\helpers_xxx_playlists_files_xsp.js
CALL :copy_file helpers\helpers_xxx_playlists_files_xspf.js
CALL :copy_file helpers\playlist_history.js
CALL :copy_file helpers\helpers_xxx_properties.js
CALL :copy_file helpers\helpers_xxx_prototypes.js
CALL :copy_file helpers\helpers_xxx_prototypes_smp.js
CALL :copy_file helpers\helpers_xxx_so.js
CALL :copy_file helpers\helpers_xxx_tags.js
CALL :copy_file helpers\helpers_xxx_tags_cache.js
CALL :copy_file helpers\helpers_xxx_UI.js
CALL :copy_file helpers\helpers_xxx_UI_chars.js
CALL :copy_file helpers\helpers_xxx_UI_draw.js
CALL :copy_file helpers\helpers_xxx_UI_flip.js
CALL :copy_file helpers\helpers_xxx_utils.js
CALL :copy_file helpers\helpers_xxx_web.js
CALL :copy_file helpers\helpers_xxx_web_update.js
CALL :copy_file helpers\menu_xxx.js
CALL :copy_file helpers\popup_xxx.js
CALL :check_folder helpers\readme
CALL :copy_file helpers\readme\input_box.txt
CALL :copy_file helpers\readme\playlist_manager.txt
REM helpers external
CALL :copy_folder helpers-external\bitmasksorterjs
CALL :copy_folder helpers-external\7z
CALL :copy_folder helpers-external\checkso
CALL :copy_folder helpers-external\chroma.js
CALL :copy_folder helpers-external\cmdutils
CALL :copy_folder helpers-external\fuse
CALL :copy_folder helpers-external\keycode-2.2.0
CALL :copy_folder helpers-external\namethatcolor
CALL :copy_folder helpers-external\natsort
CALL :copy_folder helpers-external\SimpleCrypto-js
CALL :copy_folder helpers-external\xspf-to-jspf-parser
CALL :copy_folder helpers-external\xsp-to-jsp-parser
CALL :delete_file helpers-external\chroma.js\chroma-ultra-light.min.js
REM others
CALL :check_folder _images
CALL :copy_file _images\_Installation_v1.5_v1.4.JPG
CALL :copy_file _images\_Installation_v1.6.JPG
CALL :copy_file _images\playlist_manager_01.JPG
CALL :copy_file _images\playlist_manager_02.JPG
CALL :copy_file _images\playlist_manager_03.JPG
CALL :copy_file _images\playlist_manager_04.JPG
CALL :copy_file _images\playlist_manager_05.JPG
CALL :copy_file _images\playlist_manager_06.JPG
CALL :copy_file _images\playlist_manager_07.JPG
CALL :copy_file _images\playlist_manager_08.JPG
CALL :copy_file _images\playlist_manager_09.JPG
CALL :copy_file _images\buttons_wine.png
CALL :check_folder _resources
CALL :copy_file _resources\fontawesome-webfont.ttf
CALL :check_folder examples
CALL :copy_file examples\playlistManager_playlists_config.json
CALL :copy_file examples\playlist_xsp_example.xsp
CALL :copy_file examples\playlist_xsp_exampleTwo.xsp
CALL :copy_file examples\playlist_xspf_example.xspf
CALL :copy_file examples\playlist_codepages.zip
CALL :check_folder presets
CALL :copy_folder presets\Network
REM package info, zip and report
CALL :finish
GOTO:EOF

:not_a_waveform_seekbar
REM package variables
REM version is automatically retrieved from main js file
REM any text must be JSON encoded
SET name=Not-A-Waveform-Seekbar-SMP
SET id=293B12D8-CC8B-4D21-8883-1A29EAFC4074
SET description=https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP\r\n\r\nA seekbar for foobar2000, using Spider Monkey Panel, audiowaveform or ffprobe. It's based on RMS, peak levels, the actual waveform or visualization presets.\r\n\r\n• Uses audiowaveform by default (included).\r\n• ffprobe can be used if desired. Download it and copy ffprobe.exe into 'helpers-external\\ffprobe'.\r\n• Visualizer mode to simply show an animation which changes according to BPM (if tag exists).\r\n• Fully configurable using the R. Click menu:\r\n   - Colors\r\n   - Waveform modes\r\n   - Analysis modes\r\n   - Animations\r\n   - Refresh rate (not recommended anything below 100 ms except on really modern CPUs)
REM version
FOR /F "tokens=* USEBACKQ" %%F IN (`findstr /R "version:" seekbar.js`) DO (SET version=%%F)
IF "%version%"=="" (
	ECHO Main file not found or wrong version string
	PAUSE>NUL
	EXIT /B 1
)
SET version=%version:if (!window.ScriptInfo.PackageId) { window.DefineScript('Not-A-Waveform-Seekbar-SMP', { author: 'regorxxx', version: '=%
SET version=%version:' }); }=%
REM features
SET enableDragDrop=false
SET shouldGrabFocus=false
REM global variable
SET root=%packagesFolder%\%name: =-%
REM package folder and file
CALL :check_root
CALL :copy_main seekbar.js
REM main
CALL :copy_folder main\seekbar
CALL :check_folder main\window
CALL :copy_file main\window\window_xxx_background.js
CALL :copy_file main\window\window_xxx_background_menu.js
CALL :copy_file main\window\window_xxx_helpers.js
REM helpers
CALL :check_folder helpers
CALL :copy_file helpers\callbacks_xxx.js
CALL :copy_file helpers\helpers_xxx.js
CALL :copy_file helpers\helpers_xxx_basic_js.js
CALL :copy_file helpers\helpers_xxx_console.js
CALL :copy_file helpers\helpers_xxx_dummy.js
CALL :copy_file helpers\helpers_xxx_file.js
CALL :copy_file helpers\helpers_xxx_foobar.js
CALL :copy_file helpers\helpers_xxx_global.js
CALL :copy_file helpers\helpers_xxx_input.js
CALL :copy_file helpers\helpers_xxx_properties.js
CALL :copy_file helpers\helpers_xxx_prototypes.js
CALL :copy_file helpers\helpers_xxx_prototypes_smp.js
CALL :copy_file helpers\helpers_xxx_so.js
CALL :copy_file helpers\helpers_xxx_UI.js
CALL :copy_file helpers\helpers_xxx_UI_chars.js
CALL :copy_file helpers\helpers_xxx_web.js
CALL :copy_file helpers\helpers_xxx_web_update.js
CALL :copy_file helpers\menu_xxx.js
REM helpers external
CALL :copy_folder helpers-external\audiowaveform
CALL :copy_folder helpers-external\bitmasksorterjs
CALL :copy_folder helpers-external\chroma.js
CALL :copy_folder helpers-external\lz-string
CALL :copy_folder helpers-external\lz-utf8
CALL :copy_folder helpers-external\namethatcolor
CALL :delete_file helpers-external\chroma.js\chroma.min.js
REM package info, zip and report
CALL :finish
GOTO:EOF

:timeline
REM package variables
REM version is automatically retrieved from main js file
REM any text must be JSON encoded
SET name=Timeline-SMP
SET id=EAEB88D1-44AC-4B13-8960-FB3AAD78828D
SET description=https://github.com/regorxxx/Timeline-SMP\r\n\r\nA timeline for foobar2000, using Spider Monkey Panel, and Statistics-Framework-SMP (https://github.com/regorxxx/Statistics-Framework-SMP).\r\n\r\n• Draws date (X) and nº tracks (Y) per artist (Z) by default.\r\n• Contextual menu to create playlists clicking on any point.\r\n• Fully customizable data per axis with TitleFormat.\r\n• Asynchronous data calculations. \r\n• Point statistics.\r\n• Scroll with buttons and mouse dragging.\r\n• Zoom with mouse wheel.\r\n• Configurable background.\r\n• Highly configurable chart and data manipulation.
REM version
FOR /F "tokens=* USEBACKQ" %%F IN (`findstr /R "version:" timeline.js`) DO (SET version=%%F)
IF "%version%"=="" (
	ECHO Main file not found or wrong version string
	PAUSE>NUL
	EXIT /B 1
)
SET version=%version:if (!window.ScriptInfo.PackageId) { window.DefineScript('Timeline', { author: 'regorxxx', version: '=%
SET version=%version:', features: { drag_n_drop: false, grab_focus: true } }); }=%
REM features
SET enableDragDrop=false
SET shouldGrabFocus=false
REM global variable
SET root=%packagesFolder%\%name: =-%
REM package folder and file
CALL :check_root
CALL :copy_main timeline.js
REM main
CALL :copy_folder main\timeline
CALL :copy_folder main\statistics
CALL :check_folder main\filter_and_query
CALL :copy_file main\filter_and_query\remove_duplicates.js
CALL :check_folder main\window
CALL :copy_file main\window\window_xxx_button.js
CALL :copy_file main\window\window_xxx_background.js
CALL :copy_file main\window\window_xxx_background_menu.js
CALL :copy_file main\window\window_xxx_helpers.js
CALL :delete_file main\statistics\statistics_xxx_helper_fallback.js
REM helpers
CALL :check_folder helpers
CALL :copy_file helpers\callbacks_xxx.js
CALL :copy_file helpers\helpers_xxx.js
CALL :copy_file helpers\helpers_xxx_basic_js.js
CALL :copy_file helpers\helpers_xxx_cache_volatile.js
CALL :copy_file helpers\helpers_xxx_console.js
CALL :copy_file helpers\helpers_xxx_crc.js
CALL :copy_file helpers\helpers_xxx_dummy.js
CALL :copy_file helpers\helpers_xxx_file.js
CALL :copy_file helpers\helpers_xxx_flags.js
CALL :copy_file helpers\helpers_xxx_foobar.js
CALL :copy_file helpers\helpers_xxx_global.js
CALL :copy_file helpers\helpers_xxx_input.js
CALL :copy_file helpers\helpers_xxx_playlists.js
CALL :copy_file helpers\helpers_xxx_properties.js
CALL :copy_file helpers\helpers_xxx_prototypes.js
CALL :copy_file helpers\helpers_xxx_prototypes_smp.js
CALL :copy_file helpers\helpers_xxx_so.js
CALL :copy_file helpers\helpers_xxx_tags.js
CALL :copy_file helpers\helpers_xxx_tags_cache.js
CALL :copy_file helpers\helpers_xxx_UI.js
CALL :copy_file helpers\helpers_xxx_UI_chars.js
CALL :copy_file helpers\helpers_xxx_UI_flip.js
CALL :copy_file helpers\helpers_xxx_web.js
CALL :copy_file helpers\helpers_xxx_web_update.js
CALL :copy_file helpers\menu_xxx.js
CALL :copy_file helpers\menu_xxx_extras.js
CALL :copy_file helpers\popup_xxx.js
REM helpers external
CALL :copy_folder helpers-external\bitmasksorterjs
CALL :copy_folder helpers-external\natsort
CALL :copy_folder helpers-external\chroma.js
CALL :copy_folder helpers-external\namethatcolor
CALL :delete_file helpers-external\chroma.js\chroma-ultra-light.min.js
REM package info, zip and report
CALL :finish
GOTO:EOF

REM ------------------------------
REM Internals
REM ------------------------------
:delete_file
SET filePath=%1
IF EXIST %root%\%filePath% DEL /Q /F %root%\%filePath%
GOTO:EOF

:delete_folder
REM Copy functions are Async, so put these at the end
IF EXIST %1 (
	DEL /Q /F /S %1\*.* >NUL
	RD /Q /S %1 >NUL
)
GOTO:EOF

:copy_main
SET filePath=%1
COPY /V /Y %filePath% %root%\main.js
IF ERRORLEVEL 1 (CALL :report_error %filePath%)
GOTO:EOF

:copy_file
SET filePath=%1
ECHO %filePath%
COPY /V /Y %filePath% %root%\%filePath%>nul
IF ERRORLEVEL 1 (CALL :report_error %filePath%)
GOTO:EOF

:copy_folder
SET folderPath=%1
IF NOT EXIST %root%\%folderPath% MD %root%\%folderPath%
IF [%2]==[true] (
	ECHO %folderPath%
	COPY /V /Y %folderPath% %root%\%folderPath%>nul
) ELSE (
	COPY /V /Y %folderPath% %root%\%folderPath%
)
IF ERRORLEVEL 1 (CALL :report_error %folderPath%)
GOTO:EOF

:check_folder
SET folderPath=%1
IF NOT EXIST %root%\%folderPath% MD %root%\%folderPath%
GOTO:EOF

:check_root
CALL :delete_folder %root%
MD %root%
GOTO:EOF

:copy_files
SET folder=%1
SET files=%~2
CALL :check_folder %folder%
FOR %%f in (%files%) do (
	ECHO %folder%\%%f
	CALL :copy_file %folder%\%%f
)
GOTO:EOF

:copy_folders
SET folder=%1
SET folders=%~2
CALL :check_folder %folder%
FOR %%f in (%folders%) do (
	CALL :copy_folder %folder%\%%f
)
GOTO:EOF

:create_package_info
SET filePath=package.json
IF EXIST %root%\%filePath% DEL /Q /F %root%\%filePath%
REM add bom EF BB BF bytes in HEX-editor
ECHO | SET /P dummyName="﻿"> %root%\%filePath%
ECHO {>> %root%\%filePath%
ECHO 	"author": "Regorxxx",>> %root%\%filePath%
ECHO 	"description": "%description%",>> %root%\%filePath%
ECHO 	"enableDragDrop": %enableDragDrop%,>> %root%\%filePath%
ECHO 	"id": "{%id%}",>> %root%\%filePath%
ECHO 	"name": "%name%",>> %root%\%filePath%
ECHO 	"shouldGrabFocus": %shouldGrabFocus%,>> %root%\%filePath%
ECHO 	"version": "%version%">> %root%\%filePath%
ECHO | SET /p dummyName="}">> %root%\%filePath%
REM omit new line at end
REM https://stackoverflow.com/questions/7105433/windows-batch-echo-without-new-line
GOTO:EOF

:compress
SET fileName=%1-%version:.=-%-package.zip
SET version=%2
IF EXIST %packagesFolder%\fileName DEL /Q /F  %packagesFolder%\fileName
7za --help >nul 2>&1 && (
	ECHO Compressing...
	7za a -aoa -mx=7 -bso0 -bsp0 -bb0 -y -bd %packagesFolder%\%fileName% .\%root%\*
) || (
	IF EXIST %zipExec% (
		ECHO Compressing...
		%zipExec% a -aoa -mx=7 -bso0 -bsp0 -bb0 -y -bd %packagesFolder%\%fileName% .\%root%\*
	) ELSE (
		EXIT /B 1
	)
)
GOTO:EOF

:clean_root
CALL :delete_folder %root%
ECHO Temp folder cleaned.
GOTO:EOF

:report
IF %hasErrors%==true (
	ECHO Package was not created, some errors were found.
) ELSE (
	IF ERRORLEVEL 1 (
		ECHO 7z.exe not found, you must manually create a zip from the folder.
		ECHO Check folder at: %root%
	) ELSE (
		SET output="Done. Check zip file at: %packagesFolder%\%name%-%version:.=-%-package.zip"
	)
)
GOTO:EOF

:report_error
ECHO.
ECHO ERROR
ECHO Not found: %1
SET hasErrors=true
EXIT /B 1
GOTO:EOF

:test
REM Kill process and start again
CHCP 437 > nul
POWERSHELL $Process=Get-Process foobar2000 ^| Where-Object {$_.Path -like '*%foobarPath%*'} ; $Process.CloseMainWindow()>nul
IF %ERRORLEVEL% EQU 0 (
	ECHO Closing foobar2000...
	TIMEOUT /t 4 /nobreak>nul
)
SET packages=%foobarPath:foobar2000.exe=profile\foo_spider_monkey_panel\packages\%
ECHO Copying files to package folder...
REM COPY /V /Y %root% %packages%\{%id%}>nul
ROBOCOPY %root% %packages%\{%id%} /S /E /PURGE /NJH /NFL /NC /NDL /NJS /MT:16
IF ERRORLEVEL 8 (SET hasErrors=true)
ECHO Initializing foobar2000...
START "foobar2000" /D %foobarPath:foobar2000.exe=% /B %foobarPath%
GOTO:EOF

:runFoobar
IF EXIST %foobarPath% (
	CALL :test
) ELSE (
	ECHO foobar2000 binary does not exist: %foobarPath%
	SET hasErrors=true
)
GOTO:EOF

REM package info, zip and report
:finish
IF NOT %hasErrors%==true (
	CALL :create_package_info
	CALL :compress %name% %version%
	CALL :report
	IF NOT [%foobarPath%]==[] (
		ECHO Testing...
		call :runFoobar
	)
)
CALL :clean_root
IF NOT [%output%]==[] (
	ECHO.
	ECHO.
	ECHO %output:"=%
)
PAUSE>NUL
IF %hasErrors%==true (EXIT /B 1)
GOTO:EOF