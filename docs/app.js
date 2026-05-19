const SCHEMA_REGISTRY = {
  Product: {
    label: "Product",
    status: "Ready",
    sourceUrl: "https://schema.org/Product",
    fields: [
      // ── Recommended (pre-selected) ──
      { id: "name",               label: "Name",               path: "name",               defaultField: "Name",            defaultSelected: true,  valueType: "text" },
      { id: "description",        label: "Description",        path: "description",        defaultField: "Description",     defaultSelected: true,  valueType: "text" },
      { id: "image",              label: "Image",              path: "image",              defaultField: "URL_Picture__c",  defaultSelected: true,  valueType: "imageArray" },
      { id: "sku",                label: "SKU",                path: "sku",                defaultField: "StockKeepingUnit",defaultSelected: true,  valueType: "text" },
      { id: "brand",              label: "Brand",              path: "brand.name",         defaultField: "",                defaultSelected: true,  valueType: "brand" },
      { id: "offers",             label: "Offers",             path: "offers",             defaultField: "",                defaultSelected: true,  valueType: "offer" },
      { id: "additionalProperty", label: "Additional Property",path: "additionalProperty", defaultField: "",                defaultSelected: true,  valueType: "propertyValue" },
      // ── All other Product + Thing properties (alphabetical) ──
      { id: "additionalType",             label: "Additional Type",               path: "additionalType",             defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "aggregateRating",            label: "Aggregate Rating",              path: "aggregateRating",            defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "alternateName",              label: "Alternate Name",                path: "alternateName",              defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "audience",                   label: "Audience",                      path: "audience",                   defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "award",                      label: "Award",                         path: "award",                      defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "awards",                     label: "Awards",                        path: "awards",                     defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "category",                   label: "Category",                      path: "category",                   defaultExpression: "{!Record.ProductCategory.Name}", defaultSelected: false, valueType: "expression" },
      { id: "color",                      label: "Color",                         path: "color",                      defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "countryOfOrigin",            label: "Country Of Origin",             path: "countryOfOrigin",            defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "depth",                      label: "Depth",                         path: "depth",                      defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "disambiguatingDescription",  label: "Disambiguating Description",    path: "disambiguatingDescription",  defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "gtin",                       label: "GTIN",                          path: "gtin",                       defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "gtin8",                      label: "GTIN-8",                        path: "gtin8",                      defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "gtin12",                     label: "GTIN-12",                       path: "gtin12",                     defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "gtin13",                     label: "GTIN-13",                       path: "gtin13",                     defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "gtin14",                     label: "GTIN-14",                       path: "gtin14",                     defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "height",                     label: "Height",                        path: "height",                     defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "identifier",                 label: "Identifier",                    path: "identifier",                 defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "isAccessoryOrSparePartFor",  label: "Is Accessory Or Spare Part For",path: "isAccessoryOrSparePartFor",  defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "isConsumableFor",            label: "Is Consumable For",             path: "isConsumableFor",            defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "isFamilyFriendly",           label: "Is Family Friendly",            path: "isFamilyFriendly",           defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "isRelatedTo",                label: "Is Related To",                 path: "isRelatedTo",                defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "isSimilarTo",                label: "Is Similar To",                 path: "isSimilarTo",                defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "isVariantOf",                label: "Is Variant Of",                 path: "isVariantOf",                defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "itemCondition",              label: "Item Condition",                path: "itemCondition",              defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "keywords",                   label: "Keywords",                      path: "keywords",                   defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "logo",                       label: "Logo",                          path: "logo",                       defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "mainEntityOfPage",           label: "Main Entity Of Page",           path: "mainEntityOfPage",           defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "manufacturer",              label: "Manufacturer",                  path: "manufacturer.name",          defaultField: "", defaultSelected: false, valueType: "organization" },
      { id: "material",                   label: "Material",                      path: "material",                   defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "model",                      label: "Model",                         path: "model",                      defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "mpn",                        label: "MPN",                           path: "mpn",                        defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "owner",                      label: "Owner",                         path: "owner",                      defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "pattern",                    label: "Pattern",                       path: "pattern",                    defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "potentialAction",            label: "Potential Action",              path: "potentialAction",            defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "predecessorOf",              label: "Predecessor Of",                path: "predecessorOf",              defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "productID",                  label: "Product ID",                    path: "productID",                  defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "productionDate",             label: "Production Date",               path: "productionDate",             defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "purchaseDate",               label: "Purchase Date",                 path: "purchaseDate",               defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "releaseDate",                label: "Release Date",                  path: "releaseDate",                defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "review",                     label: "Review",                        path: "review",                     defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "reviews",                    label: "Reviews",                       path: "reviews",                    defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "sameAs",                     label: "Same As",                       path: "sameAs",                     defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "size",                       label: "Size",                          path: "size",                       defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "slogan",                     label: "Slogan",                        path: "slogan",                     defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "subjectOf",                  label: "Subject Of",                    path: "subjectOf",                  defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "successorOf",                label: "Successor Of",                  path: "successorOf",                defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "url",                        label: "URL",                           path: "url",                        defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "weight",                     label: "Weight",                        path: "weight",                     defaultField: "", defaultSelected: false, valueType: "text" },
      { id: "width",                      label: "Width",                         path: "width",                      defaultField: "", defaultSelected: false, valueType: "text" },
    ],
  },
  ProductGroup: {
    label: "ProductGroup",
    status: "Coming soon",
    sourceUrl: "https://schema.org/ProductGroup",
    fields: [],
    disabled: true,
  },
  ProductCollection: {
    label: "ProductCollection",
    status: "Coming soon",
    sourceUrl: "https://schema.org/ProductCollection",
    fields: [],
    disabled: true,
  },
};

