// Parses docs/data/schema.ttl (local copy of schema.org Turtle file) and returns
// field descriptor objects for a given schema type.
//
// How it works:
//   1. Scan the TTL once into named blocks.
//   2. Build a class map (name → parent names) from rdfs:Class blocks.
//   3. BFS-walk the class map to collect a type's full ancestor set.
//   4. Extract every rdf:Property whose :domainIncludes overlaps that ancestor set.
//   5. Merge with FIELD_OVERRIDES for Salesforce-specific metadata.
//
// Public API:
//   loadSchemaFields(typeName) -> Promise<Array<FieldDescriptor>>
//   (TTL is fetched once and cached across calls)

// ── Salesforce metadata overrides ─────────────────────────────────────────────
// Keys are schema.org property names. Anything not listed gets generic defaults.
const FIELD_OVERRIDES = {
  // Core product identity
  name:               { label: "Name",                defaultField: "Name",             defaultSelected: true,  valueType: "text" },
  description:        {                               defaultField: "Description",       defaultSelected: true,  valueType: "text" },
  image:              { defaultExpression: "{!Record.ProductMedia.ProductDetailImages}",   defaultSelected: true,  valueType: "text" },
  sku:                { label: "SKU",                 defaultField: "StockKeepingUnit",  defaultSelected: true,  valueType: "text" },
  productID:          { label: "Product ID",          defaultField: "ProductCode",       defaultSelected: true,  valueType: "text" },
  brand:              { path: "brand.name",                                              defaultSelected: false, valueType: "brand" },
  offers:             {                                                                  defaultSelected: true,  valueType: "offer" },
  additionalProperty: {                                                                  defaultSelected: false, valueType: "propertyValue" },
  category:           { defaultExpression: "{!Record.ProductCategory.Name}",                                    valueType: "expression" },
  manufacturer:       { path: "manufacturer.name",                                                              valueType: "organization" },

  // Non-obvious type hints (validator will reject wrong types)
  isFamilyFriendly:   { typeHint: "Boolean", valueType: "raw" },
  url:                { typeHint: "URL" },
  sameAs:             { typeHint: "URL" },
  logo:               { typeHint: "URL" },
  mainEntityOfPage:   { typeHint: "URL" },
  productionDate:     { typeHint: "Date" },
  purchaseDate:       { typeHint: "Date" },
  releaseDate:        { typeHint: "Date" },

  // Product variant cross-page linking
  // No OOTB Salesforce field exposes the parent product ID from a variation child page.
  // Requires a custom lookup field on Product2 populated via Flow.
  inProductGroupWithID: { label: "In Product Group With ID", valueType: "text" },

};

// Fields shown first in Step 1 tile grid, in order, per schema type.
const RECOMMENDED_ORDER = {
  Product: ["name", "description", "image", "sku", "productID", "offers", "brand", "additionalProperty"],
};

// Fields excluded because they cannot be expressed as a Salesforce merge field
// in Experience Builder Head Markup. See learning.md for the full reasoning.
const FIELD_EXCLUSIONS = new Set([
  // Requires aggregated child record data or an external review service
  "aggregateRating", "review", "reviews",
  // Product relationship arrays — reference other Product records, not scalar fields
  "isRelatedTo", "isSimilarTo", "isAccessoryOrSparePartFor",
  "isConsumableFor", "isVariantOf", "hasVariant",
  "predecessorOf", "successorOf",
  // QuantitativeValue types — require a nested {value, unitCode} object;
  // a merge field can only supply a scalar
  "depth", "height", "weight", "width",
  // Complex nested object types with no scalar merge field equivalent
  "potentialAction", "hasMerchantReturnPolicy", "subjectOf",
  // Not applicable to Salesforce Commerce product data
  "award", "awards",
]);

// ── TTL parsing ───────────────────────────────────────────────────────────────

function toHumanLabel(propName) {
  return propName
    .replace(/([A-Z])/g, " $1")
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .trim();
}

// Single pass over the TTL: splits into named subject blocks [{name, text}].
// Each block starts with ":Name a <type>" and ends when the next subject starts.
function parseTTLBlocks(ttl) {
  const blocks = [];
  let name = null;
  let lines = [];

  const flush = () => {
    if (name && lines.length) blocks.push({ name, text: lines.join("\n") });
  };

  for (const line of ttl.split("\n")) {
    if (line.startsWith("#")) continue;
    // v30+ uses "schema:Name a" instead of ":Name a" — match both
    const m = line.match(/^:(\w+)\s+a\s+/) || line.match(/^schema:(\w+)\s+a\s+/);
    if (m) {
      flush();
      name = m[1];
      lines = [line];
    } else if (name) {
      lines.push(line);
    }
  }
  flush();
  return blocks;
}

