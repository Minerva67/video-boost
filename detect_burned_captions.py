"""Detect burned-in captions in a talking-head source (no OCR needed).
Burned captions = a fixed horizontal band in the lower part of the frame with very sharp text edges whose content changes
every 1–3 s. We sample 1 frame/s, measure per-row horizontal edge density in the lower 55% of the frame, and look for a
band that is (a) much sharper than the rest of the lower frame in most samples and (b) changes between samples.
usage: .venv/bin/python detect_burned_captions.py <video>   → prints JSON {burned: bool, band: [y0, y1] (0..1 of height), score}
"""
import json, subprocess, sys, os
import numpy as np
FF = os.path.expanduser('~/.local/bin/ffmpeg')
src = sys.argv[1]
W, H = 360, 640
raw = subprocess.run([FF, '-v', 'error', '-i', src, '-vf', f'fps=1,scale={W}:{H},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
y0 = int(H * .45)
low = fr[:, y0:, :]
gx = np.abs(np.diff(low, axis=2))                       # horizontal gradient
strong = (gx > 60).mean(axis=2)                          # per-row share of very sharp edges  → (frames, rows)
base = np.median(strong, axis=1, keepdims=True) + 1e-4
ratio = strong / base                                    # rows much sharper than the frame's lower-half median
rowhit = (ratio > 4) & (strong > .04)                    # sharp text-like rows
freq = rowhit.mean(axis=0)                               # how often each row is "text"
# content change: text rows differ between consecutive samples (static logos/watermarks do not)
diff = np.abs(np.diff(low, axis=0)).mean(axis=2) if len(low) > 1 else np.zeros((1, low.shape[1]))
change = (diff > 6).mean(axis=0)
best = None
r = 0
while r < len(freq):
    if freq[r] > .35:
        s = r
        while r < len(freq) and freq[r] > .25: r += 1
        h = r - s
        if 6 <= h <= 90:                                  # 1%–14% of frame height
            sc = float(freq[s:r].mean() * min(1, change[s:r].mean() * 2))
            if not best or sc > best[2]: best = (s, r, sc)
    r += 1
out = {'burned': bool(best and best[2] > .2), 'score': round(best[2], 3) if best else 0,
       'band': [round((y0 + best[0]) / H, 3), round((y0 + best[1]) / H, 3)] if best else None, 'frames': int(len(fr))}
print(json.dumps(out))
