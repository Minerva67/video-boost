"""Re-transcribe one unclear stretch of speech, three ways, to settle a word during proofreading.
  1. plain (no prompt)   2. with 3–5 terms as initial_prompt   3. slowed to 0.8x (often recovers mumbled words)
usage: .venv/bin/python retranscribe.py runs/<name> <start s> <end s> [--terms "代账,报税,起号"]
Keep --terms to 3–5 words that should occur in THIS stretch; longer lists get echoed back as if they were speech.
"""
import sys, os, subprocess, tempfile, argparse
from pywhispercpp.model import Model
ap = argparse.ArgumentParser(); ap.add_argument('run'); ap.add_argument('start', type=float); ap.add_argument('end', type=float); ap.add_argument('--terms', default='')
a = ap.parse_args()
FF = os.path.expanduser('~/.local/bin/ffmpeg'); src = os.path.join(a.run, 'audio.wav')
terms = [t.strip() for t in a.terms.split(',') if t.strip()]
if len(terms) > 5: print('⚠ 术语超过 5 个，只用前 5 个'); terms = terms[:5]
s0, dur = max(0, a.start - .3), a.end - a.start + .6
tmp = tempfile.mkdtemp()
clip, slow = os.path.join(tmp, 'clip.wav'), os.path.join(tmp, 'slow.wav')
subprocess.run([FF, '-v', 'error', '-y', '-ss', str(s0), '-t', str(dur), '-i', src, clip], check=True)
subprocess.run([FF, '-v', 'error', '-y', '-i', clip, '-filter:a', 'atempo=0.8', slow], check=True)
m = Model(os.path.expanduser(os.environ.get('KVB_MODEL', '~/.cache/kvb-models/ggml-medium-q5_0.bin')), print_progress=False, print_realtime=False,
          params_sampling_strategy=1, beam_search={'beam_size': 5, 'patience': -1.0})
base = '以下是普通话的句子。'
def run(f, p): return ''.join(s.text for s in m.transcribe(f, language='zh', initial_prompt=p)).strip()
print(f'{a.start:.2f}–{a.end:.2f}s')
print('  原速       :', run(clip, base))
if terms: print('  原速+术语  :', run(clip, base + '，'.join(terms) + '。'))
print('  0.8 倍慢放 :', run(slow, base + ('，'.join(terms) + '。' if terms else '')))
