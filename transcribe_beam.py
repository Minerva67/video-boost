"""usage: .venv/bin/python transcribe_beam.py runs/v4  → segs_beam.json + tokens_beam.json (beam 5)"""
import json, sys, os
from pywhispercpp.model import Model
run = sys.argv[1]
mp = os.path.expanduser(os.environ.get('KVB_MODEL', '~/.cache/kvb-models/ggml-medium-q5_0.bin'))
P = '以下是普通话的句子，使用简体中文和标点。'
m = Model(mp, n_threads=8, print_progress=False, print_realtime=False, params_sampling_strategy=1, beam_search={'beam_size': 5, 'patience': -1.0})
segs = m.transcribe(f'{run}/audio.wav', language='zh', initial_prompt=P)
S = [{'start': s.t0 / 100, 'end': s.t1 / 100, 'text': s.text.strip()} for s in segs]
json.dump(S, open(f'{run}/segs_beam.json', 'w'), ensure_ascii=False, indent=1)
toks = m.transcribe(f'{run}/audio.wav', language='zh', initial_prompt=P, token_timestamps=True, max_len=1, split_on_word=False)
T = [{'text': t.text, 'start': t.t0 / 100, 'end': t.t1 / 100} for t in toks if t.text.strip()]
json.dump({'tokens': T}, open(f'{run}/tokens_beam.json', 'w'), ensure_ascii=False, indent=1)
for s in S: print(f"[{s['start']:6.2f}-{s['end']:6.2f}] {s['text']}")
print(len(S), 'segs', len(T), 'tokens')
