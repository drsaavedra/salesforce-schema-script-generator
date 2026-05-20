# QA Test 3 — Edge Cases & UI Behaviours

**Scope:** Navigation, modal, accessibility, copy/download, and miscellaneous UI edge cases.  
**Method:** Static code trace through `app.js`, `index.html`, and `styles.css`.

---

## How to run

Feed this file as the prompt to a QA subagent, pointing it at:
- `docs/app.js`
- `docs/index.html`
- `docs/styles.css`
- `docs/constants.js`

---

## Test cases

### TC3-01 — BreadcrumbList toggle: output
When `state.includeBreadcrumbList` is true, `buildScript()` appends a second `<script type="application/ld+json">` block containing `{!Record.BreadcrumbList}`.  
**Expected:** Exactly two script blocks in output. Unchecking removes the second block.

### TC3-02 — BreadcrumbList toggle: Schema Preview modal
When checkbox is checked and `openSchemaPreview()` is called, the modal appends a `schema-preview-block-divider` and an expression node showing `{!Record.BreadcrumbList}`.  
**Expected:** Both product schema tree AND breadcrumb section visible in modal.

### TC3-03 — Modal focus trap: inert attribute
`openSchemaPreview()` sets `inert = true` on `.app-header`, `.schema-bar`, `.wizard-container`.  
`closeSchemaPreview()` removes inert from all three.  
**Expected:** Background content is inaccessible while modal is open; restored on close.

### TC3-04 — Modal: Escape key closes
`document.addEventListener("keydown")` checks `e.key === "Escape"` and calls `closeSchemaPreview()` when overlay is not hidden.  
**Expected:** Escape key closes modal from any step.

### TC3-05 — Modal: backdrop click closes
`schemaPreviewOverlay` click listener checks `e.target === elements.schemaPreviewOverlay`.  
**Expected:** Clicking outside the dialog closes the modal; clicking inside does not.

### TC3-06 — Modal: focus returns to trigger
`closeSchemaPreview()` calls `elements.previewSchemaButton.focus()`.  
**Expected:** Focus returns to "Preview Schema" button after modal closes.

### TC3-07 — Step navigation: forward and back
`goToStep(n)` correctly hides/shows wizard sections and updates `aria-current` and `is-done` classes on step nav buttons.  
**Expected:** Step 1 shown on load; Step 2 after Next; Step 3 after Finish. Back buttons work in reverse.

### TC3-08 — Step navigation: selections preserved
Going back from Step 2 to Step 1 and forward again must not reset `state.selectedFields` or `state.mappings`.  
**Expected:** Field selections and all mappings survive back-forward navigation.

### TC3-09 — Next button disabled at 0 fields
`renderFieldMeta()` sets `elements.nextButton.disabled = count === 0`.  
**Expected:** Next is disabled when no fields are selected; re-enabled immediately when any field is selected.

### TC3-10 — Search filter: label, path, description
`renderFieldTiles()` filters by `f.label`, `f.path`, and `f.description` (case-insensitive).  
**Expected:** Fields matching any of the three properties appear in results.

### TC3-11 — Search: "Select all matching" button
Button is shown only when `query` is non-empty and `filtered.length > 0`. Text reads `"Select all N matching"`.  
**Expected:** Hidden when no query or no results. Clicking selects and maps all filtered fields.

### TC3-12 — Clear button resets counter
`clearFieldsButton` calls `state.selectedFields.clear()` and `renderAll()`.  
**Expected:** Field counter shows `0 / N`, Next is disabled.

### TC3-13 — Reset button (Step 2)
`resetMappingsButton` loops over `allFields()` and resets ALL mappings to `defaultMapping(field)`.  
**Expected:** Every selected field's mapping reverts to default, including non-recommended ones.

### TC3-14 — Download button
`downloadOutput()` creates a `Blob` with `type: "text/html"`, creates an anchor with the correct filename (`${schemaType.toLowerCase()}-schema-head-markup.html`), clicks it, removes it, and revokes the object URL.  
**Expected:** No memory leak (revoke called), correct filename, correct MIME type.

### TC3-15 — Copy button: clipboard API success
`copyOutput()` calls `navigator.clipboard.writeText()`. On success, `copyStatus.textContent = "Copied."` and clears after 2200ms.  
**Expected:** Success path works; status clears automatically.

### TC3-16 — Copy button: clipboard API failure, execCommand fallback
If `navigator.clipboard.writeText()` rejects, tries `document.execCommand("copy")`.  
**Expected:** "Copied." shown on execCommand success.

### TC3-17 — Copy button: total failure
If both clipboard methods throw, shows `"Copy failed — select the text and copy manually."`.  
**Expected:** No false "Copied." on total failure.

### TC3-18 — Disabled schema card (ProductGroup)
`renderSchemaTypes()` click handler checks `if (node.disabled) return;` before any state change.  
**Expected:** Clicking ProductGroup card does nothing — no step navigation, no state mutation.

### TC3-19 — propertyValue: Remove button visibility
`appendTreePropertyValueField()` only renders the Remove button when `mapping.entries.length > 1`.  
**Expected:** Single entry has no Remove button. Two or more entries each have Remove.

### TC3-20 — propertyValue: Add entry
"+ Add property" button pushes `{ label: "", expression: "" }` to `mapping.entries`, calls `renderMappings()` and `renderOutput()`.  
**Expected:** New empty entry row appears; output updates (empty entry filtered from output by the `filter(e => e.label || e.expression)` check).

### TC3-21 — graphToJsonWithExpressions: $ in expression values
Replacement uses `() => value` (not `value` directly).  
**Expected:** Expression values containing `$&`, `$$`, `$1`, `$'` are emitted literally without regex replacement pattern interpretation.

### TC3-22 — init() flow
`init()` awaits `loadSchemaData()`, then calls `resetRecommendedFields()`, `goToStep(1)`, `renderAll()` in sequence.  
**Expected:** No race condition — fields are populated before recommended defaults are applied.

### TC3-23 — Step nav aria-current
`updateStepNav()` sets `aria-current="step"` on the active step button and `"false"` on others. Adds `is-done` to completed steps.  
**Expected:** Correct ARIA state at each step for screen reader navigation.
