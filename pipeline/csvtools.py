"""Parsing, validation, structural fingerprinting, and row diffing for human CSVs.

Human-results exports exist in two layouts: older files have a banner record
before the leaf headers, while newer exports start directly with the leaf
headers. Column positions also change as fields such as ``Equity Points`` are
added. Everything in this module therefore discovers the header record and
matches meaningful columns by normalized name.
"""

import csv
import hashlib
import io
from collections import Counter


APP_ID_COLUMN = "Application ID"
COUNTY_COLUMN = "E2. County Mapping"

REQUIRED_COLUMNS = [
    "Link to application bundle",
    APP_ID_COLUMN,
    COUNTY_COLUMN,
    "E3. Priority Value Chain",
    "REASON(Evaluators Comments)",
    "A3.1 Registration & Track Record",
    "A3.2 Financial Position",
    "A3.3 Market Demand & Competitiveness",
    "A3.4 Business Proposal / Growth Viability",
    "A3.5 Value Chain Alignment & Role",
    "A3.6 Inclusivity & Sustainability",
    "TOTAL",
    "Penalty Points",
    "Sum of weighted scores - Penalty(if any)",
    "Ranking from composite score",
]


def normalise_header(value):
    """Headers differ cosmetically between sheets; compare them insensitively."""
    if value is None:
        return None
    return " ".join(str(value).split()).casefold()


class CsvStructureError(Exception):
    """The CSV cannot be parsed into a supported human-results shape."""


def decode(raw):
    """Decode uploaded bytes, tolerating the odd non-UTF8 byte and a BOM."""
    if isinstance(raw, str):
        return raw.lstrip("\ufeff")
    return raw.decode("utf-8-sig", errors="replace")


def find_header_index(records):
    """Return the CSV-record index containing the leaf column headings."""
    app_id = normalise_header(APP_ID_COLUMN)
    county = normalise_header(COUNTY_COLUMN)
    for index, row in enumerate(records):
        normalized = {normalise_header(cell) for cell in row if cell}
        if app_id in normalized and county in normalized:
            return index
    raise CsvStructureError(
        "Could not find a header record containing 'Application ID' and "
        "'E2. County Mapping'."
    )


def read_records(raw):
    """Parse into CSV records (not physical lines) and verify a data row exists."""
    records = list(csv.reader(io.StringIO(decode(raw))))
    header_index = find_header_index(records)
    if len(records) <= header_index + 1:
        raise CsvStructureError(
            "Expected at least one data record after the human-results header."
        )
    return records


def header_and_data_start(records):
    """Return ``(header, first_data_record_index)`` for either CSV layout."""
    header_index = find_header_index(records)
    return records[header_index], header_index + 1


def header_line_span(records):
    """Return the physical line number on which the leaf header ends.

    Retained in fingerprints for diagnostics and compatibility with fingerprints
    already stored in the database. Pipeline readers no longer depend on this
    value.
    """
    header_index = find_header_index(records)
    return sum(
        1 + sum(cell.count("\n") for cell in row)
        for row in records[: header_index + 1]
    )


def sha256(raw):
    if isinstance(raw, str):
        raw = raw.encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def fingerprint(records):
    """Store enough structure to validate and diff this version later."""
    header_index = find_header_index(records)
    header = records[header_index]
    return {
        "schema_version": 2,
        "column_count": len(header),
        "header_record_index": header_index,
        "header": list(header),
        "header_line_span": header_line_span(records),
    }


def _fingerprint_header(value):
    return list((value or {}).get("header") or [])


def compare_fingerprints(expected, actual):
    """Return incompatible structural changes in ``actual``.

    A banner being removed or a named column moving is safe now that every
    consumer resolves fields by name. Missing or duplicated load-bearing
    columns remain blocking errors. ``Equity Points`` is optional so Cohort 1's
    established schema continues to work.
    """
    del expected  # Kept in the signature for callers and stored-version checks.
    header = _fingerprint_header(actual)
    normalized = [normalise_header(cell) for cell in header]
    counts = Counter(normalized)
    problems = []

    for name in REQUIRED_COLUMNS:
        key = normalise_header(name)
        count = counts[key]
        if count == 0:
            problems.append(
                {
                    "kind": "missing_column",
                    "old": name,
                    "new": None,
                    "scored": True,
                    "message": f"Column {name!r} is missing.",
                }
            )
        elif count > 1:
            problems.append(
                {
                    "kind": "duplicate_column",
                    "old": name,
                    "new": name,
                    "scored": True,
                    "message": f"Column {name!r} appears {count} times.",
                }
            )

    return problems


