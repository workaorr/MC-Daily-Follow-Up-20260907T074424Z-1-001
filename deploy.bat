@echo off
chcp 65001 >nul
echo ========================================================
echo    🚀 MC Daily Follow Up - Auto Deploy to GitHub / Vercel
echo ========================================================
echo.
echo [1/3] กำลังบันทึกไฟล์ที่มีการเปลี่ยนแปลง (git add)...
git add .

echo [2/3] กำลังสร้างบันทึกเวอร์ชัน (git commit)...
git commit -m "auto-deploy: update system features (%date% %time%)"

echo [3/3] กำลังส่งขึ้น GitHub เพื่อให้ Vercel อัปเดตออนไลน์ (git push)...
git push origin master

echo.
echo ========================================================
echo  ✅ Deploy สำเร็จเรียบร้อย! Vercel กำลังอัปเดตออนไลน์ให้ครับ
echo ========================================================
echo.
timeout /t 5
