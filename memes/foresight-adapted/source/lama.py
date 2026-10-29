import numpy as np, cv2, onnxruntime as ort
from PIL import Image
_S = None
def _sess():
    global _S
    if _S is None:
        so = ort.SessionOptions(); so.intra_op_num_threads = 4
        _S = ort.InferenceSession('/tmp/claude-0/-home-user-hasnainakber9/11d740fd-0a4d-5eae-ae57-4929a6b7f4b6/scratchpad/lama/lama_fp32.onnx', so, providers=['CPUExecutionProvider'])
    return _S

def _run(crop, m):
    x = cv2.resize(crop, (512, 512), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    mm = cv2.resize(m.astype(np.uint8) * 255, (512, 512), interpolation=cv2.INTER_NEAREST)
    mm = (mm > 127).astype(np.float32)
    out = _sess().run(None, {'image': x.transpose(2, 0, 1)[None], 'mask': mm[None, None]})[0][0]
    out = out.transpose(1, 2, 0)
    if out.max() <= 1.5: out = out * 255.0
    out = np.clip(out, 0, 255).astype(np.uint8)
    return cv2.resize(out, (crop.shape[1], crop.shape[0]), interpolation=cv2.INTER_CUBIC)

def inpaint(im, mask, ctx=2.6, minside=320, feather=3):
    """LaMa inpaint each connected group of the mask inside a square context window."""
    a = np.asarray(im.convert('RGB')).copy(); H, W = mask.shape
    mask = mask.astype(bool)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(cv2.dilate(mask.astype(np.uint8), np.ones((25, 25), np.uint8)))
    for i in range(1, n):
        x, y, w, h = stats[i][:4]
        side = int(max(minside, max(w, h) * ctx)); side = min(side, max(W, H))
        cx, cy = x + w // 2, y + h // 2
        x0 = int(np.clip(cx - side // 2, 0, max(0, W - side))); y0 = int(np.clip(cy - side // 2, 0, max(0, H - side)))
        x1, y1 = min(W, x0 + side), min(H, y0 + side)
        sub_m = mask[y0:y1, x0:x1] & (lab[y0:y1, x0:x1] == i)
        if not sub_m.any(): continue
        res = _run(a[y0:y1, x0:x1], sub_m)
        alpha = cv2.GaussianBlur(cv2.dilate(sub_m.astype(np.uint8), np.ones((feather * 2 + 1,) * 2, np.uint8)).astype(np.float32), (0, 0), feather)
        alpha = np.clip(alpha * 1.5, 0, 1)[..., None]
        a[y0:y1, x0:x1] = (res * alpha + a[y0:y1, x0:x1] * (1 - alpha)).astype(np.uint8)
    return Image.fromarray(a)