def _column_index(header, name, default=None):
    key = normalise_header(name)
    for index, value in enumerate(header):
        if normalise_header(value) == key:
            return index
    return default


def summarise(records):
    header, data_start = header_and_data_start(records)
    id_index = _column_index(header, APP_ID_COLUMN, 1)
    return {
        "column_count": len(header),
        "row_count": sum(
            1
            for row in records[data_start:]
            if len(row) > id_index and (row[id_index] or "").strip()
        ),
    }


def _column_keys(header):
    """Give duplicate headings stable occurrence keys (Logic #1, Logic #2...)."""
    occurrences = Counter()
    keys = []
    for value in header:
        normalized = normalise_header(value)
        if not normalized:
            keys.append(None)
            continue
        occurrences[normalized] += 1
        keys.append((normalized, occurrences[normalized]))
    return keys


def _is_scored_column(label):
    normalized = normalise_header(label) or ""
    return (
        normalized.startswith("a3.")
        or normalized == "logic"
        or normalized
        in {
            normalise_header("REASON(Evaluators Comments)"),
            normalise_header("TOTAL"),
            normalise_header("Equity Points"),
            normalise_header("Penalty Points"),
            normalise_header("Sum of weighted scores - Penalty(if any)"),
            normalise_header("Ranking from composite score"),
        }
    )


def diff_rows(old_records, new_records):
    """Return a semantic row diff keyed on Application ID.

    Each CSV uses its own discovered header and column map. Consequently an
    inserted column is reported only for rows where that new field has a value;
    it does not make every following cell look changed.
    """
    new_header, new_data_start = header_and_data_start(new_records)
    old_header, old_data_start = (
        header_and_data_start(old_records) if old_records else ([], 0)
    )

    new_id_index = _column_index(new_header, APP_ID_COLUMN, 1)
    new_county_index = _column_index(new_header, COUNTY_COLUMN, 3)
    old_id_index = _column_index(old_header, APP_ID_COLUMN, 1)
    old_county_index = _column_index(old_header, COUNTY_COLUMN, 3)

    def index_rows(records, data_start, id_index):
        rows = {}
        for row in records[data_start:]:
            if len(row) <= id_index:
                continue
            key = (row[id_index] or "").strip()
            if key:
                rows[key] = row
        return rows

    old_rows = (
        index_rows(old_records, old_data_start, old_id_index) if old_records else {}
    )
    new_rows = index_rows(new_records, new_data_start, new_id_index)

    def county_of(row, index):
        return (row[index] or "").strip() if len(row) > index else ""

    added = [
        {"application_id": key, "county": county_of(row, new_county_index)}
        for key, row in new_rows.items()
        if key not in old_rows
    ]
    removed = [
        {"application_id": key, "county": county_of(row, old_county_index)}
        for key, row in old_rows.items()
        if key not in new_rows
    ]

    old_keys = _column_keys(old_header)
    new_keys = _column_keys(new_header)
    old_index_by_key = {key: index for index, key in enumerate(old_keys) if key}
    new_index_by_key = {key: index for index, key in enumerate(new_keys) if key}
    ordered_keys = [key for key in new_keys if key]
    ordered_keys.extend(key for key in old_keys if key and key not in new_index_by_key)

    changed = []
    unchanged = 0
    for key, new_row in new_rows.items():
        old_row = old_rows.get(key)
        if old_row is None:
            continue
        cells = []
        for column_key in ordered_keys:
            old_index = old_index_by_key.get(column_key)
            new_index = new_index_by_key.get(column_key)
            old_value = (
                old_row[old_index]
                if old_index is not None and old_index < len(old_row)
                else ""
            )
            new_value = (
                new_row[new_index]
                if new_index is not None and new_index < len(new_row)
                else ""
            )
            if old_value == new_value:
                continue
            index = new_index if new_index is not None else old_index
            label = (
                new_header[new_index]
                if new_index is not None
                else old_header[old_index]
            )
            cells.append(
                {
                    "index": index,
                    "column": label,
                    "old": old_value,
                    "new": new_value,
                    "scored": _is_scored_column(label),
                }
            )
        if cells:
            changed.append(
                {
                    "application_id": key,
                    "county": county_of(new_row, new_county_index),
                    "cells": cells,
                }
            )
        else:
            unchanged += 1

    changed.sort(key=lambda entry: (entry["county"], entry["application_id"]))

    return {
        "added": sorted(
            added, key=lambda entry: (entry["county"], entry["application_id"])
        ),
        "removed": sorted(
            removed, key=lambda entry: (entry["county"], entry["application_id"])
        ),
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
