#!/bin/zsh
# Video Boost step 1–2: stage source, SDR-convert if HDR, extract audio, transcribe (medium, beam 5), resegment.
# usage: ./prep.sh <video file> <run name>      → runs/<name>/{source.mp4,audio.wav,segs_beam.json,tokens_beam.json}
set -e
cd "$(dirname "$0")"; export PATH=~/.local/bin:$PATH
SRC="$1"; R="runs/$2"; mkdir -p "$R/review"
TRC=$(ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer -of csv=p=0 "$SRC")
if [[ "$TRC" == arib-std-b67 || "$TRC" == smpte2084 ]]; then
  echo "HDR ($TRC) → SDR via avconvert"; avconvert -s "$SRC" -o "$R/source.mp4" -p Preset1920x1080 --replace
else cp "$SRC" "$R/source.mp4"; fi
ffmpeg -v error -y -i "$R/source.mp4" -ac 1 -ar 16000 "$R/audio.wav"
[ -f ~/.cache/kvb-models/ggml-medium-q5_0.bin ] || { mkdir -p ~/.cache/kvb-models; curl -L -o ~/.cache/kvb-models/ggml-medium-q5_0.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q5_0.bin; }
.venv/bin/python transcribe_beam.py "$R" 2>/dev/null | grep -v -E "^(whisper|ggml)"
python3 resegment.py "$R"
python3 check_asr.py "$R"
.venv/bin/python detect_burned_captions.py "$R/source.mp4" > "$R/source_meta.json"; if grep -q '"burned": true' "$R/source_meta.json"; then echo "源片自带烧录字幕（$(cat "$R/source_meta.json")）→ 默认关闭我们的字幕；要强制打开，在 beats.mjs 返回 CAPTIONS: 'on'"; fi
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$R/source.mp4"); echo "时长 $DUR s"
echo "next: write $R/script.txt (proofread, | = caption break, ≤10 字/屏), then: .venv/bin/python align.py $R $DUR \&\& .venv/bin/python fix_caps.py $R $DUR"
