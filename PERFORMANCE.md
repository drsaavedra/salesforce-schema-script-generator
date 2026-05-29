# Performance Reference

A standing record of the performance review of the React build (vanilla JS → React 18 + Vite migration). Use this as a reference when a performance issue is suspected: it documents what was checked, why most findings are low-priority *at current data scale*, and the concrete trigger conditions that would justify optimizing each spot.

**Review verdict:** performance-sound for its data scale. 0 High · 2 Medium · 12 Low. No correctness-affecting performance bugs, no memory leaks, no problematic dependencies.

---

## Data-scale context (this governs every severity call)

The whole app operates on bounded data. Before treating any finding as urgent, confirm the data is still in these ranges:

| Quantity | Typical size | Source |
|---|---|---|
| Schema fields for `Product` | ~50–90 properties (Product + ancestors, minus ~19 exclusions) | `schema-parser.js` |
| Selected fields | single digits to ~30 | user selection |
| Generated JSON output | a few KB | `buildScript()` |
| Custom variation rows | single digits | user-added |

If a future change makes any of these grow by an order of magnitude (e.g. supporting many schema types at once, or hundreds of selected fields), revisit the Medium and Low findings below — several would graduate in severity.

---

## Medium findings (tolerable today; fix only if symptoms appear)

### M1 — `MappingEditor` re-renders the full selected-field subtree on every keystroke
- **Where:** `src/components/MappingEditor.jsx` (main component + `selected.map(...)` render path)
- **Why it happens:** `mappings` lives in `App.jsx`. Typing one character in any `TreeInput`/`FlatInput` calls `onMappingChange` → `setMappings` in `App` → re-renders `App` → `MappingEditor` → the entire `selected.map(...)` tree. Every `TreeOfferField`, `TreePropertyValueField`, etc. re-renders even though only one input changed.
- **Why it's OK now:** at ~5–15 selected fields the re-render is imperceptible.
- **Trigger to fix:** observable input latency / lag while typing, or selected-field counts climbing well past ~30.
- **Fix when needed:**
  1. Wrap the field renderers in `React.memo` (`TreeGenericField`, `TreeOfferField`, `TreePropertyValueField`, `TreeObjectField`, and the `Flat*` equivalents).
  2. Stabilize `onMappingChange` with `useCallback` in `App.jsx` — it already uses the functional-updater form, so it has no dependencies and memoizes cleanly.
  3. Memoize `selected` with `useMemo([fields, selectedFields])`.

### M2 — `buildScript` + `buildWarnings` recompute on every render of `ScriptOutput`
- **Where:** `src/components/ScriptOutput.jsx` (top of the component body)
- **Why it happens:** output is derived state — both run unconditionally each render. `buildScript` does a `fields.find(...)` per selected field, builds the graph, `JSON.stringify` with a replacer, then a `reduce` of `String.replace` per raw token. `buildWarnings` is another O(selected × fields) pass.
- **Why it's OK now:** sub-millisecond at current sizes, and `ScriptOutput` only mounts on Step 3, where the only re-render triggers are the breadcrumb checkbox and `copyStatus` — both infrequent.
- **Trigger to fix:** output generation becomes visibly slow, or `ScriptOutput` starts re-rendering frequently for other reasons.
- **Fix when needed:** `const scriptText = useMemo(() => buildScript(...), [selectedFields, fields, mappings, customVariations, includeBreadcrumbList])` and the same for warnings. This skips recompute on `copyStatus` changes (the only per-component state).

---

## Low findings (micro-optimizations; current N does not justify them)

| ID | Location | Note | Fix if it ever matters |
|---|---|---|---|
| L1 | `App.jsx` `handleToggleField` | Two `setState` calls per action — auto-batched in React 18, so one render. Fine. | none |
| L2 | `App.jsx` inline arrow props (`onClick={() => ...}`, `onNext`, etc.) | New closures each render, but children aren't `React.memo`-wrapped so it costs nothing. | only relevant after memoizing children (see M1) |
| L3 | `App.jsx` handlers recreated each render | Same reasoning as L2. | `useCallback` only alongside M1 |
| L4 | `FieldList.jsx` `filtered` (lines ~18–24) | Filter runs over all fields on every keystroke in search. Trivial string matching at N<100. | `useMemo([fields, query])` |
| L5 | `FieldList.jsx` `handleSelectAllMatching` | Calls `onToggleField` in a loop; batched inside the event handler. | none |
| L6 | `MappingEditor.jsx` `TreeInput`/`FlatInput` regex per render | `/^[\w$]+$/.test(value)` on a short string. Negligible. (Now centralized in `useTabToFill`.) | none |
| L7 | `MappingEditor.jsx` `matchMedia` view switch | Initializer runs once; listener added/removed in one effect with `[]` deps. No leak. Correct. | none (positive) |
| L8 | `ScriptOutput.jsx` / `schemaBuilder.js` repeated `fields.find` in loops | O(selected × fields). | swap to a `Map` lookup only if `fields` grows by orders of magnitude |
| L9 | `SchemaPreviewModal.jsx` `buildPreviewGraph` per render | Only mounts when open; re-renders only on prop changes that change the graph anyway. | none |
| L10 | `SchemaPreviewModal.jsx` `JsonTreeNode` array `key={i}` | Render-only preview, no reordering, no child input state. Fine. (Object entries correctly key by `k`.) | none |
| L11 | `VariationAttrsPanel.jsx` per-row handlers/derived values | Recreated per entry per render; entry counts are single digits. | none |
| L12 | `schema-parser.js` `extractProperties` compiles a regex per target type per block | O(blocks × targetTypes) regex compiles, but runs **once** at load behind the cache, gated by cheap `.includes` pre-checks. | if load time is measured slow: pre-build one alternation regex `(?:schema:)?:?(Product\|Thing\|...)\b` outside the loop |

---

## Things that are done right (don't "fix" these)

- **TTL parsed once and cached** (`schema-parser.js`, `_fetchPromise`) — the single most expensive operation (fetch + regex-scan of a large TTL) is correctly memoized so concurrent/repeat `loadSchemaFields` calls share one fetch and one parse. This is the most important perf decision in the migration.
- **`matchMedia` listener** is implemented correctly (one-time initializer, add/remove in a single `[]`-dep effect). No leak.
- **No new runtime dependencies** beyond React + ReactDOM. The TTL is fetched at runtime from `public/data/` rather than bundled, keeping the JS bundle small.
- **No lazy-loading needed** — it's a single small wizard; code-splitting the three step components would save negligible bytes and add complexity.

---

## How to use this doc when a perf issue is reported

1. **Confirm the data scale** against the table at the top. If data is still bounded as described, the cause is probably *not* in the Medium/Low findings here — look at what actually changed.
2. **If typing in Step 2 feels laggy** → that's M1. Apply the `React.memo` + `useCallback` + `useMemo` fix.
3. **If Step 3 output feels slow** → that's M2. Wrap the builders in `useMemo`.
4. **If first load feels slow** → check L12 (one-time TTL parse) and the network fetch of `schema.ttl`, not the React render path.
5. **Before optimizing anything**, measure first (React DevTools Profiler for renders; a `performance.now()` bracket around the suspect function). Every finding above was judged "not worth it" precisely because the cost is below the threshold of perception at current scale — don't add memoization complexity without evidence it pays off.