const DEFAULT_OFFER = {
  priceExpression: "{!Record.Offers.Price}",
  currencyExpression: "{!Record.Offers.Currency}",
  sellerType: "Organization",
  sellerName: "",
  sellerUrl: "",
};

const RAW_TOKEN_PREFIX = "__SCHEMA_GENERATOR_RAW_";

const state = {
  schemaType: "Product",
  currentStep: 1,
  fieldPage: 0,
  fieldSearchQuery: "",
  schemaLoading: false,
  selectedFields: new Set(),
  mappings: {},
  customFields: [],
};

const elements = {
  schemaTypeList: document.querySelector("#schemaTypeList"),
  fieldList: document.querySelector("#fieldList"),
  mappingForm: document.querySelector("#mappingForm"),
  scriptOutput: document.querySelector("#scriptOutput"),
  copyStatus: document.querySelector("#copyStatus"),
  previewSchemaButton: document.querySelector("#previewSchemaButton"),
  schemaPreviewOverlay: document.querySelector("#schemaPreviewOverlay"),
  schemaPreviewTree: document.querySelector("#schemaPreviewTree"),
  closePreviewButton: document.querySelector("#closePreviewButton"),
  clearFieldsButton: document.querySelector("#clearFieldsButton"),
  resetMappingsButton: document.querySelector("#resetMappingsButton"),
  copyButton: document.querySelector("#copyButton"),
  downloadButton: document.querySelector("#downloadButton"),
  sourceLink: document.querySelector(".source-link"),
  outputWarnings: document.querySelector("#outputWarnings"),
  fieldSearch: document.querySelector("#fieldSearch"),
  fieldPagination: document.querySelector("#fieldPagination"),
  fieldPrevButton: document.querySelector("#fieldPrevButton"),
  fieldNextButton: document.querySelector("#fieldNextButton"),
  fieldPageIndicator: document.querySelector("#fieldPageIndicator"),
  wizardStep1: document.querySelector("#wizardStep1"),
  wizardStep2: document.querySelector("#wizardStep2"),
  wizardStep3: document.querySelector("#wizardStep3"),
  stepNav1: document.querySelector("#stepNav1"),
  stepNav2: document.querySelector("#stepNav2"),
  stepNav3: document.querySelector("#stepNav3"),
  nextButton: document.querySelector("#nextButton"),
  backButton1: document.querySelector("#backButton1"),
  backButton2: document.querySelector("#backButton2"),
  finishButton: document.querySelector("#finishButton"),
};

function currentSchema() {
  return SCHEMA_REGISTRY[state.schemaType];
}

function recordExpression(fieldApiName) {
  const trimmed = String(fieldApiName || "").trim();
  return trimmed ? `{!Record.${trimmed}}` : "";
}

