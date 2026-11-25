"""Self-check for refine.py's rules, no audio or torch needed.

usage: python3 scripts/timing/refine_check.py
"""

import copy
import json

import refine_apply as ra
from align import dump_timing
from songs import TIMING_JSON, load_songs

STANZAS = [["[Verse]", "one two three", "four five"], ["six seven", "[Outro]"], ["eight — nine"]]
ENTRY = {
    "stanzas": [10.0, 20.0, 30.0],
    "lines": [[10.0, 10.0, 14.0], [20.0, 30.0], [30.0]],
    "words": [[None, [10.0, 11.0, 12.0], None], [[20.0, 21.0], None], [[30.0, 30.0, 31.0]]],
}


def line(s, l, old, new, words, score=0.9, check=None, end=None):
    return {
        "s": s, "l": l, "old": old, "new": new, "raw": new, "check": new if check is None else check,
        "end": words[-1] + 0.5 if end is None else end, "score": score, "chars": 9, "words": words, "had_words": True, "rise": 0.0,
    }  # fmt: skip


def proposal():
    return {
        "id": "t",
        "lines": [
            line(0, 1, 10.0, 10.8, [10.8, 11.4, 12.2]),
            line(0, 2, 14.0, 14.1, [14.1, 15.0]),
            line(1, 0, 20.0, 21.0, [21.0, 22.0]),
            line(2, 0, 30.0, 30.9, [30.9, 30.9, 31.6]),
        ],
    }


def verdicts(p, **kw):
    return [x["verdict"] for x in ra.decide(p, **kw)["lines"]]


def main():
    assert ra.word_tokens("L’espoir") == "l'espoir" and ra.word_tokens("Été,") == "ete"
    assert ra.word_tokens("—") == "" and ra.word_tokens("24/7") == "*" and ra.word_tokens("cœur!") == "coeur"

    p = proposal()
    assert verdicts(p) == ["apply", "keep", "apply", "apply"]
    out = ra.merge(ENTRY, STANZAS, p)
    assert out["lines"] == [[10.8, 10.8, 14.0], [21.0, 30.9], [30.9]], out["lines"]
    assert out["stanzas"] == [10.8, 21.0, 30.9]
    assert out["words"][0] == [None, [10.8, 11.4, 12.2], None] and out["words"][2] == [[30.9, 30.9, 31.6]]
    assert ENTRY["lines"][0][1] == 10.0, "merge must not edit its input"
    assert ra.merge(out, STANZAS, p) == out, "merge is idempotent"

    low = proposal()
    low["lines"][0]["score"] = 0.2
    assert verdicts(low)[0] == "review"
    split = proposal()
    split["lines"][0]["check"] = 12.0
    assert verdicts(split)[0] == "review"
    late = proposal()
    late["lines"][0].update(new=14.5, raw=14.5, check=14.5, words=[14.5, 15.0, 15.5])
    assert verdicts(late)[0] == "review", "a line may not pass the next line's start"
    early = proposal()
    early["lines"][2].update(new=13.0, raw=13.0, check=13.0, words=[13.0, 13.5])
    assert verdicts(early)[2] == "review", "a line may not start before the previous one"
    solo = proposal()
    solo["lines"][0]["check"] = None
    assert verdicts(solo)[0] == "review", "one model alone never writes"
    quiet = proposal()
    quiet["lines"][0].update(score=0.35, rise=20.0)
    assert verdicts(quiet)[0] == "apply", "a line coming in from quiet may score lower"
    big = proposal()
    big["lines"][3].update(new=33.0, raw=33.0, check=33.0, words=[33.0, 33.0, 33.5], score=0.5)
    assert verdicts(big)[3] == "review", "a large move needs a high score"
    squeezed = proposal()
    squeezed["lines"][0]["end"] = 10.9
    assert verdicts(squeezed)[0] == "review"
    assert verdicts(proposal(), locked={(0, 1)})[0] == "locked"
    assert ra.is_locked("t", {"stanzas": [], "lines": []}, {}, 0, 1), "an entry without words is hand-timed"
    assert ra.is_locked("t", ENTRY, {"t": {(0, 1)}}, 0, 1) and not ra.is_locked("t", ENTRY, {"t": {(0, 1)}}, 0, 2)

    bad = proposal()
    bad["lines"][0]["words"] = [10.8, 11.4]
    ra.decide(bad)
    try:
        ra.merge(ENTRY, STANZAS, bad)
        raise SystemExit("merge accepted a wrong word count")
    except AssertionError:
        pass

    # The real file: the layout round-trips and every entry has the shape.
    text = TIMING_JSON.read_text(encoding="utf-8")
    timing = json.loads(text)
    assert dump_timing(timing) == text, "timing.json is not in dump_timing's layout"
    songs = load_songs()
    for song_id, entry in timing.items():
        if "words" in entry and songs.get(song_id, {}).get("lyrics"):
            ra.check_entry(copy.deepcopy(entry), songs[song_id]["lyrics"])
    print("refine_check: ok")


if __name__ == "__main__":
    main()
