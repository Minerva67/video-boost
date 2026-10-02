// Beat sheet template — copy to runs/<name>/beats.mjs and replace the placeholder phrases with exact phrases from the
// corrected transcript (script.txt). Every time comes from t('phrase'), never hand-typed seconds.
export default ({ t, D, snap }) => {
const HL = ['关键词A', '关键词B'];                        // caption keywords coloured with the theme accent

// chapters → the persistent N-point tracker (intro shows "N 点", recap ticks all)
const CH = [[0, '开场'], [t('第一点'), '要点一'], [t('第二点'), '要点二'], [t('总结一下'), '回顾']];
const TRACK = { intro: true, recap: true };

const B = [
  // a mechanism the ear can't hold → trend / chain / ctxline …
  { c: 'trend', s: t('第一点') - .2, e: t('第二点') - .1, d: {
    at: t('第一点'), yLabel: '值钱程度 ↑', xLabel: '时间 →',
    a: { t: '会贬值的东西', at: t('越来越便宜'), labelAt: t('越来越便宜') + 1 },
    b: { t: '不会贬值的东西', at: t('真正值钱的') },
    gap: { t: '差距在这里', at: t('真正值钱的') + 1.5 } } },
  // the speaker describes doing something with a tool → show the real interface (mark 示意, real logos via :slug:)
  { c: 'cc', s: t('我会让') - .3, e: t('总结一下') - .1, d: {
    at: t('我会让') - .2, title: ':claudecode: Claude Code', tag: '示意', events: [
      { type: 'prompt', t: '帮我把这件事做完', at: t('我会让') + .1, dur: 1.2 },
      { type: 'tool', name: 'WebSearch', arg: '…', res: '…', at: t('去搜') },
      { type: 'done', t: '完成', at: t('就做完了') }] } },
  // the speaker asks for comments → CTA overlay to the end
  { c: 'cta', s: t('评论区') - .3, e: D, d: { at: t('评论区') - .2, main: '有问题？评论区见', btn: '去留言 ↓', pressAt: t('评论区') + .5 } },
];

// camera rules: split only while a graphic carries information; push on key claims; punch only on the hook
const CAM = [
  { t: 0, l: 'full', d: 0 },
  { t: snap(t('第一点') - .2), l: 'split' },
  { t: snap(t('总结一下')), l: 'full' },
  { t: t('总结一下') + .6, l: 'push', d: 7 },
];
return { HL, CH, TRACK, B, CAM };
};
