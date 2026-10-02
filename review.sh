#!/bin/zsh
# Contact sheets of a render at given times. usage: ./review.sh runs/<name>/draft.mp4 2.5 15 28 ...   → <dir>/review/sheet_*.png (6 per sheet)
set -e; export PATH=~/.local/bin:$PATH
V="$1"; shift; D="$(dirname "$V")/review"; mkdir -p "$D"; i=0; files=()
for t in "$@"; do i=$((i+1)); f="$D/f$(printf %02d $i).png"; ffmpeg -v error -y -ss $t -i "$V" -frames:v 1 -vf scale=360:-1 "$f"; files+=("$f"); done
n=0; while (( n < ${#files} )); do chunk=("${(@)files[$((n+1)),$((n+6))]}"); args=(); for f in $chunk; do args+=(-i $f); done
  if (( ${#chunk} > 1 )); then ffmpeg -v error -y $args -filter_complex hstack=${#chunk} "$D/sheet_$((n/6+1)).png"; else cp $chunk[1] "$D/sheet_$((n/6+1)).png"; fi; n=$((n+6)); done
ls "$D"/sheet_*.png
