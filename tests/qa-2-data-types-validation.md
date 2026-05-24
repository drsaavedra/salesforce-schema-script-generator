# QA Test 2 — Data Types & Validation

**Scope:** Verify field data type handling, type hint badges, warning system, and FIELD_EXCLUSIONS.  
**Method:** Static code trace through `app.js` and `schema-parser.js`.

---

## How to run

Feed this file as the prompt to a QA subagent, pointing it at:
- `docs/app.js`
- `docs/schema-parser.js`
- `docs/constants.js`

---

## Test cases

### TC2-01 — Boolean field (isFamilyFriendly)
`valueType: "raw"`, `typeHint: "Boolean"`.  
**Expected:** Value emitted unquoted. `true` → `true` in JSON, not `"true"`. Amber "Boolean" badge shown in Step 2.

### TC2-02 — Number coercion: valid input
Field with `valueType: "number"`, input `"29.99"`.  
**Expected:** `Number("29.99") = 29.99` — emitted as numeric, no quotes.

### TC2-03 — Number coercion: zero
Field with `valueType: "number"`, input `"0"`.  
**Expected:** `Number.isNaN(0)` is false → emits `0`, not the string `"0"` and not null.

### TC2-04 — Number coercion: invalid input
Field with `valueType: "number"`, input `"abc"`.  
**Expected:** `Number.isNaN(NaN)` is true → falls back to string `"abc"`.

### TC2-05 — offers.price empty expression
User clears the price field (expression = "").  
**Expected:** `if (mapping.priceExpression)` guard is false — `price` key is **not added** to the offer object at all. Warning surfaced: "Offer: price expression is empty."

### TC2-06 — offers.currency empty expression
User clears the currency field.  
**Expected:** Warning surfaced: "Offer: currency expression is empty."

### TC2-07 — Empty text field warning
A plain text field with no expression entered.  
**Expected:** `buildWarnings()` pushes `"${field.label}: no value set."`.

### TC2-08 — Empty raw/expression field warning
A raw or expression valueType field with no expression.  
**Expected:** `buildWarnings()` pushes `"${field.label}: expression is empty."`.

### TC2-09 — Empty propertyValue entry warning
An additionalProperty entry where `expression` is empty.  
**Expected:** Warning: `"${field.label} — ${name}: no value set."` where name falls back to "Unnamed" if label also empty.

### TC2-10 — FIELD_EXCLUSIONS: aggregated data
`aggregateRating`, `review`, `reviews` must not appear in the field list.  
**Expected:** `extractProperties()` skips these — `FIELD_EXCLUSIONS.has(name)` returns true.

### TC2-11 — FIELD_EXCLUSIONS: relationship arrays
`isRelatedTo`, `isSimilarTo`, `isAccessoryOrSparePartFor`, `isConsumableFor`, `isVariantOf`, `hasVariant`, `predecessorOf`, `successorOf` must be excluded.

### TC2-12 — FIELD_EXCLUSIONS: QuantitativeValue types
`depth`, `height`, `weight`, `width` must be excluded.

### TC2-13 — FIELD_EXCLUSIONS: complex nested types
`potentialAction`, `hasMerchantReturnPolicy`, `subjectOf` must be excluded.

### TC2-14 — FIELD_EXCLUSIONS: not commerce-applicable
`award`, `awards` must be excluded.

### TC2-15 — typeHint badge classes
`tmTypeTag("Boolean")` → `field-type-tag is-boolean`.  
`tmTypeTag("Number")` → `field-type-tag is-number`.  
`tmTypeTag("URL")` → `field-type-tag` (no extra class).  
**Expected:** Correct CSS classes applied for visual distinction.

### TC2-16 — Schema-parser v30 TTL compatibility: parseTTLBlocks
Confirm the updated regex `/^:(\w+)\s+a\s+/ || /^schema:(\w+)\s+a\s+/` correctly captures subject names from both old (`:Product`) and new (`schema:Product`) TTL formats.

### TC2-17 — Schema-parser v30 TTL compatibility: buildClassMap
Confirm `/(?:rdfs:|:)subClassOf\s+([^;.]+)/g` captures subclass relationships from both `rdfs:subClassOf` (v30) and `:subClassOf` (old) predicates.  
**Expected:** `Product` → `["Thing"]` ancestor chain resolved correctly.

