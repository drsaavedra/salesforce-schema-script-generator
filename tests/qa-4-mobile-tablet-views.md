# QA Test 4 — Mobile & Tablet View Behaviour

**Scope:** Verify that the responsive form view (mobile ≤640px) and tree view (tablet+) render correctly, that shared state is preserved across views, and that no regressions were introduced in existing functionality by adding the mobile view.  
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

### TC4-01 — View dispatch: mobile uses form view
`renderMappings()` calls `isMobileView()`. If it returns `true`, `renderFlatMappings()` is called and the function returns immediately. The tree rendering path is not reached.  
**Expected:** On viewports ≤640px, `renderFlatMappings()` is called. On viewports >640px, the tree editor is rendered.

### TC4-02 — isMobileView() breakpoint
`isMobileView()` calls `window.matchMedia("(max-width: 640px)").matches`.  
**Expected:** Breakpoint is exactly 640px — matches the `@media (max-width: 640px)` CSS breakpoint.

### TC4-03 — Resize listener re-renders Step 2
A `window.matchMedia("(max-width: 640px)").addEventListener("change", ...)` handler calls `renderMappings()` only when `state.currentStep === 2`.  
**Expected:** Rotating device or resizing browser across the 640px breakpoint while on Step 2 triggers a view switch. Steps 1 and 3 are not re-rendered unnecessarily.

### TC4-04 — mappingTemplate present in HTML
`index.html` contains `<template id="mappingTemplate">` with a child `.mapping-row` div containing a `<label>` and an `<input type="text">`.  
**Expected:** `document.querySelector("#mappingTemplate")` returns a non-null element at runtime. `addInputRow()` can clone it without throwing.

### TC4-05 — Form view renders fields
`renderFlatMappings()` iterates over `allFields().filter(f => state.selectedFields.has(f.id))`. For each field, `ensureMapping(field)` is called.  
**Expected:** One row (or accordion) per selected field, in selection order.

### TC4-06 — Form view empty state
When no fields are selected, `renderFlatMappings()` appends a `<p class="status warning">` with "Select at least one schema field to configure bindings."  
**Expected:** Empty state message shown, no crash on zero fields.

### TC4-07 — Form view banner
When fields are selected, `renderFlatMappings()` prepends a `<p class="mapping-banner">` with a `<code>{!Record.Name}</code>` example.  
**Expected:** Banner visible at top of form view with inline code example.

### TC4-08 — Generic field: input renders in form view
`renderGenericMapping()` calls `addInputRow()` with `id`, `label`, `value`, and `placeholder`. The `#mappingTemplate` is cloned and appended to `container`.  
**Expected:** Label shows `field.label`, input has correct placeholder (e.g., `{!Record.FieldApiName}` or `{!Record.${field.defaultField}}`).

### TC4-09 — Generic field: default expression toggle in form view
When `field.defaultExpression !== undefined`, `renderGenericMapping()` wraps the input in a `.field-binding-group` div and appends a `renderUseDefaultRow()` checkbox beneath it.  
**Expected:** "Use default" checkbox visible. When checked, input is disabled and shows the default expression. When unchecked, input is enabled and clears.

### TC4-10 — Use-default checkbox: form view state update
When the "Use default" checkbox is toggled in `renderUseDefaultRow()`, the callback sets `mapping.useDefault`, updates `mapping.expression`, then calls `renderMappings()` and `renderOutput()`.  
**Expected:** Input value and disabled state update correctly. Output regenerates. No scroll jump (re-render is acceptable in form view since it rebuilds the whole form, not a surgical update).

### TC4-11 — Offer field: accordion in form view
Fields with `valueType === "offer"` are wrapped in a `.mapping-accordion` div. The header shows the field label and a summary (price expression or default price). The body contains `renderOfferMappings()` output.  
**Expected:** Accordion renders with header and collapsible body. Initial state is open (not `.is-closed`).

### TC4-12 — Offer accordion: open/close toggle
Clicking `.mapping-accordion-header` toggles `state.closedMappings.has(field.id)`. The accordion gains/loses `.is-closed`. CSS hides `.mapping-accordion-body` when `.is-closed` is present.  
**Expected:** Clicking header closes accordion; clicking again opens it. State persists until `renderMappings()` is called again.

### TC4-13 — propertyValue field: accordion in form view
Fields with `valueType === "propertyValue"` are also wrapped in a `.mapping-accordion`. The body contains `renderPropertyValueMappings()` output.  
**Expected:** Accordion shown with property count in summary (e.g., "1 property"). Add/Remove entry buttons functional.

### TC4-14 — Offer sub-fields: all four rendered in form view
`renderOfferMappings()` renders four inputs in sequence: Offer price (with use-default toggle), Offer currency (with use-default toggle), Seller name, Seller URL.  
**Expected:** All four inputs present in the accordion body. IDs are `${field.id}-priceExpression`, `${field.id}-currencyExpression`, `${field.id}-sellerName`, `${field.id}-sellerUrl`.

