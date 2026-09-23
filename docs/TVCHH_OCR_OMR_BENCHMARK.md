# TVCHH OCR/OMR Bounded Benchmark

**Phase:** 3A.3 — bounded, read-only benchmark<br>
**Date:** 2026-09-23<br>
**Decision:** **HUMAN_ASSISTED_REQUIRED**

## Scope and safety boundary

This experiment used only the six previously acquired pilot PDFs from the
user-provided Google Drive source: `1.pdf`, `102.pdf`, `216.pdf`, `268.pdf`,
`337.pdf`, and `386.pdf`. PDF Drive remains the primary source.

All raw PDFs, rendered images, OCR text, OCR TSV/hOCR boxes, OMR logs, OMR
book files, and experimental chord-to-lyric candidates are generated artifacts
under ignored `reports/tvchh-extraction/phase-3a3/`. They are not production
records and are not approved DRAFTs. Nothing in this experiment changed
`songs.js`, the 121-song production baseline, or legacy 268/337.

## Inputs and image quality

| PDF | SHA-256 | Pages | PDF image evidence | Render used for OCR/OMR |
| --- | --- | ---: | --- | --- |
| 1 | `f6a53e4a386024b38d138999ba86477efcaf94515eee89138abafb64a90d4f32` | 1 | 11 indexed, 8-bit, 200-DPI image strips | 2481×3509, 300-DPI PNG |
| 102 | `cb7130287538bbce5612abf2e623b242f7e2de8c8e2acc60152c3609434da42e` | 1 | 11 indexed, 8-bit, 200-DPI image strips | 2481×3509, 300-DPI PNG |
| 216 | `308f689f3e701a59867dbbb8fdaa79e4a13587bf7196e634ebe332a334f1064d` | 1 | 11 indexed, 8-bit, 200-DPI image strips | 2481×3509, 300-DPI PNG |
| 268 | `935b8ce712c3b2ce6506196cd1f277d60212ae8170507b022e1708e189a8d12a` | 1 | 11 indexed, 8-bit, 200-DPI image strips | 2481×3509, 300-DPI PNG |
| 337 | `f625117b12d3952a6d67f7c85694bb1994a7f7cfa2336fafe2ddebe9da76a494` | 2 | 15 indexed, 8-bit, 200-DPI image strips | two 2481×3509, 300-DPI PNGs |
| 386 | `c0956e884509b1f6c5f124ca3fd0e170548ff99d730331e0e72b4bf9a3772140` | 1 | 11 indexed, 8-bit, 200-DPI image strips | 2481×3509, 300-DPI PNG |

The strips are 1561 pixels wide and normally 222 pixels high. At the page
level they render as clean black-on-white score images. Audiveris reported a
zero global slope on pilot 1. No consistent skew, crop loss, low contrast, or
border problem justified deskewing or cropping. Image-strip compression is
recorded by Poppler as PDF `image`; this survey does not claim a more specific
codec.

Two generated inputs were benchmarked on all seven rendered pages:

- **RAW:** 300-DPI RGB PNG rendered by Poppler.
- **PREPROCESSED:** the RAW PNG converted to 8-bit grayscale and autocontrast
  with a 0.5% cutoff, on a generated copy only.

The OCR confidence values were identical for each RAW/PREPROCESSED page. The
preprocessed copies used slightly less peak memory and were usually faster,
but visual/OCR samples showed no material recognition improvement. Do not make
this transformation a required normalization rule yet.

## OCR benchmark

The system did not allow administrator installation of native Tesseract or
Vietnamese system data. Instead, the benchmark used the local, scriptable
WASM engine **Tesseract.js 5.1.0-288-g2a9c1** with local `vie+eng` 4.0.0
traineddata, PSM 6. The package, traineddata and cache were placed under
`/tmp`, not the repository.

Each page retained raw OCR text, TSV, hOCR, engine confidence, blocks and
bounding boxes. Engine confidence is included only as diagnostic output; it
does not approve text or music data.

