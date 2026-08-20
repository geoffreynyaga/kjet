"""Shared helpers for the evolving human-results CSV layout."""

import csv


APP_ID_COLUMN = "Application ID"
COUNTY_COLUMN = "E2. County Mapping"


class HumanCsvSchemaError(ValueError):
    pass


def normalize_header(value):
    return " ".join(str(value or "").split()).casefold()


def find_header_index(records):
    """Find leaf headers in both banner-prefixed and header-first exports."""
    app_id = normalize_header(APP_ID_COLUMN)
    county = normalize_header(COUNTY_COLUMN)
    for index, row in enumerate(records):
        normalized = {normalize_header(cell) for cell in row if cell}
        if app_id in normalized and county in normalized:
            return index
    raise HumanCsvSchemaError(
        "Could not find a header record containing 'Application ID' and "
        "'E2. County Mapping'."
    )


def read_records(path):
    with open(path, newline="", encoding="utf-8-sig", errors="replace") as handle:
        records = list(csv.reader(handle))
    header_index = find_header_index(records)
    return records, header_index


def column_index(header, name, required=True):
    wanted = normalize_header(name)
    for index, value in enumerate(header):
        if normalize_header(value) == wanted:
            return index
    if required:
        raise HumanCsvSchemaError(f"Required column {name!r} is missing.")
    return None


def cell(row, index):
    if index is None or index >= len(row):
        return ""
    return (row[index] or "").strip()
