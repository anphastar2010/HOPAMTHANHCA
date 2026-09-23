# HOPAMTHANHCA technical log

This file is the durable handoff for future Codex and ChatGPT conversations.
Read it before surveying the repository again, then verify only facts relevant
to the next task.

## Project identity

- Workspace: `HOPAMTHANHCA` (`2855db87635c`)
- Repository: static worship-song chord library for GitHub Pages
- Production shape: plain HTML, CSS, and JavaScript; no backend
- Data source of truth: `songs.js`
- Saved ChatGPT Project: `HOPAMTHANHCA`
- Connector: `Codex with ChatGPT · HOPAMTHANHCA`
- Phase 1–3 C2C task: `c2c_9c76` (closed)
- Phase 4B C2C task: `c2c_4b20` (closed after ChatGPT review)
- Phase 4C C2C task: `c2c_4c01` (closed after ChatGPT review)
- Pre-data-review checkpoint C2C task: `c2c_c84f`

## Baseline verified 2026-09-19

- Git was clean on `main` at `8454212`, synchronized with `origin/main`.
- The repository had seven application files and no package manager, tests, or
  CI configuration.
- `songs.js` contained 123 songs, no duplicate IDs or exact titles, and every
  song had the existing fields `id`, `title`, `artist`, `key`, `audio`,
  `sheet`, and `content`.
- No song stored `sourceUrl` or `importedAt`, although the README said Studio
  saved both fields.
- Two existing songs had unbalanced chord brackets:
  `[72] MỪNG KHEN GIÊHÔVA` and `[116] XIN THA THỨ`.
- `studio.html` was a single 7.6 KB line with inline JavaScript. Its save path
  copied only the six editable fields, so provenance metadata was discarded.
- `editor.html` remained the older fallback editor.

## Agreed plan

ChatGPT inspected the repository through the workspace connector and proposed
this order:

1. Add a read-only song validator.
2. Add automated tests for chord transposition, audio parsing, validation, and
   later MusicXML behavior.
3. Add conservative Vietnamese text QA that reports without rewriting data.
4. Add reviewed changeset diff/apply support.
5. Split `studio.html` into maintainable modules and preserve provenance.
6. Add CI after local checks are stable.

The governing decision is to build safety rails before editing the 123-song
library. Automated tools must not rewrite song lyrics or chords.

## Current implementation

- Phase 1 is complete in the current working change.
- `AGENTS.md` requires future agents to read and maintain this log.
- `tools/validate-songs.mjs` safely parses `songs.js` as static JSON data and
  reports structural errors, warnings, and formatting information without
  evaluating or rewriting the file.
- Pure chord transposition and audio parsing live in `src/chords.js`; the
  production page imports that module instead of duplicating the logic.
- Vitest covers chord transposition, slash chords, audio versions, validation,
  duplicate detection, URL checks, and loading the real song library.
- Phase 2 adds a read-only changeset review path. `src/changesets.js` applies a
  changeset to an in-memory clone, preserves omitted metadata on update, and
  flags deletion, title changes, large content changes, explicit metadata loss,
  and missing base revisions. `tools/review-changeset.mjs` validates the result
  and prints a `jsondiffpatch` delta. It can write a separate candidate file but
  refuses to overwrite `songs.js`.
- `songs.js` remains byte-for-byte unchanged in this phase.
- Phase 3 is complete in the working change. Studio is split into HTML, CSS,
  UI wiring, MusicXML parsing, and a pure data model. Saves merge editable
  fields into existing songs, keep provenance when the URL field is blank,
  and set `importedAt` only once.
- Studio history snapshots the library, pending changes, and selected song, so
  Undo keeps the exported changeset consistent with the state shown in the UI.
- Changesets carry the last commit that changed `songs.js`. Candidate creation
  is blocked for a stale base unless the reviewer explicitly supplies
  `--allow-stale-base`. `check:data-revision` and CI detect a stale revision
  artifact.
- MusicXML fixtures lock current behavior for major/minor keys, sharp and flat
  harmony roots, kind text, multiple measures and lyric verses, delayed lyric,
  missing parts, and malformed XML.
- `tests/browser-smoke.html` exercises both production pages over HTTP without
  modifying repository data.

## Verification

Before Phase 1, these checks passed:

- `node --check app.js`
- JSON parsing of the array in `songs.js`
- URL parsing for all populated audio and sheet links
- `git diff --check`

Phase 1 verification (iteration 2):

- `npm run check`: passed; validator checked 123 songs with 0 errors, 2
  warnings, and 63 informational formatting findings.
- `vitest run`: 3 test files and 12 tests passed.
- `npm audit`: 0 vulnerabilities after installing Vitest 5.0.1.
- `node --check` passed for the application, validator, loader, and shared
  modules.
- `git diff --check`: passed.

Phase 2 verification (iteration 3): 4 test files and 17 tests passed; the
changeset fixture produced a valid jsondiffpatch report.

