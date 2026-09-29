"""Per-line timing report for one song: anchored (A), spread (~), unsung (-)
and label (L) lines with the words Whisper heard around each line start. Use
it to spot a line that lights early or late before hand-editing timing.json.

usage: python scripts/timing/report.py <id>
"""

import sys

from align import best_pass
from songs import is_label, load_songs

song_id = sys.argv[1]
stanzas = load_songs()[song_id]["lyrics"]
result, anchors, unsung, n, pass_name, asr = best_pass(song_id, stanzas)
words = asr["words"]
print(f"{song_id}: {len(anchors)}/{n} lines anchored via {pass_name}, {len(unsung)} unsung")


def heard(t, span=2.5):
    return " ".join(w["word"] for w in words if t - 0.3 <= w["start"] <= t + span)


for si, lines in enumerate(stanzas):
    print(f"-- stanza {si} @ {result['stanzas'][si]}")
    for li, line in enumerate(lines):
        t = result["lines"][si][li]
        key = (si, li)
        flag = "L" if is_label(line) else "A" if key in anchors else "-" if key in unsung else "~"
        print(f"  {flag} {t:7.2f}  {line[:44]:44}  | {heard(t)[:50]}")
