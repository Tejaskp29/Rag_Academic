@echo off
title College RAG - Unified System Launcher
echo ==============================================================================
echo             College RAG: Multi-Branch Academic Knowledge Assistant
echo ==============================================================================
echo.

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo [1/2] Starting Flask Backend Engine on port 5000...
start "College RAG - Flask Backend (Port 5000)" cmd /k "cd /d "%SCRIPT_DIR%rag_ingestion" && (if exist venv\Scripts\activate.bat (call venv\Scripts\activate.bat) else (python -m venv venv && call venv\Scripts\activate.bat && pip install -r requirements.txt)) && python server.py"

echo Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js Academic Portal on port 3000...
start "College RAG - Next.js Frontend (Port 3000)" cmd /k "cd /d "%SCRIPT_DIR%rag_proj" && (if not exist node_modules (npm install)) && npm run dev"

echo.
echo ==============================================================================
echo System components launched:
echo   - Academic Assistant: http://localhost:3000/ask
echo   - Admin Ingestion Console: http://localhost:3000/admin
echo   - Flask Backend Engine: http://localhost:5000/documents
echo ==============================================================================
pause
