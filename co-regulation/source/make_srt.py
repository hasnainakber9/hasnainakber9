import json
log = json.load(open("dialogue_log.json"))
# shot changes: a caption may hang on 0.25 s after its line, but never past the next cut or into the next caption
cuts = [s["start_f"] / 24 for s in json.load(open("timeline.json"))][1:]
def ts(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60); ms = int(round((s - int(s)) * 1000))
    if ms == 1000: s, ms = s + 1, 0
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{ms:03d}"
out = []
starts = [a + 0.06 for a, b, l in log]
for i, (a, b, label) in enumerate(log, 1):
    text = label.split("  ", 1)[1] if "  " in label else label
    if len(text) > 42:  # two balanced lines
        words = text.split(); best = None
        for k in range(1, len(words)):
            l1, l2 = " ".join(words[:k]), " ".join(words[k:])
            sc = abs(len(l1) - len(l2))
            if best is None or sc < best[0]: best = (sc, l1 + "\n" + l2)
        text = best[1]
    end = b + 0.25
    nxt_cut = next((c for c in cuts if c >= b - 1e-6), None)
    if nxt_cut is not None: end = min(end, max(b, nxt_cut - 1 / 24))
    if i < len(log): end = min(end, starts[i] - 0.05)
    out.append(f"{i}\n{ts(a + 0.06)} --> {ts(end)}\n{text}\n")
open("Co_Regulation.en.srt", "w").write("\n".join(out)); print(len(out), "cues")
