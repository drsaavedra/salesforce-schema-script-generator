import { useState } from 'react';

export default function VariationAttrsPanel({ entries, onEntriesChange }) {
  const [focusedExprId, setFocusedExprId] = useState(null);
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
        {entries.map(entry => {
          const exprPlaceholder = `{!Record.ProductAttributes.${entry.name || 'FieldName'}__c}`;
          const isFocused = focusedExprId === entry.id;
          const isPartial = isFocused && entry.expression && !entry.expression.startsWith('{!');
          const showTabHint = isFocused && (!entry.expression || isPartial);

          function handleExprKeyDown(e) {
            if (e.key !== 'Tab' || e.shiftKey) return;
            if (!entry.expression) {
              e.preventDefault();
              handleExpressionChange(entry.id, exprPlaceholder);
              return;
            }
            if (isPartial) {
              e.preventDefault();
              const apiName = entry.expression.replace(/^Record\./, '');
              handleExpressionChange(entry.id, `{!Record.ProductAttributes.${apiName}}`);
            }
          }

          return (
            <div key={entry.id} className="custom-variation-row">
              <input
                type="text"
                className="custom-variation-name"
                value={entry.name}
                placeholder="Attribute Name"
                autoComplete="off"
                spellCheck={false}
                onChange={e => handleNameChange(entry.id, e.target.value)}
              />
              <span className="input-with-hint">
                <input
                  type="text"
                  className="custom-variation-expression"
                  value={entry.expression}
                  placeholder={exprPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  onFocus={() => setFocusedExprId(entry.id)}
                  onBlur={() => setFocusedExprId(null)}
                  onKeyDown={handleExprKeyDown}
                  onChange={e => handleExpressionChange(entry.id, e.target.value)}
                />
                {showTabHint && <span className="tab-fill-hint">Tab ↹ to fill</span>}
              </span>
              <button
                type="button"
                className="btn-remove"
                onClick={() => handleRemove(entry.id)}
              >
                Remove
              </button>
            </div>
          );
        })}
        <button type="button" className="btn-add-entry" onClick={handleAdd}>
          + Add variation attribute
        </button>
      </div>
    </div>
  );
}
