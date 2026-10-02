"""Word/char-level Chinese transcription with whisper.cpp (pywhispercpp).
usage: .venv/bin/python transcribe.py runs/v1/audio.wav runs/v1/transcript.json
Output: {"segments":[{start,end,text}], "tokens":[{text,start,end}]}  (seconds)
"""
import json, sys, os
from pywhispercpp.model import Model

wav, out = sys.argv[1], sys.argv[2]
model_path = os.path.expanduser(os.environ.get('KVB_MODEL', '~/.cache/kvb-models/ggml-base-q5_1.bin'))

m = Model(model_path, n_threads=8, print_progress=False, print_realtime=False)

# pass 1: sentence segments (better text)
segs = m.transcribe(wav, language='zh', initial_prompt='以下是普通话的句子，使用简体中文和标点。')
segments = [{'start': s.t0 / 100, 'end': s.t1 / 100, 'text': s.text.strip()} for s in segs]

# pass 2: token-level timing (max_len=1 → one token per segment)
toks = m.transcribe(wav, language='zh', initial_prompt='以下是普通话的句子，使用简体中文和标点。',
                    token_timestamps=True, max_len=1, split_on_word=False)
tokens = [{'text': t.text, 'start': t.t0 / 100, 'end': t.t1 / 100} for t in toks if t.text.strip()]

json.dump({'segments': segments, 'tokens': tokens}, open(out, 'w'), ensure_ascii=False, indent=1)
print(len(segments), 'segments', len(tokens), 'tokens')
for s in segments:
    print(f"[{s['start']:6.2f}-{s['end']:6.2f}] {s['text']}")
