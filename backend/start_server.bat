@echo off
echo Starting AI Study Planner Backend Server...
echo.

set "INSTALL_DEPS=0"
if /I "%~1"=="--install" set "INSTALL_DEPS=1"

set "VENV_DIR="

REM Prefer .venv, but support legacy venv as fallback
if exist ".venv\Scripts\activate.bat" (
    set "VENV_DIR=.venv"
) else if exist "venv\Scripts\activate.bat" (
    set "VENV_DIR=venv"
) else (
    set "VENV_DIR=.venv"
    echo Virtual environment not found.
    echo Creating virtual environment in %VENV_DIR%...
    python -m venv %VENV_DIR%
    if errorlevel 1 (
        echo Failed to create virtual environment.
        exit /b 1
    )
)

echo Activating virtual environment: %VENV_DIR%
call %VENV_DIR%\Scripts\activate.bat
if errorlevel 1 (
    echo Failed to activate virtual environment.
    exit /b 1
)

set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    echo Python executable not found in %VENV_DIR%.
    exit /b 1
)

echo.
if "%INSTALL_DEPS%"=="1" (
    echo Installing/updating dependencies...
    "%PYTHON_EXE%" -m pip --version >nul 2>&1
    if errorlevel 1 (
        echo pip not found in virtual environment. Bootstrapping pip...
        "%PYTHON_EXE%" -m ensurepip --upgrade
        if errorlevel 1 (
            echo Failed to bootstrap pip using ensurepip.
            exit /b 1
        )
    )

    "%PYTHON_EXE%" -m pip install --upgrade pip
    if errorlevel 1 (
        echo Failed to upgrade pip.
        exit /b 1
    )

    "%PYTHON_EXE%" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo Failed to install dependencies.
        exit /b 1
    )
) else (
    echo Skipping dependency installation. Use start_server.bat --install to install/update packages.
)

echo.
echo Starting Flask server on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
"%PYTHON_EXE%" app.py

