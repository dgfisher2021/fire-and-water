"""Align each song's lyrics to its Whisper word timestamps and write
src/data/timing.json as { id: { stanzas: [s], lines: [[s]], words: [[[s] | null]] } }.

Monotonic sequence alignment (Needleman-Wunsch over normalized tokens with
fuzzy matches) maps lyric tokens to heard words. A line is anchored at its
first strongly matched word once at least half of it was heard; unheard
lines are spread between their anchored neighbours in proportion to their
length. A stanza starts at its first line; a label line takes the time of the
line after it. An anchored line also gets a start per word (its heard words
as heard, the rest spread between them), so the reader can light word by
word; other lines get null and light as a whole.
Every transcript pass next to this file (asr/, asr-strict/, ...) is tried and
the one that anchors the most lines wins.

usage: python scripts/timing/align.py [ids...]
"""

import difflib
import json
import math
import re
import sys

from songs import HERE, TIMING_JSON, is_label, load_songs

STRONG = 0.6  # similarity score that may anchor a line
SEC_PER_CHAR = 0.11  # pace used to spread lines that were not heard
LEAD_IN = 0.3  # seconds per unheard token before a line's first anchored word
MAX_WORD_GAP = 3.0  # a heard word this far ahead of the line's next word is a stretched one
MIN_UNSUNG_RUN = 6  # unheard lines in a row with nothing sung between: a verse the cut skipped
BREAK_MARGIN = 4.0  # seconds after an anchored line that still belong to that line


def norm(tok):
    return re.sub(r"[^a-z0-9]", "", tok.lower())


_sim_cache = {}


def sim(a, b):
    if a == b:
        return 1.0
    key = (a, b)
    if key not in _sim_cache:
        r = difflib.SequenceMatcher(None, a, b).ratio()
        _sim_cache[key] = 0.6 if r >= 0.75 else (0.2 if r >= 0.55 else -0.6)
    return _sim_cache[key]


