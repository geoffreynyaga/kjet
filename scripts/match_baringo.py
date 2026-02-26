#!/usr/bin/env python3
import json
import re
from pathlib import Path


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def last_n_alnum(s, n=4):
    chars = [c for c in str(s) if c.isalnum()]
    return ''.join(chars[-n:]) if chars else ''


def main():
    base = Path('ui/public/latest')
    human_path = base / 'kjet-human-final.json'
    llm_path = base / 'gemini' / 'Baringo.json'

    humans = load_json(human_path)
    llm = load_json(llm_path)

    llm_apps = llm.get('applications', []) if isinstance(llm, dict) else llm
    llm_ids = [a.get('application_id', '') for a in llm_apps]

    filtered = [h for h in humans if h.get('E2. County Mapping') == 'BARINGO']

    counts = {'exact': 0, 'last4_end': 0, 'suffix_in': 0}
    matched_map = {}
    unmatched = []

    for h in filtered:
        # prefer 'Application ID' else 'Link to application bundle'
        human_id = h.get('Application ID') or h.get('Link to application bundle') or ''
        human_id = str(human_id).strip()
        if not human_id:
            unmatched.append(human_id)
            continue

        matched = False

        # 1) exact match
        for aid in llm_ids:
            if aid == human_id:
                counts['exact'] += 1
                matched_map[human_id] = ('exact', aid)
                matched = True
                break
        if matched:
            continue

        # Prepare last-4 alnum
        last4 = last_n_alnum(human_id, 4)
        if last4:
            # 2) numeric ID match: last 4 of application_id equals last4
            found = None
            for aid in llm_ids:
                if len(aid) >= 4 and aid[-4:] == last4:
                    counts['last4_end'] += 1
                    matched_map[human_id] = ('last4_end', aid)
                    found = aid
                    matched = True
                    break
            if matched:
                continue

            # 3) suffix fallback: last4 appears anywhere in application_id
            for aid in llm_ids:
                if last4 in aid:
                    counts['suffix_in'] += 1
                    matched_map[human_id] = ('suffix_in', aid)
                    matched = True
                    break

        if not matched:
            unmatched.append(human_id)

    # Print results
    print(f"Exact matches: {counts['exact']}")
    print(f"Last-4-end matches: {counts['last4_end']}")
    print(f"Suffix-in matches: {counts['suffix_in']}")
    print("")
    print(f"Unmatched human IDs ({len(unmatched)}):")
    for uid in unmatched:
        print(uid)


if __name__ == '__main__':
    main()
