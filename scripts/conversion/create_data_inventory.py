#!/usr/bin/env python3
"""Build the per-cohort document inventory consumed by the dashboard."""

import argparse
import json
from pathlib import Path
from urllib.parse import quote, urlencode


def extract_application_id(folder_name):
    """Return the applicant ID encoded in an application directory name."""
    prefix = "application_"
    if not folder_name.casefold().startswith(prefix):
        return None

    application_id = folder_name[len(prefix) :]
    folded = application_id.casefold()
    marker_positions = [
        folded.find(marker)
        for marker in ("_with_attachments", "_bundle")
        if marker in folded
    ]
    if marker_positions:
        application_id = application_id[: min(marker_positions)]
    return application_id or None


def document_url(application_id, document_path, cohort):
    encoded_application = quote(f"Applicant_{application_id}", safe="")
    encoded_path = quote(document_path.as_posix(), safe="/")
    query = urlencode({"cohort": cohort})
    return (
        f"/api/pipeline/applications/{encoded_application}/documents/"
        f"{encoded_path}/?{query}"
    )


def build_file_tree(data_dir, cohort):
    """Build an inventory from one cohort directory."""
    data_dir = Path(data_dir)
    if not data_dir.is_dir():
        raise FileNotFoundError(f"Cohort data directory does not exist: {data_dir}")

    inventory = {}
    for county_dir in sorted(data_dir.iterdir()):
        if not county_dir.is_dir() or county_dir.name.startswith("."):
            continue

        for application_dir in sorted(county_dir.iterdir()):
            if not application_dir.is_dir() or application_dir.name.startswith("."):
                continue

            application_id = extract_application_id(application_dir.name)
            if not application_id:
                continue

            files = []
            for file_path in sorted(application_dir.rglob("*")):
                relative_to_application = file_path.relative_to(application_dir)
                if not file_path.is_file() or any(
                    part.startswith(".") for part in relative_to_application.parts
                ):
                    continue

                document_path = file_path.relative_to(data_dir)
                files.append(
                    {
                        "filename": relative_to_application.as_posix(),
                        "absolute_path": "",
                        "s3_url": document_url(application_id, document_path, cohort),
                    }
                )

            if files:
                inventory.setdefault(application_id, {"files": []})["files"].extend(files)

    return dict(sorted(inventory.items(), key=lambda item: item[0].casefold()))


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cohort", default="latest")
    parser.add_argument("--data-dir", type=Path)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main():
    args = parse_args()
    data_dir = args.data_dir or Path("data") / args.cohort
    output = (
        args.output
        or Path("ui") / "public" / args.cohort / "data_file_inventory.json"
    )

    inventory = build_file_tree(data_dir, args.cohort)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(inventory, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    total_files = sum(len(entry["files"]) for entry in inventory.values())
    print(
        f"Created {output} with {len(inventory)} applications "
        f"and {total_files} files."
    )


if __name__ == "__main__":
    main()