// Build class map: className → [parentClassName, ...] from rdfs:Class blocks.
// Handles multiple inheritance (e.g. ProductCollection extends Product AND Collection).
function buildClassMap(blocks) {
  const map = {};
  for (const { name, text } of blocks) {
    if (!text.includes("a rdfs:Class")) continue;
    const parents = [];
    // v30+ uses rdfs:subClassOf; older versions used schema:subClassOf (:subClassOf)
    const re = /(?:rdfs:|:)subClassOf\s+([^;.]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      for (const ref of m[1].match(/(?:schema|):(\w+)/g) || []) {
        parents.push(ref.split(":").pop()); // strip prefix, keep name
      }
    }
    map[name] = parents;
  }
  return map;
}

// BFS from typeName through the class map → Set of typeName + all ancestors.
function getAncestors(classMap, typeName) {
  const visited = new Set([typeName]);
  const queue = [typeName];
  while (queue.length) {
    for (const parent of classMap[queue.shift()] || []) {
      if (!visited.has(parent)) {
        visited.add(parent);
        queue.push(parent);
      }
    }
  }
  return visited;
}

// Extract rdf:Property blocks whose :domainIncludes overlaps targetTypes.
// Returns [{propName, comment}].
function extractProperties(blocks, targetTypes) {
  const results = [];
  for (const { name, text } of blocks) {
    if (!text.includes("a rdf:Property")) continue;
    if (FIELD_EXCLUSIONS.has(name)) continue;
    // v30+ uses "schema:domainIncludes"; older versions used ":domainIncludes"
    const diStart = text.search(/:domainIncludes|schema:domainIncludes/);
    if (diStart === -1) continue;
    // domainIncludes ends at the next ";" (next predicate) or end of block
    const diEnd = text.indexOf(";", diStart);
    const domainStr = diEnd > -1 ? text.slice(diStart, diEnd) : text.slice(diStart);
    // Match both ":Product" (old) and "schema:Product" (v30+)
    if (![...targetTypes].some((t) => new RegExp(`(?:schema:)?:?${t}\\b`).test(domainStr))) continue;
    const tripleMatch = text.match(/rdfs:comment\s+"""([\s\S]*?)"""/);
    const singleMatch = text.match(/rdfs:comment\s+"((?:[^"\\]|\\.)*)"/);
    const raw = tripleMatch ? tripleMatch[1] : singleMatch ? singleMatch[1] : "";
    results.push({ propName: name, comment: raw.replace(/\s+/g, " ").trim() });
  }
  return results;
}

// Merge extracted properties with FIELD_OVERRIDES and sort.
// Recommended fields come first (in declared order); the rest are alphabetical.
function buildFields(props, typeName) {
  const recommended = RECOMMENDED_ORDER[typeName] || RECOMMENDED_ORDER.Product;
  const fieldMap = {};

  for (const { propName, comment } of props) {
    const ov = FIELD_OVERRIDES[propName] || {};
    const field = {
      id:              propName,
      label:           ov.label           ?? toHumanLabel(propName),
      path:            ov.path            ?? propName,
      defaultField:    ov.defaultField    ?? "",
      defaultSelected: ov.defaultSelected ?? false,
      valueType:       ov.valueType       ?? "text",
      description:     comment,
    };
    if (ov.defaultExpression !== undefined) field.defaultExpression = ov.defaultExpression;
    if (ov.typeHint)                        field.typeHint = ov.typeHint;
    fieldMap[propName] = field;
  }

  const recFields = recommended.filter((id) => fieldMap[id]).map((id) => fieldMap[id]);
  const rest = Object.values(fieldMap)
    .filter((f) => !recommended.includes(f.id))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...recFields, ...rest];
}

// ── Cache ─────────────────────────────────────────────────────────────────────
// TTL is fetched once and shared across all type calls.
// _parseError is set if the fetch or parse fails so callers can surface it.

let _blocks = null;
let _classMap = null;
let _parseError = null;
let _fetchPromise = null;

function _ensureParsed() {
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = fetch("data/schema.ttl")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((ttl) => {
      _blocks = parseTTLBlocks(ttl);
      _classMap = buildClassMap(_blocks);
    })
    .catch((err) => {
      _parseError = err;
      _blocks = [];
      _classMap = {};
    });
  return _fetchPromise;
}

// ── Public API ────────────────────────────────────────────────────────────────

// Returns { fields, error } — error is null on success, a string message on failure.
async function loadSchemaFields(typeName = "Product") {
  await _ensureParsed();
  if (_parseError) {
    return { fields: [], error: `Could not load schema.ttl: ${_parseError.message}. If testing locally, serve the docs/ folder over HTTP (e.g. VS Code Live Server or: npx serve docs).` };
  }
  const ancestors = getAncestors(_classMap, typeName);
  const props = extractProperties(_blocks, ancestors);
  const fields = buildFields(props, typeName);
  return { fields, error: fields.length ? null : `No fields found for type "${typeName}" in schema.ttl.` };
}
