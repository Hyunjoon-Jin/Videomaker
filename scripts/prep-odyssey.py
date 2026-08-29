#!/usr/bin/env python3
"""오디세이아 — 본문에 적힌 날을 다 더한다.

## 야마

**10년 동안 오디세우스가 바다 위를 나아간 날은 52일이다.**

나머지는 붙잡혀 있던 시간이다. 칼립소 7년, 키르케 1년, 아이올로스
한 달, 트리나키아 한 달 — 2,980일.

## 자가 자료 안에 있다

본문이 스스로 10년이라고 말한다.

```
5.107   εἰνάετες, δεκάτῳ δὲ πόλιν πέρσαντες     9년 싸우고 10년째 함락
16.206  ἤλυθον εἰκοστῷ ἔτεϊ ἐς πατρίδα γαῖαν    20년째에 고향 땅
```

20년에서 전쟁 10년을 빼면 귀환이 10년이다. 3,650일.

## 그리고 1년 8개월이 비어 있다

적힌 날을 다 더해도 3,040일 — 8년 4개월이다. 나머지 610일은 본문에
날수가 없다. 이건 편의 마무리가 아니라 고정댓글 자리다.

## 행 번호는 원문으로 맞췄다

버틀러 영역(구텐베르크 1727)으로 자리를 찾고, 페르세우스 그리스어
원문(`tlg0012.tlg002.perseus-grc2`)에서 행 번호를 확인했다. 열세
군데가 다 맞았다.

사용:  python3 scripts/prep-odyssey.py
자료:  data/odyssey-grc.xml  (없으면 scripts/fetch-odyssey.py)
"""
import os
import re
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
GRC = os.path.join(HERE, "..", "data", "odyssey-grc.xml")

YEAR = 365

# (갈래, 이름, 날수, 권.행, 그리스어 낱말)
#   항해 — 배가 나아간 날
#   붙잡힘 — 한자리에 머문 날
#   뭍 — 날수가 적힌 짧은 상륙
LEDGER = [
    ("뭍",   "키코네스 뒤 폭풍",        2,    (9, 74),   "δυω νυκτας"),
    ("항해", "말레아곶 → 로토파고이",    9,    (9, 82),   "εννημαρ"),
    ("붙잡힘", "아이올리아 · 아이올로스",  30,   (10, 14),  "μηνα"),
    ("항해", "아이올리아 → 이타카 코앞",  9,    (10, 28),  "εννημαρ"),
    ("항해", "→ 라이스트리고네스",       6,    (10, 80),  "εξημαρ"),
    ("뭍",   "라이스트리고네스 앞",      2,    (10, 142), "δυο τ ηματα"),
    ("붙잡힘", "아이아이에 · 키르케",    YEAR, (10, 467), "ενιαυτον"),
    ("붙잡힘", "트리나키아 · 남풍",       30,   (12, 325), "μηνα"),
    ("항해", "난파 → 오기기아",          9,    (12, 447), "εννημαρ"),
    ("붙잡힘", "오기기아 · 칼립소",   7 * YEAR, (7, 259),  "επταετες"),
    ("뭍",   "뗏목 만들기",             4,    (5, 262),  "τετρατ"),
    ("항해", "뗏목 항해",               17,   (5, 278),  "επτα"),
    ("항해", "폭풍 표류 → 스케리아",     2,    (5, 388),  "δυω νυκτας"),
]

# 전체를 재는 자. 이것도 본문이 준다.
FRAME = [
    ("전쟁 9년, 10년째 함락", (5, 107), "εινaετες"),  # 확인용이라 검사 안 함
    ("20년째에 고향 땅",      (16, 206), "εικοστ"),
    ("제우스가 말한 20일",    (5, 34),   "εικοστ"),
]

RETURN_DAYS = 10 * YEAR


def load():
    text = open(GRC, encoding="utf-8").read()
    books = {}
    for m in re.finditer(
            r'<div n="(\d+)" type="textpart" subtype="book">(.*?)</div>',
            text, re.S):
        lines = {}
        for lm in re.finditer(r'<l n="(\d+)">(.*?)</l>', m.group(2), re.S):
            s = re.sub(r"<[^>]+>", "", lm.group(2))
            lines[int(lm.group(1))] = re.sub(r"\s+", " ", s).strip()
        books[int(m.group(1))] = lines
    return books


def bare(s):
    """악센트와 생략 부호를 떼어 비교한다.

    원문에는 U+02BC(ʼ)로 elision을 적어 둬서, 그냥 두면
    'δύο τʼ ἤματα'가 'δυο τ ηματα'와 안 맞는다.
    """
    s = "".join(c for c in unicodedata.normalize("NFD", s)
                if unicodedata.category(c) != "Mn")
    return re.sub(r"[\u02bc\u2019\u1fbd']", "", s).lower()


def main():
    books = load()
    print(f"{len(books)}권 · {sum(len(v) for v in books.values())}행\n")

    print("== 본문에 날수가 적힌 것")
    bad = 0
    tot = {"항해": 0, "붙잡힘": 0, "뭍": 0}
    for kind, name, days, (b, ln), word in LEDGER:
        line = books.get(b, {}).get(ln, "")
        ok = word in bare(line)
        bad += 0 if ok else 1
        tot[kind] += days
        print(f'  {kind:4s} {name:22s}{days:6d}일  {b:2d}.{ln:<4d}'
              f'{"" if ok else "  ← 안 맞음"}  {line[:44]}')
    print()
    for k in ("항해", "붙잡힘", "뭍"):
        print(f"  {k:4s} {tot[k]:6d}일")
    s = sum(tot.values())
    print(f"  {'합계':4s} {s:6d}일 = {s // YEAR}년 {(s % YEAR) // 30}개월")

    print("\n== 전체를 재는 자")
    for name, (b, ln), word in FRAME:
        line = books.get(b, {}).get(ln, "")
        print(f"  {name:22s} {b:2d}.{ln:<4d} {line[:52]}")
    gap = RETURN_DAYS - s
    print(f"\n  귀환 10년 = {RETURN_DAYS}일")
    print(f"  적힌 날    = {s}일")
    print(f"  빈 날      = {gap}일 = {gap // YEAR}년 {(gap % YEAR) // 30}개월")
    print(f"\n  바다 위를 나아간 날 {tot['항해']}일 "
          f"= 10년의 {tot['항해'] / RETURN_DAYS * 100:.1f}%")
    if bad:
        print(f"\n행 번호 {bad}군데가 안 맞는다.")


if __name__ == "__main__":
    main()
