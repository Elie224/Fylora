@echo off
REM Script batch pour définir kouroumaelisee@gmail.com comme administrateur
REM Usage: backend\scripts\setAdmin.bat

echo 🔍 Recherche de Node.js...

REM Chercher Node.js dans les emplacements communs
set "NODE_EXE="

if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
    goto :found
)

if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
    goto :found
)

if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
    goto :found
)

REM Essayer via PATH
where node >nul 2>&1
if %ERRORLEVEL% == 0 (
    set "NODE_EXE=node"
    goto :found
)

echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH
echo    Veuillez installer Node.js depuis https://nodejs.org/
echo    Ou ajoutez Node.js au PATH de votre système
pause
exit /b 1

:found
echo ✅ Node.js trouvé: %NODE_EXE%

REM Obtenir le répertoire du script
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%.."

REM Vérifier que le script existe
if not exist "%SCRIPT_DIR%setAdmin.js" (
    echo ❌ Script setAdmin.js non trouvé: %SCRIPT_DIR%setAdmin.js
    pause
    exit /b 1
)

echo 🚀 Exécution du script setAdmin.js...
echo.

REM Changer vers le répertoire backend
cd /d "%BACKEND_DIR%"

REM Exécuter le script Node.js
"%NODE_EXE%" "%SCRIPT_DIR%setAdmin.js"

if %ERRORLEVEL% == 0 (
    echo.
    echo ✅ Script exécuté avec succès!
) else (
    echo.
    echo ❌ Erreur lors de l'exécution du script (code: %ERRORLEVEL%)
    pause
    exit /b %ERRORLEVEL%
)

pause

