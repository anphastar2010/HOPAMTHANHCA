# Phase 4A — Textual QA survey and design

Status: **PHASE 4C DONE — reviewed by ChatGPT; checkpoint release in progress**
Dataset revision: `8454212329875e2d11a3d062d4549f8feadf0293`
Safety rule: this phase does not install Vale, add executable QA rules, or edit
`songs.js`.

## GOAL

Build a lightweight, read-only QA workflow that helps a human locate and
classify formatting or textual anomalies in 123 songs. The workflow must keep
structural failures separate from high-confidence presentation issues and from
editorial suggestions. It must never infer that a lyric or chord is correct,
and it must never rewrite song data.

## CURRENT_STATE

- Phase 3 is closed after independent ChatGPT review. The existing validator,
  Vitest suite, changeset review, provenance, revision guard, CI, and browser
  smoke test are operational.
- Git is on `main` at `8454212`, with the reviewed Phase 1–3 work still
  uncommitted. `HEAD` and `origin/main` are synchronized. `songs.js` has no
  diff.
- `src/song-validator.js` owns schema, ID/title duplication, key, URL, bracket
  count, and verse-spacing checks. Only structural errors fail its CLI.
- The test suite has 7 files and 31 tests. The latest full verification passed.
- No repository or local file named `MasterPrompt` was found. The Phase 4 user
  brief is therefore treated as the controlling master prompt.

## FINDINGS

The read-only survey loaded the library through `tools/load-songs.mjs` and did
not evaluate or rewrite it.

- 123 songs, 2,547 logical content lines, 2,054 nonblank lines, 110,261 content
  characters, and 5,862 matched chord tokens.
- All 123 artist fields are populated. No tab, non-breaking space, zero-width
  character, non-NFC string, or empty bracket token was found by the survey.
- The two known bracket problems were localized without changing them:
  - position 73, `[72] MỪNG KHEN GIÊHÔVA`, content line 24:
    `Hát Gm]lên hát lên người [Cm]ơi!`
  - position 118, `[116] XIN THA THỨ`, content line 2:
    `Dm]Phước cho ai nào có sự vi [A]phạm được tha [F]thứ`
- 550 nonblank lines in 109 songs end in whitespace. Every song also has at
  least one whitespace-only separator or terminal line; this is legacy format
  debt and must not be bulk-fixed.
- Only 2 nonblank lines contain raw repeated spaces, and 3 nonblank lines begin
  with a space. These are higher-confidence presentation findings than a naive
  count produced after deleting chord tokens.
- 25 punctuation-spacing matches occur in 22 songs. Many are section labels
  such as `ĐK:` or `Đk:` without a following space; the remaining prose cases
  need separate classification.
- Chorus labels appear in at least five forms: `ĐK:`, `Đk:`, `Đk.`, `ĐK :`,
  and `ĐK ` (22 detected occurrences). `Intro:` was also observed.
- Verse numbering is mixed: 136 occurrences in 64 songs use `1.Bỏ`, while 49
  occurrences in 32 songs use `1. Bỏ`. A chord before the number can hide the
  pattern from the current validator, so analysis must operate on logical song
  lines after chord-aware tokenization.
- 15 repeated-punctuation cases occur in 10 songs and 6 lyric lines in 3 songs
  exceed 100 characters after chords are removed. Ellipses and long lines can
  be intentional musical notation, so they are human-review signals.
- A chord token directly precedes a word 1,929 times in 120 songs and appears
  directly after a word 38 times in 14 songs. Both patterns can represent
  intentional chord placement inside a phrase or syllable. They must not be
  treated as generic spacing errors.
- 114 titles are uppercase and 119 contain a bracketed number. These are
  dominant library conventions, not spelling errors.

The survey also proved that deleting `[C]` before checking spaces creates false
positives: `[C] Chúa` can become an apparent double space. Rules must tokenize
or mask a chord without changing the adjacency of lyric characters.

## QA_CATEGORIES