Phase 3 implements the reviewed Studio plan: external `studio.js` and CSS,
testable MusicXML and Studio model modules, provenance-preserving merge saves,
dataset revision export, stale-base detection, regression tests, and CI.

Phase 3 hardening (iteration 5):

- `npm ci`: passed; 40 packages installed and 0 vulnerabilities reported.
- `npm run check`: passed; validator checked 123 songs with 0 errors, 2 legacy
  warnings, and 63 informational findings; data revision matched; 7 test files
  and 31 tests passed.
- `npm audit --audit-level=high`: passed with 0 vulnerabilities.
- Syntax checks and `git diff --check`: passed.
- Headless Chrome loaded `tests/browser-smoke.html` through
  `http://127.0.0.1:4173` and passed 15 checks: the main page and Studio each
  loaded 123 songs; search, selection, transposition, font size, navigation,
  module loading, Studio edit/delete Undo, provenance, MusicXML import,
  baseCommit, and download-only export all worked. Every application/module
  resource returned HTTP 200; only the browser's optional `/favicon.ico`
  request returned 404.
- The smoke test exposed and fixed Studio's use of `globalThis.songs`; because
  `songs.js` declares a global lexical `const`, Studio now reads the `songs`
  binding directly.
- `git diff --exit-code -- songs.js`: passed; song data remains byte-for-byte
  unchanged.
- ChatGPT independently reviewed the workspace, diff, execution output, HTTP
  smoke results, revision safety, provenance, Undo behavior, MusicXML coverage,
  and CI, then returned `STATE: DONE` for C2C task `c2c_9c76` iteration 5.
  Phase 3 is closed with all agreed success criteria met.

## Known issues and next step

- Existing bracket findings are intentionally reported, not automatically
  fixed.
- Vale is not installed and is not required by the Phase 4B engine. A future
  proof-of-fit is optional only if it can show useful, low-noise findings on a
  generated Vietnamese corpus.
- Phases 4B and 4C were reviewed and confirmed DONE by ChatGPT. Batch 1–15
  remain unopened until the pre-data-review Git checkpoint is independently
  reviewed. Any later data correction must be human-approved and pass through
  the changeset review workflow.

## Phase 4A survey checkpoint

- The read-only Phase 4A survey and proposed plan are recorded in
  `docs/PHASE4_PLAN.md`.
- The survey found 123 songs, 2,054 nonblank lyric lines, 110,261 content
  characters, and 5,862 matched chord tokens. It localized the two legacy
  unmatched closing brackets but did not edit them.
- Custom chord-aware JavaScript is proposed as the primary QA layer. Vale is an
  optional later pilot on a generated corpus; it has not been installed.
- No repository file named `MasterPrompt` was found, so the user's Phase 4 brief
  was treated as the controlling master prompt.
- ChatGPT approved the Phase 4A plan. Phase 4B implementation followed that
  plan without changing `songs.js`.

## Phase 4B textual QA checkpoint

- `src/text-qa.js` implements pure chord-aware tokenization and source-position
  mapping. It recognizes common basic, slash, flat/sharp, and extended chord
  tokens without treating chord adjacency as a whitespace or punctuation
  error.
- `tools/report-text-qa.mjs` is read-only and supports terminal, JSON, and
  static HTML reports. Every finding includes severity, rule ID, song identity,
  logical line, source context, explanation, fingerprint, and dataset revision.
  It refuses to write a report over `songs.js`.
- `qa/text-qa-policy.json` records rule severities and exact fingerprints for
  the two known unmatched-closing-bracket findings. These legacy findings stay
  visible as warnings; a new or moved structural finding is an error and fails
  the QA check.
- `qa/batches.json` pins the approved eight-song calibration set and 15 future
  batches to dataset revision `8454212329875e2d11a3d062d4549f8feadf0293`.
  Batches 1–14 contain 8 stable song IDs each and Batch 15 contains 11; all 123
  IDs occur once. No batch report has been run.
- Calibration checked only positions 1, 2, 7, 10, 46, 73, 118, and 123. It
  produced 55 findings: 0 errors, 33 warnings, 19 info, and 3 human-review
  findings. The two legacy bracket findings are present and no finding blocks
  CI.
- Calibration found 31 trailing-whitespace warnings, 5 chorus-label info, 9
  verse-number info, 5 title-capitalization info, 1 repeated-punctuation review,
  and 2 repeated-word reviews. `Intro...` and `muôn muôn` are likely
  intentional; `Ngài Ngài` needs a human decision. Nothing was corrected.
- A wider read-only QA check currently reports 917 findings across the full
  library with 0 errors and 0 CI-blocking findings. This count is diagnostic,
  not an instruction to bulk-fix data.
- `docs/TEXT_QA_GUIDE.md` documents the severity model, reports, calibration,
  human decisions, and later changeset workflow. Generated reports live under
  ignored `reports/text-qa/` and are not source of truth.

