@echo off
title Battery EPR Verification System - Hyperledger Fabric
echo ======================================================================
echo Starting Blockchain-Based EPR Verification System for India Battery Recycling
echo ======================================================================
set PATH=%~dp0tools\node;%PATH%
cd /d "%~dp0"
node start-all.js
pause
