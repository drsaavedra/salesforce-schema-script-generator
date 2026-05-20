# Salesforce B2B Commerce Schema Script Generator

A free, browser-based tool that generates paste-ready JSON-LD structured data scripts for Salesforce B2B Commerce Experience Builder.

**[Launch the tool →](https://drsaavedra.github.io/salesforce-schema-script-generator/)**

---

## What it does

Salesforce B2B Commerce product pages don't include structured data (JSON-LD) out of the box. Adding it manually means reading schema.org documentation, writing JSON by hand, mapping Salesforce merge expressions correctly, and repeating that process for every site and every page type.

This tool automates that. Pick the schema fields you want, map them to your Salesforce field API names, and get a ready-to-paste `<script type="application/ld+json">` block — formatted exactly as Experience Builder's Head Markup expects it.

**Currently supported:** `Product` (for Product Detail Pages)

**Coming soon:** `ProductGroup` (for variation master products — products with color/size/material variants)

---

## Prerequisites — Salesforce B2B Commerce SEO journey

JSON-LD structured data is the final layer of Salesforce B2B Commerce SEO. Before this tool is useful, the earlier layers should already be in place:

1. **Sitemap** — Configure Salesforce B2B Commerce sitemap generation so product and category pages are included in your XML sitemap. This tells search engines what pages exist on your site.

2. **Search Engine Manager** — Register your sitemap with Google Search Console and Bing Webmaster Tools via Salesforce's built-in Search Engine Manager. This submits your sitemap to the major crawlers and unlocks indexing.

3. **Snapshots** — Enable Salesforce B2B Commerce Snapshot rendering so that JavaScript-rendered page content is served as pre-rendered HTML to crawlers. Without snapshots, search engines may see an empty shell instead of product content.

4. **JSON-LD Structured Data** — Once your pages are crawlable, indexed, and rendering correctly, add structured data to help Google understand what each page represents. That is what this tool is for.

See the [Salesforce B2B Commerce SEO documentation](https://help.salesforce.com/s/articleView?id=commerce.comm_seo.htm&type=5) for the official setup guide covering all four layers.

---

## How to use it

### Step 1 — Select schema fields

Choose which schema.org Product fields to include in your structured data. Fields are sourced directly from the official [schema.org Product specification](https://schema.org/Product).

- Click **Recommended** to pre-select the fields most useful for e-commerce SEO: `name`, `description`, `image`, `sku`, `productID`, `offers`, `brand`, `additionalProperty`
- Use the search bar to filter fields by name or description. When results are shown, a **Select all matching** button appears to bulk-select every result at once
- Select as many or as few fields as you need
- Click **Next** when you're done

### Step 2 — Salesforce bindings

Map each selected field to a Salesforce merge expression.

- **On mobile** — fields appear as a simple labeled form, one input per field. Complex fields like `offers` and `additionalProperty` use collapsible accordions.
- **On tablet and desktop** — fields appear in a JSON-LD tree editor that mirrors the actual output structure, so you can see exactly where each value ends up.

**Common native expressions** (these work in any standard Salesforce B2B Commerce store):

| Field | Expression |
|---|---|
| `name` | `{!Record.Name}` |
| `description` | `{!Record.Description}` |
| `image` | `{!Record.ProductMedia.ProductDetailImages}` |
| `sku` | `{!Record.StockKeepingUnit}` |
| `category` | `{!Record.ProductCategory.Name}` |
| `offers.price` | `{!Record.Offers.Price}` |
| `offers.priceCurrency` | `{!Record.Offers.Currency}` |

**Custom fields** — for fields like `color`, `brand.name`, or `material`, enter the API name of the field on your Product2 object (e.g., `My_Brand__c`). The tool wraps it automatically as `{!Record.My_Brand__c}`.

**Type hints** — colored badges next to each field show the expected data type. Pay attention to amber **Boolean** and **Number** badges — mapping a text merge expression to these types produces a validation error.

**Offers** — if you include `offers`, the tool exposes sub-fields for price, currency, seller name, seller URL, and seller type (Organization, Corporation, LocalBusiness, or Person). Price and currency have "Use default" toggles that pre-fill the native Salesforce B2B Commerce expressions (`{!Record.Offers.Price}` and `{!Record.Offers.Currency}`).

**additionalProperty** — generates a `PropertyValue` array. Use the **Add property** button to define as many name/value pairs as needed; each entry maps independently to its own merge expression.

**Preview Schema** — click **Preview Schema** at any point to open a live JSON tree view of your current output before moving to Step 3. Useful for catching structural issues before copying.

**Reset** — click **Reset** to clear all field mappings and start Step 2 over without losing your field selections from Step 1.

Click **Finish** when all your fields are mapped.

### Step 3 — Copy and paste

**BreadcrumbList** — Check "Include BreadcrumbList" to combine Product and BreadcrumbList into a single `<script type="application/ld+json">` block as a JSON array, following the [Salesforce structured data format](https://help.salesforce.com/s/articleView?id=commerce.comm_seo_structured_data.htm&type=5). The BreadcrumbList entry uses `{!Record.BreadcrumbList}` as the `itemListElement` value — no field mapping required.

**Warnings** — if any selected field has an empty or incomplete mapping, the tool displays a warning list above the output. Resolve all warnings before pasting to avoid malformed structured data in Experience Builder.

The tool generates the complete script output. Click **Copy** to copy it to your clipboard, or **Download** to save it as `product-schema-head-markup.html`. Paste directly into Experience Builder:

1. Open your Product Detail Page in Experience Builder
2. Click the page settings gear → **Edit Head Markup**
3. Paste the script into the head markup editor
4. Save and publish

> Experience Builder's head markup does not support HTML comments. The tool's output contains none.

---

## Why some schema.org fields aren't listed

The tool only shows fields that can be populated via Salesforce B2B Commerce merge expressions. Fields that require aggregated data, relationship traversal, or nested objects are excluded — showing them would let admins generate structured data that looks valid but produces empty or malformed output.

| Category | Excluded fields | Why |
|---|---|---|
| Aggregated child data | `aggregateRating`, `review`, `reviews` | Require averaging across child Review records or an external review service — not a single scalar field |
| Product relationship arrays | `isRelatedTo`, `isSimilarTo`, `isAccessoryOrSparePartFor`, `isConsumableFor`, `isVariantOf`, `hasVariant`, `predecessorOf`, `successorOf` | Reference arrays of other Product records — head markup can't traverse relationships |
| QuantitativeValue types | `depth`, `height`, `weight`, `width` | schema.org requires a nested object `{"@type": "QuantitativeValue", "value": ..., "unitCode": ...}` — a scalar merge field cannot produce this |
| Complex nested objects | `potentialAction`, `hasMerchantReturnPolicy`, `subjectOf` | Require constructing a full nested schema.org object — not expressible as a merge expression |
| Not commerce-applicable | `award`, `awards` | No plausible Commerce merge expression; `awards` is deprecated in schema.org |

Admins who need `aggregateRating` or `review` markup are doing a custom integration — those are intentionally out of scope.

---

## Validating your output

After pasting into Experience Builder and publishing, validate the page's structured data with the [Schema.org Validator](https://validator.schema.org/). Enter your page URL to check that Google can read the markup correctly.

---

## Planned: ProductGroup

`ProductGroup` is next on the roadmap, targeting **variation master product pages** — pages in Salesforce B2B Commerce where a single parent product (e.g. "Classic Polo") has purchasable variants that differ by attributes like color, size, or material.

### Why ProductGroup fits Salesforce B2B Commerce variation products

Salesforce B2B Commerce models variation products with a **variation master** (the parent) and **variation children** (the individual SKUs). The master product holds the shared attributes — name, description, images, category — while the variants each carry their specific attribute combination. This is exactly the structure `schema.org/ProductGroup` describes: a group of products that "vary only in certain well-described ways."

Google explicitly supports `ProductGroup` in their structured data guidelines for product variants, making it the right schema type for variation master PDPs.

### Planned field mapping

The implementation will use Salesforce B2B Commerce's out-of-the-box `ProductVariation` data model and its native merge expressions — no custom Apex or LWC required.

| schema.org field | Planned expression | Notes |
|---|---|---|
| `name` | `{!Record.Name}` | Master product name |
| `description` | `{!Record.Description}` | |
| `image` | `{!Record.ProductMedia.ProductDetailImages}` | |
| `productGroupID` | `{!Record.ProductCode}` | Unique identifier for the variation family |
| `variesBy` | `{!Record.ProductAttributes.<VariationAttribute>}` | The attribute dimension variants differ on (e.g. Color, Size) |
| `category` | `{!Record.ProductCategory.Name}` | |

The `variesBy` field is the key differentiator — it tells Google what dimension the variants differ on. Admins enter the API name of the variation attribute field configured on their Product object (e.g. a custom `Variation_Color__c` field), and the tool wraps it as `{!Record.ProductAttributes.Variation_Color__c}`.

---

## Local development

The site is a no-build static site — no npm or bundler required.

Because the tool fetches `data/schema.ttl` at load time, it must be served over HTTP (not opened as a local `file://`). Use any local server:

```bash
# VS Code — install the Live Server extension and click "Go Live"

# Node
npx serve docs

# Python
python -m http.server 8000 --directory docs
```

Then open `http://localhost:8000` (or whatever port your server uses).

---

## How schema fields are sourced

Field definitions are parsed at load time from the official [schema.org Turtle vocabulary file](https://schema.org/version/latest/schemaorg-current-https.ttl). The tool walks the full `rdfs:subClassOf` inheritance chain (e.g., `Product → Thing`) to collect all applicable properties.

The bundled `data/schema.ttl` is a pinned, tested release of the schema.org vocabulary. It is updated manually when a new schema.org version has been validated against the tool — automated syncs were removed after a breaking format change in schema.org v30 was discovered silently in production.

---

## Testing

The `tests/` directory contains a static code analysis QA suite. Tests are run before every release using Claude Code subagents — no test runner or build step required.

### How to run

Open Claude Code in this repo and send a prompt like:

> Spawn 4 subagents in parallel, one per file in `tests/`. Each agent should read its test file and the source files in `docs/`, trace the code statically for each test case, and report PASS or FAIL with severity, affected function/line, and expected vs actual behaviour.

Each test file is self-contained with instructions for which source files to read.

### Test files

| File | Scope | Cases |
|---|---|---|
| `tests/qa-1-field-combinations.md` | All field valueTypes produce correct JSON-LD output | 15 |
| `tests/qa-2-data-types-validation.md` | Data type coercion, warnings, FIELD_EXCLUSIONS, TTL parser | 18 |
| `tests/qa-3-edge-cases-ui.md` | Navigation, modal, copy/download, accessibility, edge cases | 23 |
| `tests/qa-4-mobile-tablet-views.md` | Mobile form view, tablet tree view, responsive dispatch, sticky footer | 30 |

All 86 test cases must pass before merging to `main`.

---

## Contributing

Issues and PRs welcome. The codebase is vanilla HTML/CSS/JavaScript with no build step:

```
docs/
  index.html        — markup and wizard structure
  styles.css        — all styles
  constants.js      — static configuration (schema registry, picklists)
  schema-parser.js  — schema.org TTL parsing logic
  app.js            — UI state, rendering, event handling
  data/
    schema.ttl      — bundled schema.org vocabulary (pinned, manually updated)
tests/
  qa-*.md           — static analysis test cases (run via Claude Code subagents)
```

---

## Known limitations

- **Salesforce B2B Commerce only** — merge expressions like `{!Record.Name}` are specific to Salesforce B2B Commerce. This tool does not generate markup for B2C Commerce or other Salesforce clouds.
- **One schema type at a time** — the tool generates one `Product` script per page. `ProductGroup` support is planned but not yet available.
- **No configuration save/load** — there is no way to save a mapping configuration and reload it in a future session. Each session starts fresh.
- **No batch generation** — the tool generates output for one page type per session.
- **BreadcrumbList output is fixed** — the BreadcrumbList block uses Salesforce's native `{!Record.BreadcrumbList}` expression and cannot be customized.
- **aggregateRating and review require a custom integration** — these fields depend on aggregated child data that cannot be expressed as a single merge expression and are intentionally excluded from the field list.

---

## References

- [Salesforce B2B Commerce SEO documentation](https://help.salesforce.com/s/articleView?id=commerce.comm_seo.htm&type=5) — official guide covering sitemaps, search engine registration, snapshots, and structured data
- [Salesforce B2B Commerce structured data format](https://help.salesforce.com/s/articleView?id=commerce.comm_seo_structured_data.htm&type=5) — official merge expression reference and JSON-LD output format
- [schema.org Product specification](https://schema.org/Product)
- [Google structured data guidelines — Product](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Schema.org Validator](https://validator.schema.org/)

---

## License

MIT