Phase 4B verification (C2C task `c2c_4b20`, iteration 1):

- `npm run check`: passed. The existing validator checked 123 songs with 0
  errors, 2 legacy warnings, and 63 info; the dataset revision matched; the
  full text-QA run had 0 blocking findings; 8 test files and 46 tests passed.
- Text-QA tests cover chord masking/tokenization, slash and extended chords,
  source/logical-line mapping, Vietnamese Unicode and NFC, invisible
  characters, whitespace and punctuation positive/negative cases, chord
  adjacency, stable legacy fingerprints, new structural regressions, JSON/HTML
  escaping, severity/exit codes, manifest integrity, and non-mutation.
- `npm audit --audit-level=high`: passed with 0 vulnerabilities.
- JavaScript syntax checks, JSON parsing, and `git diff --check`: passed.
- `git diff --exit-code -- songs.js`: passed. The QA CLI mutation test also
  confirms byte-identical data and rejects `songs.js` as an output path.
- Vale was not installed. The custom engine completes Phase 4B without it.
- Checkpoint: **STOP FOR CHATGPT REVIEW BEFORE DATA REVIEW OR BATCH 1.**

## Phase 4C human QA policy checkpoint

- `docs/HUMAN_QA_POLICY.md` translates every current Text QA rule into simple
  Vietnamese review guidance. It defines **SỬA**, **GIỮ NGUYÊN**, and
  **XEM LẠI SAU**, plus the non-automatic recommendations `LIKELY_FIX`,
  `LIKELY_KEEP`, `REVIEW_FIRST`, and `CONTEXT_REQUIRED`.
- Every rule documents what the tool detected, confidence limits, when each
  human decision is appropriate, and `AUTO-FIX = NO`.
- Structural, whitespace/Unicode, punctuation, presentation-convention, and
  musical/lyrical findings are separated. Machine confidence is explicitly not
  permission to edit song data.
- The policy contains a plain review-card template and the required path from a
  human **SỬA** decision to proposed changeset, changeset review, validators,
  Text QA, diff, browser smoke test, human approval, and merge.
- **GIỮ NGUYÊN** does not add a baseline fingerprint; **XEM LẠI SAU** does not
  become **SỬA** automatically; **SỬA** does not directly modify `songs.js`.
- Chorus labels, verse numbering, title capitalization, trailing whitespace,
  repeated words, punctuation, line breaks, and the exact repair for both
  legacy bracket findings remain unresolved editorial decisions.
- Phase 4C changes documentation only. It adds no QA rules, tests, dependencies,
  baseline fingerprints, reports, batches, or song-data changes. Vale remains
  uninstalled and CI severity behavior is unchanged.
- Phase 4C verification: `npm run check` passed; the validator still reports
  123 songs / 0 errors / 2 legacy warnings / 63 info, data revision is valid,
  Text QA still reports 917 findings / 0 blocking, and all 8 test files / 46
  tests passed. `git diff --check` and `git diff --exit-code -- songs.js`
  passed.
- The ignored report directory still contains only `calibration.json` and
  `calibration.html`. No `batch-*` report or non-fixture changeset was created.
  `npm ls vale --depth=0` and package manifest checks confirm Vale is absent.
- Checkpoint: **STOP FOR CHATGPT REVIEW. DO NOT RUN BATCH 1 AND DO NOT MODIFY
  SONG DATA.**

## Pre-data-review Git checkpoint

This checkpoint packages the reviewed Phase 1–4C application, Studio, safety
tooling, tests, CI, Text QA, configuration, and documentation before any song
data cleanup.

Pre-commit verification:

- Git was on `main` at parent `8454212329875e2d11a3d062d4549f8feadf0293`,
  synchronized with `origin/main`, with no conflicts.
- `npm ci`: passed; 40 packages installed and 0 vulnerabilities reported.
- `npm run check`: passed; validator checked 123 songs with 0 errors, 2 legacy
  warnings, and 63 info; data revision matched; Text QA reported 917 findings
  with 0 blocking; all 8 test files / 46 tests passed.
- `npm audit --audit-level=high`: passed with 0 vulnerabilities.
- Browser smoke through `http://127.0.0.1:4173/tests/browser-smoke.html` passed
  all 15 checks for the main application, Studio, Undo/changesets, provenance,
  dataset revision, MusicXML, and download-only export.
- `git diff --check` passed. The working `songs.js` blob matched the parent
  commit blob `9fecc865ec4c64e1c97400f7b38381ab2744c57d` exactly.
- The ignored report directory contained only the two calibration outputs; no
  Batch 1–15 report or non-fixture changeset existed. Vale remained absent.
- Secret and file-scope review found no credentials, machine-local data,
  generated reports, cache, or temporary files for staging.

