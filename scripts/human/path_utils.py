import os


def resolve_csv_path(base_dir: str, cohort: str, explicit_path: str | None, preferred_files: list[str], fallback_file: str) -> str | None:
    if explicit_path:
        explicit_abs = explicit_path if os.path.isabs(explicit_path) else os.path.join(base_dir, explicit_path)
        if os.path.exists(explicit_abs):
            return explicit_abs
        print(f"⚠️  Provided CSV not found: {explicit_abs}")

    if cohort == "latest":
        for rel_path in preferred_files:
            candidate = os.path.join(base_dir, rel_path)
            if os.path.exists(candidate):
                return candidate

    legacy_candidate = os.path.join(base_dir, fallback_file)
    if os.path.exists(legacy_candidate):
        return legacy_candidate

    return None
