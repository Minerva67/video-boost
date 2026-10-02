# 组件数据结构（每个组件一个真实用例）
所有组件签名：`C[name](id, data) → { html, js }`，时间都是绝对秒数，用 `t('…原话…')` 取。beat 外层：`{ c: '组件名', s: 起, e: 止, d: data }`；`title`/`cta` 不包 `.zone`，其余包在顶部 550px 图形区里。

## `folio`

```js
  // ① 示意：作品集页——日常用法（灰）→ AI 项目卡 → 业务重构卡
  { c: 'folio', s: t('…原话…') - .1, e: CH[2][0] - .2, d: {
    at: t('…原话…'), title: '我的 AI 作品集',
    daily: [{ t: '会议纪要', at: t('…原话…') }, { t: '文档书写', at: t('…原话…') }],
    cards: [{ icon: '⌘', t: '选题助手', tag: 'Claude Code', at: t('…原话…') - .3 }, { icon: '◎', t: '竞品周报', tag: 'agent', at: t('…原话…') + .1 }, { icon: '¶', t: '用户访谈分析', tag: 'ChatGPT', at: t('…原话…') + .5 }],
    re: { from: '手工整理周报', to: 'agent 自动跑', at: t('…原话…') } } }
```

## `trend`

```js
  // ② 机制：工具门槛一路下降，行业 know-how 不随之下降 → 两线之间就是企业买的东西
  { c: 'trend', s: t('…原话…') - .2, e: t('…原话…') - .1, d: {
    at: t('…原话…') - .1, yLabel: '值钱程度 ↑', xLabel: '时间 →',
    a: { t: 'AI 工具门槛', at: t('…原话…') - .2, labelAt: t('…原话…') },
    b: { t: '你的行业 know-how', at: t('…原话…') },
    gap: { t: '企业买的<br>是这一段', at: t('…原话…') } } }
```

## `chain`

```js
  // ② 推导：AIGC 视频产品 → 内容创作 → 用户 → 哪种经验对口
  { c: 'chain', s: t('…原话…') - .1, e: t('…原话…') - .1, d: {
    at: t('…原话…'), title: '举个例子', steps: [
      { k: '产品', t: 'AIGC 视频工作流', at: t('…原话…') },
      { k: '本质', t: '内容创作', at: t('…原话…') },
      { k: '用户', t: '创作者 = 消费者', at: t('…原话…') },
      { k: '对口', t: '创作者管理 · 工具商业化', at: t('…原话…') }] } }
```

## `resume`

```js
  // ③ 示意：一行简历被改写 + HR 扫描 + 关键词命中
  { c: 'resume', s: CH[3][0] + .4, e: CH[4][0], d: {
    at: t('…原话…') - .2, who: '姓名', whoSub: '求职意向：AI 产品经理', secLabel: '工作经历 · 某大厂内容平台',
    old: ['负责创作者运营与增长', '推进工具类产品商业化'], new: ['用 AI agent 重构创作者运营流程', '用 Claude Code 搭商业化分析工具'], rewriteAt: t('…原话…') - .3, scanY: 300,
    scanAt: t('…原话…'), scanLabel: 'HR 筛选',
    items: [{ t: 'agent', at: t('…原话…') + .2 }, { t: '重构', at: t('…原话…') + .4 }, { t: 'harness', at: t('…原话…') },
      { t: 'Claude Code', at: t('…原话…') }, { t: 'Codex', at: t('…原话…') }, { t: 'ChatGPT', at: t('…原话…') }],
    settleAt: t('…原话…') + .6 } }
```

## `cc`

