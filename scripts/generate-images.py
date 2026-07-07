#!/usr/bin/env python3
"""
Imagen(Google Gemini API)으로 씬별 배경/키프레임 정지 이미지를 생성한다.
전송은 curl로 위임(에이전트 프록시 + CA 자동 적용).

사용:
  GEMINI_API_KEY=xxxx python3 scripts/generate-images.py           # 전체
  GEMINI_API_KEY=xxxx python3 scripts/generate-images.py S07 S12    # 일부만

결과: public/scenes/<id>.png (16:9). 이미 있으면 건너뜀(--force로 재생성).
프롬프트는 docs/통합제작가이드.md의 Veo 프롬프트를 이미지용으로 변환한 것.
가상 정상은 '실존 정치인 비유사' 안전 조건을 유지한다.
"""
import base64
import json
import os
import subprocess
import sys
import tempfile

MODEL = os.environ.get("IMAGEN_MODEL", "imagen-4.0-generate-001")
NEG = "no text, no letters, no logos, no captions, no watermarks"

# id: (프롬프트, 종횡비)
PROMPTS = {
    # PART 1
    "S02": f"Empty modern broadcast news studio, sleek anchor desk in foreground, "
           f"large wall screen behind showing abstract blue city skyline graphics, "
           f"cool blue and white studio lighting, wide shot, no people, "
           f"photorealistic, cinematic, {NEG}",
    "S03": f"A fictional comedic national leader, an ORIGINAL character NOT resembling "
           f"any real politician: heavyset bald man in his 60s, round face, thick grey "
           f"eyebrows, navy blue suit with an oversized long red tie, sitting confidently "
           f"at an ornate gold-trimmed presidential desk, big friendly grin, a fictional "
           f"flag with orange and purple stripes on a pole behind him, warm cinematic "
           f"lighting, slightly exaggerated caricature but photorealistic, {NEG}",
    "S04": f"A fictional dignified female head of state, an ORIGINAL character NOT "
           f"resembling any real politician: elegant woman in her late 50s, silver grey "
           f"bob haircut, thin round gold-rimmed glasses, dark green formal blazer with a "
           f"small gold laurel brooch, calm warm smile, standing at a wooden podium in a "
           f"classical European office with marble columns and a fictional blue flag with "
           f"a gold laurel emblem, warm afternoon window light, photorealistic, {NEG}",
    "S05": f"Interior of a grand presidential-style office aboard a space station: a huge "
           f"panoramic window behind an empty luxurious desk, planet Earth slowly rotating "
           f"outside the window with a soft blue glow, stars in deep space, warm desk lamp "
           f"lighting in foreground, cinematic, photorealistic, no people, {NEG}",
    # PART 2
    "S06": f"Epic aerial drone view of a packed baseball stadium at night, stadium "
           f"floodlights blazing against dark sky, glowing green field below, crowd as a "
           f"sea of lights, cinematic sports broadcast opening, anamorphic lens flares, {NEG}",
    "S07": f"Slow motion medium close-up: a professional baseball batter in a navy blue "
           f"and white uniform making powerful contact with the ball at night, perfect "
           f"swing mechanics, bat blur, stadium lights flaring behind him, dust particles "
           f"in the air, cinematic sports film, shallow depth of field, {NEG}",
    "S08": f"Dramatic slow motion side angle at ground level: a baseball runner in a navy "
           f"blue and white uniform diving head-first into second base, dust cloud "
           f"exploding, fielder in grey and dark red uniform applying a late tag, night "
           f"stadium lights, cinematic sports photography, shallow depth of field, {NEG}",
    "S09": f"Slow motion close-up from behind the pitcher: a professional baseball pitcher "
           f"in a navy blue and white uniform releasing a blazing fastball, perfect "
           f"pitching mechanics, arm blur, intense focused eyes under cap brim, night "
           f"stadium lights, cinematic sports film, {NEG}",
    "S10": f"Static medium shot: tense baseball dugout at night, three players in navy "
           f"blue and white uniforms sitting with serious focused expressions, one "
           f"gripping his helmet, dramatic low-key side lighting, quiet heavy atmosphere, "
           f"muted color grade, cinematic sports documentary, {NEG}",
    "S11": f"Slow motion low angle: baseball players in navy blue and white uniforms "
           f"standing up from the dugout bench with quiet determination, adjusting "
           f"helmets, jaws set, dramatic rim lighting from stadium lights behind them, "
           f"rising heroic mood, cinematic, maximum three players in frame, {NEG}",
    "S12": f"Extreme close-up: a baseball pitcher's sweating face under his cap brim at "
           f"night, single sweat drop rolling down his temple, intense eyes staring toward "
           f"home plate, stadium lights creating a rim light on his cap, ultra shallow "
           f"depth of field, cinematic thriller tension, {NEG}",
    "S13": f"Ultra slow motion extreme close-up: the exact moment a wooden baseball bat "
           f"makes explosive contact with a baseball, ball compressing against the bat, "
           f"shockwave of dust and sweat droplets suspended in air, stadium lights flaring "
           f"directly behind creating a silhouette halo, cinematic sports film climax, "
           f"shallow depth of field, {NEG}",
}

OUT_DIR = "public/scenes"


def generate(cid: str, prompt: str, key: str, force: bool) -> bool:
    out = os.path.join(OUT_DIR, f"{cid}.png")
    if os.path.exists(out) and not force:
        print(f"  skip {cid} (이미 존재)")
        return True
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {"sampleCount": 1, "aspectRatio": "16:9"},
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{MODEL}:predict?key={key}"
    )
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(payload, f)
        pf = f.name
    try:
        res = subprocess.run(
            ["curl", "-sS", "-X", "POST", url,
             "-H", "Content-Type: application/json", "-d", f"@{pf}"],
            capture_output=True, text=True, timeout=180,
        )
    finally:
        os.unlink(pf)

    if res.returncode != 0:
        print(f"  FAIL {cid}: curl rc={res.returncode} {res.stderr[:200]}")
        return False
    try:
        data = json.loads(res.stdout)
    except json.JSONDecodeError:
        print(f"  FAIL {cid}: 비 JSON 응답 {res.stdout[:200]}")
        return False
    if "error" in data:
        print(f"  FAIL {cid}: {json.dumps(data['error'])[:300]}")
        return False
    preds = data.get("predictions") or []
    if not preds or "bytesBase64Encoded" not in preds[0]:
        print(f"  FAIL {cid}: 이미지 없음 {json.dumps(data)[:300]}")
        return False
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(out, "wb") as f:
        f.write(base64.b64decode(preds[0]["bytesBase64Encoded"]))
    print(f"  OK   {cid} -> {out} ({os.path.getsize(out)//1024}KB)")
    return True


def main() -> None:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY 환경변수가 필요합니다.")
    force = "--force" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    ids = [a.upper() for a in args] if args else list(PROMPTS)
    print(f"모델: {MODEL} · 대상: {', '.join(ids)}")
    ok = 0
    for cid in ids:
        if cid not in PROMPTS:
            print(f"  ? {cid}: 프롬프트 없음")
            continue
        if generate(cid, PROMPTS[cid], key, force):
            ok += 1
    print(f"완료: {ok}/{len(ids)}")


if __name__ == "__main__":
    main()
