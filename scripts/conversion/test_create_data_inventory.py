from scripts.conversion.create_data_inventory import build_file_tree


def test_builds_a_cohort_inventory_for_numeric_and_kjet_ids(tmp_path):
    data_dir = tmp_path / "data" / "latest"
    numeric = data_dir / "Busia" / "application_158_bundle"
    kjet = (
        data_dir
        / "Nyeri"
        / "application_KJET-20251228233053-AUX6_with_attachments_2026-01-14"
    )
    numeric.mkdir(parents=True)
    kjet.mkdir(parents=True)
    (numeric / "registration.pdf").write_bytes(b"pdf")
    (kjet / "supporting docs").mkdir()
    (kjet / "supporting docs" / "bank statement.pdf").write_bytes(b"pdf")
    (kjet / ".hidden.pdf").write_bytes(b"ignored")

    inventory = build_file_tree(data_dir, "latest")

    assert list(inventory) == ["158", "KJET-20251228233053-AUX6"]
    assert inventory["158"]["files"][0]["s3_url"] == (
        "/api/pipeline/applications/Applicant_158/documents/"
        "Busia/application_158_bundle/registration.pdf/?cohort=latest"
    )
    assert inventory["KJET-20251228233053-AUX6"]["files"][0]["filename"] == (
        "supporting docs/bank statement.pdf"
    )
    assert "%20" in inventory["KJET-20251228233053-AUX6"]["files"][0]["s3_url"]
