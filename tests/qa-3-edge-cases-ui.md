# QA Test 3 — Edge Cases & UI Behaviours

**Scope:** Navigation, modal, accessibility, copy/download, and miscellaneous UI edge cases.  
**Method:** Static code trace through React source components.

---

## How to run

Feed this file as the prompt to a QA subagent, pointing it at:
- `src/App.jsx`
- `src/components/ScriptOutput.jsx`
- `src/components/SchemaPreviewModal.jsx`
- `src/components/FieldList.jsx`
- `src/components/StepsNav.jsx`
- `src/components/VariationAttrsPanel.jsx`
- `src/styles.css`

---

## Test cases

### TC3-01 — BreadcrumbList toggle: output
When `includeBreadcrumbList` is true, trace `buildScript()` in `ScriptOutput.jsx` lines 169–183.  
**Expected:** Exactly **one** script block whose content is a JSON array `[product, breadcrumb]`. The BreadcrumbList entry has `"itemListElement": "{!Record.BreadcrumbList}"`. Unchecking emits a single Product object (no array wrapper).

### TC3-02 — BreadcrumbList toggle: Schema Preview modal
When `includeBreadcrumbList` is true and the Preview Schema modal is open, trace `SchemaPreviewModal.jsx` lines 267–276.  
**Expected:** Both product schema tree AND a `schema-preview-block-divider` element labeled "BreadcrumbList" AND a second `<JsonTreeNode>` showing the BreadcrumbList object (with `itemListElement: "{!Record.BreadcrumbList}"`) are visible in the modal.

### TC3-03 — Modal focus trap: inert attribute
`SchemaPreviewModal.jsx` `useEffect` at lines 210–220.  
**Expected:** When `isOpen` is true, `header.inert = true` and `wizard.inert = true` are set on `.app-header` and `.wizard-container`. The cleanup function sets both back to `false`. Background content is inaccessible while modal is open; restored on close.

### TC3-04 — Modal: Escape key closes
`SchemaPreviewModal.jsx` `useEffect` at lines 230–235 attaches a `keydown` listener on `document` when `isOpen` is true. Checks `e.key === "Escape"` and calls `onClose()`.  
**Expected:** Escape key closes modal from any step. Cleanup removes the listener when `isOpen` becomes false or the component unmounts.

### TC3-05 — Modal: backdrop click closes
`onClick={e => { if (e.target === e.currentTarget) onClose(); }}` on `.schema-preview-overlay` in `SchemaPreviewModal.jsx` line 247.  
**Expected:** Clicking outside the dialog (on the overlay) closes the modal; clicking inside the `.schema-preview-dialog` does not.

### TC3-06 — Modal: focus returns to trigger
`App.jsx` — the "Preview Schema" button has `ref={previewButtonRef}` attached. The `onClose` callback passed to `<SchemaPreviewModal>` calls `setIsPreviewOpen(false)` then `previewButtonRef.current?.focus()`.  
**Expected:** After closing the modal via the close button, Escape key, or backdrop click (all paths invoke the same `onClose` callback), focus returns to the "Preview Schema" button in the toolbar.

### TC3-07 — Step navigation: forward and back
`setCurrentStep(n)` in `App.jsx` drives which step JSX block renders. `StepsNav.jsx` derives `isDone` (`n < currentStep`) and `isCurrent` (`n === currentStep`) from props.  
**Expected:** Step 1 shown on load (`currentStep = 1`); Step 2 after Next (`setCurrentStep(2)`); Step 3 after Finish (`setCurrentStep(3)`). Back buttons call `setCurrentStep(2)` / `setCurrentStep(1)`. `aria-current="step"` set on the active step button.

### TC3-08 — Step navigation: selections preserved
Going back from Step 2 to Step 1 and forward again.  
**Expected:** `selectedFields` and `mappings` are top-level App.jsx state (not reset on step change). Field selections and all mappings survive back-forward navigation automatically.

### TC3-09 — Next button disabled at 0 fields
`FieldList.jsx` line 115: `disabled={selectedFields.size === 0}`.  
**Expected:** Next is disabled when no fields are selected; re-enabled immediately when any field is selected (React re-renders FieldList with updated `selectedFields.size`).

### TC3-10 — Search filter: label, path, description
`FieldList.jsx` `filtered` constant, lines 18–24: filters by `f.label`, `f.path`, and `f.description` (all lowercased against `query.toLowerCase()`).  
**Expected:** Fields matching any of the three properties appear in results.

### TC3-11 — Search: "Select all matching" button
`FieldList.jsx` lines 58–66: button shown only when `query` is non-empty and `filtered.length > 0`. Text reads `"Select all N matching"`. Clicking calls `handleSelectAllMatching()` (lines 27–31) which toggles all filtered fields not yet selected.  
**Expected:** Hidden when no query or no results. Clicking selects and maps all filtered fields.

