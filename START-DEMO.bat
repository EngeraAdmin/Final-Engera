@echo off
cd /d "%~dp0"
title Engera website - DEMO (practice copy)
echo.
echo  Starting the Engera demo...
echo  Your browser will open on the admin sign-in page in a few seconds.
echo.
echo    Username: admin
echo    Password: admin123    (already filled in for you)
echo.
echo  This is a practice copy. Nothing here touches the real website.
echo  To stop: close this window.
echo.
node node_modules\vite\bin\vite.js dev
echo.
echo  The demo stopped. If you saw an error above, copy it and send it over.
pause
