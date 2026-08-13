#!/usr/bin/env python3
"""
BGM 합성 — 임진왜란 7년 영상용.

음원을 구해 붙이는 대신 코드로 만든다. 이유가 두 가지다.
 1) 저작권 문제가 없다. 전부 사인파와 노이즈에서 나온다.
 2) 영상과 같은 타임라인을 쓰므로 타격이 정확히 맞는다. 전투 순간에
    북이 떨어지고, 전선이 밀리는 구간에서 드론이 조여든다.

구성(초) — src/ShortsWar.tsx의 LEGS와 같은 경계:
  0.0~2.4   훅        저역 임팩트 + 라이저
  2.4~11.4  1592 북상  타이코 가속, 긴장 상승
  11.4~19.4 1593 반격  박자 유지, 화성 밝아짐
  19.4~23.4 소강      북이 빠지고 드론만
  23.4~31.4 1597      다시 조여듦, 가장 빠름
  31.4~38.4 종결      큰 타격 후 감쇠

사용:  pip install numpy && python3 scripts/make-bgm.py [imjin|kw|ty]
출력:  public/bgm.wav (48kHz 16bit 스테레오)
"""
import math
import os
import struct
import wave

import numpy as np

import sys

SR = 48000

# 프리셋 — 영상마다 구간 경계와 강조 시점이 다르다.
# 경계는 각 컴포지션의 LEGS와 같은 값이어야 타격이 사건에 맞는다.
# 프리셋 — 영상마다 구간 경계도, 음악 구조도 다르다.
# 임진왜란의 정체기는 한가운데(1594~96 강화 협상)지만
# 6·25의 정체기는 끝(1951~53 고지전)이다. 조용한 구간의 위치가
# 다르므로 경계값만 바꿔서는 안 되고 섹션 구성을 따로 줘야 한다.
#
# 각 섹션: (시작, 끝, 드론 주파수, bpm 시작, bpm 끝)
#   bpm이 None이면 북 없이 드론만 — "아무 일도 없음"을 소리로 표현한다.
PRESETS = {
    # 훅이 4.5초다. 첫 문장을 다 쓰고 한 박자 쉰 뒤 숫자가 뜨는 시간까지
    # 포함한 값이라, 여기 경계는 각 컴포지션의 HOOK/LEGS와 같아야 한다.
    "imjin": {
        "out": "public/bgm.wav",
        "dur": 40.5,
        "hook": 4.5,
        "sections": [
            (4.5, 13.5, 41.2, 82, 116),    # 1592 북상 — 가속
            (13.5, 21.5, 61.7, 116, 104),  # 1593 반격 — 5도 위
            (21.5, 25.5, 36.7, None, None),  # 강화 협상 — 정지
            (25.5, 33.5, 38.9, 104, 138),  # 1597 — 가장 빠름
            (33.5, 39.5, 41.2, 100, 76),   # 종결
        ],
        "accents": [(6.7, 0.8), (9.1, 0.9), (11.5, 1.0),
                    (15.3, 0.9), (18.1, 1.0),
                    (26.7, 0.9), (28.9, 1.0), (30.7, 1.0)],
        "typing": [
            ("1592년 음력 5월 3일, 일본군 한양 입성", 4, 30, 0.42),
            ("11", 42, 8, 0.85),
            ("개월", 50, 8, 0.85),
            ("일본군이 한양을 차지하고 있던 기간", 72, 22, 0.46),
        ],
    },
    "kw": {
        "out": "public/bgm-kw.wav",
        "dur": 43.5,
        "hook": 4.5,
        "sections": [
            (4.5, 12.5, 41.2, 84, 124),    # 남침 → 낙동강, 조여든다
            (12.5, 19.5, 61.7, 124, 108),  # 인천상륙 → 서울 수복, 5도 위
            (19.5, 25.5, 65.4, 108, 98),   # 북진 → 압록강
            (25.5, 32.5, 36.7, 98, 142),   # 중공군 → 1·4후퇴, 가장 빠르고 낮게
            (32.5, 37.5, 41.2, 142, 92),   # 재수복 → 38선 고착
            (37.5, 42.5, 38.9, None, None),  # 고지전 2년 — 정지
        ],
        "accents": [(5.5, 1.0), (11.5, 1.0),      # 남침·낙동강
                    (13.5, 1.0), (17.5, 0.9),     # 인천상륙·서울수복
                    (24.1, 1.0),                  # 압록강
                    (26.5, 1.0), (31.3, 1.0),     # 중공군·1·4후퇴
                    (41.7, 1.0)],                 # 정전
        "typing": [
            ("1950년 6월 25일 새벽, 38선", 4, 30, 0.42),
            ("40", 40, 8, 0.85),
            ("일", 48, 8, 0.85),
            ("낙동강까지 밀리는 데 걸린 시간", 66, 22, 0.46),
        ],
    },
    "rail": {
        "out": "public/bgm-rail.wav",
        "dur": 44.5,
        "hook": 4.5,
        # 훅 4.5 + 9 + 7 + 6 + 5 + 5 + 6 + 꼬리 2 = 44.5초
        # 1944~1954 구간(20.5~26.5초)이 끊기는 대목이라 북을 뺀다.
        # 철도는 전투가 아니다. 북을 몰아치는 대신 규칙적인 맥박으로 두고,
        # 선이 끊기는 6초 동안 그 맥박을 통째로 빼서 정적을 만든다.
        "sections": [
            (4.5, 13.5, 41.2, 76, 92),     # 1899~1915 선이 뻗는다
            (13.5, 20.5, 43.7, 92, 104),   # 1915~1944 가장 멀리
            (20.5, 26.5, 32.7, None, None),  # 분단과 전쟁 — 맥박이 멈춘다
            (26.5, 31.5, 38.9, 72, 88),    # 1954~2001 다시 놓는다
            (31.5, 42.5, 46.2, 88, 106),   # 도라산·고속선
        ],
        "accents": [(8.4, 0.8),            # 경의선
                    (16.6, 0.9),           # 함경선
                    (21.1, 1.0),           # 38선
                    (24.1, 0.9),           # 6·25
                    (32.3, 1.0),           # 도라산
                    (34.0, 0.8)],          # KTX
        "typing": [
            ("서울역에서 신의주행 표를 팔던", 4, 30, 0.42),
            ("39", 38, 8, 0.85),
            ("년", 46, 8, 0.85),
            ("1906년 경의선 개통에서 1945년까지", 64, 22, 0.46),
        ],
    },
    "ty": {
        "out": "public/bgm-ty.wav",
        "dur": 54.0,
        "hook": 4.5,
        # 태풍은 전투가 아니라 접근이다. 북을 몰아치지 않고 드론을 조이며
        # 각 태풍이 상륙할 때만 크게 때린다.
        # 구간 길이가 태풍마다 다르다(9.5/11.5/9.5/10.5초).
        # ShortsTyphoon.tsx의 SECS와 같은 값이어야 타격이 상륙에 맞는다.
        "sections": [
            (4.5, 14.0, 38.9, 68, 80),     # 사라
            (14.0, 25.5, 41.2, 76, 88),    # 루사
            (25.5, 35.0, 36.7, 84, 96),    # 매미
            (35.0, 45.5, 32.7, 92, 108),   # 힌남노 — 가장 낮고 빠르게
            (45.5, 53.0, 41.2, None, None),  # 마무리 — 북이 빠지고 여운
        ],
        # 각 태풍의 상륙 시점(구간의 84%)에 타격
        "accents": [(12.5, 1.0), (23.7, 1.0), (33.5, 1.0), (43.8, 1.0), (46.5, 0.9)],
        "typing": [
            ("1959년 추석날, 남해안", 4, 30, 0.42),
            ("849", 32, 8, 0.85),
            ("명", 44, 8, 0.85),
            ("광복 이후 가장 많은 태풍 사망·실종자", 62, 22, 0.46),
        ],
    },
}

