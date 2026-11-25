"""Re-time line and word starts from the isolated vocal.

align.py places lines from Whisper's word timestamps on the full mix: lines
it did not hear are spread evenly, and the first word after a pause is pinned
to the end of the word before it. This pass separates the vocal (Demucs),
force-aligns the known sheet to it with two acoustic models (CTC: wav2vec2
base 960 h for English, MMS_FA for any language), snaps word starts to
onsets and proposes a start per line with a score. Nothing here listens:
every number is model-inferred.

Per model: the whole sheet is aligned once across the song, and each line
the old timing heard is aligned alone in a window around its old start.
Lines where both agree and score well become anchors; the lines between two
anchors are aligned together inside that gap. The better-scoring model's
reading is proposed and the other one is its cross-check.

usage: refine.py [ids... | --all] [--report] [--apply] [--force]
                 [--base REV] [--min-delta S] [--min-score P] [--minutes N]

  --report   print old start, new start, delta, score and verdict per line
  --apply    write the lines marked APPLY into src/data/timing.json
  --base     take the old timing from a git revision and compare the
             proposal with today's file (a dry run; never applies)
  --all      every song in album order, skipping those already in the log
"""

import argparse
import datetime
import difflib
import json
import re
import subprocess
import sys
import time

import refine_apply as ra
from align import dump_timing
from songs import HERE, ROOT, TIMING_JSON, TRACKS_TS, LYRICS_DIR, load_songs

PROPOSALS = HERE / "proposals"
LOG = PROPOSALS / "log.json"
WINDOW = 4.0  # seconds searched either side of a heard line's old span
ANCHOR_SCORE = 0.5
WEAK_WORD = 0.1  # a word scored below this was placed, not heard
LEAD_IN = 0.3  # seconds given to each unheard word before a line's first heard one
MODELS = {"en": ("en", "mms"), "fr": ("mms",)}  # acoustic models per sheet language


def track_order():
    src = TRACKS_TS.read_text(encoding="utf-8")
    block = re.search(r"TRACK_ORDER[^=]*=\s*\[(.*?)\]", src, re.S).group(1)
    return re.findall(r"'(\w+)'", block)


def track_langs():
    src = TRACKS_TS.read_text(encoding="utf-8")
    langs = {}
    for part in re.split(r"^    id: '", src, flags=re.M)[1:]:
        m = re.search(r"^    lang: '(\w+)'", part, re.M)
        langs[part.split("'", 1)[0]] = m.group(1) if m else "en"
    return langs


def is_transcribed(song_id):
    data = json.loads((LYRICS_DIR / f"{song_id}.json").read_text(encoding="utf-8"))
    return isinstance(data, dict) and data.get("source") == "transcribed"


def line_score(words):
    return sum(w[2] for w in words) / len(words)


def settle_lead(words):
    """Leading words the model did not hear sit wherever the path left them,
    sometimes seconds early. Pull them to LEAD_IN per word before the first
    word it did hear."""
    first = next((j for j, w in enumerate(words) if w[2] >= WEAK_WORD), 0)
    out = list(words)
    for i in range(first):
        start = max(words[i][0], words[first][0] - LEAD_IN * (first - i))
        out[i] = (start, max(start, min(words[i][1], words[first][0])), words[i][2])
    return out


def whisper_words(song_id):
    """Whisper's words on the stem, if refine_whisper.py has been run."""
    path = HERE / "stems" / f"{song_id}.whisper.json"
    if not path.exists():
        return None
    words = json.loads(path.read_text(encoding="utf-8"))["words"]
    return [(ra.word_tokens(w["word"]), w["start"]) for w in words]


def whisper_heard(asr, tokens, start, end):
    """True when Whisper heard at least half the line's words around the
    proposed span, False when it heard other words there, None when it
    heard too little to say."""
    near = [t for t, s in asr if t and start - 1.0 <= s <= end + 1.0]
    if len(near) < 2:
        return None
    hits = sum(any(difflib.SequenceMatcher(None, t, w).ratio() >= 0.75 for w in near) for t in tokens)
    share = hits / len(tokens)
    return True if share >= 0.5 else False if share < 0.25 else None


