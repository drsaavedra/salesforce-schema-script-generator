// Static configuration data for the schema script generator.
// No logic lives here — only data that describes what the app knows.
// Loaded before app.js so all constants are available in the browser scope.

// ── Schema registry ───────────────────────────────────────────────────────────
// Fields arrays start empty and are populated at load time by loadSchemaData() in app.js,
// which calls schema-parser.js and writes the results back here.
const SCHEMA_REGISTRY = {
  Product: {
    label: "Product",
    status: "",
    sourceUrl: "https://schema.org/Product",
    fields: [],
  },
  ProductGroup: {
    label: "ProductGroup",
    status: "Coming soon",
    sourceUrl: "https://schema.org/ProductGroup",
    fields: [],
    disabled: true,
  },
};

// ── @type picklist options ────────────────────────────────────────────────────
const OFFER_TYPES        = ["Offer", "AggregateOffer"];
const SELLER_TYPES       = ["Organization", "Corporation", "LocalBusiness", "Person"];
const BRAND_TYPES        = ["Brand", "Organization"];
const ORGANIZATION_TYPES = ["Organization", "Corporation", "LocalBusiness"];

// ── Type hint badge tooltips ──────────────────────────────────────────────────
const TYPE_HINT_DETAILS = {
  Boolean:    "Must be true or false — map to a Salesforce checkbox (Boolean) field",
  Number:     "Must be a plain number with no quotes or currency symbol, e.g. 29.99",
  URL:        "Must be a full URL starting with https://",
  Date:       "ISO 8601 date, e.g. 2024-01-15",
  "ISO 4217": "ISO 4217 currency code, e.g. USD, EUR, GBP",
};

// ── Default offer structure ───────────────────────────────────────────────────
const DEFAULT_OFFER = {
  offerType:          "Offer",
  priceExpression:    "{!Record.Offers.Price}",
  currencyExpression: "{!Record.Offers.Currency}",
  useDefaultPrice:    true,
  useDefaultCurrency: true,
  sellerType:         "Organization",
  sellerName:         "",
  sellerUrl:          "",
};
