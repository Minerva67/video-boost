// Video Boost — generic build. usage: node build.mjs runs/<name>
// Reads runs/<name>/{source.mp4, transcript.json, captions.json, voiced.json, beats.mjs} → runs/<name>/public/index.html
// Render: npx hyperframes render runs/<name>/public --sdr -o runs/<name>/output.mp4
import fs from 'node:fs';
import path from 'node:path';
import { C, esc, setTheme, TH } from './components.mjs';
import rough from 'roughjs/bundled/rough.esm.js';
// hand-drawn annotation paths (rough.js, seeded → identical every render), drawn in a 1000×1000 box and stretched over the target
const RG = rough.generator();
const roughPath = (kind, seed) => {
  const o = { roughness: 1.5, bowing: 1.4, seed, strokeWidth: 1 };
  const shape = kind === 'circle' ? RG.ellipse(500, 500, 1060, 1000, o)
    : kind === 'box' ? RG.rectangle(10, 10, 980, 980, o)
    : kind === 'underline' ? RG.line(0, 960, 1000, 940, o)
    : kind === 'strike' ? RG.line(0, 520, 1000, 480, o)
    : RG.line(0, 500, 1000, 500, o);
  return RG.toPaths(shape).map((x) => x.d).join(' ');
};

const root = path.dirname(new URL(import.meta.url).pathname);
import { execFileSync } from 'node:child_process';
const ARGS = process.argv.slice(2), themeArg = (ARGS.find((a) => a.startsWith('--theme=')) || '').slice(8);
const RUN = path.resolve(ARGS.find((a) => !a.startsWith('--')) || 'runs/v5'), SRC = fs.existsSync(path.join(RUN, 'transcript.json')) ? RUN : path.join(root, 'runs/v4'), PUB = path.join(RUN, themeArg ? 'public-' + themeArg : 'public');
fs.mkdirSync(PUB, { recursive: true });
const D = +execFileSync(path.join(process.env.HOME, '.local/bin/ffprobe'), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(SRC, 'source.mp4')]).toString().trim();
const chars = JSON.parse(fs.readFileSync(path.join(SRC, 'transcript.json'), 'utf8')).chars;
const text = chars.map((c) => c.c).join('');
let HL = [];
const capsRaw = JSON.parse(fs.readFileSync(path.join(SRC, 'captions.json'), 'utf8'));
const t = (p, after = 0) => {
  p = p.replace(/ /g, ''); let i = 0;
  for (;;) { i = text.indexOf(p, i); if (i < 0) throw new Error('phrase not found: ' + p); if (chars[i].start >= after) return +chars[i].start.toFixed(2); i++; }
};

// ---------- theme + stage assets ----------
const THEME_NAME = themeArg || 'knock', TDIR = path.join(root, 'brand/themes', THEME_NAME);
const TM = JSON.parse(fs.readFileSync(path.join(TDIR, 'theme.json'), 'utf8'));
setTheme(TM);
fs.copyFileSync(path.join(root, 'brand', 'components.css'), path.join(PUB, 'components.css'));
fs.copyFileSync(path.join(root, 'node_modules/gsap/dist/gsap.min.js'), path.join(PUB, 'gsap.min.js'));
const PLUGINS = ['DrawSVGPlugin', 'MorphSVGPlugin', 'MotionPathPlugin'];   // GSAP bonus plugins (free since 2025, GSAP Standard License)
for (const p of PLUGINS) fs.copyFileSync(path.join(root, `node_modules/gsap/dist/${p}.min.js`), path.join(PUB, `${p}.min.js`));
fs.copyFileSync(path.join(TDIR, TM.logo), path.join(PUB, 'logo.svg'));
for (const f of TM.fonts || []) { fs.mkdirSync(path.dirname(path.join(PUB, f.file)), { recursive: true }); fs.copyFileSync(path.join(TDIR, f.file), path.join(PUB, f.file)); }
fs.writeFileSync(path.join(PUB, 'theme.css'), `/* theme: ${TM.name} */
${(TM.fonts || []).map((f) => `@font-face { font-family: '${f.family}'; src: url('${f.file}') format('truetype'); font-weight: 100 900; }`).join('\n')}
:root { --paper: ${TM.paper}; --card: ${TM.card}; --ink: ${TM.ink}; --ink70: ${TM.ink70}; --ink40: ${TM.ink40}; --line: ${TM.line}; --line-soft: ${TM.lineSoft};
  --mark: ${TM.mark}; --mark-ink: ${TM.markInk}; --accent: ${TM.accent}; --frame: ${TM.frame}; --stroke: ${TM.stroke}; --shadow: ${TM.shadow}; --r: ${TM.radius};
  --cn: ${TM.fontCn}; --en: ${TM.fontEn}; --mono: ${TM.fontMono}; }
`);
if (!fs.existsSync(path.join(PUB, 'source.mp4'))) fs.linkSync(path.join(SRC, 'source.mp4'), path.join(PUB, 'source.mp4'));

