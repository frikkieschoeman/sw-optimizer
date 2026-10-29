"""Dump reference/verdict.py's per-rune verdicts: python3 -I scripts/dump-verdict-py.py export.json out.json"""
import sys, json, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'reference'))
from verdict import *
d, runes = load(sys.argv[1])
out = {}
for r in runes:
    role, v, why = judge(r)
    out[r['rune_id']] = {'verdict': v, 'role': role, 'reason': why, 'inv': r['_loc'] == 'Inventory'}
json.dump(out, open(sys.argv[2], 'w'))
