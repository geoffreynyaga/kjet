import sys
from pathlib import Path
from unittest import mock


EXTRACTION_DIR = Path(__file__).resolve().parent
if str(EXTRACTION_DIR) not in sys.path:
    sys.path.insert(0, str(EXTRACTION_DIR))

import extract_all_documents


def test_duplicate_pdfs_reuse_ocr_result(tmp_path):
    app_folder = tmp_path / "application_123_bundle"
    app_folder.mkdir()
    (app_folder / "statement_1.pdf").write_bytes(b"same-pdf-content")
    (app_folder / "statement_2.pdf").write_bytes(b"same-pdf-content")

    no_embedded_text = (
        "PDF appears to be image-based or corrupted - no extractable text found"
    )
    with (
        mock.patch.object(
            extract_all_documents,
            "extract_pdf_text",
            return_value=no_embedded_text,
        ),
        mock.patch.object(extract_all_documents, "repair_pdf", return_value=None),
        mock.patch.object(
            extract_all_documents,
            "extract_pdf_with_ocr",
            return_value="OCR text",
        ) as ocr,
    ):
        result = extract_all_documents.process_application_folder(
            app_folder, "Test County"
        )

    assert ocr.call_count == 1
    assert set(result["financial_documents"]) == {
        "statement_1.pdf",
        "statement_2.pdf",
    }
    assert result["document_summary"]["total_documents"] == 2
    assert result["document_summary"]["ocr_fallback_used"] == 2
