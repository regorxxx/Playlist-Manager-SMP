@ECHO OFF
title New GUID

ECHO You can use the following GUID for a new drive:
ECHO.
powershell -Command '{'+[guid]::NewGUID().ToString().ToUpper()+'}'
ECHO.
pause