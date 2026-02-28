@echo off
echo 🌸 Installing Shadow Garden Bot...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo ❌ Node.js not found! Install from https://nodejs.org
  pause
  exit /b 1
)

echo ✅ Node.js found
echo.
echo 📦 Installing dependencies...
npm install

echo.
echo ✅ Installation complete!
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   NEXT STEPS:
echo.
echo   1. Open config.js
echo   2. Set your OWNER_NUMBER
echo   3. Set your ANTHROPIC_API_KEY
echo      (Get FREE at: https://console.anthropic.com/)
echo.
echo   4. Run: node index.js
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pause
