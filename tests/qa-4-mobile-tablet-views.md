# QA Test 4 — Mobile & Tablet View Behaviour

**Scope:** Verify that the responsive form view (mobile ≤640px) and tree view (tablet+) render correctly, that shared state is preserved across views, and that no regressions were introduced in existing functionality.  
**Method:** Static code trace through `src/components/MappingEditor.jsx` and `src/styles.css`.

---

## How to run

Feed this file as the prompt to a QA subagent, pointing it at:
- `src/components/MappingEditor.jsx` — contains `MappingEditor` (main), `TreeInput`, `FlatInput`, `FlatGenericField`, `FlatOfferField`, `FlatPropertyValueField`, `FlatUseDefault`, `TreeOfferField`, `TreePropertyValueField`, `TreeObjectField`, `TreeGenericField`
- `src/components/VariationAttrsPanel.jsx`
- `src/App.jsx`
- `src/styles.css`

---

## Test cases

### TC4-01 — View dispatch: mobile uses form view
`MappingEditor.jsx` lines 599–658: `isMobile ? <flat form> : <tree editor>` ternary.  
**Expected:** When `isMobile` state is true, the flat form branch renders. When false, the tree editor branch renders. The two branches are mutually exclusive — the `.tree-mapping-editor` element is absent on mobile, flat form inputs are absent on tablet/desktop.

### TC4-02 — isMobileView() breakpoint
`MappingEditor.jsx` line 549: `useState(() => window.matchMedia('(max-width: 640px)').matches)`.  
**Expected:** Breakpoint is exactly 640px — matches the `@media (max-width: 640px)` CSS breakpoint.

### TC4-03 — Resize listener re-renders Step 2
`MappingEditor.jsx` `useEffect` lines 552–557: attaches `matchMedia.addEventListener('change', handler)` that calls `setIsMobile(e.matches)`. Returns cleanup that removes the listener.  
**Expected:** Rotating device or resizing browser across the 640px breakpoint while on Step 2 triggers a re-render with the new `isMobile` value. No "only if currentStep === 2" guard needed because `MappingEditor` only mounts when `currentStep === 2` (React unmounts it on other steps).

### TC4-05 — Form view renders fields
`MappingEditor.jsx` lines 599–631: when `isMobile` is true, `selected.map(field => ...)` iterates over `fields.filter(f => selectedFields.has(f.id))` (line 559 `selected` constant).  
**Expected:** One row (or accordion) per selected field. Fields appear in the order they were returned by `loadSchemaFields` (recommended fields first, then alphabetical).

### TC4-06 — Form view empty state
`MappingEditor.jsx` lines 578–590: when `selected.length === 0`, early return renders a `<section>` with `<p className="status warning">Select at least one schema field to configure bindings.</p>`.  
**Expected:** Empty state message shown. No crash on zero fields. Note: `<VariationAttrsPanel>` still renders as a sibling (it is in `App.jsx`, not inside `MappingEditor`).

### TC4-07 — Form view banner
`MappingEditor.jsx` lines 602–604 (in the mobile branch, when fields are selected): `<p className="mapping-banner">` with an inline `<code>{'{!Record.Name}'}</code>` example.  
**Expected:** Banner visible at top of form view. Not rendered in the empty-state path (early return).

### TC4-08 — Generic field: input renders in form view
`FlatGenericField` and `FlatInput` in `MappingEditor.jsx` lines 390–428.  
**Expected:** `FlatInput` renders `<div className="mapping-row">` containing a `<label>` (with `htmlFor` pointing to the input id) and an `<input type="text">`. Placeholder derived from `field.defaultField` (e.g. `{!Record.Name}`) or `{!Record.FieldApiName}` fallback.

### TC4-09 — Generic field: default expression toggle in form view
`FlatGenericField` lines 391–414: when `field.defaultExpression !== undefined`, wraps in `.field-binding-group` and renders `<FlatUseDefault>` beneath the input.  
**Expected:** "Use default" checkbox visible. When checked, `FlatInput` receives `disabled={true}` and shows the default expression value. When unchecked, input is enabled. State update calls `onMappingChange(field.id, m => ({ ...m, useDefault: checked, expression: ... }))`.

### TC4-10 — Use-default checkbox: form view state update
`FlatUseDefault` lines 381–388 + the `onChange` callback in `FlatGenericField`.  
**Expected:** Toggling the checkbox calls `onMappingChange` in `App.jsx` → `setMappings` → React re-renders `MappingEditor` automatically. No manual `renderMappings()` or `renderOutput()` calls exist — output updates are derived from state.