function rawExpression(value) {
  return { __rawExpression: value };
}

function fieldById(id) {
  return currentSchema().fields.find((field) => field.id === id);
}

function customFieldById(id) {
  return state.customFields.find((field) => field.id === id);
}

function allFields() {
  return [...currentSchema().fields, ...state.customFields];
}

function defaultMapping(field) {
  if (field.valueType === "offer") {
    return { ...DEFAULT_OFFER };
  }
  if (field.valueType === "propertyValue") {
    return {
      entries: [{ label: "Features and Benefits", fieldApiName: field.defaultField || "" }],
    };
  }
  if (field.defaultExpression !== undefined) {
    return { expression: field.defaultExpression };
  }
  return { fieldApiName: field.defaultField || "" };
}

function ensureMapping(field) {
  if (!state.mappings[field.id]) {
    state.mappings[field.id] = defaultMapping(field);
  }
  return state.mappings[field.id];
}

function resetRecommendedFields() {
  state.selectedFields = new Set(
    currentSchema()
      .fields.filter((field) => field.defaultSelected)
      .map((field) => field.id)
  );
  for (const field of currentSchema().fields) {
    state.mappings[field.id] = defaultMapping(field);
  }
}

function renderSchemaTypes() {
  const template = document.querySelector("#schemaTypeTemplate");
  elements.schemaTypeList.replaceChildren();
  elements.sourceLink.href = currentSchema().sourceUrl;
  elements.sourceLink.textContent = `schema.org/${state.schemaType}`;
  for (const [schemaType, schema] of Object.entries(SCHEMA_REGISTRY)) {
    if (schema.hidden) continue;
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".schema-card-title").textContent = schema.label;
    node.querySelector(".schema-card-status").textContent = schema.status;
    node.disabled = Boolean(schema.disabled);
    node.setAttribute("aria-pressed", schemaType === state.schemaType ? "true" : "false");
    node.addEventListener("click", () => {
      state.schemaType = schemaType;
      state.fieldPage = 0;
      state.fieldSearchQuery = "";
      resetRecommendedFields();
      goToStep(1);
      renderAll();
    });
    elements.schemaTypeList.appendChild(node);
  }
}

function renderFieldTiles() {
  const PAGE_SIZE = 10;
  elements.fieldSearch.value = state.fieldSearchQuery;

  if (state.schemaLoading) {
    elements.fieldList.replaceChildren();
    const p = document.createElement("p");
    p.className = "status";
    p.style.gridColumn = "1 / -1";
    p.textContent = "Loading fields from schema.org…";
    elements.fieldList.appendChild(p);
    elements.fieldPagination.hidden = true;
    return;
  }

  const query = state.fieldSearchQuery.trim().toLowerCase();
  const all = allFields();

  const filtered = query
    ? all.filter(
        (f) =>
          f.label.toLowerCase().includes(query) ||
          f.path.toLowerCase().includes(query) ||
          (f.description && f.description.toLowerCase().includes(query))
      )
    : all;

  const sorted = [
    ...filtered.filter((f) => state.selectedFields.has(f.id)),
    ...filtered.filter((f) => !state.selectedFields.has(f.id)),
  ];

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  state.fieldPage = Math.min(state.fieldPage, totalPages - 1);
  const paged = sorted.slice(state.fieldPage * PAGE_SIZE, (state.fieldPage + 1) * PAGE_SIZE);

  elements.fieldList.replaceChildren();

  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.style.gridColumn = "1 / -1";
    empty.textContent = query ? "No fields match your search." : "No fields available.";
    elements.fieldList.appendChild(empty);
  } else {
    for (const field of paged) {
      const isSelected = state.selectedFields.has(field.id);
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "field-tile" + (isSelected ? " is-selected" : "");
      tile.setAttribute("aria-pressed", String(isSelected));

      const mark = document.createElement("span");
      mark.className = "tile-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = isSelected ? "✓" : "";

      const body = document.createElement("span");
      body.className = "tile-body";
      const strong = document.createElement("strong");
      strong.textContent = field.label;
      const small = document.createElement("small");
      small.textContent = field.path;
      body.appendChild(strong);
      body.appendChild(small);

      tile.appendChild(mark);
      tile.appendChild(body);
      tile.addEventListener("click", () => {
        if (isSelected) {
          state.selectedFields.delete(field.id);
        } else {
          state.selectedFields.add(field.id);
          ensureMapping(field);
        }
        renderFieldTiles();
        renderMappings();
        renderOutput();
      });
      elements.fieldList.appendChild(tile);
    }
  }

  if (totalPages <= 1) {
    elements.fieldPagination.hidden = true;
  } else {
    elements.fieldPagination.hidden = false;
    elements.fieldPrevButton.disabled = state.fieldPage === 0;
    elements.fieldNextButton.disabled = state.fieldPage >= totalPages - 1;
    elements.fieldPageIndicator.textContent = `Page ${state.fieldPage + 1} of ${totalPages}`;
  }
}

