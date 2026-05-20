// SCHEMA_REGISTRY, OFFER_TYPES, SELLER_TYPES, BRAND_TYPES, ORGANIZATION_TYPES,
// TYPE_HINT_DETAILS, and DEFAULT_OFFER are defined in constants.js (loaded before this file).

const RAW_TOKEN_PREFIX = "__SCHEMA_GENERATOR_RAW_";

const state = {
  schemaType: "Product",
  currentStep: 1,
  fieldSearchQuery: "",
  schemaLoading: false,
  schemaError: null,
  selectedFields: new Set(),
  mappings: {},
  customFields: [],
  includeBreadcrumbList: false,
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
  selectAllButton: document.querySelector("#selectAllButton"),
  recommendedButton: document.querySelector("#recommendedButton"),
  selectAllMatchingBtn: document.querySelector("#selectAllMatchingBtn"),
  fieldCounter: document.querySelector("#fieldCounter"),
  clearFieldsButton: document.querySelector("#clearFieldsButton"),
  resetMappingsButton: document.querySelector("#resetMappingsButton"),
  breadcrumbToggle: document.querySelector("#breadcrumbToggle"),
  copyButton: document.querySelector("#copyButton"),
  downloadButton: document.querySelector("#downloadButton"),
  sourceLink: document.querySelector(".source-link"),
  outputWarnings: document.querySelector("#outputWarnings"),
  fieldSearch: document.querySelector("#fieldSearch"),
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
      entries: [{ label: "", expression: "" }],
    };
  }
  if (field.valueType === "brand") {
    return { expression: "", type: "Brand" };
  }
  if (field.valueType === "organization") {
    return { expression: "", type: "Organization" };
  }
  if (field.defaultExpression !== undefined) {
    return { expression: field.defaultExpression };
  }
  return { expression: field.defaultField ? `{!Record.${field.defaultField}}` : "" };
}

function ensureMapping(field) {
  if (!state.mappings[field.id]) {
    state.mappings[field.id] = defaultMapping(field);
  }
  return state.mappings[field.id];
}

function resetRecommendedFields() {
  const recommended = currentSchema().fields.filter((field) => field.defaultSelected);
  state.selectedFields = new Set(recommended.map((field) => field.id));
  for (const field of recommended) {
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
      if (node.disabled) return;
      state.schemaType = schemaType;
      state.fieldSearchQuery = "";
      state.mappings = {};
      resetRecommendedFields();
      goToStep(1);
      renderAll();
    });
    elements.schemaTypeList.appendChild(node);
  }
}

function renderFieldMeta() {
  const totalFields = allFields().length;
  const count = state.selectedFields.size;
  elements.fieldCounter.textContent = `${count} / ${totalFields} fields selected`;
  elements.nextButton.textContent = count > 0 ? `Next → (${count} selected)` : "Next →";
  elements.nextButton.disabled = count === 0;
}

function renderFieldTiles() {
  elements.fieldSearch.value = state.fieldSearchQuery;

  renderFieldMeta();

  if (state.schemaLoading) {
    elements.fieldList.replaceChildren();
    const p = document.createElement("p");
    p.className = "status";
    p.style.gridColumn = "1 / -1";
    p.textContent = "Loading fields from schema.org…";
    elements.fieldList.appendChild(p);
    return;
  }

  if (state.schemaError) {
    elements.fieldList.replaceChildren();
    const p = document.createElement("p");
    p.className = "status warning";
    p.style.gridColumn = "1 / -1";
    p.textContent = state.schemaError;
    elements.fieldList.appendChild(p);
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

  if (query && filtered.length > 0) {
    elements.selectAllMatchingBtn.hidden = false;
    elements.selectAllMatchingBtn.textContent = `Select all ${filtered.length} matching`;
    elements.selectAllMatchingBtn.onclick = () => {
      for (const field of filtered) {
        state.selectedFields.add(field.id);
        ensureMapping(field);
      }
      renderFieldTiles();
      renderMappings();
      renderOutput();
    };
  } else {
    elements.selectAllMatchingBtn.hidden = true;
  }

  const sorted = [
    ...filtered.filter((f) => state.selectedFields.has(f.id)),
    ...filtered.filter((f) => !state.selectedFields.has(f.id)),
  ];

  elements.fieldList.replaceChildren();

  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.style.gridColumn = "1 / -1";
    empty.textContent = query ? "No fields match your search." : "No fields available.";
    elements.fieldList.appendChild(empty);
  } else {
    for (const field of sorted) {
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
      if (field.defaultSelected) {
        const badge = document.createElement("span");
        badge.className = "tile-badge";
        badge.textContent = "Recommended";
        body.appendChild(badge);
      }

      tile.appendChild(mark);
      tile.appendChild(body);
      tile.addEventListener("click", () => {
        const nowSelected = !state.selectedFields.has(field.id);
        if (nowSelected) {
          state.selectedFields.add(field.id);
          ensureMapping(field);
        } else {
          state.selectedFields.delete(field.id);
        }
        tile.classList.toggle("is-selected", nowSelected);
        tile.setAttribute("aria-pressed", String(nowSelected));
        mark.textContent = nowSelected ? "✓" : "";
        renderFieldMeta();
        renderMappings();
        renderOutput();
      });
      elements.fieldList.appendChild(tile);
    }
  }

}