### TC2-18 — Schema-parser v30 TTL compatibility: extractProperties domainIncludes
Confirm the updated regex `/new RegExp('(?:schema:)?:?${t}\\b').test(domainStr)/` matches both `schema:Product` and `:Product` in the domainIncludes segment.

---

## Output structure validation — detectOutputErrors()

The following cases test `detectOutputErrors(text)` in `app.js`, which is called on every `scriptOutput` input event and at the start of `copyOutput()` and `downloadOutput()`.

### TC2-19 — JSON structure: removed quote from @context value
Input text contains `"@context": https://schema.org` (closing/opening quote removed from value).  
**Expected:** After stripping script tags and replacing `{!...}` with `__expr__`, `JSON.parse` throws. `detectOutputErrors` returns an error containing `"Output contains invalid JSON"`.

### TC2-20 — JSON structure: removed quote from @type value
Input text contains `"@type": Product` (value unquoted).  
**Expected:** `JSON.parse` throws on `Product` as a bare token. Error returned containing `"Output contains invalid JSON"`.

### TC2-21 — Unquoted expression: opening quote removed
Input text contains `"name": {!Record.Name}"` (opening `"` before `{!` removed).  
**Expected:** Character at `index - 1` is `:` or ` `, not `"` → expression added to found set → error: `"Unquoted expression: {!Record.Name}"`.

### TC2-22 — Unquoted expression: closing quote removed
Input text contains `"name": "{!Record.Name}` followed by a newline (closing `"` after `}` removed).  
**Expected:** Character at `index + length` is `\n`, not `"` → error: `"Unquoted expression: {!Record.Name}"`.

### TC2-23 — Missing closing }: {!Record.StockKeepingUnit inside a string
Input text contains `"sku": "{!Record.StockKeepingUnit"` — expression is missing its closing `}`.  
**Expected:** `JSON.parse` passes (the string is valid JSON). The `missingCloseRe` regex `/\{![^}"]+(?=")/g` matches `{!Record.StockKeepingUnit` (stops at `"` without seeing `}`). Error returned: `"Malformed expression: {!Record.StockKeepingUnit — missing closing }."`.

### TC2-24 — Missing opening {!: !Record.StockKeepingUnit} inside a string
Input text contains `"sku": "!Record.StockKeepingUnit}"` — expression is missing its opening `{!`.  
**Expected:** `JSON.parse` passes. The `missingOpenRe` regex `/(?<!\{)!Record\.[^"{}]+}/g` matches `!Record.StockKeepingUnit}` because `!` is not preceded by `{`. Error returned: `"Malformed expression: !Record.StockKeepingUnit} — missing opening {!."`.

### TC2-25 — All expressions valid: no errors returned
Input text is a correctly formed script with all expressions quoted and well-formed (e.g. `"name": "{!Record.Name}"`).  
**Expected:** `JSON.parse` passes, no unquoted expressions found, no malformed expressions found. `detectOutputErrors` returns an empty array.

### TC2-26 — renderWarnings() called before quoting check in copy and download
Trace `copyOutput()` and `downloadOutput()` in `app.js`.  
**Expected:** Both functions call `renderWarnings()` before `detectOutputErrors()`. This ensures stale quoting warnings from a previous failed attempt are cleared before re-checking, so the warnings area always reflects the current state of the textarea.

### TC2-28 — Variation attribute warning: name set, expression empty
`state.customVariations = [{ name: "Angle", expression: "" }]`.  
**Expected:** `buildWarnings()` loop over `state.customVariations` skips entries where `!v.name`. For this entry, `v.name` is truthy and `String(v.expression || "").trim()` is `""` → pushes `"Angle: no value set."`. An entry with an empty `name` is skipped entirely (no warning for unnamed rows).

### TC2-27 — scriptOutput is read-only; no input listener attached
Confirm that the output `<textarea id="scriptOutput">` has the `readonly` attribute set in `index.html` and that no `elements.scriptOutput.addEventListener("input", ...)` handler exists in `app.js`.  
**Expected:** The textarea is not editable by the user. The `detectOutputErrors` and `showOutputErrors` functions exist in `app.js` but are only called from `copyOutput()` and `downloadOutput()` — not from any input listener.
