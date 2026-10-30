import json
log = json.load(open("dialogue_log.json"))
def ts(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60); ms = int(round((s - int(s)) * 1000))
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
    end = b + 0.25 if i == len(log) else min(b + 0.25, starts[i] - 0.05)   # never overlap the next caption
    out.append(f"{i}\n{ts(a + 0.06)} --> {ts(end)}\n{text}\n")
open("Nobodys_Job.en.srt", "w").write("\n".join(out)); print(len(out), "cues")