| OCR measure | Result | Evidence and interpretation |
| --- | --- | --- |
| Vietnamese model | PASS | `vie+eng` was actually used for all 7 pages. |
| OCR coordinates | HIGH availability | TSV and hOCR contain token bounding boxes; no PDF text coordinates were needed. |
| Collection number | HIGH | Large printed numbers such as 102 and 268 are recognized/visually separable, but filename/Drive identity remains the authoritative collection identity. |
| Title OCR | MEDIUM | 102 is read as `XIN CHA BAN THÊM DẦU`; 268 appears as `NGAI LA Al?`, losing diacritics; 337's title was not reliably captured on page 1. |
| Credits OCR | MEDIUM where printed clearly | `Gary Mabry` and sampled author names are readable; sparse, stylized or absent credits are not machine-supplied facts. |
| Lyrics OCR | MEDIUM | Many Vietnamese lyric words and line order are recovered, but notes/staffs create noise and errors such as missing/incorrect diacritics and corrupted fragments. |
| Vietnamese diacritics | MEDIUM | Common `Chúa`, `Ngài`, `lòng` survive, but errors occur in tone marks and special letters, especially near notation. |
| Section labels | LOW | Numbered verses are often visible; refrain/other semantic labels cannot be inferred safely from score layout. |
| Chord-text OCR | MEDIUM | Clear tokens including `D`, `Bm`, `A7`, `Ab`, `Db`, `Gm`, `D/F#`, `D7`, `Cm`, and `Gm7/F` occur in TSV. Other notation is misread as chord-like text. |

RAW page runtime was 7.9–37.5 seconds (median about 20 seconds) and peak RSS
was 262–267 MiB where measured. PREPROCESSED was 5.7–30.4 seconds and
230–248 MiB. Reported overall confidences range from 64 to 81, including
musical noise, so they are not quality scores for a canonical field.

### Manual visual references

Visual comparison was limited to enough text/score regions to classify output;
no full lyric transcription was made.

| Sample observation | Classification |
| --- | --- |
| 102 title, `Gary Mabry`, simple `D/Bm/G/A7` chords and several lyric rows | EXACT to MINOR_OCR_ERROR by field; staff fragments still add noise. |
| 268 title and A-flat-family chord row | MINOR_OCR_ERROR for title accents; chord tokens mostly recognized, but must preserve the source's flat notation and remain review-only. |
| 337 page 1/2 Gm, D/F#, Cm, D7 rows | EXACT to MINOR_OCR_ERROR for several chord tokens; title/lyrics remain incomplete or error-prone. |
| 1, 216 and 386 notation-heavy regions | MAJOR_OCR_ERROR in portions over/near staff notation; not usable as clean lyrics without review. |

## OMR benchmark

**Engine:** Audiveris 5.11.0 official Ubuntu 24.04 package, unpacked locally
under `/tmp` (not system-installed). Its embedded runtime was used in
headless batch mode. Audiveris initially required a display even in batch mode;
adding Java headless mode allowed processing.

Audiveris could not use a native Tesseract tessdata installation in this
restricted environment. Its logs therefore report no installed OCR languages.
That limitation applies to Audiveris text recognition; the separate local
Vietnamese OCR benchmark above did run.

Full `-export` processing on pilot 1 progressed through `BEAMS` after loading
the 2480×3508 image and identifying 9 systems, but the execution runner ended
the process before it produced valid MusicXML. This is a bounded-environment
result, not evidence that full Audiveris would always fail on another runner.
No valid MusicXML was generated, so notes, OMR lyrics, OMR chord symbols and
musical structure remain **NOT EXTRACTABLE in this benchmark**.

To separately measure staff/layout recognition within the runner limit,
Audiveris `-step GRID -save` completed for all six PDFs:

| PDF | Systems detected | GRID time | Peak RSS | Result |
| --- | ---: | ---: | ---: | --- |
| 1 | 9 | 24.16 s | 353 MiB | staff/layout output saved |
| 102 | 8 | 29.96 s | 305 MiB | staff/layout output saved |
| 216 | 3 | 14.46 s | 310 MiB | staff/layout output saved |
| 268 | 4 | 14.94 s | 322 MiB | staff/layout output saved |
| 337 | 2 | 19.93 s | 402 MiB | staff/layout output saved |
| 386 | 8 | 15.90 s | 320 MiB | staff/layout output saved |

This demonstrates **STAFF_RECOGNITION: MEDIUM** for layout support. It does
not demonstrate reliable note, lyric, chord-symbol, section, or MusicXML
reconstruction. The unpacked Audiveris runtime is about 188 MiB (75 MiB
download); the temporary Tesseract.js package plus data/cache used about
99 MiB. OCR is **LIGHT**; GRID-only OMR is **ACCEPTABLE**; full OMR is
**HEAVY / unmeasured to completion** in this runner.

