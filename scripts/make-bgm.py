#!/usr/bin/env python3
"""
BGM 합성.

음원을 구해 붙이는 대신 코드로 만든다. 저작권 문제가 없고, 영상과 같은
타임라인을 쓰므로 타격이 사건에 정확히 맞는다.

전에는 드론을 깔고 네 박에 한 번 북을 치는 구성이었다. 그건 다큐멘터리
앰비언트지 긴장을 만드는 음악이 아니다. 화면은 전선이 뒤집히는데 소리는
계속 뭉근하게 웅웅거리고 있었다.

지금은 리듬 섹션을 제대로 짠다.
  킥      1박·3박, 그리고 마디 끝의 밀어치기
  스네어  2박·4박
  하이햇  16분음표, 뒤로 갈수록 촘촘하게
  베이스  8분음표로 근음을 계속 밟는다
  아르페지오 16분음표
  코드    마디 첫 박에 한 방
화성은 단조 i - VI - III - VII 로 계속 움직인다. 한자리에 머무는 드론은
긴장을 못 만든다. 템포는 124에서 150까지 올라간다.

사용:  pip install numpy && python3 scripts/make-bgm.py [imjin|kw|ty|rail]
출력:  public/bgm.wav (48kHz 16bit 스테레오)
"""
import math
import os
import struct
import wave

import re

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

# ── 연표에서 구간을 계산한다 ──────────────────────────
# 사건마다 체류 시간을 주는 방식으로 바꾸면서 영상 길이가 사건 수에 따라
# 정해지게 됐다. 경계를 손으로 적어두면 사건 하나만 늘려도 음악이
# 전부 어긋난다. 컴포지션과 같은 규칙으로 여기서 다시 계산한다.
FPS = 30

# 곡 전체를 한 템포로 간다. 구간마다 bpm을 올리면 뒤로 갈수록 조여들어
# 듣기 피곤하고, 한 영상 안에서 속도가 바뀌는 게 그대로 들린다.
BPM = 132


def read_beats(path: str, key: str):
    """TS 연표에서 (값, impact)를 뽑는다. 형식이 단순해 정규식으로 충분하다."""
    src = open(path, encoding="utf-8").read()
    i = src.index(key)
    j = src.index("\n];", i)
    rows = []
    for line in src[i:j].splitlines():
        m = re.search(r"\b(?:month|day|year):\s*([0-9.]+)", line)
        if not m:
            continue
        imp = re.search(r"impact:\s*([0-9.]+)", line)
        rows.append((float(m.group(1)), float(imp.group(1)) if imp else 0.4))
    rows.sort(key=lambda r: r[0])
    return rows


def layout(rows, hook: float):
    """src/beats.ts의 beatOf·layoutBeats와 같은 규칙."""
    out, f = [], hook * FPS
    for _, imp in rows:
        big = imp >= 0.85
        travel = round((1.05 if big else 0.85) * FPS)
        hold = round((3.0 if big else 2.4) * FPS)
        t1 = f + travel
        t2 = t1 + hold
        out.append((t1 / FPS, t2 / FPS, imp))
        f = t2
    return out


def build(path: str, key: str, hook: float, tail: float, bases, quiet_idx=None):
    """연표에서 프리셋 한 벌을 만든다."""
    beats = layout(read_beats(path, key), hook)
    dur = beats[-1][1] + tail
    n = len(beats)
    # 사건을 다섯 덩어리로 묶어 악곡 구간으로 삼는다
    groups = 5
    edges = [round(k * n / groups) for k in range(groups + 1)]
    if quiet_idx is None:
        # 가장 조용한 덩어리를 자동으로 고른다 — 사건의 무게가 제일 가벼운 곳
        avg = [
            sum(b[2] for b in beats[edges[k]:edges[k + 1]]) / max(1, edges[k + 1] - edges[k])
            for k in range(groups)
        ]
        quiet_idx = avg.index(min(avg))
    sections = []
    for k in range(groups):
        a = hook if k == 0 else beats[edges[k] - 1][1]
        b = beats[edges[k + 1] - 1][1]
        if k == quiet_idx:
            sections.append((round(a, 1), round(b, 1), bases[k], None, None))
        else:
            sections.append((round(a, 1), round(b, 1), bases[k], BPM, BPM))
    # 큰 사건에만 타격을 놓는다. 전부 때리면 다시 '탕탕'이 된다.
    accents = [(round(t1, 1), min(1.0, imp)) for t1, _, imp in beats if imp >= 0.85]
    return {"dur": round(dur, 1), "hook": hook, "sections": sections, "accents": accents}


