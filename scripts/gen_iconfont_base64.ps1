# 重新生成 iconfont 字体的 base64 data URI。
# 用法：修改 assets/fonts/ 下的字体后运行本脚本，复制控制台输出的整行
#       data:font/woff;base64,....  替换 app.js 中的 iconfontDataUri 常量。
$src = "d:/github/qingba2.0/assets/fonts/iconfont.woff"
$bytes = [System.IO.File]::ReadAllBytes($src)
$b64 = [System.Convert]::ToBase64String($bytes)
Write-Host "data:font/woff;base64,$b64"
