@echo off
REM Startet den Budgetplaner beim Windows-Login.
REM Die eigentliche Einrichtung und der Start liegen in start-budget-planner.cmd,
REM damit Autostart und manueller Start nicht auseinanderlaufen.
setlocal
cd /d "%~dp0\.."
start "Haushalts-Budgetplaner" cmd /k "start-budget-planner.cmd"
endlocal
