# Learning Journal — Salesforce Schema Script Generator

A running record of what I learned building this tool. Started as a client deliverable, became a study in web architecture, data modeling, and UI design.

---

## Origin Story

A client asked for SEO improvements on their Salesforce Commerce product pages. The requirement was structured data — specifically a `<script type="application/ld+json">` block in the page `<head>` that tells Google what the product is.

Setting it up manually meant:
- Reading the schema.org/Product documentation
- Copying a JSON-LD template from a blog post or Salesforce doc
- Replacing placeholder values with Salesforce merge fields like `{!Record.Name}`
- Pasting the result into Experience Builder → Head Markup
- Repeating that for every site, every page type, every client

If you had three Commerce sites, you did it three times. If a junior admin needed to do it, they'd probably get the field names wrong or put a text value where a number should go.

The obvious fix: build an interactive tool that walks someone through it visually. No coding required on their end. Just pick fields, enter API names, copy the output.

---

## Architectural Decisions

### 1. Static Site over LWC

**What I originally planned:** A reusable Lightning Web Component that admins could drop onto any page.

**What I built instead:** A plain HTML/CSS/JavaScript site hosted on GitHub Pages.

**Why the pivot:** An LWC would need to be packaged, deployed to every org, and maintained as a managed or unmanaged package. The tool has no org-specific data — it just generates text. A static site is simpler to share (just a URL), works for any org without deployment, and can be updated by pushing to GitHub.

**Lesson:** Match your delivery mechanism to what the tool actually needs. If there's no reason for it to live inside Salesforce, don't put it there.

---

### 2. No-Build Architecture

**Decision:** Vanilla HTML, CSS, and JavaScript. No npm, no bundler, no framework.

**Why it works here:** The tool has one page, one state machine, and no routing. Adding React or Vue would mean adding a build step, a `node_modules` folder, and a deployment pipeline — for a tool that's fundamentally a form with a code preview.

**Trade-off:** As the app grows, vanilla JS becomes harder to organize. The threshold where a framework pays off is roughly: multiple pages, shared components across routes, or team of developers. Below that threshold, it's overhead.

**Lesson:** Every abstraction has a cost. The question isn't "should I use a framework?" — it's "does this project's complexity justify this framework's cost?"

---

### 3. schema.org TTL as the Single Source of Truth

**Problem:** The tool needs to know which fields belong to the `Product` schema type. I could hardcode a list — but then I'd have to manually update it every time schema.org publishes a new version.

**Solution:** Use the official schema.org Turtle (`.ttl`) file. It's a machine-readable definition of every schema.org type and property. The app fetches it at load time and parses out the relevant fields automatically.

**What Turtle format is:** A compact notation for RDF (Resource Description Framework) data. Think of it as a graph database expressed as text. Every "subject" (like `:Product`) has "predicates" (like `rdfs:subClassOf`) and "objects" (like `:Thing`).

```turtle
:Product a rdfs:Class ;
    rdfs:subClassOf :Thing ;
    rdfs:label "Product" .

:sku a rdf:Property ;
    :domainIncludes :Product ;
    :rangeIncludes :Text .
```

**Lesson:** Always look for an authoritative machine-readable source before hardcoding data. Schema.org publishes their entire vocabulary as downloadable files. Using those files means the tool stays accurate automatically.

---

### 4. How schema.org's Type-to-Property Model Actually Works

This was a non-obvious discovery that required research.

**Wrong assumption:** If `ProductGroup` is a subclass of `Product`, it should inherit all of Product's properties automatically.

**Reality:** `domainIncludes` is **explicit, not inherited**. Each property lists the specific types it applies to. The property `:sku` explicitly lists `:Product` in its `domainIncludes`. If it doesn't list `:ProductGroup`, then `:sku` doesn't formally belong to `ProductGroup` — even though `ProductGroup` extends `Product`.

In practice, schema.org does add the parent type's properties to child types via `domainIncludes`, but you can't assume it. You have to:

1. Walk the `rdfs:subClassOf` chain from your type up to `Thing` (the root)
2. Collect every ancestor
3. Find all properties that list any of those ancestors in `domainIncludes`
4. Merge them all

This is called a **BFS (Breadth-First Search)** over a graph.

**Why BFS and not DFS:** Breadth-first processes all nodes at the current depth before going deeper. For ancestor-walking, either works — but BFS is easier to reason about for shallow hierarchies (most schema.org types are 2-3 levels deep).

**ProductCollection's multiple inheritance:**
```
ProductCollection → Product → Thing
ProductCollection → Collection → CreativeWork → Thing
```
The BFS naturally handles this — when `ProductCollection` is added to the queue, it finds both parent paths and follows both.

---

### 5. Separating Parser from App Logic

**Decision:** `schema-parser.js` owns all schema.org parsing. `app.js` owns all UI state and rendering. They communicate through a single function: `loadSchemaFields(typeName)`.

**Why this matters:** When the parser changes (e.g., handling a new schema.org release format), `app.js` doesn't need to know. When the UI changes (e.g., adding a new step to the wizard), `schema-parser.js` doesn't need to know.

**The interface contract:**
- Input: a schema type name string (`"Product"`, `"ProductGroup"`)
- Output: `{ fields: Array, error: string|null }`

**Lesson:** Design interfaces, not implementations. Two pieces of code that talk to each other should agree on inputs and outputs — the internal details of each are their own business.

---

### 6. The fetch() / HTTP Requirement

**Discovery:** JavaScript's `fetch()` API does not work when you open an HTML file directly from disk (`file://` protocol). The browser blocks it as a security measure — if scripts could freely read local files, any webpage you visit could read your documents.

**Why this matters for local testing:** If you double-click `index.html`, `fetch("data/schema.ttl")` silently fails. You need a local HTTP server.

**The Salesforce parallel:** This is the same reason you can't load a Visualforce page from a local `.html` file — it needs to be served by a Salesforce server to resolve relative resource paths and enforce security context.

**Fix:** Run a local server. Three options:
- VS Code Live Server extension (easiest)
- `npx serve docs` (one command, uses Node)
- `python -m http.server 8000` from inside `docs/`

**Lesson:** HTTP is not just about networking — it's a security context. Understanding the difference between `file://` and `http://` is foundational to web development.

---

### 7. schema.ttl Version Management — Why Automated Sync Was Removed

**The original plan:** A GitHub Actions workflow that runs every Monday, downloads the latest schema.org TTL file, commits it, and keeps the tool's field list current automatically.

**What actually happened:** schema.org v30.0 changed their TTL format — types that were previously written as `:Product` became `schema:Product`. The automated download pulled the new file silently. The parser's regex patterns only matched the old format, so the field list loaded as empty. The site showed a blank Step 1 with no fields to select. The failure was silent — no error in the browser, just an empty app.

This happened on a Monday (when the Action ran) and wasn't caught until testing resumed. A live production tool silently broke due to an automated sync that wasn't validated before deployment.

**The fix:** Removed the automated sync entirely. `data/schema.ttl` is now a pinned, tested version. The update process is:
1. Bump `SCHEMA_TTL_VERSION` in `schema-parser.js` to the new version number
2. Download the new TTL manually
3. Test that the field list loads correctly in the browser
4. Commit the tested file — not the automated download

**Key concept — version pinning:** Most dependency managers (npm, pip, cargo) support locking to an exact version for exactly this reason. When a dependency updates its format or interface, you want to update on your schedule, with validation, not automatically.

**The CI/CD parallel:** Automated deployment pipelines solve the "deploy on my schedule" problem by requiring tests to pass before merging. The equivalent here is: any schema.ttl update must pass a manual smoke test (does the field list load?) before it goes into the repo. Automation without a validation gate is just scheduled risk delivery.