function addInputRow({ id, label, value, disabled = false, hint = "", onInput }) {
  const template = document.querySelector("#mappingTemplate");
  const row = template.content.firstElementChild.cloneNode(true);
  const input = row.querySelector("input");
  row.querySelector("label").textContent = label;
  row.dataset.static = disabled ? "true" : "false";
  input.id = id;
  input.value = value || "";
  input.disabled = disabled;
  input.addEventListener("input", () => {
    onInput(input.value);
    renderOutput();
  });
  if (hint) {
    const hintNode = document.createElement("div");
    hintNode.className = "hint";
    hintNode.textContent = hint;
    row.appendChild(hintNode);
  }
  elements.mappingForm.appendChild(row);
}

function renderOfferMappings(field, mapping) {
  addInputRow({
    id: `${field.id}-priceExpression`,
    label: "Offer price expression",
    value: mapping.priceExpression,
    onInput: (value) => {
      mapping.priceExpression = value;
    },
  });
  addInputRow({
    id: `${field.id}-currencyExpression`,
    label: "Offer currency expression",
    value: mapping.currencyExpression,
    onInput: (value) => {
      mapping.currencyExpression = value;
    },
  });
  addInputRow({
    id: `${field.id}-sellerName`,
    label: "Seller name",
    value: mapping.sellerName,
    onInput: (value) => {
      mapping.sellerName = value;
    },
  });
  addInputRow({
    id: `${field.id}-sellerUrl`,
    label: "Seller URL",
    value: mapping.sellerUrl,
    onInput: (value) => {
      mapping.sellerUrl = value;
    },
  });
}

function renderPropertyValueMappings(field, mapping) {
  const template = document.querySelector("#mappingTemplate");

  mapping.entries.forEach((entry, idx) => {
    const group = document.createElement("div");
    group.className = "property-group";

    const header = document.createElement("div");
    header.className = "property-group-header";
    const headerLabel = document.createElement("span");
    headerLabel.textContent = `Property ${idx + 1}`;
    header.appendChild(headerLabel);

    if (mapping.entries.length > 1) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-remove";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => {
        mapping.entries.splice(idx, 1);
        renderMappings();
        renderOutput();
      });
      header.appendChild(removeBtn);
    }
    group.appendChild(header);

    const nameRow = template.content.firstElementChild.cloneNode(true);
    nameRow.querySelector("label").textContent = "Property name";
    const nameInput = nameRow.querySelector("input");
    nameInput.id = `${field.id}-label-${idx}`;
    nameInput.value = entry.label;
    nameInput.addEventListener("input", () => {
      entry.label = nameInput.value;
      renderOutput();
    });
    group.appendChild(nameRow);

    const fieldRow = template.content.firstElementChild.cloneNode(true);
    fieldRow.querySelector("label").textContent = "Field API name";
    const fieldInput = fieldRow.querySelector("input");
    fieldInput.id = `${field.id}-fieldApiName-${idx}`;
    fieldInput.value = entry.fieldApiName;
    fieldInput.addEventListener("input", () => {
      entry.fieldApiName = fieldInput.value;
      renderOutput();
    });
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Field API name only. The generated script wraps this as {!Record.FieldApiName}.";
    fieldRow.appendChild(hint);
    group.appendChild(fieldRow);

    elements.mappingForm.appendChild(group);
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn-add-entry";
  addBtn.textContent = "+ Add another property";
  addBtn.addEventListener("click", () => {
    mapping.entries.push({ label: "", fieldApiName: "" });
    renderMappings();
  });
  elements.mappingForm.appendChild(addBtn);
}