// ── Tree mapping editor helpers ──

function tmRow() {
  const d = document.createElement("div");
  d.className = "tree-row";
  return d;
}

function tmKey(text) {
  const s = document.createElement("span");
  s.className = "tree-key";
  s.textContent = `"${text}"`;
  return s;
}

function tmColon() {
  const s = document.createElement("span");
  s.className = "tree-colon";
  s.textContent = ":";
  return s;
}

function tmBraceSpan(ch) {
  const s = document.createElement("span");
  s.className = "tree-brace";
  s.textContent = ch;
  return s;
}

function tmStaticVal(text) {
  const s = document.createElement("span");
  s.className = "tree-val-string";
  s.textContent = `"${text}"`;
  return s;
}

function tmStaticRow(parent, key, value) {
  const row = tmRow();
  row.appendChild(tmKey(key));
  row.appendChild(tmColon());
  row.appendChild(tmStaticVal(value));
  parent.appendChild(row);
}

function tmInput(id, value, disabled, onChange, placeholder) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "tree-input" + (disabled ? " is-disabled" : "");
  input.id = id;
  input.value = value || "";
  input.disabled = disabled;
  input.autocomplete = "off";
  input.spellcheck = false;
  if (placeholder) input.placeholder = placeholder;
  input.addEventListener("input", () => { onChange(input.value); renderOutput(); });
  return input;
}

function tmUseDefault(cbId, checked, onChange) {
  const wrap = document.createElement("label");
  wrap.className = "tree-use-default";
  wrap.htmlFor = cbId;
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.id = cbId;
  cb.checked = checked;
  const text = document.createElement("span");
  text.textContent = "default";
  wrap.appendChild(cb);
  wrap.appendChild(text);
  cb.addEventListener("change", () => onChange(cb.checked));
  return wrap;
}

function tmObjectBlock(parent, key) {
  const openRow = tmRow();
  if (key !== null) {
    openRow.appendChild(tmKey(key));
    openRow.appendChild(tmColon());
  }
  openRow.appendChild(tmBraceSpan("{"));
  parent.appendChild(openRow);
  const inner = document.createElement("div");
  inner.className = "tree-children";
  parent.appendChild(inner);
  const closeRow = tmRow();
  closeRow.appendChild(tmBraceSpan("}"));
  parent.appendChild(closeRow);
  return inner;
}

function tmTypeTag(hint) {
  const span = document.createElement("span");
  span.className =
    "field-type-tag" +
    (hint === "Boolean" ? " is-boolean" : hint === "Number" ? " is-number" : "");
  span.textContent = hint;
  const detail = TYPE_HINT_DETAILS[hint];
  if (detail) span.title = detail;
  return span;
}

function tmSelect(id, options, value, onChange) {
  const sel = document.createElement("select");
  sel.id = id;
  sel.className = "tree-select";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    if (opt === value) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => { onChange(sel.value); renderOutput(); });
  return sel;
}

