# QA Test Suite

Static code analysis tests for the Schema Script Generator. Run before every release to catch regressions.

## Test files

| File | Scope |
|---|---|
| `qa-1-field-combinations.md` | All field valueTypes produce correct JSON-LD output |
| `qa-2-data-types-validation.md` | Data type coercion, warnings, FIELD_EXCLUSIONS, TTL parser |
| `qa-3-edge-cases-ui.md` | Navigation, modal, copy/download, accessibility, edge cases |
| `qa-4-mobile-tablet-views.md` | Mobile form view, tablet tree view, responsive dispatch, sticky footer |

## How to run

Spawn 4 subagents in parallel in Claude Code, one per file. Each agent reads the test file and the relevant source files (`docs/app.js`, `docs/schema-parser.js`, `docs/constants.js`, `docs/index.html`, `docs/styles.css`) and traces the code statically against each test case.

Example prompt for each agent:

> You are a QA engineer. Read the test cases in `tests/qa-1-field-combinations.md` and the source files in `docs/`. Trace the code statically for each test case. Report PASS or FAIL with severity, description, affected function/line, and expected vs actual behaviour.

Repeat for `qa-2-data-types-validation.md`, `qa-3-edge-cases-ui.md`, and `qa-4-mobile-tablet-views.md`.

## Release gate

All test cases must PASS before merging to `main` and pushing to GitHub Pages.

If a test fails, fix the bug, re-run the affected test file, and confirm PASS before releasing.

## Adding tests

When a new feature is added or a bug is fixed, add a test case to the relevant file covering the new behaviour. This prevents regressions in future releases.