### TC3-12 — Clear button resets all state
`handleClearAll()` in `App.jsx` lines 81–86.  
**Expected:** Resets all four pieces of related state simultaneously:
- `selectedFields` → empty Set
- `mappings` → `{}`
- `customVariations` → `[]`
- `includeBreadcrumbList` → `false`

**Regression guard:** Navigate to Step 3 and check "Include BreadcrumbList". Add a custom variation attribute with a name. Go back to Step 1 and click Clear. Then click "Preview Schema". The modal must show an empty Product schema with no variation rows and no BreadcrumbList block.

### TC3-13 — Reset button (Step 2)
`handleReset()` in `App.jsx` lines 101–109.  
**Expected:** Rebuilds `mappings` only for the currently selected fields (iterates over `selectedFields`, not all fields). Calls `defaultMapping(field)` for each. Also calls `setCustomVariations([])` — **custom variation rows are wiped entirely** (this differs from vanilla, where Reset preserved names but cleared expressions). Fields that are selected but had no prior mapping get a fresh default. Non-selected fields are unaffected.

### TC3-14 — Download button
`handleDownload()` in `ScriptOutput.jsx` lines 334–350.  
**Expected:** Creates a `Blob` with `type: "text/html"`, creates an anchor with filename `product-schema-head-markup.html` (hardcoded — no multi-schema selector), clicks it, removes it, and revokes the object URL after 100ms. `detectOutputErrors` is checked first; on errors, sets `copyStatus` and returns without downloading.

### TC3-15 — Copy button: clipboard API success
`handleCopy()` in `ScriptOutput.jsx` lines 308–332. `navigator.clipboard.writeText()` succeeds.  
**Expected:** `setCopyStatus('Copied.')` is called; status clears after 2200ms.

### TC3-16 — Copy button: clipboard API failure, execCommand fallback
If `navigator.clipboard.writeText()` rejects, the catch block tries `document.execCommand("copy")` on `#scriptOutput`.  
**Expected:** "Copied." shown on execCommand success.

### TC3-17 — Copy button: total failure
If both clipboard methods throw, shows `"Copy failed — select the text and copy manually."`.  
**Expected:** No false "Copied." on total failure.

### TC3-19 — propertyValue: Remove button visibility
`TreePropertyValueField` in `MappingEditor.jsx` line 269: Remove button rendered only when `mapping.entries.length > 1`.  
**Expected:** Single entry has no Remove button. Two or more entries each have a Remove button.

### TC3-20 — propertyValue: Add entry
"+ Add property" button in `TreePropertyValueField` (lines 285–294) calls `onMappingChange` to push `{ id: crypto.randomUUID(), label: '', expression: '' }` to `m.entries`.  
**Expected:** New empty entry row appears. Output updates automatically (empty entries filtered by `filter(e => e.label || e.expression)` in `applySelectedField`).

### TC3-21 — graphToJsonWithExpressions: $ in expression values
Replacement uses `() => value` (not `value` directly) in `ScriptOutput.jsx` `graphToJsonWithExpressions()`.  
**Expected:** Expression values containing `$&`, `$$`, `$1`, `$'` are emitted literally without regex replacement pattern interpretation.

### TC3-22 — init() flow
`App.jsx` `useEffect` lines 39–53: awaits `loadSchemaFields('Product')`, then in the `.then()` callback sets `fields`, `selectedFields`, and `mappings` in a single batch.  
**Expected:** No race condition — all three state updates fire together from one resolved promise. React batches updates from the same event/callback in React 18, so a single render cycle processes all three.

### TC3-23 — Step nav aria-current
`StepsNav.jsx` lines 17–18: `aria-current={isCurrent ? 'step' : undefined}`.  
**Expected:** Active step button has `aria-current="step"`. Other buttons have the attribute **omitted entirely** (React does not render `aria-current="false"` — it omits the attribute when value is `undefined`). Completed steps (`isDone === true`) get the `is-done` CSS class.

### TC3-24 — Variation Attributes panel visible in both views
`App.jsx` lines 146–164: `<VariationAttrsPanel>` is a **sibling** to `<MappingEditor>` in the Step 2 JSX block — not rendered inside MappingEditor. It is always present when Step 2 is active, regardless of whether any fields are selected or whether the mobile/desktop view is active.  
**Expected:** Panel renders as a sibling below `<MappingEditor>` on Step 2. Visible even with zero selected fields (MappingEditor shows its own "no fields selected" empty state but the panel still renders).

