#!/usr/bin/env python3
"""公开授权图片：在 Wikimedia Commons 搜图，下载候选并记下授权与作者。
用法：python3 commons.py "<英文关键词>" runs/<name>/assets [--n 6]
输出：assets/commons_<k>.jpg + assets/commons.json（每张的 title / license / artist / page / w / h / credit）。
先看图再挑；只用 CC0 / CC BY / CC BY-SA / Public domain；成片 credit 原样写 credit 字段。"""
import json, os, re, sys, urllib.parse, urllib.request
q, out = sys.argv[1], sys.argv[2]
n = int(sys.argv[sys.argv.index('--n') + 1]) if '--n' in sys.argv else 6
UA = {'User-Agent': 'video-boost/1.0 (https://github.com/Minerva67/video-boost)'}
api = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({
    'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': 6, 'gsrsearch': q + ' filetype:bitmap',
    'gsrlimit': n * 2, 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 1280})
data = json.load(urllib.request.urlopen(urllib.request.Request(api, headers=UA), timeout=30))
pages = sorted(data.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 0))
strip = lambda s: re.sub(r'<[^>]+>', '', s or '').strip()
OK = re.compile(r'cc0|cc[- ]by|public domain|pd', re.I)
os.makedirs(out, exist_ok=True)
res = []
for p in pages:
    ii = p['imageinfo'][0]; m = ii.get('extmetadata', {})
    lic = strip(m.get('LicenseShortName', {}).get('value'))
    if not OK.search(lic): continue
    k = len(res); fn = os.path.join(out, f'commons_{k}.jpg')
    open(fn, 'wb').write(urllib.request.urlopen(urllib.request.Request(ii.get('thumburl') or ii['url'], headers=UA), timeout=60).read())
    artist = strip(m.get('Artist', {}).get('value'))[:60]
    res.append({'file': os.path.basename(fn), 'title': p['title'], 'license': lic, 'artist': artist, 'page': ii.get('descriptionurl'),
                'w': ii.get('thumbwidth') or ii['width'], 'h': ii.get('thumbheight') or ii['height'],
                'credit': f'图：{artist or "佚名"} · {lic} · Wikimedia Commons'})
    if len(res) >= n: break
json.dump(res, open(os.path.join(out, 'commons.json'), 'w'), ensure_ascii=False, indent=1)
for r in res: print(r['file'], r['w'], 'x', r['h'], '|', r['license'], '|', r['title'][:70])
if not res: print('没有找到可用授权的图；换关键词，或改用 grab.mjs 截新闻页')