| Class | Examples | Default result | CI behavior |
|---|---|---|---|
| Structural certainty | invalid library, missing required field, duplicate ID, empty title/content, unreadable revision artifact | ERROR | FAIL |
| Structural chord regression | newly introduced unmatched bracket or definitely malformed chord token | ERROR for new regression; legacy item remains visible | FAIL only when new or changed relative to approved baseline |
| High-confidence presentation | nonblank leading/trailing whitespace, raw double spaces, space before punctuation, forbidden invisible characters | WARNING | report only during initial rollout |
| Convention inconsistency | `1.Bỏ` vs `1. Bỏ`, `ĐK:` vs `Đk.`, title numbering/case | INFO | never fail until a human approves a canonical convention |
| Editorial review | long line, repeated punctuation, suspected duplicate word, unusual line break | INFO / REVIEW | never fail |
| Musical placement | chord adjacent to a word or inserted inside a word/syllable | suppressed by default; optional REVIEW | never fail |

Existing findings are baseline debt. CI must detect regressions without forcing
an immediate cleanup of all existing content.

## VALE_ROLE

Vale is suitable as an optional style-rule engine, not as the primary parser.
Its official documentation says that it focuses on author-defined style rather
than deciding general correctness. Modern Vale can use tree-sitter Views to
extract string literals from JavaScript, and it supports scoped rules and
token ignores. Sources:

- <https://vale.sh/features/views>
- <https://vale.sh/features/code>
- <https://vale.sh/features/markup>
- <https://docs.vale.sh/>

Direct linting of `songs.js` is not recommended. Each `content` value is an
escaped JSON string on one physical source line, which produces poor logical
line locations, and generic prose rules do not understand chord placement.
English documentation packages, spelling dictionaries, sentence-length rules,
passive-voice rules, and grammar packages are not appropriate for Vietnamese
song lyrics.

If Phase 4B proves Vale useful, use only a pinned Vale binary and a small local
style on a generated temporary Markdown corpus, one song per file. Preserve
logical lyric lines, carry song ID and dataset revision in a manifest, and hide
`[C]`, `[Am7]`, `[G/B]`, and other validated chord tokens with `TokenIgnores` or
equivalent markup. Start every Vale alert as suggestion/warning. Promote a rule
only after representative precision tests and human approval.

Vale should initially cover only simple house-style conventions that are hard
to express incorrectly, such as an approved spelling of a section label. If
the custom validator already reports a category with better song/line context,
Vale should not duplicate it.

## CUSTOM_VALIDATOR_ROLE

The custom JavaScript layer remains authoritative for:

1. Loading `songs.js` safely and preserving schema/revision context.
2. Tokenizing chord spans before any textual rule runs.
3. Reporting the song position, stable ID, title, logical content line,
   matched snippet, severity, rule rationale, and review status.
4. Detecting bracket locations, invisible Unicode, whitespace, numbering,
   section-label variants, and punctuation patterns with project-specific
   exclusions.
5. Comparing finding fingerprints with an approved baseline so legacy debt
   remains visible while new structural regressions can fail CI.
6. Emitting machine-readable JSON and a nontechnical HTML report without
   offering or applying automatic fixes.

Rules should be pure functions over synthetic song objects. Policy and
presentation should stay separate from detection so severity can change
without rewriting matching logic.

## BATCH_STRATEGY

Use a calibration set before reviewing the full library: positions 1, 2, 7,
10, 46, 73, 118, and 123. It covers both old and newer formatting, numbered and
unnumbered titles, chorus and intro notation, both known bracket warnings, and
the imported-title pattern. Calibration reviews rule precision only; it does
not edit those songs.

After calibration, freeze a batch manifest against the dataset revision. Store
stable song IDs in the manifest and show array positions only as a convenience.
Use 15 contiguous batches:

| Batch | Positions | Songs | Nonblank lines |
|---|---:|---:|---:|
| 01 | 1–8 | 8 | 117 |
| 02 | 9–16 | 8 | 120 |
| 03 | 17–24 | 8 | 107 |
| 04 | 25–32 | 8 | 115 |
| 05 | 33–40 | 8 | 92 |
| 06 | 41–48 | 8 | 125 |
| 07 | 49–56 | 8 | 110 |
| 08 | 57–64 | 8 | 145 |
| 09 | 65–72 | 8 | 125 |
| 10 | 73–80 | 8 | 126 |
| 11 | 81–88 | 8 | 147 |
| 12 | 89–96 | 8 | 168 |
| 13 | 97–104 | 8 | 194 |
| 14 | 105–112 | 8 | 188 |
| 15 | 113–123 | 11 | 175 |

