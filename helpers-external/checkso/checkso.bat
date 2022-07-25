@ECHO OFF
REM Retrieves Architecture
SET arch=x64
IF "%PROCESSOR_ARCHITECTURE%" == "x86" ( 
    IF NOT DEFINED PROCESSOR_ARCHITEW6432 (set arch=x86)
) 
ECHO %arch%>%1