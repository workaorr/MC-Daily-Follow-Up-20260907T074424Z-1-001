@echo off
echo ========================================================
echo   MC Daily Follow Up - Auto Deploy to GitHub / Vercel
echo ========================================================
echo.
echo [1/3] Adding changes...
git add .

echo.
echo [2/3] Committing changes...
git commit -m "update: fix modal layout and supervisor bulk reassign"

echo.
echo [3/3] Pushing to GitHub (origin master)...
git push origin master

echo.
echo ========================================================
echo   Deploy Complete! Vercel is now deploying online.
echo ========================================================
echo.
pause
