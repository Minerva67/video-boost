// Typography & safe-zone audit — opens the built page in headless Chrome, seeks the timeline into every graphic and measures
// the rendered text: effective font size (incl. GSAP scale), bounding box, characters. Output: <public>/audit.json (read by eval.py).
// usage: node audit.mjs runs/<name> [--public public] [--platform xhs|douyin|reels|shorts|none]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const run = path.resolve(args.find((a) => !a.startsWith('--')));
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pub = path.join(run, opt('--public', 'public'));
const platform = opt('--platform', 'xhs');
// platform UI overlays on a 1080×1920 frame (px kept clear) — sources in skill references/typography.md
const SAFE = {
  xhs: { top: 150, bottom: 200, right: 0, left: 0 },
  douyin: { top: 130, bottom: 484, right: 140, left: 0 },
  reels: { top: 180, bottom: 320, right: 160, left: 0 },
  shorts: { top: 110, bottom: 420, right: 140, left: 0 },
  none: { top: 0, bottom: 0, right: 0, left: 0 },
}[platform];
const M = JSON.parse(fs.readFileSync(path.join(pub, 'manifest.json'), 'utf8'));

const browser = await puppeteer.launch({ executablePath: process.env.HYPERFRAMES_BROWSER_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('pageerror:', e.message.slice(0, 300)));
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => { window.__timelines = window.__timelines || {}; });
await page.goto('file://' + path.join(pub, 'index.html'), { waitUntil: 'load' });
for (let k = 0; k < 60; k++) { if (await page.evaluate(() => !!(window.__timelines && window.__timelines.main))) break; await new Promise((r) => setTimeout(r, 300)); if (k === 59) throw new Error('timeline never registered'); }
await page.evaluate(() => document.fonts.ready);

const measure = (sel, t) => page.evaluate((sel, t) => {
  const tl = window.__timelines.main; tl.seek(t, false);
  // HyperFrames shows a clip only inside [data-start, data-start+duration]; emulate that for measurement
  document.querySelectorAll('[data-start][data-duration]').forEach((el) => {
    const s = +el.dataset.start, d = +el.dataset.duration; if (el.id === 'root') return;
    el.style.visibility = t >= s && t < s + d ? 'visible' : 'hidden';
  });
  const root = document.querySelector(sel); if (!root) return [];
  const out = [];
  const visible = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < .15) return false; } return true; };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const txt = n.textContent.replace(/\s+/g, ''); if (!txt) continue;
    const el = n.parentElement; if (!visible(el)) continue;
    const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect(); if (!b.width) continue;
    let clipped = false;   // text scrolled out of an overflow:hidden window (e.g. the terminal feed) is not on screen
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { if (getComputedStyle(p).overflow === 'hidden') { const q = p.getBoundingClientRect(); if (b.bottom < q.top + 2 || b.top > q.bottom - 2) { clipped = true; break; } } }
    if (clipped) continue;
    const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize);
    const sc = el.offsetHeight ? el.getBoundingClientRect().height / el.offsetHeight : 1;   // GSAP scale on ancestors
    out.push({ text: txt.slice(0, 24), chars: txt.length, fs: Math.round(fs), sc: +(isFinite(sc) ? sc : 1).toFixed(2), px: Math.round(fs * (isFinite(sc) && sc > 0 ? sc : 1)), cls: (el.className && el.className.baseVal === undefined ? el.className : '') || el.tagName.toLowerCase(),
      box: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] });
  }
  return out;
}, sel, t);

const beats = [];
for (const b of M.beats) {
  const samples = [];
  for (const f of [.55, .92]) samples.push(...await measure(`#b${b.i}-in`, b.s + (b.e - b.s) * f));
  const seen = new Map(); for (const x of samples) seen.set(x.text + x.px + x.box.join(), x);   // dedupe across the two samples
  beats.push({ i: b.i, c: b.c, below: b.below || null, s: b.s, e: b.e, items: [...seen.values()] });
}
// chrome (tracker, logo, captions) once, at a mid-video time
const mid = M.D * .5;
const chrome = { tracker: await measure('.rail', mid).then(() => page.evaluate(() => { const e = document.querySelector('.pts, .chap'); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); })),
  logo: await page.evaluate(() => { const b = document.querySelector('.logo').getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom].map(Math.round); }),
  captions: await page.evaluate(() => { const b = document.querySelector('.caps').getBoundingClientRect(); const p = document.querySelector('.cap .pill'); return { box: [b.left, b.top, b.right, b.bottom].map(Math.round), px: p ? Math.round(parseFloat(getComputedStyle(p).fontSize)) : null }; }) };
await browser.close();
fs.writeFileSync(path.join(pub, 'audit.json'), JSON.stringify({ platform, safe: SAFE, chrome, beats }, null, 1));
console.log(`audit → ${path.relative(process.cwd(), path.join(pub, 'audit.json'))}  (${beats.length} graphics, platform ${platform})`);
