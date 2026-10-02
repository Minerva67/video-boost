# Video Boost · 口播视频增强

把一支单人口播视频做成「原片 + 同步图形层」的成片：原片画面、声音、时长一律不动，只叠加卡拉 OK 字幕、常驻进度、机制图、真实工具界面示意（带真 logo、真实检索的数据）、结尾 CTA，以及按规则走的运镜。渲染引擎是 [HyperFrames](https://www.npmjs.com/package/hyperframes)。

方法、口味与规则全在 skill 里：[`skill/video-boost/SKILL.md`](skill/video-boost/SKILL.md)；Eval 标准：[`skill/video-boost/references/eval.md`](skill/video-boost/references/eval.md)。

## 安装
```bash
npm install                                   # hyperframes + gsap
python3 -m venv .venv && .venv/bin/pip install pywhispercpp
./sync_skill.sh --install                     # 把 skill 装到 ~/.claude/skills/video-boost
```
另需：`~/.local/bin` 下的 ffmpeg/ffprobe 静态二进制；系统 Chrome（`HYPERFRAMES_BROWSER_PATH`）。whisper 模型首次运行 `prep.sh` 时自动下载。

## 一支片子的流程
```bash
./prep.sh <视频> <name>                         # 转 SDR、抽音频、转录、重切段
# 校对 runs/<name>/script.txt（| = 字幕断点）
.venv/bin/python align.py runs/<name> <时长> && .venv/bin/python fix_caps.py runs/<name> <时长>
# 写 runs/<name>/beats.mjs（模板：runs/example/beats.mjs）
node build.mjs runs/<name> [--theme=<name>]
npx hyperframes render runs/<name>/public --sdr -o runs/<name>/output.mp4
python3 eval.py runs/<name>
```

## 目录
| 路径 | 内容 |
|---|---|
| `build.mjs` | 通用构建：beats + 主题 → HyperFrames 合成 + manifest |
| `components.mjs` | 组件库（30 模板规范 + 示意界面 cc/folio/resume/checktable + 数据图 ctxline/occupied/trend …） |
| `brand/components.css` | 组件样式（只用主题变量） |
| `brand/themes/<name>/theme.json` | 主题：颜色角色、字体、圆角/描边/阴影、logo、字幕风格（仓库只带 knock；私有品牌主题放本地，已 gitignore） |
| `brand/icons/` | 真 logo（Lobe Icons MIT / Simple Icons CC0，见 SOURCES.txt），`fetch_icons.sh` 取新的 |
| `eval.py` | Eval：门槛 + 自动检查 + 人工评分表 |
| `skill/video-boost/` | Claude Code skill（改了 `~/.claude/skills/video-boost` 后跑 `./sync_skill.sh` 同步进来） |

字体均为 OFL 授权；品牌 logo 仅作指代，归各自所有者。
