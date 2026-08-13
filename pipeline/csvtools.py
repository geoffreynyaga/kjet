"""Parsing, structural fingerprinting and row diffing of the human results CSV.

The file has a two-level header: record 0 is a banner row of merged group
headings, record 1 holds the leaf column names, and data starts at record 2.
Both rows contain cells with embedded newlines, so it must always be read with a
real CSV parser rather than by splitting on lines.

Leaf names are not unique -- "Logic" appears five times, "A3.1".."A3.6" appear
three times each, and one heading was overwritten with rubric prose. Downstream,
scripts/compare_old_and_new/extract_comparison_data.py therefore reads scores by
fixed position (row[8]..row[20]) and skips the header by counting seven physical
lines. A column inserted upstream keeps every name resolvable while silently
shifting those positions, so the fingerprint below compares names *by index* and
pins the header's physical-line span.
"""

import csv
import hashlib
import io

HEADER_RECORD_INDEX = 1
DATA_START_INDEX = 2

APP_ID_COLUMN = "Application ID"
COUNTY_COLUMN = "E2. County Mapping"

# Columns extract_comparison_data.py reads positionally. Highlighted in the diff
# because a change here moves a published score.
SCORE_COLUMN_RANGE = range(8, 21)


class CsvStructureError(Exception):
    """The CSV cannot be parsed into the expected two-level header shape."""


def decode(raw):
    """Decode uploaded bytes, tolerating the odd non-UTF8 byte."""
    if isinstance(raw, str):
        return raw
    return raw.decode("utf-8", errors="replace")


def read_records(raw):
    """Parse into CSV records (not physical lines)."""
    text = decode(raw)
    records = list(csv.reader(io.StringIO(text)))
    if len(records) <= DATA_START_INDEX:
        raise CsvStructureError(
            f"Expected a banner row, a header row and at least one data row; "
            f"found {len(records)} record(s)."
        )
    return records


def header_line_span(records):
    """Physical lines occupied by the banner record.

    extract_comparison_data.py advances the file by exactly this many lines
    before reading the header, so a change here breaks it silently.
    """
    return 1 + sum(cell.count("\n") for cell in records[0])


def sha256(raw):
    if isinstance(raw, str):
        raw = raw.encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def fingerprint(records):
    """Structural signature compared against the last published version."""
    return {
        "column_count": len(records[HEADER_RECORD_INDEX]),
        "banner": list(records[0]),
        "header": list(records[HEADER_RECORD_INDEX]),
        "header_line_span": header_line_span(records),
    }


def compare_fingerprints(expected, actual):
    """Return a list of human-readable structural differences (empty if identical)."""
    problems = []

    if expected.get("column_count") != actual.get("column_count"):
        problems.append(
            {
                "kind": "column_count",
                "message": (
                    f"Column count changed from {expected.get('column_count')} "
                    f"to {actual.get('column_count')}."
                ),
            }
        )

    if expected.get("header_line_span") != actual.get("header_line_span"):
        problems.append(
            {
                "kind": "header_line_span",
                "message": (
                    f"The header block now spans {actual.get('header_line_span')} "
                    f"physical lines instead of {expected.get('header_line_span')}. "
                    f"extract_comparison_data.py skips a fixed number of lines, so it "
                    f"would read the wrong row."
                ),
            }
        )

    for key, label in (("header", "Column"), ("banner", "Banner cell")):
        old = expected.get(key) or []
        new = actual.get(key) or []
        for index in range(max(len(old), len(new))):
            old_value = old[index] if index < len(old) else None
            new_value = new[index] if index < len(new) else None
            if old_value != new_value:
                problems.append(
                    {
                        "kind": key,
                        "index": index,
                        "old": old_value,
                        "new": new_value,
                        "scored": key == "header" and index in SCORE_COLUMN_RANGE,
                        "message": (
                            f"{label} {index} changed from {old_value!r} to {new_value!r}."
                        ),
                    }
                )

    return problems


def _column_index(header, name, default):
    try:
        return header.index(name)
    except ValueError:
        return default


def summarise(records):
    header = records[HEADER_RECORD_INDEX]
    return {
        "column_count": len(header),
        "row_count": max(len(records) - DATA_START_INDEX, 0),
    }


def diff_rows(old_records, new_records):
    """Row-level diff keyed on Application ID.

    Assumes both sides share a structure (callers block on a fingerprint
    mismatch first), so column indices are taken from the new header.
    """
    header = new_records[HEADER_RECORD_INDEX]
    id_index = _column_index(header, APP_ID_COLUMN, 1)
    county_index = _column_index(header, COUNTY_COLUMN, 3)

    def index_rows(records):
        rows = {}
        for row in records[DATA_START_INDEX:]:
            if len(row) <= id_index:
                continue
            key = (row[id_index] or "").strip()
            if key:
                rows[key] = row
        return rows

    old_rows = index_rows(old_records) if old_records else {}
    new_rows = index_rows(new_records)

    def county_of(row):
        return (row[county_index] or "").strip() if len(row) > county_index else ""

    added = [
        {"application_id": key, "county": county_of(row)}
        for key, row in new_rows.items()
        if key not in old_rows
    ]
    removed = [
        {"application_id": key, "county": county_of(row)}
        for key, row in old_rows.items()
        if key not in new_rows
    ]

    changed = []
    unchanged = 0
    for key, new_row in new_rows.items():
        old_row = old_rows.get(key)
        if old_row is None:
            continue
        cells = []
        for index in range(max(len(old_row), len(new_row))):
            old_value = old_row[index] if index < len(old_row) else ""
            new_value = new_row[index] if index < len(new_row) else ""
            if old_value != new_value:
                cells.append(
                    {
                        "index": index,
                        "column": header[index] if index < len(header) else f"col{index}",
                        "old": old_value,
                        "new": new_value,
                        "scored": index in SCORE_COLUMN_RANGE,
                    }
                )
        if cells:
            changed.append(
                {
                    "application_id": key,
                    "county": county_of(new_row),
                    "cells": cells,
                }
            )
        else:
            unchanged += 1

    changed.sort(key=lambda entry: (entry["county"], entry["application_id"]))

    return {
        "added": sorted(added, key=lambda e: (e["county"], e["application_id"])),
        "removed": sorted(removed, key=lambda e: (e["county"], e["application_id"])),
        "changed": changed,
        "unchanged_count": unchanged,
        "totals": {
            "added": len(added),
            "removed": len(removed),
            "changed": len(changed),
            "unchanged": unchanged,
            "scored_cells_changed": sum(
                1 for entry in changed for cell in entry["cells"] if cell["scored"]
            ),
        },
    }