function applyDefaultToggle(inputId, checked, defaultValue, placeholder) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = checked ? defaultValue : "";
  input.disabled = checked;
  if (!checked) input.placeholder = placeholder || "";
  else input.removeAttribute("placeholder");
  input.classList.toggle("is-disabled", checked);
}

function appendTreeGenericField(parent, field, mapping) {
  const row = tmRow();
  row.appendChild(tmKey(field.path.split(".")[0]));
  row.appendChild(tmColon());

  let useDefaultEl = null;

  if (field.defaultExpression !== undefined) {
    const isDefaulted = mapping.useDefault !== false;
    row.appendChild(tmInput(
      `tree-${field.id}`,
      isDefaulted ? field.defaultExpression : (mapping.expression || ""),
      isDefaulted,
      (val) => { mapping.expression = val; },
      isDefaulted ? "" : "{!Record.FieldApiName}"
    ));
    useDefaultEl = tmUseDefault(`tree-${field.id}-ud`, isDefaulted, (checked) => {
      mapping.useDefault = checked;
      if (checked) mapping.expression = field.defaultExpression;
      else mapping.expression = "";
      applyDefaultToggle(`tree-${field.id}`, checked, field.defaultExpression, "{!Record.FieldApiName}");
      renderOutput();
    });
  } else if (field.valueType === "expression" || field.valueType === "raw") {
    row.appendChild(tmInput(`tree-${field.id}`, mapping.expression || "", false, (val) => { mapping.expression = val; }));
  } else {
    const ph = field.defaultField ? `{!Record.${field.defaultField}}` : "{!Record.FieldApiName}";
    row.appendChild(tmInput(`tree-${field.id}`, mapping.expression || "", false, (val) => { mapping.expression = val; }, ph));
  }

  if (field.typeHint) row.appendChild(tmTypeTag(field.typeHint));
  if (useDefaultEl) row.appendChild(useDefaultEl);
  parent.appendChild(row);
}

function appendTreeOfferField(parent, field, mapping) {
  const inner = tmObjectBlock(parent, "offers");
  const offerTypeRow = tmRow();
  offerTypeRow.appendChild(tmKey("@type"));
  offerTypeRow.appendChild(tmColon());
  offerTypeRow.appendChild(tmSelect(
    `tree-${field.id}-offerType`,
    OFFER_TYPES,
    mapping.offerType || DEFAULT_OFFER.offerType,
    (val) => { mapping.offerType = val; }
  ));
  inner.appendChild(offerTypeRow);

  const isPriceDefault = mapping.useDefaultPrice !== false;
  const priceRow = tmRow();
  priceRow.appendChild(tmKey("price"));
  priceRow.appendChild(tmColon());
  priceRow.appendChild(tmInput(
    `tree-${field.id}-price`,
    isPriceDefault ? DEFAULT_OFFER.priceExpression : (mapping.priceExpression || ""),
    isPriceDefault,
    (val) => { mapping.priceExpression = val; },
    isPriceDefault ? "" : "{!Record.FieldApiName}"
  ));
  priceRow.appendChild(tmTypeTag("Number"));
  priceRow.appendChild(tmUseDefault(`tree-${field.id}-price-ud`, isPriceDefault, (checked) => {
    mapping.useDefaultPrice = checked;
    if (checked) mapping.priceExpression = DEFAULT_OFFER.priceExpression;
    else mapping.priceExpression = "";
    applyDefaultToggle(`tree-${field.id}-price`, checked, DEFAULT_OFFER.priceExpression, "{!Record.FieldApiName}");
    renderOutput();
  }));
  inner.appendChild(priceRow);

  const isCurrDefault = mapping.useDefaultCurrency !== false;
  const currRow = tmRow();
  currRow.appendChild(tmKey("priceCurrency"));
  currRow.appendChild(tmColon());
  currRow.appendChild(tmInput(
    `tree-${field.id}-curr`,
    isCurrDefault ? DEFAULT_OFFER.currencyExpression : (mapping.currencyExpression || ""),
    isCurrDefault,
    (val) => { mapping.currencyExpression = val; },
    isCurrDefault ? "" : "{!Record.FieldApiName}"
  ));
  currRow.appendChild(tmTypeTag("ISO 4217"));
  currRow.appendChild(tmUseDefault(`tree-${field.id}-curr-ud`, isCurrDefault, (checked) => {
    mapping.useDefaultCurrency = checked;
    if (checked) mapping.currencyExpression = DEFAULT_OFFER.currencyExpression;
    else mapping.currencyExpression = "";
    applyDefaultToggle(`tree-${field.id}-curr`, checked, DEFAULT_OFFER.currencyExpression, "{!Record.FieldApiName}");
    renderOutput();
  }));
  inner.appendChild(currRow);

  const sellerInner = tmObjectBlock(inner, "seller");
  const sellerTypeRow = tmRow();
  sellerTypeRow.appendChild(tmKey("@type"));
  sellerTypeRow.appendChild(tmColon());
  sellerTypeRow.appendChild(tmSelect(
    `tree-${field.id}-sellerType`,
    SELLER_TYPES,
    mapping.sellerType || DEFAULT_OFFER.sellerType,
    (val) => { mapping.sellerType = val; }
  ));
  sellerInner.appendChild(sellerTypeRow);

  const sellerNameRow = tmRow();
  sellerNameRow.appendChild(tmKey("name"));
  sellerNameRow.appendChild(tmColon());
  sellerNameRow.appendChild(tmInput(`tree-${field.id}-sellerName`, mapping.sellerName || "", false, (val) => { mapping.sellerName = val; }, "Company Name"));
  sellerInner.appendChild(sellerNameRow);

  const sellerUrlRow = tmRow();
  sellerUrlRow.appendChild(tmKey("url"));
  sellerUrlRow.appendChild(tmColon());
  sellerUrlRow.appendChild(tmInput(`tree-${field.id}-sellerUrl`, mapping.sellerUrl || "", false, (val) => { mapping.sellerUrl = val; }, "Company Website"));
  sellerInner.appendChild(sellerUrlRow);
}