The checkpoint commit must not change `songs.js`, update the dataset revision,
or be pushed before independent ChatGPT review. Its boundary is **BEFORE SONG
DATA CLEANUP**.

## PDF resolver and approved data cleanup (uncommitted)

- The project owner approved removal of the two unnumbered duplicate records:
  ID `1767000271760` (`Yên vui một đời`) and ID `1782288509642`
  (`TÌNH CON DÂNG HIẾN`). Their numbered retained counterparts are IDs
  `1782379843052` (`[118] YÊN VUI MỘT ĐỜI`) and `1782288527182`
  (`[95] TÌNH CON DÂNG HIẾN`).
- ID `1767001582485` is now titled `[337-TVCHH] Đồi Vắng`; ID
  `1789300042893` is now titled `[268-TVCHH] Ngài Là Ai`. No artist, key,
  audio, sheet, or content field was changed for retained songs.
- `songs.js` now contains 121 songs. The main collection has 119 valid
  numbers in `1–120`; number 18 is intentionally absent because **Chúa Hằng
  Chăn Giữ Tôi** has not yet been entered. No placeholder was created. A later
  valid `[18]` title will resolve automatically to `thanhca/18.pdf`.
- `src/pdf-links.js` provides a pure strict resolver. Valid `[n]` titles map
  to `https://pdf.alpha2026.dpdns.org/thanhca/n.pdf`; valid
  `[n-TVCHH]` titles map to `https://pdf.alpha2026.dpdns.org/tvchh/n.pdf`.
  Generated R2 URLs take priority over a legacy HTTP(S) `sheet` fallback and
  the resolver does not mutate a song object.
- `app.js` uses the resolved URL for the Sheet button while preserving new-tab
  `noopener` behavior. Studio remains unchanged: its `sheet` field is still a
  fallback for exceptional uncoded songs and administrators no longer need to
  enter the routine R2 URLs.
- `src/song-validator.js` now reports malformed/out-of-range PDF codes,
  duplicate valid PDF codes, and missing main numbers as non-blocking info.
  Generated URLs are checked as HTTPS `.pdf` URLs. The intentional missing
  number 18 is one informational finding, not a build error.
- `qa/batches.json` and its manifest test were updated to remove the two
  deleted IDs, preserve all 121 retained IDs once, and keep the calibration
  list valid. `tests/fixtures/update-key.changeset.json` now targets a retained
  song ID.

Verification for this uncommitted change:

- `npm run review:changeset -- /tmp/hopamthanhca-pdf-links.changeset.json`:
  passed review of the approved four operations, 123 → 121, 0 structural
  errors.
- `npm run check`: passed. Validator: 121 songs, 0 errors, 2 legacy warnings,
  64 info (including intentional missing 18); Text QA: 121 songs, 910
  findings, 0 CI-blocking; Vitest: 9 files / 61 tests passed.
- `npm run check:data-revision`: passed against the current committed
  `songs.js` revision `8454212329875e2d11a3d062d4549f8feadf0293`. Because no
  commit was requested, `data-revision.js` remains at that last committed
  source revision; update it only when the approved data commit exists.
- Browser smoke via local HTTP server and headless Chrome: `PASS (16)`,
  including 121-song main/Studio loads and opening the resolved TVCHH PDF URL.
- Retained-data comparison against `HEAD:songs.js`: 121 retained IDs, no
  unexpected field mutation, no removed ID present, and identical content-map
  SHA-256 before/after:
  `380ca33ae33dec05d260152183b56dbbae192772ef44c59c7459f6f3af49debd`.
- Read-only `curl -I` checks returned HTTP 200 and `content-type:
  application/pdf` for `thanhca/1.pdf`, `thanhca/120.pdf`, `tvchh/268.pdf`,
  and `tvchh/337.pdf`.

Remaining step: review the uncommitted diff, then create an approved data
commit and run the data-revision update workflow at that commit. Do not add a
placeholder for number 18.

## PDF post-check (uncommitted)

- `qa/batches.json` now has precise contiguous positions for every batch over
  the 121-song library: batch 01 is 1–7, batch 12 is 88–94, and batch 15 is
  111–121. Calibration positions were recalculated from their stable IDs.
- Manifest tests now prove all 121 IDs occur once, every batch's `songIds`
  exactly match its `songs.js` slice, ranges are contiguous, and the last
  range ends at 121.
- Main numeric code inspection now recognizes `[0]` as out of range for a
  validator warning, while the strict resolver returns `null` for both `[0]`
  and `[121]`. Tests cover both cases.
- Post-check passed: `npm run check` (9 files / 64 tests), direct batch
  manifest verification (121 IDs, 121 unique, final end 121), browser smoke
  `PASS (16)`, and `git diff --check`.
- The retained-data comparison remains clean: 121 retained IDs, no unexpected
  field mutation, no removed ID present, and identical content-map SHA-256
  `380ca33ae33dec05d260152183b56dbbae192772ef44c59c7459f6f3af49debd`.

