import { useState } from 'react';
import { DEFAULT_OFFER } from '../constants.js';

// ── Raw expression helpers ────────────────────────────────────────────────────

const RAW_TOKEN_PREFIX = '__SCHEMA_GENERATOR_RAW_';

function rawExpression(value) {
  return { __rawExpression: value };
}

// ── Business logic (no DOM/React dependencies) ────────────────────────────────

/**
 * Builds a graph node for a single selected field.
 * @param {object} graph   - The JSON-LD graph object being assembled (mutated).
 * @param {object} field   - FieldDescriptor from schema-parser.
 * @param {object} mapping - The mapping object for this field (from mappings state).
 */
function applySelectedField(graph, field, mapping) {
  const value = mapping.expression || '';

  if (field.valueType === 'offer') {
    const offer = {
      '@type': mapping.offerType || DEFAULT_OFFER.offerType,
      priceCurrency: mapping.currencyExpression || '',
    };
    if (mapping.priceExpression) {
      offer.price = mapping.priceExpression;
    }
    if (mapping.sellerName || mapping.sellerUrl) {
      offer.seller = {
        '@type': mapping.sellerType || DEFAULT_OFFER.sellerType,
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

  if (field.valueType === 'brand') {
    graph.brand = {
      '@type': mapping.type || 'Brand',
      name: value,
    };
    return;
  }

  if (field.valueType === 'organization') {
    graph[field.path.split('.')[0]] = {
      '@type': mapping.type || 'Organization',
      name: value,
    };
    return;
  }

  if (field.valueType === 'imageArray' || field.valueType === 'array') {
    graph[field.path] = [value];
    return;
  }

  if (field.valueType === 'commaSeparatedArray') {
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    graph[field.path] = parts.length === 1 ? parts[0] : parts;
    return;
  }

  if (field.valueType === 'propertyValue') {
    graph.additionalProperty = (mapping.entries || [])
      .filter(e => e.label || e.expression)
      .map(e => ({
        '@type': 'PropertyValue',
        name: e.label || 'Property',
        value: e.expression || '',
      }));
    return;
  }

  if (field.valueType === 'raw') {
    // Skip empty raw fields — emitting null is invalid schema.org
    if (value) graph[field.path] = rawExpression(value);
    return;
  }

  if (field.valueType === 'number') {
    if (!value) return;
    const num = Number(value);
    // Non-numeric values (e.g. merge expressions) emit unquoted via rawExpression
    graph[field.path] = Number.isNaN(num) ? rawExpression(value) : num;
    return;
  }

  graph[field.path] = value;
}

/**
 * JSON.stringify with token replacement for raw expressions.
 * Allows unquoted Salesforce merge expressions like {!Record.Field} in JSON output.
 */
function graphToJsonWithExpressions(graph) {
  const rawValues = [];
  const json = JSON.stringify(
    graph,
    (key, value) => {
      if (value && typeof value === 'object' && '__rawExpression' in value) {
        const token = `${RAW_TOKEN_PREFIX}${rawValues.length}__`;
        rawValues.push(value.__rawExpression || 'null');
        return token;
      }
      return value;
    },
    2
  );

  return rawValues.reduce(
    (output, value, index) =>
      output.replace(`"${RAW_TOKEN_PREFIX}${index}__"`, () => value),
    json
  );
}

/**
 * Appends additionalProperty entries from customVariations to the graph.
 * @param {object} graph            - The JSON-LD graph object (mutated).
 * @param {Array}  customVariations - Array of { id, name, expression } objects.
 */
function applyCustomVariations(graph, customVariations) {
  const entries = customVariations
    .filter(v => v.name)
    .map(v => ({
      '@type': 'PropertyValue',
      name: v.name,
      value: v.expression || '',
    }));
  if (!entries.length) return;
  if (Array.isArray(graph.additionalProperty)) {
    graph.additionalProperty = [...graph.additionalProperty, ...entries];
  } else {
    graph.additionalProperty = entries;
  }
}

/**
 * Assembles the full <script> block for the selected fields.
 */
function buildScript(selectedFields, fields, mappings, customVariations, includeBreadcrumbList) {
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'Product',
  };

  for (const fieldId of selectedFields) {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      const mapping = mappings[fieldId] || {};
      applySelectedField(graph, field, mapping);
    }
  }

  applyCustomVariations(graph, customVariations);

  const productJson = graphToJsonWithExpressions(graph);

  if (!includeBreadcrumbList) {
    return `<script type="application/ld+json">\n${productJson}\n</script>`;
  }

  const breadcrumbJson = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: '{!Record.BreadcrumbList}',
    },
    null,
    2
  );

  return `<script type="application/ld+json">\n[\n${productJson},\n${breadcrumbJson}\n]\n</script>`;
}

/**
 * Returns an array of warning strings for empty/incomplete field mappings.
 */
function buildWarnings(selectedFields, fields, mappings, customVariations) {
  const warnings = [];

  for (const fieldId of selectedFields) {
    const field = fields.find(f => f.id === fieldId);
    if (!field) continue;
    const mapping = mappings[fieldId] || {};

    if (field.valueType === 'offer') {
      if (!String(mapping.priceExpression || '').trim()) {
        warnings.push('Offer: price expression is empty.');
      }
      if (!String(mapping.currencyExpression || '').trim()) {
        warnings.push('Offer: currency expression is empty.');
      }
    } else if (field.valueType === 'expression' || field.valueType === 'raw') {
      if (!String(mapping.expression || '').trim()) {
        warnings.push(`${field.label}: expression is empty.`);
      }
    } else if (field.valueType === 'propertyValue') {
      for (const entry of mapping.entries || []) {
        if (!String(entry.expression || '').trim()) {
          const name = String(entry.label || '').trim() || 'Unnamed';
          warnings.push(`${field.label} — ${name}: no value set.`);
        }
      }
    } else {
      if (!String(mapping.expression || '').trim()) {
        warnings.push(`${field.label}: no value set.`);
      }
    }
  }

  for (const v of customVariations) {
    if (!v.name) continue;
    if (!String(v.expression || '').trim()) {
      warnings.push(`${v.name}: no value set.`);
    }
  }

  return warnings;
}