PRESETS = {
    # 훅이 4.5초다. 첫 문장을 다 쓰고 한 박자 쉰 뒤 숫자가 뜨는 시간까지
    # 포함한 값이라, 여기 경계는 각 컴포지션의 HOOK/LEGS와 같아야 한다.
    "imjin": {
        "out": "public/bgm.wav",
        **build("src/data/war.ts", "export const WAR_EVENTS", 4.5, 1.6, [41.2, 61.7, 36.7, 38.9, 41.2]),
        "typing": [
            ("1592년 음력 5월 3일, 일본군 한양 입성", 4, 30, 0.42),
            ("11", 42, 8, 0.85),
            ("개월", 50, 8, 0.85),
            ("일본군이 한양을 차지하고 있던 기간", 72, 22, 0.46),
        ],
    },
    "kw": {
        "out": "public/bgm-kw.wav",
        **build("src/data/korean-war.ts", "export const KW_EVENTS", 4.5, 1.6, [41.2, 61.7, 65.4, 36.7, 41.2]),
        "typing": [
            ("1950년 6월 25일 새벽, 38선", 4, 30, 0.42),
            ("40", 40, 8, 0.85),
            ("일", 48, 8, 0.85),
            ("낙동강까지 밀리는 데 걸린 시간", 66, 22, 0.46),
        ],
    },
    "rail": {
        "out": "public/bgm-rail.wav",
        **build("src/data/rail.ts", "export const RAIL_EVENTS", 4.5, 9.0, [41.2, 43.7, 32.7, 38.9, 46.2]),
        "typing": [
            ("서울역에서 신의주행 표를 팔던 건 39년", 4, 30, 0.42),
            ("81", 44, 8, 0.85),
            ("년", 52, 8, 0.85),
            ("그 표를 팔지 못한 시간", 70, 22, 0.46),
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
            (4.5, 14.0, 38.9, BPM, BPM),   # 사라
            (14.0, 25.5, 41.2, BPM, BPM),  # 루사
            (25.5, 35.0, 36.7, BPM, BPM),  # 매미
            (35.0, 45.5, 32.7, BPM, BPM),  # 힌남노
            (45.5, 53.0, 41.2, None, None),  # 마무리 — 드럼이 빠지고 여운
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


def semi(root: float, x: float) -> float:
    """반음 x칸 위 주파수"""
    return root * (2.0 ** (x / 12.0))


def put(at: float, v: np.ndarray) -> None:
    """파형 조각을 제자리에 더한다. 경계를 넘으면 잘라 넣는다."""
    i0 = int(at * SR)
    if i0 >= n or i0 + len(v) <= 0:
        return
    a = max(0, i0)
    b = min(n, i0 + len(v))
    mix[a:b] += v[a - i0:b - i0]


def kick(at: float, gain=1.0) -> None:
    """
    킥.

    기음이 50Hz면 휴대폰에서 통째로 사라지고 '틱' 소리만 남는다.
    피치를 105Hz에서 48Hz로 떨어뜨리되 2·3배 배음을 같이 실어
    작은 스피커에서도 몸통이 들리게 한다.
    """
    dur = 0.34
    k = np.arange(int(dur * SR)) / SR
    f = 48 + 57 * np.exp(-k / 0.022)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) + 0.6 * np.sin(ph * 2) + 0.25 * np.sin(ph * 3)
    e = np.exp(-k / 0.10)
    click = np.exp(-k / 0.0025) * 0.5
    put(at, (body * e + click) * 0.42 * gain)


def snare(at: float, gain=1.0) -> None:
    """스네어 — 노이즈에 190Hz 몸통. 몸통이 없으면 '치' 소리만 난다."""
    dur = 0.22
    ln = int(dur * SR)
    k = np.arange(ln) / SR
    rng = np.random.default_rng((int(at * 6151) + 3) & 0xFFFF)
    nz = rng.standard_normal(ln)
    nz = nz - np.convolve(nz, np.ones(9) / 9, mode="same")   # 고역만
    tone = np.sin(2 * np.pi * 190 * k) + 0.7 * np.sin(2 * np.pi * 278 * k)
    e = np.exp(-k / 0.055)
    put(at, (nz * 0.85 + tone * 0.35) * e * 0.34 * gain)


def hat(at: float, gain=1.0, open_=False) -> None:
    """하이햇 — 아주 짧은 고역 노이즈. 16분음표를 채워 속도를 만든다."""
    dur = 0.16 if open_ else 0.045
    ln = int(dur * SR)
    rng = np.random.default_rng((int(at * 9973) + 11) & 0xFFFF)
    nz = rng.standard_normal(ln)
    nz = nz - np.convolve(nz, np.ones(4) / 4, mode="same")
    k = np.arange(ln) / SR
    put(at, nz * np.exp(-k / (0.05 if open_ else 0.012)) * 0.34 * gain)


def bass(at: float, f: float, dur: float, gain=1.0) -> None:
    """
    베이스 — 톱니에 가까운 배음 구성.
    사인 하나로는 폰에서 안 들린다. 홀수·짝수 배음을 같이 넣어야
    작은 스피커가 기음을 못 내도 귀가 근음을 복원한다.
    """
    ln = int(dur * SR)
    if ln <= 0:
        return
    k = np.arange(ln) / SR
    v = np.zeros(ln)
    for h, a in [(1, 1.0), (2, 0.55), (3, 0.32), (4, 0.18), (5, 0.10)]:
        v += a * np.sin(2 * np.pi * f * h * k)
    atk = np.clip(k / 0.006, 0, 1)
    rel = np.clip((k[-1] - k) / 0.05, 0, 1)
    put(at, v * atk * rel * np.exp(-k / (dur * 1.6)) * 0.13 * gain)


def pluck(at: float, f: float, gain=0.5, dur=0.5) -> None:
    """아르페지오용 뜯는 소리. 고배음이 먼저 죽어야 뜯는 소리가 된다."""
    ln = int(dur * SR)
    if ln <= 0:
        return
    k = np.arange(ln) / SR
    v = np.zeros(ln)
    for h, a, d in [(1, 1.0, 1.0), (2, 0.5, 0.55), (3, 0.28, 0.35),
                    (4.02, 0.15, 0.25), (6.0, 0.08, 0.18)]:
        v += a * np.sin(2 * np.pi * f * h * k) * np.exp(-k / (dur * d))
    put(at, v * 0.3 * gain)


def stab(at: float, root: float, gain=1.0, dur=0.55, minor=True) -> None:
    """코드 한 방 — 마디 머리에 놓아 화성이 바뀌는 걸 귀에 알린다."""
    third = 3 if minor else 4
    for x, a in [(0, 1.0), (third, 0.8), (7, 0.85), (12, 0.5), (19, 0.3)]:
        pluck(at, semi(root, x) * 4, gain * a * 0.55, dur)


def riser(a: float, b: float, gain=0.5) -> None:
    """라이저 — 노이즈가 점점 밝아지며 조여든다."""
    i0, i1 = int(a * SR), min(n, int(b * SR))
    if i1 <= i0:
        return
    rng = np.random.default_rng(4242)
    k = np.linspace(0, 1, i1 - i0)
    nz = rng.standard_normal(i1 - i0)
    out = np.empty_like(nz)
    step = max(1, (i1 - i0) // 64)
    for s0 in range(0, i1 - i0, step):
        e = min(i1 - i0, s0 + step)
        w = max(1, int(40 * (1 - k[s0]) + 2))
        out[s0:e] = np.convolve(nz[s0:e], np.ones(w) / w, mode="same")
    mix[i0:i1] += out * (k ** 2.2) * gain


def hit(at: float, gain=1.0, dur=1.2) -> None:
    """충돌음 — 큰 사건용. 킥과 겹쳐 무게를 준다."""
    ln = int(dur * SR)
    rng = np.random.default_rng((int(at * 977) + 7) & 0xFFFF)
    k = np.arange(ln) / SR
    nz = rng.standard_normal(ln)
    nz = np.convolve(nz, np.ones(20) / 20, mode="same")
    put(at, nz * np.exp(-k / (dur * 0.28)) * 0.5 * gain)


# 단조 진행 i - VI - III - VII. 한 마디에 하나씩 돈다.
# 드론처럼 한자리에 머물면 아무리 세게 쳐도 긴장이 안 생긴다.
PROG = (0, 8, 3, 10)
# 16분음표 아르페지오 음형 — 코드 톤 위주라 어떤 코드에 얹어도 맞는다
ARP = (0, 7, 12, 15, 12, 7, 12, 19)


def groove(a: float, b: float, bpm0: float, bpm1: float, root: float,
           gain=1.0, drums=True) -> None:
    """
    한 구간을 리듬 섹션으로 채운다.

    난수는 시각에서 파생시켜 결정적으로 만든다. 렌더할 때마다 달라지면
    영상과 어긋난다. 사람이 친 것처럼 들리게 박마다 살짝 흔들되,
    강박은 덜 흔들린다 — 실제 연주가 그렇다.
    """
    rng = np.random.default_rng((int(a * 733) + 31) & 0xFFFF)
    now, i = a, 0
    while now < b:
        prog_t = (now - a) / max(1e-6, b - a)
        bpm = bpm0 + (bpm1 - bpm0) * prog_t
        beat = 60.0 / bpm
        bar, pos = i // 4, i % 4
        chord = semi(root, PROG[bar % len(PROG)])

        if pos == 0:
            stab(now, chord, gain * 0.9)

        if drums:
            j = lambda s: rng.normal(0, s)
            if pos in (0, 2):
                kick(now + j(0.006), gain * (1.0 if pos == 0 else 0.85))
            # 마디 끝 밀어치기 — 이게 있어야 다음 마디로 굴러간다
            if pos == 3:
                kick(now + beat * 0.75 + j(0.008), gain * 0.7)
            if pos in (1, 3):
                snare(now + j(0.007), gain * 0.9)
            # 16분 하이햇 고정. 구간 안에서 분할을 바꾸면 템포가 변한
            # 것처럼 들린다.
            steps = 4
            for k in range(steps):
                strong = k == 0
                hat(now + beat * k / steps + j(0.004),
                    gain * (0.62 if strong else 0.36),
                    open_=(pos == 3 and k == steps - 1))

        # 베이스 — 8분음표로 근음을 계속 밟는다
        bass(now, chord, beat * 0.46, gain)
        bass(now + beat / 2, chord, beat * 0.4, gain * 0.7)

        # 아르페지오 16분음표
        for k in range(4):
            deg = ARP[(i * 4 + k) % len(ARP)]
            pluck(now + beat * k / 4, semi(chord, deg) * 4,
                  gain * (0.42 if k == 0 else 0.24), beat * 0.9)

        now += beat
        i += 1


def key(at: float, gain=0.5, space=False) -> None:
    """
    키 하나 치는 소리.

    노이즈를 짧게 자르기만 하면 종이 소리에 가깝다. 실제 키보드는
    두 겹이다 — 키캡에 닿는 고역 딱 소리와 키가 바닥을 치는 낮은 몸통.
    """
    dur = 0.06
    ln = int(dur * SR)
    k = np.arange(ln) / SR
    rng = np.random.default_rng((int(at * 10007) + 13) & 0xFFFF)
    nz = rng.standard_normal(ln)
    nz = np.concatenate([[0.0], np.diff(nz)])
    click = nz * np.exp(-k / 0.0035)
    f = 620.0 if space else 1650.0
    body = np.sin(2 * np.pi * f * k) * np.exp(-k / 0.011)
    put(at, (click * 0.55 + body * 0.30) * gain)


def typing(spec) -> None:
    """<Typed>가 글자를 띄우는 프레임마다 키 소리를 놓는다."""
    for text, start, cps, gain in spec:
        rng = np.random.default_rng((start * 977 + len(text)) & 0xFFFF)
        for i, ch in enumerate(text):
            at = (start + (i + 1) * FPS / cps) / FPS
            key(at, gain * (1.0 + rng.normal(0, 0.13)), space=(ch == " "))


def breakdown(a: float, b: float, root: float, gain=1.0) -> None:
    """
    브레이크 — 드럼을 빼고 화성만 남긴다.

    조용한 구간을 통째로 비워두면 음악이 죽는다. 몰아치는 음악에서
    긴장은 멈춰서 만드는 게 아니라 빼서 만든다. 코드와 아르페지오는
    남기고 킥·스네어만 들어낸다.
    """
    groove(a, b, BPM, BPM, root, gain * 0.62, drums=False)


# ── 구성 ────────────────────────────────────────────
# 훅: 큰 타격 하나 + 라이저로 지도 등장까지 끌고 간다
hit(0.15, 0.9, 1.6)
kick(0.15, 1.2)
riser(0.6, HOOK, 0.5)

# 섹션 — bpm이 None인 구간은 드럼을 빼고 화성만 남긴다
for (a, b, base, bpm0, bpm1) in SECTIONS:
    if bpm0 is None:
        breakdown(a, b, base)
    else:
        groove(a, b, bpm0, bpm1, base)
    # 구간이 바뀌기 직전 라이저 — 다음 구간으로 밀어 넣는다
    if b < END - 0.5:
        riser(max(a, b - 1.4), b, 0.26)

# 종결
kick(END - 1.4, 1.3)
hit(END - 1.4, 0.8, 2.0)

# 훅 타이핑 — 글자가 뜨는 프레임에 맞춘다
if P.get("typing"):
    typing(P["typing"])

# 주요 사건 강조 — 영상의 impact 지점과 맞춘 초
for at, g in P["accents"]:
    kick(at, g * 1.25)
    snare(at, g * 0.5)
    hit(at, g * 0.35, 0.9)

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
