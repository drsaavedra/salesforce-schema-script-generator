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

Spawn 4 subagents in parallel in Claude Code, one per file. Each agent reads the test file and the relevant React source files listed below, and traces the code statically against each test case.

### Source files

The app is built with React 18 + Vite. All logic lives in `src/`. There is no vanilla JS in `docs/app.js` or `docs/index.html` for the React build — point agents at the React source:

- `src/App.jsx` — top-level state, step navigation, field/mapping handlers
- `src/components/FieldList.jsx` — Step 1: field tile grid, search, Select All / Recommended / Clear
- `src/components/MappingEditor.jsx` — Step 2: tree view (desktop) and flat form view (mobile ≤640px), including `TreeInput`, `FlatInput`, `TreeOfferField`, `FlatOfferField`, `TreePropertyValueField`, `FlatPropertyValueField`, `TreeObjectField`
- `src/components/ScriptOutput.jsx` — Step 3: output textarea + Copy/Download. Also contains module-private helpers: `applySelectedField`, `graphToJsonWithExpressions`, `applyCustomVariations`, `buildScript`, `buildWarnings`, `detectOutputErrors`
- `src/components/SchemaPreviewModal.jsx` — Schema Preview modal. Contains parallel (duplicated) business logic: `applySelectedFieldToGraph`, `applyCustomVariationsToGraph`, `buildPreviewGraph`
- `src/components/StepsNav.jsx` — Step nav buttons with `aria-current` and `is-done`
- `src/components/VariationAttrsPanel.jsx` — Custom variation attributes card (Step 2 sibling to MappingEditor)
- `src/schema-parser.js` — TTL parser, `FIELD_OVERRIDES`, `FIELD_EXCLUSIONS`, `RECOMMENDED_ORDER`, `loadSchemaFields()`
- `src/constants.js` — `SCHEMA_REGISTRY`, `OFFER_TYPES`, `SELLER_TYPES`, `BRAND_TYPES`, `ORGANIZATION_TYPES`, `TYPE_HINT_DETAILS`, `DEFAULT_OFFER`
- `src/styles.css` — all CSS; includes responsive breakpoints at `@media (max-width: 640px)`
- `index.html` — app shell (Vite entry point); no logic

### Example prompt for each agent

> You are a QA engineer. Read the test cases in `tests/qa-1-field-combinations.md` and the React source files in `src/`. The app uses React 18 + Vite — all logic lives in JSX components and module-private helper functions (not globally accessible like the old vanilla `app.js`). Trace the code statically for each test case. Report PASS or FAIL with severity, description, affected component/function/line, and expected vs actual behaviour.

Repeat for `qa-2-data-types-validation.md`, `qa-3-edge-cases-ui.md`, and `qa-4-mobile-tablet-views.md`.

## Release gate

All test cases must PASS before merging to `main` and pushing to GitHub Pages.

If a test fails, fix the bug, re-run the affected test file, and confirm PASS before releasing.

## Adding tests

When a new feature is added or a bug is fixed, add a test case to the relevant file covering the new behaviour. This prevents regressions in future releases.