name = sys.argv[1] if len(sys.argv) > 1 else "imjin"
if name not in PRESETS:
    sys.exit(f"알 수 없는 프리셋: {name} (가능: {', '.join(PRESETS)})")
P = PRESETS[name]
DUR = P["dur"]
OUT = P["out"]
HOOK = P["hook"]
SECTIONS = P["sections"]
END = SECTIONS[-1][1]

n = int(SR * DUR)
t = np.arange(n) / SR
mix = np.zeros(n)


def env(start: float, dur: float, attack=0.002, curve=4.0) -> np.ndarray:
    """지수 감쇠 엔벨로프. 타악기용."""
    e = np.zeros(n)
    i0 = int(start * SR)
    i1 = min(n, i0 + int(dur * SR))
    if i0 >= n or i1 <= i0:
        return e
    k = np.arange(i1 - i0) / SR
    a = np.clip(k / attack, 0, 1)
    e[i0:i1] = a * np.exp(-curve * k / dur)
    return e


def taiko(at: float, gain=1.0, pitch=58.0, dur=0.6) -> None:
    """큰북 — 피치가 살짝 떨어지는 저역 사인 + 어택 노이즈."""
    e = env(at, dur, 0.001, 5.0)
    i0, i1 = int(at * SR), min(n, int((at + dur) * SR))
    if i1 <= i0:
        return
    k = np.arange(i1 - i0) / SR
    # 피치 드롭이 있어야 '북'으로 들린다. 고정 주파수면 그냥 삐 소리다.
    f = pitch * np.exp(-3.2 * k)
    ph = 2 * np.pi * np.cumsum(f) / SR
    # 휴대폰 스피커는 150Hz 아래를 거의 못 낸다. 기음만 쓰면 어택의 '탁'
    # 소리만 남고 몸통이 통째로 사라진다. 배음을 얹어야 북으로 들린다.
    body = 0.7 * np.sin(ph) + 0.85 * np.sin(ph * 2) + 0.5 * np.sin(ph * 3.2)
    seg = np.zeros(n)
    seg[i0:i1] = body
    # 어택 순간의 짧은 노이즈가 타격감을 만든다
    rng = np.random.default_rng(int(at * 1000) & 0xFFFF)
    noise = np.zeros(n)
    ln = min(n - i0, int(0.02 * SR))
    noise[i0:i0 + ln] = rng.standard_normal(ln) * np.linspace(1, 0, ln)
    mix[:] += (seg * e * 0.55 + noise * 0.10) * gain


