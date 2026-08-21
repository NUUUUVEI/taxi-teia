@echo off
REM Copies the monorepo mobile source into the standalone EAS build folder.
REM node_modules, .expo and android/ios are left untouched so the build folder
REM keeps its own installed dependencies.

set SRC=%~dp0apps\mobile
set DST=C:\Users\immar\Projects\taxi-teia-mobile

echo Syncing %SRC% -^> %DST%
echo.

robocopy "%SRC%\app" "%DST%\app" /MIR /NFL /NDL /NJH /NJS
robocopy "%SRC%\src" "%DST%\src" /MIR /NFL /NDL /NJH /NJS
robocopy "%SRC%\assets" "%DST%\assets" /E /NFL /NDL /NJH /NJS
robocopy "%SRC%" "%DST%" app.json eas.json babel.config.js tsconfig.json metro.config.js /NFL /NDL /NJH /NJS

echo.
echo Done. Now build with:
echo   cd /d %DST%
echo   npx eas-cli build --platform android --profile preview
