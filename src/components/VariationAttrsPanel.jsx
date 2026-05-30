import { useState } from 'react';
import { useTabToFill } from '../hooks/useTabToFill.js';

// Custom variation attributes bind to ProductAttributes fields, so a bare API name
// expands to {!Record.ProductAttributes.Name__c} rather than the plain {!Record.Name}
// form used by the tree/flat editors.
function expandVariationPartial(value) {
  const apiName = value.replace(/^Record\./, '');
  if (apiName.toLowerCase() === 'productattributes') return null;
  const suffix = apiName.includes('__') ? '' : '__c';
  return `{!Record.ProductAttributes.${apiName}${suffix}}`;
}

function VariationRow({ entry, onNameChange, onExpressionChange, onRemove }) {
  const safeName = (entry.name || '').replace(/\W+/g, '_').replace(/^[\d_]+|_+$/g, '') || 'FieldName';
  const exprPlaceholder = `{!Record.ProductAttributes.${safeName}__c}`;

  const { showTabHint, onFocus, onBlur, onKeyDown } = useTabToFill({
    value: entry.expression,
    placeholder: exprPlaceholder,
    onChange: val => onExpressionChange(entry.id, val),
    expandPartial: expandVariationPartial,
  });

  return (
    <div className="custom-variation-row">
      <input
        type="text"
        className="custom-variation-name"
        value={entry.name}
        placeholder="Attribute Name"
        autoComplete="off"
        spellCheck={false}
        onChange={e => onNameChange(entry.id, e.target.value)}
      />
      <span className="input-with-hint">
        <input
          type="text"
          className="custom-variation-expression"
          value={entry.expression}
          placeholder={exprPlaceholder}
          autoComplete="off"
          spellCheck={false}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          onChange={e => onExpressionChange(entry.id, e.target.value)}
        />
        {showTabHint && <span className="tab-fill-hint">Tab ↹ to fill</span>}
      </span>
      <button
        type="button"
        className="btn-remove"
        onClick={() => onRemove(entry.id)}
      >
        Remove
      </button>
    </div>
  );
}

export default function VariationAttrsPanel({ entries, onEntriesChange }) {
  const [showInfo, setShowInfo] = useState(false);

  function handleAdd() {
    onEntriesChange([...entries, { id: crypto.randomUUID(), name: '', expression: '' }]);
  }

  function handleRemove(id) {
    onEntriesChange(entries.filter(e => e.id !== id));
  }

  function handleNameChange(id, value) {
    onEntriesChange(entries.map(e => e.id === id ? { ...e, name: value } : e));
  }

  function handleExpressionChange(id, value) {
    onEntriesChange(entries.map(e => e.id === id ? { ...e, expression: value } : e));
  }

  return (
    <div className="variation-attrs-panel">
      <div className="variation-attrs-card-header">
        <h4 className="variation-attrs-heading">Custom variation attributes</h4>
        <button
          type="button"
          className="variation-attrs-info-trigger"
          aria-expanded={showInfo}
          aria-label="Show schema.org guidance"
          onClick={() => setShowInfo(s => !s)}
        >
          ?
        </button>
      </div>
      {showInfo && (
        <div className="variation-attrs-info-body">
          <p>
            <strong>Note:</strong> schema.org recommends that well-known attributes —
            such as <code>color</code>, <code>width</code>, <code>material</code>,
            or <code>gtin13</code> — be mapped to their dedicated schema.org properties
            instead of this generic mechanism, since structured-data consumers expect
            to find those values at their specific property paths.
          </p>
        </div>
      )}
      <p className="variation-attrs-hint">
        For proprietary fields with no dedicated schema.org property — each row outputs as an <code>additionalProperty / PropertyValue</code> node bound to a <code>ProductAttributes</code> field.
      </p>
      <div className="custom-variation-list">
        {entries.map(entry => (
          <VariationRow
            key={entry.id}
            entry={entry}
            onNameChange={handleNameChange}
            onExpressionChange={handleExpressionChange}
            onRemove={handleRemove}
          />
        ))}
        <button type="button" className="btn-add-entry" onClick={handleAdd}>
          + Add variation attribute
        </button>
      </div>
    </div>
  );
}