### TC4-15 — PropertyValue entries: form view renders name + value inputs
`renderPropertyValueMappings()` clones `#mappingTemplate` twice per entry — once for "Property name" and once for "Value". IDs are `${field.id}-label-${idx}` and `${field.id}-expression-${idx}`.  
**Expected:** Each entry shows two labelled inputs. Placeholder on Value input is `{!Record.FieldApiName}`.

### TC4-16 — PropertyValue: Remove button only when >1 entry (form view)
In `renderPropertyValueMappings()`, the Remove button is added to `.property-group-header` only when `mapping.entries.length > 1`.  
**Expected:** Single entry has no Remove button. Two entries each have a Remove button.

### TC4-17 — PropertyValue: Add entry button (form view)
`renderPropertyValueMappings()` appends a `<button class="btn-add-entry">+ Add another property</button>`. Clicking it pushes `{ label: "", expression: "" }` to `mapping.entries` and calls `renderMappings()`.  
**Expected:** New empty entry row appears. Output updates (empty entry filtered by `filter(e => e.label || e.expression)`).

### TC4-18 — closedMappings: initialized in state
`state` object contains `closedMappings: new Set()`.  
**Expected:** `state.closedMappings` exists and is a Set at app init.

### TC4-19 — closedMappings: reset on schema type change
When the schema type card is clicked in `renderSchemaTypes()`, `state.closedMappings = new Set()` is called before `resetRecommendedFields()`.  
**Expected:** All accordions reset to open state when switching schema types.

### TC4-20 — Shared state: mappings survive view switch
`state.mappings` is the single source of truth for both form and tree views. Switching from tree to form view (or vice versa) calls `renderMappings()`, which re-reads `state.mappings`. Typing into a form view input updates `mapping.expression` in state before calling `renderOutput()`.  
**Expected:** Values entered in the form view appear in the output. Switching to tree view (resize ≥641px) shows the same values in tree inputs.

### TC4-21 — Sticky footer: CSS
`.step-footer` has `position: sticky`, `bottom: 0`, `background: var(--panel)`, and `z-index: 10`.  
**Expected:** Next/Back/Finish buttons remain visible at the bottom of the viewport when the user scrolls through a long field list or mapping form.

### TC4-22 — Sticky footer: present on all three steps
All three wizard sections (`#wizardStep1`, `#wizardStep2`, `#wizardStep3`) contain a `.step-footer` element.  
**Expected:** Sticky footer behaviour applies on every step.

### TC4-23 — Mobile CSS: tiles 2-column on ≤640px
`@media (max-width: 640px)` sets `.field-tiles { grid-template-columns: repeat(2, 1fr) }` and `.field-tile { min-width: 0; overflow: hidden }`.  
**Expected:** Tiles render in a 2-column grid on mobile without overflowing the container.

### TC4-24 — Mobile CSS: step labels hidden on ≤640px
`@media (max-width: 640px)` sets `.step-label { display: none }`.  
**Expected:** Step nav shows only the step number circles, not the text labels, saving horizontal space on narrow screens.

### TC4-25 — Tree view not shown on mobile
`renderMappings()` returns immediately after `renderFlatMappings()` when `isMobileView()` is true. No `.tree-mapping-editor` element is created.  
**Expected:** `.tree-mapping-editor` is absent from the DOM on mobile. Form view inputs are present instead.

### TC4-26 — Form view CSS: mapping-row renders label above input
`.mapping-row` uses `display: grid; gap: 7px`. `.mapping-row label` has `color: var(--muted); font-size: 13px; font-weight: 700`.  
**Expected:** Each field label appears above its input with correct styling.

### TC4-27 — Form view CSS: disabled input styling
`.mapping-row[data-static="true"] input` has `background: #f4f6f5; color: #495650`.  
**Expected:** Inputs with use-default active are visually distinct (greyed out).

### TC4-28 — Form view CSS: accordion body hidden when closed
`.mapping-accordion.is-closed .mapping-accordion-body { display: none }`.  
**Expected:** Accordion body is not visible when `.is-closed` class is present.

### TC4-29 — renderOutput() called from form view inputs
Every `onInput` handler in `addInputRow()` calls `renderOutput()` after updating state.  
Every `onInput` in `renderPropertyValueMappings()` (name and value inputs) calls `renderOutput()` directly.  
**Expected:** The Step 3 output textarea updates in real time as the user types in the form view — same behaviour as the tree view.

### TC4-30 — No regression: renderMappings() still works on tablet+
When `isMobileView()` returns `false`, `renderMappings()` falls through to the tree rendering path and builds `.tree-mapping-editor` as before.  
**Expected:** Tree view renders identically on tablet+ to the pre-mobile-view behaviour. No change to tree rendering code.