// ---------- beats (per video) ----------
const VR = JSON.parse(fs.readFileSync(path.join(SRC, 'voiced.json'), 'utf8'));
const GAPS = VR.slice(1).map((r, i) => [VR[i][1], r[0]]).filter(([a, b]) => b - a > .12);
// nearest speech pause: prefer within ±0.7s, else widen to ±1.4s (fast talkers); warn if none
const snap = (x) => { for (const win of [.7, 1.4]) { let best = null; for (const [a, b] of GAPS) { const m = (a + b) / 2; if (Math.abs(m - x) <= win && (best == null || Math.abs(m - x) < Math.abs(best - x))) best = m; } if (best != null) return +best.toFixed(2); }
  // fast talker, no pause at all: fall back to the nearest phrase break (caption start) within ±0.7s
  let cb = null; for (const c of capsRaw) if (Math.abs(c.start - x) <= .7 && (cb == null || Math.abs(c.start - x) < Math.abs(cb - x))) cb = c.start;
  if (cb != null) return +cb.toFixed(2);
  console.warn('snap: no pause or phrase break near', x); return +x.toFixed(2); };
const L = { full: { s: 1, x: 0, y: 0 }, split: { s: .62, x: 205, y: 730 }, dense: { s: .5, x: 270, y: 960 }, push: { s: 1.06, x: -32, y: -48 }, punch: { s: 1.14, x: -76, y: -112 } };
// snapBefore(x): for 'split' moves, x = when the graphic enters. The move is centred on the returned time and starts .4s
// earlier, so any pause/phrase break ≤ x + .4 keeps "person moves aside before the graphic enters". Prefer the latest
// real pause in [x-1.4, x+.4], else the latest phrase break (caption start) there, else x.
const snapBefore = (x) => { let best = null; for (const [a, b] of GAPS) { const m = (a + b) / 2; if (m <= x + .4 && x - m <= 1.4 && (best == null || m > best)) best = m; }
  if (best == null) for (const c of capsRaw) if (c.start <= x + .4 && x - c.start <= 1.4 && (best == null || c.start > best)) best = c.start;
  return +(best ?? x).toFixed(2); };
const beatsMod = (await import(path.join(RUN, 'beats.mjs'))).default({ t, D, snap, snapBefore });
HL = beatsMod.HL || [];
Object.assign(L, beatsMod.LAYOUT || {});
const { CH, B, CAM } = beatsMod, TRACK = beatsMod.TRACK || { intro: true, recap: false };
const caps = capsRaw.map((c, ci) => ({ ...c, chars: chars.filter((x) => x.cap === ci).map((x) => x.start), hl: HL.filter((h) => c.text.includes(h)) }));
console.log('camera:', CAM.map((k) => k.t + ':' + k.l).join(' '));
// guard: every graphic must enter after the camera has started moving aside
const layoutAt = (x) => { let cur = 'full'; for (const k of [...CAM].sort((a, b) => a.t - b.t)) if (k.t <= x) cur = k.l; return cur; };
for (const b of B) { if (b.c === 'title' || b.c === 'cta') continue; const k = [...CAM].filter((k) => (k.l === 'split' || k.l === 'dense') && k.t - .4 <= b.s + .6).sort((a, c) => c.t - a.t)[0];
  if (k && ['split', 'dense'].includes(layoutAt(b.s + .3)) && k.t - .4 > b.s) console.warn(`camera: '${b.c}' enters at ${b.s.toFixed(2)}s before the split move starts (${(k.t - .4).toFixed(2)}s) — use snapBefore()`); }

