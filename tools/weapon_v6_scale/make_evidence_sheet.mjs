import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
const out='web/motion-labs/verification_weapon_v6_scale';
const sheet=`<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;width:1480px;background:#f4f5f7;color:#202b39;font:22px Arial,'Noto Sans CJK SC',sans-serif;padding:32px 40px}h1{font-size:34px;margin:0 0 12px}p{margin:8px 0;line-height:1.4}.note{font-size:20px;color:#506073}h2{font-size:25px;margin:30px 0 16px}.pair{position:relative}.row{position:relative;margin-bottom:10px}img{display:block;width:1400px;height:360px}.label{position:absolute;top:12px;left:16px;padding:7px 12px;background:#f8fafbea;border-radius:4px;font-size:21px}.guide{position:absolute;top:0;bottom:0;border-left:2px dashed #20866e;pointer-events:none;opacity:.85}.left{left:92px}.right{left:1308px}footer{font-size:17px;color:#596578;margin-top:26px;line-height:1.6}
</style><h1>原 M97 / M870 v6：同轴、同机位尺寸对照</h1><p>轴向全长均为 <strong>999.240041 mm</strong>。同一正交相机倍率，按几何中心对齐。</p><p class="note">M870 仅等比缩放 0.9992400408；保留精修源模型的比例、材质与泵柄分件。</p>
<h2>侧视 / Side view</h2><div class="pair"><div class="row"><img src="M97-side.png"><span class="label">原 M97 · 高 192.240 mm</span></div><div class="row"><img src="M870_v6-side.png"><span class="label">M870 v6 · 高 211.409 mm</span></div><div class="guide left"></div><div class="guide right"></div></div>
<h2>俯视 / Top view</h2><div class="pair"><div class="row"><img src="M97-top.png"><span class="label">原 M97 · 宽 44.000 mm</span></div><div class="row"><img src="M870_v6-top.png"><span class="label">M870 v6 · 宽 68.400 mm</span></div><div class="guide left"></div><div class="guide right"></div></div>
<footer>绿色虚线标示相同的枪尾与枪口轴向边界。两枪粗细不同来自模型本身；本次没有非等比挤压。<br>原 M97 取自基线 81d5a485 的 winchester1897.glb，不是 type97hawk。正交视宽 1.15 m，画面 1400 × 360。</footer>`;
fs.writeFileSync(`${out}/comparison.html`,sheet);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1480,height:2000},deviceScaleFactor:1});
await page.goto(pathToFileURL(path.resolve(out,'comparison.html')).href);await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
await page.screenshot({path:`${out}/M97-M870-v6-same-camera.png`,fullPage:true});await browser.close();
