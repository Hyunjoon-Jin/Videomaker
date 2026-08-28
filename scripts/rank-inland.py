#!/usr/bin/env python3
"""바다에서 가장 먼 지자체 순위 — 19편의 다섯 걸음.

## 나온 것

```
 1  119.70km  경북 상주시 공성면    서해 119.71  동해 119.70
 2  118.85km  경북 김천시 어모면    서해 118.85  동해 118.88
 3  118.41km  충북 영동군 추풍령면  서해 118.41  동해 118.58
 4  113.50km  경북 문경시 점촌4동   서해 113.50  동해 113.50
 5  111.64km  충북 제천시 덕산면    서해 111.64  동해 111.67
 6  111.16km  경북 구미시 무을면    서해 126.91  동해 111.16
```

**1위부터 5위까지가 동해와 서해에서 같은 거리다.** 우연이 아니다.
한쪽 바다가 더 가까우면 반대쪽으로 더 갈 자리가 남아 있다는 뜻이라,
가장 먼 점은 두 바다가 같아지는 자리에서만 멈춘다.

6위 구미부터 한쪽으로 기운다.

## 왜 전국을 안 훑나

`prep-inland.py`가 시도별로 재둔 값에서 100km를 넘는 곳이
경북·충북·강원·전북·경남뿐이었고 봉우리가 다 이 상자 안이다.
5위 문턱이 110km대라 93km짜리 경기 양평까지 담기는 상자면 넉넉하다.

사용:  python3 scripts/rank-inland.py
"""
import importlib.util
import os

spec = importlib.util.spec_from_file_location(
    "pi", os.path.join(os.path.dirname(os.path.abspath(__file__)), "prep-inland.py"))
pi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pi)

BOX = (127.2, 128.9, 35.6, 37.4)


def unit(name):
    if name.endswith("구") and "시" in name[:-1]:
        return name[: name.index("시") + 1]
    return name


grid, n = pi.load_coast()
print(f'해안선 {n:,}점', flush=True)
polys = pi.load_polys(
    pi.MUNI,
    lambda pr: pi.SIDO.get(str(pr['code'])[:2], '') + ' ' + unit(pr['name']))
idx = pi.index(polys)
sub = pi.load_polys(pi.SUB, lambda pr: pr.get('name', ''))
sidx = pi.index(sub)

seed = {}
x = BOX[0]
while x <= BOX[1]:
    y = BOX[2]
    while y <= BOX[3]:
        nm = pi.where(x, y, polys, idx)
        if nm:
            d, _ = pi.nearest(grid, (x, y))
            if nm not in seed or d > seed[nm][0]:
                seed[nm] = (d, x, y)
        y += 0.02
    x += 0.02
print(f'{len(seed)}곳 훑음', flush=True)

rough = sorted(seed.items(), key=lambda kv: -kv[1][0])
rows = []
for nm, (d0, sx, sy) in rough[:10]:
    best = (0.0, sx, sy, None, None)
    for step, half in ((0.005, 0.03), (0.001, 0.006)):
        cx, cy = best[1], best[2]
        x = cx - half
        while x <= cx + half + 1e-9:
            y = cy - half
            while y <= cy + half + 1e-9:
                if pi.where(x, y, polys, idx) == nm:
                    d, q = pi.nearest(grid, (x, y))
                    if d > best[0]:
                        best = (d, x, y, nm, q)
                y += step
            x += step
    rows.append((best[0], nm, best[1], best[2], best[4]))
    print(f'  {best[0]:7.2f} {nm}', flush=True)
rows.sort(reverse=True)

print('\n== 바다에서 가장 먼 지자체')
for i, (d, nm, x, y, q) in enumerate(rows, 1):
    emd = pi.where(x, y, sub, sidx)
    line = (f'{i:3d} {d:7.2f}km  {nm:12s}{str(emd):10s} {x:.4f},{y:.4f}')
    seas = []
    for lab, keep in pi.SEAS:
        dd, qq = pi.nearest(grid, (x, y), keep)
        seas.append(f'{lab} {dd:.2f}({qq[0]:.3f},{qq[1]:.3f})')
    print(line + '  ' + ' · '.join(seas), flush=True)