def align_song(au, em, name, alignable, old, had_words):
    """One acoustic model's reading of the song: {line index: words} where a
    word is (start, end, score). Lines the old timing heard are aligned alone
    around their old start; those that also sit there in an alignment of the
    whole sheet, and score well, are anchors. The rest are aligned together
    between the anchors either side of them."""
    frames = len(em)
    usable = [k for k, toks in enumerate(alignable) if toks]
    whole = {}
    found = au.align(em, name, [alignable[k] for k in usable], 0, frames)
    if found:
        whole = dict(zip(usable, found))

    alone = {}
    for k in usable:
        if not had_words[k]:
            continue
        nxt = old[k + 1] if k + 1 < len(old) else old[k] + 10
        lo, hi = old[k] - WINDOW, max(nxt, old[k] + 2) + WINDOW
        got = au.align(em, name, [alignable[k]], int(lo / au.FRAME), int(hi / au.FRAME))
        if got:
            alone[k] = got[0]

    def squeezed(k):
        chars = sum(len(t) for t in alignable[k])
        return (alone[k][-1][1] - alone[k][0][0]) / chars < ra.MIN_SEC_PER_CHAR

    ordered = []
    for k in usable:
        if k not in alone or k not in whole or abs(alone[k][0][0] - whole[k][0][0]) > ra.AGREE:
            continue
        if line_score(alone[k]) < ANCHOR_SCORE or squeezed(k):
            continue
        keep = True
        while ordered and alone[ordered[-1]][-1][1] > alone[k][0][0]:
            if line_score(alone[ordered[-1]]) >= line_score(alone[k]):
                keep = False
                break
            ordered.pop()
        if keep:
            ordered.append(k)
    anchors = set(ordered)

    chosen = {k: alone[k] for k in anchors}
    run = []
    for k in usable + [None]:
        if k is not None and k not in anchors:
            run.append(k)
            continue
        if run:
            before = max((a for a in anchors if a < run[0]), default=None)
            lo = alone[before][-1][1] - 0.1 if before is not None else 0.0
            hi = alone[k][0][0] + 0.1 if k is not None else frames * au.FRAME
            got = au.align(em, name, [alignable[j] for j in run], int(lo / au.FRAME), int(hi / au.FRAME))
            chosen.update(zip(run, got or []))
            run = []
    return {k: settle_lead(words) for k, words in chosen.items()}


def propose(song_id, song, entry, lang):
    """The proposal for one song: per sung line the old start, the new one,
    its word starts, its score and where the other model put it."""
    import numpy as np

    import refine_audio as au

    stanzas = song["lyrics"]
    wav = au.stem(song_id, song["audio"])
    strength, level = au.onset_strength(wav)
    peaks = au.onset_peaks(strength)
    asr = whisper_words(song_id)

    sung = ra.sung_lines(stanzas)
    tokens = [[ra.word_tokens(w) for w in text.split()] for _, _, text in sung]
    alignable = [[t for t in toks if t] for toks in tokens]
    old = [entry["lines"][si][li] for si, li, _ in sung]
    had_words = [entry.get("words") is not None and entry["words"][si][li] is not None for si, li, _ in sung]
    names = MODELS[lang]
    readings = {name: align_song(au, au.emissions(song_id, wav, name), name, alignable, old, had_words) for name in names}

    lines = []
    for k, (si, li, text) in enumerate(sung):
        p = {"s": si, "l": li, "old": old[k], "had_words": had_words[k]}
        got = {name: readings[name][k] for name in names if k in readings[name]}
        if not got:
            p["new"] = None
            p["note"] = "no letters to align" if not alignable[k] else "no room between its neighbours"
            lines.append(p)
            continue
        best = max(got, key=lambda name: line_score(got[name]))
        words = got[best]
        raw = words[0][0]
        others = [w[0][0] for name, w in got.items() if name != best]
        starts, prev_end = [], None
        for start, end, _ in words:
            first = prev_end is None or start - prev_end >= 0.25
            back, fwd = (0.3, 0.1) if first else (0.08, 0.06)
            starts.append(float(au.snap(start, peaks, strength, back, fwd)))
            prev_end = end
        starts = list(np.maximum.accumulate(starts))
        # Back onto the sheet's whitespace words: one without letters takes
        # the start of the next word that has them, or the last one's.
        it = iter(starts)
        per_word = [next(it) if t else None for t in tokens[k]]
        nxt = starts[-1]
        for j in range(len(per_word) - 1, -1, -1):
            if per_word[j] is None:
                per_word[j] = nxt
            nxt = per_word[j]
        p.update(
            new=round(per_word[0], 2),
            raw=round(raw, 2),
            check=round(others[0], 2) if others else None,
            end=round(words[-1][1], 2),
            score=round(line_score(words), 3),
            chars=sum(len(t) for t in alignable[k]),
            by=best,
            models={name: [round(w[0][0], 2), round(line_score(w), 3)] for name, w in got.items()},
            words=[round(float(t), 2) for t in per_word],
            wscore=[round(w[2], 2) for w in words],
            rise=au.rise(level, per_word[0]),
        )
        if asr is not None:
            p["whisper"] = whisper_heard(asr, alignable[k], raw, words[-1][1])
        lines.append(p)
    return {
        "id": song_id,
        "method": "htdemucs vocals; forced alignment with " + " and ".join(names) + "; onset snap",
        "generated": datetime.date.today().isoformat(),
        "duration": round(len(wav) / au.SR, 2),
        "lines": lines,
    }


def dump_proposal(proposal):
    head = {k: v for k, v in proposal.items() if k != "lines"}
    rows = ",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in proposal["lines"])
    return json.dumps(head, ensure_ascii=False)[:-1] + ', "lines": [\n' + rows + "\n]}\n"


