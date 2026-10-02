---
name: video-boost
description: 口播视频增强（Video Boost）：把一支单人口播视频（9:16 竖屏为主，30s–5min）做成「原片 + 同步图形层」的成片——原片画面/声音/时长一律不动，只叠加：胶囊卡拉 OK 字幕、常驻 N 点进度、机制图、真实工具界面示意（Claude Code 会话/作品集页/简历改写等）、结尾 CTA，以及按规则走的运镜（全屏/让位/慢推/硬切放大）。凡用户丢来一支口播视频并说「做一下视频增强 / 增强这个口播 / 给这支视频加图形 / video boost / 做成博主级成片 / 加字幕和动效」，或者截了一帧口播画面让你「增强」时，务必使用本 skill——即使用户没说「增强」二字，只说「把这个视频弄好看点」也算。不用于：拉片分析别人的视频（video-lapian）、从零生成视频（explainer-video-prompt / ref-film-to-storyboard-prompt）、纯剪辑（剪掉片段/变速/调色）。
---

# Video Boost（口播增强）

工程目录：仓库根目录（公开仓库 github.com/Minerva67/video-boost；本机在 `~/CC/knock-video-boost/`）。HyperFrames 渲染 + GSAP 时间轴 + 自建组件库。
样板：`runs/example/beats.mjs`（结构模板）+ `references/components.md`（每个组件的数据写法）。**判断规则全在 `references/rules.md`**（负荷类型、划段、版式轮换、模板入场顺序、小标题），不依赖任何外部文档。

## 铁律（用户反复确认过的，违反即返工）

1. **只加不改**：原片画面、镜头顺序、时间轴、原声、时长全部不变。CTA 也是叠在最后几秒，不加长片子。
2. **卡片不许复述口播**。每张图过一遍测试：「关掉声音和字幕，这张图多给了什么？」答案是「同样的字」就删。字幕已经在说话了，卡片再写一遍 = 三重重复（v4 被否的原因）。
3. **能演出来就别写出来，能拿到真东西就别演**：口播提到真实存在的新闻/报告/产品/地方，优先放真实截图或照片（`photo` 组件，划出那个数字）；口播提到「用 X 工具做了 Y」，就把 X 的真实界面和 Y 的产出物演出来（Claude Code 会话逐字打指令→工具调用→结果表/报告），不要灰条占位（v5→v6 被点名要求）。
4. **示意 ≠ 编造**：允许示意界面（窗口角标「示意」），但不加原片没说的观点；**任何数字/来源必须真实检索**（WebSearch+WebFetch 核实页面原文；多家口径不同就写区间并都标出），示例标题类内容不带热度/点赞数字。
5. **不挡脸、不挤**：人永远贴底居中——全屏 / 62%（普通图形）/ 50%（信息密的图形，用户 10-02 要求「信息量大就把人放小，多留地方做可视化」）。画中画（人缩到 30% 角落）被否。
6. **皮肤 = 主题（theme）**，默认用户自己的 Knock〃 设计系统 B 线密度（`brand/themes/knock/`）；也有 私有主题（`brand/themes/<私有主题>/`，按品牌规范B 线）。换主题：`node build.mjs runs/<name> --theme=<name>`（输出到 `public-<theme>/`）。Knock 版细则：纸白打底、门黄只做小色块、敲击橙 ≤5%、1.5px 墨黑描边、无阴影；右上角横版 logo 常驻。Claude 风格皮肤被否（"设计系统还是用我的"），Knock 三色大面积铺屏也被否（"太鲜艳很累"）。
7. **拆分逻辑**：六类负荷 + 复合类型 + 相邻段不同版式 + 旁支不增强，规则见 `references/rules.md` §1–2（源自用户的视频增强 PRD V3 与《可视化选型规范 · 30 模板》，已摘全）。低负荷的劝导/观点类口播，大部分时间应该回到全屏，只留 4–6 个图形。

## 流水线