def hit(at: float, gain=1.0, dur=1.6) -> None:
    """충돌음 — 넓은 노이즈, 큰 사건용."""
    rng = np.random.default_rng((int(at * 977) + 7) & 0xFFFF)
    e = env(at, dur, 0.001, 3.0)
    seg = np.zeros(n)
    i0, i1 = int(at * SR), min(n, int((at + dur) * SR))
    if i1 > i0:
        seg[i0:i1] = rng.standard_normal(i1 - i0)
        # 저역만 남겨 '쿵' 쪽으로. 단순 이동평균 = 저역통과.
        w = 24
        seg[i0:i1] = np.convolve(seg[i0:i1], np.ones(w) / w, mode="same")
    mix[:] += seg * e * gain * 1.4


def semi(root: float, n: float) -> float:
    """반음 n칸 위 주파수"""
    return root * (2.0 ** (n / 12.0))


def pluck(at: float, f: float, gain=0.5, dur=1.1) -> None:
    """
    뜯는 소리.

    이 곡들이 휴대폰에서 '탕탕' 소리로만 들리던 원인이 여기 있었다.
    화성을 전부 32~65Hz 드론에 담아뒀는데 휴대폰 스피커는 그 대역을
    재생하지 못한다. 남는 것은 타악기의 어택뿐이다.
    그래서 실제로 들리는 200~2000Hz에 음을 놓는 층을 따로 만든다.

    배음마다 감쇠 속도를 다르게 준다. 고배음이 먼저 죽어야 뜯는 소리가
    되고, 다 같이 죽으면 오르간처럼 들린다.
    """
    i0, i1 = int(at * SR), min(n, int((at + dur) * SR))
    if i1 <= i0:
        return
    k = np.arange(i1 - i0) / SR
    v = np.zeros(i1 - i0)
    for h, amp, dec in [(1, 1.0, 1.0), (2, 0.52, 0.60), (3, 0.30, 0.40),
                        (4.02, 0.17, 0.28), (5.97, 0.09, 0.20)]:
        v += amp * np.sin(2 * np.pi * f * h * k) * np.exp(-k / (dur * dec))
    # 어택의 짧은 잡음이 손끝이 줄에 닿는 소리를 만든다
    ln = min(len(v), int(0.004 * SR))
    rng = np.random.default_rng((int(at * 911) + 5) & 0xFFFF)
    v[:ln] += rng.standard_normal(ln) * 0.45
    mix[i0:i1] += v * gain * 0.33


