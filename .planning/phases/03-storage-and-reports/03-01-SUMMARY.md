---
phase: 03-storage-and-reports
plan: 01
status: completed
completed_at: 2026-11-12T20:02:00+05:30
files_modified:
  - server/utils/storage.py
  - server/routes/analyze.py
  - server/tests/test_storage.py
---

# Plan 03-01 Execution Summary: Cloud Storage Integration & Secure Resume Downloads

## 1. Overview
Integrated real document storage (AWS S3 / Cloudflare R2 with local fallback) into resume upload pipelines, replaced the `"database-direct"` placeholder with real storage links, added presigned URL generation, and created authenticated download and streaming endpoints.

## 2. Changes Made
- **`server/utils/storage.py`**:
  - Implemented `generate_presigned_url(file_url, expiration=3600)` with S3 presigned URL creation and local `/api/uploads/` proxy fallback.
  - Implemented `delete_file(file_url)` supporting S3 key deletion and local file removal.
  - Implemented `is_cloud_storage_configured()` to dynamically detect object storage credentials.
- **`server/routes/analyze.py`**:
  - Connected `upload_file` inside `parse_pdf_endpoint` to persist uploaded candidate documents and return real `file_url`.
  - Updated `AnalyzeRequest` to accept `file_url: str | None` and updated `analyze_endpoint` to store real URLs on `ResumeVersion`.
  - Added `POST /api/resumes/upload` accepting multipart resume uploads, parsing text and structure, uploading to storage, and creating `ResumeVersion`.
  - Added authenticated `GET /api/resumes/{resume_id}/versions/{version_id}/download` enforcing tenant ownership/membership with presigned redirect or streaming fallback.
  - Added `GET /api/uploads/{filename}` with directory traversal defenses (`..`, `/`, `\`).
- **`server/tests/test_storage.py`**:
  - Added tests for presigned URLs, local file deletion, directory traversal mitigation, and upload/download roundtrips.

## 3. Verification
- `python -m py_compile` passed on `server/utils/storage.py`, `server/routes/analyze.py`, and `server/tests/test_storage.py`.
- Fast non-blocking unit test verified round-trip upload, download, presigned URL resolution, and deletion.
