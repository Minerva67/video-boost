"""Merge captions that are too short (<1s) or too fast (>9 字/s) with a neighbour (combined ≤12 字), then re-align.
Never merges across a boundary: current screen ends a sentence (。 in script.txt), next screen opens a new point/sentence (第N/然后第/首先/最后/以上/比如说/所以/而现在…),
current screen ends with ？/！, or there is a real pause (≥0.25s silence) between the two screens.
usage: .venv/bin/python fix_caps.py runs/<name> <duration>"""
import sys
RUN, DUR = sys.argv[1], sys.argv[2]
import json,re,subprocess
OPENERS = re.compile(r'^(第[一二三四五六七八九十0-9]|然后第|首先|其次|再次|最后|以上|总结|总之|比如说?|例如|所以|因此|而现在|再比如|但是|另外|那么)')
def boundary(a, b, chars, VR):
    pa, pb = parts[a], parts[b]
    if OPENERS.match(pb.strip()) or pa.strip()[-1:] in '。？！?!': return True   # 。 = sentence end marked in script.txt
    ea = max((c['end'] for c in chars if c['cap'] == a), default=None); sb = min((c['start'] for c in chars if c['cap'] == b), default=None)
    if ea is None or sb is None: return False
    silence = sb - ea - sum(max(0, min(y, sb) - max(x, ea)) for x, y in VR)
    return silence >= .25
def w(s): return sum(0.5 if re.match(r'[A-Za-z0-9.\-]',ch) else 1 for ch in s if not ch.isspace())
for it in range(4):
    caps=json.load(open(f'{RUN}/captions.json'))
    parts=open(f'{RUN}/script.txt').read().strip().split('|')
    assert len(parts)==len(caps)
    chars=json.load(open(f'{RUN}/transcript.json'))['chars']; VR=json.load(open(f'{RUN}/voiced.json'))
    bad=[k for k,c in enumerate(caps) if c['end']-c['start']<1.0 or c['cps']>9]
    done=set(); merged=0
    for k in bad:
        if k in done: continue
        opts=[]
        for j in (k-1,k+1):
            if 0<=j<len(parts) and j not in done and w(parts[k])+w(parts[j])<=14 and abs(caps[min(k,j)+1]['start']-caps[min(k,j)]['end'])<0.5 and not boundary(min(k,j),min(k,j)+1,chars,VR):
                opts.append((w(parts[j]),j))
        if not opts: continue
        _,j=min(opts); a=min(k,j)
        parts[a]=parts[a]+('' if re.match(r'[A-Za-z]',parts[a+1][:1]) is None or not re.match(r'[A-Za-z]',parts[a][-1:]) else ' ')+parts[a+1]; parts[a+1]=None
        done|={a,a+1}; merged+=1
    parts=[p for p in parts if p is not None]
    open(f'{RUN}/script.txt','w').write('|'.join(parts))
    out=subprocess.run(['.venv/bin/python','align.py',RUN,DUR],capture_output=True,text=True).stdout
    print('iter',it,'merged',merged,out.strip().splitlines()[-1])
    if not merged: break
print('\n'.join(l for l in out.splitlines() if '<--' in l))