**Lesson:** Automated syncs for external data files are only safe if the sync includes validation. Downloading a new file and committing it without testing is equivalent to deploying code without running tests. If validation isn't automated, manual testing before commit is the right process.

---

## UI/UX Decisions

### Wizard Pattern (3-Step Flow)

**Step 1:** Pick which schema fields to include (tile grid)
**Step 2:** Map each field to a Salesforce merge expression (tree editor)
**Step 3:** Copy the generated `<script>` tag

**Why a wizard:** The task has a clear sequence. Showing all three steps at once would overwhelm an admin who just wants to set up one product page. Breaking it into steps also lets the UI gate progression — you can't configure bindings before you've selected fields.

**Trade-off:** Wizards add friction for power users who know what they want. A single-page layout with sections would let experienced users jump around. The wizard prioritizes the first-time user.

---

### Tree Editor (Not a Form)

**Initial idea:** A standard form — label on the left, input on the right, one row per field.

**What we built instead:** An inline tree editor that mirrors the actual JSON-LD structure. Inputs appear where the values will appear in the output.

```
{
  "@context": "https://schema.org"
  "@type":    "Product"
  "name":     [ input field ]
  "offers":   {
    "@type":      [ dropdown ]
    "price":      [ input field ]  Number
    "seller":     {
      "@type":    [ dropdown ]
      "name":     [ input field ]
    }
  }
}
```

**Why this works better:** Admins can see exactly what they're editing and where it ends up. The output isn't abstract — it looks like the output. This reduces errors because the visual structure teaches the user the JSON-LD schema as they use the tool.

**Lesson:** When the output of a tool is structured data, making the editor visually mirror that structure reduces the gap between "what I'm configuring" and "what I'm producing."

---

### Type Hint Badges

**Problem discovered:** During schema validation testing, putting `{!Record.Name}` (a text value) into every field — including fields like `price` (Number) and `isFamilyFriendly` (Boolean) — caused validation errors. The user had no way to know from the UI which fields require non-text values.

**Solution:** Small colored pill badges next to each input showing the expected type.

| Badge color | Type | Example |
|---|---|---|
| Amber (warning) | Boolean | `isFamilyFriendly` |
| Teal | Number | `offers.price` |
| Muted grey | URL | `url`, `sameAs`, `logo` |
| Muted grey | Date | `productionDate` |
| Muted grey | ISO 4217 | `priceCurrency` |

**Why Boolean is amber:** Boolean is the most dangerous mistake. Putting a Salesforce text field expression where a boolean is expected produces `"isFamilyFriendly": "true"` (a string) instead of `"isFamilyFriendly": true` (a boolean). The validator rejects strings where booleans are required. The amber color signals: this field behaves differently from what you'd expect.

**Lesson:** Preventive UX (showing the type before the user makes the mistake) is more effective than reactive UX (showing an error after they submit).

---

### @type Picklists

**Problem:** Fields like `offers.seller` and `brand` have an `@type` sub-field that was hardcoded as `"Organization"` or `"Brand"`. Some sellers are Corporations, some are individual Persons, some are LocalBusinesses.

**Solution:** Replace the static label with a `<select>` dropdown styled to match the monospace tree editor.

**How we derived the options:**
- `Offer` → from schema.org TTL: only one subclass exists (`AggregateOffer`) — small, clean list, auto-derivable
- `Organization` subtypes → schema.org has 12+ subclasses (Airline, Hospital, NGO...) — most irrelevant for e-commerce. Curated manually to the practical options.
- `Brand` → schema.org defines no subclasses of Brand. Options (`Brand`, `Organization`) come from the property's `rangeIncludes`, not subclasses.

**Lesson:** Auto-generation from data is not always better than curation. A picklist with 15 options (including Airline and Hospital) is worse UX than a curated list of 4 relevant ones, even if the long list is "more accurate."

---

## JavaScript Concepts Encountered

### `Promise.allSettled` vs `Promise.all`

- `Promise.all` — runs multiple async operations in parallel. If **any one fails**, the whole thing fails immediately. Use when all results are required.
- `Promise.allSettled` — runs all in parallel. **Always resolves**, even if some fail. Returns an array of `{ status: "fulfilled"|"rejected", value|reason }` objects. Use when partial success is acceptable.

This project switched from `allSettled` to `Promise.all` once the individual `loadSchemaFields` calls were made safe (they return `{ fields, error }` instead of throwing). When the individual function handles its own errors, the container can use `Promise.all`.

---

### Nullish Coalescing (`??`)

```js
const label = ov.label ?? toHumanLabel(propName);
```

Returns the left side unless it's `null` or `undefined`. Different from `||`, which also triggers on `0`, `""`, and `false`. Use `??` when you specifically want to fall back only on missing values, not falsy ones.

---

### BFS (Breadth-First Search)

A graph traversal algorithm. Given a starting node, visit all its direct neighbors first before going deeper. Implemented here with a queue (FIFO — first in, first out):

```js
const visited = new Set([startNode]);
const queue = [startNode];
while (queue.length) {
  const current = queue.shift();          // take from front
  for (const neighbor of graph[current] || []) {
    if (!visited.has(neighbor)) {
      visited.add(neighbor);
      queue.push(neighbor);               // add to back
    }
  }
}
```

Used here to walk the `rdfs:subClassOf` inheritance chain from any schema.org type up to `Thing`.

---

### Surgical DOM Updates vs. Full Re-renders

**The bug:** Toggling a "use default" checkbox on Step 2 caused the page to visibly scroll. Clicking the checkbox for `category` multiple times — checking and unchecking — made the form jump every time.

**Root cause:** The checkbox callback called `renderMappings()`, which does:

```js
elements.mappingForm.replaceChildren();
```

This destroys the entire form DOM and rebuilds it from scratch. The browser treats this the same as a page load — it resets scroll position on the rebuilt element. Even though the visual result looks identical, the DOM is completely new, and the browser has no memory of where you were.

**The fix:** Instead of re-rendering, update only the specific input that changed:

```js
// Before — blunt, causes scroll jump
renderMappings();
renderOutput();

// After — surgical, no scroll movement
function applyDefaultToggle(inputId, checked, defaultValue, placeholder) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value       = checked ? defaultValue : "";
  input.disabled    = checked;
  input.placeholder = checked ? "" : placeholder;
  input.classList.toggle("is-disabled", checked);
}

applyDefaultToggle(`tree-${field.id}`, checked, field.defaultExpression, "{!Record.FieldApiName}");
renderOutput();
```

**The principle — re-render scope should match change scope:**

Every render function has a blast radius — the portion of the DOM it destroys and rebuilds. `renderMappings()` has a large blast radius (the whole form). `renderOutput()` has a contained one (the script preview textarea). When a user action only changes one input, the blast radius of your response should be one input, not the whole form.

**When a full re-render is appropriate:**
- The user changes schema type (entirely different field set)
- The user navigates between wizard steps
- Initial load

**When a surgical update is appropriate:**
- A checkbox toggles one input's disabled/value/placeholder state
- A dropdown changes one property's type
- A text field updates a label elsewhere on the same page

**The connection to frameworks:** This is exactly the problem React, Vue, and Svelte were built to solve. They maintain a virtual DOM — a lightweight JavaScript representation of the UI — and diff it against the real DOM on each state change. Only the nodes that actually changed get updated. In vanilla JS you have to manage this yourself. The discipline is: before calling any render function, ask — am I re-rendering more than what changed?