function renderGenericMapping(field, mapping) {
  if (field.valueType === "expression" || field.valueType === "raw") {
    addInputRow({
      id: `${field.id}-expression`,
      label: `${field.label} expression`,
      value: mapping.expression,
      hint: "Use a complete Salesforce expression, for example {!Record.ProductCategory.Name}.",
      onInput: (value) => {
        mapping.expression = value;
      },
    });
    return;
  }

  addInputRow({
    id: `${field.id}-fieldApiName`,
    label: `${field.label} field`,
    value: mapping.fieldApiName,
    hint: "Field API name only. The generated script wraps this as {!Record.FieldApiName}.",
    onInput: (value) => {
      mapping.fieldApiName = value;
    },
  });
}

function renderMappings() {
  elements.mappingForm.replaceChildren();
  const selected = allFields().filter((field) => state.selectedFields.has(field.id));
  if (!selected.length) {
    const empty = document.createElement("p");
    empty.className = "status warning";
    empty.textContent = "Select at least one schema field to configure bindings.";
    elements.mappingForm.appendChild(empty);
    return;
  }

  for (const field of selected) {
    const mapping = ensureMapping(field);
    if (field.valueType === "offer") {
      renderOfferMappings(field, mapping);
    } else if (field.valueType === "propertyValue") {
      renderPropertyValueMappings(field, mapping);
    } else {
      renderGenericMapping(field, mapping);
    }
  }
}

function valueForField(field) {
  const mapping = ensureMapping(field);
  if (field.valueType === "expression" || field.valueType === "raw") {
    return mapping.expression || "";
  }
  return recordExpression(mapping.fieldApiName);
}

function applySelectedField(graph, field) {
  const mapping = ensureMapping(field);
  const value = valueForField(field);

  if (field.valueType === "offer") {
    const offer = {
      "@type": "Offer",
      price: mapping.priceExpression || "",
      priceCurrency: mapping.currencyExpression || "",
    };
    if (mapping.sellerName || mapping.sellerUrl) {
      offer.seller = {
        "@type": mapping.sellerType || "Organization",
      };
      if (mapping.sellerName) {
        offer.seller.name = mapping.sellerName;
      }
      if (mapping.sellerUrl) {
        offer.seller.url = mapping.sellerUrl;
      }
    }
    graph.offers = offer;
    return;
  }

  if (field.valueType === "brand") {
    graph.brand = {
      "@type": "Brand",
      name: value,
    };
    return;
  }

  if (field.valueType === "organization") {
    graph[field.path.split(".")[0]] = {
      "@type": "Organization",
      name: value,
    };
    return;
  }

  if (field.valueType === "imageArray" || field.valueType === "array") {
    graph[field.path] = [value];
    return;
  }

  if (field.valueType === "propertyValue") {
    graph.additionalProperty = (mapping.entries || [])
      .filter((e) => e.label || e.fieldApiName)
      .map((e) => ({
        "@type": "PropertyValue",
        name: e.label || "Property",
        value: recordExpression(e.fieldApiName),
      }));
    return;
  }

  if (field.valueType === "raw") {
    graph[field.path] = rawExpression(value);
    return;
  }

  if (field.valueType === "number") {
    graph[field.path] = Number(value) || value;
    return;
  }

  graph[field.path] = value;
}

function graphToJsonWithExpressions(graph) {
  const rawValues = [];
  const json = JSON.stringify(
    graph,
    (key, value) => {
      if (value && typeof value === "object" && "__rawExpression" in value) {
        const token = `${RAW_TOKEN_PREFIX}${rawValues.length}__`;
        rawValues.push(value.__rawExpression || "null");
        return token;
      }
      return value;
    },
    2
  );

  return rawValues.reduce(
    (output, value, index) => output.replace(`"${RAW_TOKEN_PREFIX}${index}__"`, value),
    json
  );
}

function buildScript() {
  const graph = {
    "@context": "https://schema.org",
    "@type": state.schemaType,
  };

  for (const fieldId of state.selectedFields) {
    const field = fieldById(fieldId) || customFieldById(fieldId);
    if (field) {
      applySelectedField(graph, field);
    }
  }

  return `<script type="application/ld+json">\n${graphToJsonWithExpressions(graph)}\n</script>`;
}

