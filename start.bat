@echo off
cd /d "%~dp0"
echo Starting Qari at http://localhost:8080 ...
where py >nul 2>nul && (start "" http://localhost:8080/index.html & py -m http.server 8080 & goto :eof)
where python >nul 2>nul && (start "" http://localhost:8080/index.html & python -m http.server 8080 & goto :eof)
echo Python not found. Just double-click index.html instead.
pause
