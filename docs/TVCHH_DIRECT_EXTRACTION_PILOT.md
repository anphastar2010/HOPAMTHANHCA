# TVCHH Direct PDF Extraction Pilot

**Phase:** 3A.2 — read-only bounded pilot<br>
**Date:** 2026-09-23<br>
**Decision:** **OMR_REQUIRED** for automatic lyrics/chord extraction from this source.

## Scope and tools

Exactly six PDFs were fetched read-only from the previously inventoried Google
Drive folder: `1.pdf`, `102.pdf`, `216.pdf`, `268.pdf`, `337.pdf` and `386.pdf`.
No other numbered PDF or aggregate PDF was downloaded. Raw PDFs and all derived
artifacts are under ignored `reports/tvchh-extraction/`; no PDF is tracked by
Git.

Direct tools only:

- Poppler 24.02.0: `pdfinfo`, `pdffonts`, `pdfimages -list`, `pdftotext`,
  `pdftohtml -xml` and `pdftoppm`.
- No OCR and no OMR tool was installed or run.

## File evidence

| PDF | Bytes | SHA-256 | Pages | Direct type | Image strips | Plain/layout bytes | Coordinate text nodes |
| --- | ---: | --- | ---: | --- | ---: | ---: | ---: |
| 1 | 169,274 | `f6a53e4a386024b38d138999ba86477efcaf94515eee89138abafb64a90d4f32` | 1 | IMAGE/SCAN | 11 | 1 / 1 | 0 |
| 102 | 167,645 | `cb7130287538bbce5612abf2e623b242f7e2de8c8e2acc60152c3609434da42e` | 1 | IMAGE/SCAN | 11 | 1 / 1 | 0 |
| 216 | 174,724 | `308f689f3e701a59867dbbb8fdaa79e4a13587bf7196e634ebe332a334f1064d` | 1 | IMAGE/SCAN | 11 | 1 / 1 | 0 |
| 268 | 175,024 | `935b8ce712c3b2ce6506196cd1f277d60212ae8170507b022e1708e189a8d12a` | 1 | IMAGE/SCAN | 11 | 1 / 1 | 0 |
| 337 | 1,173,562 | `f625117b12d3952a6d67f7c85694bb1994a7f7cfa2336fafe2ddebe9da76a494` | 2 | IMAGE/SCAN | 15 | 2 / 2 | 0 |
| 386 | 174,696 | `c0956e884509b1f6c5f124ca3fd0e170548ff99d730331e0e72b4bf9a3772140` | 1 | IMAGE/SCAN | 11 | 1 / 1 | 0 |

`pdftotext` and `pdftotext -layout` emitted only one line-feed per page.
`pdftohtml -xml` emitted page geometry but no `<text>` node. The score content
is stored as 200-DPI image strips. `pdffonts` may list Helvetica on some files,
but it does not yield usable selectable score text. PDF metadata is retained in
the generated `metadata/*.pdfinfo.txt` files; it is useful for provenance, not
for song-field extraction.

## Direct-extraction assessment

| Capability | Result | Evidence |
| --- | --- | --- |
| Plain text reading order | NOT EXTRACTABLE | 1/2 newline bytes only. |
| Layout text | NOT EXTRACTABLE | Same empty output. |
| Coordinates for text/chords | NOT EXTRACTABLE | XML pages contain zero text nodes. |
| Vietnamese direct text | NOT EXTRACTABLE | No Unicode score text is embedded. |
| Vietnamese visual rendering | MEDIUM visual evidence | Rendered 268/337 pages are legible to a human; this is not machine extraction. |
| Chord token recognition | NOT EXTRACTABLE directly | Chords are pixels, not PDF text. |
| Chord-to-lyric positioning | NOT EXTRACTABLE directly | No text/chord coordinates exist. |
| OCR need | YES for text-only recovery | Direct extraction supplies no score text. |
| OMR need | YES for music/chord positioning | Pixel score relationship must be recovered from image geometry. |

A printed chord visibly appears above a staff/lyric position in rendered score
images, but the direct PDF extractor has no machine-readable token or bounding
box. Visual existence is therefore not a valid automatic `[Chord]lyric`
association.

## Field confidence from direct extraction

| Field | 1 / 102 / 216 / 268 / 337 / 386 |
| --- | --- |
| Collection number | HIGH from verified exact filename and Drive identity; not extracted from page text |
| Title | NOT EXTRACTABLE directly |
| Credits | NOT EXTRACTABLE directly |
| Key / meter | NOT EXTRACTABLE directly |
| Lyrics | NOT EXTRACTABLE directly |
| Chord token | NOT EXTRACTABLE directly |
| Chord position | NOT EXTRACTABLE directly |
| Verse / chorus labels / line breaks | NOT EXTRACTABLE directly |

No raw text is normalized, repaired, associated, or converted to a DRAFT in
this pilot.

## Legacy golden comparison

The comparison is intentionally limited to human visual inspection of rendered
first pages plus direct-extraction evidence. It is not a claim that either
source is canonical.

| Dimension | 268 — `[268-TVCHH] Ngài Là Ai` | 337 — `[337-TVCHH] Đồi Vắng` |
| --- | --- | --- |
| Title | PRESENTATION_ONLY: visible words match; PDF uppercase vs legacy title case | PRESENTATION_ONLY: visible words match; PDF uppercase vs legacy title case |
| Key/chord presentation | SOURCE_DIFFERENCE: visible score uses A♭/D♭/B♭m-family symbols and four-flat signature; legacy is F-based | SOURCE_DIFFERENCE: visible score begins Gm/D/F♯-family with two-flat signature; legacy is Dm-based |
| Lyrics | UNRESOLVED: no direct text to compare exactly | UNRESOLVED: no direct text to compare exactly |
| Chord tokens/count/order | UNRESOLVED: score is image-only | UNRESOLVED: score is image-only |
| Chord-to-lyric placement | UNRESOLVED: no extracted coordinates | UNRESOLVED: no extracted coordinates |
| Sections/line breaks | UNRESOLVED: no extracted text; 337 has two PDF pages | UNRESOLVED: no extracted text; 337 has two PDF pages |

The key/chord findings are source differences observed in the score rendering,
not extraction errors. They may reflect transposition or editorial versions and
must be REVIEW REQUIRED if an eventual DRAFT differs from legacy.

## Artifacts and decision gate

Generated, ignored artifacts include:

- `raw/{1,102,216,268,337,386}.pdf`
- `plain/*.txt` and `layout/*.txt`
- `coordinates/*.xml`
- `metadata/*.sha256`, `*.pdfinfo.txt` and `*.fonts.txt`
- `render/268-page-1.png` and `render/337-page-1.png`

**Decision: OMR_REQUIRED.** Direct extraction has no usable text or
coordinates across all six diverse pilot files, so it cannot support a parser
for collection/title/lyrics/chords or their alignment. Phase 3A.3 should run a
small, separate OMR/OCR benchmark only after choosing the specific engine and
success metrics. It must retain source snapshots, keep every result DRAFT, and
never update `songs.js` automatically.

## Safety

- Production baseline remains 121 songs.
- No song, including legacy 268/337, was modified.
- No TVCHH record was imported, normalized, approved or exported.
- No Cloudflare/R2 action, Internet cross-check, OCR, OMR or production importer
  work occurred.
