# QA Test 1 — Field Combinations

**Scope:** Verify that every field valueType produces correct JSON-LD output.  
**Method:** Static code trace through `app.js` and `schema-parser.js`.  
**Input convention:** Use `{!Record.Name}` as the expression value unless the test case requires something specific.

---

## How to run

Feed this file as the prompt to a QA subagent, pointing it at:
- `docs/app.js`
- `docs/schema-parser.js`
- `docs/constants.js`
- `docs/index.html`

---

## Test cases

### TC1-01 — valueType "text"
Trace `applySelectedField()` for a plain text field (e.g. `name`, `sku`).  
**Expected:** `graph[field.path] = value` — string emitted with quotes in JSON output.

### TC1-02 — valueType "raw"
Trace `applySelectedField()` for a raw field (e.g. `image`, `isFamilyFriendly`).  
**Expected:** `graph[field.path] = rawExpression(value)` — value emitted **unquoted** by `graphToJsonWithExpressions()`. No `"..."` wrapper in final output.

### TC1-03 — valueType "expression"
Trace `applySelectedField()` for an expression field (e.g. `category`).  
**Expected:** Same as text — string with quotes. Confirm `defaultExpression` is used when `useDefault` is true.

### TC1-04 — valueType "offer"
Trace `applySelectedField()` for the `offers` field.  
**Expected:** Nested object with `@type`, `price` (unquoted raw expression), `priceCurrency` (quoted string). `seller` object only emitted when `sellerName` or `sellerUrl` is non-empty.

### TC1-05 — valueType "brand"
Trace for `brand` field.  
**Expected:** `graph.brand = { "@type": mapping.type || "Brand", name: value }`.

### TC1-06 — valueType "organization"
Trace for `manufacturer` field.  
**Expected:** `graph["manufacturer"] = { "@type": mapping.type || "Organization", name: value }`.

### TC1-07 — valueType "propertyValue"
Trace for `additionalProperty` field with multiple entries.  
**Expected:** Array of `{ "@type": "PropertyValue", name: entry.label, value: entry.expression }`. Entries with both label and expression empty are filtered out.

### TC1-08 — valueType "number"
If any number field exists, trace the Number coercion.  
**Expected:** `Number.isNaN(num) ? value : num` — numeric output for valid numbers, string fallback for invalid. Zero (`0`) must emit `0`, not fall back to string.

### TC1-09 — offers.price quoted expression
Verify `offers.price` is assigned directly as a string: `offer.price = mapping.priceExpression`.  
**Expected:** Price is emitted **quoted** (e.g. `"price": "{!Record.Offers.Price}"`). Salesforce evaluates the merge expression at render time; the static markup must have it as a string so the Head Markup parser recognises it. Price is only added to the offer object when `mapping.priceExpression` is non-empty.

### TC1-10 — Raw token $ corruption
Verify `graphToJsonWithExpressions()` uses `() => value` as the replacement function.  
**Expected:** Values containing `$`, `$&`, `$$`, `$1` are emitted literally without being interpreted as replacement patterns.

### TC1-11 — Select All fields
Trace `selectAllButton` click handler — calls `state.selectedFields.add()` and `ensureMapping()` for every field in `allFields()`.  
**Expected:** All fields selected, all mappings initialised, output updates.

### TC1-12 — Recommended button
Trace `recommendedButton` click handler → `resetRecommendedFields()`.  
**Expected:** Only fields where `defaultSelected === true` are selected. Non-recommended mappings already in `state.mappings` are preserved (not wiped).

### TC1-14 — Back to Step 1 after Step 2 changes
Deselect a field in Step 1, go to Step 2, confirm that field's row is gone from the mapping editor.  
**Expected:** `renderMappings()` only renders fields present in `state.selectedFields`.

### TC1-15 — BreadcrumbList in output
When `state.includeBreadcrumbList` is true, `buildScript()` wraps both the Product and BreadcrumbList objects in a JSON array inside a single `<script>` block.  
**Expected:** Output contains exactly one `<script type="application/ld+json">` block whose content is a JSON array with two elements: the Product object and a BreadcrumbList object with `itemListElement: "{!Record.BreadcrumbList}"`.

### TC1-16 — valueType "commaSeparatedArray": multiple values
Trace `applySelectedField()` for a field with `valueType === "commaSeparatedArray"` (e.g. `variesBy`). Input: `"color, size, material"`.  
**Expected:** `value.split(",").map(s => s.trim()).filter(Boolean)` → `["color", "size", "material"]`. Since `parts.length > 1`, `graph[field.path] = ["color", "size", "material"]` — a JSON array.

### TC1-17 — valueType "commaSeparatedArray": single value
Same as TC1-16 but input is `"color"` (no comma).  
**Expected:** `parts.length === 1` → `graph[field.path] = "color"` — a plain string, not a single-element array.

### TC1-18 — applyCustomVariations(): merges into existing additionalProperty
`state.customVariations = [{ name: "Angle", expression: "{!Record.ProductAttributes.Angle__c}" }]`. `additionalProperty` field is also selected with one entry already in `mapping.entries` (label: "Material", expression: `{!Record.ProductAttributes.Material__c}`). Trace `buildScript()`.  
**Expected:** `graph.additionalProperty` is already an array after `applySelectedField()`. `applyCustomVariations()` checks `Array.isArray(graph.additionalProperty)` → true → spreads: `[...existing, ...variationEntries]`. Final array has two `PropertyValue` items.

### TC1-19 — applyCustomVariations(): creates additionalProperty when not selected
`state.customVariations = [{ name: "Angle", expression: "{!Record.ProductAttributes.Angle__c}" }]`. The `additionalProperty` schema field is NOT selected.  
**Expected:** `graph.additionalProperty` is undefined after the main field loop. `applyCustomVariations()` checks `Array.isArray(undefined)` → false → `graph.additionalProperty = [variationEntry]`. Output contains one `PropertyValue` item.