```js
  // ④ 示意 1：Claude Code 选题会话（话题标题为示意，不带热度数字）
  { c: 'cc', s: t('…原话…') - .3, e: t('…原话…') - .1, d: {
    at: t('…原话…') - .2, title: 'Claude Code', tag: '示意', events: [
      { type: 'prompt', t: '帮我找「大厂转型 AI」这个领域，小红书最近最热的 10 个话题', at: t('…原话…') + .1, dur: 1.8 },
      { type: 'tool', name: 'WebSearch', arg: '小红书 大厂转型AI 热门笔记', res: '抓取近 30 天高互动笔记', at: t('…原话…') },
      { type: 'tool', name: 'Fetch', arg: 'xiaohongshu.com/search?kw=转型AI', res: '按点赞 + 评论排序', at: t('…原话…') + .9 },
      { type: 'table', title: '热门话题 Top 10 · 近 30 天', at: t('…原话…') + .2, stagger: .14, rows: [
        { t: '大厂产品经理转 AI 的真实路径', heat: 1 }, { t: '不会写代码，能转 AI 吗', heat: .94 }, { t: 'AI 时代的简历怎么写', heat: .88 },
        { t: '35 岁转行 AI 还来得及吗', heat: .8 }, { t: '我用 Claude Code 做了个小工具', heat: .74 }, { t: 'AI 产品经理面试都问什么', heat: .66 },
        { t: '从运营转 AI 增长', heat: .58 }, { t: 'AI native 到底是什么意思', heat: .52 }, { t: '裸辞转 AI 的第一个月', heat: .45 }, { t: '普通人的 AI 作品集怎么做', heat: .4 }] },
      { type: 'prompt', t: '再看看这 3 位对标博主最近做了哪些话题', at: t('…原话…'), dur: 1.3 },
      { type: 'tool', name: 'Fetch', arg: '3 位博主主页 · 近 20 篇', res: '和 Top 10 交叉比对', at: t('…原话…') },
      { type: 'note', t: '讨论度最高、3 位都做过：<br>#02 不会写代码，能转 AI 吗　#03 AI 时代的简历怎么写', at: t('…原话…') },
      { type: 'done', t: '选题定了：不会写代码，能转 AI 吗', at: t('…原话…') }] } }
```

## `cta`

```js
  // ⑤ CTA：口播「如果你有什么问题 / 可以在底下留言」→ 行动卡停到片尾
  { c: 'cta', s: t('…原话…') - .3, e: D, d: { at: t('…原话…') - .2, main: '有问题？评论区见', sub: '把你的转型问题留在下面', btn: '去留言 ↓', pressAt: t('…原话…') + .5 } }
```

## `cc`

```js
  // ④ 示意 2：Claude Code 市场调研 → 报告（数字与来源为真实检索，2026-10-01）
  { c: 'cc', s: t('…原话…') - .3, e: CH[5][0], d: {
    at: t('…原话…') - .2, title: 'Claude Code', tag: '示意 · 数据为真实检索', events: [
      { type: 'prompt', t: '调研海外 AI 视频生成市场：规模多大、竞品有哪些，整理成报告，每条附来源', at: t('…原话…') + .1, dur: 2 },
      { type: 'tool', name: 'WebSearch', arg: 'AI video generator market size 2025', res: '10 份行业报告', at: t('…原话…') },
      { type: 'tool', name: 'Fetch', arg: 'fortunebusinessinsights.com', at: t('…原话…') },
      { type: 'tool', name: 'Fetch', arg: 'researchandmarkets.com', at: t('…原话…') + .5 },
      { type: 'tool', name: 'WebSearch', arg: 'Runway Synthesia HeyGen Veo', res: '竞品官网与定位', at: t('…原话…') },
      { type: 'doc', head: '海外 AI 视频生成市场 · 速览', at: t('…原话…'), stagger: .3, srcAt: t('…原话…') + .2, items: [
        { k: '2025 规模', v: '7.2 亿 – 8.5 亿美元', src: '①②' },
        { k: '年复合增速', v: '18.8% – 22.6%', src: '①②' },
        { k: 'Runway', v: '影视级生成与剪辑', src: 'runwayml.com' },
        { k: 'Synthesia', v: '企业培训 · 数字人', src: 'synthesia.io' },
        { k: 'HeyGen', v: '数字人 · 视频翻译', src: 'heygen.com' },
        { k: 'Google Veo', v: '大模型直接生成', src: 'deepmind.google' }],
        foot: '① Fortune Business Insights（2026–2034 预测）　② Research and Markets（2024–2029 预测）', footAt: t('…原话…') },
      { type: 'done', t: '已保存 market-report.md', at: t('…原话…') }] } }
```

