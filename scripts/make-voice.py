#!/usr/bin/env python3
"""나레이션을 만든다 — ElevenLabs.

## 왜 목소리를 넣나

올린 편들이 조회수 1,000~1,300에서 번번이 멈추고 누적 1만 회에
댓글이 0이다. 짚이는 것 가운데 하나가 **무음이라는 것**이다.
무음+BGM 데이터 쇼츠는 유지율이 구조적으로 낮고, 한국 쇼츠
시청층은 내레이션에 익숙하다.

## 걸음 길이를 목소리가 정한다

지금까지는 글자 수로 걸음 길이를 잡았다(초당 8자). 목소리가
들어가면 **읽는 속도가 아니라 말하는 속도가 기준**이다. 줄마다
음성을 만들어 길이를 재고, 그 길이에 여유를 얹어 걸음을 잡는다.

거꾸로 하면 안 된다. 화면을 먼저 짜고 목소리를 욱여넣으면 말이
잘리거나 빈 화면이 남는다.

## 목소리

`ELEVENLABS_API_KEY`가 있어야 한다. 한국어가 되는 목소리만 쓴다.

    sQ3a15DhENXU8pKTHlcc  Mr. K   남 · 한국어 창작자용
    WqVy7827vjE2r3jWvbnP  Hyuk    남
    aIyfYczcAioGTbdEA7R1  순자     여
    8jHHF8rMqMlg8if2mOUe  Han     여 · 대화체

모델은 `eleven_multilingual_v2`. 한국어를 지원하는 것 가운데
가장 안정적이다.

## 말은 자막과 다르게 쓴다

`CLAUDE.md`의 「~다 체 금지」는 **자막·제목·화면 문구** 규칙이다.
나레이션은 말이라 「…입니다」·「…이에요」로 닫는다. 화면에 명사구로
띄운 것을 그대로 읽으면 사람 말이 아니다.

## 크레딧이 없으면 어림한다

이 계정의 키는 목소리 목록은 읽히는데 합성에서 402(Payment
Required)가 난다. 크레딧이 없다는 뜻이다.

그렇다고 편을 멈추면 안 되니, **음절 수로 길이를 어림해** 같은
모양의 산출물을 낸다. 한국어 나레이션은 쉼까지 넣어 초당 6음절쯤
간다. 나중에 진짜 음성이 생기면 다시 돌려 실제 길이로 갈아 끼운다.

어림한 것인지 잰 것인지는 `estimated` 값으로 남긴다.

사용:  ELEVENLABS_API_KEY=… python3 scripts/make-voice.py few
출력:  public/vo-<편>-<번호>.mp3 와 src/data/voice-<편>.json
"""
import json
import os
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HERE, "..", "public")
DATA = os.path.join(HERE, "..", "src", "data")
FFMPEG = os.path.join(HERE, "..", "node_modules",
                      "@remotion", "compositor-linux-x64-gnu", "ffmpeg")

VOICE = "sQ3a15DhENXU8pKTHlcc"      # Mr. K — 한국어 창작자용
MODEL = "eleven_multilingual_v2"
API = "https://api.elevenlabs.io/v1/text-to-speech"