**Lesson:** Re-rendering is not free. A full re-render on a small state change is a correctness shortcut that trades user experience for developer convenience. The page jump isn't just annoying — it signals that the code is doing far more work than the action warranted.

---

### Caching Async Work

```js
let _fetchPromise = null;

function _ensureParsed() {
  if (_fetchPromise) return _fetchPromise;    // already started or done
  _fetchPromise = fetch("data/schema.ttl")
    .then(...)
    .catch(...);
  return _fetchPromise;
}
```

Rather than caching the result (which might not exist yet when a second caller arrives), cache the **Promise itself**. All concurrent callers get the same Promise and share the same fetch. When it resolves, all callers continue from where they left off.

---

## Salesforce Commerce Field Accessibility — What Can Actually Go in Head Markup

**The problem:** The schema.org TTL parser returns every property whose `domainIncludes` matches the Product ancestor chain — over 60 fields. But Salesforce Commerce Experience Builder Head Markup can only access data through a fixed set of merge expressions. Showing every schema.org property in the tool creates noise and the risk of admins generating broken structured data with empty or invalid values.

**The three tiers of fields:**

**Native — work out of the box with a built-in merge expression:**
| Field | Expression |
|---|---|
| name | `{!Record.Name}` |
| description | `{!Record.Description}` |
| image | `{!Record.ProductMedia.DefaultImage}` |
| sku | `{!Record.StockKeepingUnit}` |
| productID | `{!Record.ProductCode}` |
| category | `{!Record.ProductCategory.Name}` |
| offers.price | `{!Record.Offers.Price}` |
| offers.priceCurrency | `{!Record.Offers.Currency}` |
| additionalProperty | `{!Record.ProductAttributes.<FieldApiName>}` |

**Custom field required — accessible if the admin creates a field on the Product object:**
color, size, material, pattern, gtin variants, mpn, url, sameAs, brand.name, manufacturer.name, slogan, keywords, model, countryOfOrigin, itemCondition, dates, logo, and others. The tool keeps these — the admin enters the API name of the field they created.

**Not accessible — excluded from the tool entirely:**
| Category | Fields | Why |
|---|---|---|
| Aggregated child data | `aggregateRating`, `review`, `reviews` | Requires averaging across child Review records or an external review service. Not a single scalar merge field. |
| Product relationship arrays | `isRelatedTo`, `isSimilarTo`, `isAccessoryOrSparePartFor`, `isConsumableFor`, `isVariantOf`, `hasVariant`, `predecessorOf`, `successorOf` | Reference arrays of other Product records. Head markup can't traverse relationships. |
| QuantitativeValue types | `depth`, `height`, `weight`, `width` | schema.org defines these as `{"@type": "QuantitativeValue", "value": ..., "unitCode": ...}` — a nested object. A merge field can only supply a scalar. |
| Complex object types | `potentialAction`, `hasMerchantReturnPolicy`, `subjectOf` | Require constructing a full nested schema.org object (or link to a CreativeWork/Event) — not expressible as a merge field. |
| Not commerce-applicable | `award`, `awards` | No plausible Salesforce Commerce merge expression; `awards` is superseded by `award` in schema.org. |

**The implementation decision — remove vs. badge:**

Two options were considered:
1. Show inaccessible fields with a "Not supported" warning badge
2. Remove them from the field list entirely

Option 2 was chosen. A tool that only shows what can work is more trustworthy than one that shows everything and leaves the admin to figure out what's broken. Admins who need `aggregateRating` or `review` markup are doing a custom integration — that is intentionally out of scope.

**How it's implemented:** A `FIELD_EXCLUSIONS` Set in `schema-parser.js` filters properties during TTL parsing, before any field descriptor is built. One `continue` line in `extractProperties` is all it takes — the excluded fields never reach `buildFields` or the tile grid.

**Lesson:** When building a tool with a constrained output environment, the field list should reflect what the environment can actually express — not the full surface area of the standard. Showing 60 fields when only 40 are usable isn't completeness; it's noise. Scope decisions should be driven by what produces a working result.

---

## `<template>` vs `hidden` — Right Tool for the Right Pattern

**The question:** Would replacing wizard `<section hidden>` elements with `<template>` tags improve performance in addition to readability?

**The theoretical gain:**

Content inside `<template>` is truly inert. The browser parses it but does not build live DOM nodes, does not calculate CSS for its contents, and does not include it in `document.querySelector` traversal. A `<section hidden>` element still has all its DOM nodes built and its styles computed — the browser only skips layout and paint.

So there is a real difference. For three wizard steps with ~20 nodes each, it is unmeasurable.

**Where `<template>` adds cost for a wizard:**

Toggling a `<section>` is one property flip: `element.hidden = true`. No DOM mutations. Switching steps with `<template>` requires cloning the fragment, inserting it into the DOM, then removing it on exit — more work per transition, not less. It also breaks the `elements` initialization pattern entirely, since `document.querySelector` cannot reach inside a `<template>` tag.

**Where `<template>` genuinely belongs:**

Stamping out multiple instances of the same structure from data. The mapping rows in this project are a correct example:

```html
<template id="mappingTemplate">
  <div class="mapping-row">
    <label></label>
    <input type="text" autocomplete="off" spellcheck="false" />
  </div>
</template>
```

One template, cloned once per selected field, inserted into the form. That is the use case `<template>` was designed for.

**The rule:**

| Pattern | Right tool |
|---|---|
| Show one thing, hide another | `hidden` attribute / `display: none` |
| Stamp out N copies of the same structure | `<template>` + `cloneNode` |
| Conditionally render complex markup once | `<template>` + `cloneNode` |

**Lesson:** `<template>` is for repeated stamping. `hidden` is for toggling. Chasing a theoretical performance gain by using the wrong pattern trades a real architectural cost for an unmeasurable improvement. Knowing *why* a tool exists — not just that it exists — is what determines whether to reach for it.

---

## Why a Wizard Stays One HTML File

**The question:** Since we applied Separation of Concerns by splitting constants, parsing logic, and app logic into separate files — should we also split each wizard step into its own HTML file?

**The answer:** No. And attempting it would create new problems rather than solving any real concern.

**Why separate HTML files break a wizard:**

A wizard is a single flow with shared state. Step 2 depends on what the user selected in Step 1. Step 3 depends on what they mapped in Step 2. Navigating to `step2.html` is a full page reload — all JavaScript state is lost. You'd have to serialize the state into `localStorage` or URL query params on every step transition and re-hydrate it on every page load. That's complexity invented to solve a problem you created by splitting the file.

**What Separation of Concerns actually means here:**

The principle is about separating *types of concerns* — structure from presentation from behavior from data. Not about splitting screens into documents. The separation is already correct:

```
index.html        → structure  (what exists on the page)
styles.css        → presentation  (how it looks)
constants.js      → configuration data
schema-parser.js  → parsing logic
app.js            → behavior and state
```

Each file has one job. The HTML file being large doesn't violate the principle — it's a template, not logic.

**The LWC parallel:**

In LWC, a multi-step wizard wouldn't be three separate pages with three separate Apex controllers. It would be a parent `wizardContainer` component holding three child `stepOne`, `stepTwo`, `stepThree` components — state lives in the parent, passed down as properties. The separation happens at the **component level within a shared runtime**, not at the page/document level.

The vanilla JS equivalent is exactly this pattern: one HTML document, one shared `state` object, three `<section>` elements shown or hidden based on `state.currentStep`.

**Lesson:** Separation of Concerns is not "one file per screen." It's "one file per type of responsibility." A wizard is one user flow — breaking it across documents disconnects a flow that must stay connected. The right unit of separation for a wizard's steps is a component (or a hidden section), not a page.