## PDF data revision metadata (uncommitted)

- Implementation commit: `4e8f3b2368fb1c2b138598faab1ce76457c81aad`
  (`feat: add automatic R2 PDF links`). It is the newest commit affecting
  `songs.js` and retains exactly 121 songs.
- `data-revision.js` now records that full SHA via `npm run update:data-revision`.
- `qa/batches.json` and `qa/text-qa-policy.json` were synchronized to that
  revision after the data commit; their batches, calibration, rules,
  thresholds, and structural baseline were not changed.
- Metadata verification passed: `npm run check` (121 songs; 9 files / 64
  tests), exact 121-ID contiguous batch coverage, browser smoke `PASS (16)`,
  and `git diff --check`. No push was performed.

## Song Canonical Format v1 — read-only survey (2026-09-22)

- **User-confirmed baseline decision (2026-09-22): CURRENT CANONICAL
  BASELINE: 121 songs.** This is a user decision, not an inference from the
  Validator. The library previously had 123 songs; two duplicate songs were
  intentionally removed during bulk PDF synchronization. No investigation or
  restoration is needed, and all future canonical-format/dry-run scope uses
  the 121-song baseline.

- Phase: **SONG CANONICAL FORMAT v1 — READ-ONLY SURVEY**. Goal: survey the
  current library and propose a future TVCHH-ready canonical format. No
  production song data, `songs.js`, changeset, candidate library, commit, or
  dependency was changed.
- Scope confirmation: current `songs.js` revision
  `4e8f3b2368fb1c2b138598faab1ce76457c81aad` contains the confirmed canonical
  baseline of 121 records; the earlier 123-song count predates intentional
  duplicate removal.
- Read files: `README.md`, `songs.js`, `package.json`, Validator/Text QA
  modules/tooling and this log. Created
  `docs/SONG_CANONICAL_FORMAT_V1.md`; updated this log. Those are the only
  phase files changed.
- Survey: 2,019 nonblank content lines, 484 blank lines, 5,784 recognized
  chord tokens; variants in credit strings, title casing, verse/chorus labels,
  whitespace and sparse metadata were documented. The report separates
  technical certainty from editorial inconsistency and human decisions.
- Verification: `npm run validate:songs` passed (121 songs; 0 errors, 2
  legacy bracket warnings, 64 info); `npm run qa:text` passed (910 findings;
  0 CI blocking); `npm test` passed (9 files, 64 tests); `git diff --check`
  and `git diff --exit-code -- songs.js` passed. Vale was not installed and
  `jsondiffpatch` was not run because no data candidate was made.
- Proposal: `Extract → DRAFT → Normalize → Validator → Cross-check → Human
  Review → APPROVED → songs.js → CI`, with provenance, workflow status, and
  source snapshots. The report defines SAFE AUTO-FIX, REVIEW REQUIRED and
  NEVER AUTO-FIX boundaries.
- Pending: establish authoritative credit/source rules for TVCHH; do not
  auto-resolve legacy brackets or Text QA findings.

## Phase 2A — Canonical normalization dry-run (2026-09-23)

- Baseline: **121 songs**, per the user-confirmed canonical baseline decision.
  This was a dry-run only: `songs.js` and all production song records were
  read, never overwritten or normalized in place; no commit was made.
- Added `src/canonical-normalization.js`, a pure in-memory SAFE AUTO-FIX
  normalizer and invariant analyzer; `tools/dry-run-canonical-normalization.mjs`
  writes generated JSON/Markdown review reports only under ignored
  `reports/canonical-normalization/`; `tests/canonical-normalization.test.js`
  covers approved transformations, non-mutation, invariants, representative
  diff rendering, and CLI safety. `package.json` adds `npm run dry-run:canonical`.
- Candidate result: 121 source songs → 121 candidate songs; all 121 have a
  safe whitespace-only candidate change. It would remove trailing whitespace
  from 547 nonblank lines and make 127 whitespace-only lines empty. It finds
  0 CRLF→LF changes, 0 removable BOM/control characters, and 0 Unicode NFC
  changes. Content UTF-8 bytes would be 132,176 → 131,381.
- All invariants passed: song count, ordered IDs, titles, artists, keys,
  content line count, nonblank-line count, chord-token fingerprints, and
  chord-excluded visible lyric text. The tool neither changes punctuation,
  repeated words, capitalization, labels, section structure, music data, nor
  the two legacy bracket warnings.
- Generated review artifacts (ignored, not Git source):
  `reports/canonical-normalization/phase-2a.json` and
  `reports/canonical-normalization/phase-2a.md`. They list every affected song,
  operation counts, invariant results, representative diffs, and review-only
  reminders. The 910 existing Text QA findings remain review-only.
- Verification passed: `npm test` (10 files, 68 tests);
  `npm run dry-run:canonical` (PASS, 121 → 121);
  `npm run validate:songs` (121 songs, 0 errors, 2 legacy warnings, 64 info);
  `git diff --check`; and `git diff --exit-code -- songs.js`.