## `photo`（真实素材：新闻/官网截图、公开授权照片）——素材等级 ①，优先考虑
```js
{ c: 'photo', s, e, d: {
  label: '参与人数 2518 万', at: t('…原话…'),
  src: 'assets/news.png', w: 1170, h: 7200,          // grab.mjs / commons.json 给出的像素尺寸
  url: 'news.example.com',                               // 有 url 就画浏览器地址栏（网页截图用；照片不写）
  marks: [{ x: 324, y: 2852, w: 254, h: 75, at: t('…原话…') }],   // grab.mjs --find 的输出；kind 默认 'hl' 荧光笔，'box' 橙框
  credit: '来源：某媒体 2025-04-16《报告标题》',
  dur: 7,            // 慢滚/慢推时长；默认从第一个 mark 上方滚到 mark 居中
  // view: [起点中心y, 终点中心y]（图片像素，手动指定滚动）；push: 1.04；focus: '50% 30%'（照片慢推的中心）
} }
```
- 取素材：`node grab.mjs <网址> runs/<name>/assets/x.png --find "页面上的原句"`（手机视口，自动去浮动广告和吸顶栏）；照片 `python3 commons.py "<英文关键词>" runs/<name>/assets`，看图后挑一张，credit 抄 `commons.json`。
- 截图前读原文核对；`--find` 找不到（`missing`）说明页面上没有这句话，不要硬画框。
- 照片别写 url；一张照片最多 1 个 mark。网页截图的文字要能读：手机视口截出来的正文在 split 布局下约 28–36px，够用；桌面版（`--desktop`）字太小，只用来展示页面全貌。

## 常用组件的数据格式（盲测时找不到的）
- `stat` {label, labelAt, num, numAt, source, sourceAt}：num 是字符串（`'2519 万'` 这种）。只在有对比或变化时用；单个数字能截到原文页面，就用 `photo`。
- `cases` {at, cols: ['谁', …], rows: [{ cells: [{ t, at }, …] }], litCol?, foot?, footAt?}：表头先出，格子按各自 at 逐个出现。每行是一个案例，超过 3 行就拆成两个 beat。
- `stack` {at, title?, items: [{ k?, t, s?, at }]}：口播用「第一、第二…」逐个引出 3–4 项时用；k 是角标（默认 01/02）。
- `grid` {title?, sub?, subAt?, cols: 2|3, items: [{ t, at }], allAt?}：格子按 at 逐个出现并打勾。
- 时间函数：`t('…原话…')` 取这几个字第一次出现的起点；同一句话出现多次时用 `t('原话', 某个秒数)`，取这个时间之后的第一次。`snap(x)` 吸到最近的停顿；`snapBefore(x)` 只往前找停顿（让位用）。

## 进度 + 运镜（CH / TRACK / CAM）

