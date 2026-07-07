#!/usr/bin/env python3
"""
Veo image-to-video: public/scenes/<id>.png → public/clips/<id>.mp4
씬 이미지를 8초 클립으로 애니메이트. 앞뒤 흐름이 이어지도록 씬별 모션 프롬프트 사용.

사용:  GEMINI_API_KEY=... python3 scripts/generate-videos.py S06 [S07 ...]
전송은 curl로 위임(프록시/CA 자동). 롱러닝 오퍼레이션을 폴링해 완료 후 다운로드.
"""
import base64
import json
import os
import subprocess
import sys
import time

MODEL = os.environ.get("VEO_MODEL", "veo-3.1-generate-preview")
BASE = "https://generativelanguage.googleapis.com/v1beta"
OUT_DIR = "public/clips"

# 씬별 모션 프롬프트(앞뒤 흐름 연결 · 과하지 않게). {id: prompt}
MOTION = {
    "S06": "The home plate umpire dynamically shouts 'play ball' and sweeps his arm, "
           "the catcher settles into his crouch, subtle crowd movement, slow cinematic "
           "push-in, natural live broadcast motion.",
    "S07": "Slow-motion follow-through of the home-run swing, the batter holds his finish "
           "and tracks the ball as it flies away, jersey and dust particles drift, gentle "
           "camera drift, cinematic.",
    "S072": "The slugger holds his proud pose admiring the home run, the bat lowers "
            "slightly, he watches the ball soar, subtle breathing motion, slow cinematic "
            "push-in.",
    "S073": "Explosive slow-motion contact, the bat drives through and the ball rockets "
            "off the barrel, dust bursts outward, camera follows the swing, cinematic.",
    "S13": "The decisive home-run swing connects in slow motion, the ball launches off "
           "the bat toward the outfield, the batter follows through, dramatic backlight, "
           "cinematic climax.",
    "S13B": "A baseball soars straight up and away into the night sky, receding toward "
            "the stadium lights, the camera tilts up following it, no side-to-side "
            "wobble, majestic and hopeful.",
    "S08": "Dramatic slow-motion: the runner slides head-first into the base as dust "
           "explodes, the fielder sweeps a late tag, intense split-second safe moment, "
           "cinematic low angle.",
    "S12B2": "Subtle tense motion: the base runner shifts his weight into a lead-off, "
             "eyes locked forward, focused breathing, ready to bolt, very slight "
             "cinematic push-in, night stadium.",
}


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def start_job(cid: str, prompt: str, key: str) -> str:
    img = base64.b64encode(open(f"public/scenes/{cid}.png", "rb").read()).decode()
    payload = {
        "instances": [{
            "prompt": prompt,
            "image": {"bytesBase64Encoded": img, "mimeType": "image/png"},
        }],
        "parameters": {"aspectRatio": "16:9", "sampleCount": 1},
    }
    tmp = f"/tmp/veo_{cid}.json"
    json.dump(payload, open(tmp, "w"))
    url = f"{BASE}/models/{MODEL}:predictLongRunning?key={key}"
    r = run(["curl", "-sS", "-X", "POST", url,
             "-H", "Content-Type: application/json", "-d", f"@{tmp}"])
    os.unlink(tmp)
    try:
        d = json.loads(r.stdout)
    except json.JSONDecodeError:
        print(f"  {cid}: 비 JSON 응답 {r.stdout[:200]}")
        return ""
    if "error" in d:
        print(f"  {cid}: ERROR {json.dumps(d['error'])[:300]}")
        return ""
    return d.get("name", "")


def poll(op: str, key: str, timeout_s: int = 600) -> dict:
    url = f"{BASE}/{op}?key={key}"
    waited = 0
    while waited < timeout_s:
        r = run(["curl", "-sS", url])
        try:
            d = json.loads(r.stdout)
        except json.JSONDecodeError:
            time.sleep(10); waited += 10; continue
        if d.get("done"):
            return d
        time.sleep(15); waited += 15
    return {}


def save_video(cid: str, done: dict, key: str) -> bool:
    resp = done.get("response", {})
    # 후보 경로들 탐색
    samples = (resp.get("generateVideoResponse", {}).get("generatedSamples")
               or resp.get("generatedSamples") or [])
    if not samples:
        print(f"  {cid}: 비디오 응답 없음 {json.dumps(resp)[:300]}")
        return False
    vid = samples[0].get("video", {})
    os.makedirs(OUT_DIR, exist_ok=True)
    out = f"{OUT_DIR}/{cid}.mp4"
    if vid.get("bytesBase64Encoded"):
        open(out, "wb").write(base64.b64decode(vid["bytesBase64Encoded"]))
    elif vid.get("uri"):
        uri = vid["uri"]
        sep = "&" if "?" in uri else "?"
        run(["curl", "-sSL", "-o", out, f"{uri}{sep}key={key}"])
    else:
        print(f"  {cid}: video 필드 없음 {json.dumps(vid)[:200]}")
        return False
    sz = os.path.getsize(out) if os.path.exists(out) else 0
    print(f"  {cid}: OK -> {out} ({sz // 1024}KB)")
    return sz > 0


def main():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY 필요")
    ids = [a for a in sys.argv[1:] if not a.startswith("-")] or list(MOTION)
    for cid in ids:
        if cid not in MOTION:
            print(f"  {cid}: 모션 프롬프트 없음, 스킵"); continue
        print(f"[{cid}] 잡 시작…")
        op = start_job(cid, MOTION[cid], key)
        if not op:
            continue
        print(f"[{cid}] 폴링… ({op})")
        done = poll(op, key)
        if not done:
            print(f"  {cid}: 타임아웃"); continue
        if "error" in done:
            print(f"  {cid}: op ERROR {json.dumps(done['error'])[:300]}"); continue
        save_video(cid, done, key)


if __name__ == "__main__":
    main()
