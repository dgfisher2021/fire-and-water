"""The torch half of refine.py: the vocal stem (Demucs htdemucs), the CTC
character posteriors of the stem from two acoustic models (torchaudio MMS_FA,
multilingual and romanized, and wav2vec2 base 960 h, English) and the onset
strength used to snap word starts. Everything caches in scripts/timing/stems/
(ignored)."""

import os
import subprocess
import wave

import numpy as np
import torch
import torchaudio

from songs import HERE

STEMS = HERE / "stems"
THREADS = int(os.environ.get("REFINE_THREADS", "4"))
SR = 16000
FRAME = 0.02  # seconds per emission frame
HOP = 0.01  # seconds per onset frame

DEVICE = os.environ.get("REFINE_DEVICE") or ("cuda" if torch.cuda.is_available() else "cpu")

torch.set_num_threads(THREADS)

_demucs = None
_models = {}


def free_gpu():
    if DEVICE == "cuda":
        torch.cuda.empty_cache()


def read_audio(path, rate, channels):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", str(channels), "-ar", str(rate), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return torch.from_numpy(np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).T.copy())


def stem(song_id, audio_path):
    """The isolated vocal as a 16 kHz mono tensor, separated once per song."""
    global _demucs
    STEMS.mkdir(exist_ok=True)
    out = STEMS / f"{song_id}.wav"
    if not out.exists():
        from demucs.apply import apply_model
        from demucs.pretrained import get_model

        if _demucs is None:
            _demucs = get_model("htdemucs").eval().to(DEVICE)
        mix = read_audio(audio_path, _demucs.samplerate, 2)
        ref = mix.mean(0)
        mean, std = ref.mean(), ref.std() + 1e-8
        with torch.no_grad():
            sources = apply_model(_demucs, ((mix - mean) / std)[None], device=DEVICE, shifts=0, overlap=0.1, progress=False)[0].cpu()
        vocals = sources[_demucs.sources.index("vocals")].mean(0) * std
        mono = torchaudio.functional.resample(vocals, _demucs.samplerate, SR).clamp(-1, 1)
        tmp = out.with_suffix(".tmp")
        with wave.open(str(tmp), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((mono.numpy() * 32767).astype("<i2").tobytes())
        tmp.rename(out)
        del sources
        free_gpu()
    with wave.open(str(out), "rb") as w:
        data = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2")
    return torch.from_numpy(data.astype(np.float32) / 32767)


def acoustic(name):
    """(model, {char: index}, word separator index or None) for "mms"
    (MMS_FA: multilingual, romanized) or "en" (wav2vec2 base, LibriSpeech
    960 h: English only). "*" is one column past the model's own."""
    if name not in _models:
        if name == "mms":
            bundle = torchaudio.pipelines.MMS_FA
            net, labels = bundle.get_model(with_star=False), bundle.get_labels(star=None)
        else:
            bundle = torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
            net, labels = bundle.get_model(), bundle.get_labels()
        dictionary = {c.lower(): i for i, c in enumerate(labels)}
        dictionary["*"] = len(labels)
        _models[name] = (net.eval().to(DEVICE), dictionary, dictionary.get("|"))
    return _models[name]


def emissions(song_id, wav, name, chunk=30.0, context=2.0):
    """Log-probabilities per 20 ms frame over the model's characters plus a
    last column "*" (anything, free), computed in 30 s chunks with 2 s of
    context either side."""
    path = STEMS / f"{song_id}.{name}.npy"
    if path.exists():
        return torch.from_numpy(np.load(path).astype(np.float32))
    model = acoustic(name)[0]
    hop = int(FRAME * SR)
    core, ctx = int(chunk * SR), int(context * SR)
    parts = []
    with torch.inference_mode():
        for start in range(0, len(wav), core):
            a, b = max(0, start - ctx), min(len(wav), start + core + ctx)
            piece = wav[a:b]
            if len(piece) < 800:
                break
            em, _ = model(piece[None].to(DEVICE))
            em = torch.log_softmax(em[0].cpu().float(), dim=-1)
            em = torch.cat([em, torch.zeros(len(em), 1)], dim=1)
            first = (start - a) // hop
            count = min(core, len(wav) - start) // hop
            parts.append(em[first : first + count])
    out = torch.cat(parts)
    np.save(path, out.numpy().astype(np.float16))
    free_gpu()
    return out


def align(emission, name, lines, lo, hi):
    """Force-align `lines` (each a list of per-word token strings) in order
    inside frames [lo, hi), with "*" before, between and after the lines to
    take whatever else is sung there. Returns per line a list of
    (start_s, end_s, score) per word, or None when the window is too short."""
    _, dictionary, sep = acoustic(name)
    star = dictionary["*"]
    targets, owner = [star], [None]
    for n, words in enumerate(lines):
        for k, word in enumerate(words):
            if k and sep is not None:
                targets.append(sep)
                owner.append(None)
            for c in word:
                targets.append(dictionary[c])
                owner.append((n, k))
        targets.append(star)
        owner.append(None)
    lo, hi = max(0, lo), min(len(emission), hi)
    if hi - lo < len(targets) * 1.3 + 4:
        return None
    try:
        aligned, scores = torchaudio.functional.forced_align(
            emission[None, lo:hi], torch.tensor([targets], dtype=torch.int32), blank=0
        )
    except RuntimeError:
        return None
    spans = torchaudio.functional.merge_tokens(aligned[0], scores[0].exp())
    assert len(spans) == len(targets)
    out = [[None] * len(words) for words in lines]
    for span, who in zip(spans, owner):
        if who is None:
            continue
        n, k = who
        start, end = (lo + span.start) * FRAME, (lo + span.end) * FRAME
        if out[n][k] is None:
            out[n][k] = [start, end, span.score, 1]
        else:
            w = out[n][k]
            w[1], w[2], w[3] = end, w[2] + span.score, w[3] + 1
    return [[(w[0], w[1], w[2] / w[3]) for w in words] for words in out]


def onset_strength(wav):
    """Half-wave rectified log-spectral flux of the stem per 10 ms, over its
    local average, and the level in dB: where a consonant or a note starts."""
    spec = torch.stft(wav, 400, hop_length=int(HOP * SR), window=torch.hann_window(400), return_complex=True).abs()
    logs = torch.log1p(100 * spec)
    flux = torch.relu(logs[:, 1:] - logs[:, :-1]).sum(0)
    flux = torch.cat([torch.zeros(1), flux])
    local = torch.nn.functional.avg_pool1d(flux[None, None], 201, 1, 100, count_include_pad=False)[0, 0]
    level = 20 * torch.log10(spec.pow(2).mean(0).sqrt() + 1e-6)
    return (flux / (local + 0.1 * flux.mean() + 1e-6)).numpy(), level.numpy()


def rise(level, t):
    """dB the stem gains across `t`: the quarter second after it against the
    0.3 s before. A large rise is a voice coming in from quiet."""
    f = int(t / HOP)
    before, after = level[max(0, f - 35) : max(1, f - 5)], level[f : f + 25]
    return round(float(after.mean() - before.mean()), 1) if len(after) else 0.0


def onset_peaks(strength, threshold=1.5):
    """Frames where the onset strength peaks (highest within 30 ms)."""
    s = strength
    pad = np.pad(s, 3, mode="edge")
    windows = np.stack([pad[k : k + len(s)] for k in range(7)])
    return np.nonzero((s >= windows.max(0)) & (s > threshold))[0]


def snap(t, peaks, strength, back, fwd):
    """The onset nearest `t` within [t - back, t + fwd], stronger ones
    favoured; `t` itself when nothing starts there."""
    lo, hi = np.searchsorted(peaks, [(t - back) / HOP, (t + fwd) / HOP])
    best, best_w = t, 0.0
    for f in peaks[lo:hi]:
        ft = f * HOP
        reach = back if ft < t else fwd
        w = strength[f] * (1 - 0.6 * abs(ft - t) / reach)
        if w > best_w:
            best, best_w = ft, w
    return best
