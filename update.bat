@echo off
cd /d "%~dp0"

echo Ajout des fichiers...
git add .

echo Commit des changements...
set /p msg=Entre ton message de commit : 
if "%msg%"=="" (
    set msg=Update automatique
)

git commit -m "%msg%"

echo Poussée vers GitHub...
git push origin main

echo Fini !
pause
