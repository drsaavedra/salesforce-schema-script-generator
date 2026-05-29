import { useEffect, useRef } from 'react';
import { RAW_EXPRESSION_KEY } from '../utils/rawExpression.js';
import { applySelectedField, applyCustomVariations } from '../utils/schemaBuilder.js';

function buildPreviewGraph(selectedFields, fields, mappings, customVariations) {
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
  return graph;
}

// ── JSON tree renderer ────────────────────────────────────────────────────────

function JsonTreeNode({ value }) {
  // Handle raw expression placeholder
  if (value !== null && typeof value === 'object' && RAW_EXPRESSION_KEY in value) {
    return <span className="tree-val-number">{value[RAW_EXPRESSION_KEY]}</span>;
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
