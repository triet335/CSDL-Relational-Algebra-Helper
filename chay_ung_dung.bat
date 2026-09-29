@echo off
chcp 65001 > nul
title CSDL Relational Algebra Helper
echo ==========================================================
echo   Đang khởi chạy CSDL Relational Algebra Helper (Local)
echo ==========================================================
echo.

:: Kiểm tra Node.js đã được cài đặt chưa
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [LỖI] Máy của bạn chưa cài đặt Node.js!
    echo Vui lòng truy cập https://nodejs.org để tải và cài bản Node.js (LTS).
    echo Sau khi cài xong, mở lại file này là được nhé.
    echo.
    pause
    exit /b 1
)

:: Kiểm tra nếu chưa có node_modules thì tự động cài đặt
if not exist "node_modules\" (
    echo [THÔNG BÁO] Đang cài đặt thư viện lần đầu (npm install)... Vui lòng đợi trong giây lát...
    call npm install
    echo.
)

echo [OK] Đang mở ứng dụng trên trình duyệt web...
echo Địa chỉ: http://localhost:5173
echo (Bấm Ctrl + C trong cửa sổ này nếu muốn tắt ứng dụng)
echo ----------------------------------------------------------
call npm run dev -- --open
pause