function appendTreePropertyValueField(parent, field, mapping) {
  const openRow = tmRow();
  openRow.appendChild(tmKey("additionalProperty"));
  openRow.appendChild(tmColon());
  openRow.appendChild(tmBraceSpan("["));
  parent.appendChild(openRow);

  const arrayInner = document.createElement("div");
  arrayInner.className = "tree-children";
  parent.appendChild(arrayInner);

  mapping.entries.forEach((entry, idx) => {
    const entryOpenRow = tmRow();
    entryOpenRow.appendChild(tmBraceSpan("{"));
    arrayInner.appendChild(entryOpenRow);

    const entryInner = document.createElement("div");
    entryInner.className = "tree-children";
    arrayInner.appendChild(entryInner);

    tmStaticRow(entryInner, "@type", "PropertyValue");

    const nameRow = tmRow();
    nameRow.appendChild(tmKey("name"));
    nameRow.appendChild(tmColon());
    nameRow.appendChild(tmInput(`tree-${field.id}-name-${idx}`, entry.label || "", false, (val) => { entry.label = val; }));
    entryInner.appendChild(nameRow);

    const valueRow = tmRow();
    valueRow.appendChild(tmKey("value"));
    valueRow.appendChild(tmColon());
    valueRow.appendChild(tmInput(`tree-${field.id}-value-${idx}`, entry.expression || "", false, (val) => { entry.expression = val; }, "{!Record.FieldApiName}"));
    entryInner.appendChild(valueRow);

    const entryCloseRow = tmRow();
    entryCloseRow.appendChild(tmBraceSpan("}"));
    if (mapping.entries.length > 1) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-remove tree-array-btn";
      removeBtn.textContent = "Remove";
      removeBtn.addEventListener("click", () => { mapping.entries.splice(idx, 1); renderMappings(); renderOutput(); });
      entryCloseRow.appendChild(removeBtn);
    }
    arrayInner.appendChild(entryCloseRow);
  });

  const addRow = tmRow();
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn-add-entry tree-array-btn";
  addBtn.textContent = "+ Add property";
  addBtn.addEventListener("click", () => { mapping.entries.push({ label: "", expression: "" }); renderMappings(); renderOutput(); });
  addRow.appendChild(addBtn);
  arrayInner.appendChild(addRow);

  const closeRow = tmRow();
  closeRow.appendChild(tmBraceSpan("]"));
  parent.appendChild(closeRow);
}

