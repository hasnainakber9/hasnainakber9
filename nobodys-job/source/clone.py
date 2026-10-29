import os, sys, torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
torch.set_num_threads(4)
m = ChatterboxTTS.from_pretrained(device="cpu")
lines = [l.rstrip('\n').split('\t') for l in open(sys.argv[1]) if l.strip()]
for lid, who, txt in lines:
    for take in range(1):
        if os.path.exists(f"vo/{lid}_t{take}.wav"): continue
        wav = m.generate(txt, audio_prompt_path=f"ref_{who}.wav", exaggeration=0.55, cfg_weight=0.45, temperature=0.75)
        ta.save(f"vo/{lid}_t{take}.wav", wav, m.sr); print('done', lid, take, flush=True)