```
./prep.sh <视频文件> <name>                      # 拷源片(HDR 自动 avconvert 转 SDR)、抽音频、medium 模型 beam5 转录、按标点重切段
# → 读 runs/<name>/segs_beam.json，校对写 runs/<name>/script.txt（| = 字幕断点）
.venv/bin/python align.py runs/<name> <时长>       # 校对文本对齐回 ASR 字级时间 + VAD 校时 → transcript.json / captions.json / voiced.json
.venv/bin/python fix_caps.py runs/<name> <时长>    # 自动合并 <1s 或 >9字/s 的字幕屏，重对齐（不跨章节/句子/停顿合并）
# → 先写 runs/<name>/structure.md（论证结构）→ cut.md（剪辑台本）→ 再写 beats.mjs（从 runs/example/beats.mjs 复制改）
# 真实素材：node grab.mjs <网址> runs/<name>/assets/x.png --find "关键句"；python3 commons.py "<英文关键词>" runs/<name>/assets
node build.mjs runs/<name>
npx hyperframes lint runs/<name>/public            # 0 error 即可（caption 的 nested 警告是已知的）
HYPERFRAMES_BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  npx hyperframes render runs/<name>/public --sdr -q draft -o runs/<name>/draft.mp4   # 156s ≈ 100s
./review.sh runs/<name>/draft.mp4 <每段末尾的时间点…>   # 出联系表，逐张看
# → 剪辑师审片：派独立子 agent，只给联系表 + cut.md，按 references/editor.md §5 逐段「过 / 打回」；打回的改完复审
# 修完 → 去掉 -q draft 出正式版 output.mp4
./evaluate.sh runs/<name> [--theme <主题>] [--platform xhs]   # 最后一步：Eval（测字号/安全区 + 23 项自动检查）→ runs/<name>/eval.md
# 门槛不过不交付；WARN 逐条判断能修就修、修完重跑；通过后 → 拷到 ~/Desktop/口播增强_<版本>_<主题>.mp4 → SendUserFile
```
**每一支片子都以 Eval 收尾，交付消息里必须写：门槛是否通过、自动分、剩下的 WARN 以及为什么可以接受。**

环境：ffmpeg/ffprobe 在 `~/.local/bin`；whisper 模型 `~/.cache/kvb-models/ggml-medium-q5_0.bin`（被清盘删过一次，prep.sh 会自动重下，515MB）；渲染用系统 Chrome。

### 校对 script.txt 的要点
- **先看 prep 的两项输出**：①「ASR 覆盖检查」，漏句要逐条重转补进稿子；②「源片自带烧录字幕」，检测到就默认关掉我们的字幕（见 `rules.md` §8）。
- **格式**：`|` 是换屏；句子结束处写 `。`，它只当边界、不显示；问号、感叹号照常保留；其余标点不写。
- 只改错字、不改说法；去气口（嗯/呃）可以，不润色不补词。专名按真名写（ClockCode→Claude Code，Codeash→Codex）。
- **听不清的词**：`.venv/bin/python retranscribe.py runs/<name> <起> <止> --terms "3–5 个本段术语"`，会给出原速、加术语、0.8 倍慢放三种结果。仍不确定的，交付时带时间列给用户听。
- 断屏：竖屏 ≤10 字/屏（拉丁字母算半个），在语义停顿处断；专名、数字+单位不拆；不以挂空的「的/和/在」结尾。语速快时 fix_caps 会在不跨句的前提下合并，上限 14 字。

## 主题（换设计系统）
组件里不写死任何颜色，全部走角色（`brand/themes/<name>/theme.json`）：
| 角色 | 用途 | Knock | 私有主题 |
|---|---|---|---|
| paper / card | 画布 / 卡片 | 纸白 / 白 | Gray50 / 白 |
| ink · ink70 · ink40 | 正文三级灰 | 墨黑系 | Gray900/700/500 |
| line · lineSoft | 分割线 | 石灰 | Gray300/100 |
| **mark** + markInk | 点亮态填充（当前项、勾、进度标） | 门黄 | Tappy Green |
| **accent** | 一屏一处的强调（终点框、指令符、关键词） | 敲击橙 | Signal Purple |
| frame · stroke · shadow · radius | 卡片边框/阴影/圆角 | 1.5px 墨黑描边、无阴影、18 | 1px 浅灰边+极淡阴影、16 |
| fontCn / fontEn / fontMono + fonts[] | 字体（本地 ttf，渲染不联网） | Outfit | Plus Jakarta Sans / Inter / JetBrains Mono |
| logo · logoPill | 右上角 logo，是否套胶囊 | 套 | 裸放 |
| caption.style | 字幕：`pill` 胶囊卡拉 OK / `stroke` 白字黑描边 | pill | stroke（私有主题 PRD V3 字幕规范） |

**接一个新设计系统的步骤**：①读它的规范，找 B 线/产品 UI 密度那一档（视频叠层要克制，营销 A 线的大色块不要搬）；②把品牌色分配到 mark（大面积点亮也不刺眼的那个）和 accent（只出现一处的那个），饱和品牌色宁可降成 mark 也别铺底；③字体下 OFL 版放进主题目录；④建 theme.json → build → 跑 eval + 人工 H4/H6；⑤白底亮发等场景检查字幕可读（stroke 风格要加粗描边）。

## 写 beats.mjs：先判断，再选组件