function appendTreeObjectField(parent, field, mapping, defaultType, typeOptions) {
  const inner = tmObjectBlock(parent, field.path.split(".")[0]);
  if (typeOptions && typeOptions.length > 1) {
    const typeRow = tmRow();
    typeRow.appendChild(tmKey("@type"));
    typeRow.appendChild(tmColon());
    typeRow.appendChild(tmSelect(
      `tree-${field.id}-type`,
      typeOptions,
      mapping.type || defaultType,
      (val) => { mapping.type = val; }
    ));
    inner.appendChild(typeRow);
  } else {
    tmStaticRow(inner, "@type", defaultType);
  }
  const nameRow = tmRow();
  nameRow.appendChild(tmKey("name"));
  nameRow.appendChild(tmColon());
  nameRow.appendChild(tmInput(`tree-${field.id}`, mapping.expression || "", false, (val) => { mapping.expression = val; }, "{!Record.FieldApiName}"));
  inner.appendChild(nameRow);
}

function renderMappings() {
  elements.mappingForm.replaceChildren();
  const selected = allFields().filter((f) => state.selectedFields.has(f.id));

  if (!selected.length) {
    const empty = document.createElement("p");
    empty.className = "status warning";
    empty.textContent = "Select at least one schema field to configure bindings.";
    elements.mappingForm.appendChild(empty);
    return;
  }

  const banner = document.createElement("p");
  banner.className = "mapping-banner";
  banner.innerHTML = "Bind each property to a Salesforce merge expression — e.g. {!Record.FieldApiName} — or a static value.";
  elements.mappingForm.appendChild(banner);

  const wrap = document.createElement("div");
  wrap.className = "tree-mapping-editor";

  const node = document.createElement("div");
  node.className = "tree-node";
  node.appendChild(tmBraceSpan("{"));

  const children = document.createElement("div");
  children.className = "tree-children";
  tmStaticRow(children, "@context", "https://schema.org");
  tmStaticRow(children, "@type", state.schemaType);

  for (const field of selected) {
    const mapping = ensureMapping(field);
    if (field.valueType === "offer") {
      appendTreeOfferField(children, field, mapping);
    } else if (field.valueType === "propertyValue") {
      appendTreePropertyValueField(children, field, mapping);
    } else if (field.valueType === "brand") {
      appendTreeObjectField(children, field, mapping, "Brand", BRAND_TYPES);
    } else if (field.valueType === "organization") {
      appendTreeObjectField(children, field, mapping, "Organization", ORGANIZATION_TYPES);
    } else {
      appendTreeGenericField(children, field, mapping);
    }
  }

  node.appendChild(children);
  node.appendChild(tmBraceSpan("}"));
  wrap.appendChild(node);
  elements.mappingForm.appendChild(wrap);
}

function valueForField(field) {
  return ensureMapping(field).expression || "";
}

