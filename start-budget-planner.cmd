@echo off
setlocal
title Haushalts-Budgetplaner
cd /d "%~dp0"

echo ============================================
echo    Haushalts-Budgetplaner wird gestartet
echo ============================================
echo.

REM ---------- Python pruefen ----------
python --version >nul 2>&1
if errorlevel 1 (
    echo FEHLER: Python wurde nicht gefunden.
    echo.
    echo Bitte Python von https://www.python.org/downloads/ installieren.
    echo Beim Setup unbedingt "Add python.exe to PATH" ankreuzen und danach
    echo die Eingabeaufforderung neu oeffnen.
    echo.
    pause
    exit /b 1
)

REM ---------- Node.js / npm pruefen ----------
where npm >nul 2>&1
if errorlevel 1 (
    echo FEHLER: npm wurde nicht gefunden.
    echo.
    echo Bitte Node.js von https://nodejs.org installieren und danach
    echo die Eingabeaufforderung neu oeffnen.
    echo.
    pause
    exit /b 1
)

REM ---------- Schritt 1: virtuelle Python-Umgebung ----------
if exist ".venv\Scripts\python.exe" (
    echo [1/3] Virtuelle Python-Umgebung vorhanden.
) else (
    echo [1/3] Virtuelle Python-Umgebung wird angelegt ...
    python -m venv .venv
)

if not exist ".venv\Scripts\python.exe" (
    echo.
    echo FEHLER: Die virtuelle Umgebung konnte nicht angelegt werden.
    echo Bitte den Ordner .venv loeschen und dieses Skript erneut starten.
    echo.
    pause
    exit /b 1
)

set "VENV_PYTHON=%~dp0.venv\Scripts\python.exe"

REM ---------- Schritt 2: Python-Abhaengigkeiten ----------
"%VENV_PYTHON%" -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [2/3] Python-Abhaengigkeiten werden installiert ...
    "%VENV_PYTHON%" -m pip install --upgrade pip
    "%VENV_PYTHON%" -m pip install -r requirements.txt
) else (
    echo [2/3] Python-Abhaengigkeiten vorhanden.
)

"%VENV_PYTHON%" -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo.
    echo FEHLER: Die Python-Abhaengigkeiten konnten nicht installiert werden.
    echo Bitte die Meldungen oberhalb pruefen - haeufig fehlt die
    echo Internetverbindung oder ein Proxy blockiert pip.
    echo.
    pause
    exit /b 1
)

REM ---------- Schritt 3: Client-Abhaengigkeiten ----------
if exist "client\node_modules" (
    echo [3/3] Client-Abhaengigkeiten vorhanden.
) else (
    echo [3/3] Client-Abhaengigkeiten werden installiert.
    echo       Das dauert beim ersten Mal einige Minuten - bitte warten ...
    call npm install --prefix client
)

if not exist "client\node_modules" (
    echo.
    echo FEHLER: Die Client-Abhaengigkeiten konnten nicht installiert werden.
    echo Bitte die Meldungen oberhalb pruefen und danach im Projektordner
    echo manuell ausfuehren:  npm install --prefix client
    echo.
    pause
    exit /b 1
)

REM ---------- Start ----------
echo.
echo ============================================
echo    Alles bereit - der Budgetplaner startet
echo ============================================
echo.
echo Der Browser oeffnet sich gleich automatisch auf http://localhost:3000
echo Beim ersten Start kann das eine Minute dauern.
echo.
echo Zum Beenden: Strg + C druecken oder dieses Fenster schliessen.
echo.

"%VENV_PYTHON%" scripts\dev.py

echo.
echo Der Budgetplaner wurde beendet.
pause
endlocal