// ---------- compose ----------
let html = '', js = '', annots = '';
B.forEach((b, i) => {
  // annot: [{ sel, kind: 'circle'|'underline'|'box'|'strike', at, pad, dur, color }] — rough.js hand-drawn emphasis on a graphic's element
  (b.annot || []).forEach((a, k) => {
    const aid = `b${i}-a${k}`, col = TH[a.color || 'accent'] || a.color, pad = a.pad ?? 14;
    annots += `<svg class="annot" id="${aid}" viewBox="0 0 1000 1000" preserveAspectRatio="none"><path d="${roughPath(a.kind || 'circle', 7 + i * 13 + k)}" fill="none" stroke="${col}" stroke-width="${a.width ?? 4}" stroke-linecap="round" vector-effect="non-scaling-stroke" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`;
    js += `(() => { const root = document.getElementById('b${i}-in'), el = root && root.querySelector(${JSON.stringify(a.sel)}), svg = document.getElementById('${aid}');
  if (!el || !svg) { console.warn('annot target missing: ${a.sel}'); return; }
  root.appendChild(svg); let x = 0, y = 0, n = el; while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  const kind = ${JSON.stringify(a.kind || 'circle')}, w = el.offsetWidth, h = el.offsetHeight, p = ${pad};
  const box = kind === 'underline' ? [x - 4, y + h - 6, w + 8, 18] : kind === 'strike' ? [x - 6, y + h / 2 - 9, w + 12, 18] : [x - p, y - p, w + 2 * p, h + 2 * p];
  Object.assign(svg.style, {left: box[0] + 'px', top: box[1] + 'px', width: box[2] + 'px', height: box[3] + 'px'});
  tl.to('#${aid} path', {strokeDashoffset: 0, duration: ${a.dur ?? .6}, ease: 'power2.inOut'}, ${a.at.toFixed(2)}); })();\n`;
  });
  const id = `b${i}`, comp = C[b.c](id, b.d);
  // dense + below: main graphic in the upper part, a companion visual (a second load type) in the lower part
  let inner;
  if (b.c === 'title' || b.c === 'cta') inner = comp.html;
  else if (b.below) {
    const mainH = b.below.mainH ?? 460, gap = 24, sub = C[b.below.c](id + 'b', b.below.d);
    inner = `<div class="zone tall split2"><div class="z-main" style="--zh:${mainH}px">${comp.html}</div><div class="z-below" style="top:${mainH + gap}px;--zh:${760 - mainH - gap}px">${sub.html}</div></div>`;
    js += sub.js + '\n';
  } else inner = `<div class="zone${b.dense ? ' tall' : ''}">${comp.html}</div>`;
  html += `<div id="${id}" class="clip beat" data-start="${b.s.toFixed(2)}" data-duration="${(b.e - b.s).toFixed(2)}" data-track-index="${4 + (i % 2)}"><div class="in" id="${id}-in">${inner}</div></div>\n`;
  js += comp.js + '\n';
  if (b.e < D - .1) js += `tl.to('#${id}-in', {opacity: 0, y: -30, duration: .3, ease: 'power2.in'}, ${(b.e - .3).toFixed(2)});\n`;
});

// rail: progress + chapter chip
let rail = `<div class="rail"><div class="bar"><i id="railfill"></i></div><div class="ticks">${CH.slice(1).map(([s]) => `<i style="left:${(s / D * 100).toFixed(2)}%"></i>`).join('')}</div></div>\n`;
CH.forEach(([s, name], k) => {
  const e = k + 1 < CH.length ? CH[k + 1][0] : D;
  const NP = CH.length - (TRACK.intro ? 1 : 0) - (TRACK.recap ? 1 : 0), off = TRACK.intro ? 0 : 1, isRecap = TRACK.recap && k === CH.length - 1, isIntro = TRACK.intro && k === 0;
  const kk = k + off;
  const pills = Array.from({ length: NP }, (_, j) => j + 1).map((n) => {
    const st = isRecap || n < kk ? 'done' : n === kk ? 'on' : '';
    return `<span class="p ${st}" ${st === 'on' ? `id="pt${k}-on"` : ''}>${st === 'done' ? '✓' : String(n).padStart(2, '0')}${st === 'on' ? `<span>${esc(name)}</span>` : ''}</span>`;
  }).join('');
  const lead = isIntro || isRecap ? `<span class="lead">${NP} 点${isRecap ? ' · 讲完' : ''}</span>` : '';
  rail += `<div id="ch${k}" class="clip" data-start="${s.toFixed(2)}" data-duration="${(e - s).toFixed(2)}" data-track-index="20" style="position:absolute;inset:0;pointer-events:none"><div class="pts" id="ch${k}-c">${lead}${pills}</div></div>\n`;
  if (k === 0) js += `tl.from('#ch0-c', {x: -40, opacity: 0, duration: .45, ease: 'expo.out'}, .2);\n`;
  if (isIntro) {} else if (!isRecap) js += `tl.from('#pt${k}-on', {scale: .6, opacity: 0, duration: .4, ease: 'back.out(2)'}, ${s.toFixed(2)});\n`;
  else js += `tl.from('#ch${k}-c .p', {scale: .4, duration: .3, stagger: .15, ease: 'back.out(2.4)'}, ${s.toFixed(2)});\n`;
});
js += `tl.fromTo('#railfill', {scaleX: 0}, {scaleX: 1, duration: ${D}, ease: 'none'}, 0);\n`;

