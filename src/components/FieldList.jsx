import { useState } from 'react';

export default function FieldList({
  fields,
  schemaLoading,
  schemaError,
  selectedFields,
  onToggleField,
  onSelectAll,
  onClearAll,
  onRecommended,
  onNext,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const query = searchQuery.trim().toLowerCase();

  const filtered = query
    ? fields.filter(f =>
        f.label.toLowerCase().includes(query) ||
        f.path.toLowerCase().includes(query) ||
        (f.description && f.description.toLowerCase().includes(query))
      )
    : fields;


  function handleSelectAllMatching() {
    for (const f of filtered) {
      if (!selectedFields.has(f.id)) onToggleField(f);
    }
  }

  return (
    <section className="wizard-step" aria-labelledby="step1Heading">
      <div className="step-header">
        <h2 id="step1Heading">Select Schema Fields</h2>
        <div className="step-header-actions">
          <button type="button" onClick={onSelectAll}>Select All</button>
          <button type="button" onClick={onRecommended}>Recommended</button>
          <button type="button" onClick={onClearAll}>Clear</button>
        </div>
      </div>

      <input
        className="field-search-input"
        type="text"
        placeholder="Search fields..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        autoComplete="off"
        aria-label="Search schema fields"
      />

      <div className="field-meta-row">
        <span className="field-counter">
          {selectedFields.size} / {fields.length} fields selected
        </span>
        {query && filtered.length > 0 && (
          <button
            type="button"
            className="btn-select-matching"
            onClick={handleSelectAllMatching}
          >
            Select all {filtered.length} matching
          </button>
        )}
      </div>

      <div className="field-tiles">
        {schemaLoading && (
          <p className="status" style={{ gridColumn: '1 / -1' }}>
            Loading fields from schema.org…
          </p>
        )}
        {!schemaLoading && schemaError && (
          <p className="status warning" style={{ gridColumn: '1 / -1' }}>
            {schemaError}
          </p>
        )}
        {!schemaLoading && !schemaError && filtered.length === 0 && (
          <p className="status" style={{ gridColumn: '1 / -1' }}>
            {query ? 'No fields match your search.' : 'No fields available.'}
          </p>
        )}
        {!schemaLoading && !schemaError && filtered.map(field => {
          const isSelected = selectedFields.has(field.id);
          return (
            <button
              key={field.id}
              type="button"
              className={'field-tile' + (isSelected ? ' is-selected' : '')}
              aria-pressed={isSelected}
              onClick={() => onToggleField(field)}
            >
              <span className="tile-mark" aria-hidden="true">
                {isSelected ? '✓' : ''}
              </span>
              <span className="tile-body">
                <strong>{field.label}</strong>
                <small>{field.path}</small>
                {field.defaultSelected && (
                  <span className="tile-badge">Recommended</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="step-footer">
        <span />
        <button
          type="button"
          className="btn-primary"
          disabled={selectedFields.size === 0}
          onClick={onNext}
        >
          {selectedFields.size > 0
            ? `Next → (${selectedFields.size} selected)`
            : 'Next →'}
        </button>
      </div>
    </section>
  );
}
