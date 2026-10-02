"""Video Boost Eval — automatic checks + manual rubric scaffold.
usage: python3 eval.py runs/<name> [--public public-<theme>] [--video output-<theme>.mp4]
Reads <run>/<public>/manifest.json, <run>/voiced.json, <run>/source.mp4, <run>/<video>; writes <run>/eval[-<theme>].md and prints a summary.
Rubric definition: ~/.claude/skills/video-boost/references/eval.md
"""
import json, re, subprocess, sys, os

run = sys.argv[1]
opt = dict(zip(sys.argv[2::2], sys.argv[3::2]))
pub = opt.get('--public', 'public')
M = json.load(open(f'{run}/{pub}/manifest.json'))
theme = M['theme']
video = opt.get('--video', 'output.mp4' if pub == 'public' else f'output-{theme}.mp4')
SRCD = M.get('src', run) if os.path.exists(M.get('src', run)) else run
VR = json.load(open(f'{SRCD}/voiced.json'))
D = M['D']; B = M['beats']; CAPS = M['captions']; CAM = M['camera']; CAP_ON = M.get('captionsOn', True)
FF = os.path.expanduser('~/.local/bin/ffprobe')
dur = lambda f: float(subprocess.run([FF, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip() or 'nan')

R = []  # (id, group, name, status PASS/WARN/FAIL/INFO, detail)
def add(i, g, n, st, d): R.append((i, g, n, st, d))

# ---------------- A 门槛 ----------------
src_d = dur(f'{SRCD}/source.mp4')
out_path = f'{run}/{video}'
if os.path.exists(out_path):
    od = dur(out_path)
    add('A1', '门槛', '成片时长 = 原片', 'PASS' if abs(od - src_d) <= .05 else 'FAIL', f'原片 {src_d:.3f}s · 成片 {od:.3f}s')
else:
    add('A1', '门槛', '成片时长 = 原片', 'FAIL', f'找不到成片 {out_path}')

lint = subprocess.run(['npx', 'hyperframes', 'lint', f'{run}/{pub}'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__))).stdout
m = re.search(r'(\d+) error', lint)
add('A2', '门槛', 'HyperFrames lint 0 error', 'PASS' if m and m.group(1) == '0' else 'FAIL', (m.group(0) if m else 'lint 无输出'))

if not CAP_ON:
    add('A3', '门槛', '字幕', 'PASS', f'源片自带烧录字幕（画面 {M.get("burnedBand")}），本片按规则关闭了我们的字幕；A3–A5 不适用')
else:
    # speech without caption / caption over long silence
    def covered(a, b):
        return sum(max(0, min(b, c['end']) - max(a, c['start'])) for c in CAPS)
    miss = [(a, b) for a, b in VR if b - a >= .3 and covered(a, b) < .5 * (b - a)]
    add('A3', '门槛', '有语音就有字幕', 'PASS' if not miss else 'FAIL', f'{len(miss)} 段语音无字幕' + (f'：{[(round(a,1), round(b,1)) for a, b in miss[:5]]}' if miss else ''))
    def voiced_in(a, b): return sum(max(0, min(b, y) - max(a, x)) for x, y in VR)
    ghost = [c for c in CAPS if voiced_in(c['start'], c['end']) < .15]
    add('A4', '门槛', '无语音不出字幕', 'PASS' if not ghost else 'FAIL', f'{len(ghost)} 屏落在静音里')

    w = lambda s: sum(.5 if re.match(r'[A-Za-z0-9.\-]', ch) else 1 for ch in s if not ch.isspace())
    bad = [c for c in CAPS if c['end'] - c['start'] < 1 or w(c['text']) / max(c['end'] - c['start'], .01) > 9]
    long_ = [c for c in CAPS if w(c['text']) > 14]
    r = len(bad) / max(len(CAPS), 1)
    add('A5', '门槛', '字幕节奏（≥1s 且 ≤9 字/s）', 'PASS' if r <= .1 and not long_ else 'WARN' if r <= .2 else 'FAIL',
        f'{len(bad)}/{len(CAPS)} 屏超标（{r:.0%}），超 14 字的屏 {len(long_)}')

# ---------------- B 内容 ----------------
def grams(s):
    s = re.sub(r'[\s·，。、：；！？,.!?:;\-—→↑↓<>()（）「」“”"\'|/]', '', s)
    cj = re.findall(r'[一-鿿]', s)
    g = {''.join(cj[k:k + 2]) for k in range(len(cj) - 1)}
    g |= {x.lower() for x in re.findall(r'[A-Za-z]{3,}', s)}
    return g
restate = []
for b in B:
    if b['c'] in ('title', 'cta'): continue
    win = ''.join(c['text'] for c in CAPS if c['end'] > b['s'] - 1 and c['start'] < b['e'] + 1)
    g = grams(b['text']); cg = grams(win)
    ratio = len(g & cg) / max(len(g), 1)
    restate.append((b, ratio))
hi = [(b, x) for b, x in restate if x > .6]
avg = sum(x for _, x in restate) / max(len(restate), 1)
add('B1', '内容', '卡片不复述口播（字幕重合率）', 'PASS' if not hi and avg <= .45 else 'WARN' if len(hi) <= 1 else 'FAIL',
    f'平均重合 {avg:.0%}；>60% 的图形 {len(hi)} 个' + (f'：{[(b["c"], round(b["s"]), f"{x:.0%}") for b, x in hi]}' if hi else '') +
    '｜逐个：' + '，'.join(f'{b["c"]}@{b["s"]:.0f}s {x:.0%}' for b, x in restate))

speech = ''.join(c['text'] for c in CAPS)
# spoken Chinese numerals → digits (百分之九十 → 90%, 十一点二 → 11.2) so B2 doesn't flag numbers the speaker did say
CN = {'零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9}
def cn2int(x):
    if not x: return None
    if '十' in x:
        a, _, b = x.partition('十'); return (CN.get(a, 1) if a else 1) * 10 + (CN.get(b, 0) if b else 0)
    return CN.get(x)
speech += ' '.join(str(cn2int(m)) for m in re.findall(r'[零一二两三四五六七八九十]+', speech) if cn2int(m) is not None)
MOCK_SET = {'cc', 'folio', 'resume', 'checktable', 'term'}
nums_unsourced = []
for b in B:
    toks = re.findall(r'\d+(?:\.\d+)?\s*(?:[KkMB%]|亿|万|km/s)?', b['text'])
    toks = [t.strip() for t in toks if not re.fullmatch(r'0\d', t.strip()) and t.strip() not in ('1', '2', '3', '4', '5', '6') and not re.fullmatch(r'0+(\.0+)?\s*\S*', t.strip())]   # counters at 0 are not claims
    foreign = [t for t in toks if re.sub(r'\D', '', t) and re.sub(r'\D', '', t) not in re.sub(r'\D', '', speech)]
    if foreign and '来源' not in b['text'] and '①' not in b['text']:
        nums_unsourced.append((b['c'], b['s'], foreign[:4]))
hard = [x for x in nums_unsourced if x[0] not in MOCK_SET]
add('B2', '内容', '口播外的数字都有来源', 'FAIL' if hard else 'WARN' if nums_unsourced else 'PASS',
    f'数据类图形无来源数字 {len(hard)} 个' + (f'：{hard}' if hard else '') + (f'；示意界面内数字 {len(nums_unsourced) - len(hard)} 个（人工确认是示例而非数据）：{[x for x in nums_unsourced if x not in hard]}' if len(nums_unsourced) > len(hard) else ''))

MOCK = {'cc', 'folio', 'resume', 'checktable', 'term'}
unl = [(b['c'], b['s']) for b in B if b['c'] in MOCK and '示意' not in b['text']]
add('B3', '内容', '示意界面标「示意」', 'PASS' if not unl else 'FAIL', f'{len(unl)} 个未标' + (f'：{unl}' if unl else ''))

adj = [(B[k]['c'], B[k]['s']) for k in range(1, len(B)) if B[k]['c'] == B[k - 1]['c'] and B[k]['s'] - B[k - 1]['e'] < 4]
add('B4', '内容', '相邻图形不同版式', 'PASS' if not adj else 'WARN', f'{len(adj)} 处相邻同组件' + (f'：{adj}' if adj else ''))

cov = sum(b['e'] - b['s'] for b in B if b['c'] not in ('title', 'cta')) / D
nG = len([b for b in B if b['c'] not in ('title', 'cta')])
per_min = nG / (D / 60)
add('B5', '内容', '图形密度（覆盖 30–75%，每分钟 1–4 个）', 'PASS' if .3 <= cov <= .75 and 1 <= per_min <= 4 else 'WARN',
    f'覆盖 {cov:.0%}，{nG} 个图形（{per_min:.1f}/分钟）')
over20 = [(b['c'], b['s'], round(b['e'] - b['s'], 1)) for b in B if b['e'] - b['s'] > 20 and b['c'] not in ('cta',)]
add('B6', '内容', '单段 ≤20s（PRD V3）', 'PASS' if not over20 else 'WARN', f'{len(over20)} 段超 20s' + (f'：{over20}（承接型可接受）' if over20 else ''))

# ---------------- C 运镜 ----------------
GAPS = [(VR[k][1], VR[k + 1][0]) for k in range(len(VR) - 1)]
def in_gap(t, tol=.15):
    if any(a - tol <= t <= b + tol for a, b in GAPS) or t <= VR[0][0] + tol: return True
    # no real pause within ±1.4s (continuous speech) → a phrase break (caption start) is acceptable
    if not any(abs((a + b) / 2 - t) <= 1.4 for a, b in GAPS): return any(abs(c['start'] - t) <= .12 for c in CAPS)
    return False
eased = [k for k in CAM if k.get('d', None) is None]  # .8s layout changes (centred on k.t)
snapped = [k for k in eased if in_gap(k['t'])]
add('C1', '运镜', '让位/回全屏落在停顿里', 'PASS' if len(snapped) == len(eased) else 'WARN' if len(snapped) >= .8 * len(eased) else 'FAIL',
    f'{len(snapped)}/{len(eased)} 个镜头移动落在说话间隙' + (f'；未落在间隙：{[(k["l"], k["t"]) for k in eased if k not in snapped]}' if len(snapped) < len(eased) else ''))

def layout_at(t):
    cur = 'full'
    for k in sorted(CAM, key=lambda k: k['t']):
        if k['t'] <= t: cur = k['l']
    return cur
flip = []
seq = sorted(CAM, key=lambda k: k['t'])
for k in range(1, len(seq) - 1):
    if seq[k]['l'] in ('full', 'push') and seq[k - 1]['l'] in ('split', 'dense'):
        nxt = next((x for x in seq[k + 1:] if x['l'] in ('split', 'dense')), None)
        if nxt and nxt['t'] - seq[k]['t'] < 4: flip.append(round(seq[k]['t'], 1))
add('C2', '运镜', '不一缩一放（全屏 <4s 又让位）', 'PASS' if not flip else 'WARN', f'{len(flip)} 处' + (f'：{flip}' if flip else ''))

mis = []
for b in B:
    if b['c'] in ('title', 'cta'): continue
    for f in (.35, .65, .9):
        t = b['s'] + (b['e'] - b['s']) * f
        if layout_at(t) not in ('split', 'dense'): mis.append((b['c'], round(t, 1))); break
add('C3', '运镜', '图形在场时人一定让位', 'PASS' if not mis else 'FAIL', f'{len(mis)} 个图形压在全屏人像上' + (f'：{mis}' if mis else ''))

late = []
for b in B:
    if b['c'] in ('title', 'cta'): continue
    ks = [k for k in CAM if k['l'] in ('split', 'dense') and k['t'] - .4 <= b['s'] + .6]
    if ks:
        k = max(ks, key=lambda k: k['t'])
        if k['t'] - .4 > b['s'] + .02: late.append((b['c'], round(b['s'], 2), round(k['t'] - .4, 2)))
add('C6', '运镜', '让位先于图形入场', 'PASS' if not late else 'FAIL', f'{len(late)} 个图形比镜头先到' + (f'（组件, 图形入场, 镜头开始让位）：{late}' if late else ''))

punch = [k for k in CAM if k['l'] == 'punch']
add('C4', '运镜', '硬切放大只给钩子（≤1 次，前 15%）', 'PASS' if len(punch) <= 1 and all(k['t'] <= .15 * D for k in punch) else 'WARN', f'{len(punch)} 次 punch')
full_share = sum(1 for i in range(int(D * 2)) if layout_at(i / 2) in ('full', 'push', 'punch')) / int(D * 2)
add('C5', '运镜', '人单独在场占比（参考 25–60%）', 'PASS' if .25 <= full_share <= .6 else 'WARN', f'全屏/推近 {full_share:.0%}')

# ---------------- T 字号与安全区（需要先跑 node audit.mjs，读 <public>/audit.json）----------------
AUD = f'{run}/{pub}/audit.json'
if os.path.exists(AUD):
    A = json.load(open(AUD)); SCALE = {22, 28, 36, 54, 96, 140}; CAPPX = (A['chrome'].get('captions') or {}).get('px') or 76
    off, many, tiny, loud, microheavy, unsafe = [], [], [], [], [], []
    sf = A['safe']; top, bot, right = sf['top'] - 10, 1920 - sf['bottom'] + 10, 1080 - sf['right'] + 10   # 10px tolerance for glyph boxes
    for b in A['beats']:
        it = [x for x in b['items'] if x.get('sc', 1) >= .97 and x.get('sc', 1) <= 1.03]   # ignore elements caught mid-animation
        bad = sorted({x['fs'] for x in it if x['fs'] not in SCALE})
        if bad: off.append((b['c'], b['s'], bad))
        tiers = sorted({x['fs'] for x in it if x['fs'] in SCALE and 22 < x['fs'] < 96})   # micro (sources/labels) and display/hero are counted separately
        if len(tiers) > 3: many.append((b['c'], round(b['s']), tiers))
        sm = [x['text'] for x in it if x['px'] < 22 and x['chars'] >= 2]
        if sm: tiny.append((b['c'], round(b['s']), sm[:3]))
        big = list({(x['box'][2] // 40, x['box'][1] // 40): x['text'] for x in it if x['px'] > CAPPX}.values())   # same spot = same element across samples
        if len(big) > 1: loud.append((b['c'], round(b['s']), big[:3]))
        ch = sum(x['chars'] for x in it) or 1; mc = sum(x['chars'] for x in it if x['fs'] <= 22 and not re.search(r'src|df|foot|unit|^b$|tag|cv|sec|doc|lab', x['cls']))   # source footnotes and thumbnail cards may be micro
        if mc / ch > .25: microheavy.append((b['c'], round(b['s']), f'{mc / ch:.0%}'))
        out_ = [x['text'] for x in b['items'] if x['box'][1] < top or x['box'][3] > bot or x['box'][2] > right]
        if out_: unsafe.append((b['c'], round(b['s']), out_[:3]))
    cutl = [(b['c'], round(b['s']), [x['text'][:10] for x in b['items'] if x.get('cut')][:3]) for b in A['beats'] if any(x.get('cut') for x in b['items'])]
    add('T6', '字号', '文字没有被容器裁掉一半', 'PASS' if not cutl else 'FAIL', f'{len(cutl)} 个图形有被裁掉的文字' + (f'：{cutl}' if cutl else '') + '（终端渐隐、两行省略号不算）')
    add('T1', '字号', '字号都在阶梯上（22/28/36/54/96/140）', 'PASS' if not off else 'FAIL', f'{len(off)} 个图形有阶梯外字号' + (f'：{off}' if off else ''))
    add('T2', '字号', '每个图形 ≤3 档阅读字号（来源 micro、display/hero 另计）', 'PASS' if not many else 'WARN' if all(len(t) == 4 for *_, t in many) else 'FAIL', f'{len(many)} 个超标' + (f'：{many}' if many else ''))
    add('T3', '字号', '没有小于 22px 的文字', 'PASS' if not tiny else 'FAIL', f'{len(tiny)} 处' + (f'：{tiny}' if tiny else ''))
    add('T4', '字号', '字幕是最大的阅读文字（超过字幕字号的元素每图 ≤1）', 'PASS' if not loud else 'WARN', f'{len(loud)} 个图形' + (f'：{loud}' if loud else ''))
    add('T5', '字号', 'micro(22) 只给来源/标签（≤25% 字数）', 'PASS' if not microheavy else 'WARN', f'{len(microheavy)} 个图形' + (f'：{microheavy}' if microheavy else ''))
    ch_bad = [k for k, v in (('进度标', A['chrome'].get('tracker')), ('logo', A['chrome'].get('logo')), ('字幕', (A['chrome'].get('captions') or {}).get('box'))) if v and (v[1] < top or v[3] > bot or v[2] > right)]
    add('S1', '安全区', f'文字避开平台 UI（{A["platform"]}：上 {sf["top"]} / 下 {sf["bottom"]} / 右 {sf["right"]}px）', 'PASS' if not unsafe and not ch_bad else 'WARN',
        (f'界面骨架越界：{ch_bad}；' if ch_bad else '') + f'图形文字越界 {len(unsafe)} 处' + (f'：{unsafe}' if unsafe else ''))
else:
    add('T0', '字号', '字号与安全区检查', 'WARN', '没有 audit.json，先跑 node audit.mjs runs/<name>')

# ---------------- R 字幕（对照用户《【Eval】字幕增强》红线：能程序判的条目）----------------
CAPF = f'{SRCD}/captions.json'
if not CAP_ON:
    add('R0', '字幕', '双字幕（TS-11）', 'PASS', '源片自带字幕，已关闭我们的字幕，不会出现双字幕')
elif os.path.exists(CAPF):
    CJ = json.load(open(CAPF))
    if M.get('burnedBand'): add('R0', '字幕', '双字幕（TS-11）', 'FAIL', '源片自带字幕，但我们的字幕也开着')
    long7 = [c['text'] for c in CJ if c['end'] - c['start'] > 7]
    add('R11', '字幕', '单屏 ≤7 秒（R-11）', 'PASS' if not long7 else 'FAIL', f'{len(long7)} 屏超过 7 秒' + (f'：{long7[:3]}' if long7 else ''))
    if 's0' in CJ[0]:
        late = [(c['text'], round(c['start'] - c['s0'], 2)) for c in CJ if c['start'] > c['s0'] + .001]
        add('R12', '字幕', '字幕不晚于语音出现（R-12）', 'PASS' if not late else 'FAIL', f'{len(late)} 屏晚于语音' + (f'：{late[:3]}' if late else ''))
        ok = sum(1 for c in CJ if abs(c['start'] - c['s0']) <= .2 and abs(c['end'] - c['e0']) <= .2)
        r13 = ok / len(CJ)
        add('R13', '字幕', '起止与语音偏差 ≤200ms（R-13）', 'PASS' if r13 >= .95 else 'WARN' if r13 >= .85 else 'FAIL', f'{ok}/{len(CJ)} 屏达标（{r13:.0%}）')
    else:
        add('R12', '字幕', '字幕不晚于语音（R-12/13）', 'WARN', 'captions.json 没有 s0/e0，先用新版 align.py 重新对齐')
    unit = [(CJ[i]['text'], CJ[i + 1]['text']) for i in range(len(CJ) - 1) if re.search(r'[0-9一二三四五六七八九十百千两]$', CJ[i]['text']) and re.match(r'[万亿%％元块个岁年月天倍小时分秒公里米kKmMgG]', CJ[i + 1]['text'])]
    script_flat = ' '.join(c['text'] for c in CJ)
    names = [(CJ[i]['text'], CJ[i + 1]['text']) for i in range(len(CJ) - 1)
             if (m1 := re.search(r'([A-Za-z][\w.-]*)$', CJ[i]['text'])) and (m2 := re.match(r'([A-Za-z][\w.-]*)', CJ[i + 1]['text']))
             and re.search(re.escape(m1.group(1)) + r'\s+' + re.escape(m2.group(1)) + r'(?![|])', ' '.join(x['text'] for x in CJ if x is not CJ[i]))]
    add('R30', '字幕', '数字与单位、专名不被拆到两屏（R-27/28/30）', 'PASS' if not unit and not names else 'FAIL', f'数字单位 {len(unit)} 处、专名 {len(names)} 处' + (f'：{(unit + names)[:3]}' if unit or names else ''))
    hang = [c['text'] for c in CJ if not c.get('sentence_end') and re.search(r'(的|和|与|跟|在|把|被|对|给|从|向|或|及|而|地)$', c['text'])]
    add('R35', '字幕', '不以悬挂功能词结尾（R-35，人工复核）', 'PASS' if not hang else 'WARN', f'{len(hang)} 屏以「的/和/在…」结尾，句末语气词可接受，挂空的要改' + (f'：{hang[:6]}' if hang else ''))
    if os.path.exists(AUD) and A.get('capSamples'):
        cs = A['capSamples']
        two = [c['text'] for c in cs if c['lines'] > 1]
        add('R15', '字幕', '单屏 1 行（R-15）', 'PASS' if not two else 'FAIL', f'抽样 {len(cs)} 屏，{len(two)} 屏超过 1 行')
        fsr = sorted({round(c['fs'] / 1920 * 100, 2) for c in cs})
        add('R16', '字幕', '字号 3–4% 画面高（R-16，9:16）', 'PASS' if all(3 <= v <= 4.01 for v in fsr) else 'FAIL', f'{fsr}%')
        outb = [c['text'] for c in cs if c['box'][0] < 0 or c['box'][2] > 1080 or c['box'][1] < 0 or c['box'][3] > 1920]
        offc = [c['text'] for c in cs if abs((c['box'][0] + c['box'][2]) / 2 - 540) > 4]
        bm = sorted({round((1920 - c['box'][3]) / 1920 * 100, 1) for c in cs})
        add('R21', '字幕', '居中、不出界、底边距 15–20%（R-19/20/21）', 'PASS' if not outb and not offc and all(15 <= v <= 20 for v in bm) else 'FAIL',
            f'底边距 {bm}%；出界 {len(outb)}；偏离中线 {len(offc)}')
        hit = []
        for b in A['beats']:
            for c in b.get('caps', []):
                for x in b['items']:
                    bx = x['box']
                    if bx[0] < c['box'][2] and bx[2] > c['box'][0] and bx[1] < c['box'][3] and bx[3] > c['box'][1]: hit.append((b['c'], x['text'][:8])); break
        add('R24', '字幕', '字幕不压图形文字（R-24）', 'PASS' if not hit else 'FAIL', f'{len(hit)} 处重叠' + (f'：{hit[:3]}' if hit else ''))

# ---------------- report ----------------
# ---------- E 剪辑（references/editor.md）----------
LV = {'photo': 1, 'cc': 2, 'folio': 2, 'resume': 2, 'checktable': 2, 'escape': 2,
      'stat': 3, 'trend': 3, 'share': 3, 'gauge': 3, 'ctxline': 3, 'occupied': 3, 'kwmeter': 3, 'rangebar': 3, 'sharebar': 3, 'lines': 3, 'ladder': 3}
G = [b for b in B if b['c'] not in ('title', 'cta')]
lv = [LV.get(b['c'], 4) for b in G]
txt = sum(1 for x in lv if x == 4); hi = sum(1 for x in lv if x <= 2)
dist = '，'.join(f'{n}{lv.count(k)}' for k, n in ((1, '真实素材'), (2, '演示'), (3, '数据图'), (4, '文字卡')))
add('E1', '剪辑', '素材等级：文字卡 ≤ 一半，且至少一个真实素材或演示', 'PASS' if G and txt <= len(G) / 2 and hi >= 1 else 'WARN', dist + '（选文字卡要在 cut.md 写理由）')
# E2: inside a graphic, longest stretch with nothing moving (no tween running) — parsed from the built timeline
HTML = open(f'{run}/{pub}/index.html', encoding='utf8').read()
TW = re.findall(r"tl\.(?:from|to|fromTo|set)\('#(?:annot-)?(b\d+)[^']*',\s*(\{[^;]*?\}),\s*([0-9.]+)\);", HTML)
still = []
for b in G:
    bid = f"b{b['i']}"
    iv = sorted((float(t0), float(t0) + float((re.findall(r'duration:\s*([0-9.]+)', o) or [0])[-1])) for x, o, t0 in TW if x == bid)
    iv = [(a, z) for a, z in iv if a < b['e'] - .35]          # drop the exit tween
    cur, worst = b['s'], (0, b['s'])
    for a, z in iv:
        if a - cur > worst[0]: worst = (a - cur, cur)
        cur = max(cur, z)
    if b['e'] - .35 - cur > worst[0]: worst = (b['e'] - .35 - cur, cur)
    if worst[0] > 8: still.append((b['c'], round(worst[1], 1), round(worst[0], 1)))
add('E2', '剪辑', '图形里同一画面状态 ≤8s（要有新元素、滚动或划重点）', 'PASS' if not still else 'WARN', f'{len(still)} 处静止过久' + (f'（组件, 起点, 秒）：{still}' if still else ''))
# E3: person alone on screen with no camera move and no graphic for >30s
ev = sorted({0.0, D} | {b['s'] for b in G} | {b['e'] for b in G} | {k['t'] for k in CAM} | {k['t'] + (k.get('d') or 0) for k in CAM})
def on_graphic(t): return any(b['s'] <= t < b['e'] for b in G)
def moving(t): return any(k.get('d') and k['t'] <= t < k['t'] + k['d'] for k in CAM)
long_ = [(round(a, 1), round(z - a, 1)) for a, z in zip(ev, ev[1:]) if z - a > 30 and not on_graphic((a + z) / 2) and not moving((a + z) / 2)]
add('E3', '剪辑', '全屏段 ≤30s 无变化（没有图形也没有推近）', 'PASS' if not long_ else 'WARN', f'{len(long_)} 段' + (f'（起点, 秒）：{long_}' if long_ else ''))

icon = {'PASS': '✅', 'WARN': '⚠️', 'FAIL': '❌', 'INFO': 'ℹ️'}
gate_fail = any(st == 'FAIL' and i.startswith('A') for i, _, _, st, _ in R)
nP = sum(x[3] == 'PASS' for x in R)
BC = [x for x in R if not x[0].startswith('A')]  # B/C/T/S all count toward the auto score
auto = round(100 * sum({'PASS': 1, 'WARN': .5}.get(x[3], 0) for x in BC) / max(1, len(BC)))
title = f'# Video Boost Eval · {os.path.basename(run)} · 主题 {theme}\n'
lines = [title, f'成片：`{out_path}`　时长 {src_d:.1f}s　图形 {nG} 个\n',
         f'**门槛**：{"❌ 不通过（先修门槛项）" if gate_fail else "✅ 通过"}　**自动分（B+C+T+S）**：{auto}/100　通过 {nP}/{len(R)} 项\n',
         '\n| # | 组 | 检查 | 结果 | 明细 |\n|---|---|---|---|---|']
for i, g, n, st, d in R: lines.append(f'| {i} | {g} | {n} | {icon[st]} {st} | {d} |')
lines.append('''
## 人工评分（1–5，锚点见 skill references/eval.md）
| # | 维度 | 分 | 依据（写到秒） |
|---|---|---|---|
| H1 | 静音测试：关掉声音和字幕，每张图多给了什么 |  |  |
| H7 | 剪辑感：像剪辑师切的画面，而不是文字卡（真实素材 / 演示优先，一屏一件事，有焦点） |  |  |
| H2 | 演示力：提到的操作/产出物被真实演出来 |  |  |
| H3 | 事实诚实：示意不越界、数字来源可点开核对 |  |  |
| H4 | 品牌一致：只用主题色板/字体/圆角，强调色一屏一处 |  |  |
| H5 | 节奏与留白：人和图的切换跟着论证走，不挤不空 |  |  |
| H6 | 可读性：字号、对比、字幕不被压、不挡脸 |  |  |

**总分** = 门槛通过 ×（自动分 × 40% + 人工均分/5 × 60%）
''')
out = f'{run}/eval' + ('' if pub == 'public' else f'-{theme}') + '.md'
open(out, 'w').write('\n'.join(lines))
print('\n'.join(lines[:4])); [print(f'{i} {icon[st]} {n} — {d[:140]}') for i, g, n, st, d in R]; print('→', out)
