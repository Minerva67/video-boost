#!/bin/zsh
# One-shot Eval for a rendered boost: measure typography/safe zones in headless Chrome, then score.
# usage: ./evaluate.sh runs/<name> [--theme <name>] [--platform xhs|douyin|reels|shorts|none] [--video <file in run dir>]
set -e
cd "$(dirname "$0")"
RUN="$1"; shift
THEME=""; PLATFORM="xhs"; VIDEO=""
while (( $# )); do case "$1" in --theme) THEME="$2"; shift 2;; --platform) PLATFORM="$2"; shift 2;; --video) VIDEO="$2"; shift 2;; *) shift;; esac; done
PUB="public"; [[ -n "$THEME" ]] && PUB="public-$THEME"
[[ -f "$RUN/$PUB/manifest.json" ]] || { echo "没有 $RUN/$PUB/manifest.json——先 node build.mjs $RUN ${THEME:+--theme=$THEME}"; exit 1; }
export HYPERFRAMES_BROWSER_PATH="${HYPERFRAMES_BROWSER_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
node audit.mjs "$RUN" --public "$PUB" --platform "$PLATFORM"
ARGS=("$RUN"); [[ "$PUB" != public ]] && ARGS+=(--public "$PUB"); [[ -n "$VIDEO" ]] && ARGS+=(--video "$VIDEO")
python3 eval.py "${ARGS[@]}" | grep -E "门槛|⚠️|❌|→"