### TC3-25 — Variation row: expression placeholder updates on name change
`VariationAttrsPanel.jsx` line 53: `const exprPlaceholder = \`{!Record.ProductAttributes.${entry.name || 'FieldName'}__c}\``.  
**Expected:** The placeholder is recomputed every render from the current `entry.name` value. When the user types `"Color"` into the name input, the next render computes `"{!Record.ProductAttributes.Color__c}"` as the expression placeholder. If name is cleared, placeholder falls back to `"{!Record.ProductAttributes.FieldName__c}"`.

### TC3-26 — Variation row: Remove button removes entry and updates output
`handleRemove(id)` in `VariationAttrsPanel.jsx` lines 12–13: `onEntriesChange(entries.filter(e => e.id !== id))`.  
**Expected:** The entry with the matching `id` is removed from `customVariations` state in App.jsx. React re-renders VariationAttrsPanel with the shorter list. ScriptOutput re-derives `buildScript(...)` from the updated `customVariations` — output updates immediately.

### TC3-28 — Reset button clears ALL variation entries (including names)
Trace `handleReset()` in `App.jsx` lines 101–109.  
**Expected:** `setCustomVariations([])` is called — wipes all variation entries including their names. After Reset, the Variation Attributes panel shows zero rows. **Note:** This differs from vanilla behavior (which preserved names but cleared expressions). In React, Reset is a hard reset of all Step 2 state.

### TC3-29 — Tab-to-fill: Tree view input (empty and partial)
`TreeInput` component in `MappingEditor.jsx`.  
**Expected — two trigger paths:**

**Path 1 (empty → fill placeholder):** Input is empty AND placeholder starts with `{!` AND input is focused → hint shows "Tab ↹ to fill". Tab calls `onChange(placeholder)` (e.g. `{!Record.Name}`).

**Path 2 (partial → wrap):** Input has a value that does NOT start with `{!` (e.g. `Color__c`) AND input is focused → hint shows "Tab ↹ to fill". Tab calls `onChange('{!Record.' + apiName + '}')` where `apiName = value.replace(/^Record\./, '')` to strip an accidental `Record.` prefix. Result: `{!Record.Color__c}`. Once the value starts with `{!`, `isPartial` is false and Tab behaves normally (no interception). Shift+Tab always behaves normally.

### TC3-30 — Tab-to-fill: Flat form view input (empty and partial)
`FlatInput` component in `MappingEditor.jsx`.  
**Expected:** Identical two-path behavior to TC3-29 — same `isPartial` guard, same `Record.` prefix strip, same hint display. The Tab-to-fill logic is intentionally duplicated in `TreeInput`, `FlatInput`, and `VariationAttrsPanel` (a `useTabFill` hook extraction is deferred).

### TC3-31 — Tab-to-fill: Variation Attributes panel expression input (empty and partial)
`VariationAttrsPanel.jsx` (inside the `entries.map()` callback).  
**Expected — two trigger paths:**

**Path 1 (empty):** Expression is empty AND focused → hint shows. Tab fills with `exprPlaceholder` (`{!Record.ProductAttributes.FieldName__c}` or name-based variant).

**Path 2 (partial):** Expression has a value that does NOT start with `{!` (e.g. `Angle__c`) AND focused → hint shows. Tab wraps to `{!Record.ProductAttributes.${apiName}}` where `apiName = expression.replace(/^Record\./, '')`. Result: `{!Record.ProductAttributes.Angle__c}`. The `ProductAttributes` relationship is hardcoded here (unlike Tree/Flat) because all variation attributes are bound to the `ProductAttributes` relationship field — they are never top-level product fields.

### TC3-32 — Variation Attributes card visual contract
Trace `src/styles.css` rules for `.variation-attrs-panel` and `.variation-attrs-heading`.  
**Expected:**
- `.variation-attrs-panel`: `background: color-mix(in srgb, var(--accent) 4%, transparent)`, `border-radius: 8px`, `padding: 18px 20px`, `margin-top: 24px`. **No `border-top`** rule.
- `.variation-attrs-heading`: `color: var(--ink)`, `font-size: 14px`, `font-weight: 600`, `letter-spacing: normal`, `text-transform: none`. Heading is `<h4>` with sentence-case text "Custom variation attributes".
- `.variation-attrs-info-trigger`: circular button (`border-radius: 50%`, `width: 16px`, `height: 16px`) in the accent color family.

### TC3-33 — Info button toggles disclosure below header row
`VariationAttrsPanel.jsx` lines 27–47.  
**Expected:** The `?` trigger button is inside `.variation-attrs-card-header` (a flex row with the `<h4>`). Clicking toggles `showInfo` via `useState`. When `showInfo` is true, `.variation-attrs-info-body` renders **as a sibling element** to the card header — i.e., outside the flex header `<div>`, **below** the heading row in the document flow. The "Custom variation attributes" text is never pushed sideways or wrapped because the info body is not inside the header row. The button has `aria-expanded={showInfo}` and `aria-label="Show schema.org guidance"`.