/**
 * Validates the output text for common JSON and expression errors.
 * Returns an array of error strings (empty array means no errors).
 */
function detectOutputErrors(text) {
  const errors = [];

  // 1. Full JSON structure check — catches removed quotes on @context, @type,
  //    field names, and any string value, not just merge expressions.
  const stripped = text
    .replace(/<script[^>]*>/gi, '')
    .replace(/<\/script>/gi, '')
    .trim();
  const sanitized = stripped.replace(/\{![^}]+\}/g, '__expr__');
  try {
    JSON.parse(sanitized);
  } catch {
    errors.push(
      'Output contains invalid JSON — a quote mark may have been removed from a field name or value (e.g. "@context", "@type").'
    );
  }

  // 2. Specific merge expression check — flags which {!...} lost its quotes.
  const re = /\{![^}]+\}/g;
  const found = new Set();
  let m;
  while ((m = re.exec(text)) !== null) {
    const before = text[m.index - 1];
    const after = text[m.index + m[0].length];
    if (before !== '"' || after !== '"') found.add(m[0]);
  }
  for (const expr of found) {
    errors.push(`Unquoted expression: ${expr} — a surrounding quote may have been removed.`);
  }

  // 3. Missing closing } — e.g. {!Record.StockKeepingUnit inside a string.
  //    JSON.parse won't catch this because the string is still valid JSON.
  const missingCloseRe = /\{![^}"]+(?=")/g;
  let mm;
  while ((mm = missingCloseRe.exec(text)) !== null) {
    errors.push(`Malformed expression: ${mm[0]} — missing closing }.`);
  }

  // 4. Missing opening {! — e.g. !Record.StockKeepingUnit} inside a string.
  //    Also valid JSON so JSON.parse won't catch it.
  const missingOpenRe = /(?<!\{)!Record\.[^"{}]+}/g;
  let mo;
  while ((mo = missingOpenRe.exec(text)) !== null) {
    errors.push(`Malformed expression: ${mo[0]} — missing opening {!.`);
  }

  return errors;
}

// ── ScriptOutput component ────────────────────────────────────────────────────

export default function ScriptOutput({
  selectedFields,
  fields,
  mappings,
  customVariations,
  includeBreadcrumbList,
  onBreadcrumbToggle,
  onBack,
}) {
  const [copyStatus, setCopyStatus] = useState('');

  const scriptText = buildScript(
    selectedFields,
    fields,
    mappings,
    customVariations,
    includeBreadcrumbList
  );
  const warnings = buildWarnings(selectedFields, fields, mappings, customVariations);

  async function handleCopy() {
    const errors = detectOutputErrors(scriptText);
    if (errors.length) {
      setCopyStatus(errors[0]);
      setTimeout(() => setCopyStatus(''), 2200);
      return;
    }
    try {
      await navigator.clipboard.writeText(scriptText);
      setCopyStatus('Copied.');
    } catch {
      try {
        // Fallback for older browsers
        const textarea = document.querySelector('#scriptOutput');
        if (textarea) {
          textarea.select();
          document.execCommand('copy');
        }
        setCopyStatus('Copied.');
      } catch {
        setCopyStatus('Copy failed — select the text and copy manually.');
      }
    }
    setTimeout(() => setCopyStatus(''), 2200);
  }

  function handleDownload() {
    const errors = detectOutputErrors(scriptText);
    if (errors.length) {
      setCopyStatus(errors[0]);
      setTimeout(() => setCopyStatus(''), 2200);
      return;
    }
    const blob = new Blob([scriptText], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'product-schema-head-markup.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  return (
    <section className="wizard-step" aria-labelledby="step3Heading">
      <div className="step-header">
        <h2 id="step3Heading">Head Markup Script</h2>
        <div className="step-header-actions">
          <button type="button" onClick={handleCopy} aria-label="Copy script to clipboard">
            Copy
          </button>
          <button type="button" onClick={handleDownload} aria-label="Download script as file">
            Download
          </button>
        </div>
      </div>

      {(warnings.length > 0 || copyStatus) && (
        <div
          className="output-warnings"
          aria-live="polite"
          aria-relevant="additions removals"
        >
          {warnings.length > 0 && (
            <ul className="warning-list">
              {warnings.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
          {copyStatus && (
            <p className="status" role="status">
              {copyStatus}
            </p>
          )}
        </div>
      )}

      <div className="output-options">
        <label className="output-option-label">
          <input
            type="checkbox"
            checked={includeBreadcrumbList}
            onChange={e => onBreadcrumbToggle(e.target.checked)}
          />
          <span>Include BreadcrumbList</span>
          <span className="output-option-hint">
            Appends a second script block using Salesforce's native{' '}
            <code>{'{!Record.BreadcrumbList}'}</code> expression
          </span>
        </label>
      </div>

      <textarea
        id="scriptOutput"
        spellCheck={false}
        aria-label="Generated script"
        readOnly
        value={scriptText}
        onChange={() => {}}
      />

      <div className="step-footer">
        <button type="button" onClick={onBack}>
          ← Edit
        </button>
        <a
          className="validator-link"
          href="https://validator.schema.org/"
          target="_blank"
          rel="noreferrer"
        >
          Validate on schema.org →
        </a>
      </div>
    </section>
  );
}
