# Salesforce Commerce Schema Script Generator

A free, browser-based tool that generates paste-ready JSON-LD structured data scripts for Salesforce Commerce Experience Builder.

**[Launch the tool →](https://drsaavedra.github.io/salesforce-schema-script-generator/)**

---

## What it does

Salesforce Commerce product pages don't include structured data (JSON-LD) out of the box. Adding it manually means reading schema.org documentation, writing JSON by hand, mapping Salesforce merge expressions correctly, and repeating that process for every site and every page type.

This tool automates that. Pick the schema fields you want, map them to your Salesforce field API names, and get a ready-to-paste `<script type="application/ld+json">` block — formatted exactly as Experience Builder's Head Markup expects it.

**Currently supported:** `Product` (for Product Detail Pages)

**Coming soon:** `ProductGroup` (for variation master products — products with color/size/material variants)

---

## Planned: ProductGroup

`ProductGroup` is next on the roadmap, targeting **variation master product pages** — pages in Salesforce Commerce where a single parent product (e.g. "Classic Polo") has purchasable variants that differ by attributes like color, size, or material.

### Why ProductGroup fits Salesforce Commerce variation products

Salesforce Commerce models variation products with a **variation master** (the parent) and **variation children** (the individual SKUs). The master product holds the shared attributes — name, description, images, category — while the variants each carry their specific attribute combination. This is exactly the structure `schema.org/ProductGroup` describes: a group of products that "vary only in certain well-described ways."

Google explicitly supports `ProductGroup` in their structured data guidelines for product variants, making it the right schema type for variation master PDPs.

### Planned field mapping

The implementation will use Salesforce Commerce's out-of-the-box `ProductVariation` data model and its native merge expressions — no custom Apex or LWC required.

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

## How to use it

### Step 1 — Select schema fields

Choose which schema.org Product fields to include in your structured data. Fields are sourced directly from the official [schema.org Product specification](https://schema.org/Product).

- Click **Recommended** to pre-select the fields most useful for e-commerce SEO (`name`, `description`, `image`, `sku`, `brand`, `offers`, `additionalProperty`)
- Use the search bar to find a specific field
- Select as many or as few fields as you need
- Click **Next** when you're done

### Step 2 — Salesforce bindings

Map each selected field to a Salesforce merge expression. The editor mirrors the actual JSON-LD structure so you can see exactly where each value ends up.

**Common native expressions** (these work in any standard Salesforce Commerce store):

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

**Type hints** — colored badges next to each field show the expected data type. Pay attention to amber **Boolean** badges — mapping a text merge field to a boolean field produces a validation error.

Click **Finish** when all your fields are mapped.

### Step 3 — Copy and paste

**BreadcrumbList** — Check "Include BreadcrumbList" to append a second script block using Salesforce's native `{!Record.BreadcrumbList}` expression. This adds breadcrumb structured data automatically — no field mapping required.

The tool generates the complete script output. Click **Copy** and paste it directly into Experience Builder:

1. Open your Product Detail Page in Experience Builder
2. Click the page settings gear → **Edit Head Markup**
3. Paste the script into the head markup editor
4. Save and publish

> Experience Builder's head markup does not support HTML comments. The tool's output contains none.

---

## Why some schema.org fields aren't listed

The tool only shows fields that can be populated via Salesforce Commerce merge expressions. Fields that require aggregated data, relationship traversal, or nested objects are excluded — showing them would let admins generate structured data that looks valid but produces empty or malformed output.

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

A GitHub Actions workflow runs every Monday and pulls any new schema.org releases automatically — so the field list stays current without manual updates.

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
    schema.ttl      — bundled schema.org vocabulary (auto-updated)
```

---

## License

MIT
