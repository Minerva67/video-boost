# Video Boost · 口播视频增强

把一支单人口播视频做成「原片 + 同步图形层」的成片：原片画面、声音、时长一律不动，只叠加卡拉 OK 字幕、常驻进度、机制图、真实工具界面示意（带真 logo、真实检索的数据）、结尾 CTA，以及按规则走的运镜。渲染引擎是 [HyperFrames](https://www.npmjs.com/package/hyperframes)。

整体流程、剪辑师视角和 Eval 标准的一页总览：[`board/index.html`](board/index.html)（下载后用浏览器打开）。

方法、口味与规则全在 skill 里：[`skill/video-boost/SKILL.md`](skill/video-boost/SKILL.md)。参考文档：
- [`rules.md`](skill/video-boost/references/rules.md)：负荷类型、划段、模板入场顺序、论证结构 → 小标题、机位密度
- [`typography.md`](skill/video-boost/references/typography.md)：字号阶梯、层级、平台安全区（附业界依据）
- [`components.md`](skill/video-boost/references/components.md)：每个组件的数据写法
- [`editor.md`](skill/video-boost/references/editor.md)：剪辑师视角（剪辑台本、素材等级、节奏、审片清单，附出处）
- [`eval.md`](skill/video-boost/references/eval.md)：Eval 标准（门槛 5 项 + 自动 26 项 + 人工 7 项）

## 流程（四个阶段，以 Eval 收尾）
1. **素材准备**：转 SDR、转录、漏句检查 → 校对字幕稿 → 逐字对时
2. **理解与设计**：通读全文写论证结构 → 小标题 → 剪辑台本（这里剪辑师会切到什么画面：真实素材 > 演示 > 数据图 > 文字卡）→ 取真实素材 → 写成 `beats.mjs`
3. **制作**：build（主题、真 logo、手绘圈注）→ 草稿 → 看关键帧拼图 → 剪辑师审片（独立子 agent）→ 正式渲染
4. **Eval**：`./evaluate.sh` 实测字号与安全区 + 自动检查，门槛不过不交付

## 安装
```bash
npm install                                   # hyperframes + gsap + roughjs + puppeteer-core
python3 -m venv .venv && .venv/bin/pip install pywhispercpp
./sync_skill.sh --install                     # 把 skill 装到 ~/.claude/skills/video-boost
```
另需：`~/.local/bin` 下的 ffmpeg/ffprobe 静态二进制；系统 Chrome（`HYPERFRAMES_BROWSER_PATH`）。whisper 模型首次运行 `prep.sh` 时自动下载。

## 一支片子的流程
```bash
./prep.sh <视频> <name>                         # 转 SDR、抽音频、转录、重切段、漏句检查、烧录字幕检测
# 校对 runs/<name>/script.txt（| = 换屏，。= 句子边界；听不清的词用 retranscribe.py）
.venv/bin/python align.py runs/<name> <时长> && .venv/bin/python fix_caps.py runs/<name> <时长>
# 写 runs/<name>/structure.md → cut.md（剪辑台本）→ beats.mjs（模板：runs/example/beats.mjs）
node grab.mjs <网址> runs/<name>/assets/news.png --find "页面原句"   # 真实网页截图 + 关键句位置
python3 commons.py "<英文关键词>" runs/<name>/assets                 # 公开授权照片（记授权与作者）
node build.mjs runs/<name> [--theme=<name>]
HYPERFRAMES_BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx hyperframes render runs/<name>/public --sdr -o runs/<name>/output.mp4
# 改分镜时先看单帧：npx hyperframes snapshot runs/<name>/public --at <秒>
./evaluate.sh runs/<name>                       # 最后一步：Eval（字号/安全区实测 + 自动检查），门槛不过不交付
```

## 目录
| 路径 | 内容 |
|---|---|
| `build.mjs` | 通用构建：beats + 主题 → HyperFrames 合成 + manifest |
| `components.mjs` | 组件库（30 模板规范 + 真实素材 photo + 示意界面 cc/folio/resume/checktable + 数据图 ctxline/occupied/trend …） |
| `brand/components.css` | 组件样式（只用主题变量） |
| `brand/themes/<name>/theme.json` | 主题：颜色角色、字体、圆角/描边/阴影、logo、字幕风格（仓库只带 knock；私有品牌主题放本地，已 gitignore） |
| `brand/icons/` | 真 logo（Lobe Icons MIT / Simple Icons CC0，见 SOURCES.txt），`fetch_icons.sh` 取新的 |
| `prep.sh` · `check_asr.py` · `detect_burned_captions.py` | 素材准备；检查 ASR 漏句和分段稿漏句；检测源片是否自带烧录字幕（有则默认关闭我们的字幕） |
| `grab.mjs` · `commons.py` | 真实素材：网页截图（去浮动广告，给出关键句位置供划重点）；Wikimedia Commons 公开授权图（自动记授权与作者） |
| `retranscribe.py` | 听不清的词：原速、加术语、0.8 倍慢放三种重转 |
| `align.py` · `fix_caps.py` | 字幕逐字对时；合并过短/过快的字幕屏（不跨句、不跨章节） |
| `review.sh` | 渲染后按时间点抽帧拼图，逐张检查 |
| `evaluate.sh` | 流程最后一步：先跑 `audit.mjs`，再跑 `eval.py` |
| `audit.mjs` | 用无头 Chrome 打开成片页面，把时间线拨到每个图形，量出文字实际渲染的字号与位置 |
| `eval.py` | Eval：门槛 + 内容/运镜/字号/安全区/字幕自动检查 + 人工评分表 → `runs/<name>/eval.md` |
| `skill/video-boost/` | Claude Code skill（改了 `~/.claude/skills/video-boost` 后跑 `./sync_skill.sh` 同步进来） |

字体均为 OFL 授权；品牌 logo 仅作指代，归各自所有者。动效依赖：GSAP（含 DrawSVG / MorphSVG / MotionPath，GSAP Standard License，免费可商用）、rough.js（MIT）、HyperFrames（Apache-2.0）。
