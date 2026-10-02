"""Find speech that is missing from the transcript: voiced stretches (≥0.8s) not covered by ASR tokens or by segs_beam.json
(the text you proofread from). Re-transcribe those clips.
usage: python3 check_asr.py runs/<name>   (needs audio.wav + tokens_beam.json; computes voiced runs itself)"""
import json, sys, subprocess, os, array, math
run = sys.argv[1]
T = json.load(open(f'{run}/tokens_beam.json'))['tokens']
ff = os.path.expanduser('~/.local/bin/ffmpeg')
raw = subprocess.run([ff, '-v', 'error', '-i', f'{run}/audio.wav', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
x = array.array('h', raw); db = []
for i in range(0, len(x) - 400, 160):
    seg = x[i:i + 400]; db.append(20 * math.log10(math.sqrt(sum(v * v for v in seg) / 400) / 32768 + 1e-6))
thr = max(db) - 30; runs, inside = [], False
for i, d in enumerate(db):
    if d > thr and not inside: s0, inside = i, True
    elif d <= thr and inside:
        if i - s0 > 5: runs.append([s0 / 100, i / 100])
        inside = False
merged = []
for a, b in runs:
    if merged and a - merged[-1][1] < .3: merged[-1][1] = b
    else: merged.append([a, b])
S = json.load(open(f'{run}/segs_beam.json')) if os.path.exists(f'{run}/segs_beam.json') else []
def holes(spans):
    # voiced time not covered by any of `spans` → contiguous pieces ≥0.8s
    spans = sorted((x['start'], x['end']) for x in spans if x.get('text', 'x').strip())
    out = []
    for a, b in merged:
        cur = a
        for x, y in spans:
            if y <= cur or x >= b: continue
            if x - cur >= .8: out.append((cur, x))
            cur = max(cur, y)
        if b - cur >= .8: out.append((cur, b))
    return out
miss = holes(T)                       # speech the ASR itself did not transcribe
# sentences the ASR did transcribe but that are missing from the proofreading text (segs_beam.json)
import re
norm = lambda x: re.sub(r'[\s，,。.？?！!、：:；;%％]', '', x)
segtext = norm(''.join(x['text'] for x in S))
sent, cur = [], None
for t in T:
    x = t['text'].strip()
    if not x: continue
    cur = cur or {'start': t['start'], 'text': ''}; cur['text'] += x; cur['end'] = t['end']
    if x[-1] in '，,。.？?！!': sent.append(cur); cur = None
if cur: sent.append(cur)
# fuzzy: the two ASR passes spell things differently and the token pass may lose punctuation, so compare 12-char
# chunks by character bigrams; a chunk is missing when <50% of its bigrams occur anywhere in the proofreading text
segbg = {segtext[k:k + 2] for k in range(len(segtext) - 1)}
dropped = []
for x in (sent if S else []):
    tx = norm(x['text']); n = len(tx)
    if n < 6: continue
    for k in range(0, n, 12):
        ch = tx[k:k + 12]; bg = [ch[j:j + 2] for j in range(len(ch) - 1)]
        if len(bg) >= 3 and sum(g in segbg for g in bg) / len(bg) < .5:
            t0 = x['start'] + (x['end'] - x['start']) * k / n
            if dropped and dropped[-1]['src'] is x and dropped[-1]['k'] == k - 12: dropped[-1]['text'] += ch; dropped[-1]['k'] = k
            else: dropped.append({'src': x, 'k': k, 'start': t0, 'end': x['end'], 'text': ch})
if dropped:
    print(f'分段稿漏句：{len(dropped)} 句 ASR 有、但校对用的 segs_beam.json 里没有（resegment 问题，请补进 script.txt）：')
    for x in dropped: print(f'  {x["start"]:7.2f}–{x["end"]:7.2f}s  {x["text"]}')
if not miss: print('ASR 覆盖检查：没有疑似漏句'); sys.exit()
print(f'ASR 覆盖检查：{len(miss)} 段有声音但几乎没有转录（疑似整句漏掉），逐段切片重转：')
for a, b in miss:
    print(f'  {a:7.2f}–{b:7.2f}s  → ffmpeg -ss {max(0, a - .3):.2f} -t {b - a + .6:.2f} -i {run}/audio.wav clip.wav，用 transcribe 只塞 3–5 个本段术语做 initial_prompt')
