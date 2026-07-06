@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0magpie.ps1"
if errorlevel 1 pause