def align(lyric_tokens, asr_tokens):
    """Per lyric token, the index of the heard word it strongly matched, or None."""
    n, m = len(lyric_tokens), len(asr_tokens)
    gap_l, gap_a = -0.45, -0.25  # skipping a lyric token vs an extra heard word
    score = [[0.0] * (m + 1) for _ in range(n + 1)]
    back = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        score[i][0] = i * gap_l
        back[i][0] = 2
    for j in range(1, m + 1):
        score[0][j] = j * gap_a
        back[0][j] = 3
    for i in range(1, n + 1):
        a = lyric_tokens[i - 1]
        row, prev, brow = score[i], score[i - 1], back[i]
        for j in range(1, m + 1):
            best, bt = prev[j - 1] + sim(a, asr_tokens[j - 1]), 1
            cand = prev[j] + gap_l
            if cand > best:
                best, bt = cand, 2
            cand = row[j - 1] + gap_a
            if cand > best:
                best, bt = cand, 3
            row[j], brow[j] = best, bt
    mapping = [None] * n
    i, j = n, m
    while i > 0 or j > 0:
        bt = back[i][j]
        if i > 0 and j > 0 and bt == 1:
            if sim(lyric_tokens[i - 1], asr_tokens[j - 1]) >= STRONG:
                mapping[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif i > 0 and (j == 0 or bt == 2):
            i -= 1
        else:
            j -= 1
    return mapping


def spread(values, weights, duration, heard_starts):
    """Fill None entries between anchors in proportion to weights (line
    lengths); extrapolate the ends at a reading pace. A long unheard run with
    no words sung between its neighbours is a verse the recording skipped:
    those lines take the next anchor's time so the reader jumps past them.
    Returns (times, unsung indices); times are monotonic and in range."""
    out = list(values)
    n = len(out)
    known = [k for k, v in enumerate(out) if v is not None]
    if not known:
        return [round(duration * k / max(1, n), 2) for k in range(n)], set()
    first, last = known[0], known[-1]
    for k in range(first - 1, -1, -1):
        out[k] = max(0.0, out[k + 1] - weights[k] * SEC_PER_CHAR)
    for k in range(last + 1, n):
        out[k] = min(duration, out[k - 1] + weights[k - 1] * SEC_PER_CHAR)
    unsung = set()
    for a, b in zip(known, known[1:]):
        if b - a < 2:
            continue
        lo, hi = out[a] + BREAK_MARGIN, out[b] - 0.5
        if b - a - 1 >= MIN_UNSUNG_RUN and not any(lo < s < hi for s in heard_starts):
            unsung.update(range(a + 1, b))
            continue
        span = out[b] - out[a]
        total = sum(weights[a:b])
        acc = 0.0
        for k in range(a + 1, b):
            acc += weights[k - 1]
            out[k] = out[a] + span * (acc / total if total else (k - a) / (b - a))
    prev = None
    for k in range(n):
        if k in unsung:
            continue
        if prev is not None and out[k] <= prev:
            out[k] = prev + 0.1
        prev = out[k]
    for k in unsung:
        nxt = next(j for j in range(k + 1, n) if j not in unsung)
        out[k] = out[nxt]
    return [round(v, 2) for v in out], unsung


def word_times(n, heard, start, end):
    """A start per word of one anchored line with `n` words: `heard` words
    [(index, time)] keep their time (one that runs backwards is dropped), the
    words before the first are spread from the line's start, the ones between
    two heard words are spread between them, and the tail runs at LEAD_IN per
    word up to the next line's start."""
    kept = []
    for idx, t in sorted(heard):
        if not kept or t >= kept[-1][1]:
            kept.append((idx, t))
    times = [None] * n
    for idx, t in kept:
        times[idx] = max(start, t)
    first = kept[0][0]
    for k in range(first):
        times[k] = start + (times[first] - start) * k / first
    for (a, ta), (b, tb) in zip(kept, kept[1:]):
        for k in range(a + 1, b):
            times[k] = times[a] + (times[b] - times[a]) * (k - a) / (b - a)
    for k in range(kept[-1][0] + 1, n):
        times[k] = min(end, times[k - 1] + LEAD_IN)
    out, prev = [], start - 0.05
    for t in times:
        t = max(t, prev + 0.05)
        out.append(round(t, 2))
        prev = t
    return out


def time_song(stanzas, asr):
    """(timing, anchors, sung line count) for one song against one transcript."""
    words = asr["words"]
    heard = [(norm(w["word"]), w["start"]) for w in words]
    heard = [(t, s) for t, s in heard if t]
    asr_tokens = [t for t, _ in heard]
    starts = [s for _, s in heard]

    # A lyric token remembers its index among the line's alignable tokens
    # (for the anchor lead-in) and among its whitespace-split words (so word
    # times line up with what the reader splits on).
    lyric_tokens, owner, pos, word_pos, per_line, word_count = [], [], [], [], {}, {}
    for si, lines in enumerate(stanzas):
        for li, line in enumerate(lines):
            if is_label(line):
                continue
            raw = line.split()
            word_count[(si, li)] = len(raw)
            toks = [(k, t) for k, t in ((k, norm(x)) for k, x in enumerate(raw)) if t]
            per_line[(si, li)] = len(toks)
            for idx, (k, t) in enumerate(toks):
                lyric_tokens.append(t)
                owner.append((si, li))
                pos.append(idx)
                word_pos.append(k)
    mapping = align(lyric_tokens, asr_tokens)

    hits = {}
    for tok_idx, mp in enumerate(mapping):
        if mp is not None:
            hits.setdefault(owner[tok_idx], []).append((pos[tok_idx], word_pos[tok_idx], starts[mp]))
    anchors, heard_words = {}, {}
    for key, found in hits.items():
        if len(found) < max(1, math.ceil(per_line[key] / 2)):
            continue
        # Whisper stretches a word over a preceding pause; skip a first word
        # that sits far ahead of the next heard word of the same line.
        k = 0
        while k + 1 < len(found) and found[k + 1][2] - found[k][2] > MAX_WORD_GAP:
            k += 1
        idx, _, t = found[k]
        anchors[key] = max(0.0, t - LEAD_IN * idx)
        heard_words[key] = [(w, t) for _, w, t in found[k:]]

    flat_keys = [(si, li) for si, lines in enumerate(stanzas) for li, line in enumerate(lines) if not is_label(line)]
    weights = [len(stanzas[si][li]) for si, li in flat_keys]
    flat, unsung_idx = spread([anchors.get(k) for k in flat_keys], weights, asr["duration"], starts)
    line_time = dict(zip(flat_keys, flat))
    unsung = {flat_keys[k] for k in unsung_idx}
    next_start = {k: flat[i + 1] if i + 1 < len(flat) else asr["duration"] for i, k in enumerate(flat_keys)}
    words_out = [
        [
            word_times(word_count[(si, li)], heard_words[(si, li)], line_time[(si, li)], next_start[(si, li)])
            if (si, li) in heard_words
            else None
            for li in range(len(lines))
        ]
        for si, lines in enumerate(stanzas)
    ]

    stanza_out = []
    for si, lines in enumerate(stanzas):
        sung = [line_time[(si, li)] for li, line in enumerate(lines) if not is_label(line)]
        start = min(sung) if sung else (stanza_out[-1] + 0.1 if stanza_out else 0.0)
        stanza_out.append(round(start, 2))
    # A label takes the time of the next sung line (or the next stanza), so
    # the reader never treats it as the line being sung.
    lines_out = []
    for si, lines in enumerate(stanzas):
        after = stanza_out[si + 1] if si + 1 < len(stanza_out) else asr["duration"]
        times = []
        for li in range(len(lines) - 1, -1, -1):
            if not is_label(lines[li]):
                after = line_time[(si, li)]
            times.append(round(after, 2))
        lines_out.append(times[::-1])
    return {"stanzas": stanza_out, "lines": lines_out, "words": words_out}, anchors, unsung, len(flat_keys)


def best_pass(song_id, stanzas):
    """(timing, anchors, unsung, line count, pass name, transcript) from the
    pass that anchors the most lines."""
    best = None
    for d in sorted(HERE.glob("asr*")):
        path = d / f"{song_id}.json"
        if not path.exists():
            continue
        asr = json.loads(path.read_text(encoding="utf-8"))
        timing, anchors, unsung, n = time_song(stanzas, asr)
        if best is None or len(anchors) > len(best[1]):
            best = (timing, anchors, unsung, n, d.name, asr)
    return best


def dump_timing(timing):
    """timing.json with the numbers of one stanza on one line, so a time can
    still be found and hand-edited."""

    def row(value):
        return json.dumps(value, separators=(", ", ": "))

    out = ["{"]
    for n, (song_id, t) in enumerate(timing.items()):
        out.append(f' "{song_id}": {{')
        out.append(f'  "stanzas": {row(t["stanzas"])},')
        keys = [k for k in ("lines", "words") if k in t]
        for m, k in enumerate(keys):
            out.append(f'  "{k}": [')
            for i, r in enumerate(t[k]):
                out.append(f"   {row(r)}" + ("," if i + 1 < len(t[k]) else ""))
            out.append("  ]" + ("," if m + 1 < len(keys) else ""))
        out.append(" }" + ("," if n + 1 < len(timing) else ""))
    out.append("}")
    return "\n".join(out) + "\n"


def main():
    only = sys.argv[1:]
    timing = json.loads(TIMING_JSON.read_text(encoding="utf-8")) if TIMING_JSON.exists() else {}
    for song_id, song in load_songs().items():
        if only and song_id not in only:
            continue
        if not song["lyrics"]:
            print(song_id, "skipped (no lyrics)")
            continue
        found = best_pass(song_id, song["lyrics"])
        if not found:
            print(song_id, "skipped (no transcript)")
            continue
        result, anchors, unsung, n, pass_name, asr = found
        timing[song_id] = result
        skipped = f", {len(unsung)} unsung" if unsung else ""
        print(
            f"{song_id}: {len(anchors)}/{n} lines anchored ({100 * len(anchors) / n:.0f}%) via {pass_name}{skipped}, "
            f"first stanza at {result['stanzas'][0]}s, last at {result['stanzas'][-1]}s of {asr['duration']:.0f}s"
        )
    TIMING_JSON.write_text(dump_timing(timing), encoding="utf-8")


if __name__ == "__main__":
    main()
