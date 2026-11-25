"""The torch-free half of refine.py: lyric tokens for the aligner, the rules
that decide which proposed line starts are safe to write, the merge into a
timing.json entry and the report text. refine_check.py exercises it."""

import json
import re
import unicodedata

from songs import HERE, is_label

HAND_TIMED_JSON = HERE / "hand-timed.json"

MIN_DELTA = 0.25  # a line start closer than this to the proposal is left alone
MIN_SCORE = 0.45  # mean aligned-character probability a line needs to be written
BIG_MOVE = 2.0  # seconds; a move this large needs BIG_SCORE
BIG_SCORE = 0.6
QUIET_RISE = 15.0  # dB; a line that comes in from quiet this clearly...
QUIET_BONUS = 0.15  # ...may score this much lower
AGREE = 0.35  # seconds the two acoustic models may differ on a line's start
MIN_SEC_PER_CHAR = 0.02  # a line squeezed below this was not found, only placed

_FOLD = {"œ": "oe", "æ": "ae", "ß": "ss", "’": "'", "‘": "'", "`": "'"}


def word_tokens(word):
    """The aligner's characters for one whitespace-split word: a-z and the
    apostrophe, accents folded. A word with digits becomes "*" (anything);
    one with no letters becomes "" and takes its neighbour's time."""
    text = "".join(_FOLD.get(c, c) for c in word.lower())
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    if re.search(r"\d", text):
        return "*"
    return re.sub(r"[^a-z']", "", text).strip("'")


def sung_lines(stanzas):
    """[(stanza, line, text)] for every line that is not a [Label]."""
    return [(si, li, line) for si, lines in enumerate(stanzas) for li, line in enumerate(lines) if not is_label(line)]


def load_hand_timed():
    """{id: "all" | {(stanza, line), ...}} from hand-timed.json."""
    if not HAND_TIMED_JSON.exists():
        return {}
    raw = json.loads(HAND_TIMED_JSON.read_text(encoding="utf-8"))
    return {k: v if v == "all" else {tuple(x) for x in v} for k, v in raw.items() if not k.startswith("_")}


def is_locked(song_id, entry, hand_timed, si, li):
    """Hand-timed: listed in hand-timed.json, or an entry with no `words`
    (what the /time/<id> page exports)."""
    if "words" not in entry:
        return True
    marks = hand_timed.get(song_id)
    return marks == "all" or (marks is not None and (si, li) in marks)


def decide(proposal, locked=frozenset(), min_delta=MIN_DELTA, min_score=MIN_SCORE):
    """Set `verdict` (apply | keep | review | locked) and `why` on every
    proposed line. A line is applied only when it moves by at least
    min_delta, scored well, both models agree, and it stays in order
    with both neighbours, whether or not those are applied themselves."""
    lines = proposal["lines"]

    def bonus(p):
        return QUIET_BONUS if p.get("rise", 0) >= QUIET_RISE else 0.0

    for p in lines:
        p["verdict"], p["why"] = "apply", ""
        if (p["s"], p["l"]) in locked:
            p["verdict"], p["why"] = "locked", "hand-timed"
        elif p.get("new") is None:
            p["verdict"], p["why"] = "review", p.get("note") or "not aligned"
        elif abs(p["new"] - p["old"]) < min_delta:
            p["verdict"], p["why"] = "keep", "within %.2f s" % min_delta
        elif p["score"] < min_score - bonus(p):
            p["verdict"], p["why"] = "review", "low score"
        elif p["chars"] and (p["end"] - p["new"]) / p["chars"] < MIN_SEC_PER_CHAR:
            p["verdict"], p["why"] = "review", "squeezed"
        elif p.get("check") is None:
            p["verdict"], p["why"] = "review", "one model only"
        elif abs(p["check"] - p["raw"]) > AGREE:
            p["verdict"], p["why"] = "review", "models disagree"
        elif abs(p["new"] - p["old"]) >= BIG_MOVE and p["score"] < BIG_SCORE - bonus(p):
            p["verdict"], p["why"] = "review", "large move, modest score"
        elif p.get("whisper") is False:
            p["verdict"], p["why"] = "review", "Whisper heard other words there"

    def final(p):
        return p["new"] if p["verdict"] == "apply" else p["old"]

    def final_end(p):
        return p["words"][-1] if p["verdict"] == "apply" else p["old"]

    changed = True
    while changed:
        changed = False
        for k, p in enumerate(lines):
            if p["verdict"] != "apply":
                continue
            prev = lines[k - 1] if k else None
            nxt = lines[k + 1] if k + 1 < len(lines) else None
            why = ""
            if prev is not None and p["new"] < final_end(prev):
                why = "before the previous line"
            elif nxt is not None and p["words"][-1] > final(nxt):
                why = "runs into the next line"
            elif prev is not None and prev.get("new") is not None and prev["verdict"] == "review" and prev["new"] > p["new"]:
                why = "previous line unsettled"
            elif nxt is not None and nxt.get("new") is not None and nxt["verdict"] == "review" and nxt["new"] < p["new"]:
                why = "next line unsettled"
            if why:
                p["verdict"], p["why"] = "review", why
                changed = True
    return proposal


def flat_times(entry):
    return [t for row in entry["lines"] for t in row]


