"""Ask a model every question under one condition and save the answers.

Usage: python3 run.py --provider adaption --model <id> --condition plain [--sample 600] [--threads 4]
       python3 run.py --provider adaption --list-models
       python3 run.py --provider mock --model mock --condition plain --sample 50        (no key needed: tests the pipeline)
Output: runs/<model>__<condition>.jsonl, one line per item; rerun the same command to resume.
The key is read from the environment variable ADAPTION_API_KEY and is never printed or written.
"""
import argparse, csv, hashlib, json, os, random, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
import prompts
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--provider", default="adaption"); ap.add_argument("--model"); ap.add_argument("--condition", default="plain", choices=prompts.CONDITIONS)
ap.add_argument("--sample", type=int, default=0, help="number of items (0 = all); the sample is the same for every model and condition")
ap.add_argument("--threads", type=int, default=4); ap.add_argument("--list-models", action="store_true"); ap.add_argument("--max-tokens", type=int, default=400)
args = ap.parse_args()


def items():
    rows = list(csv.DictReader(open(os.path.join(HERE, "items.csv"), encoding="utf-8")))
    if args.sample and args.sample < len(rows):
        # a fixed pseudo-random order by item id, so samples of different sizes are nested and identical across runs
        rows.sort(key=lambda r: hashlib.sha256(("s1|" + r["item"]).encode()).hexdigest())
        rows = rows[:args.sample]
    return rows


def shuffled_counts(rows):
    """Another searchable region's study count for each item: a fixed derangement of the counts across regions."""
    regs = sorted({(r["iso"], r["region_clean"], r["n_all"]) for r in csv.DictReader(open(os.path.join(HERE, "items.csv"), encoding="utf-8")) if r["searchable"] == "1"})
    rnd = random.Random(20261114)
    perm = regs[:]
    rnd.shuffle(perm)
    for i in range(len(regs)):                      # no region keeps its own number
        if perm[i][2] == regs[i][2]:
            j = (i + 1) % len(regs); perm[i], perm[j] = perm[j], perm[i]
    return {(a[0], a[1]): b[2] for a, b in zip(regs, perm)}


def parse(text):
    m = re.search(r"\{[^{}]*\}", text or "", re.S)
    try:
        d = json.loads(m.group(0)) if m else {}
        est, lo, hi = float(d["estimate"]), float(d["low"]), float(d["high"])
    except Exception:  # noqa: BLE001
        nums = re.findall(r"-?\d+(?:\.\d+)?", text or "")
        if len(nums) < 3:
            return None
        est, lo, hi = map(float, nums[:3])
    if lo > hi:
        lo, hi = hi, lo
    return {"estimate": est, "low": lo, "high": hi}


def make_client():
    if args.provider == "mock":
        return None
    from adaption import Adaption
    if not os.environ.get("ADAPTION_API_KEY"):
        sys.exit("ADAPTION_API_KEY is not set in this environment.")
    return Adaption()


def text_of(resp):
    d = resp.model_dump() if hasattr(resp, "model_dump") else resp
    out = []
    def walk(o):
        if isinstance(o, dict):
            if o.get("type") in ("output_text", "text") and isinstance(o.get("text"), str):
                out.append(o["text"])
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    walk(d.get("output"))
    return "\n".join(out) or (d.get("output_text") or ""), d.get("usage")


def ask(client, item, text):
    if args.provider == "mock":                      # a stand-in that answers the national figure plus noise
        rnd = random.Random(item["item"]); v = max(0, min(100, float(item["national"]) + rnd.gauss(0, 6)))
        return json.dumps({"estimate": round(v, 1), "low": round(max(0, v - 8), 1), "high": round(min(100, v + 8), 1)}), None
    for k in range(6):
        try:
            return text_of(client.responses.create(model=args.model, instructions=prompts.SYSTEM, input=text, max_output_tokens=args.max_tokens, store=False))
        except Exception as e:  # noqa: BLE001
            msg = str(e)
            if any(s in msg for s in ("401", "403", "402", "insufficient", "credit")) or k == 5:
                raise
            time.sleep(4 * (k + 1))


def main():
    client = make_client()
    if args.list_models:
        for m in client.models.list(type="hosted").data:
            print(m.id, "|", m.display_name, "|", m.owned_by)
        return
    rows = items()
    if args.condition != "plain":
        rows = [r for r in rows if r["searchable"] == "1"]          # the other conditions need a study count
    shuf = shuffled_counts(rows) if args.condition == "shuffled" else {}
    os.makedirs(os.path.join(HERE, "runs"), exist_ok=True)
    path = os.path.join(HERE, "runs", f"{re.sub(r'[^A-Za-z0-9_.-]', '_', args.model)}__{args.condition}.jsonl")
    done = {json.loads(l)["item"] for l in open(path)} if os.path.exists(path) else set()
    todo = [r for r in rows if r["item"] not in done]
    print(f"{args.model} {args.condition}: {len(todo)} to ask, {len(done)} done", flush=True)
    lock, n, stop = threading.Lock(), [0, 0], [None]
    with open(path, "a", encoding="utf-8") as fh:
        def go(r):
            if stop[0]:
                return
            sn = shuf.get((r["iso"], r["region_clean"]))
            try:
                text, usage = ask(client, r, prompts.prompt(r, args.condition, sn))
            except Exception as e:  # noqa: BLE001
                stop[0] = str(e)[:200]; return
            rec = {"item": r["item"], "model": args.model, "condition": args.condition, "shown_n": sn if args.condition == "shuffled" else (r["n_all"] if args.condition == "signal" else None),
                   "raw": text, "parsed": parse(text), "usage": usage}
            with lock:
                fh.write(json.dumps(rec, ensure_ascii=False) + "\n"); fh.flush()
                n[0] += 1; n[1] += rec["parsed"] is None
                if n[0] % 100 == 0:
                    print(n[0], "/", len(todo), "| unparsed", n[1], flush=True)
        with ThreadPoolExecutor(args.threads) as ex:
            list(ex.map(go, todo))
    print("STOPPED: " + stop[0] if stop[0] else f"DONE {n[0]} asked, {n[1]} unparsed", flush=True)


if __name__ == "__main__":
    main()
