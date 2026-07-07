#!/usr/bin/env python3
"""
전 씬 스토리보드(콘택트 시트) 생성.
1) 각 씬 대표 프레임을 스틸로 렌더 → out/board/
2) 3×5 그리드 라벨 시트로 합성 → out/storyboard.png

스틸은 단일 프레임이라 CPU 포화 상태에서도 안정적으로 렌더된다(전체 영상 렌더가
느리거나 실패할 때 빠른 확인용).

사용:  pip install pillow && python3 scripts/storyboard.py
전제:  Remotion 프로젝트 루트에서 실행, node_modules 설치 완료.
"""
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

# (컴포지션 id, 대표 프레임, 라벨)
SHOTS = [
    ("S01-Breaking", 40, "1 · 속보 인트로"),
    ("S02-Anchor", 70, "2 · AI 앵커 브리핑"),
    ("S03-PresidentA", 70, "3 · 아메리카나 대통령"),
    ("S04-PresidentB", 70, "4 · 유로피아 총리"),
    ("S05-Bumunjang", 110, "5 ★ · 김봉균 부문장"),
    ("BR-Bridge", 60, "브릿지 · PART1→2"),
    ("S06-Stadium", 40, "6 · 경기 시작"),
    ("S07-Homerun", 45, "7 · 홈런 몽타주"),
    ("S08-Steal", 170, "8 · 도루 탈환"),
    ("S09-Strikeout", 215, "9 · 삼진 행진"),
    ("S10-Losing", 110, "10 · 뒤지는 스코어"),
    ("S11-Eighth", 95, "11 · 약속의 8회말"),
    ("S12-FullCount", 130, "12 · 2사 만루 풀카운트"),
    ("S12B-BasesLoaded", 45, "12B · 만루(분할)"),
    ("S13-Swing", 44, "13 · 타격의 순간"),
    ("S14-Ending", 200, "14 · 엔딩 카피"),
]
COLS, ROWS = 4, 4


def main() -> None:
    os.makedirs("out/board", exist_ok=True)
    paths = []
    for i, (cid, frame, _) in enumerate(SHOTS, 1):
        out = f"out/board/{i:02d}_{cid}.png"
        subprocess.run(
            ["npx", "remotion", "still", cid, out,
             f"--frame={frame}", "--scale=0.5", "--log=error"],
            check=True,
        )
        paths.append(out)
        print("rendered", out)

    thumbs = [Image.open(p).convert("RGB") for p in paths]
    tw, th = thumbs[0].size
    pad, lab = 16, 44
    cw, ch = tw + pad * 2, th + lab + pad * 2
    sheet = Image.new("RGB", (cw * COLS, ch * ROWS), (12, 14, 20))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("public/fonts/Pretendard-Bold.woff2", 26)
    except Exception:
        font = ImageFont.load_default()
    for idx, (im, (_, _, label)) in enumerate(zip(thumbs, SHOTS)):
        r, c = divmod(idx, COLS)
        x, y = c * cw + pad, r * ch + pad
        sheet.paste(im, (x, y))
        draw.text((x + 2, y + th + 8), label, fill=(235, 240, 250), font=font)
    sheet.save("out/storyboard.png")
    print("saved out/storyboard.png", sheet.size)


if __name__ == "__main__":
    main()