def merge(entry, stanzas, proposal):
    """A copy of one timing.json entry with the `apply` lines written in:
    the line start, its word starts, then the stanza starts and label lines
    that follow from them. Everything else keeps its stored number."""
    out = {
        "stanzas": list(entry["stanzas"]),
        "lines": [list(r) for r in entry["lines"]],
        "words": [[None if w is None else list(w) for w in r] for r in entry["words"]],
    }
    was_ordered = flat_times(entry) == sorted(flat_times(entry))
    touched = set()
    for p in proposal["lines"]:
        if p["verdict"] != "apply":
            continue
        si, li = p["s"], p["l"]
        line = stanzas[si][li]
        words = [round(w, 2) for w in p["words"]]
        assert not is_label(line), f"label line {si}.{li} in proposal"
        assert len(words) == len(line.split()), f"word count {si}.{li}"
        assert all(b >= a for a, b in zip(words, words[1:])), f"words run backwards {si}.{li}"
        out["lines"][si][li] = words[0]
        out["words"][si][li] = words
        touched.add(si)

    for si in sorted(touched):
        sung = [out["lines"][si][li] for li, line in enumerate(stanzas[si]) if not is_label(line)]
        out["stanzas"][si] = min(sung)
        after = None
        for li in range(len(stanzas[si]) - 1, -1, -1):
            if not is_label(stanzas[si][li]):
                after = out["lines"][si][li]
            elif after is not None:
                out["lines"][si][li] = after
    # A label after a stanza's last sung line follows the next stanza.
    for si in range(len(stanzas) - 1):
        for li in range(len(stanzas[si]) - 1, -1, -1):
            if not is_label(stanzas[si][li]):
                break
            if entry["lines"][si][li] == entry["stanzas"][si + 1]:
                out["lines"][si][li] = out["stanzas"][si + 1]

    check_entry(out, stanzas)
    if was_ordered:
        flat = flat_times(out)
        assert flat == sorted(flat), "line starts out of order after merge"
        assert out["stanzas"] == sorted(out["stanzas"]), "stanza starts out of order after merge"
    return out


def check_entry(entry, stanzas):
    """The shape tracks.test.ts expects, plus labels sharing the next line's time."""
    assert len(entry["stanzas"]) == len(entry["lines"]) == len(entry["words"]) == len(stanzas)
    for si, lines in enumerate(stanzas):
        assert len(entry["lines"][si]) == len(entry["words"][si]) == len(lines), f"stanza {si} length"
        for li, line in enumerate(lines):
            w = entry["words"][si][li]
            if is_label(line):
                assert w is None, f"label {si}.{li} timed by word"
                nxt = next((k for k in range(li + 1, len(lines)) if not is_label(lines[k])), None)
                if nxt is not None:
                    assert entry["lines"][si][li] == entry["lines"][si][nxt], f"label {si}.{li} not on the next line"
            elif w is not None:
                assert len(w) == len(line.split()), f"word count {si}.{li}"
                assert all(b >= a for a, b in zip(w, w[1:])), f"words run backwards {si}.{li}"


def summarize(proposal):
    lines = proposal["lines"]
    applied = [abs(p["new"] - p["old"]) for p in lines if p["verdict"] == "apply"]
    applied.sort()
    return {
        "lines": len(lines),
        "apply": len(applied),
        "keep": sum(p["verdict"] == "keep" for p in lines),
        "review": sum(p["verdict"] == "review" for p in lines),
        "locked": sum(p["verdict"] == "locked" for p in lines),
        "median": round(applied[len(applied) // 2], 2) if applied else 0.0,
        "max": round(applied[-1], 2) if applied else 0.0,
    }


def report(proposal, stanzas, reference=None):
    """One row per sung line: old start, proposed start, delta, score,
    verdict. `reference` (a timing entry) adds its start and the error."""
    s = summarize(proposal)
    out = [
        f"{proposal['id']}: {s['lines']} sung lines, apply {s['apply']} (median {s['median']} s, max {s['max']} s), "
        f"keep {s['keep']}, review {s['review']}, locked {s['locked']}"
    ]
    # by/other: the model whose reading was taken, and the other one's score.
    head = "  line       old      new   delta  score   agree by/other rise"
    out.append(head + ("      ref    err" if reference else "") + "  verdict")
    last = None
    for p in proposal["lines"]:
        if p["s"] != last:
            last = p["s"]
            label = stanzas[last][0] if is_label(stanzas[last][0]) else ""
            out.append(f"-- stanza {last} {label}")
        new = p.get("new")
        row = f"  {p['s']:>2}.{p['l']:<2} {p['old']:8.2f} "
        if new is None:
            row += "       -       -      -       -              "
        else:
            g = p.get("check")
            row += f"{new:8.2f} {new - p['old']:+7.2f}  {p['score']:5.2f} " + (f"{g - p['raw']:+7.2f}" if g is not None else "      -")
            other = [v[1] for name, v in p.get("models", {}).items() if name != p.get("by")]
            row += f" {p.get('by', ''):>3}" + (f"/{other[0]:.2f}" if other else "     ") + f" {p.get('rise', 0):4.0f}"
        if reference:
            ref = reference["lines"][p["s"]][p["l"]]
            row += f" {ref:8.2f} " + (f"{new - ref:+6.2f}" if new is not None else "     -")
        mark = {"apply": "APPLY ", "keep": "keep  ", "review": "review", "locked": "locked"}[p["verdict"]]
        why = f" ({p['why']})" if p["why"] and p["verdict"] != "keep" else ""
        heard = "" if p.get("had_words", True) else " [was spread]"
        out.append(f"{row}  {mark}{why}{heard}  {stanzas[p['s']][p['l']][:40]}")
    return "\n".join(out)
