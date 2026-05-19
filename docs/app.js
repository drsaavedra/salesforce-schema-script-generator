const SCHEMA_REGISTRY = {
  Product: {
    label: "Product",
    status: "Ready",
    sourceUrl: "https://schema.org/Product",
    fields: [
      {
        id: "name",
        label: "Name",
        path: "name",
        defaultField: "Name",
        defaultSelected: true,
        valueType: "text",
      },
      {
        id: "description",
        label: "Description",
        path: "description",
        defaultField: "Description",
        defaultSelected: true,
        valueType: "text",
      },
      {
        id: "image",
        label: "Image",
        path: "image",
        defaultField: "URL_Picture__c",
        defaultSelected: true,
        valueType: "imageArray",
      },
      {
        id: "sku",
        label: "SKU",
        path: "sku",
        defaultField: "StockKeepingUnit",
        defaultSelected: true,
        valueType: "text",
      },
      {
        id: "brand",
        label: "Brand",
        path: "brand.name",
        defaultField: "OSF_Brand__c",
        defaultSelected: true,
        valueType: "brand",
      },
      {
        id: "offers",
        label: "Offer",
        path: "offers",
        defaultSelected: true,
        valueType: "offer",
      },
      {
        id: "additionalProperty",
        label: "Additional Property",
        path: "additionalProperty",
        defaultField: "OSF_B2BFeaturesandBenefits__c",
        defaultSelected: true,
        valueType: "propertyValue",
      },
      {
        id: "url",
        label: "Product URL",
        path: "url",
        defaultField: "",
        defaultExpression: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "category",
        label: "Category",
        path: "category",
        defaultExpression: "{!Record.ProductCategory.Name}",
        defaultSelected: false,
        valueType: "expression",
      },
      {
        id: "mpn",
        label: "MPN",
        path: "mpn",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "gtin",
        label: "GTIN",
        path: "gtin",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "gtin8",
        label: "GTIN-8",
        path: "gtin8",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "gtin12",
        label: "GTIN-12",
        path: "gtin12",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "gtin13",
        label: "GTIN-13",
        path: "gtin13",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "gtin14",
        label: "GTIN-14",
        path: "gtin14",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "model",
        label: "Model",
        path: "model",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "material",
        label: "Material",
        path: "material",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "color",
        label: "Color",
        path: "color",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "size",
        label: "Size",
        path: "size",
        defaultField: "",
        defaultSelected: false,
        valueType: "text",
      },
      {
        id: "manufacturer",
        label: "Manufacturer",
        path: "manufacturer.name",
        defaultField: "",
        defaultSelected: false,
        valueType: "organization",
      },
    ],
  },
  ProductGroup: {
    label: "ProductGroup",
    status: "Planned",
    sourceUrl: "https://schema.org/ProductGroup",
    fields: [],
    disabled: true,
  },
  ProductCollection: {
    label: "ProductCollection",
    status: "Planned",
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
  selectRecommendedButton: document.querySelector("#selectRecommendedButton"),
  clearFieldsButton: document.querySelector("#clearFieldsButton"),
  resetMappingsButton: document.querySelector("#resetMappingsButton"),
  copyButton: document.querySelector("#copyButton"),
  downloadButton: document.querySelector("#downloadButton"),
  sourceLink: document.querySelector(".source-link"),
  customPropertyName: document.querySelector("#customPropertyName"),
  customPropertyField: document.querySelector("#customPropertyField"),
  customPropertyType: document.querySelector("#customPropertyType"),
  addCustomFieldButton: document.querySelector("#addCustomFieldButton"),
};

function currentSchema() {
  return SCHEMA_REGISTRY[state.schemaType];
}

function recordExpression(fieldApiName) {
  const trimmed = String(fieldApiName || "").trim();
  return trimmed ? `{!Record.${trimmed}}` : "";
}

function rawExpression(value) {
  return {
    __rawExpression: value,
  };
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
      label: "Features and Benefits",
      fieldApiName: field.defaultField || "",
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
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".schema-card-title").textContent = schema.label;
    node.querySelector(".schema-card-status").textContent = schema.status;
    node.disabled = Boolean(schema.disabled);
    node.setAttribute("aria-pressed", schemaType === state.schemaType ? "true" : "false");
    node.addEventListener("click", () => {
      state.schemaType = schemaType;
      resetRecommendedFields();
      renderAll();
    });
    elements.schemaTypeList.appendChild(node);
  }
}

function renderFields() {
  const template = document.querySelector("#fieldTemplate");
  elements.fieldList.replaceChildren();
  for (const field of allFields()) {
    const node = template.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector("input");
    checkbox.checked = state.selectedFields.has(field.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.selectedFields.add(field.id);
        ensureMapping(field);
      } else {
        state.selectedFields.delete(field.id);
      }
      renderAll();
    });
    node.querySelector("strong").textContent = field.label;
    node.querySelector("small").textContent = field.path;
    elements.fieldList.appendChild(node);
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
  addInputRow({
    id: `${field.id}-label`,
    label: `${field.label} name`,
    value: mapping.label,
    onInput: (value) => {
      mapping.label = value;
    },
  });
  addInputRow({
    id: `${field.id}-fieldApiName`,
    label: `${field.label} value field`,
    value: mapping.fieldApiName,
    hint: "Field API name only. The generated script wraps this as {!Record.FieldApiName}.",
    onInput: (value) => {
      mapping.fieldApiName = value;
    },
  });
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
    graph.additionalProperty = [
      {
        "@type": "PropertyValue",
        name: mapping.label || "Property",
        value: recordExpression(mapping.fieldApiName),
      },
    ];
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

function renderOutput() {
  elements.scriptOutput.value = buildScript();
}

function renderAll() {
  renderSchemaTypes();
  renderFields();
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

function addCustomField() {
  const propertyName = elements.customPropertyName.value.trim();
  const fieldApiName = elements.customPropertyField.value.trim();
  const valueType = elements.customPropertyType.value;
  if (!propertyName || !fieldApiName) {
    elements.copyStatus.textContent = "Custom fields need a schema property and Product2 field.";
    clearStatusSoon();
    return;
  }

  const id = `custom-${Date.now()}`;
  const field = {
    id,
    label: propertyName,
    path: propertyName,
    defaultField: valueType === "raw" ? "" : fieldApiName,
    defaultExpression: valueType === "raw" ? fieldApiName : undefined,
    defaultSelected: true,
    valueType,
  };
  state.customFields.push(field);
  state.selectedFields.add(id);
  state.mappings[id] = defaultMapping(field);
  elements.customPropertyName.value = "";
  elements.customPropertyField.value = "";
  renderAll();
}

elements.selectRecommendedButton.addEventListener("click", () => {
  resetRecommendedFields();
  renderAll();
});

elements.clearFieldsButton.addEventListener("click", () => {
  state.selectedFields.clear();
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
elements.addCustomFieldButton.addEventListener("click", addCustomField);

resetRecommendedFields();
renderAll();
