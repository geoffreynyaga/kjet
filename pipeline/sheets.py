"""Fetches the human results CSV from an open Google Sheet."""

import re

import requests

SHEET_ID_RE = re.compile(r"/spreadsheets/d/([a-zA-Z0-9-_]+)")
GID_RE = re.compile(r"[#&?]gid=([0-9]+)")

FETCH_TIMEOUT = 60


class SheetFetchError(Exception):
    pass


def export_url(url):
    """Turn any Google Sheets URL into its CSV export URL."""
    match = SHEET_ID_RE.search(url or "")
    if not match:
        raise SheetFetchError(
            "That does not look like a Google Sheets URL. Expected a link "
            "containing /spreadsheets/d/<id>."
        )
    sheet_id = match.group(1)
    gid_match = GID_RE.search(url)
    gid = gid_match.group(1) if gid_match else "0"
    return (
        f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    )


def fetch_csv(url):
    """Download the sheet as CSV bytes.

    A sheet whose link sharing has been tightened returns a sign-in *page* with
    HTTP 200, so the response body is checked rather than the status alone.
    """
    target = export_url(url)
    try:
        response = requests.get(target, timeout=FETCH_TIMEOUT)
    except requests.RequestException as exc:
        raise SheetFetchError(f"Could not reach Google Sheets: {exc}") from exc

    if response.status_code != 200:
        raise SheetFetchError(
            f"Google Sheets returned HTTP {response.status_code}. Check the sheet "
            f"exists and is shared with anyone holding the link."
        )

    content_type = (response.headers.get("content-type") or "").lower()
    body = response.content

    if "text/html" in content_type or body[:512].lstrip().lower().startswith(b"<!doctype html"):
        raise SheetFetchError(
            "Google returned a sign-in page instead of CSV data. The sheet is no "
            "longer shared publicly -- set link sharing to 'Anyone with the link' "
            "and try again."
        )

    if not body.strip():
        raise SheetFetchError("The sheet exported an empty file.")

    return body, target
