# QA Test 1 — Field Combinations

**Scope:** Verify that every field valueType produces correct JSON-LD output.  
**Method:** Static code trace through `src/components/ScriptOutput.jsx` and `src/schema-parser.js`.  
**Input convention:** Use `{!Record.Name}` as the expression value unless the test case requires something specific.

---

## How to run

Feed this file as the prompt to a QA subagent, pointing it at:
- `src/components/ScriptOutput.jsx` — contains module-private helpers `applySelectedField`, `graphToJsonWithExpressions`, `applyCustomVariations`, `buildScript`, `buildWarnings`, `detectOutputErrors`
- `src/components/SchemaPreviewModal.jsx` — contains parallel duplicates `applySelectedFieldToGraph`, `applyCustomVariationsToGraph`, `buildPreviewGraph` (same logic, different names)
- `src/schema-parser.js`
- `src/constants.js`

---

## Test cases

### TC1-01 — valueType "text"
Trace `applySelectedField()` in `ScriptOutput.jsx` for a plain text field (e.g. `name`, `sku`).  
**Expected:** `graph[field.path] = value` — string emitted with quotes in JSON output.

### TC1-02 — valueType "raw"
Trace `applySelectedField()` for a raw field (e.g. `isFamilyFriendly`).  
**Expected:** `graph[field.path] = rawExpression(value)` — value emitted **unquoted** by `graphToJsonWithExpressions()`. No `"..."` wrapper in final output. Empty raw fields are skipped (`if (value)` guard).