For each batch: generate report → human marks accept/ignore/defer → create only
approved edits as a changeset → run changeset review and validator → inspect
diff → smoke test → merge. Do not have more than one unreviewed data batch in
flight.

The human report should open as a static HTML page and begin with plain-language
cards: songs reviewed, errors, warnings, suggestions, and unchanged legacy
items. Group findings by song. Each row should show the logical lyric line,
highlighted snippet, explanation, and checkboxes/status for `Sửa`, `Giữ nguyên`,
or `Xem lại sau`. JSON is the source for automation; console output is a short
summary. Generated reports should not be committed unless explicitly chosen as
review evidence.

## TEST_PLAN

Before running QA across the whole library, add tests for:

1. Chord-aware masking: `[C] Chúa`, `[C]Chúa`, `trong[Am]lòng`, `[G/B]`, and
   consecutive chords must not create synthetic spaces or punctuation alerts.
2. Exact logical line mapping from a song's `content` string to report output.
3. Vietnamese NFC and combining-mark fixtures, plus tabs, NBSP, zero-width
   characters, and normal accented text.
4. Balanced, extra-close, missing-close, empty, slash, flat, sharp, suspended,
   seventh, and extended chord tokens.
5. Verse and chorus-label variants, including a leading chord before a label.
6. High-confidence whitespace and punctuation positives paired with realistic
   negative examples from the calibration set.
7. Repeated punctuation and long-line heuristics remaining non-failing.
8. Stable finding fingerprints and baseline comparison: existing findings do
   not fail, but a new structural finding does.
9. Deterministic JSON/HTML ordering and correct escaping of Vietnamese text,
   brackets, quotes, and HTML characters.
10. Exit-code policy: only approved ERROR classes fail; WARNING/INFO return
    success.
11. Integration over a cloned in-memory library proving no mutation and no
    write to `songs.js`.
12. If Vale is piloted: version pinning, config compilation, chord-ignore
    behavior, UTF-8, source mapping, zero automatic fixes, and precision on the
    calibration set.

## RISKS

- Removing chords before linting manufactures spacing errors. Tokenize them.
- Treating all chord/word adjacency as malformed would flag almost the whole
  library and could damage musical placement.
- English Vale packages would create irrelevant Vietnamese grammar and spelling
  noise.
- A canonical formatting choice such as `ĐK:` or `1. ` is editorial policy,
  not an objective fact; approve it before enforcement.
- A baseline can hide regressions if it stores only counts. Store fingerprints
  using rule code, song ID, logical line, and a stable match signature.
- Generated line numbers become stale after edits. Bind every report and batch
  to `baseCommit`/dataset revision.
- HTML reports must escape all song content and remain static; never render
  lyric text with `innerHTML`.
- Broad cleanup would create an unreviewable diff. Keep batches small and use
  the existing changeset workflow.

## PROPOSED_FILES

No file below is created during Phase 4A. Proposed Phase 4B scope:

- `src/text-qa.js` — pure chord-aware detectors and fingerprints.
- `tools/report-text-qa.mjs` — read-only CLI and JSON/HTML report generator.
- `qa/text-qa-policy.json` — rule levels, rationale, and baseline policy.
- `qa/batches.json` — dataset revision plus stable song IDs per batch.
- `tests/text-qa.test.js` — unit and policy tests.
- `tests/fixtures/text-qa/` — small synthetic Vietnamese/chord fixtures.
- `docs/TEXT_QA_GUIDE.md` — nontechnical review workflow.
- `.gitignore` entry for generated `reports/text-qa/` output.
- Optional only after proof: `.vale.ini`, `styles/HopAmThanhCa/`, and a pinned
  Vale installation method.

## SUCCESS_CRITERIA

Phase 4A is complete when ChatGPT and the project owner approve this category,
severity, Vale, batch, report, and test design without any song-data change.

Phase 4B may then start with a read-only custom QA engine and calibration
report. It succeeds only if results are deterministic, chord-aware, mapped to
song/logical line, understandable to a nontechnical reviewer, protected by
tests, and unable to rewrite `songs.js`. Vale remains optional until a pinned
prototype demonstrates useful low-noise findings on the calibration set.

## CHECKPOINT

**STOP BEFORE IMPLEMENTATION**

Wait for ChatGPT review before installing Vale, adding executable QA rules, or
changing any song data.