function applySelectedField(graph, field) {
  const mapping = ensureMapping(field);
  const value = valueForField(field);

  if (field.valueType === "offer") {
    const offer = {
      "@type": mapping.offerType || DEFAULT_OFFER.offerType,
      price: rawExpression(mapping.priceExpression || ""),
      priceCurrency: mapping.currencyExpression || "",
    };
    if (mapping.sellerName || mapping.sellerUrl) {
      offer.seller = {
        "@type": mapping.sellerType || DEFAULT_OFFER.sellerType,
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
      "@type": mapping.type || "Brand",
      name: value,
    };
    return;
  }

  if (field.valueType === "organization") {
    graph[field.path.split(".")[0]] = {
      "@type": mapping.type || "Organization",
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
      .filter((e) => e.label || e.expression)
      .map((e) => ({
        "@type": "PropertyValue",
        name: e.label || "Property",
        value: e.expression || "",
      }));
    return;
  }

  if (field.valueType === "raw") {
    graph[field.path] = rawExpression(value);
    return;
  }

  if (field.valueType === "number") {
    const num = Number(value);
    graph[field.path] = Number.isNaN(num) ? value : num;
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
    (output, value, index) => output.replace(`"${RAW_TOKEN_PREFIX}${index}__"`, () => value),
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

  let output = `<script type="application/ld+json">\n${graphToJsonWithExpressions(graph)}\n</script>`;
  if (state.includeBreadcrumbList) {
    output += `\n<script type="application/ld+json">\n{!Record.BreadcrumbList}\n</script>`;
  }
  return output;
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
        if (!String(entry.expression || "").trim()) {
          const name = String(entry.label || "").trim() || "Unnamed";
          warnings.push(`${field.label} — ${name}: no value set.`);
        }
      }
    } else {
      if (!String(mapping.expression || "").trim()) {
        warnings.push(`${field.label}: no value set.`);
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
  state.schemaError = null;
  renderFieldTiles();
  try {
    // schema.ttl is fetched once (cached in schema-parser.js); all type parses share it.
    const results = await Promise.all(
      Object.keys(SCHEMA_REGISTRY).map((typeName) =>
        loadSchemaFields(typeName).then(({ fields, error }) => ({ typeName, fields, error }))
      )
    );
    for (const { typeName, fields, error } of results) {
      if (fields.length) {
        SCHEMA_REGISTRY[typeName].fields = fields;
      } else if (typeName === state.schemaType && error) {
        state.schemaError = error;
      }
    }
  } catch (err) {
    state.schemaError = String(err);
  }
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
  if (step === 2) renderMappings();
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
  } catch {
    try {
      document.execCommand("copy");
      elements.copyStatus.textContent = "Copied.";
    } catch {
      elements.copyStatus.textContent = "Copy failed — select the text and copy manually.";
    }
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

  if (state.includeBreadcrumbList) {
    const divider = document.createElement("div");
    divider.className = "schema-preview-block-divider";
    divider.textContent = "BreadcrumbList";

    const exprNode = document.createElement("div");
    exprNode.className = "tree-node";
    const exprSpan = document.createElement("span");
    exprSpan.className = "tree-val-string";
    exprSpan.textContent = "{!Record.BreadcrumbList}";
    exprNode.appendChild(exprSpan);

    elements.schemaPreviewTree.appendChild(divider);
    elements.schemaPreviewTree.appendChild(exprNode);
  }

  elements.schemaPreviewOverlay.hidden = false;
  document.querySelector(".app-header").inert = true;
  document.querySelector(".schema-bar").inert = true;
  document.querySelector(".wizard-container").inert = true;
  elements.closePreviewButton.focus();
}

function closeSchemaPreview() {
  document.querySelector(".app-header").inert = false;
  document.querySelector(".schema-bar").inert = false;
  document.querySelector(".wizard-container").inert = false;
  elements.schemaPreviewOverlay.hidden = true;
  elements.previewSchemaButton.focus();
}

elements.previewSchemaButton.addEventListener("click", openSchemaPreview);

elements.selectAllButton.addEventListener("click", () => {
  for (const field of allFields()) {
    state.selectedFields.add(field.id);
    ensureMapping(field);
  }

  state.fieldSearchQuery = "";
  renderAll();
});

elements.recommendedButton.addEventListener("click", () => {
  resetRecommendedFields();

  state.fieldSearchQuery = "";
  renderAll();
});

elements.clearFieldsButton.addEventListener("click", () => {
  state.selectedFields.clear();

  state.fieldSearchQuery = "";
  renderAll();
});

elements.resetMappingsButton.addEventListener("click", () => {
  for (const field of allFields()) {
    state.mappings[field.id] = defaultMapping(field);
  }
  renderAll();
});

elements.breadcrumbToggle.addEventListener("change", () => {
  state.includeBreadcrumbList = elements.breadcrumbToggle.checked;
  renderOutput();
});
elements.copyButton.addEventListener("click", copyOutput);
elements.downloadButton.addEventListener("click", downloadOutput);

elements.fieldSearch.addEventListener("input", () => {
  state.fieldSearchQuery = elements.fieldSearch.value;
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
