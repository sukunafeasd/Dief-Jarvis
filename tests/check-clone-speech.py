import json
import soundfile as sf
from scipy.signal import resample_poly
from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu", compute_type="int8", download_root="artifacts/whisper-check")
for name in ["jarvis-reference.wav", "jarvis-cloned-sample.wav", "jarvis-cloned-short.wav"]:
    samples, rate = sf.read("artifacts/" + name, dtype="float32")
    if rate != 16000:
        samples = resample_poly(samples, 16000, rate)
    segments, info = model.transcribe(samples, language="pt", beam_size=3, condition_on_previous_text=False)
    records = [{"start": segment.start, "end": segment.end, "text": segment.text.strip()} for segment in segments]
    print(json.dumps({"file": name, "segments": records, "duration": info.duration}, ensure_ascii=True))
