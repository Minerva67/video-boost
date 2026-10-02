// Knock〃 Video Boost — stable component library
// Each component follows the entry order (入场顺序) of 《可视化选型规范 v1.0 · 30 个核心模板》.
// A component is (id, data) → { html, js(tl) }; all times are absolute seconds.
// Theme roles — set by build.mjs from brand/themes/<name>/theme.json (default Knock〃).
export const TH = { paper: '#FBF8F1', card: '#FFFFFF', ink: '#151716', ink70: '#5B5D5C', ink40: '#A1A2A2', line: '#E3DFD5', mark: '#FAE36B', markInk: '#151716', accent: '#EF6A2F', frame: '#151716' };
export const setTheme = (t) => Object.assign(TH, t);
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// :slug: → inline brand icon from brand/icons/<slug>.svg (mono, inherits text colour)
import fs from 'node:fs';
const ICON_DIR = new URL('./brand/icons/', import.meta.url);
const icoCache = {};
export const ico = (slug) => {
  if (!(slug in icoCache)) { try { icoCache[slug] = fs.readFileSync(new URL(slug + '.svg', ICON_DIR), 'utf8').replace(/<title>.*?<\/title>/, '').replace(/ (width|height)="[^"]*"/g, '').replace(/style="[^"]*"/, '').replace('<svg', '<svg class="ico" aria-hidden="true"'); } catch { icoCache[slug] = ''; } }
  return icoCache[slug];
};
export const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<em>$1</em>').replace(/&lt;br&gt;/g, '<br>').replace(/:([a-z0-9-]+):/g, (m, k) => ico(k) || m);
const knock = (sel, t) => `tl.to(${JSON.stringify(sel)}, {scale: 1.06, duration: .08, ease: 'power2.out'}, ${t});
tl.to(${JSON.stringify(sel)}, {scale: 1, duration: .1, ease: 'power2.in'}, ${t + .08});
tl.to(${JSON.stringify(sel)}, {scale: 1.06, duration: .08, ease: 'power2.out'}, ${t + .22});
tl.to(${JSON.stringify(sel)}, {scale: 1, duration: .14, ease: 'power2.in'}, ${t + .30});`;
const rise = (sel, t, d = .5) => `tl.from(${JSON.stringify(sel)}, {y: 36, opacity: 0, duration: ${d}, ease: 'expo.out'}, ${t});`;