- Pending decision: human review of the generated dry-run report before any
  reviewed changeset or application of SAFE AUTO-FIX to production data.

## Phase 2A closeout — preserve legacy data (2026-09-23)

- **User decision:** do not apply the 674 SAFE AUTO-FIX dry-run candidates to
  `songs.js`. The confirmed 121-song legacy baseline is preserved exactly to
  avoid a large, unnecessary whitespace-only data diff. This is a policy
  decision, not an inference from Validator output.
- **LEGACY NORMALIZATION POLICY:** Canonical normalization applies by default
  to new `DRAFT`/import data, especially future TVCHH data. It does not bulk
  rewrite legacy data. A future legacy change, including a technical SAFE
  AUTO-FIX, requires a reviewed changeset, human approval, Validator, Text QA,
  diff review and CI. Lyrics, chords, chord placement and musical data are
  never auto-fixed.
- The two bracket warnings (`[72]` and `[116]`) remain REVIEW-ONLY. The 910
  Text QA findings remain QA signals, not an auto-fix list. No TVCHH extractor,
  import, PDF download, Internet chord lookup, or song-data edit was started.
- Checkpoint scope reviewed: canonical documentation, project log, pure
  normalization/dry-run tooling, tests, package configuration and necessary
  generated-report ignore configuration only. Generated reports remain ignored
  under `reports/canonical-normalization/`; no temporary data, secrets or
  credentials are included in the intended commit.
- Before checkpoint commit, run `npm run check`, `git diff --check`, and
  `git diff --exit-code -- songs.js`; commit only if all pass. Stop after the
  checkpoint. Next phase: **PHASE 3A — TVCHH SOURCE & PDF EXTRACTION SURVEY**.
- Checkpoint commit created locally after all required checks passed; it is not
  pushed. The commit contains documentation, tooling, tests, package/ignore
  configuration only, with `songs.js` byte-identical.

## Phase 3A — TVCHH source & PDF extraction survey (2026-09-23)

- Scope: read-only/survey only, against the confirmed 121-song production
  baseline. No production song data, `songs.js`, legacy record, importer,
  OCR output, PDF, or TVCHH DRAFT was created or changed. No commit was made.
- PDF source inventory: no `.pdf`/`.PDF` file exists in the workspace or Git
  index. Existing references to the resolver URLs for TVCHH 268/337 are URLs,
  not local source assets. They were not downloaded, and the Internet was not
  used as a substitute/cross-check source.
- Result: extraction is **BLOCKED, not inferred**. Filename, size, SHA-256,
  page count, metadata, PDF type, direct text extraction, Vietnamese/layout
  preservation, OCR need, samples, field confidence, chord token recognition
  and chord-to-lyric positioning are all NOT ASSESSED because no actual PDF
  was available. No sample was selected and no comparison to legacy 268/337
  could be made.
- New report: `docs/TVCHH_SOURCE_EXTRACTION_SURVEY.md` documents the negative
  inventory, evidence boundary, conditional Canonical v1 mapping, Internet
  policy, Phase 3B pipeline, and source prerequisite. No generated artifact
  was created because there was no input PDF.
- Next prerequisite: the user must supply or place one authorized TVCHH PDF in
  the workspace. Resume this survey from file inventory, checksum/metadata,
  direct extraction and 5–10 representative samples; only then decide whether
  OCR or a provenance-recorded Internet cross-check is needed.
- Safety verification: `git diff --exit-code -- songs.js` passed; production
  remains 121 songs. This phase stops before any TVCHH import.

## Phase 3A.1 — TVCHH Drive inventory & Priority Batch 1 matching (2026-09-23)

- Read-only Google Drive inventory completed for the user-provided folder:
  389 items, including 388 PDFs and one XLSX catalog. There are 387 unique
  numeric PDFs covering `1.pdf` through `387.pdf` with no numeric gap or
  duplicate; one additional aggregate `Ton-vinh-Chua-hang-huu.pdf` is recorded
  as source provenance only and was not downloaded or extracted.
- Priority Batch 1 contains 84 requested / 84 unique numbers. All 84 are
  FOUND by exact numeric filename; MISSING 0, DUPLICATE 0, AMBIGUOUS 0.
  The user-entered brace forms for 216/217 were treated only as requests for
  numeric IDs 216 and 217, not as canonical filenames.
- Created `data/import-manifests/tvchh-priority-batch-1.json`: an
  identity/provenance/status-only inventory manifest with Drive file ID, exact
  filename, MIME type, size, URL and modified time. It contains no lyrics,
  chords, canonical data, production data, or approval state.
- Proposed later bounded pilot numbers: 1, 102, 216, 268, 337 and 386. This
  covers range edges/interior and gives future comparison candidates for
  legacy 268/337, but does not claim any PDF content/layout/chord property.
