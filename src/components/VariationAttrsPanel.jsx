import { useState } from 'react';

export default function VariationAttrsPanel({ entries, onEntriesChange }) {
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
      <h3 className="variation-attrs-heading">Variation Attributes</h3>
      <p className="variation-attrs-hint">
        Use this section if you implement Variation Products (e.g. a specific size or color of a parent product).
      </p>
      <p className="variation-attrs-hint">
        Add one row per variation attribute — each outputs as an additionalProperty / PropertyValue node in the JSON-LD and should bind to a field on the ProductAttributes object, e.g. {'{!Record.ProductAttributes.Color__c}'}.
      </p>
      <div className="custom-variation-list">
        {entries.map(entry => (
          <div key={entry.id} className="custom-variation-row">
            <input
              type="text"
              className="custom-variation-name"
              value={entry.name}
              placeholder="e.g. Angle"
              autoComplete="off"
              spellCheck={false}
              onChange={e => handleNameChange(entry.id, e.target.value)}
            />
            <input
              type="text"
              className="custom-variation-expression"
              value={entry.expression}
              placeholder={`{!Record.ProductAttributes.${entry.name || 'FieldName'}__c}`}
              autoComplete="off"
              spellCheck={false}
              onChange={e => handleExpressionChange(entry.id, e.target.value)}
            />
            <button
              type="button"
              className="btn-remove"
              onClick={() => handleRemove(entry.id)}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn-add-entry" onClick={handleAdd}>
          + Add variation attribute
        </button>
      </div>
    </div>
  );
}
