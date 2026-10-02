# 字号、层级与安全区（竖屏 1080×1920）

用户反馈过「特效的字整体偏大，不如升级之前」。根因是 dense 一来就整体放大字号，层级乱了。这里定死一套行业通行的做法，Eval 用 `audit.mjs` 实测检查。

## 1. 字号阶梯（按角色，不按感觉）
| 角色 | 字号 | 只用于 |
|---|---|---|
| hero | 140px | 整屏唯一的超大数字或术语（数据大牌、定义卡的术语） |
| display | 96px | 关键数字读数（一屏最多一个） |
| title | 54px | 图形标题 |
| body | 36px | 要读的内容：结论、关键词、清单行、分栏标题 |
| small | 28px | 界面示意里的行（终端、表格、卡片）、次要说明 |
| micro | 22px | 只放来源、单位、角标、缩略卡片；不放要读的内容 |
| 字幕 | 76px | 胶囊字幕，画面里最大的阅读文字 |

组件 CSS 里只写 `var(--fs-…)`，不写裸像素值。新组件也一样。

**依据**
- 视频正文字号下限：1080 竖屏、手机距离观看，正文约 36–40px 起；标题至少比正文大 50%。来源：[legibility.info · Rules for text in videos](https://legibility.info/rules-for-text-in-videos)，[竖屏下三分之一字幕的可读性](https://www.axisaistudios.com/blog/lower-third-design-for-vertical-drama-mobile-legibility)。
- 字幕：BBC 规定 9:16 视频的字幕行高为画面高的 4.5%（≈86px，对应字号约 66–76px），行宽不超过画面宽的 90%。来源：[BBC 字幕规范摘要](https://www.clevercast.com/bbc-subtitling-guidelines/)。
- 阶梯：同一个比例系数生成的阶梯（1.25–1.33 倍）；按角色命名；一个页面的标题层级不超过 6 级，且相邻层级不跳级。来源：[Type Scale Systems](https://www.typographymaster.com/guide/type-scale-systems)，[Modular type scale guide](https://brainy.ink/paper/modular-type-scale-guide)。

## 2. 层级规则
1. **一个图形最多 3 档阅读字号**（来源用的 micro、关键数字用的 display/hero 另计）。超过 3 档，观众就分不清主次。
2. **字幕是最大的阅读文字。** 图形里比字幕大的元素，每个图形最多一个（就是那个关键数字）。
3. **一屏最多 3 行要读的字，一行不超过约 30 个字。** 再多就拆屏，或者改成图。
4. **dense 不放大字号。** dense 多出来的空间放第二层可视化（`below` 面板），字号仍然按上表。
5. 字号对比要拉开：相邻两档至少差 1.25 倍。差太小，看起来就像「写错了字号」。

## 3. 平台安全区（1080×1920，四边要留出给平台界面的像素）
| 平台 | 上 | 下 | 右 | 来源 |
|---|---|---|---|---|
| 小红书（默认） | 150 | 200 | — | [小红书视频规格与安全区](https://www.sohu.com/a/869326643_122307090)（常见建议：上下各留约 15%，文字距顶 ≥150、距底 ≥200） |
| 抖音 / TikTok | 130 | 484 | 140 | [TikTok Safe Zone 2026](https://brandeal.ai/en/blog/tiktok-safe-zone-guide) |
| Instagram Reels | 180 | 320 | 160 | [Reels Safe Zone](https://reelsafezone.com/) |
| YouTube Shorts | 110 | 420 | 140 | [Safe Zone Guide](https://kreatli.com/guides/safe-zone-guide) |

- 三个海外平台都要发时，取交集：关键内容放在画面高度 12%–72% 之间。
- **当前布局的已知问题**：进度标和 logo 在顶部 40–108px，按小红书的建议偏高；字幕底边在 1670（离底 250px），小红书和 Reels 够用，抖音会被挡。要换平台，先改布局再出片，见 `eval.py` 的 S1。
- 检查：`node audit.mjs runs/<name> --platform xhs|douyin|reels|shorts`。
