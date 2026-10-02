"""Align corrected script (| = caption breaks) to ASR token timestamps.
usage: python3 align.py runs/v1   → writes transcript.json (chars with times) + captions.json
Only the text is corrected; every time comes from ASR tokens (anchors = matched chars, gaps interpolated).
"""
import json, sys, difflib, re

run = sys.argv[1]
toks = json.load(open(f'{run}/tokens_beam.json'))['tokens']
script = open(f'{run}/script.txt').read().strip()

PUNCT = set(',，。.、!！?？:：;；%')
# ASR chars with per-char times (spread each token's span over its chars)
achars, atimes = [], []
for t in toks:
    txt = t['text'].strip()
    chars = [c for c in txt if c not in PUNCT and not c.isspace()]
    if not chars: continue
    n = len(chars); dur = max(t['end'] - t['start'], 0.02)
    for i, c in enumerate(chars):
        achars.append(c.lower())
        atimes.append((t['start'] + dur * i / n, t['start'] + dur * (i + 1) / n))

# script chars (skip spaces / breaks) with caption index
schars, scap = [], []
for ci, cap in enumerate(script.split('|')):
    for c in cap:
        if c.isspace(): continue
        schars.append(c); scap.append(ci)

# normalise digits spoken as Chinese numerals in ASR (九十 vs 90 etc.) — matcher works on raw chars; interpolation covers the rest
sm = difflib.SequenceMatcher(None, [c.lower() for c in schars], achars, autojunk=False)
st = [None] * len(schars); en = [None] * len(schars)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        st[a + k], en[a + k] = atimes[b + k]

# interpolate unmatched runs between anchors
N = len(schars)
i = 0
while i < N:
    if st[i] is not None: i += 1; continue
    j = i
    while j < N and st[j] is None: j += 1
    left = en[i - 1] if i > 0 else 0.0
    right = st[j] if j < N else atimes[-1][1]
    span = max(right - left, 0.01)
    for k in range(i, j):
        st[k] = left + span * (k - i) / (j - i)
        en[k] = left + span * (k - i + 1) / (j - i)
    i = j

# monotonic
for k in range(1, N):
    if st[k] < st[k - 1]: st[k] = st[k - 1]
    if en[k] < st[k]: en[k] = st[k] + 0.05

