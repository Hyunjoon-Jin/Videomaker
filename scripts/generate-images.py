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

# 유니폼 규칙: 홈=최상강남(KT 위즈 스타일, 실제 로고/글자는 no-logos로 배제),
#            원정=그레이·네이비. 선수는 모두 한국인.
HOME = ("Korean baseball players wearing KT Wiz style uniforms (white jersey with thin "
        "red pinstripes and red accents, solid BLACK cap and BLACK batting helmet with "
        "red trim, matching real KT Wiz colors)")
HOME_ONE = ("a Korean professional baseball player wearing a KT Wiz style uniform (white "
            "jersey with thin red pinstripes and red accents, solid BLACK cap/helmet with "
            "red trim, matching real KT Wiz colors)")
AWAY_ONE = "an opposing player in a grey and navy blue uniform with a navy cap"

# id: 프롬프트
PROMPTS = {
    # PART 1
    "S02": f"A Korean female news anchor in her 30s with neat shoulder-length black hair, "
           f"wearing a sharp light grey blazer over a white blouse, sitting confidently at "
           f"a sleek modern anchor desk facing camera, a large wall screen behind her "
           f"showing abstract blue city skyline graphics, cool blue and white studio "
           f"lighting, medium shot, broadcast news presenter, photorealistic, cinematic, "
           f"{NEG}",
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
    # PART 2 — 한국인 선수 + KT 위즈 스타일 홈 유니폼
    "S06": f"Dramatic low angle from behind home plate at night: a baseball home plate "
           f"umpire in dark navy uniform behind the catcher emphatically calling PLAY "
           f"BALL with a strong raised-arm gesture, mouth open shouting, the catcher "
           f"crouched in a KT Wiz style uniform (white with red pinstripes, black catcher "
           f"gear and mask), batter's box and home plate, blazing stadium floodlights, "
           f"packed roaring crowd, cinematic sports broadcast opening, {NEG}",
    "S07": f"Slow motion medium shot: {HOME_ONE}, a batter an instant after clean contact, "
           f"the baseball already launched and flying forward well ahead of the bat, "
           f"powerful follow-through, bat blur trailing behind, stadium lights flaring, "
           f"dust particles in the air, cinematic sports film, shallow depth of field, {NEG}",
    "S08": f"Dramatic slow motion side angle at ground level: {HOME_ONE}, a runner diving "
           f"head-first into second base, dust cloud exploding, {AWAY_ONE} applying a late "
           f"tag, night stadium lights, cinematic sports photography, shallow depth of "
           f"field, {NEG}",
    "S09": f"Slow motion close-up from behind the pitcher: {HOME_ONE}, a pitcher releasing "
           f"a blazing fastball, perfect pitching mechanics, arm blur, intense focused "
           f"eyes under cap brim, night stadium lights, cinematic sports film, {NEG}",
    "S10": f"Static medium shot: tense baseball dugout at night, three {HOME} sitting on "
           f"the bench wearing black team caps (NOT helmets) with serious focused "
           f"expressions, dramatic low-key side lighting, quiet heavy atmosphere, muted "
           f"color grade, cinematic sports documentary, {NEG}",
    "S11": f"Slow motion low angle: {HOME} wearing black team caps (NOT helmets) standing "
           f"up from the dugout bench with quiet determination, jaws set, dramatic rim "
           f"lighting from stadium lights behind them, rising heroic mood, cinematic, "
           f"maximum three players in frame, {NEG}",
    "S12": f"Extreme close-up: an opposing RIVAL baseball pitcher in a grey and navy blue "
           f"uniform with a navy cap, sweating face under his cap brim at night, single "
           f"sweat drop rolling down his temple, intense eyes staring toward home plate, "
           f"stadium lights creating a rim light on his cap, ultra shallow depth of "
           f"field, cinematic thriller tension, {NEG}",
    # 만루 상황 — 1/2/3루 주자 분할화면용 3컷 (Scene 13 직전)
    # 세 주자 모두 검정 헬멧 착용, 뛰는 자세가 아니라 리드폭 잡는 자세.
    "S12B1": f"Medium portrait: {HOME_ONE}, a base runner wearing a BLACK batting helmet "
             f"taking a lead-off stance just off first base at night, weight balanced and "
             f"leaning slightly, poised and ready to run but NOT running, determined "
             f"intense focused expression, stadium floodlights, vertical composition, "
             f"cinematic sports, {NEG}",
    "S12B2": f"Medium portrait: {HOME_ONE}, a base runner wearing a BLACK batting helmet "
             f"taking a lead-off stance just off second base at night, poised low and "
             f"ready but NOT running, fierce determined focused expression, stadium "
             f"floodlights, vertical composition, cinematic sports, {NEG}",
    "S12B3": f"Medium portrait: {HOME_ONE}, a base runner wearing a BLACK batting helmet "
             f"taking a lead-off stance just off third base at night, poised and ready to "
             f"break for home but NOT running, tense determined expression, stadium "
             f"floodlights, vertical composition, cinematic sports, {NEG}",
    # 타격의 순간 — 실제 스윙 컨택
    "S13": f"Dynamic slow motion: {HOME_ONE}, a batter mid-swing making explosive solid "
           f"contact with the ball at night, full body powerful follow-through, bat "
           f"connecting with the ball, dust and light particles bursting, stadium lights "
           f"flaring behind creating a heroic silhouette, cinematic sports climax, "
           f"shallow depth of field, {NEG}",
    # 공이 밤하늘 저 멀리 (여운)
    "S13B": f"Slow motion low angle looking up: a single baseball soaring high and far "
            f"into the dark night sky between two blazing stadium light towers, the ball "
            f"a bright point against the stars, anamorphic lens flare, majestic and "
            f"hopeful mood, no players visible, cinematic, {NEG}",

    # ── 추가 보강 장면 (PART2 야구, 이미지 8컷) ──
    "S06C": f"A Korean baseball manager in his 50s wearing a KT Wiz style team jacket and "
            f"cap, standing in the dugout at night with a focused authoritative "
            f"expression signaling a play, players blurred behind, stadium lights, "
            f"cinematic sports, {NEG}",
    "S07C": f"Dramatic slow motion: {HOME_ONE}, a batter performing an epic bat flip "
            f"(KBO ppa-dun) after a home run, tossing the bat high in the air with "
            f"swagger while watching the ball fly, confident triumphant pose, night "
            f"stadium lights, cinematic sports, {NEG}",
    "S07B": f"Ecstatic Korean baseball fans in the stands at night cheering wildly, "
            f"waving red and black thundersticks, crowd celebrating with raised arms, "
            f"stadium floodlights, confetti in the air, dynamic energy, cinematic sports "
            f"broadcast, {NEG}",
    "S11B": f"Night baseball: a group of {HOME} gathered on the pitching mound for a "
            f"tense strategy meeting, pitcher and infielders leaning in with heads "
            f"together, focused serious faces, stadium lights, cinematic sports "
            f"documentary, maximum five players, {NEG}",
    "S08B": f"Dramatic slow motion: {HOME_ONE}, an outfielder making a spectacular "
            f"full-stretch diving catch, body parallel to the ground, glove extended, "
            f"grass and dust flying, night stadium lights, cinematic sports photography, "
            f"shallow depth of field, {NEG}",
    "S10B": f"An opposing baseball player in a grey and navy blue uniform sliding into "
            f"home plate scoring a run at night, dust cloud, teammates celebrating in the "
            f"background, tense disappointing mood, cinematic sports, {NEG}",
    "S13B2": f"Dramatic slow motion low angle: {HOME_ONE}, a runner sliding into home "
             f"plate in a huge dust cloud as the catcher reaches for a late tag, intense "
             f"night stadium, cinematic sports photography, shallow depth of field, {NEG}",
    "S13C": f"Euphoric team celebration: a group of Korean baseball players in KT Wiz "
            f"style uniforms (white with red and black accents) piling together and "
            f"jumping in joy at home plate, walk-off victory, confetti and dust in "
            f"stadium floodlights, crowd exploding behind, cinematic sports, maximum six "
            f"players, {NEG}",
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
