import argparse
import base64
import contextlib
import io
import json
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--model", required=True)
parser.add_argument("--reference", required=True)
parser.add_argument("--language", default="pt")
args = parser.parse_args()
model = None
conditioning = None
for line in sys.stdin:
    request = None
    try:
        request = json.loads(line)
        with contextlib.redirect_stdout(sys.stderr):
            import numpy as np
            import soundfile as sf
            import torch
            from TTS.tts.configs.xtts_config import XttsConfig
            from TTS.tts.models.xtts import Xtts, XttsAudioConfig, XttsArgs
            from TTS.config.shared_configs import BaseDatasetConfig
            if model is None:
                torch.set_num_threads(min(8, torch.get_num_threads()))
                torch.serialization.add_safe_globals([XttsConfig, XttsAudioConfig, XttsArgs, BaseDatasetConfig])
                config = XttsConfig()
                config.load_json(args.model + "/config.json")
                model = Xtts.init_from_config(config)
                model.load_checkpoint(config, checkpoint_dir=args.model, use_deepspeed=False)
                model.eval()
                conditioning = model.get_conditioning_latents(audio_path=[args.reference], gpt_cond_len=6, max_ref_length=12, sound_norm_refs=True)
            with torch.inference_mode():
                result = model.inference(request["text"], args.language, *conditioning, speed=request["speed"], enable_text_splitting=True)
            samples = np.asarray(result["wav"], dtype=np.float32)
            if not len(samples) or not np.isfinite(samples).all():
                raise ValueError("Invalid synthesized samples")
            peak = float(np.max(np.abs(samples)))
            if peak > 0.98:
                samples *= 0.98 / peak
            output = io.BytesIO()
            sf.write(output, samples, 24000, format="WAV", subtype="PCM_16")
        reply = {"id": request["id"], "wav": base64.b64encode(output.getvalue()).decode("ascii")}
    except Exception as error:
        reply = {"id": request.get("id") if isinstance(request, dict) else None, "error": str(error)[:1500]}
    sys.stdout.write(json.dumps(reply, ensure_ascii=True) + "\n")
    sys.stdout.flush()
