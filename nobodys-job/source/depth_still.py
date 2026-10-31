# depth map of the Higgsfield still (Depth Anything V2 Small, CPU): the basis for the 2.5D camera move
import numpy as np
from PIL import Image
from transformers import pipeline
pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
im = Image.open("hf/deorbit_raw.png").convert("RGB")
out = pipe(im)
d = np.asarray(out["depth"].convert("L").resize(im.size, Image.Resampling.BICUBIC)).astype(np.float32) / 255
np.save("hf/deorbit_depth.npy", d); Image.fromarray((d * 255).astype(np.uint8)).resize((1344, 760)).save("qa/v5/deorbit_depth.png")
print("depth", d.shape, float(d.min()), float(d.max()))