### 第零步：先理结构，再写小标题
**通读全文**，写出 `runs/<name>/structure.md`：论点、结构类型（路径 / 框架 / 并列 / 问题→解法 / 对比）、每段的角色和结论。小标题 = 角色词 · 结论（≤12 字），连起来读应该就是论证本身。不要一段一段单独起名，那样写出来的只是话题标签（用户两次否掉）。细则和样例见 `references/rules.md` §4。

### 第一步：剪辑台本——先想「剪辑师在这里会切到什么画面」（最重要，见 `references/editor.md`）
先写 `runs/<name>/cut.md`，再写 beats.mjs。逐段填：口播在讲什么 → 功能（解释 / 证明 / 重置注意力，都不是就不加图）→ 剪辑师会切到的画面 → 素材等级 → 为什么不用更高一级。
- **素材等级从高往低找**：①真实素材（新闻/官网截图、真实照片、真实界面，用 `grab.mjs` / `commons.py` 取，`photo` 组件放）→ ②演示（`cc` / `folio` / `resume` / `checktable`）→ ③数据图 → ④文字卡。选 ③④ 必须写出具体理由。
- 口播提到一个真实存在的东西（新闻、报告、公司、产品、地方、人群），先试 ①。
- 一个画面只讲一件事，按口播顺序逐项进入；出现空格子、整张表一次性摆出来、大片留白，就要拆或者换素材。
- 只是观点、过渡、情绪、口头总结 → 全屏，不加图（可以慢推）。全片 4–6 个图形就够。

### 第二步：组件选型
素材等级定了，再挑组件。第 ③④ 级按内容形状查 `references/rules.md` §6 的表；组件写法见 `references/components.md`。
- 全片有「N 点」结构时，进度标由 build 根据 CH + TRACK 自动生成。
- `cc` 能演任何「指令 → 步骤 → 产出」的软件操作，不局限于 AI 工具。
- 口播出现「留言 / 关注 / 私信」时，用 `cta`。
- 库里没有合适的组件：按 `components.md` 末尾的「新组件清单」新写一个。
- 用口播外的真实数据，先看 `rules.md` §7 的边界。

HyperFrames 官方目录（`npx hyperframes catalog`）有 tiktok-follow / yt-comment-card / claude-exchange / chatgpt-exchange / code-typing 等现成块，但自带平台配色和假账号/假评论/假点赞——**只借动作，换 Knock 皮，不用假社交证明**。新组件写进 `components.mjs` + `brand/components.css`，入场顺序遵循 `references/rules.md` §2；写法清单见 `references/components.md` 末尾的「新组件清单」。

### 字号（不按感觉定）
所有图形文字只用 6 档字号：hero 140 / display 96 / title 54 / body 36 / small 28 / micro 22，字幕 76 是画面里最大的阅读文字。一个图形最多 3 档；dense 不放大字号。规范、业界依据和平台安全区见 `references/typography.md`，由 Eval 的 T1–T5、S1 实测检查。

### 动效素材库（只用能挂到 GSAP 时间线上、能逐帧对齐的）
- **GSAP 全套插件**（2025 年起免费，可商用；已在 node_modules 里，build 自动加载）：`DrawSVG` 线条描画，`MorphSVG` 形状变形（比如「补丁」碎裂），`MotionPath` 沿路径运动（比如逃逸轨道的 `escape` 组件）。
- **rough.js**（MIT）：手绘圈注。beat 上写 `annot: [{ sel, kind: 'circle'|'underline'|'box'|'strike', at }]`；路径用固定种子在 Node 里生成，每次渲染都一样；只给结论用，每个图形 ≤2 处。
- **HyperFrames 官方组件目录**（Apache-2.0）：只借动作，换成本主题的皮肤。
- 可以用但有限制：Lottie 免费动画可商用，但不能再分发原文件，只能留在本地，不进公开仓库。不用：纯 CSS 动画库（不能逐帧对齐）。

### 品牌 logo / 图标（真实的，不手画）
图形里一出现产品/公司名，就在名字前加真 logo：文本里写 `:openai: ChatGPT`，`md()` 会内联 `brand/icons/openai.svg`。
- 取图：`./fetch_icons.sh openai gemini google claudecode codex deepmind …`（Lobe Icons，MIT；`si:xiaohongshu` 走 Simple Icons，CC0）；来源记在 `brand/icons/SOURCES.txt`。
- **一律用单色版**（继承主题 ink 色）：彩色 logo（Gemini 渐变、Google 四色）会破坏「强调色一屏一处」。
- 名字和 logo 要对得上真实归属（Veo 用 DeepMind 标）；库里没有的品牌就只写字，不拿近似图标凑。
- 只做指代（谁的产品），不暗示合作/背书。

