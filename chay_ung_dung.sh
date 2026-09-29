#!/bin/bash
# Script khởi chạy CSDL Relational Algebra Helper trên máy Local
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "  Đang khởi chạy CSDL Relational Algebra Helper (Local)   "
echo "=========================================================="
echo "Trình duyệt sẽ tự động mở tại http://localhost:5173 ..."
echo "Bấm Ctrl + C trong cửa sổ này nếu muốn dừng ứng dụng."
echo "----------------------------------------------------------"

npm run dev -- --open
