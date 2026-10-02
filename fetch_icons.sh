#!/bin/zsh
# Real brand icons (mono, currentColor) → brand/icons/<slug>.svg. Sources: Lobe Icons (MIT) / Simple Icons (CC0).
# usage: ./fetch_icons.sh openai gemini google claudecode codex deepmind claude perplexity runway   (si:xiaohongshu for Simple Icons)
cd "$(dirname "$0")/brand/icons"
for n in "$@"; do
  if [[ $n == si:* ]]; then s=${n#si:}; url="https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/$s.svg"; src="Simple Icons (CC0)"
  else s=$n; url="https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@latest/icons/$s.svg"; src="Lobe Icons (MIT)"; fi
  if curl -sfL -o "$s.svg" "$url"; then grep -q "^$s " SOURCES.txt 2>/dev/null || echo "$s $src $url" >> SOURCES.txt; echo "ok $s"; else echo "MISSING $s"; fi
done