### TC4-11 — Offer field: accordion in form view
`MappingEditor.jsx` lines 615–629: fields with `valueType === "offer"` are wrapped in a `.mapping-accordion` div. The accordion header shows the field label, a summary (the price expression or default), and a chevron.  
**Expected:** Accordion rendered with header and collapsible body. Initial state is open (field id is not in the `closedMappings` Set on first render).

### TC4-12 — Offer accordion: open/close toggle
`handleAccordionToggle(fieldId)` in `MappingEditor.jsx` lines 561–567: toggles Set membership in `closedMappings`. Accordion div gets/loses `.is-closed` class.  
**Expected:** Clicking header closes accordion; clicking again opens it. CSS hides `.mapping-accordion-body` via `.mapping-accordion.is-closed .mapping-accordion-body { display: none }`.

### TC4-13 — propertyValue field: accordion in form view
Same accordion component (lines 615–629) with `valueType === "propertyValue"`. Body contains `<FlatPropertyValueField>`. Summary shows entry count: `${count} propert${count === 1 ? 'y' : 'ies'}`.  
**Expected:** Accordion shown with property count in summary (e.g., "1 property"). Add/Remove entry buttons functional.

### TC4-14 — Offer sub-fields: all four rendered in form view
`FlatOfferField` in `MappingEditor.jsx` lines 430–489.  
**Expected:** Four inputs rendered in sequence: Offer price (with `FlatUseDefault` toggle), Offer currency (with `FlatUseDefault` toggle), Seller name, Seller URL. Input ids: `${field.id}-priceExpression`, `${field.id}-currencyExpression`, `${field.id}-sellerName`, `${field.id}-sellerUrl`.

### TC4-15 — PropertyValue entries: form view renders name + value inputs
`FlatPropertyValueField` in `MappingEditor.jsx` lines 491–544: for each entry, two `FlatInput` components render. Ids: `${field.id}-label-${idx}` and `${field.id}-expression-${idx}`.  
**Expected:** Each entry shows two labelled inputs. Placeholder on the "Value" input is `{!Record.FieldApiName}`.

### TC4-16 — PropertyValue: Remove button only when >1 entry (form view)
`FlatPropertyValueField` line 498: Remove button rendered in `.property-group-header` only when `mapping.entries.length > 1`.  
**Expected:** Single entry has no Remove button. Two entries each have a Remove button.

### TC4-17 — PropertyValue: Add entry button (form view)
`FlatPropertyValueField` lines 532–542: `<button className="btn-add-entry">+ Add another property</button>`. Clicking pushes a new `{ id: crypto.randomUUID(), label: '', expression: '' }` to `m.entries` via `onMappingChange`.  
**Expected:** New empty entry row appears after click. Output updates automatically (empty entries filtered by `applySelectedField`).

### TC4-18 — closedMappings: initialized in state
`MappingEditor.jsx` line 550: `const [closedMappings, setClosedMappings] = useState(new Set());`.  
**Expected:** `closedMappings` is an empty Set on first render. No accordions are closed by default. This is local `MappingEditor` state — not on a global state object.

### TC4-20 — Shared state: mappings survive view switch
`mappings` and `selectedFields` live in `App.jsx` as top-level state and are passed as props to `MappingEditor`. Typing in either form view or tree view calls `onMappingChange(field.id, updater)` → `App.jsx setMappings` → `MappingEditor` re-renders with new values.  
**Expected:** Values entered in the form view appear in the output textarea (Step 3). Resizing from mobile to desktop (crossing 640px) triggers `setIsMobile(false)` → tree view renders with the same `mappings` state.

### TC4-21 — Sticky footer: CSS
Verify `.step-footer` in `src/styles.css` has `position: sticky`, `bottom: 0`, `background: var(--panel)`, and `z-index: 10`.  
**Expected:** Next/Back/Finish buttons remain visible at the bottom of the viewport when the user scrolls through a long field list or mapping form.

### TC4-22 — Sticky footer: present on all three steps
Verify the `.step-footer` element is present in all three step components:
- `FieldList.jsx` — Next button (line ~110)
- `App.jsx` Step 2 block — Back + Finish buttons (line ~159)
- `ScriptOutput.jsx` — Back + Validate link (line ~411)

**Expected:** Sticky footer behaviour applies on every step.

### TC4-23 — Mobile CSS: tiles 2-column on ≤640px
Verify `@media (max-width: 640px)` rule in `src/styles.css` for `.field-tiles`: `grid-template-columns: repeat(2, 1fr)`.  
**Expected:** Tiles render in a 2-column grid on mobile without overflowing the container.