// camera
js += `const L = ${JSON.stringify(L)}, cam = document.getElementById('cam');
gsap.set(cam, {transformOrigin: '0 0', x: 0, y: 0, scale: 1});
${JSON.stringify(CAM)}.forEach(k => {
  const l = L[k.l], small = l.s < 1;
  const v = {x: l.x, y: l.y, scale: l.s, borderRadius: small ? 28 / l.s : 0, boxShadow: small ? '0 0 0 ' + (1 / l.s) + 'px ${TM.camLine}' : '0 0 0 0px ${TM.camLine}'};
  if (k.d === 0) tl.set(cam, v, k.t); else tl.to(cam, {...v, duration: k.d ?? .8, ease: k.d ? 'sine.inOut' : 'power2.inOut'}, Math.max(0, k.t - (k.d ? 0 : .4)));
});\n`;

// captions: HyperFrames caption-pill-karaoke (Knock palette)
let capHtml = '';
caps.forEach((c, i) => {
  const hl = new Set(); for (const h of c.hl || []) { const a = c.text.indexOf(h); if (a >= 0) for (let k = 0; k < h.length; k++) hl.add(a + k); }
  let n = 0, k = 0, sp = '';
  for (const tok of c.text.match(/[A-Za-z0-9.%]+| |./gu) || []) {
    if (tok === ' ') { sp += '<span class="gap"></span>'; k++; continue; }
    const tt = (c.chars || [])[n] ?? c.start; n += tok.length;
    sp += `<span class="w${hl.has(k) ? ' hl' : ''}" data-t="${tt}">${esc(tok)}</span>`; k += tok.length;
  }
  capHtml += `<div id="cap${i}" class="clip cap" data-start="${c.start}" data-duration="${(c.end - c.start).toFixed(3)}" data-track-index="9"><div class="pill">${sp}</div></div>\n`;
});
js += `document.querySelectorAll('.cap .pill').forEach(p => { let fs = 84; while (p.scrollWidth > 1000 && fs > 60) { fs -= 2; p.style.fontSize = fs + 'px'; } });
document.querySelectorAll('.cap').forEach(c => { const s = +c.dataset.start;
  c.querySelectorAll('.w').forEach((w, k) => { const col = w.classList.contains('hl') ? '${TM.caption.hl}' : '${TM.caption.read}';
    if (k === 0) { gsap.set(w, {color: col}); return; } tl.to(w, {color: col, duration: .1, ease: 'none'}, Math.max(s, +w.dataset.t - .05)); }); });\n`;

const page = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1080, height=1920"/>
<script src="gsap.min.js"></script>${PLUGINS.map((p) => `<script src="${p}.min.js"></script>`).join('')}<link rel="stylesheet" href="components.css"/><link rel="stylesheet" href="theme.css"/><style>.cap .w { color: ${TM.caption.unread}; }</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="1080" data-height="1920">
  <div id="cam"><video id="a-roll" class="clip" src="source.mp4" muted playsinline data-start="0" data-duration="${D}" data-track-index="0"></video></div>
  <audio id="a-roll-audio" src="source.mp4" data-start="0" data-duration="${D}" data-track-index="2" data-volume="1"></audio>
${html}<div id="annot-holder" style="display:none">${annots}</div>${rail}  <div class="logo${TM.logoPill === false ? ' bare' : ''}"><img src="logo.svg" alt="Knock〃"/></div>
  <div class="caps ${TM.caption.style}">
${capHtml}  </div>
</div>
<script>
gsap.registerPlugin(${PLUGINS.join(', ')});
const tl = gsap.timeline({paused: true});
${js}
tl.set({}, {}, ${D});
window.__timelines["main"] = tl;
tl.seek(0);
</script></body></html>`;
fs.writeFileSync(path.join(PUB, 'index.html'), page);
// manifest for eval.py
const strip = (h) => h.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
fs.writeFileSync(path.join(PUB, 'manifest.json'), JSON.stringify({ theme: THEME_NAME, src: path.relative(root, SRC), D, chapters: CH, camera: CAM, layouts: L,
  beats: B.map((b, i) => ({ i, c: b.c, below: b.below?.c, s: +b.s.toFixed(2), e: +b.e.toFixed(2), text: strip(C[b.c]('m' + i, b.d).html + (b.below ? ' ' + C[b.below.c]('mb' + i, b.below.d).html : '')) })),
  captions: caps.map((c) => ({ text: c.text, start: c.start, end: c.end })) }, null, 1));
console.log(path.basename(RUN) + ' built:', B.length, 'beats,', caps.length, 'captions,', CAM.length, 'camera keys');
