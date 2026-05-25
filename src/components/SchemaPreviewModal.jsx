import { useEffect, useRef } from 'react';
import { DEFAULT_OFFER } from '../constants.js';

// ── Raw expression helpers ────────────────────────────────────────────────────

function rawExpression(value) {
  return { __rawExpression: value };
}

// ── Business logic (duplicated from ScriptOutput for now; future: extract to src/utils/schemaBuilder.js) ──

/**
 * Builds a graph node for a single selected field.
 * @param {object} graph   - The JSON-LD graph object being assembled (mutated).
 * @param {object} field   - FieldDescriptor from schema-parser.
 * @param {object} mapping - The mapping object for this field (from mappings state).
 */
function applySelectedFieldToGraph(graph, field, mapping) {
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
 * Appends additionalProperty entries from customVariations to the graph.
 * @param {object} graph            - The JSON-LD graph object (mutated).
 * @param {Array}  customVariations - Array of { id, name, expression } objects.
 */
function applyCustomVariationsToGraph(graph, customVariations) {
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
 * Assembles the JSON-LD graph object for preview (no script tags, no BreadcrumbList).
 */
function buildPreviewGraph(selectedFields, fields, mappings, customVariations) {
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'Product',
  };

  for (const fieldId of selectedFields) {
    const field = fields.find(f => f.id === fieldId);
    if (field) {
      const mapping = mappings[fieldId] || {};
      applySelectedFieldToGraph(graph, field, mapping);
    }
  }

  applyCustomVariationsToGraph(graph, customVariations);
  return graph;
}

// ── JSON tree renderer ────────────────────────────────────────────────────────

function JsonTreeNode({ value }) {
  // Handle raw expression placeholder
  if (value !== null && typeof value === 'object' && '__rawExpression' in value) {
    return <span className="tree-val-string">"{value.__rawExpression}"</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="tree-node">
        <span className="tree-brace">[</span>
        {value.length > 0 && (
          <div className="tree-children">
            {value.map((item, i) => (
              <div key={i} className="tree-row">
                <JsonTreeNode value={item} />
                {i < value.length - 1 && <span className="tree-colon">,</span>}
              </div>
            ))}
          </div>
        )}
        <span className="tree-brace">]</span>
      </div>
    );
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    return (
      <div className="tree-node">
        <span className="tree-brace">{'{'}</span>
        {entries.length > 0 && (
          <div className="tree-children">
            {entries.map(([k, v], i) => (
              <div key={k} className="tree-row">
                <span className="tree-key">"{k}"</span>
                <span className="tree-colon">:</span>
                <JsonTreeNode value={v} />
                {i < entries.length - 1 && <span className="tree-colon">,</span>}
              </div>
            ))}
          </div>
        )}
        <span className="tree-brace">{'}'}</span>
      </div>
    );
  }

  // Primitive
  if (typeof value === 'string') return <span className="tree-val-string">"{value}"</span>;
  if (typeof value === 'number') return <span className="tree-val-number">{String(value)}</span>;
  return <span className="tree-val-other">{value === null ? 'null' : String(value)}</span>;
}

// ── SchemaPreviewModal component ──────────────────────────────────────────────

export default function SchemaPreviewModal({
  isOpen,
  fields,
  selectedFields,
  mappings,
  customVariations,
  includeBreadcrumbList,
  onClose,
}) {
  const closeButtonRef = useRef(null);

  // Inert side effect — trap focus outside modal while open
  useEffect(() => {
    const header = document.querySelector('.app-header');
    const wizard = document.querySelector('.wizard-container');
    if (!header || !wizard) return;
    header.inert = isOpen;
    wizard.inert = isOpen;
    return () => {
      if (header) header.inert = false;
      if (wizard) wizard.inert = false;
    };
  }, [isOpen]);

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const graph = buildPreviewGraph(selectedFields, fields, mappings, customVariations);

  return (
    <div
      className="schema-preview-overlay"
      aria-modal="true"
      role="dialog"
      aria-labelledby="previewModalTitle"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="schema-preview-dialog">
        <div className="schema-preview-header">
          <h2 id="previewModalTitle">Schema Preview</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="schema-preview-close"
            aria-label="Close preview"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <p className="schema-preview-hint">
          This is the JSON-LD structure that will be generated based on your selected fields. Salesforce bindings will replace the placeholder values.
        </p>
        <div className="schema-preview-tree">
          <JsonTreeNode value={graph} />
          {includeBreadcrumbList && (
            <>
              <div className="schema-preview-block-divider">BreadcrumbList</div>
              <JsonTreeNode value={{
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: '{!Record.BreadcrumbList}',
              }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