---

## Separation of Concerns — Applied from the LWC Pattern

**The observation:** As `app.js` grew, it was doing two different things at once — holding configuration data (constants, picklists, default values) and holding application logic (rendering, state management, event handling). The file was hard to scan because data and behavior were mixed together.

**The LWC parallel:** In Lightning Web Components, this problem is solved by file-level separation built into the framework:

```
myComponent/
  myComponent.html    → structure (template)
  myComponent.js      → controller logic
  myComponent.css     → styles
  constants.js        → shared constants, imported by the controller
```

You import the constants file directly: `import { SOMETHING } from './constants'`. The component's `.js` file stays focused on behavior, and constants live in their own file where they're easy to find and update.

**What we applied in vanilla JS:** The same split, but using the traditional script tag loading order instead of ES module imports:

```
docs/
  schema-parser.js    → schema.org TTL parsing (already separated)
  constants.js        → all static configuration data (new)
  app.js              → UI logic, state, rendering
  index.html          → loads them in order: parser → constants → app
```

```html
<script src="schema-parser.js"></script>
<script src="constants.js"></script>
<script src="app.js"></script>
```

Because each `<script>` tag runs fully before the next one starts, `constants.js` globals are available to `app.js` without any import syntax. The globals aren't explicitly imported — they live in the same browser scope — but the separation is still real and useful.

**What moved to `constants.js`:**
- `SCHEMA_REGISTRY` — schema type metadata (labels, URLs, disabled state)
- `OFFER_TYPES`, `SELLER_TYPES`, `BRAND_TYPES`, `ORGANIZATION_TYPES` — picklist option arrays
- `TYPE_HINT_DETAILS` — tooltip text for type hint badges
- `DEFAULT_OFFER` — default offer structure

**Decision rule for what goes where:**
- If it's static data that describes what the app knows → `constants.js`
- If it's runtime state that changes as the user interacts → `app.js` (`state` object)
- If it's a function that does something → `app.js`
- If it's schema.org parsing logic → `schema-parser.js`

**The pattern name:** This is called **Separation of Concerns** — the general principle that each file should have one clear responsibility. The specific technique of pulling constants into their own module is called a **Constants Module** or **Config Module** pattern. It's one of the most fundamental organizing patterns in software, and it appears in every mature codebase regardless of language or framework.

**Lesson:** LWC enforces good structure through the framework itself. Vanilla JS doesn't enforce anything — the discipline has to come from the developer. Recognizing the same underlying patterns (separate data from logic, separate parsing from rendering) and applying them manually leads to the same benefits: files that are easier to read, easier to update, and easier to reason about independently.

---

## What This Tool Is Really For

This project started as a solution to a specific client pain point. Along the way it became:

1. **A portfolio project** — demonstrates understanding of schema.org structured data, Salesforce Commerce, and web architecture
2. **A community resource** — any Salesforce admin working on SEO can use it without writing code
3. **A learning vehicle** — building real tools teaches things that tutorials don't: why you make certain choices, what breaks under real conditions, how requirements evolve

The original client problem (manual JSON-LD setup) is real and common. Salesforce Commerce doesn't ship with structured data on product pages out of the box. Any org that wants Google rich results for their products needs to add it manually. A tool that reduces that to a 3-step copy-paste workflow has genuine value.

---

---

### 8. Test Mobile, Tablet, and Desktop Before Going Live

**What happened:** The tool launched on mobile without ever being tested on an actual mobile device. Problems discovered after launch:

- Field tiles overflowed the container on narrow screens
- The tree editor (Step 2) was illegible — deeply nested indented structure doesn't compress well to 375px wide
- Attempting to fix the tree with `overflow-x: auto` failed because flex content wraps rather than overflowing, so the scrollbar never appeared
- The sticky Next/Back/Finish buttons were at the bottom of the page — users had to scroll past the entire field list to reach them

Each problem was identified one at a time through manual testing after launch, requiring multiple rounds of fixes instead of one pass before release.

**The fix — responsive views for Step 2:**

The tree editor is ideal for tablet+ (≥640px), where the extra width makes the JSON-LD structure legible. On mobile, a flat form view is used instead — one labeled input per field, with accordions for complex fields (offers, additionalProperty). The JS `renderMappings()` function dispatches between them based on `window.matchMedia("(max-width: 640px)").matches`.

The sticky footer fix was straightforward: `position: sticky; bottom: 0; background: var(--panel)` on `.step-footer`.

**The lesson — responsive design requires testing at every breakpoint:**

A CSS media query `@media (max-width: 640px)` is not a responsive design — it's a conditional style that hasn't been tested. Testing on actual hardware (or reliable emulation like Chrome DevTools device mode at 375px) is the only way to know if the layout actually works. Desktop-first development without mobile testing produces a desktop app that mobile users can't use.

**Pre-release checklist — device sizes to test:**

| Viewport | Representative device | What to verify |
|---|---|---|
| 375px | iPhone SE / Android compact | No horizontal overflow; buttons reachable; text readable |
| 640px | Small tablet portrait | Breakpoint transition correct; tree vs. form switching |
| 768px | iPad portrait | Full tree editor usable |
| 1024px+ | Desktop / iPad landscape | Full layout, multi-column if any |

**The equivalent in LWC development:** Salesforce Experience Builder has a mobile preview mode. Always check it before publishing — the desktop preview in Builder doesn't represent how the page renders on a phone.

---

### 9. Why This Tool Generates Product Schema Only (Not ProductGroup)

**What I planned:** Scope the tool for both `Product` (PDPs) and `ProductGroup` (variation master pages — a parent product with purchasable size/color/material variants). The plan was to add a second schema type card to the wizard and ship ProductGroup output alongside Product.

**What I discovered:** After building out the Variation Attributes panel and testing the full variation model, it became clear that **Head Markup can't produce Google-compliant `ProductGroup` variant structured data**, for two structural reasons.

**Reason 1 — No conditional structure.** Head Markup is a single shared template rendered identically for every product on the PDP — variation parent, variation child, and standalone non-variant product alike. Merge expressions swap values, never shape. A page can't conditionally emit a `ProductGroup` block only for variation parents.

**Reason 2 — No relationship traversal.** Google's multi-page variant model (separate URL per variant) has a hard requirement: **each variant page must be fully self-contained**. It must carry the entire `ProductGroup` entity, not just a link to it. That entity requires:

