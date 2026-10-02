// 网页截图：node grab.mjs <url> runs/<name>/assets/<file>.png [--desktop] [--height 2400] [--find "关键句" …] [--hide ".ad-box" …]
// 默认手机视口（390 宽、3 倍像素），截前 --height 个 CSS 像素；--find 输出关键句在图片里的像素框，直接填进 photo 组件的 marks。
// 只截公开页面；成片里必须写出处（credit）和网址（url）。
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
const [url, out, ...rest] = process.argv.slice(2);
if (!url || !out) { console.error('usage: node grab.mjs <url> <out.png> [--desktop] [--height N] [--find "text"]'); process.exit(1); }
const opt = { desktop: false, height: 2400, find: [], hide: [] };
for (let i = 0; i < rest.length; i++) { const a = rest[i]; if (a === '--desktop') opt.desktop = true; else if (a === '--height') opt.height = +rest[++i]; else if (a === '--find') opt.find.push(rest[++i]); else if (a === '--hide') opt.hide.push(rest[++i]); }
const [W, DPR] = opt.desktop ? [1280, 2] : [390, 3];
const browser = await puppeteer.launch({ executablePath: process.env.HYPERFRAMES_BROWSER_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: W, height: 900, deviceScaleFactor: DPR, isMobile: !opt.desktop });
if (!opt.desktop) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch((e) => console.error('load warning:', e.message));
await new Promise((r) => setTimeout(r, 1500));
// strip floating ads, cookie bars, sticky headers and anything listed in --hide: they would sit on top of the content
await page.evaluate((hide) => {
  for (const el of document.querySelectorAll('body *')) { const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') el.remove(); }
  for (const sel of hide) document.querySelectorAll(sel).forEach((el) => el.remove());
}, opt.hide);
const H = Math.min(opt.height, await page.evaluate(() => document.documentElement.scrollHeight));
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: W, height: H }, captureBeyondViewport: true });
const marks = await page.evaluate((needles, dpr) => {
  const res = [];
  for (const n of needles) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node, hit = null;
    while ((node = walker.nextNode())) { const i = node.data.indexOf(n); if (i >= 0) { const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + n.length); hit = r.getBoundingClientRect(); break; } }
    res.push(hit ? { find: n, x: Math.round((hit.left + scrollX) * dpr), y: Math.round((hit.top + scrollY) * dpr), w: Math.round(hit.width * dpr), h: Math.round(hit.height * dpr) } : { find: n, missing: true });
  }
  return res;
}, opt.find, DPR);
const title = await page.title();
await browser.close();
console.log(JSON.stringify({ out, url, title, w: W * DPR, h: H * DPR, marks }, null, 1));
