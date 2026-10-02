"""Whisper often returns 20s+ segments with no breaks; align.py's VAD retime works per segment, so split by token punctuation.
usage: python3 resegment.py runs/<name>   (reads tokens_beam.json + segs_beam.json → rewrites segs_beam.json, keeps segs_beam_orig.json)"""
import json, sys, os
run = sys.argv[1]
T = json.load(open(f'{run}/tokens_beam.json'))['tokens']
orig = f'{run}/segs_beam_orig.json'
if not os.path.exists(orig): os.rename(f'{run}/segs_beam.json', orig)
O = json.load(open(orig))
P = set('，,。.?？!！')
segs, cur = [], None
for t in T:
    x = t['text'].strip()
    if cur is None: cur = {'start': t['start'], 'end': t['end'], 'text': ''}
    cur['text'] += x; cur['end'] = t['end']
    if x and x[-1] in P: segs.append(cur); cur = None
if cur: segs.append(cur)
# keep whisper's own short segments where they exist (≤8s); use punctuation splits inside the long ones
out = []
for s in O:
    if s['end'] - s['start'] <= 8: out.append(s); continue
    # assign each punctuation-sentence to the whisper segment holding its midpoint (a sentence straddling a
    # segment boundary used to be dropped by both sides — that is how a whole sentence went missing)
    inner = [x for x in segs if s['start'] <= (x['start'] + x['end']) / 2 < s['end']]
    out += inner or [s]
json.dump(out, open(f'{run}/segs_beam.json', 'w'), ensure_ascii=False, indent=0)
print(len(O), '→', len(out), 'segments')