function buildWarnings() {
  const warnings = [];
  for (const fieldId of state.selectedFields) {
    const field = fieldById(fieldId) || customFieldById(fieldId);
    if (!field) continue;
    const mapping = ensureMapping(field);
    if (field.valueType === "offer") {
      if (!String(mapping.priceExpression || "").trim()) {
        warnings.push("Offer: price expression is empty.");
      }
      if (!String(mapping.currencyExpression || "").trim()) {
        warnings.push("Offer: currency expression is empty.");
      }
    } else if (field.valueType === "expression" || field.valueType === "raw") {
      if (!String(mapping.expression || "").trim()) {
        warnings.push(`${field.label}: expression is empty.`);
      }
    } else if (field.valueType === "propertyValue") {
      for (const entry of mapping.entries || []) {
        if (!String(entry.fieldApiName || "").trim()) {
          const name = String(entry.label || "").trim() || "Unnamed";
          warnings.push(`${field.label} - ${name}: no field API name set.`);
        }
      }
    } else {
      if (!String(mapping.fieldApiName || "").trim()) {
        warnings.push(`${field.label}: no field API name set.`);
      }
    }
  }
  return warnings;
}

function renderWarnings() {
  const warnings = buildWarnings();
  elements.outputWarnings.replaceChildren();
  if (!warnings.length) return;
  const list = document.createElement("ul");
  list.className = "warning-list";
  for (const msg of warnings) {
    const item = document.createElement("li");
    item.textContent = msg;
    list.appendChild(item);
  }
  elements.outputWarnings.appendChild(list);
}

function renderOutput() {
  elements.scriptOutput.value = buildScript();
  renderWarnings();
}

async function loadSchemaData() {
  state.schemaLoading = true;
  renderFieldTiles();
  try {
    const fields = await loadSchemaFields();
    if (fields.length) {
      SCHEMA_REGISTRY.Product.fields = fields;
    }
  } catch (_) {}
  state.schemaLoading = false;
}

function updateStepNav() {
  [1, 2, 3].forEach((n) => {
    const btn = elements[`stepNav${n}`];
    const isActive = n === state.currentStep;
    btn.setAttribute("aria-current", isActive ? "step" : "false");
    btn.classList.toggle("is-done", n < state.currentStep);
  });
}

function goToStep(step) {
  state.currentStep = step;
  elements.wizardStep1.hidden = step !== 1;
  elements.wizardStep2.hidden = step !== 2;
  elements.wizardStep3.hidden = step !== 3;
  updateStepNav();
}

function renderAll() {
  renderSchemaTypes();
  renderFieldTiles();
  renderMappings();
  renderOutput();
}

function clearStatusSoon() {
  window.setTimeout(() => {
    elements.copyStatus.textContent = "";
  }, 2200);
}

async function copyOutput() {
  elements.scriptOutput.select();
  try {
    await navigator.clipboard.writeText(elements.scriptOutput.value);
    elements.copyStatus.textContent = "Copied.";
  } catch (error) {
    document.execCommand("copy");
    elements.copyStatus.textContent = "Copied.";
  }
  clearStatusSoon();
}

