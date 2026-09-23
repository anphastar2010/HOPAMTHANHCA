# TVCHH Drive Inventory & Priority Batch 1 Matching

**Phase:** 3A.1 — read-only survey
**Date:** 2026-09-23
**Drive source:** https://drive.google.com/drive/folders/13Bi4XWcJXogJWm4lBMYhKnFE4vfuB2SN?hl=vi

## Result

The supplied Google Drive folder was listed through the connected Drive service
without downloading PDF content. It contains 389 items: 388 PDFs and one XLSX
catalog. Of the PDFs, 387 have unambiguous numeric filenames from `1.pdf`
through `387.pdf`, with no gap and no duplicate number. The remaining PDF is
the aggregate `Ton-vinh-Chua-hang-huu.pdf` (20,208,711 bytes); it was recorded
as inventory provenance only and was not downloaded, inspected, or extracted.

Filename-to-number matching is HIGH confidence only for files matching exactly
`^number.pdf$`. This phase makes no claim about the content, title, lyrics,
chords, authors, key, meter, page count, or correspondence of a file's musical
content to any legacy record.

## Priority Batch 1

The provided list has **84 requested / 84 unique** numbers. The malformed
display forms `{216-TVCHH` and `217-TVCHH}` were treated as requests for
numbers 216 and 217 only; neither brace form was treated as a filename.

| Status | Count |
| --- | ---: |
| FOUND | 84 |
| MISSING | 0 |
| DUPLICATE | 0 |
| AMBIGUOUS | 0 |

All 84 requests match exactly one numeric PDF by filename. The full identity
metadata, Drive file IDs, sizes, URLs, modification times, and statuses are in
`data/import-manifests/tvchh-priority-batch-1.json`. That manifest is
inventory-only: it contains no lyrics, chords, canonical record, or approval.

## Pilot proposal

Proposed later extraction pilot: **1, 102, 216, 268, 337, 386**.

- 1 and 386 cover the numeric range edges.
- 102 and 216 cover interior positions.
- 268 and 337 are included only as future legacy-comparison candidates because
  matching numbered PDFs exist in Drive; the existing legacy records remain
  untouched.

This is a position-coverage proposal, not evidence of simple/complex layout,
verse/chorus form, accidental/extended/slash chords, or extraction quality.
Those properties must be observed only after a bounded, authorized PDF
extraction experiment.

## Storage and next gate

Google Drive is the current source location. No Cloudflare/R2 sync, no download,
no OCR, no Internet cross-check, no TVCHH import, and no production change was
performed. Before pilot extraction, choose the bounded PDF files to fetch
read-only and record per-file checksum, page count, PDF type, raw snapshot, and
field-specific confidence. Keep every result DRAFT until human review.