export const C = {
  // ---------- chrome: title card over silent cold open ----------
  title: (id, d) => ({
    html: `<div class="k-title"><div class="kick" id="${id}-k"><span class="k-kicker">${esc(d.kicker)}</span></div><h1 id="${id}-h">${md(d.title).replace(/<em>/g, '<em class="y">')}</h1></div>`,
    js: `${rise(`#${id}-k`, d.at)}
tl.from('#${id}-h', {y: 60, opacity: 0, duration: .7, ease: 'expo.out'}, ${d.at + .1});
${d.knockAt ? knock(`#${id}-h em`, d.knockAt) : ''}`,
  }),

  // ---------- NUM-05 占比图 · 环形变体：整体先出 → 分量按口播顺序生长 → 数值标签 ----------
  share: (id, d) => {
    const R = 190, L = 2 * Math.PI * R;
    return {
      html: `<div class="k-share">
  <div class="head" id="${id}-q">${md(d.question)}</div>
  <div class="formula" id="${id}-f">${md(d.formula)}</div>
  <div class="ringwrap"><svg viewBox="0 0 470 470" width="470" height="470">
    <circle id="${id}-whole" cx="235" cy="235" r="${R}" fill="none" stroke="${TH.ink}" stroke-width="1.5"/>
    <circle id="${id}-a" cx="235" cy="235" r="${R}" fill="none" stroke="${TH.line}" stroke-width="46" stroke-dasharray="${L}" stroke-dashoffset="${L}" transform="rotate(-90 235 235)"/>
    <circle id="${id}-b" cx="235" cy="235" r="${R}" fill="none" stroke="${TH.accent}" stroke-width="46" stroke-dasharray="${L}" stroke-dashoffset="${L}" transform="rotate(${-90 + 360 * d.a / 100} 235 235)"/>
  </svg>
  <div class="center"><div class="big" id="${id}-n">${esc(d.bLabel)}</div><div class="note" id="${id}-c">${md(d.centerNote)}</div></div>
  <div class="tag ta" id="${id}-ta">${md(d.aLabel)}</div>
  <div class="tag tb" id="${id}-tb">${md(d.bTag)}</div></div>
</div>`,
      js: `${rise(`#${id}-q`, d.at)}
${rise(`#${id}-f`, d.formulaAt)}
tl.from('#${id}-whole', {opacity: 0, scale: .85, transformOrigin: '50% 50%', duration: .5, ease: 'back.out(1.6)'}, ${d.wholeAt});
tl.to('#${id}-a', {strokeDashoffset: ${L * (1 - d.a / 100)}, duration: 1.1, ease: 'power3.out'}, ${d.aAt});
${rise(`#${id}-ta`, d.aAt + .6, .4)}
tl.to('#${id}-b', {strokeDashoffset: ${L * (1 - (100 - d.a) / 100)}, duration: .45, ease: 'expo.out'}, ${d.bAt});
${rise(`#${id}-tb`, d.bAt + .2, .4)}
tl.from('#${id}-n', {scale: .4, opacity: 0, duration: .45, ease: 'back.out(2)'}, ${d.noteAt - .1});
${rise(`#${id}-c`, d.noteAt + .1, .4)}
${knock(`#${id}-n`, d.noteAt + .6)}`,
    };
  },

  // ---------- TRM-01 定义卡 · 中英对照：术语 → 停 0.5s → 分隔线 → 释义 ----------
  definition: (id, d) => ({
    html: `<div class="k-def" id="${id}-card"><div class="term" id="${id}-t">${esc(d.term)}</div><div class="en" id="${id}-e">${esc(d.en)}</div>
  <i class="rule" id="${id}-r"></i><div class="meaning" id="${id}-m">${md(d.meaning)}</div>
  ${d.foot ? `<div class="foot" id="${id}-f">${md(d.foot)}</div>` : ''}</div>`,
    js: `tl.from('#${id}-card', {y: 50, opacity: 0, duration: .5, ease: 'expo.out'}, ${d.at - .2});
tl.from('#${id}-t', {scale: .6, opacity: 0, transformOrigin: '0% 80%', duration: .45, ease: 'back.out(2)'}, ${d.at});
${rise(`#${id}-e`, d.at + .2, .35)}
tl.from('#${id}-r', {scaleX: 0, transformOrigin: '0 50%', duration: .35, ease: 'power3.out'}, ${d.at + .75});
${rise(`#${id}-m`, Math.max(d.meaningAt, d.at + .9))}
${d.foot ? rise(`#${id}-f`, d.footAt) + knock(`#${id}-f`, d.footAt + .5) : ''}`,
  }),

  // ---------- NUM-01 数据大牌：小标签 → 数值 → 下划线扫出 → 出处 ----------
  stat: (id, d) => ({
    html: `<div class="k-stat"><div class="label" id="${id}-l">${md(d.label)}</div><div class="num" id="${id}-n">${esc(d.num)}</div>
  <i class="under" id="${id}-u"></i><div class="src" id="${id}-s">${md(d.source)}</div></div>`,
    js: `${rise(`#${id}-l`, d.labelAt)}
tl.from('#${id}-n', {y: 80, opacity: 0, duration: .55, ease: 'expo.out'}, ${d.numAt});
tl.from('#${id}-u', {scaleX: 0, transformOrigin: '0 50%', duration: .45, ease: 'power3.out'}, ${d.numAt + .45});
${rise(`#${id}-s`, d.sourceAt)}`,
  }),

  // ---------- CMP-01 同屏分栏（上下 / 左右变体）：旧侧 → 中缝劈下 → 新侧 ----------
  split: (id, d) => {
    const dir = d.dir || 'v';
    const side = (k, s) => `<div class="side ${k}" id="${id}-${k}"><div class="tag">${esc(s.tag)}</div><div class="head">${md(s.head)}</div>
      ${(s.items || []).map((x, i) => `<span class="chip" id="${id}-${k}${i}">${md(x.t)}</span>`).join('')}
      ${s.verdict ? `<div class="verdict" id="${id}-${k}v">${md(s.verdict)}</div>` : ''}</div>`;
    const itemsJs = (k, s) => (s.items || []).map((x, i) => x.at ? `tl.from('#${id}-${k}${i}', {scale: .5, opacity: 0, duration: .35, ease: 'back.out(2.2)'}, ${x.at});` : '').join('\n');
    return {
      html: `<div class="k-split ${dir}">${d.title ? `<div class="ttl" id="${id}-ttl">${md(d.title)}</div>` : ''}${side('old', d.old)}<i class="seam" id="${id}-seam"></i>${side('new', d.new)}</div>`,
      js: `${d.title ? rise(`#${id}-ttl`, d.old.at - .15) : ''}
tl.from('#${id}-old', {${dir === 'v' ? 'y: -40' : 'x: -40'}, opacity: 0, duration: .5, ease: 'expo.out'}, ${d.old.at});
${itemsJs('old', d.old)}
${d.old.verdict ? rise(`#${id}-oldv`, d.old.verdictAt) : ''}
tl.from('#${id}-seam', {${dir === 'v' ? 'scaleX' : 'scaleY'}: 0, duration: .35, ease: 'power3.inOut'}, ${d.new.at - .35});
tl.from('#${id}-new', {${dir === 'v' ? 'y: 40' : 'x: 40'}, opacity: 0, duration: .5, ease: 'expo.out'}, ${d.new.at});
${itemsJs('new', d.new)}
${d.new.verdict ? rise(`#${id}-newv`, d.new.verdictAt) + knock(`#${id}-newv`, d.new.verdictAt + .45) : ''}`,
    };
  },

  // ---------- ABS-01 物理隐喻 · 仪表盘（逼近 / 越线）：承载物先在场 → 动作 → 结果标注 ----------
  gauge: (id, d) => {
    const ang = (v) => -90 + 180 * v / d.max; // needle angle (deg), 0 = left
    return {
      html: `<div class="k-gauge"><svg viewBox="0 0 820 470" width="820" height="470">
    <path d="M60 430 A350 350 0 0 1 760 430" fill="none" stroke="${TH.line}" stroke-width="22"/>
    <path id="${id}-zone" d="M60 430 A350 350 0 0 1 760 430" fill="none" stroke="${TH.mark}" stroke-width="22" pathLength="100" stroke-dasharray="${100 - 100 * d.th / d.max} 100" stroke-dashoffset="${-100 * d.th / d.max}"/>
    
    <g id="${id}-thr" transform="rotate(${ang(d.th)} 410 430)"><line x1="410" y1="40" x2="410" y2="140" stroke="${TH.accent}" stroke-width="4" stroke-linecap="round"/></g>
    <g id="${id}-ndl" transform="rotate(${ang(0)} 410 430)" style="transform-box: view-box"><line x1="410" y1="430" x2="410" y2="120" stroke="${TH.ink}" stroke-width="6" stroke-linecap="round"/></g>
    <circle cx="410" cy="430" r="12" fill="${TH.ink}"/>
  </svg>
  <div class="thrlab" id="${id}-tl"><span class="a">${md(d.thLabel)}</span><span class="b">${md(d.thLabel2 || '')}</span></div>
  <div class="read" id="${id}-rd"><b id="${id}-num">0</b><small>${esc(d.unit)}</small></div>
  <div class="res" id="${id}-res"><span class="a">${md(d.result)}</span><span class="b">${md(d.result2 || '')}</span></div>
</div>`,
      js: `tl.from('#${id} .k-gauge svg', {opacity: 0, y: 40, duration: .5, ease: 'expo.out'}, ${d.at});
${rise(`#${id}-tl`, d.at + .3, .4)}
(() => { const n = document.getElementById('${id}-ndl'), o = {v: 0}, num = document.getElementById('${id}-num');
  const set = () => { n.setAttribute('transform', 'rotate(' + (${-90} + 180 * o.v / ${d.max}) + ' 410 430)'); num.textContent = o.v.toFixed(1); };
  tl.to(o, {v: ${d.th}, duration: 1.2, ease: 'power3.out', onUpdate: set}, ${d.sweepAt});
  tl.to(o, {v: ${d.th - 3}, duration: .8, ease: 'power2.inOut', onUpdate: set}, ${d.relabelAt});
  tl.to(o, {v: ${d.max * .93}, duration: 1.4, ease: 'power3.in', onUpdate: set}, ${d.passAt}); })();
${rise(`#${id}-rd`, d.sweepAt)}
${rise(`#${id}-res`, d.resultAt)}
tl.to(['#${id}-tl .a', '#${id}-res .a'], {opacity: 0, duration: .25}, ${d.relabelAt});
tl.fromTo(['#${id}-tl .b', '#${id}-res .b'], {opacity: 0}, {opacity: 1, duration: .3}, ${d.relabelAt + .2});
tl.to('#${id}-rd', {opacity: 0, duration: .25}, ${d.relabelAt});
${knock(`#${id}-res`, d.passAt + 1.3)}`,
    };
  },

  // ---------- ENU-03 逐行高亮（含「展开子项」变体，只允许展开一行）----------
  lines: (id, d) => ({
    html: `<div class="k-lines"><div class="hd" id="${id}-hd">${md(d.title)}</div><div class="axis" id="${id}-ax"><span>强</span><i></i><span>弱</span></div>
  ${d.rows.map((r, i) => `<div class="row${r.expand ? ' has-ex' : ''}" id="${id}-r${i}"><b>${String(i + 1).padStart(2, '0')}</b><span class="t">${md(r.t)}</span>${d.bars ? `<i class="sbar"><i id="${id}-sb${i}" style="width:${d.bars[i]}%"></i></i>` : ''}${r.expand ? `<em class="tag ex" id="${id}-x${i}">${md(r.expand)}</em>` : ''}${r.tag ? `<em class="tag" id="${id}-g${i}">${md(r.tag)}</em>` : ''}</div>`).join('')}
</div>`,
    js: `${rise(`#${id}-hd`, d.at)}
tl.from('#${id}-ax', {opacity: 0, duration: .4}, ${d.at + .2});
tl.from('#${id} .row', {opacity: 0, x: -30, duration: .35, stagger: .06, ease: 'expo.out'}, ${d.at + .3});
${d.rows.map((r, i) => r.at == null ? '' : `tl.to('#${id}-r${i}', {color: '${TH.ink}', x: 14, duration: .25, ease: 'power2.out'}, ${r.at - .15});
${i ? `tl.to('#${id}-r${i - 1}', {color: '${TH.ink70}', x: 0, duration: .25}, ${r.at - .15});` : ''}
${r.expand ? `tl.from('#${id}-x${i}', {x: 20, opacity: 0, duration: .35, ease: 'power2.out'}, ${r.expandAt});` : ''}
${r.tag ? `tl.from('#${id}-g${i}', {scale: .4, opacity: 0, duration: .35, ease: 'back.out(2.4)'}, ${r.tagAt});` : ''}
${r.decayAt ? `tl.to('#${id}-r${i} .t', {opacity: .35, duration: 1.6, ease: 'power1.in'}, ${r.decayAt});` : ''}
${d.bars && r.at != null ? `tl.from('#${id}-sb${i}', {scaleX: 0, transformOrigin: '0 50%', duration: .5, ease: 'power3.out'}, ${r.at});` : ''}
${d.bars && r.decayAt ? `tl.to('#${id}-sb${i}', {scaleX: .3, opacity: .4, duration: 1.8, ease: 'power2.inOut'}, ${r.decayAt + .2});` : ''}`).join('\n')}`,
  }),

  // ---------- ENU-04 层级结构 · 阶梯（横向递减）：逐级出现，当前级点亮；末级衰减 ----------
  ladder: (id, d) => ({
    html: `<div class="k-ladder"><div class="hd" id="${id}-hd">${md(d.title)}</div>
  ${d.steps.map((st, i) => `<div class="step" id="${id}-s${i}" style="width:${st.w}%"><b>${String(st.n).padStart(2, '0')}</b><span>${md(st.t)}</span>${st.s ? `<span class="s" id="${id}-x${i}">${md(st.s)}</span>` : ''}</div>`).join('')}</div>`,
    js: `${rise(`#${id}-hd`, d.at)}
${d.steps.map((st, i) => `tl.from('#${id}-s${i}', {scaleX: 0, opacity: 0, duration: .5, ease: 'expo.out'}, ${st.at - .15});
tl.to('#${id}-s${i}', {backgroundColor: '${TH.mark}', duration: .2}, ${st.at});
${i ? `tl.to('#${id}-s${i - 1}', {backgroundColor: '${TH.card}', duration: .2}, ${st.at});` : ''}
${st.s ? `tl.from('#${id}-x${i}', {x: 20, opacity: 0, duration: .35}, ${st.sAt});` : ''}
${st.decayAt ? `tl.to('#${id}-s${i}', {scaleX: .55, opacity: .45, backgroundColor: '${TH.card}', duration: 1.8, ease: 'power2.inOut'}, ${st.decayAt});` : ''}`).join('\n')}`,
  }),

  // ---------- TRM-03 反例对照：错误侧先立住 → 划掉 → 正确侧 ----------
  notthis: (id, d) => ({
    html: `<div class="k-not">${d.title ? `<div class="hd" id="${id}-hd">${md(d.title)}</div>` : ''}<div class="wrong" id="${id}-w"><span class="lab">${esc(d.wrongLab || '别问')}</span><span class="t">${md(d.wrong)}</span><i class="strike" id="${id}-s"></i></div>
  <div class="right" id="${id}-r"><span class="lab">${esc(d.rightLab || '要问')}</span><span class="t">${md(d.right)}</span></div>
  ${d.options ? `<div class="opts"${d.optSize ? ` style="font-size:${d.optSize}px"` : ''}>${d.options.map((o, i) => `<span class="opt o${i}" id="${id}-o${i}">${md(o.t)}</span>`).join(`<span class="or">${esc(d.or || '还是')}</span>`)}</div>` : ''}</div>`,
    js: `${d.title ? rise(`#${id}-hd`, d.titleAt ?? d.wrongAt - .3) : ''}
${rise(`#${id}-w`, d.wrongAt)}
tl.from('#${id}-s', {scaleX: 0, transformOrigin: '0 50%', duration: .35, ease: 'power3.out'}, ${d.strikeAt});
tl.to('#${id}-w', {opacity: .55, duration: .3}, ${d.strikeAt + .2});
${rise(`#${id}-r`, d.rightAt)}
${d.options ? `tl.from('#${id} .or', {opacity: 0, duration: .2}, ${d.options[1].at - .1});
${d.options.map((o, i) => `tl.from('#${id}-o${i}', {scale: 1.7, opacity: 0, rotate: ${i ? 5 : -5}, duration: .3, ease: 'power4.out'}, ${o.at - .05});`).join('\n')}
${knock(`#${id}-o1`, d.options[1].at + .4)}` : knock(`#${id}-r .t`, d.rightAt + .5)}`,
  }),

  // ---------- SEQ-03 流程图 · 纵向：起点方块 → 箭头画出 → 下一个方块（箭头晚于前、早于后）；终点异色描边 ----------
  chain: (id, d) => ({
    html: `<div class="k-chain">${d.title ? `<div class="hd" id="${id}-hd">${md(d.title)}</div>` : ''}
  ${d.steps.map((st, i) => `${i ? `<i class="arr" id="${id}-a${i}"></i>` : ''}<div class="node${i === d.steps.length - 1 ? ' end' : ''}" id="${id}-n${i}"><b>${esc(st.k || String(i + 1).padStart(2, '0'))}</b><span class="t">${md(st.t)}</span>${st.s ? `<span class="s" id="${id}-s${i}">${md(st.s)}</span>` : ''}</div>`).join('')}</div>`,
    js: `${d.title ? rise(`#${id}-hd`, d.at) : ''}
${d.steps.map((st, i) => `${i ? `tl.from('#${id}-a${i}', {scaleY: 0, transformOrigin: '50% 0', duration: .25, ease: 'power2.out'}, ${(st.at - .3).toFixed(2)});` : ''}
tl.from('#${id}-n${i}', {y: 24, opacity: 0, duration: .45, ease: 'expo.out'}, ${st.at.toFixed(2)});
${st.s ? rise(`#${id}-s${i}`, st.sAt ?? st.at + .4, .35) : ''}`).join('\n')}
${knock(`#${id}-n${d.steps.length - 1} .t`, d.steps[d.steps.length - 1].at + .5)}`,
  }),

  // ---------- ENU-02 网格清单 · 带勾选：全部空框同时出现（先给总量）→ 按口播逐格填充并点亮 ----------
  grid: (id, d) => ({
    html: `<div class="k-grid">${d.title ? `<div class="hd" id="${id}-hd">${md(d.title)}</div>` : ''}${d.sub ? `<div class="sub" id="${id}-sub">${md(d.sub)}</div>` : ''}
  <div class="cells c${d.cols || 3}">${d.items.map((x, i) => `<div class="cell" id="${id}-c${i}"><i class="ck" id="${id}-k${i}"></i><span class="t" id="${id}-t${i}">${md(x.t)}</span></div>`).join('')}</div></div>`,
    js: `${d.title ? rise(`#${id}-hd`, d.at) : ''}
${d.sub ? rise(`#${id}-sub`, d.subAt) : ''}
tl.from('#${id} .cell', {opacity: 0, y: 20, duration: .4, ease: 'expo.out'}, ${d.cellsAt.toFixed(2)});
${d.items.map((x, i) => `tl.from('#${id}-t${i}', {opacity: 0, y: 12, duration: .3, ease: 'expo.out'}, ${(x.at - .05).toFixed(2)});
tl.to('#${id}-c${i}', {backgroundColor: '${TH.mark}', borderColor: '${TH.ink}', duration: .2}, ${x.at.toFixed(2)});
tl.from('#${id}-k${i}', {scale: 0, duration: .3, ease: 'back.out(2.4)'}, ${(x.at + .1).toFixed(2)});
${i ? `tl.to('#${id}-c${i - 1}', {backgroundColor: '${TH.card}', duration: .2}, ${x.at.toFixed(2)});` : ''}`).join('\n')}
${d.allAt ? `tl.to('#${id} .cell', {backgroundColor: '${TH.card}', duration: .2}, ${d.allAt});` : ''}`,
  }),
  // ---------- NUM 趋势线 · 机制版（无刻度、不造数）：坐标轴 → 线 A 画出 → 端点标签 → 线 B 画出 → 两线间距标注 ----------
  trend: (id, d) => ({
    html: `<div class="k-trend"><svg viewBox="0 0 952 470" width="952" height="470">
    <line id="${id}-ax" x1="40" y1="420" x2="900" y2="420" stroke="${TH.ink}" stroke-width="1.5"/>
    <line id="${id}-ay" x1="40" y1="420" x2="40" y2="30" stroke="${TH.ink}" stroke-width="1.5"/>
    <path id="${id}-la" d="M40 70 C 300 110, 520 300, 880 360" fill="none" stroke="${TH.ink40}" stroke-width="6" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <path id="${id}-lb" d="${d.b.path || 'M40 150 C 300 140, 600 132, 880 126'}" fill="none" stroke="${TH.ink}" stroke-width="7" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <line id="${id}-gap" x1="880" y1="${d.gap.y1 ?? 140}" x2="880" y2="${d.gap.y2 ?? 346}" stroke="${TH.accent}" stroke-width="3" stroke-dasharray="6 8"/>
  </svg>
  <div class="yl" id="${id}-yl">${md(d.yLabel)}</div><div class="xl" id="${id}-xl">${md(d.xLabel)}</div>
  <div class="lab la" id="${id}-a">${md(d.a.t)}</div>
  <div class="lab lb" id="${id}-b" style="${d.b.pos || ''}">${md(d.b.t)}</div>
  <div class="gapl" id="${id}-g">${md(d.gap.t)}</div></div>`,
    js: `tl.from(['#${id}-ax', '#${id}-ay', '#${id}-yl', '#${id}-xl'], {opacity: 0, duration: .4}, ${d.at});
tl.to('#${id}-la', {strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut'}, ${d.a.at});
${rise(`#${id}-a`, d.a.labelAt, .4)}
tl.to('#${id}-lb', {strokeDashoffset: 0, duration: 1.4, ease: 'power3.out'}, ${d.b.at});
${rise(`#${id}-b`, d.b.at + .9, .4)}
tl.from('#${id}-gap', {scaleY: 0, transformOrigin: '50% 0', duration: .4, ease: 'power2.out'}, ${d.gap.at});
${rise(`#${id}-g`, d.gap.at + .2, .4)}
${knock(`#${id}-b`, d.gap.at + .6)}`,
  }),

  // ---------- 示意 · 简历改写：简历底稿 → 旧经历句划掉 → 新叙事句写出 → HR 扫描带扫过 → 技能空框按口播命中 ----------
  resume: (id, d) => ({
    html: `<div class="k-cv" id="${id}-card">
  <div class="top"><i class="av"></i><div class="nm">${d.who ? `<b>${md(d.who)}</b><small>${md(d.whoSub || '')}</small>` : '<i style="width:220px"></i><i style="width:340px" class="sm"></i>'}</div><span class="doc">简历 · 示意</span></div>
  <div class="sec">${esc(d.secLabel || '经历')}</div>
  ${(Array.isArray(d.old) ? d.old : [d.old]).map((o, k) => `<div class="line"><span class="old" id="${id}-old${k}">${md(o)}<i class="strike" id="${id}-st${k}"></i></span><span class="new" id="${id}-new${k}">${md((Array.isArray(d.new) ? d.new : [d.new])[k])}</span></div>`).join('')}
  <div class="sec">技能关键词</div>
  <div class="chips">${d.items.map((x, i) => `<span class="chip" id="${id}-c${i}"><span class="t" id="${id}-t${i}">${md(x.t)}</span><i class="ck" id="${id}-k${i}"></i></span>`).join('')}</div>
  <div class="scan" id="${id}-scan"><span>${md(d.scanLabel)}</span></div>
</div>`,
    js: `tl.from('#${id}-card', {y: 40, opacity: 0, duration: .5, ease: 'expo.out'}, ${d.at});
${(Array.isArray(d.old) ? d.old : [d.old]).map((o, k) => `tl.from('#${id}-old${k}', {opacity: 0, duration: .3}, ${d.at + .3 + k * .2});
tl.from('#${id}-st${k}', {scaleX: 0, transformOrigin: '0 50%', duration: .35, ease: 'power3.out'}, ${d.rewriteAt + k * .5});
tl.to('#${id}-old${k}', {opacity: 0, y: -16, duration: .3}, ${d.rewriteAt + .5 + k * .5});
tl.fromTo('#${id}-new${k}', {clipPath: 'inset(0 100% 0 0)'}, {clipPath: 'inset(0 0% 0 0)', duration: .9, ease: 'none'}, ${d.rewriteAt + .6 + k * .5});`).join('\n')}
tl.fromTo('#${id}-scan', {opacity: 0, y: 0}, {opacity: 1, duration: .2}, ${d.scanAt});
tl.to('#${id}-scan', {y: ${d.scanY ?? 290}, duration: 1.4, ease: 'power1.inOut'}, ${d.scanAt + .2});
tl.to('#${id}-scan', {opacity: 0, duration: .3}, ${d.scanAt + 1.7});
${d.items.map((x, i) => `tl.from('#${id}-t${i}', {opacity: 0, y: 10, duration: .25, ease: 'expo.out'}, ${(x.at - .05).toFixed(2)});
tl.to('#${id}-c${i}', {backgroundColor: '${TH.mark}', borderColor: '${TH.ink}', borderStyle: 'solid', duration: .2}, ${x.at.toFixed(2)});
tl.from('#${id}-k${i}', {scale: 0, duration: .3, ease: 'back.out(2.4)'}, ${(x.at + .1).toFixed(2)});`).join('\n')}
tl.to('#${id} .chip', {backgroundColor: '${TH.card}', duration: .3}, ${d.settleAt});`,
  }),

  // ---------- 示意 · 终端窗口：窗口 → 指令逐字打出 → 输出行按口播出现 → 依据标签 → 完成行 ----------
  term: (id, d) => {
    const rows = d.out.rows;
    return {
      html: `<div class="k-term" id="${id}-win"><div class="bar"><i></i><i></i><i></i><span>${esc(d.title)}</span></div><div class="body">
  ${d.prompts.map((p, i) => `<div class="pr" id="${id}-p${i}"><b>&gt;</b><span class="t">${[...p.t].map((ch) => `<i>${esc(ch)}</i>`).join('')}</span></div>`).join('')}
  <div class="out ${d.out.kind || 'list'}" id="${id}-out">${d.out.head ? `<div class="oh" id="${id}-oh">${md(d.out.head)}</div>` : ''}
    ${Array.from({ length: rows }, (_, i) => `<div class="row" id="${id}-r${i}">${d.out.numbered ? `<b>${String(i + 1).padStart(2, '0')}</b>` : ''}<i style="width:${[78, 62, 70, 54, 66, 58, 74, 50, 64, 60][i % 10]}%"></i>${d.out.tag ? `<span class="src" id="${id}-s${i}">${esc(d.out.tag)}</span>` : ''}</div>`).join('')}</div>
  ${d.done ? `<div class="done" id="${id}-d">✓ ${md(d.done.t)}</div>` : ''}</div></div>`,
      js: `tl.from('#${id}-win', {y: 40, opacity: 0, duration: .5, ease: 'expo.out'}, ${d.at});
${d.prompts.map((p, i) => `tl.from('#${id}-p${i}', {opacity: 0, duration: .15}, ${p.at});
tl.from('#${id}-p${i} .t i', {opacity: 0, duration: .01, stagger: ${((p.dur || 1.2) / [...p.t].length).toFixed(3)}}, ${p.at + .1});`).join('\n')}
${d.out.head ? rise(`#${id}-oh`, d.out.at, .35) : ''}
tl.from('#${id} .row', {opacity: 0, x: -14, duration: .25, stagger: ${d.out.stagger ?? .12}, ease: 'expo.out'}, ${d.out.at + (d.out.head ? .25 : 0)});
${d.out.tag ? `tl.from('#${id} .src', {scale: 0, opacity: 0, duration: .25, stagger: .18, ease: 'back.out(2.4)'}, ${d.out.tagAt});` : ''}
${d.done ? rise(`#${id}-d`, d.done.at, .35) + knock(`#${id}-d`, d.done.at + .4) : ''}`,
    };
  },
  // ---------- CTA · 结尾行动卡（动作取自 HyperFrames tiktok-follow：自底滑入 → 按钮按下回弹；换成 Knock 敲两下） ----------
  cta: (id, d) => ({
    html: `<div class="k-cta" id="${id}-card"><i class="ic"><svg viewBox="0 0 48 48" width="44" height="44"><path d="M8 10h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H22l-9 8v-8H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill="none" stroke="${TH.ink}" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="22" r="2.5" fill="${TH.ink}"/><circle cx="24" cy="22" r="2.5" fill="${TH.ink}"/><circle cx="32" cy="22" r="2.5" fill="${TH.ink}"/></svg></i>
  <div class="tx"><b>${md(d.main)}</b>${d.sub ? `<small>${md(d.sub)}</small>` : ''}</div><span class="btn" id="${id}-btn">${md(d.btn)}</span></div>`,
    js: `tl.fromTo('#${id}-card', {y: 260, opacity: 0}, {y: 0, opacity: 1, duration: .5, ease: 'power3.out'}, ${d.at});
tl.to('#${id}-btn', {scale: .92, duration: .15, ease: 'power2.out'}, ${d.pressAt});
tl.to('#${id}-btn', {scale: 1, duration: .4, ease: 'elastic.out(1, 0.4)'}, ${d.pressAt + .15});
${knock(`#${id}-btn`, d.pressAt + .7)}`,
  }),
  // ---------- 示意 · Claude Code 会话：指令逐字 → 工具调用流 → 结果（表格/报告/来源）→ 完成；内容超高时像终端一样上滚 ----------
  cc: (id, d) => {
    const ev = d.events.map((e, i) => {
      const eid = `${id}-e${i}`;
      if (e.type === 'prompt') return { e, eid, html: `<div class="pr" id="${eid}"><b>&gt;</b><span class="t">${[...e.t].map((ch) => `<i>${esc(ch)}</i>`).join('')}</span></div>` };
      if (e.type === 'tool') return { e, eid, html: `<div class="tool" id="${eid}"><div class="call"><b>⏺</b><span class="nm">${esc(e.name)}</span><span class="arg">(${md(e.arg)})</span></div>${e.res ? `<div class="res" id="${eid}-r">⎿ ${md(e.res)}</div>` : ''}</div>` };
      if (e.type === 'note') return { e, eid, html: `<div class="note" id="${eid}"><b>⏺</b><span>${md(e.t)}</span></div>` };
      if (e.type === 'table') return { e, eid, html: `<div class="tbl" id="${eid}"><div class="th">${md(e.title)}</div>${e.rows.map((r, k) => `<div class="tr" id="${eid}-r${k}"><b>${String(k + 1).padStart(2, '0')}</b><span class="t">${md(r.t)}</span><i class="heat"><i style="width:${Math.round(r.heat * 100)}%"></i></i></div>`).join('')}</div>` };
      if (e.type === 'doc') return { e, eid, html: `<div class="doc" id="${eid}"><div class="dh">${md(e.head)}</div>${e.items.map((r, k) => `<div class="dr" id="${eid}-r${k}"><span class="k">${md(r.k)}</span><span class="v">${md(r.v)}</span><span class="src" id="${eid}-s${k}">${md(r.src)}</span></div>`).join('')}${e.foot ? `<div class="df" id="${eid}-f">${md(e.foot)}</div>` : ''}</div>` };
      if (e.type === 'done') return { e, eid, html: `<div class="dn" id="${eid}">✓ ${md(e.t)}</div>` };
    });
    return {
      html: `<div class="k-cc" id="${id}-win"><div class="bar"><i></i><i></i><i></i><span>${d.title.includes(':') ? md(d.title) : `<em class="star">✻</em> ${esc(d.title)}`}</span><small>${esc(d.tag || '示意')}</small></div>
  <div class="vp" id="${id}-vp"><div class="feed" id="${id}-feed">${ev.map((x) => x.html).join('')}</div></div></div>`,
      js: `tl.from('#${id}-win', {y: 40, opacity: 0, duration: .5, ease: 'expo.out'}, ${d.at});
${ev.map(({ e, eid }) => {
  if (e.type === 'prompt') return `tl.from('#${eid}', {opacity: 0, duration: .1}, ${e.at});
tl.from('#${eid} .t i', {opacity: 0, duration: .01, stagger: ${((e.dur || 1.2) / [...e.t].length).toFixed(3)}}, ${e.at + .05});`;
  if (e.type === 'tool') return `tl.from('#${eid} .call', {opacity: 0, x: -10, duration: .25}, ${e.at});
tl.fromTo('#${eid} .call b', {opacity: .2}, {opacity: 1, duration: .25, repeat: 2, yoyo: true}, ${e.at});
${e.res ? `tl.from('#${eid}-r', {opacity: 0, duration: .25}, ${e.resAt ?? e.at + .6});` : ''}`;
  if (e.type === 'note') return `tl.from('#${eid}', {opacity: 0, y: 10, duration: .3}, ${e.at});`;
  if (e.type === 'table') return `tl.from('#${eid}', {opacity: 0, duration: .25}, ${e.at});
tl.from('#${eid} .tr', {opacity: 0, x: -12, duration: .22, stagger: ${e.stagger ?? .12}}, ${e.at + .2});
tl.from('#${eid} .heat i', {scaleX: 0, transformOrigin: '0 50%', duration: .4, stagger: ${e.stagger ?? .12}, ease: 'power2.out'}, ${e.at + .35});
${(e.mark || []).map((m) => `tl.to('#${eid}-r${m.row}', {backgroundColor: '${TH.mark}', duration: .2}, ${m.at});`).join('\n')}`;
  if (e.type === 'doc') return `tl.from('#${eid}', {opacity: 0, duration: .25}, ${e.at});
tl.from('#${eid} .dr', {opacity: 0, x: -12, duration: .22, stagger: ${e.stagger ?? .25}}, ${e.at + .25});
tl.from('#${eid} .src', {scale: 0, opacity: 0, duration: .25, stagger: .15, ease: 'back.out(2.4)'}, ${e.srcAt});
${e.foot ? `tl.from('#${eid}-f', {opacity: 0, duration: .3}, ${e.footAt ?? e.srcAt + 1});` : ''}`;
  if (e.type === 'done') return `tl.from('#${eid}', {opacity: 0, y: 10, duration: .3}, ${e.at});
${knock(`#${eid}`, e.at + .4)}`;
}).join('\n')}
(() => { const vp = document.getElementById('${id}-vp'), feed = document.getElementById('${id}-feed'); let y = 0;
  const steps = ${JSON.stringify(ev.map(({ e, eid }) => ({ eid, at: e.type === 'table' ? e.at + .2 + (e.rows.length - 1) * (e.stagger ?? .12) : e.type === 'doc' ? e.at + .25 + (e.items.length - 1) * (e.stagger ?? .25) : e.at, follow: e.type === 'table' || e.type === 'doc' ? (e.stagger ?? (e.type === 'doc' ? .25 : .12)) : 0, rows: e.type === 'table' ? e.rows.length : e.type === 'doc' ? e.items.length : 0, start: e.at })))};
  steps.forEach((s) => { const el = document.getElementById(s.eid); const bottom = el.offsetTop + el.offsetHeight + 16;
    const ny = Math.max(0, bottom - vp.clientHeight); if (ny > y) { tl.to(feed, {y: -ny, duration: Math.max(.4, s.at - s.start), ease: 'power1.inOut'}, s.start + .1); y = ny; } }); })();`,
    };
  },
  // ---------- 示意 · 作品集页：日常用法（灰）→ 项目卡逐张出现 → 业务重构卡（手工 → agent） ----------
  folio: (id, d) => ({
    html: `<div class="k-folio" id="${id}-win"><div class="bar"><i></i><i></i><i></i><span>${esc(d.title)}</span><small>示意</small></div>
  <div class="body"><div class="daily" id="${id}-daily"><span class="lab">日常用法</span>${d.daily.map((x, i) => `<span class="chip" id="${id}-d${i}">${md(x.t)}</span>`).join('')}</div>
  <div class="grid">${d.cards.map((c, i) => `<div class="card" id="${id}-c${i}"><i class="th">${md(c.icon)}</i><b>${md(c.t)}</b><small>${md(c.tag)}</small></div>`).join('')}</div>
  <div class="re" id="${id}-re"><span class="lab">业务重构</span><span class="a">${md(d.re.from)}</span><i class="arr" id="${id}-arr"></i><span class="b" id="${id}-b">${md(d.re.to)}</span></div></div></div>`,
    js: `tl.from('#${id}-win', {y: 40, opacity: 0, duration: .5, ease: 'expo.out'}, ${d.at});
${d.daily.map((x, i) => `tl.from('#${id}-d${i}', {scale: .6, opacity: 0, duration: .3, ease: 'back.out(2)'}, ${x.at});`).join('\n')}
tl.to('#${id}-daily', {opacity: .45, duration: .4}, ${d.cards[0].at - .3});
${d.cards.map((c, i) => `tl.from('#${id}-c${i}', {y: 30, opacity: 0, duration: .45, ease: 'expo.out'}, ${c.at});`).join('\n')}
tl.from('#${id}-re', {opacity: 0, y: 20, duration: .4, ease: 'expo.out'}, ${d.re.at});
tl.from('#${id}-arr', {scaleX: 0, transformOrigin: '0 50%', duration: .4, ease: 'power2.out'}, ${d.re.at + .5});
tl.from('#${id}-b', {opacity: 0, x: -10, duration: .3}, ${d.re.at + .8});
${knock(`#${id}-b`, d.re.at + 1.3)}`,
  }),
  // ---------- 示意 · 功能对照表（做减法）：表头 → 你的产品逐行打勾 → ChatGPT 列逐行打勾 → 剩下那行点亮 = 你的价值 ----------
  checktable: (id, d) => ({
    html: `<div class="k-ct"><div class="hdr"><span class="t">${md(d.title)}</span><span class="c">${md(d.colA)}</span><span class="c">${md(d.colB)}</span></div>
  ${d.rows.map((r, i) => `<div class="row${r.mine ? ' mine' : ''}" id="${id}-r${i}"><span class="t">${md(r.t)}</span><span class="c"><i class="ck a" id="${id}-a${i}"></i></span><span class="c">${r.mine ? `<i class="x" id="${id}-b${i}">—</i>` : `<i class="ck b" id="${id}-b${i}"></i>`}</span></div>`).join('')}
  <div class="tag" id="${id}-tag">${md(d.tag)}</div><small class="note">示意</small></div>`,
    js: `tl.from('#${id} .hdr', {opacity: 0, y: 16, duration: .4, ease: 'expo.out'}, ${d.at});
tl.from('#${id} .row', {opacity: 0, x: -12, duration: .25, stagger: .07, ease: 'expo.out'}, ${d.at + .2});
tl.from('#${id} .ck.a', {scale: 0, duration: .2, stagger: .07, ease: 'back.out(2.4)'}, ${d.aAt});
tl.from('#${id} .ck.b, #${id} .x', {scale: 0, duration: .2, stagger: .1, ease: 'back.out(2.4)'}, ${d.bAt});
tl.to('#${id} .row.mine', {backgroundColor: '${TH.mark}', duration: .25}, ${d.mineAt});
${rise(`#${id}-tag`, d.tagAt, .4)}
${knock(`#${id}-tag`, d.tagAt + .5)}`,
  }),

  // ---------- SEQ-01 时间轴 · 真实数据：轴线 → 节点按口播点亮（柱高=上下文长度，对数刻度）→ 补丁块随节点碎掉 ----------
  ctxline: (id, d) => {
    const n = d.nodes.length, W = 952, x = (i) => 90 + i * ((W - 180) / (n - 1));
    const lg = (v) => Math.log10(v), lo = lg(d.min), hi = lg(d.max), h = (v) => 40 + 190 * (lg(v) - lo) / (hi - lo);
    return {
      html: `<div class="k-ctx"><div class="hd" id="${id}-hd">${md(d.title)}</div>
  <div class="plot"><i class="axis" id="${id}-ax"></i>
  ${d.nodes.map((nd, i) => `<div class="nd" id="${id}-n${i}" style="left:${x(i) - 80}px"><b class="bar" id="${id}-bar${i}" style="height:${h(nd.v)}px"></b><span class="v" style="bottom:${h(nd.v) + 82}px">${md(nd.label)}</span><span class="dt">${md(nd.date)}</span><span class="m">${md(nd.model)}</span></div>`).join('')}
  <div class="patch" id="${id}-patch"><svg class="pt-svg" viewBox="0 0 240 64" width="240" height="64">
    <path id="${id}-pl" d="M14 2 H120 V62 H14 Q2 62 2 50 V14 Q2 2 14 2 Z" fill="${TH.card}" stroke="${TH.accent}" stroke-width="3" stroke-dasharray="7 6"/>
    <path id="${id}-pr" d="M120 2 H226 Q238 2 238 14 V50 Q238 62 226 62 H120 Z" fill="${TH.card}" stroke="${TH.accent}" stroke-width="3" stroke-dasharray="7 6"/></svg>
    <span class="pt-t" id="${id}-pt">${md(d.patch.t)}</span></div></div>
  <div class="src" id="${id}-src">${md(d.src)}</div></div>`,
      js: `${rise(`#${id}-hd`, d.at)}
tl.from('#${id}-ax', {scaleX: 0, transformOrigin: '0 50%', duration: .6, ease: 'power2.out'}, ${d.at + .2});
${d.nodes.map((nd, i) => `tl.from('#${id}-n${i}', {opacity: 0, y: 14, duration: .35, ease: 'expo.out'}, ${nd.at});
tl.from('#${id}-bar${i}', {scaleY: 0, transformOrigin: '50% 100%', duration: .6, ease: 'power3.out'}, ${nd.at + .1});`).join('\n')}
${rise(`#${id}-patch`, d.patch.at, .35)}
tl.to('#${id}-pl', {morphSVG: 'M14 2 H112 L126 18 L110 34 L124 50 L116 62 H14 Q2 62 2 50 V14 Q2 2 14 2 Z', duration: .35, ease: 'power2.out'}, ${d.patch.breakAt[0]});
tl.to('#${id}-pr', {morphSVG: 'M128 2 H226 Q238 2 238 14 V50 Q238 62 226 62 H124 L132 50 L118 34 L134 18 Z', duration: .35, ease: 'power2.out'}, ${d.patch.breakAt[0]});
tl.to('#${id}-pt', {opacity: .5, duration: .3}, ${d.patch.breakAt[0]});
tl.to('#${id}-pl', {x: -26, y: 70, rotation: -18, transformOrigin: '50% 50%', opacity: 0, duration: .7, ease: 'power2.in'}, ${d.patch.breakAt[d.patch.breakAt.length - 1]});
tl.to('#${id}-pr', {x: 26, y: 90, rotation: 22, transformOrigin: '50% 50%', opacity: 0, duration: .7, ease: 'power2.in'}, ${d.patch.breakAt[d.patch.breakAt.length - 1]});
tl.to('#${id}-pt', {opacity: 0, y: 30, duration: .4}, ${d.patch.breakAt[d.patch.breakAt.length - 1]});
tl.from('#${id}-src', {opacity: 0, duration: .3}, ${d.srcAt});`,
    };
  },

  // ---------- 真实数据 · 赛道占位表：赛道行随口播出现 → 模型公司已上线的产品逐个落位 → 底部横向↔垂直危险度色带 ----------
  occupied: (id, d) => ({
    html: `<div class="k-occ"><div class="hd" id="${id}-hd">${md(d.title)}</div>
  ${d.rows.map((r, i) => `<div class="row" id="${id}-r${i}"><span class="t">${md(r.t)}</span><span class="ps">${r.products.map((p, k) => `<span class="p" id="${id}-p${i}-${k}">${md(p)}</span>`).join('')}</span></div>`).join('')}
  <div class="axis" id="${id}-ax"${d.axis.hide ? ' style="display:none"' : ''}><span class="l">${md(d.axis.l)}</span><i class="band"><i class="dot" id="${id}-dot"></i></i><span class="r">${md(d.axis.r)}</span></div>
  <div class="src" id="${id}-src">${md(d.src)}</div></div>`,
    js: `${rise(`#${id}-hd`, d.at)}
${d.rows.map((r, i) => `tl.from('#${id}-r${i}', {opacity: 0, x: -14, duration: .3, ease: 'expo.out'}, ${r.at});
tl.from('#${id} #${id}-r${i} .p', {scale: .4, opacity: 0, duration: .25, stagger: .12, ease: 'back.out(2.4)'}, ${r.at + .25});`).join('\n')}
tl.from('#${id}-ax', {opacity: 0, y: 14, duration: .35}, ${d.axis.at});
(() => { const band = document.querySelector('#${id} .band'); const w = band ? band.clientWidth : 600; tl.to('#${id}-dot', {x: w * .88, duration: 1.4, ease: 'power2.inOut'}, ${d.axis.moveAt}); })();
tl.from('#${id}-src', {opacity: 0, duration: .3}, ${d.axis.at + .3});`,
  }),
  // ===================== dense companion panels (render in the lower part of a tall zone via beat.below) =====================

  // HR 关键词筛选：计数 0→N 随命中跳动 + 分段进度条（演出「HR 按关键词筛」这个动作）
  kwmeter: (id, d) => {
    const N = d.steps.length;
    return {
      html: `<div class="k-kwm" id="${id}-p"><div class="lab">${md(d.label)}<small>示意</small></div>
  <div class="cnt"><span class="num">${Array.from({ length: N + 1 }, (_, k) => `<b id="${id}-n${k}">${k}</b>`).join('')}</span><span class="tot">/ ${N}</span></div>
  <div class="segs">${Array.from({ length: N }, (_, k) => `<i id="${id}-s${k}"></i>`).join('')}</div>
  <div class="note" id="${id}-note">${md(d.note || '')}</div></div>`,
      js: `tl.from('#${id}-p', {y: 30, opacity: 0, duration: .45, ease: 'expo.out'}, ${d.at});
gsap.set(${JSON.stringify(Array.from({ length: N }, (_, k) => `#${id}-n${k + 1}`).join(','))}, {opacity: 0});
${d.steps.map((t, k) => `tl.set('#${id}-n${k}', {opacity: 0}, ${t.toFixed(2)});
tl.set('#${id}-n${k + 1}', {opacity: 1}, ${t.toFixed(2)});
tl.fromTo('#${id}-n${k + 1}', {scale: 1.4}, {scale: 1, duration: .3, ease: 'back.out(2)'}, ${t.toFixed(2)});
tl.to('#${id}-s${k}', {backgroundColor: '${TH.mark}', borderColor: '${TH.ink}', duration: .2}, ${t.toFixed(2)});`).join('\n')}
${d.noteAt ? rise(`#${id}-note`, d.noteAt, .35) : ''}`,
    };
  },

  // 产出物预览 · 笔记卡片墙：卡片随结果逐张落位，交叉命中的卡片标出来
  notes: (id, d) => ({
    html: `<div class="k-notes" id="${id}"><div class="lab" id="${id}-lab">${md(d.title)}<small>示意</small></div>
  <div class="wall">${d.items.map((x, i) => `<div class="nc" id="${id}-c${i}"><i class="cv" style="background:${['var(--line-soft)', 'var(--paper)', 'var(--line)'][i % 3]}"><span>${String(i + 1).padStart(2, '0')}</span></i><b>${md(x.t)}</b><em class="tag" id="${id}-g${i}">${md(d.markTag || '')}</em></div>`).join('')}</div></div>`,
    js: `tl.from('#${id}-lab', {opacity: 0, duration: .3}, ${d.at});
${d.items.map((x, i) => `tl.from('#${id}-c${i}', {y: 18, opacity: 0, scale: .92, duration: .35, ease: 'back.out(1.6)'}, ${x.at.toFixed(2)});`).join('\n')}
gsap.set('#${id} .tag', {opacity: 0});
${(d.marks || []).map((m) => `tl.to('#${id}-c${m.i}', {borderColor: '${TH.accent}', duration: .2}, ${m.at});
tl.fromTo('#${id}-g${m.i}', {opacity: 0, scale: .4}, {opacity: 1, scale: 1, duration: .3, ease: 'back.out(2.4)'}, ${m.at});
${knock(`#${id}-c${m.i}`, m.at + .3)}`).join('\n')}
${d.dimAt ? `tl.to('#${id} .nc', {opacity: .35, duration: .4}, ${d.dimAt}); ${(d.marks || []).map((m) => `tl.to('#${id}-c${m.i}', {opacity: 1, duration: .1}, ${d.dimAt + .05});`).join(' ')}` : ''}`,
  }),

  // 报告预览 · 区间条：刻度轴 → 各来源数值落点 → 区间带 → logo 行 → 来源脚注
  rangebar: (id, d) => {
    const X = (v) => 4 + 92 * (v - d.min) / (d.max - d.min);
    const lo = Math.min(...d.points.map((p) => p.v)), hi = Math.max(...d.points.map((p) => p.v));
    return {
      html: `<div class="k-rng" id="${id}"><div class="lab" id="${id}-lab">${md(d.title)}</div>
  <div class="axis" id="${id}-ax">${d.ticks.map((t) => `<span style="left:${X(t)}%">${t}</span>`).join('')}<i class="band" id="${id}-band" style="left:${X(lo)}%;width:${X(hi) - X(lo)}%"></i>
  ${d.points.map((p, k) => `<i class="pt" id="${id}-p${k}" style="left:${X(p.v)}%"><b>${md(p.label)}</b></i>`).join('')}</div>
  <div class="unit">${md(d.unit)}</div>
  <div class="logos">${d.logos.map((l, k) => `<span class="lg" id="${id}-l${k}">${md(l)}</span>`).join('')}</div>
  <div class="src" id="${id}-src">${md(d.src)}</div></div>`,
      js: `tl.from('#${id}-lab', {opacity: 0, duration: .3}, ${d.at});
tl.from('#${id}-ax', {opacity: 0, duration: .4}, ${d.at + .1});
${d.points.map((p, k) => `tl.from('#${id}-p${k}', {y: -30, opacity: 0, duration: .4, ease: 'back.out(2)'}, ${p.at});`).join('\n')}
tl.from('#${id}-band', {scaleX: 0, transformOrigin: '0 50%', duration: .5, ease: 'power2.out'}, ${Math.max(...d.points.map((p) => p.at)) + .3});
tl.from('#${id} .lg', {y: 14, opacity: 0, duration: .3, stagger: .15, ease: 'expo.out'}, ${d.logosAt});
tl.from('#${id}-src', {opacity: 0, duration: .3}, ${d.srcAt});`,
    };
  },

  // NUM-05 · 堆叠条：整体 10 格先在 → 前 n 格（已被覆盖的部分）变灰 → 剩下的格点亮
  sharebar: (id, d) => ({
    html: `<div class="k-shb" id="${id}"><div class="bar">${Array.from({ length: d.n }, (_, k) => `<i id="${id}-s${k}" class="${k >= d.a ? 'mine' : ''}"></i>`).join('')}</div>
  <div class="lbl"><span class="a" id="${id}-la" style="width:${100 * d.a / d.n}%">${md(d.aLabel)}</span><span class="b" id="${id}-lb">${md(d.bLabel)}</span></div></div>`,
    js: `tl.from('#${id} .bar i', {opacity: 0, duration: .25, stagger: .03}, ${d.at});
tl.to(${JSON.stringify(Array.from({ length: d.a }, (_, k) => `#${id}-s${k}`).join(','))}, {backgroundColor: '${TH.ink40}', duration: .2, stagger: .07}, ${d.aAt});
${rise(`#${id}-la`, d.aAt + .5, .35)}
tl.to('#${id} .mine', {backgroundColor: '${TH.mark}', borderColor: '${TH.ink}', duration: .25}, ${d.bAt});
${rise(`#${id}-lb`, d.bAt + .1, .35)}
${knock(`#${id} .mine`, d.bAt + .5)}`,
  }),

  // 横向 ↔ 垂直坐标：模型公司的产品 logo 落在横向一侧；垂直一侧在结论处亮起「安全」
  field: (id, d) => ({
    html: `<div class="k-fld" id="${id}"><div class="axis"><span class="l">${md(d.left)}</span><i class="ln"></i><span class="r">${md(d.right)}</span></div>
  <div class="zl" id="${id}-zl">${d.dots.map((x, k) => `<span class="dot" id="${id}-d${k}">${md(x.t)}</span>`).join('')}<em>${md(d.leftTag)}</em></div>
  <div class="zr" id="${id}-zr"><em>${md(d.rightTag)}</em></div></div>`,
    js: `tl.from('#${id} .axis', {opacity: 0, duration: .4}, ${d.at});
${d.dots.map((x, k) => `tl.from('#${id}-d${k}', {y: -40, opacity: 0, duration: .4, ease: 'bounce.out'}, ${x.at.toFixed(2)});`).join('\n')}
tl.from('#${id}-zl em', {opacity: 0, duration: .3}, ${d.dangerAt});
tl.to('#${id}-zl', {backgroundColor: 'color-mix(in srgb, ${TH.accent} 10%, transparent)', duration: .4}, ${d.dangerAt});
tl.from('#${id}-zr', {opacity: 0, scale: .9, duration: .45, ease: 'back.out(1.8)'}, ${d.safeAt});
${knock(`#${id}-zr em`, d.safeAt + .5)}`,
  }),
  // ---------- ABS-01 物理隐喻 · 逃逸轨道（GSAP MotionPath + DrawSVG）：星球与引力圈先在场 → 火箭沿轨道加速 → 越过引力圈 ----------
  escape: (id, d) => ({
    html: `<div class="k-esc" id="${id}"><svg viewBox="0 0 952 560" width="952" height="560">
    <circle cx="250" cy="390" r="84" fill="${TH.ink}"/>
    <circle id="${id}-grav" cx="250" cy="390" r="190" fill="none" stroke="${TH.ink40}" stroke-width="3" stroke-dasharray="10 12"/>
    <path id="${id}-traj" d="M300 330 C 370 260, 430 210, 540 170 S 760 110, 900 50" fill="none" stroke="none"/>
    <path id="${id}-trail" d="M300 330 C 370 260, 430 210, 540 170 S 760 110, 900 50" fill="none" stroke="${TH.accent}" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 14"/>
    <g id="${id}-rk"><path d="M-30 -14 L22 0 L-30 14 L-20 0 Z" fill="${TH.accent}"/><circle cx="-2" cy="0" r="4" fill="${TH.card}"/></g>
  </svg>
  <div class="lbl l-planet" id="${id}-lp">${md(d.planet)}</div>
  <div class="lbl l-grav" id="${id}-lg">${md(d.grav)}</div>
  <div class="lbl l-rk" id="${id}-lr">${md(d.rocket)}</div>
  <div class="read" id="${id}-rd"><b id="${id}-num">0.0</b><small>${esc(d.unit)}</small><span>${md(d.readLabel)}</span></div>
  <div class="lbl l-out" id="${id}-lo">${md(d.out)}</div></div>`,
    js: `tl.from('#${id} svg', {opacity: 0, duration: .4}, ${d.at});
${rise(`#${id}-lp`, d.at + .2, .35)}
tl.fromTo('#${id}-grav', {drawSVG: '0%'}, {drawSVG: '100%', duration: .9, ease: 'power2.inOut'}, ${d.at + .3});
gsap.set('#${id}-rk', {x: 300, y: 330, rotation: -45});
tl.fromTo('#${id}-trail', {drawSVG: '0%'}, {drawSVG: '0% 55%', duration: 1.6, ease: 'power2.in'}, ${d.launchAt});
tl.to('#${id}-rk', {motionPath: {path: '#${id}-traj', align: '#${id}-traj', autoRotate: true, alignOrigin: [0.5, 0.5], start: 0, end: .55}, duration: 1.6, ease: 'power2.in'}, ${d.launchAt});
(() => { const o = {v: 0}, el = document.getElementById('${id}-num'); tl.to(o, {v: ${d.speed}, duration: 1.6, ease: 'power2.in', onUpdate: () => { el.textContent = o.v.toFixed(1); }}, ${d.launchAt}); })();
${rise(`#${id}-rd`, d.launchAt, .35)}
${rise(`#${id}-lr`, d.relabelAt, .35)}
tl.to('#${id}-grav', {stroke: '${TH.ink}', duration: .3}, ${d.gravAt});
${rise(`#${id}-lg`, d.gravAt, .35)}
tl.to('#${id}-trail', {drawSVG: '0% 100%', duration: 1.3, ease: 'power2.out'}, ${d.passAt});
tl.to('#${id}-rk', {motionPath: {path: '#${id}-traj', align: '#${id}-traj', autoRotate: true, alignOrigin: [0.5, 0.5], start: .55, end: 1}, duration: 1.3, ease: 'power2.out'}, ${d.passAt});
${rise(`#${id}-lo`, d.passAt + .6, .35)}
${knock(`#${id}-lo`, d.passAt + .9)}`,
  }),
};