### 第三步：时间
所有时间用 `t('…原话…')` 从校对稿里取（不手填秒数），图形元素在关键词被说出的那一刻出现；指令类文字逐字打出（dur 约等于那句话的长度）。

## 运镜规则（写在 beats.mjs 的 CAM 里）

| 布局 | 什么时候 | 参数 |
|---|---|---|
| `full` 全屏 | 人是内容：钩子、观点、过渡、「从前怎么做」的叙述、收尾、CTA | s 1 |
| `split` 让位 | **只在图形承载信息时**；两段图形间隔 < 4s 不回全屏（避免一缩一放） | s .62 贴底 |
| `dense` 密集 | 信息密的图形（表格 ≥8 行、清单 ≥6 项、示意会话/报告/简历），beat 上写 `dense: true`；**多出来的空间用 `below` 放第二层可视化，不是放大字体** | s .50 贴底居中，图形区 760px（见 rules.md §5） |
| `push` 慢推 | 关键判断、定义、回顾到片尾 | 1.00→1.06，d 5–9s |
| `punch` 硬切放大 | **只给钩子金句**，换章时硬切回 | s 1.14，d 0；贴脸自拍用 beats 里 `LAYOUT.punch` 降到 1.07 |

**让位（split）用 `snapBefore()`**：只往前找停顿，保证人先开始让位、图形后入场（build 会对违反的图形报警，Eval C6 检查）。其余移动用 `snap()` 吸到说话停顿（voiced.json 的间隙；±0.7s 找不到就放宽到 ±1.4s；语速快到完全没停顿时退到最近的字幕断点），镜头不在词中间动；split 的落位要早于图形入场。

## Eval（交付前必跑）
流水线最后一步 `./evaluate.sh runs/<name>`（内部先跑 `node audit.mjs` 实测字号与位置，再跑 `python3 eval.py`）→ `eval*.md`：门槛 A1–A5（不过不交付）+ 自动 B1–B6/C1–C5 + 人工 H1–H6 评分表。标准、阈值、出处、基线分见 `references/eval.md`。交付时报：门槛是否通过、自动分、主要 WARN 及是否属于可接受的判断项。

## 交付前自检（看 review 联系表，每段末尾一帧 + 每个示意界面 3–4 帧）
- 有没有卡片在复述字幕？有就删。
- 字/元素有没有出界、压进字幕带（y 1520–1670）、遮脸？
- 示意界面：空容器是否先于内容露出（要整块淡入）？长内容是否自动上滚？数字有没有出处？
- 进度标对不对（当前点/已完成/回顾全勾）？
- 时长 = 原片（ffprobe 对一下）。

交付话术：说清每个图形在哪一秒、给观众多了什么；哪些是示意、哪些是真实检索（附来源链接）；还要用户听一下的不确定字。

## 已知坑
- iPhone/可立拍原片常是 HLG HDR：只改色彩标签会肤色发黄，用 `avconvert -p Preset1920x1080`（prep.sh 已处理）；渲染加 `--sdr`。
- Whisper 会把片头静音时间拉向 0 → align.py 的 VAD 校时处理；长段无标点 → resegment.py。
- 不能在 `class="clip"` 元素上动 opacity，出场动画打在内层；GSAP 时间轴必须 paused 并挂 `window.__timelines["main"]`。
- 在 Python 里改 components.mjs 时 `'\n'` 会被转义成真换行导致 JS 语法错——用 `'\\n'`。
- GSAP 不能动 `left/top`（lint 报 gsap_non_transform_motion）——用 x/y，需要宽度就在页面脚本里量 clientWidth。
- 模板字符串 `${}` 在 Node 里求值，别在里面写 `document.*`（要放进输出的 JS 字符串里）。
- 删除 review 帧别用 `rm` 通配（会被安全检查拦）；直接覆盖写同名文件。

## 版本史（口味演进，别回头）
v1 Knock 三色铺屏 + 画中画 → 否（太艳、挡脸）｜v3 Claude 皮 → 否（用我的设计系统）｜v4 PRD 每段必增强 → 否（"你是把他说的话又可视化了"）｜v5 只留进度/机制图/示意 mock ✓｜v6 示意改成真实界面+真实数据 ✓｜v7 补作品集/简历示意 + 运镜规则 ✓（"这一版很好了"）｜10-01 skill 首跑 ai-value + 主题化（Knock/私有主题）+ Eval v1｜10-02 泛化成「内容形状 → 组件」后盲测片变成一堆表格文字卡 → 否（「可视化没有之前好了」）→ 加剪辑师视角：剪辑台本 + 素材等级 + 真实素材组件 + 审片
