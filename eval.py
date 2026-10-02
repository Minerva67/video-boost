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
D = M['D']; B = M['beats']; CAPS = M['captions']; CAM = M['camera']
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
long_ = [c for c in CAPS if w(c['text']) > 12]
r = len(bad) / max(len(CAPS), 1)
add('A5', '门槛', '字幕节奏（≥1s 且 ≤9 字/s）', 'PASS' if r <= .1 and not long_ else 'WARN' if r <= .2 else 'FAIL',
    f'{len(bad)}/{len(CAPS)} 屏超标（{r:.0%}），超 12 字的屏 {len(long_)}')

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
    toks = [t.strip() for t in toks if not re.fullmatch(r'0\d', t.strip()) and t.strip() not in ('1', '2', '3', '4', '5', '6')]
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
add('B5', '内容', '图形密度（覆盖 30–75%，每分钟 1.5–4 个）', 'PASS' if .3 <= cov <= .75 and 1.5 <= per_min <= 4 else 'WARN',
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

# ---------------- report ----------------
icon = {'PASS': '✅', 'WARN': '⚠️', 'FAIL': '❌', 'INFO': 'ℹ️'}
gate_fail = any(st == 'FAIL' and i.startswith('A') for i, _, _, st, _ in R)
nP = sum(x[3] == 'PASS' for x in R)
BC = [x for x in R if not x[0].startswith('A')]
auto = round(100 * sum({'PASS': 1, 'WARN': .5}.get(x[3], 0) for x in BC) / max(1, len(BC)))
title = f'# Video Boost Eval · {os.path.basename(run)} · 主题 {theme}\n'
lines = [title, f'成片：`{out_path}`　时长 {src_d:.1f}s　图形 {nG} 个\n',
         f'**门槛**：{"❌ 不通过（先修门槛项）" if gate_fail else "✅ 通过"}　**自动分（B+C）**：{auto}/100　通过 {nP}/{len(R)} 项\n',
         '\n| # | 组 | 检查 | 结果 | 明细 |\n|---|---|---|---|---|']
for i, g, n, st, d in R: lines.append(f'| {i} | {g} | {n} | {icon[st]} {st} | {d} |')
lines.append('''
## 人工评分（1–5，锚点见 skill references/eval.md）
| # | 维度 | 分 | 依据（写到秒） |
|---|---|---|---|
| H1 | 静音测试：关掉声音和字幕，每张图多给了什么 |  |  |
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