## OCR + OMR fusion probe

OCR TSV supplies `text + page + bounding box + engine confidence`. Audiveris
GRID supplies a staff/system layout but no completed semantic MusicXML in this
environment. A generated probe therefore used OCR geometry only and made 34
experimental chord-to-lyric candidates for 268/337.

Every candidate records source page, raw chord token, chord and lyric bounding
boxes, the nearest-below geometry rule, and `REVIEW REQUIRED` in
`fusion/chord-to-lyric-candidates.json`. Examples include OCR `Ab` above a
nearby lyric candidate in 268 and `Gm`/`D/F#` rows in 337.

The probe also demonstrates why it is not safe to export `[Chord]lyric`:

- two lyric verses can share a staff row;
- OCR may turn a musical mark into a word or chord-like token;
- nearest geometry does not establish semantic attachment;
- Audiveris did not provide completed note/text semantics for confirmation.

Thus **CHORD_TOKEN_RECOGNITION is MEDIUM** and **CHORD_TO_LYRIC_ASSOCIATION is
LOW / REVIEW REQUIRED**. No association is production data.

## Legacy comparison — 268 and 337

PDF Drive is primary; OCR/OMR is a candidate; `songs.js` is a comparison source
only. No source was automatically preferred.

| Item | PDF vs OCR/OMR | PDF vs legacy |
| --- | --- | --- |
| 268 title | OCR loses title diacritics: `NGAI LA Al?`; MINOR_OCR_ERROR. | Same title words with presentation casing; PRESENTATION_ONLY. |
| 268 keys/chords | OCR recognizes several A-flat-family tokens such as `Ab`, `Db`, `Fm`, `Ddim`, `Ab/Eb`; OMR GRID provides no chord semantics. | PDF's four-flat/A-flat-family presentation differs from legacy key `F`; SOURCE_DIFFERENCE / REVIEW REQUIRED. |
| 268 lyrics/placement | OCR text is partial/error-prone; geometry candidates are review-only. | Exact comparison remains UNRESOLVED; no automatic update. |
| 337 title | OCR page text does not reliably recover the displayed title; MAJOR_OCR_ERROR for that field. | Visible title words match legacy title case-insensitively; PRESENTATION_ONLY. |
| 337 keys/chords | OCR recognizes Gm, D/F#, Cm, D7 and Gm7/F examples; OMR GRID has no chord semantics. | PDF Gm/two-flat presentation differs from legacy key `D`; SOURCE_DIFFERENCE / REVIEW REQUIRED. |
| 337 lyrics/placement | OCR captures many words but has accent/noise errors; geometry candidates are review-only. | Exact comparison remains UNRESOLVED; no automatic update. |

## Decision and next bounded step

**Decision: HUMAN_ASSISTED_REQUIRED.** Automation can create a provenance-rich
candidate with raw OCR, boxes and proposed chord associations, but it cannot
produce trustworthy canonical lyrics, chords, chord placement, key, credits,
or section structure without human correction/review. This result is not a
license to repair OCR text automatically.

Recommended Phase 3B design gate: build a small, non-production OCR-DRAFT
prototype for a few priority songs only. It should preserve source snapshots
and tokens; assign collection identity from the manifest; store OCR field and
geometry evidence; keep `status: DRAFT`; require a visual review UI/checklist;
and only then allow a reviewed exporter changeset. Re-benchmark complete
Audiveris transcribe/MusicXML on a runner that permits longer execution and a
configured OCR data directory before choosing OMR as a production dependency.

## Artifact inventory and verification

Generated/ignored artifacts are under:

- `reports/tvchh-extraction/phase-3a3/raw-render/` and `preprocessed/`
- `reports/tvchh-extraction/phase-3a3/metadata/`
- `reports/tvchh-extraction/phase-3a3/ocr/`
- `reports/tvchh-extraction/phase-3a3/omr/`
- `reports/tvchh-extraction/phase-3a3/fusion/`

No PDF, model, runtime, cache or generated extraction artifact is tracked by
Git. Final safety checks are recorded in `docs/PROJECT_LOG.md`.