def pad(a: float, b: float, root: float, gain=0.15) -> None:
    """
    지속 화음.

    드론과 같은 근음을 쓰되 실체는 옥타브 위에 둔다. 근음·단3도·5도를
    쌓아 조성을 잡아준다. 아주 느린 흔들림이 없으면 신호음처럼 들린다.
    """
    i0, i1 = int(a * SR), min(n, int(b * SR))
    if i1 <= i0:
        return
    k = np.arange(i1 - i0) / SR
    fade = np.minimum(np.minimum(k / 1.2, 1.0), np.clip((k[-1] - k) / 1.6, 0, 1))
    v = np.zeros(i1 - i0)
    for mult, amp in [(2.0, 0.50), (2.0 * 2 ** (3 / 12), 0.26),
                      (3.0, 0.34), (4.0, 0.18), (6.0, 0.10)]:
        drift = 1.0 + 0.0014 * np.sin(2 * np.pi * 0.06 * k + mult)
        v += amp * np.sin(2 * np.pi * root * mult * np.cumsum(drift) / SR)
    mix[i0:i1] += v * fade * gain


# 단5음 음형 — 어느 편이든 이 안에서만 논다. 조성이 흔들리지 않는다.
FIGURE = [0, 3, 7, 5, 3, 10, 7, 3]


