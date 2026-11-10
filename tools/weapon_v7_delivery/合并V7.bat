@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 merge_v7.py
) else (
  python merge_v7.py
)
echo.
if errorlevel 1 (
  echo 合并未完成。请查看上面的原因，确认全部分卷和校验文件在同一目录。
) else (
  echo 合并及校验已完成。请解压生成的整包，再按安装与验收说明操作。
)
pause