# ---- VAD retime: whisper stretches segment timestamps over leading silence; keep chars inside real speech ----
import subprocess, os, array, math
def voiced_runs(wav):
    ff = os.path.expanduser('~/.local/bin/ffmpeg')
    raw = subprocess.run([ff, '-v', 'error', '-i', wav, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    x = array.array('h', raw)
    hop, win = 160, 400
    db = []
    for i in range(0, len(x) - win, hop):
        seg = x[i:i + win]; e = math.sqrt(sum(v * v for v in seg) / win) / 32768
        db.append(20 * math.log10(e + 1e-6))
    thr = max(db) - 30
    runs, inside = [], False
    for i, d in enumerate(db):
        if d > thr and not inside: s0, inside = i, True
        elif d <= thr and inside:
            if i - s0 > 5: runs.append([s0 / 100, i / 100])
            inside = False
    merged = []
    for a, b in runs:
        if merged and a - merged[-1][1] < 0.12: merged[-1][1] = b
        else: merged.append([a, b])
    return merged
VR = voiced_runs(f'{run}/audio.wav')
json.dump(VR, open(f'{run}/voiced.json', 'w'))
segs_b = json.load(open(f'{run}/segs_beam.json'))
bounds = [sg['start'] for sg in segs_b] + [segs_b[-1]['end']]
def seg_of(tm):
    for k in range(len(bounds) - 1):
        if tm < bounds[k + 1]: return k
    return len(bounds) - 2
wts = [0.5 if re.match(r'[A-Za-z0-9.]', c) else 1.0 for c in schars]
by_seg = {}
for k in range(N): by_seg.setdefault(seg_of((st[k] + en[k]) / 2), []).append(k)
for sg, idxs in by_seg.items():
    a, b = bounds[sg], bounds[sg + 1]
    runs = [[max(x0, a), min(x1, b)] for x0, x1 in VR if x1 > a and x0 < b]
    total = sum(r[1] - r[0] for r in runs)
    if total <= 0: continue
    W = sum(wts[k] for k in idxs); acc = 0.0
    def at(v):  # v in [0,total] voiced-time → real time
        for r0, r1 in runs:
            if v <= r1 - r0 + 1e-9: return r0 + v
            v -= r1 - r0
        return runs[-1][1]
    for k in idxs:
        st[k] = at(total * acc / W); acc += wts[k]; en[k] = at(total * acc / W)

matched = sum(n for _, _, n in sm.get_matching_blocks())
json.dump({'chars': [{'c': c, 'start': round(s, 3), 'end': round(e, 3), 'cap': ci} for c, s, e, ci in zip(schars, st, en, scap)]},
          open(f'{run}/transcript.json', 'w'), ensure_ascii=False, indent=0)

# ---- captions ----
caps = []
texts = script.split('|')
for ci, text in enumerate(texts):
    idx = [k for k in range(N) if scap[k] == ci]
    caps.append({'text': text.strip(), 'start': st[idx[0]], 'end': en[idx[-1]]})

onsets = [r[0] for r in VR]
for c in caps:
    near = min(onsets, key=lambda o: abs(o - c['start']))
    if abs(near - c['start']) <= 0.35: c['start'] = near
for k in range(len(caps) - 1):
    caps[k]['end'] = max(caps[k]['end'], caps[k + 1]['start'] - 0.02) if caps[k + 1]['start'] - caps[k]['end'] < 0.6 else caps[k]['end']
# timing rules: appear ≤80ms early; min 1.0s; max 7s; ≤9 chars/s (CJK) ; no overlap; hold across tiny gaps
def weight(s):  # latin letters count half
    return sum(0.5 if re.match(r'[A-Za-z0-9.]', ch) else 1 for ch in s if not ch.isspace())
for k, c in enumerate(caps):
    c['start'] = max(0, c['start'] - 0.08)
    nxt = caps[k + 1]['start'] - 0.08 if k + 1 < len(caps) else c['end'] + 0.6
    gap = nxt - c['end']
    if gap < 0.6: c['end'] = nxt           # bridge short pauses
    need = max(1.0, weight(c['text']) / 9)
    if c['end'] - c['start'] < need: c['end'] = min(c['start'] + need, nxt if nxt > c['start'] + 0.5 else c['start'] + need)
    c['end'] = min(c['end'], c['start'] + 7)
for k in range(len(caps) - 1):
    caps[k]['end'] = min(caps[k]['end'], caps[k + 1]['start'] - 0.08)  # no overlap
# balance: a caption shorter than its need borrows from neighbours (≤0.35s lead / lag each side)
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 1e9
def need(c): return max(1.0, weight(c['text']) / 9)
for _ in range(3):
    for k, c in enumerate(caps):
        short = need(c) - (c['end'] - c['start'])
        if short <= 0: continue
        if k + 1 < len(caps):   # take from next (next appears a bit later)
            nx = caps[k + 1]; slack = (nx['end'] - nx['start']) - need(nx)
            take = max(0, min(short, slack, 0.35)); c['end'] += take; nx['start'] += take; short -= take
        if short > 0 and k > 0:  # take from previous (previous leaves a bit earlier)
            pv = caps[k - 1]; slack = (pv['end'] - pv['start']) - need(pv)
            take = max(0, min(short, slack, 0.35)); c['start'] -= take; pv['end'] -= take; short -= take
caps[-1]['end'] = min(caps[-1]['end'], DUR - 0.02)
for c in caps:
    c['start'] = round(c['start'], 3); c['end'] = round(c['end'], 3)
    c['cps'] = round(weight(c['text']) / max(c['end'] - c['start'], 0.01), 1)
json.dump(caps, open(f'{run}/captions.json', 'w'), ensure_ascii=False, indent=1)

print(f'matched {matched}/{N} chars from ASR anchors')
bad = [c for c in caps if c['end'] - c['start'] < 1.0 or c['cps'] > 9]
for c in caps:
    flag = ' <-- ' if c in bad else ''
    print(f"{c['start']:7.2f}-{c['end']:7.2f}  {c['cps']:4.1f}/s  {c['text']}{flag}")
print('violations:', len(bad))