### TC4-24 — Mobile CSS: step labels hidden on ≤640px
Verify `@media (max-width: 640px)` rule sets `.step-label { display: none }`.  
**Expected:** Step nav shows only the step number circles, not the text labels, saving horizontal space on narrow screens.

### TC4-25 — Tree view not shown on mobile
`MappingEditor.jsx` `isMobile` ternary (lines 599–658): `.tree-mapping-editor` only renders in the `else` (non-mobile) branch.  
**Expected:** `.tree-mapping-editor` is absent from the render output when `isMobile` is true.

### TC4-26 — Form view CSS: mapping-row renders label above input
Verify `src/styles.css` rule for `.mapping-row`: `display: grid; gap: 7px`. `FlatInput` renders `<div className="mapping-row">` with a `<label>` followed by `<span className="input-with-hint"><input ...></span>`.  
**Expected:** Each field label appears above its input with correct styling.

### TC4-27 — Form view CSS: disabled input styling
`FlatInput` in `MappingEditor.jsx` line 367 applies the native `disabled` attribute directly to the `<input>` element when `disabled={true}`.  
**Expected:** Browser default `input:disabled` styling applies (greyed out). Note: the CSS rule `.mapping-row[data-static="true"] input` (from the vanilla JS version, still present in `src/styles.css` line 550) will **not** match because React's `FlatInput` does not set a `data-static` attribute on the wrapper div. The tree view's disabled inputs use `.tree-input.is-disabled` (added at `MappingEditor.jsx` line 35), which does have a CSS rule (lines 730–731). This is a minor styling discrepancy between flat and tree disabled states — a future cleanup could align them.

### TC4-28 — Form view CSS: accordion body hidden when closed
Verify `src/styles.css` rule: `.mapping-accordion.is-closed .mapping-accordion-body { display: none }`.  
**Expected:** Accordion body is not visible when the `.is-closed` class is present (toggled by `handleAccordionToggle`).

### TC4-30 — No regression: tree view still works on tablet+
When `isMobile` is false, `MappingEditor.jsx` renders the tree branch (lines 632–658) with `.tree-mapping-editor` and the JSON-like tree node structure.  
**Expected:** Tree view renders identically on tablet/desktop. `renderTreeField(field)` dispatch (line 571–576) routes each field to its appropriate tree renderer (`TreeOfferField`, `TreePropertyValueField`, `TreeObjectField`, or `TreeGenericField`).

### TC4-31 — Variation Attributes panel renders in mobile (flat) view
`App.jsx` lines 155–158: `<VariationAttrsPanel>` is rendered as a **sibling** to `<MappingEditor>` in the Step 2 block — not inside the mobile or tree view rendering path.  
**Expected:** On mobile, the `.variation-attrs-panel` card appears below the `MappingEditor` flat form. Card design: accent-tinted background (`color-mix(in srgb, var(--accent) 4%, transparent)`), no border-top divider, `8px` border-radius, sentence-case heading "Custom variation attributes". Panel renders regardless of view mode (mobile or desktop).

### TC4-32 — Variation Attributes panel renders in tablet/tree view
Same reasoning as TC4-31 — the panel is always a sibling to `MappingEditor` in `App.jsx`.  
**Expected:** On tablet and desktop, the same `.variation-attrs-panel` card appears below the tree editor. If `entries` (passed as the `entries` prop) already contains items (e.g. from a previous add), `VariationAttrsPanel` maps over them and renders pre-populated name and expression inputs.

### TC4-33 — Variation Attributes card responsive on mobile
Verify `src/styles.css` rules for `.variation-attrs-panel` and its child elements inside `@media (max-width: 640px)` blocks.  
**Expected:** At viewport ≤640px:
- `.variation-attrs-panel` retains its `18px 20px` padding and `8px` border-radius without horizontal overflow (inherits container width from the wizard).
- `.variation-attrs-info-body` wraps text correctly (`max-width: 520px` has no effect at narrow widths; natural wrapping applies).
- `.variation-attrs-card-header` flex row keeps the `?` button inline with the heading.
- **Touch targets:** The `?` info button (16×16px visually) has a `::after` pseudo-element extending its tap area to 44×44px via `inset: -14px` (inside the `@media (max-width: 640px)` block). The `.custom-variation-row .btn-remove` button has `min-height: 44px` on mobile (overrides the base `min-height: auto`). The "+ Add variation attribute" button inherits the base button `min-height: 38px` and is acceptable.

Verify these specific rules exist in the `@media (max-width: 640px)` block:
```css
.variation-attrs-info-trigger { position: relative; }
.variation-attrs-info-trigger::after { content: ''; inset: -14px; position: absolute; }
.custom-variation-row .btn-remove { min-height: 44px; padding: 0 8px; }
```