# 편마다 줄. 첫 줄이 훅이고 마지막 줄이 마무리다.
#
# **훅은 질문이다.** 답을 먼저 주면 남아서 볼 까닭이 없다.
# **마무리도 질문이다.** 다 답해 버리면 댓글이 안 달린다.
SCRIPTS = {
    "few": [
        "사람이 제일 적은 지자체, 몇 명일까요?",
        "5위, 전라북도 장수군. 2만 1천 명. 점 하나가 백 명이에요.",
        "4위, 강원도 양구군. 2만 4백 명.",
        "3위, 인천 옹진군. 백령도부터 덕적도까지 섬이 백 개가 넘는데, 다 합쳐서 만 9천 명.",
        "2위, 경상북도 영양군. 만 6천 명.",
        "1위는 경상북도 울릉군. 8천 7백 8십 명.",
        "전국에서 제일 큰 동, 남양주 다산1동은 10만 5천 명이에요. "
        "울릉군의 12배입니다. 여러분 동네는 몇 명인가요?",
    ],
    "tide": [
        "진도가 만조일 때, 인천은 어떨까요?",
        "8월 15일 0시 33분. 진도에 물이 가득 찹니다.",
        "그 물이 목포, 영광, 군산을 지나 북쪽으로 올라갑니다.",
        "인천이 만조가 되는 건 아침 6시 30분. 5시간 57분이 걸렸어요.",
        "만조에서 다음 만조까지가 12시간 25분이니까, 딱 절반입니다.",
        "그래서 낮 12시 42분, 진도가 다시 만조일 때 "
        "인천은 간조예요. 11분 차이로 정반대입니다.",
        "같은 서해인데 물때가 6시간 차이입니다. "
        "갯벌 가실 때 어디 물때를 보시나요?",
    ],
    "metro": [
        "서울에서 지하철역이 가장 먼 동네, 어디일까요?",
        "5위 관악구 난향동. 동네 절반이 역까지 1.8킬로미터를 걸어야 합니다.",
        "4위 종로구 부암동, 1.95킬로미터.",
        "3위 관악구 대학동, 2.15킬로미터.",
        "2위 금천구 시흥2동, 2.16킬로미터.",
        "1위는 종로구 평창동, 2.69킬로미터. "
        "서울 424개 동 중앙값이 0.52킬로미터니까 5배예요.",
        "다섯 곳에 8만 5천 명이 삽니다. "
        "서울 땅의 29퍼센트가 역에서 1킬로미터 밖이에요. "
        "여러분 동네에서 역까지 몇 분인가요?",
    ],
    "rush": [
        "아침 8시, 서울에서 가장 많이 타는 역은 어디일까요?",
        "첫차 시간대 1위는 구로구 대림역. 1,893명이에요.",
        "아침 8시엔 신림역. 11,479명, 1초에 3.2명입니다.",
        "낮 3시엔 잠실. 5,502명.",
        "저녁 6시엔 시청역. 한 시간에 14,411명이 탑니다.",
        "밤 9시엔 강남. 7,167명.",
        "막차 무렵엔 홍대입구. 3,456명이에요.",
        "1위 자리를 6개 역이 나눠 갖고, 하루에 8번 바뀝니다. "
        "서울에서 가장 붐비는 역은 하나가 아니에요. "
        "여러분 동네 역은 몇 시에 가장 붐비나요?",
    ],
}


def say(text, path):
    body = json.dumps({
        "text": text,
        "model_id": MODEL,
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.75,
                           "style": 0.15, "use_speaker_boost": True},
    }).encode()
    req = urllib.request.Request(
        f"{API}/{VOICE}?output_format=mp3_44100_128", data=body,
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"],
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        open(path, "wb").write(r.read())


def seconds(path):
    out = subprocess.run([FFMPEG, "-i", path], capture_output=True, text=True)
    for line in out.stderr.splitlines():
        if "Duration:" in line:
            h, m, s = line.split("Duration:")[1].split(",")[0].strip().split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise SystemExit(f"길이를 못 읽었다: {path}")


SYL_PER_SEC = 6.0      # 한국어 나레이션. 쉼까지 넣은 값이다


DIGIT_SYL = 1.5        # 숫자 한 자리를 읽는 음절 수


def guess(text):
    """음절 수로 길이를 어림한다. 한글을 세고 부호는 안 센다.

    **숫자를 빼먹으면 안 된다.** 23편 나레이션은 시각과 분이 줄마다
    들어가는데 「12시간 25분」을 0음절로 세면 걸음이 통째로 짧아진다.
    읽으면 「십이시간 이십오분」이라 자릿수마다 1.5음절쯤 붙는다
    (57=오십칠 3음절, 15=십오 2음절, 6=육 1음절).
    """
    syl = sum(1 for c in text if "\uac00" <= c <= "\ud7a3")
    syl += sum(DIGIT_SYL for c in text if c.isdigit())
    return round(syl / SYL_PER_SEC + 0.45, 2)


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "few"
    lines = SCRIPTS[name]

    out = []
    est = False
    for i, text in enumerate(lines):
        f = f"vo-{name}-{i}.mp3"
        p = os.path.join(PUB, f)
        d = None
        if os.environ.get("ELEVENLABS_API_KEY"):
            try:
                say(text, p)
                d = seconds(p)
            except Exception as e:
                print(f"  합성 실패 ({e}) — 어림으로 간다", flush=True)
        if d is None:
            est = True
            d = guess(text)
        out.append({"file": f, "text": text, "sec": d})
        print(f"  {i} {d:5.2f}초  {text[:38]}", flush=True)

    json.dump({"voice": VOICE, "model": MODEL, "estimated": est,
               "lines": out},
              open(os.path.join(DATA, f"voice-{name}.json"), "w",
                   encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"합계 {sum(x['sec'] for x in out):.2f}초"
          + ("  (어림)" if est else "  (잰 값)"))
    print("→", os.path.join(DATA, f"voice-{name}.json"))


if __name__ == "__main__":
    main()
