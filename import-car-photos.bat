@echo off
REM Copies the four car photos into the web app's public folder.
REM
REM SRC holds the generated placeholder images. When Marc shoots the real car,
REM either drop his photos straight into DST (overview/trunk/doors/engine, .png
REM or .jpg) or replace the files in SRC and re-run this script.

set SRC=C:\Users\immar\.cursor\projects\empty-window\assets
set DST=%~dp0apps\web\public\images\car

if not exist "%DST%" mkdir "%DST%"

for %%F in (overview trunk doors engine) do (
  if exist "%SRC%\%%F.png" (
    copy /Y "%SRC%\%%F.png" "%DST%\%%F.png" >nul && echo   ok  %%F.png
  ) else (
    echo   MISSING  %SRC%\%%F.png
  )
)

echo.
echo Files now in %DST%:
dir /b "%DST%"
