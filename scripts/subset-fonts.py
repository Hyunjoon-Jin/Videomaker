#!/usr/bin/env python3
"""
Pretendard 폰트를 소스에 실제로 등장하는 글자만으로 서브셋한다.
(전체 Pretendard woff2는 웨이트당 ~800KB, 서브셋하면 ~40KB)

전제: public/fonts/Pretendard-{Regular,Medium,Bold,Black}.woff2 원본이 있어야 함.
      원본은 npm 패키지 `pretendard`(dist/web/static/woff2)에서 가져온다.

⚠ 자막에 '새로운 한글 글자'를 추가한 뒤에는 이 스크립트를 다시 실행해야
   해당 글자가 폰트에 포함된다. 실행 전 원본 폰트를 복원할 것.

사용:  pip install fonttools brotli && python3 scripts/subset-fonts.py
"""
import glob
import os
import subprocess

WEIGHTS = ["Regular", "Medium", "Bold", "Black"]
EXTRA = (
    "0123456789"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    " .,!?…·—-–:;/()[]％%＋+~★●▷_|'\""
)


def main() -> None:
    chars = set()
    for f in glob.glob("src/**/*.tsx", recursive=True) + glob.glob(
        "src/**/*.ts", recursive=True
    ):
        with open(f, encoding="utf-8") as fh:
            chars |= set(fh.read())
    chars |= set(EXTRA)
    chars = {c for c in chars if ord(c) >= 0x20}
    print(f"glyphs: {len(chars)}")

    unicodes = ",".join(f"U+{ord(c):04X}" for c in chars)
    for w in WEIGHTS:
        src = f"public/fonts/Pretendard-{w}.woff2"
        subprocess.run(
            [
                "pyftsubset",
                src,
                f"--unicodes={unicodes}",
                "--flavor=woff2",
                f"--output-file={src}",  # 제자리 교체
            ],
            check=True,
        )
        print(f"  {w}: {os.path.getsize(src)} bytes")


if __name__ == "__main__":
    main()