def ostinato(a: float, b: float, bpm0: float, bpm1: float,
             root: float, gain=1.0) -> None:
    """
    반복 음형. 이 층이 곡을 곡으로 만든다.

    드론과 같은 음이되 여섯 배 위에서 연주한다. 화성은 그대로 두고
    실체만 휴대폰이 낼 수 있는 자리로 옮기는 것이다.
    """
    rng = np.random.default_rng((int(a * 613) + 41) & 0xFFFF)
    now, i = a, 0
    while now < b:
        prog = (now - a) / max(1e-6, b - a)
        bpm = bpm0 + (bpm1 - bpm0) * prog
        step = 60.0 / bpm / 2.0            # 8분음표
        deg = FIGURE[i % len(FIGURE)]
        # 세 바퀴에 한 번은 옥타브 위로 올려 같은 음형이 지겹지 않게
        if (i // len(FIGURE)) % 3 == 2:
            deg += 12
        f = semi(root * 6.0, deg)
        strong = (i % 4) == 0
        g = (0.55 if strong else 0.32) * (1.0 + rng.normal(0, 0.12))
        pluck(now + rng.normal(0, 0.007), f, gain * g, 0.95)
        now += step
        i += 1


def drone(a: float, b: float, base: float, gain: float, detune=1.008) -> None:
    """지속 저음 — 두 음을 살짝 어긋나게 겹쳐 맥놀이를 만든다."""
    i0, i1 = int(a * SR), min(n, int(b * SR))
    if i1 <= i0:
        return
    k = np.arange(i1 - i0) / SR
    fade = np.minimum(np.minimum(k / 0.8, 1.0), np.clip((k[-1] - k) / 1.2, 0, 1))
    # 주파수가 딱 고정되면 신호음처럼 들린다. 아주 느리게 흔들어 준다.
    drift = 1.0 + 0.0016 * np.sin(2 * np.pi * 0.09 * k + base)
    ph = 2 * np.pi * base * np.cumsum(drift) / SR
    v = (np.sin(ph)
         + 0.7 * np.sin(ph * detune)
         + 0.35 * np.sin(ph * 2))
    mix[i0:i1] += v * fade * gain


def riser(a: float, b: float, gain=0.5) -> None:
    """라이저 — 노이즈가 점점 밝아지며 조여든다."""
    i0, i1 = int(a * SR), min(n, int(b * SR))
    if i1 <= i0:
        return
    rng = np.random.default_rng(4242)
    k = np.linspace(0, 1, i1 - i0)
    nz = rng.standard_normal(i1 - i0)
    # 뒤로 갈수록 평활 폭을 줄여 고역을 살린다(=밝아진다)
    out = np.empty_like(nz)
    step = max(1, (i1 - i0) // 64)
    for s in range(0, i1 - i0, step):
        e = min(i1 - i0, s + step)
        w = max(1, int(40 * (1 - k[s]) + 2))
        out[s:e] = np.convolve(nz[s:e], np.ones(w) / w, mode="same")
    mix[i0:i1] += out * (k ** 2.2) * gain


def pulse_train(a: float, b: float, bpm0: float, bpm1: float, gain=0.7) -> None:
    """
    일정 구간을 북으로 채운다. bpm이 선형으로 변해 가속·감속이 들린다.

    박을 정확히 격자에 놓으면 사람이 친 것으로 안 들린다. 클릭 트랙이다.
    실제 연주자는 매번 몇 십 ms씩 앞뒤로 밀리고 세기도 고르지 않다.
    난수는 시작 시각에서 파생시켜 결정적으로 만든다 — 매번 다르게
    렌더되면 영상과 음악이 어긋난다.
    """
    rng = np.random.default_rng((int(a * 733) + 31) & 0xFFFF)
    now = a
    i = 0
    while now < b:
        prog = (now - a) / max(1e-6, b - a)
        bpm = bpm0 + (bpm1 - bpm0) * prog
        beat = 60.0 / bpm
        strong = (i % 4) == 0            # 4박에 한 번 강박
        # 강박은 덜 흔들리고 약박은 더 흔들린다. 사람이 그렇게 친다.
        jitter = rng.normal(0, 0.008 if strong else 0.018)
        vel = 1.0 + rng.normal(0, 0.10)
        taiko(max(a, now + jitter), gain * (1.0 if strong else 0.45) * vel,
              pitch=76 if strong else 96, dur=0.55 if strong else 0.3)
        now += beat
        i += 1


FPS = 30  # 컴포지션과 같은 프레임률. 글자 등장 프레임을 초로 옮길 때 쓴다.


def key(at: float, gain=0.5, space=False) -> None:
    """
    키 하나 치는 소리.

    노이즈를 그냥 짧게 자르면 '치'하고 끝나서 종이 소리에 가깝다. 실제
    키보드 소리는 두 겹이다 — 손톱이 키캡에 닿는 고역 딱 소리와, 키가
    바닥을 치면서 나는 낮은 몸통. 둘을 겹쳐야 '탁'으로 들린다.

    난수는 시각에서 파생시켜 결정적으로 만든다. 렌더할 때마다 달라지면
    영상과 어긋난다.
    """
    dur = 0.06
    i0, i1 = int(at * SR), min(n, int((at + dur) * SR))
    if i1 <= i0:
        return
    k = np.arange(i1 - i0) / SR
    rng = np.random.default_rng((int(at * 10007) + 13) & 0xFFFF)
    nz = rng.standard_normal(i1 - i0)
    # 1차 차분 = 고역통과. 딱 소리의 재료.
    nz = np.concatenate([[0.0], np.diff(nz)])
    click = nz * np.exp(-k / 0.0035)
    # 스페이스바는 크고 둔하다. 몸통 주파수를 내린다.
    f = 620.0 if space else 1650.0
    body = np.sin(2 * np.pi * f * k) * np.exp(-k / 0.011)
    mix[i0:i1] += (click * 0.55 + body * 0.30) * gain


def typing(spec) -> None:
    """<Typed>가 글자를 띄우는 프레임마다 키 소리를 놓는다."""
    for text, start, cps, gain in spec:
        rng = np.random.default_rng((start * 977 + len(text)) & 0xFFFF)
        for i, ch in enumerate(text):
            # Typed는 floor((frame-start)*cps/fps) >= i+1일 때 i번째를 띄운다
            at = (start + (i + 1) * FPS / cps) / FPS
            # 세기를 조금씩 흔들어야 사람이 친 것처럼 들린다
            key(at, gain * (1.0 + rng.normal(0, 0.13)), space=(ch == " "))


# ── 구성 ────────────────────────────────────────────
# 훅: 큰 타격 하나 + 라이저로 지도 등장까지 끌고 간다
hit(0.15, 0.5, 1.8)
taiko(0.15, 1.2, 70, 1.1)
riser(0.5, HOOK, 0.55)
drone(0.0, HOOK + 0.6, 41.2, 0.16)

# 섹션 — 층이 셋이다. 저역 드론(있는 기기에서만 들린다), 중역 화음,
# 그리고 실제로 선율로 들리는 음형. 북은 그 위에 얹는 것이지 혼자
# 남으면 안 된다.
for (a, b, base, bpm0, bpm1) in SECTIONS:
    drone(a, b + 0.5, base, 0.07)
    pad(a, b + 0.6, base, 0.42 if bpm0 is None else 0.26)
    if bpm0 is None:
        # 멈춘 구간에도 소리는 있어야 한다. 음형을 아주 느리게만 남긴다.
        ostinato(a, b, 40, 34, base, 1.25)
    else:
        ostinato(a, b, bpm0, bpm1, base, 1.6)
        pulse_train(a, b, bpm0, bpm1, 0.42)

# 종결 — 마지막 타격 후 여운
taiko(END - 1.4, 1.2, 66, 1.8)
hit(END - 1.4, 0.4, 2.4)

# 훅 타이핑 — 글자가 뜨는 프레임에 맞춘다
if P.get("typing"):
    typing(P["typing"])

# 주요 사건 강조 — 영상의 impact 지점과 맞춘 초
for at, g in P["accents"]:
    taiko(at, g * 0.8, 72, 0.8)
    hit(at, g * 0.18, 0.9)

# ── 마스터링 ────────────────────────────────────────
def highpass(x: np.ndarray, fc: float) -> np.ndarray:
    """
    박스 평활 두 번으로 저역을 뽑아 빼는 방식의 하이패스.

    휴대폰 스피커는 100Hz 아래를 사실상 못 낸다. 그런데 그 대역이
    피크를 만들어 정규화 단계에서 나머지를 전부 끌어내린다. 들리지도
    않는 소리가 들리는 소리의 음량을 깎고 있는 셈이다. 잘라낸다.
    """
    w = max(2, int(SR / fc))
    k = np.ones(w) / w
    lo = np.convolve(x, k, mode="same")
    lo = np.convolve(lo, k, mode="same")
    return x - lo


mix = highpass(mix, 95.0)
# 소프트 클리핑 — 하드 클립하면 지직거린다
mix = np.tanh(mix * 1.15)
peak = float(np.max(np.abs(mix))) or 1.0
mix = mix / peak * 0.89

# 끝 페이드아웃
fade = int(1.0 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)

# 스테레오 — 살짝 벌려 넓이를 준다
delay = int(0.008 * SR)
left = mix
right = np.concatenate([np.zeros(delay), mix[:-delay]]) * 0.97
stereo = np.stack([left, right], axis=1)

pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

print(f"{OUT} · {DUR:.1f}s · {os.path.getsize(OUT)//1024}KB")