```js
const CH = [[0, '大厂转型 AI'], [t('…原话…'), '作品集'], [t('…原话…'), 'know-how'],
  [t('…原话…'), '简历叙事'], [t('…原话…'), 'AI native'], [t('…原话…'), '回顾']];


// ---------- camera rules (v6) ----------
// full  = 人是内容：钩子 / 观点 / 过渡 / 收尾 / CTA
// split = 只在图形承载信息时让位；两段图形间隔 < 4s 不回全屏
// push  = 关键判断 / 定义处慢推 1.00→1.06
// punch = 只给钩子金句：硬切放大，换章硬切回
// 所有移动吸附到说话停顿（VAD 间隙），不在词中间动
const CAM = [
  { t: 0, l: 'full', d: 0 },
  { t: t('…原话…') - .04, l: 'punch', d: 0 },
  { t: t('…原话…') - .04, l: 'full', d: 0 },
  { t: snap(t('…原话…') - .2), l: 'split' },                 // ① 作品集 → ② 机制 → 推导链：间隔都 < 4s，一直让位
  { t: snap(t('…原话…')), l: 'full' },
  { t: t('…原话…') + .8, l: 'push', d: 6 },                // 「这样的企业要求没那么高」：慢推
  { t: snap(CH[3][0]), l: 'split' },                             // ③ 简历
  { t: snap(CH[4][0]), l: 'full' },                              // ④ 先听观点
  { t: t('…原话…'), l: 'push', d: 5 },                 // 定义处慢推
  { t: snap(t('…原话…') - .3), l: 'split' },             // 示例 1
  { t: snap(t('…原话…')), l: 'full' },                         // 「从前怎么做」是叙述，回到人
  { t: snap(t('…原话…')), l: 'split' },                           // 示例 2
  { t: snap(CH[5][0]), l: 'full' },                              // 回顾 + CTA
  { t: CH[5][0] + .8, l: 'push', d: 9 },
];
```

## 其他可用组件（老库，v3 片子用过；按 PRD 负荷类型挑，且不复述原话）
- `title` {kicker, title(**强调**), at, knockAt}
- `stat` NUM 数据大牌 {label, labelAt, num, numAt, source, sourceAt}
- `share` NUM 环形占比 {question, formula, a(百分比), aAt, bAt, ...}
- `definition` TRM 定义卡 {at, term, en, meaning, meaningAt, foot, footAt}
- `split` CMP 分栏 {dir:'h'|'v', title, old:{at,tag,head,items[{t,at}],verdict,verdictAt}, new:{...}}
- `notthis` 反例对照 {title?, wrongLab, wrong, wrongAt, strikeAt, rightLab, right, rightAt, options?[{t,at}], or, optSize}
- `lines` ENU 逐行高亮 · `ladder` 递减阶梯 · `grid` ENU-02 网格带勾 {title, sub, cellsAt, cols, items[{t,at}], allAt} · `gauge` 仪表盘隐喻
- 示意旧版 `term`（灰条占位终端）已被 `cc` 取代，别用。


## 新组件清单（库里没有合适组件、要新写一个时）
1. 先查 `rules.md` §2 的模板表和 §6 的内容形状表，确认确实没有可用的；能用参数调出来的，不新写。
2. 写在 `components.mjs`：签名 `name: (id, d) => ({ html, js })`。所有颜色用 `${TH.x}`，不写裸色值；文字用 `md()` 包一下，这样 `:logo:` 和 `**加粗**` 才能生效。
3. 根元素要带 `id="${id}"`，否则按「id + 类名」选元素的动画会失效。子元素 id 一律加 `${id}-` 前缀。
4. 入场顺序按 `rules.md` §2 对应模板的规定写死，元素在关键词说出的那一刻出现（数据里用 `at: t('…原话…')`）。
5. 样式写进 `brand/components.css`：字号只用 `var(--fs-…)`（阶梯见 `typography.md`），颜色只用主题变量，高度用 `var(--zh)`，这样放进 dense 的 760px 区也能自适应。
6. 一个图形最多 3 档阅读字号；不要比字幕还大，那一个关键数字除外。
6b. 固定高度的框里放文字，要么算准行数（高度 = 行数 × 行高），要么用两行省略号（`-webkit-line-clamp`）；滚动的窗口底部加渐隐。不能让文字被拦腰切掉（Eval T6 会查）。
7. 动画只用 GSAP（transform 和 opacity），不用 CSS animation，也不动 `left` / `top`，否则不能逐帧渲染。
8. 写完跑 `node build.mjs` 加 lint，再用 snapshot 看单帧，最后 `./evaluate.sh` 检查。
