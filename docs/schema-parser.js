// Parses docs/data/schema.ttl (local copy of schema.org Turtle file) and returns
// schema.org/Product + Thing properties as field descriptor objects for use by app.js.
//
// Public API:
//   loadSchemaFields() -> Promise<Array<FieldDescriptor>>

// Salesforce-specific overrides: map property name -> field descriptor overrides.
// Properties not listed here get generic defaults (valueType: "text", no defaultField).
const FIELD_OVERRIDES = {
  name:               { label: "Name", defaultField: "Name", defaultSelected: true, valueType: "text" },
  description:        { defaultField: "Description", defaultSelected: true, valueType: "text" },
  image:              { defaultField: "URL_Picture__c", defaultSelected: true, valueType: "imageArray" },
  sku:                { label: "SKU", defaultField: "StockKeepingUnit", defaultSelected: true, valueType: "text" },
  brand:              { path: "brand.name", defaultSelected: true, valueType: "brand" },
  offers:             { defaultSelected: true, valueType: "offer" },
  additionalProperty: { defaultSelected: true, valueType: "propertyValue" },
  category:           { defaultExpression: "{!Record.ProductCategory.Name}", valueType: "expression" },
  manufacturer:       { path: "manufacturer.name", valueType: "organization" },
};

// These fields appear first in the tile grid in the order listed.
const RECOMMENDED_ORDER = ["name", "description", "image", "sku", "brand", "offers", "additionalProperty"];

function toHumanLabel(propName) {
  return propName
    .replace(/([A-Z])/g, " $1")
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .trim();
}

// Extracts all rdf:Property entries whose domainIncludes contains :Product or :Thing.
// The schema.ttl file uses bare ":" prefix (mapped to https://schema.org/).
function parseTTLForProduct(ttl) {
  const TARGET_DOMAINS = [":Product", ":Thing"];
  const results = [];
  let currentPropName = null;
  let currentLines = [];

  const processBlock = () => {
    if (!currentPropName || !currentLines.length) return;
    const blockText = currentLines.join("\n");
    if (!blockText.includes("a rdf:Property")) return;
    const diStart = blockText.indexOf(":domainIncludes");
    if (diStart === -1) return;
    const diEnd = blockText.indexOf(";", diStart);
    const domainStr = diEnd > -1 ? blockText.slice(diStart, diEnd) : blockText.slice(diStart);
    if (!TARGET_DOMAINS.some((d) => domainStr.includes(d))) return;
    // Handle both triple-quoted (multi-line) and single-quoted comments
    const tripleMatch = blockText.match(/rdfs:comment\s+"""([\s\S]*?)"""/);
    const singleMatch = blockText.match(/rdfs:comment\s+"((?:[^"\\]|\\.)*)"/);
    const raw = tripleMatch ? tripleMatch[1] : singleMatch ? singleMatch[1] : "";
    const comment = raw.replace(/\s+/g, " ").trim();
    results.push({ propName: currentPropName, comment });
  };

  for (const line of ttl.split("\n")) {
    if (line.startsWith("#")) continue;
    const subjectMatch = line.match(/^:(\w+)\s+a\s+/);
    if (subjectMatch) {
      processBlock();
      currentPropName = subjectMatch[1];
      currentLines = [line];
    } else if (currentPropName) {
      currentLines.push(line);
    }
  }
  processBlock();
  return results;
}

// Merges TTL property list with FIELD_OVERRIDES and returns sorted field descriptors.
// Recommended fields come first; remaining fields are alphabetical.
function buildFieldsFromTTL(ttlProps) {
  const fieldMap = {};
  for (const { propName, comment } of ttlProps) {
    const ov = FIELD_OVERRIDES[propName] || {};
    const field = {
      id: propName,
      label: ov.label || toHumanLabel(propName),
      path: ov.path || propName,
      defaultField: ov.defaultField ?? "",
      defaultSelected: ov.defaultSelected ?? false,
      valueType: ov.valueType ?? "text",
      description: comment,
    };
    if (ov.defaultExpression !== undefined) {
      field.defaultExpression = ov.defaultExpression;
    }
    fieldMap[propName] = field;
  }
  const recommended = RECOMMENDED_ORDER.filter((id) => fieldMap[id]).map((id) => fieldMap[id]);
  const rest = Object.values(fieldMap)
    .filter((f) => !RECOMMENDED_ORDER.includes(f.id))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...recommended, ...rest];
}

// Main entry point called by app.js.
// Returns a Promise that resolves to an array of field descriptors.
// Falls back to product-schema.txt if schema.ttl cannot be parsed.
async function loadSchemaFields() {
  try {
    const res = await fetch("data/schema.ttl");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ttl = await res.text();
    const fields = buildFieldsFromTTL(parseTTLForProduct(ttl));
    if (fields.length) return fields;
  } catch (_) {}

  try {
    const res = await fetch("data/product-schema.txt");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.fields) && data.fields.length) return data.fields;
    }
  } catch (_) {}

  return [];
}