- `productGroupID` — achievable with a merge field (the group's SKU)
- `variesBy` — the *family's* varying dimensions (e.g. `color, size` for a polo, `material` for a desk) — different per product family, not expressible as a fixed merge field for a shared template
- Member variant data — sibling SKUs or the group's shared attributes — which requires traversing to other records

Google is explicit:

> "each page must have full and self-contained markup for the entities defined on that page (meaning, off-page entities shouldn't be necessary to fully understand the markup on the page itself)."

`inProductGroupWithID` (the field linking a variant page back to its group) is the *identifier* — but it is **not sufficient on its own**. The full self-contained `ProductGroup` entity must still be present on the same page.

**The `VariantParentId` finding:** Testing also revealed that `{!Record.ProductAttributes.VariantParentId}` — the standard field holding the parent Product2 ID on a variation child — does not resolve in Head Markup, even though custom fields on the same `ProductAttribute` object (e.g. `{!Record.ProductAttributes.Color__c}`) do. Even if this were fixed, it would only provide the ID link. That's necessary but not sufficient: the structural self-containment requirement is the deeper blocker.

**What this means for the tool:**

Head Markup → **Product schema only**, by design. The Variation Attributes panel remains fully valid — it emits `additionalProperty` / `PropertyValue` nodes that enrich the Product schema and only help SEO.

For `ProductGroup` variant structured data, the right tool is a **custom LWC**. An LWC can:
- Read the Product record via `@wire(getRecord, ...)`
- Detect whether the product is a variation parent, child, or standalone (via `ProductClass` or a custom field)
- Conditionally emit `ProductGroup` (for parents) or `Product` with `inProductGroupWithID` (for children)
- Build `variesBy` from the product's variation attributes
- Serialize and inject the JSON-LD into the page

Note the contrast with journal entry #1 ("Static Site over LWC"): for Product schema, an LWC is unnecessary overhead — the static site is simpler, shareable without deployment, and works across every org. For ProductGroup, the conditional-per-product-type logic is exactly what an LWC is built for. The delivery mechanism should match what the task actually requires.

**Lesson:** A tool's scope should be determined by what its delivery mechanism can express — not by how complete the underlying standard is. Head Markup expresses a flat, per-record template. Google's ProductGroup variant model is a graph. Scope down to what the mechanism can actually deliver, and point clearly to the right tool for the rest.

---

*This journal is updated as significant decisions are made or concepts are understood. Not every line of code needs to be documented — only the choices where the "why" isn't obvious from the code itself.*

---

---

---

## React Migration — From Vanilla JS to React + Vite

**Session date:** 2026-05-25 → 2026-05-26

The same tool was rewritten in React + Vite as a learning exercise. The goal was to understand how LWC patterns map to React — because React and LWC share the same reactive, declarative model. Seeing the same concepts in two frameworks is the fastest way to understand what is framework-agnostic and what is specific to each.

---

### Why Migrate to React (as a Learning Exercise)

The vanilla JS version has an imperative rendering model: every time state changes, a function like `renderMappings()` manually destroys and rebuilds DOM nodes. This works, but it forces you to manage *when* to update, *what* to update, and *how much* to rebuild.

React and LWC both flip this model: you **describe what the UI looks like given current state**, and the framework figures out the minimum DOM changes needed. The migration makes this contrast visible — every `renderXxx()` call in vanilla JS has a direct React equivalent.

---

### LWC ↔ React Pattern Reference

| LWC | React | Notes |
|---|---|---|
| `@track name = ""` | `const [name, setName] = useState("")` | Both create reactive state; calling the setter schedules a re-render |
| `@api value` | `function Comp({ value }) { ... }` | Props arrive as function arguments in React |
| `this.value = x` | `setValue(x)` | Calling the setter is what triggers the re-render |
| `connectedCallback()` | `useEffect(() => { }, [])` | Empty dep array = run once on mount |
| `renderedCallback()` | `useEffect(() => { })` | No dep array = run after every render |
| `@api set value(v) { doSomething() }` | `useEffect(() => { doSomething() }, [value])` | Dep array watches specific values, same as a reactive setter |
| `disconnectedCallback()` | cleanup `return` inside `useEffect` | `return () => removeListener()` runs on unmount or before next effect |
| `<template if:true={show}>` | `{show && <Component />}` | Short-circuit conditional rendering |
| `<template for:each={items} for:item="i">` | `{items.map(i => <Item key={i.id} />)}` | `key` in React = `key:` directive in LWC |
| `dispatchEvent(new CustomEvent('select', { detail: val }))` | call prop: `onSelect(val)` | LWC bubbles events; React passes callbacks as props |
| Component-scoped `.css` | `import './styles.css'` | This project uses one global `styles.css` |
| `template.querySelector('.foo')` | `useRef()` + `ref={myRef}` | Direct DOM access when you need it |

---

### The Fundamental Mental Model

Both React and LWC follow the same one-way data flow:

```
State (owned at top level)
  │
  │  props flow DOWN
  ▼
Child components
  │
  │  callbacks / events flow UP
  ▼
Parent updates state → re-renders triggered automatically
```

**LWC example:**
```js
// Child fires a CustomEvent
this.dispatchEvent(new CustomEvent('select', { detail: field }));

// Parent listens
<c-field-list onselect={handleSelect} />
```

**React equivalent:**
```jsx
// Child calls the prop function directly
onToggleField(field);

// Parent passes the handler as a prop
<FieldList onToggleField={handleToggleField} />
```

No global event bus. No shared mutable object. All state changes go through the parent's setter functions. This is identical in both frameworks.

---

### State Architecture: App-Level vs. Component-Level

**Rule:** State belongs at the lowest common ancestor of all components that need it.

```
App.jsx
  ├── selectedFields   ← needed by FieldList AND ScriptOutput → lives in App
  ├── mappings         ← needed by MappingEditor AND ScriptOutput → lives in App
  └── customVariations ← needed by VariationAttrsPanel AND ScriptOutput → lives in App

FieldList.jsx
  └── searchQuery      ← only FieldList uses it → lives in FieldList

MappingEditor.jsx
  └── isMobile         ← only MappingEditor uses it → lives in MappingEditor
  └── closedMappings   ← only MappingEditor uses it → lives in MappingEditor

ScriptOutput.jsx
  └── copyStatus       ← only ScriptOutput uses it → lives in ScriptOutput
```

Keeping local state local avoids unnecessary re-renders of sibling components.

---

### Immutability — React Only Re-Renders on New References

React detects state changes by comparing **object references**, not values. If you mutate the existing object, array, or Set, React sees the same reference and skips the re-render.

**Wrong (mutates in place — React won't re-render):**
```js
selectedFields.add(field.id);     // ❌ same Set reference
setSelectedFields(selectedFields);
```

**Right (new reference on every update):**
```js
setSelectedFields(prev => {
  const next = new Set(prev);     // ✅ brand new Set
  next.add(field.id);
  return next;
});
```

Same rule for objects (mappings):
```js
// ❌ Mutating in place — won't re-render
mappings[fieldId].expression = value;

// ✅ Spread creates a new object
setMappings(prev => ({
  ...prev,
  [fieldId]: { ...prev[fieldId], expression: value },
}));
```

This is the biggest adjustment coming from vanilla JS, where mutating objects is normal.

---

### The Functional Updater Pattern — Avoiding Stale Closures

When reading one state variable inside another's setter, you can accidentally read a **stale snapshot** from the last render. This is a "stale closure."

```js
// ❌ Bug: 'mappings' captured at render time, may not reflect latest state
setSelectedFields(prev => {
  const next = new Set(prev);
  next.delete(field.id);
  setMappings({ ...mappings });   // 'mappings' might be outdated
  return next;
});

// ✅ Fix: move the second setState outside the updater
setSelectedFields(prev => {
  const next = new Set(prev);
  next.delete(field.id);
  return next;
});
setMappings(prev => ({ ...prev })); // reads fresh state via its own updater
```

React batches both `setState` calls from the same event handler into one re-render — no performance penalty.

---

### `useEffect` — Three Patterns Used in This Migration

**1. Run once on mount (= LWC `connectedCallback`):**
```jsx
useEffect(() => {
  loadSchemaFields('Product').then(({ fields, error }) => {
    setFields(fields);
    setSchemaError(error);
    setSchemaLoading(false);
  });
}, []); // empty dep array = mount only
```

**2. React to a prop change (= LWC reactive setter):**
```jsx
useEffect(() => {
  document.querySelector('.app-header').inert = isOpen;
  return () => { document.querySelector('.app-header').inert = false; };
}, [isOpen]); // runs whenever isOpen changes
```

**3. Event listener with cleanup (= `connectedCallback` + `disconnectedCallback`):**
```jsx
useEffect(() => {
  const handler = e => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler); // ← cleanup
}, [isOpen, onClose]);
```

The `return () => ...` cleanup is equivalent to LWC's `disconnectedCallback()`. Without cleanup, each render adds another listener — they stack.

---

### List Keys — Use Stable IDs, Not Array Index

React uses `key` to track which list item maps to which DOM node across re-renders. When items can be removed or reordered, array index breaks this — item 0 after a deletion is a different item than item 0 before.

```jsx
// ❌ Index shifts when you remove item 0
entries.map((e, i) => <Row key={i} />)

// ✅ Stable ID survives reordering and removal
entries.map(e => <Row key={e.id} />)
```

Assign the ID at creation time, not during render:
```js
function handleAdd() {
  onEntriesChange([
    ...entries,
    { id: crypto.randomUUID(), name: '', expression: '' },
  ]);
}
```

**LWC connection:** LWC's `key:` directive in `for:each` is the same concept for the same reason.

---

### Fully Controlled Components — No Internal State

A "controlled" component holds no state. Its displayed value comes entirely from props, and every user interaction is reported back via a callback. The parent is the single source of truth.

```jsx
// Controlled input — value always reflects props, never holds its own state
<input
  value={entry.name}
  onChange={e => handleNameChange(entry.id, e.target.value)}
/>
```

`VariationAttrsPanel` is fully controlled — it receives `entries` as a prop and calls `onEntriesChange` with a new array on every change. It owns zero state.

For a read-only textarea, React still requires a handler when `value` is set:
```jsx
<textarea
  value={scriptText}
  readOnly
  onChange={() => {}}   // React requires onChange when value prop is provided
/>
```

---

### Refs — Direct DOM Access When You Need It

For rare cases where you must touch the DOM directly (focus management, reading dimensions), `useRef` gives you a stable handle to a DOM node.

```jsx
const closeButtonRef = useRef(null);

// Attach to the DOM node
<button ref={closeButtonRef}>Close</button>

// Use it inside an effect
useEffect(() => {
  if (isOpen) closeButtonRef.current.focus();
}, [isOpen]);
```

**LWC equivalent:** `this.template.querySelector('.close-btn').focus()`

Refs don't trigger re-renders — they're for imperative side effects only, not for driving UI.

---

### Viewport Detection — matchMedia + useEffect

```jsx
const [isMobile, setIsMobile] = useState(
  () => window.matchMedia('(max-width: 640px)').matches  // lazy initializer
);

useEffect(() => {
  const mq = window.matchMedia('(max-width: 640px)');
  const handler = e => setIsMobile(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler); // cleanup on unmount
}, []);
```

The `() =>` in `useState(() => ...)` is a **lazy initializer** — the function runs once on mount to get the initial value, instead of re-evaluating `window.matchMedia(...)` on every render. Without the cleanup return, each re-render of `MappingEditor` would attach another listener.

---

### Vite-Specific: Why `base` and `import.meta.env.BASE_URL` Matter

The tool is deployed to a GitHub Pages subdirectory: `drsaavedra.github.io/salesforce-schema-script-generator/`. Without the `base` setting, Vite generates asset URLs as `/assets/index.js` (broken — resolves to the root) instead of `/salesforce-schema-script-generator/assets/index.js` (correct).

```js
// vite.config.js
export default defineConfig({
  base: '/salesforce-schema-script-generator/',  // ← critical for subdirectory deploy
  build: { outDir: 'docs', emptyOutDir: true },
});
```

Inside code, use `import.meta.env.BASE_URL` to build asset paths:
```js
// ❌ Resolves to / in production → 404
fetch("data/schema.ttl")

// ✅ Resolves to /salesforce-schema-script-generator/data/schema.ttl
fetch(import.meta.env.BASE_URL + 'data/schema.ttl')
```

Vite replaces `import.meta.env.BASE_URL` at build time — it works correctly in both `npm run dev` (uses the base from config) and production.

---

### ES Modules vs. Browser Globals

Vanilla JS files use variables like `const SCHEMA_REGISTRY = ...` as **browser globals** — they're visible everywhere because they share the `window` scope.

Vite treats every file as an **ES module**. Variables are file-scoped by default — invisible outside the file unless explicitly exported.

```js
// ❌ File-scoped in Vite — not importable by other modules
const DEFAULT_OFFER = { ... };

// ✅ Exported — importable by other modules
export const DEFAULT_OFFER = { ... };
```

Every `import` statement at the top of a `.jsx` file is the explicit, auditable equivalent of the implicit browser-global dependency chain of vanilla JS.

---

### Mistakes Made During the Migration and What They Teach

| Mistake | Root cause | Lesson |
|---|---|---|
| `useState` import left in `VariationAttrsPanel` | Habit — added it by default | If a component has no internal state, it doesn't need `useState`. Controlled = pure function of props. |
| `key={idx}` for removable entries | Array index seems convenient | Array index breaks React's item tracking on removal. Use `crypto.randomUUID()` at creation. |
| Stale closure in `handleToggleField` | Reading `mappings` inside a `setSelectedFields` updater | Never read sibling state variables inside a functional updater — use separate `setState(prev => ...)` calls. |
| `handleClearAll` not resetting `mappings` | Only cleared `selectedFields` | State that conceptually resets together should reset together. |
| Error status in copy/download never cleared | `setCopyStatus('error text')` set on error, never cleared | Every `setState` that sets a value needs a matching `setTimeout` to clear it. Cover all paths. |
| `<div role="button">` missing `e.preventDefault()` | Manual ARIA vs. native element | Native `<button>` handles keyboard (Space, Enter) and accessibility correctly for free. |
| `fetch("data/schema.ttl")` broken on GitHub Pages | Relative path doesn't account for subdirectory | Always use `import.meta.env.BASE_URL` for asset paths in Vite subdirectory deployments. |
| `styles.css` wiped by `npm run build` | `emptyOutDir: true` deletes everything in `docs/` | Never store source files in the build output directory. Source files belong in `src/`. |
| Missing `export` on copied constants and parser | Copied vanilla globals directly into Vite modules | ES module scope is file-local. Add `export` to everything that needs to cross a module boundary. |

---

### Component-Level Pattern Summary

| Component | What it demonstrates |
|---|---|
| `App.jsx` | Top-level state ownership; `useEffect` for async data load; distributing state and callbacks to children |
| `StepsNav.jsx` | Pure presentational component — zero state, output is entirely a function of props |
| `FieldList.jsx` | Local state (`searchQuery`) colocated with the only component that uses it; derived values computed inline (no `useEffect`) |
| `MappingEditor.jsx` | `matchMedia` + `useEffect` for viewport detection; deeply nested controlled inputs; immutable entry mutations |
| `VariationAttrsPanel.jsx` | Fully controlled — no internal state; parent owns the array |
| `ScriptOutput.jsx` | Business logic in module-scope pure functions; derived values (`scriptText`, `warnings`) computed synchronously — no `useEffect` needed |
| `SchemaPreviewModal.jsx` | Three separate `useEffect` hooks for three distinct side effects; returns `null` when closed instead of hiding |

---

### The Biggest Conceptual Shift

In vanilla JS, the question you ask is: **"When state changes, what do I need to re-render?"**

In React (and LWC), the question you ask is: **"Given this state, what should the UI look like?"**

The framework answers the second question automatically. Your job is only to keep state correct.

```
Vanilla JS:  state change → call renderXxx() → manually update DOM
React/LWC:   state change → framework diffs virtual DOM → updates only what changed
```

The migration from vanilla JS to React is fundamentally a shift from *imperative* (you manage the how and when) to *declarative* (you describe the what).

---

### Tab-to-Fill Placeholder — LWC ↔ React Parallel

**Feature:** When an input that has a Salesforce merge-expression placeholder (e.g. `{!Record.Name}`) is empty and focused, a subtle hint `Tab ↹ to fill` appears next to it. Pressing Tab populates the input with the placeholder value and keeps focus on the field. A second Tab advances focus normally.

**Scope rule:** Only inputs whose placeholder starts with `{!` get this behavior. Pure hint placeholders like `"Company Name"` or `"e.g. Angle"` are left alone — auto-filling those would put the hint text itself into the field.

---

#### LWC implementation — step by step

In LWC, this becomes its own component (`mergeFieldInput`) because LWC is component-centric. Reactive state uses `@track`; events flow up via `CustomEvent`.

**Step 1: Component file structure**
```
mergeFieldInput/
  mergeFieldInput.html     ← template
  mergeFieldInput.js       ← controller
  mergeFieldInput.css      ← scoped styles
```

**Step 2: Controller — state and derived getters**
```js
import { LightningElement, api, track } from 'lwc';

export default class MergeFieldInput extends LightningElement {
  @api value;           // current value (parent-controlled)
  @api placeholder;     // the merge expression hint
  @api fieldId;         // so parent can identify which field changed
  @track isFocused = false;

  get isMergeExpression() {
    return this.placeholder && this.placeholder.startsWith('{!');
  }
  get isEmpty()     { return !this.value; }
  get showTabHint() { return this.isFocused && this.isEmpty && this.isMergeExpression; }
}
```

**Step 3: Event handlers in the controller**
```js
handleFocus() { this.isFocused = true; }
handleBlur()  { this.isFocused = false; }

handleKeyDown(event) {
  if (event.key !== 'Tab' || event.shiftKey) return; // not our Tab
  if (!this.isEmpty || !this.isMergeExpression) return; // nothing to fill
  event.preventDefault();                              // stop focus advance
  this.dispatchEvent(new CustomEvent('fill', {
    detail: { fieldId: this.fieldId, value: this.placeholder },
  }));
}

handleChange(event) {
  this.dispatchEvent(new CustomEvent('change', {
    detail: { fieldId: this.fieldId, value: event.target.value },
  }));
}
```

**Step 4: Template**
```html
<template>
  <div class="merge-field-input">
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onfocus={handleFocus}
      onblur={handleBlur}
      onkeydown={handleKeyDown}
      oninput={handleChange}
    />
    <template if:true={showTabHint}>
      <span class="tab-hint">Tab ↹ to fill</span>
    </template>
  </div>
</template>
```

**Step 5: Parent wires up the component**
```html
<c-merge-field-input
  value={mappings[field.id].expression}
  placeholder="{!Record.FieldApiName}"
  field-id={field.id}
  onfill={handleFill}
  onchange={handleExpressionChange}
></c-merge-field-input>
```
```js
handleFill(event) {
  const { fieldId, value } = event.detail;
  this.mappings[fieldId] = { ...this.mappings[fieldId], expression: value };
}
```

Notice that LWC needs a **separate `onfill` event** because the fill is semantically different from a user typing. React doesn't need this distinction.

---

#### React implementation (Approach A: inline in `TreeInput` / `FlatInput`) — step by step

React doesn't need a new component. The existing `TreeInput` and `FlatInput` helper functions in `MappingEditor.jsx` gain focus state and a Tab handler inline.

**Step 1: Add focus state**
```jsx
const [isFocused, setIsFocused] = useState(false);
```

**Step 2: Derive the booleans** (same logic as LWC getters)
```jsx
const isMergeExpression = placeholder?.startsWith('{!') ?? false;
const isEmpty = !value;
const showTabHint = isFocused && isEmpty && isMergeExpression && !disabled;
```

**Step 3: Build the Tab handler**
```jsx
function handleKeyDown(e) {
  if (e.key !== 'Tab' || e.shiftKey) return;
  if (!isEmpty || !isMergeExpression || disabled) return;
  e.preventDefault();
  onChange(placeholder); // same callback as typing — no new event needed
}
```

**Step 4: Wire up the input and render the hint**
```jsx
return (
  <span className="input-with-hint">
    <input
      value={value || ''}
      placeholder={placeholder}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={handleKeyDown}
      onChange={e => onChange(e.target.value)}
      ...rest of existing props...
    />
    {showTabHint && <span className="tab-fill-hint">Tab ↹ to fill</span>}
  </span>
);
```

**Step 5: No parent changes** — the `onChange(placeholder)` call routes through the same `handleMappingChange` in `App.jsx` as any typed value. LWC needed a distinct `onfill` event; React needs nothing extra because callbacks are just functions.

---

#### LWC ↔ React comparison table for this feature

| Concept | LWC | React |
|---|---|---|
| Component state | `@track isFocused = false` | `const [isFocused, setIsFocused] = useState(false)` |
| Derived computed value | `get showTabHint() { return ... }` | `const showTabHint = ...` (inline expression) |
| Focus handler | `handleFocus() { this.isFocused = true; }` | `onFocus={() => setIsFocused(true)}` |
| Blur handler | `handleBlur() { this.isFocused = false; }` | `onBlur={() => setIsFocused(false)}` |
| Intercept keyboard event | `handleKeyDown(event) { event.preventDefault(); }` | `function handleKeyDown(e) { e.preventDefault(); }` |
| Signal parent on fill | `dispatchEvent(new CustomEvent('fill', { detail }))` | `onChange(placeholder)` (calls prop directly) |
| Conditional rendering | `<template if:true={showTabHint}>` | `{showTabHint && <span>...}` |
| Parent listens for fill | `<c-input onfill={handleFill}>` | `<TreeInput onChange={handleMappingChange}>` — same handler, no extra event |

The key difference: **LWC needs two events** (`onfill` + `onchange`) because it treats a Tab fill as semantically different from typing. React needs only one callback because the callback is just a function — the fill calls it the same way typing does.

---

#### Why Approach A (inline) before Approach B (custom hook)

After implementing Approach A, `TreeInput` and `FlatInput` both contain identical Tab-fill logic (~12 lines each). This is visible, tangible duplication. The standard React solution is to extract it into a **custom hook**.

**The rule of three:** Don't extract until you have at least 3 use cases of the same pattern. With only two call sites, the duplication is small and the abstraction may not have the right shape yet.

**Sandi Metz:** *"Duplication is far cheaper than the wrong abstraction."*

So Approach A ships first. When a third input (e.g. VariationAttrsPanel's expression field) adopts the pattern, *that's* the moment to extract. The extraction looks like:

```js
// src/hooks/useTabFill.js
import { useState } from 'react';

export function useTabFill({ value, placeholder, onChange, disabled }) {
  const [isFocused, setIsFocused] = useState(false);
  const isMergeExpression = placeholder?.startsWith('{!') ?? false;
  const isEmpty = !value;
  const showTabHint = isFocused && isEmpty && isMergeExpression && !disabled;

  function handleKeyDown(e) {
    if (e.key !== 'Tab' || e.shiftKey) return;
    if (!isEmpty || !isMergeExpression || disabled) return;
    e.preventDefault();
    onChange(placeholder);
  }

  return {
    showTabHint,
    inputProps: {
      onFocus: () => setIsFocused(true),
      onBlur:  () => setIsFocused(false),
      onKeyDown: handleKeyDown,
    },
  };
}
```

Then both `TreeInput` and `FlatInput` reduce to:
```jsx
const { showTabHint, inputProps } = useTabFill({ value, placeholder, onChange, disabled });
// ...
<input {...inputProps} value={value || ''} onChange={e => onChange(e.target.value)} />
{showTabHint && <span className="tab-fill-hint">Tab ↹ to fill</span>}
```

A custom hook:
- Contains `useState` and event handlers, but **returns no JSX** — that's the key rule that distinguishes a hook from a component
- Can call other hooks internally
- Must follow the Rules of Hooks: called at the top level, never inside conditions or loops
- Name starts with `use` (convention that React's linter enforces)

The exercise of building Approach A first, seeing the duplication, then extracting it is the intended learning path.

---

## Flex Chain Breakage — The Wrapper Element Trap

**Session date:** 2026-05-28

### The bug

When a `flex: 1` input is wrapped in a new element for layout reasons (e.g. to host a sibling hint span), the input loses its flex-child role. The *wrapper* becomes the flex child, and if the wrapper has no `flex` rule, it shrinks to its content.

**Before Tab-to-fill:**
```
.tree-row (display: flex)
└── input.tree-input (flex: 1)    ← direct flex child, fills remaining space
```

**After Tab-to-fill:**
```
.tree-row (display: flex)
└── span.input-with-hint           ← new flex child — no flex: 1, collapses to min-content
    └── input.tree-input (flex: 1) ← now filling its parent span, not the row
```

Every input across the tree collapsed to `min-width: 120px`, making them all look the same length regardless of the row's key length.

### The fix pattern

Add a **scoped** rule on the wrapper that restores the flex chain:

```css
.tree-row .input-with-hint {
  flex: 1;
  min-width: 0;   /* ← critical: see below */
}
```

Scope it to the specific parent context (`.tree-row`) rather than making `.input-with-hint { flex: 1 }` global — other layouts (mobile flat form, variation rows) have their own scoped rules and different layout needs.

### Why `min-width: 0`

A flex item's default `min-width` is `auto`, meaning "at least as wide as my content's intrinsic minimum." Without overriding it, the span would refuse to shrink below the placeholder text's pixel width — causing the row to overflow on narrow panels when the placeholder is a long merge expression like `{!Record.ProductAttributes.FieldName__c}`.

Setting `min-width: 0` says "defer to the flex algorithm for the minimum." The `<input>` inside still carries its own `min-width: 120px`, which becomes the real floor.

**Rule of thumb:** whenever you wrap a flex child in a new element, immediately check:
1. Does the wrapper need `flex: 1` (or `flex: 0 0 Npx`) to preserve the parent's layout intent?
2. Does the wrapper need `min-width: 0` to allow shrinking past content intrinsic width?

The same bug appeared in `VariationAttrsPanel` and was fixed the same way with `.custom-variation-row .input-with-hint { flex: 1; }`.

---

## `<details>` / `<summary>` — Zero-JS Accessible Disclosure

**Session date:** 2026-05-28

### When to reach for it

The Variation Attributes panel had a schema.org advisory note that most users don't need on every visit. Instead of a `useState` boolean + conditional render, the native `<details>` element was used.

### LWC equivalent pattern

In LWC you'd track state explicitly:

```js
@track isNoteVisible = false;
toggleNote() { this.isNoteVisible = !this.isNoteVisible; }
```
```html
<button onclick={toggleNote}>?</button>
<template if:true={isNoteVisible}>
  <div class="info-body">...</div>
</template>
```

### React `useState` equivalent

```jsx
const [open, setOpen] = useState(false);
// ...
<button onClick={() => setOpen(o => !o)} aria-expanded={open}>?</button>
{open && <div className="info-body">...</div>}
```

### `<details>` — the zero-JS version

```jsx
<details className="variation-attrs-info">
  <summary aria-label="Show schema.org guidance">?</summary>
  <div className="variation-attrs-info-body">
    <p>Note: ...</p>
  </div>
</details>
```

No state, no handler, no ARIA wiring. The browser provides:
- Keyboard toggle (Enter/Space on `<summary>`)
- `aria-expanded` state announced to screen readers automatically
- An `open` attribute on `<details>` that CSS can target for styling

### Styling the marker away

The default browser disclosure triangle appears before `<summary>`. Remove it cross-browser with:

```css
summary::-webkit-details-marker { display: none; }  /* Chrome/Safari */
summary::marker { content: ''; }                     /* Firefox/standard */
```

Then style `<summary>` as any element — in this case a 16×16px circular `(?)` badge.

### When to use `<details>` vs `useState`

| Use `<details>` | Use `useState` |
|---|---|
| Simple show/hide of supplemental info | Content affects layout significantly (panels, modals) |
| No JS needed in the toggle action | Toggle triggers async work (API call, animation) |
| Accessibility for free is a priority | State needs to sync with other component state |
| The toggle lives entirely inside one component | Parent needs to know the open/closed status |

The rule of thumb: if the only thing the toggle does is show/hide some HTML, `<details>` is almost always the right answer. Reach for `useState` when the toggle drives behaviour beyond rendering.

### `focus-visible` vs `focus`

The disclosure summary received a custom focus ring using `focus-visible` rather than `focus`:

```css
.variation-attrs-info summary:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--focus) 50%, transparent);
  outline-offset: 2px;
}
```

`focus-visible` fires only for keyboard navigation (Tab key), not mouse clicks. This matches how modern design systems style focus rings — sighted mouse users don't need the ring; keyboard and screen-reader users do. The browser uses internal heuristics to decide which applies.

---

## UI/UX — Grouped Card Pattern for Optional/Advanced Sections

**Session date:** 2026-05-28

### The problem with hard dividers

A `border-top` creates a visual wall that implies two equal, parallel sections. Used between the main JSON tree editor and the Variation Attributes panel, it signalled "these are siblings" — but semantically, the variation panel is optional, advanced, and subordinate to the main editor.

Four symptoms of the original design:
1. Hard `border-top` — visual wall between two sections
2. UPPERCASE `<h3>` in accent color — competing with the page heading
3. Three paragraphs before any interactive UI — documentation dump before action
4. Empty state: a lonely "+ Add" button — orphaned

### The soft grouped card solution

Instead of a hard line, use **background tint + border-radius** to do the grouping:

```css
.variation-attrs-panel {
  background: color-mix(in srgb, var(--accent) 4%, transparent);
  border-radius: 8px;
  margin-top: 24px;
  padding: 18px 20px;
}
```

The same accent-tint language is used throughout the app (`.tree-input` uses 6%). A slightly lighter tint (4%) signals the panel is the *container*, and the inputs inside it remain the visually active elements.

### Design token hierarchy

| Element | Tint % | Role |
|---|---|---|
| `tree-input` background | 6% | Active edit target |
| `variation-attrs-panel` background | 4% | Container / grouping surface |
| `variation-attrs-info summary` | 15% → 25% hover | Interactive control |

Consistent tint percentages give the UI a coherent material language without a full design token system.

### Heading hierarchy matters

Changing the heading from `<h3>` uppercase accent to `<h4>` sentence-case ink-colored removes the visual competition with the page's `<h2>` "Salesforce Bindings". The heading's semantic level should reflect its importance in the page outline, not its visual size.

| Before | After |
|---|---|
| `<h3>` VARIATION ATTRIBUTES — accent color, uppercase, 15px bold | `<h4>` Custom variation attributes — ink color, sentence case, 14px semibold |

---

*This journal is updated as significant decisions are made or concepts are understood. Not every line of code needs to be documented — only the choices where the "why" isn't obvious from the code itself.*
