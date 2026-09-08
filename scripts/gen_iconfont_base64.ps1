# 重新生成 iconfont 字体的 base64 data URI。
# 用法：修改 assets/fonts/ 下的字体后运行本脚本，复制控制台输出的整段
#       src: url(data:...truetype...) format("truetype"),
#            url(data:...woff...) format("woff");
#       替换 app.wxss 顶部 @font-face 里的 src 行。
#
# 注意：微信开发者工具内置 Chromium 对 woff 的 data URI 渲染支持很差（真机正常），
# 故同时内联 ttf 作为首选（src 顺序 ttf 优先、woff 兜底），模拟器与真机都能正常显示。
$root = "d:/github/qingba2.0"
$woff = [System.IO.File]::ReadAllBytes("$root/assets/fonts/iconfont.woff")
$ttf  = [System.IO.File]::ReadAllBytes("$root/assets/fonts/iconfont.ttf")
$woffB64 = [System.Convert]::ToBase64String($woff)
$ttfB64  = [System.Convert]::ToBase64String($ttf)

Write-Host "src: url(data:application/x-font-ttf;base64,$ttfB64) format(""truetype""),"
Write-Host "     url(data:application/font-woff;base64,$woffB64) format(""woff"");"
