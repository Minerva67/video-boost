#!/bin/zsh
# Live skill (~/.claude/skills/video-boost) → repo copy skill/video-boost, sanitised for the repo:
#   · speaker quotes (t('…') args) → placeholder; private terms/paths from the local, gitignored .private-terms file
# ./sync_skill.sh --install   installs the repo copy into ~/.claude/skills/video-boost
cd "$(dirname "$0")"
if [[ "$1" == --install ]]; then mkdir -p ~/.claude/skills && rsync -a --delete skill/video-boost/ ~/.claude/skills/video-boost/ && echo "installed → ~/.claude/skills/video-boost"; exit; fi
rsync -a --delete ~/.claude/skills/video-boost/ skill/video-boost/
python3 - <<'PY'
import re, pathlib
rules = [l.split(' => ', 1) for l in pathlib.Path('.private-terms').read_text().splitlines() if ' => ' in l and not l.startswith('#')] if pathlib.Path('.private-terms').exists() else []
for p in pathlib.Path('skill/video-boost').rglob('*.md'):
    s = p.read_text()
    s = re.sub(r"\bt\('[^']*'(, *\d+)?\)", "t('…原话…')", s)   # speaker quotes in beat examples
    for pat, rep in rules: s = re.sub(pat, rep, s)
    p.write_text(s)
PY
echo "synced ← ~/.claude/skills/video-boost (sanitised)"; grep -rn -i -f <(grep ' => ' .private-terms 2>/dev/null | sed 's/ => .*//; s/(?i)//; s/\\//g' | grep -v '[`\[]') skill/ || echo "clean: no private refs"