### TC1-03 — valueType "expression"
Trace `applySelectedField()` for an expression field (e.g. `category`).  
**Expected:** Same as text — string with quotes. Confirm `defaultExpression` is used when `useDefault` is true (the `MappingEditor` disables the input and shows the default; the mapping value is either the user's expression or an empty string — `buildScript` always uses `mapping.expression`).

### TC1-04 — valueType "offer"
Trace `applySelectedField()` for the `offers` field.  
**Expected:** Nested object with `@type` (from `mapping.offerType`), `priceCurrency` (quoted string), and `price` (quoted string, only if `mapping.priceExpression` is non-empty). `seller` sub-object only emitted when `mapping.sellerName` or `mapping.sellerUrl` is non-empty.

### TC1-05 — valueType "brand"
Trace for `brand` field.  
**Expected:** `graph.brand = { "@type": mapping.type || "Brand", name: value }`.

### TC1-06 — valueType "organization"
Trace for `manufacturer` field.  
**Expected:** `graph["manufacturer"] = { "@type": mapping.type || "Organization", name: value }`. Key derived from `field.path.split('.')[0]`.

### TC1-07 — valueType "propertyValue"
Trace for `additionalProperty` field with multiple entries.  
**Expected:** Array of `{ "@type": "PropertyValue", name: entry.label, value: entry.expression }`. Entries where both label AND expression are empty are filtered out (`filter(e => e.label || e.expression)`).

### TC1-08 — valueType "number"
If any number field exists, trace the Number coercion.  
**Expected:** `Number.isNaN(num) ? rawExpression(value) : num` — numeric output for valid numbers, raw (unquoted) expression fallback for non-numeric strings. Zero (`0`) must emit `0`, not fall back to raw. Empty value is skipped entirely (`if (!value) return`).

### TC1-09 — offers.price quoted expression
Verify `offers.price` assignment in `applySelectedField()`.  
**Expected:** `offer.price = mapping.priceExpression` — price is assigned as a plain string, which means it is emitted **quoted** in JSON output (e.g. `"price": "{!Record.Offers.Price}"`). The field value is not wrapped in `rawExpression()`. Price key is only added when `mapping.priceExpression` is non-empty.

### TC1-10 — Raw token $ corruption
Verify `graphToJsonWithExpressions()` uses `() => value` as the replacement function in `String.prototype.replace`.  
**Expected:** Values containing `$`, `$&`, `$$`, `$1` are emitted literally without being interpreted as regex replacement patterns.

### TC1-11 — Select All fields
Trace `handleSelectAll()` in `src/App.jsx` (lines 71–79).  
**Expected:** `selectedFields` is replaced with `new Set(fields.map(f => f.id))` (all field IDs). `mappings` is augmented: for each field not already in `mappings`, `defaultMapping(field)` is called and the result merged. Existing mappings are **preserved** (not replaced). Output updates automatically on next render.

### TC1-12 — Recommended button
Trace `handleRecommended()` in `src/App.jsx` (lines 88–92).  
**Expected:** `selectedFields` is set to a new Set containing only the fields where `defaultSelected === true`. `mappings` is **rebuilt from scratch** via `buildDefaultMappings(recommended)` — any non-recommended user edits are wiped. This differs from vanilla: Recommended now acts as a full reset to defaults, not a partial selection change.

### TC1-14 — Back to Step 1 after Step 2 changes
Navigate to Step 2, then back to Step 1 via `setCurrentStep(1)`. Deselect a field by clicking its tile (`handleToggleField`). Go forward to Step 2 again.  
**Expected:** The deselected field's row is absent from `MappingEditor`. Derived via `fields.filter(f => selectedFields.has(f.id))` in `MappingEditor.jsx` line 559 — the field was removed from the `selectedFields` Set, so it no longer appears.

### TC1-15 — BreadcrumbList in output
When `includeBreadcrumbList` is true, trace `buildScript()` in `ScriptOutput.jsx` lines 169–183.  
**Expected:** Output contains exactly one `<script type="application/ld+json">` block whose content is a JSON array with two elements: the Product object and a BreadcrumbList object with `"itemListElement": "{!Record.BreadcrumbList}"`.

### TC1-16 — valueType "commaSeparatedArray": multiple values
Trace `applySelectedField()` for a field with `valueType === "commaSeparatedArray"` (e.g. `variesBy`). Input: `"color, size, material"`.  
**Expected:** `value.split(",").map(s => s.trim()).filter(Boolean)` → `["color", "size", "material"]`. Since `parts.length > 1`, `graph[field.path] = ["color", "size", "material"]` — a JSON array.

### TC1-17 — valueType "commaSeparatedArray": single value
Same as TC1-16 but input is `"color"` (no comma).  
**Expected:** `parts.length === 1` → `graph[field.path] = "color"` — a plain string, not a single-element array.

### TC1-18 — applyCustomVariations(): merges into existing additionalProperty
`customVariations = [{ id: "...", name: "Angle", expression: "{!Record.ProductAttributes.Angle__c}" }]`. The `additionalProperty` schema field is also selected with one entry already in `mapping.entries` (label: "Material", expression: `{!Record.ProductAttributes.Material__c}`). Trace `buildScript()`.  
**Expected:** `graph.additionalProperty` is already an array after `applySelectedField()`. `applyCustomVariations()` checks `Array.isArray(graph.additionalProperty)` → true → spreads: `[...existing, ...variationEntries]`. Final array has two `PropertyValue` items.

### TC1-19 — applyCustomVariations(): creates additionalProperty when not selected
`customVariations = [{ id: "...", name: "Angle", expression: "{!Record.ProductAttributes.Angle__c}" }]`. The `additionalProperty` schema field is NOT selected.  
**Expected:** `graph.additionalProperty` is undefined after the main field loop. `applyCustomVariations()` checks `Array.isArray(undefined)` → false → `graph.additionalProperty = [variationEntry]`. Output contains one `PropertyValue` item.

### TC1-20 — Category is a recommended field
Trace `src/schema-parser.js` FIELD_OVERRIDES and RECOMMENDED_ORDER.  
**Expected:** `FIELD_OVERRIDES.category` (line 27) has `defaultSelected: true`. `RECOMMENDED_ORDER.Product` (line 46) includes `"category"` after `"offers"` and before `"brand"`. On first app load, the `useEffect` in `App.jsx` filters `defaultSelected` fields and pre-selects them — `category` is therefore pre-selected. The `FieldList` renders it with the "Recommended" badge (`field.defaultSelected` is true → renders `<span className="tile-badge">Recommended</span>`).