def read_json(path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--force", action="store_true", help="align again even if a proposal exists")
    ap.add_argument("--base", help="git revision whose timing.json is the old timing (dry run)")
    ap.add_argument("--min-delta", type=float, default=ra.MIN_DELTA)
    ap.add_argument("--min-score", type=float, default=ra.MIN_SCORE)
    ap.add_argument("--minutes", type=float, help="with --all, stop starting songs after this long")
    args = ap.parse_args()
    if args.base and args.apply:
        sys.exit("--base is a dry run; it cannot --apply")
    if not args.ids and not args.all:
        ap.error("name song ids or pass --all")

    text = TIMING_JSON.read_text(encoding="utf-8")
    timing = json.loads(text)
    if args.apply and dump_timing(timing) != text:
        sys.exit("timing.json is not laid out as align.dump_timing writes it; refusing to rewrite it")
    current = timing
    if args.base:
        shown = subprocess.run(
            ["git", "-C", str(ROOT), "show", f"{args.base}:src/data/timing.json"], check=True, capture_output=True, text=True
        )
        timing = json.loads(shown.stdout)

    songs = load_songs()
    langs = track_langs()
    hand = ra.load_hand_timed()
    PROPOSALS.mkdir(exist_ok=True)
    log = read_json(LOG, {})
    if args.all:
        order = [i for i in track_order() if i in songs]
        order += [i for i in songs if i not in order]
        ids = [i for i in order if not is_sheetless(songs[i]) and not is_transcribed(i)]
        ids += [i for i in order if not is_sheetless(songs[i]) and is_transcribed(i)]
        if not args.force:
            ids = [i for i in ids if i not in log]
    else:
        ids = args.ids
        unknown = [i for i in ids if i not in songs]
        if unknown:
            sys.exit(f"unknown song ids: {', '.join(unknown)}")

    began = time.time()
    for song_id in ids:
        if args.minutes and time.time() - began > args.minutes * 60:
            print(f"stopping: {args.minutes:g} minutes used; run --all again to continue")
            break
        song = songs[song_id]
        entry = timing.get(song_id)
        skip = None
        if not song["lyrics"]:
            skip = "no lyric sheet"
        elif entry is None:
            skip = "no timing entry (run align.py first)"
        elif "words" not in entry or hand.get(song_id) == "all":
            skip = "hand-timed"
        elif langs.get(song_id, "en") not in MODELS:
            skip = f"language {langs[song_id]} has no romanization here"
        if skip:
            print(f"{song_id}: skipped ({skip})")
            if not args.base:
                log[song_id] = {"status": "skipped", "why": skip}
                LOG.write_text(json.dumps(log, indent=1) + "\n", encoding="utf-8")
            continue

        t0 = time.time()
        path = (PROPOSALS / f"{song_id}.json") if not args.base else None
        if path and path.exists() and not args.force:
            proposal = json.loads(path.read_text(encoding="utf-8"))
            for p in proposal["lines"]:
                if not p.get("applied"):
                    p["old"] = entry["lines"][p["s"]][p["l"]]
        else:
            proposal = propose(song_id, song, entry, langs.get(song_id, "en"))
        locked = {(p["s"], p["l"]) for p in proposal["lines"] if ra.is_locked(song_id, entry, hand, p["s"], p["l"])}
        ra.decide(proposal, locked, args.min_delta, args.min_score)
        summary = ra.summarize(proposal)

        if args.apply and summary["apply"]:
            timing[song_id] = ra.merge(entry, song["lyrics"], proposal)
            TIMING_JSON.write_text(dump_timing(timing), encoding="utf-8")
            for p in proposal["lines"]:
                if p["verdict"] == "apply":
                    p["applied"] = True
        if path:
            path.write_text(dump_proposal(proposal), encoding="utf-8")
            status = "applied" if args.apply else log.get(song_id, {}).get("status", "proposed")
            if args.apply or song_id not in log:
                log[song_id] = {
                    "status": status,
                    "date": proposal["generated"],
                    "lang": langs.get(song_id, "en"),
                    "transcribed": is_transcribed(song_id),
                    **summary,
                }
                LOG.write_text(json.dumps(log, indent=1) + "\n", encoding="utf-8")
        if args.report:
            print(ra.report(proposal, song["lyrics"], current[song_id] if args.base else None))
        else:
            s = summary
            print(
                f"{song_id}: {s['lines']} lines, apply {s['apply']} (median {s['median']} s, max {s['max']} s), "
                f"keep {s['keep']}, review {s['review']}, locked {s['locked']}"
                f"{' [written]' if args.apply and s['apply'] else ''}  {time.time() - t0:.0f}s",
                flush=True,
            )


def is_sheetless(song):
    return not song["lyrics"]


if __name__ == "__main__":
    main()