function downloadOutput() {
  const blob = new Blob([elements.scriptOutput.value], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.schemaType.toLowerCase()}-schema-head-markup.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildPreviewGraph() {
  const graph = {
    "@context": "https://schema.org",
    "@type": state.schemaType,
  };
  for (const fieldId of state.selectedFields) {
    const field = fieldById(fieldId) || customFieldById(fieldId);
    if (field) applySelectedField(graph, field);
  }
  return graph;
}

function renderJsonTree(value) {
  // Raw expression placeholder (used by "raw" valueType)
  if (value !== null && typeof value === "object" && "__rawExpression" in value) {
    const span = document.createElement("span");
    span.className = "tree-val-string";
    span.textContent = `"${value.__rawExpression}"`;
    return span;
  }

  if (Array.isArray(value)) {
    const node = document.createElement("div");
    node.className = "tree-node";
    const open = document.createElement("span");
    open.className = "tree-brace";
    open.textContent = "[";
    node.appendChild(open);
    if (value.length) {
      const children = document.createElement("div");
      children.className = "tree-children";
      value.forEach((item, i) => {
        const row = document.createElement("div");
        row.className = "tree-row";
        row.appendChild(renderJsonTree(item));
        if (i < value.length - 1) {
          const comma = document.createElement("span");
          comma.className = "tree-colon";
          comma.textContent = ",";
          row.appendChild(comma);
        }
        children.appendChild(row);
      });
      node.appendChild(children);
    }
    const close = document.createElement("span");
    close.className = "tree-brace";
    close.textContent = "]";
    node.appendChild(close);
    return node;
  }

  if (value !== null && typeof value === "object") {
    const node = document.createElement("div");
    node.className = "tree-node";
    const open = document.createElement("span");
    open.className = "tree-brace";
    open.textContent = "{";
    node.appendChild(open);
    const entries = Object.entries(value);
    if (entries.length) {
      const children = document.createElement("div");
      children.className = "tree-children";
      entries.forEach(([k, v], i) => {
        const row = document.createElement("div");
        row.className = "tree-row";
        const key = document.createElement("span");
        key.className = "tree-key";
        key.textContent = `"${k}"`;
        const colon = document.createElement("span");
        colon.className = "tree-colon";
        colon.textContent = ":";
        row.appendChild(key);
        row.appendChild(colon);
        row.appendChild(renderJsonTree(v));
        if (i < entries.length - 1) {
          const comma = document.createElement("span");
          comma.className = "tree-colon";
          comma.textContent = ",";
          row.appendChild(comma);
        }
        children.appendChild(row);
      });
      node.appendChild(children);
    }
    const close = document.createElement("span");
    close.className = "tree-brace";
    close.textContent = "}";
    node.appendChild(close);
    return node;
  }

  // Primitive
  const span = document.createElement("span");
  if (typeof value === "string") {
    span.className = "tree-val-string";
    span.textContent = `"${value}"`;
  } else if (typeof value === "number") {
    span.className = "tree-val-number";
    span.textContent = String(value);
  } else {
    span.className = "tree-val-other";
    span.textContent = value === null ? "null" : String(value);
  }
  return span;
}

function openSchemaPreview() {
  const graph = buildPreviewGraph();
  elements.schemaPreviewTree.replaceChildren(renderJsonTree(graph));
  elements.schemaPreviewOverlay.hidden = false;
  elements.closePreviewButton.focus();
}

function closeSchemaPreview() {
  elements.schemaPreviewOverlay.hidden = true;
  elements.previewSchemaButton.focus();
}

elements.previewSchemaButton.addEventListener("click", openSchemaPreview);

elements.clearFieldsButton.addEventListener("click", () => {
  state.selectedFields.clear();
  state.fieldPage = 0;
  state.fieldSearchQuery = "";
  renderAll();
});

elements.resetMappingsButton.addEventListener("click", () => {
  for (const field of allFields()) {
    state.mappings[field.id] = defaultMapping(field);
  }
  renderAll();
});

elements.copyButton.addEventListener("click", copyOutput);
elements.downloadButton.addEventListener("click", downloadOutput);

elements.fieldSearch.addEventListener("input", () => {
  state.fieldSearchQuery = elements.fieldSearch.value;
  state.fieldPage = 0;
  renderFieldTiles();
});

elements.fieldPrevButton.addEventListener("click", () => {
  state.fieldPage--;
  renderFieldTiles();
});

elements.fieldNextButton.addEventListener("click", () => {
  state.fieldPage++;
  renderFieldTiles();
});

elements.nextButton.addEventListener("click", () => goToStep(2));
elements.backButton1.addEventListener("click", () => goToStep(1));
elements.backButton2.addEventListener("click", () => goToStep(2));
elements.finishButton.addEventListener("click", () => goToStep(3));
elements.closePreviewButton.addEventListener("click", closeSchemaPreview);
elements.schemaPreviewOverlay.addEventListener("click", (e) => {
  if (e.target === elements.schemaPreviewOverlay) closeSchemaPreview();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !elements.schemaPreviewOverlay.hidden) closeSchemaPreview();
});

async function init() {
  await loadSchemaData();
  resetRecommendedFields();
  goToStep(1);
  renderAll();
}

init();