- Google Drive remains the current source location. No Cloudflare/R2 sync,
  bulk download, extraction, OCR, Internet cross-check, TVCHH import or song
  data change occurred. Next gate is a read-only extraction experiment on the
  approved pilot PDFs, retaining raw snapshots and DRAFT-only outputs.
- Safety: production baseline remains 121 songs; `songs.js` was not changed.
  No commit was made in this phase.

## Phase 3A.2 — TVCHH direct PDF extraction pilot (2026-09-23)

- Read-only bounded acquisition downloaded exactly six inventoried Google Drive
  PDFs—1, 102, 216, 268, 337 and 386—into ignored
  `reports/tvchh-extraction/raw/`. No other numbered file, aggregate PDF,
  Cloudflare/R2 resource, Internet cross-check or upload was used.
- Direct benchmark used Poppler 24.02.0 (`pdfinfo`, `pdffonts`,
  `pdfimages -list`, `pdftotext`, `pdftotext -layout`, `pdftohtml -xml` and
  `pdftoppm`). Per-file raw PDFs, SHA-256, PDF metadata, font listings, image
  listings, plain/layout snapshots, coordinate XML and two visual renders are
  generated/ignored under `reports/tvchh-extraction/`.
- All six are IMAGE/SCAN score PDFs for direct-extraction purposes: 11 image
  strips in each one-page sample, 15 across 337's two pages; plain/layout
  extraction contains only page line feeds and coordinate XML contains zero
  text nodes. Direct collection/title/credit/key/meter/lyrics/chord/section
  extraction and chord positioning are therefore NOT EXTRACTABLE. No OCR or
  OMR was installed or run.
- Limited visual golden checks: 268 and 337 title words match legacy with
  presentation-only casing differences. Their visible score key/chord
  presentations differ from legacy (A-flat-family vs F for 268; Gm/two-flat
  score vs Dm legacy for 337), classified SOURCE_DIFFERENCE/REVIEW REQUIRED.
  Exact lyrics, chord token/order/count/placement and sections remain
  UNRESOLVED because there is no direct machine text.
- Decision gate: **OMR_REQUIRED**. Direct text/coordinate extraction is not
  viable for a TVCHH parser. The next bounded work is Phase 3A.3 OMR/OCR
  benchmark design/execution with raw snapshots and DRAFT-only output; do not
  build a production importer yet.
- Safety: production remains 121 songs; `songs.js`, legacy 268/337 and all
  song data are unchanged. No DRAFT was approved and no commit was made.

## Phase 3A.3 — TVCHH OCR/OMR bounded benchmark (2026-09-23)

- Scope: bounded, read-only benchmark of exactly six existing pilot PDFs (1,
  102, 216, 268, 337 and 386; 337 has two pages) from the previously
  inventoried Google Drive source. PDF Drive remains primary. No production
  song, TVCHH import, approval, Cloudflare/R2 operation, bulk download, or
  commit occurred.
- Image baseline: each source is an indexed 8-bit 200-DPI image-strip PDF;
  raw 300-DPI 2481×3509 PNG renders were compared with generated grayscale +
  0.5%-autocontrast copies. No skew/crop/contrast evidence justified deskew or
  crop. Preprocessing lowered peak OCR memory slightly but made no material
  recognition improvement, so it is not a normalization policy.
- OCR: native package installation was unavailable without system-admin
  credentials. A local temporary Tesseract.js 5.1.0-288-g2a9c1 benchmark with
  local `vie+eng` traineddata ran on all seven rendered pages. It retains raw
  text, TSV/hOCR boxes, blocks and engine confidence under ignored reports.
  Vietnamese text, simple titles/credits and several chord tokens are usable
  candidate evidence; notation-heavy lyric regions have substantial OCR noise
  and diacritic errors. OCR boxes are available, but engine confidence never
  approves a field.
- OMR: Audiveris 5.11.0 was downloaded from its official release and unpacked
  only under `/tmp`; it was not system-installed or committed. Full headless
  export processing on pilot 1 reached BEAMS but exceeded the execution
  runner's limit before valid MusicXML. GRID-only staff/layout processing
  completed on all six: 2–9 systems, 14.46–29.96 seconds and 305–402 MiB peak
  RSS. Audiveris had no configured native tessdata in this environment, so it
  provided no validated OMR text. Full OMR remains heavy/unmeasured to
  completion; GRID is acceptable only as layout support.
- Fusion: a geometry-only OCR probe made 34 experimental chord-to-lyric
  candidates for 268/337. Every record carries page/bounding-box/source-token
  evidence and `REVIEW REQUIRED`. Parallel lyric lines and OCR musical noise
  make automatic chord placement unsafe. Chord token recognition is MEDIUM;
  chord-to-lyric association is LOW/REVIEW REQUIRED.
