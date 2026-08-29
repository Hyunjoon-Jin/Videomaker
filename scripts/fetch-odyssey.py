#!/usr/bin/env python3
"""오디세이아 본문을 받는다.

## 둘을 같이 받는 까닭

**버틀러 영역**(구텐베르크 1727)은 산문이라 읽고 자리를 찾기 쉽다.
그런데 행 번호가 없어서 인용할 수가 없다.

**페르세우스 그리스어 원문**(`tlg0012.tlg002.perseus-grc2`)에는
`<l n="...">`로 행 번호가 붙어 있다. 영역으로 찾은 자리를 여기서
확인한다.

`/data/`는 커밋하지 않으므로(.gitignore) 필요하면 다시 받는다.

사용:  python3 scripts/fetch-odyssey.py
출력:  data/odyssey-butler.txt, data/odyssey-grc.xml
"""
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")

SRC = [
    ("odyssey-butler.txt",
     "https://www.gutenberg.org/cache/epub/1727/pg1727.txt"),
    ("odyssey-grc.xml",
     "https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/"
     "master/data/tlg0012/tlg002/tlg0012.tlg002.perseus-grc2.xml"),
]


def main():
    os.makedirs(DATA, exist_ok=True)
    for name, url in SRC:
        with urllib.request.urlopen(url, timeout=180) as r:
            raw = r.read()
        out = os.path.join(DATA, name)
        open(out, "wb").write(raw)
        print(f"{len(raw):,}바이트 → {out}")


if __name__ == "__main__":
    main()
