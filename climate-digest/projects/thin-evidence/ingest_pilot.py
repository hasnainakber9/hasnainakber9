"""Turn the pilot answers into run files. PILOT ONLY: these came from Claude models answering through helper agents,
100 questions per prompt, not one question per API call, so they are not comparable with the main runs.

Usage: python3 ingest_pilot.py <folder with key.json and <model>_<n>.jsonl files>
"""
import glob, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1]
key = json.load(open(os.path.join(src, "key.json")))
os.makedirs(os.path.join(HERE, "runs"), exist_ok=True)
for model in sorted({os.path.basename(f).split("_")[0] for f in glob.glob(os.path.join(src, "*_[0-9].jsonl"))}):
    recs, bad = {}, 0
    for fn in sorted(glob.glob(os.path.join(src, model + "_[0-9].jsonl"))):
        for line in open(fn, encoding="utf-8"):
            line = line.strip().rstrip(",")
            if not line.startswith("{"):
                continue
            try:
                d = json.loads(line)
                lo, hi = sorted((float(d["low"]), float(d["high"])))
                recs[key[d["id"]]] = {"item": key[d["id"]], "model": f"pilot-claude-{model}-batched", "condition": "plain", "shown_n": None,
                                      "raw": line, "parsed": {"estimate": float(d["estimate"]), "low": lo, "high": hi}, "usage": None}
            except Exception:  # noqa: BLE001
                bad += 1
    with open(os.path.join(HERE, "runs", f"pilot-claude-{model}-batched__plain.jsonl"), "w", encoding="utf-8") as fh:
        for r in recs.values():
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(model, len(recs), "answers,", bad, "unreadable lines")