- Legacy comparison: OCR confirms candidate A-flat-family tokens for 268 and
  Gm/D/F#/Cm/D7-family tokens for 337, while preserving Phase 3A.2's PDF-vs-
  legacy SOURCE_DIFFERENCE finding (268 PDF family vs legacy F; 337 PDF family
  vs legacy D). Title casing is presentation-only where visually matched;
  exact lyrics/chord order/placement remain unresolved. Neither legacy nor OCR
  was selected as canonical.
- Decision: **HUMAN_ASSISTED_REQUIRED**. A future bounded Phase 3B may build a
  provenance-rich OCR `DRAFT` prototype with raw snapshots, field evidence,
  geometry and mandatory visual review. It must not auto-repair lyrics/chords
  or export to `songs.js`. Re-test complete Audiveris/MusicXML on a runner that
  permits longer execution and configured OCR data before adopting it.
- New documentation: `docs/TVCHH_OCR_OMR_BENCHMARK.md`. Generated artifacts
  are ignored via the existing `reports/tvchh-extraction/` rule. Final safety
  checks passed: `npm run check` (Validator: 121 songs, 0 errors, 2 legacy
  bracket warnings, 64 info; Text QA: 910 non-blocking findings; Vitest: 10
  files/68 tests), `git diff --check`, and
  `git diff --exit-code -- songs.js`. No data change is authorized.

## Phase 3A closeout — TVCHH extraction research checkpoint (2026-09-23)

- **Phase 3A is closed.** This checkpoint consolidates the source survey,
  Drive inventory, Priority Batch 1 manifest, direct extraction pilot and
  bounded OCR/OMR benchmark. It does not start Phase 3B, create an importer,
  create an approved record, or modify production song data.
- **Source strategy:** Google Drive PDF is the primary source. The inventory
  establishes 387 unique numeric PDFs (`1.pdf`–`387.pdf`) plus one aggregate
  PDF. Priority Batch 1 is **84/84 FOUND**, with 0 MISSING, 0 DUPLICATE and 0
  AMBIGUOUS. The manifest is identity/provenance-only, with no lyrics, chords
  or production records.
- **Direct extraction:** the six bounded pilots (1, 102, 216, 268, 337 and
  386) prove that this source is IMAGE/SCAN for extraction purposes; it has no
  selectable score text or PDF text boxes. Direct text parsing is not a viable
  TVCHH import path.
- **OCR-first Phase 3B architecture:** `PDF → Render → OCR vie+eng → Raw OCR
  Snapshot + Bounding Boxes → Parse candidates → Canonical DRAFT → Visual
  Review → Human corrections → Validation`. The pipeline stops at Validation.
  It must not approve, write `songs.js`, or export production data in Phase
  3B. OCR is local/light and supplies TSV/hOCR geometry suitable for evidence-
  rich DRAFTs, but cannot auto-approve lyrics, chords, placement, credits,
  keys or structure.
- **OMR strategy:** Audiveris GRID staff recognition is useful and resource-
  acceptable as optional research/layout support. Full OMR is heavy and did
  not yield valid lyrics, chords or MusicXML in the bounded benchmark. It is
  not on the default Phase 3B import path; retain it only as an optional future
  fallback/research tool after a suitable longer-running benchmark.
- **Decision:** **HUMAN_ASSISTED_REQUIRED.** OCR candidates and any spatial
  chord association remain DRAFT/REVIEW REQUIRED, never automatic production
  data.
- **Legacy 268/337:** PDF source and legacy records have a
  SOURCE_DIFFERENCE in key/chord presentation. Do not modify legacy, treat it
  as comparison rather than absolute ground truth, replace PDF with legacy, or
  merge either source automatically. All differences remain REVIEW REQUIRED.
- **Changeset/security review:** intended checkpoint content is the five TVCHH
  reports, the Priority Batch 1 provenance manifest, this log and the required
  `reports/tvchh-extraction/` ignore rule. Git tracks no PDF, render, OCR TSV/
  hOCR, OMR output, Audiveris binary, model or cache. A targeted credential
  scan found no credential/secret material; matching words in documentation
  were ordinary technical terms only. No unnecessary local machine path or
  personal data is included in the tracked changes.
- Verification before checkpoint: `npm run check` passed (Validator: 121 songs,
  0 errors, 2 legacy bracket warnings, 64 info; data revision valid; Text QA:
  910 non-blocking findings; Vitest: 10 files/68 tests). Required production
  baseline remains 121 songs. Run final `git diff --check` and
  `git diff --exit-code -- songs.js`, then commit only
  `docs: establish TVCHH extraction strategy`, do not push, and stop. Next
  phase: **PHASE 3B — bounded OCR DRAFT prototype**.
- Checkpoint commit was created locally with that exact message. It contains
  the reviewed source/inventory/pilot/benchmark documentation, provenance
  manifest, Project Log and ignore rule only; it contains no production song
  data or generated artifact. No push was performed.
