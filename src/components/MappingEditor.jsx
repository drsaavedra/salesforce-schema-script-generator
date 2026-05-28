import { useState, useEffect } from 'react';
import { OFFER_TYPES, SELLER_TYPES, BRAND_TYPES, ORGANIZATION_TYPES, TYPE_HINT_DETAILS, DEFAULT_OFFER } from '../constants.js';

// ── Shared primitive helpers ──────────────────────────────────────────────────

function TypeTag({ hint }) {
  const detail = TYPE_HINT_DETAILS[hint];
  return (
    <span
      className={'field-type-tag' + (hint === 'Boolean' ? ' is-boolean' : hint === 'Number' ? ' is-number' : '')}
      title={detail || undefined}
    >
      {hint}
    </span>
  );
}

function TreeInput({ id, value, disabled, onChange, placeholder }) {
  const [isFocused, setIsFocused] = useState(false);
  const isMergeExpression = placeholder?.startsWith('{!') ?? false;
  const isEmpty = !value;
  const isWithinPlaceholder = !isEmpty && isMergeExpression
    && value.length < placeholder.length
    && placeholder.startsWith(value);
  const isPartial = !isEmpty && !disabled && /^[\w$]+$/.test(value);
  const showTabHint = !disabled && isFocused && (
    (isEmpty && isMergeExpression) || isWithinPlaceholder || isPartial
  );

  function handleKeyDown(e) {
    if (e.key !== 'Tab' || e.shiftKey || disabled) return;
    if ((isEmpty && isMergeExpression) || isWithinPlaceholder) {
      e.preventDefault();
      onChange(placeholder);
      return;
    }
    if (isPartial) {
      e.preventDefault();
      const apiName = value.replace(/^Record\./, '');
      onChange(`{!Record.${apiName}}`);
    }
  }

  return (
    <span className="input-with-hint">
      <input
        type="text"
        className={'tree-input' + (disabled ? ' is-disabled' : '')}
        id={id}
        value={value || ''}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        placeholder={disabled ? undefined : placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        onChange={e => onChange(e.target.value)}
      />
      {showTabHint && <span className="tab-fill-hint">Tab ↹ to fill</span>}
    </span>
  );
}

function TreeSelect({ id, options, value, onChange }) {
  return (
    <select id={id} className="tree-select" value={value} onChange={e => onChange(e.target.value)}>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
}

// ── Tree view field renderers ─────────────────────────────────────────────────

function TreeGenericField({ field, mapping, onMappingChange }) {
  const fieldKey = field.path.split('.')[0];
  const hasDefault = field.defaultExpression !== undefined;
  const isDefaulted = hasDefault && mapping.useDefault !== false;

  return (
    <div className="tree-row">
      <span className="tree-key">"{fieldKey}"</span>
      <span className="tree-colon">:</span>
      <TreeInput
        id={`tree-${field.id}`}
        value={isDefaulted ? field.defaultExpression : (mapping.expression || '')}
        disabled={isDefaulted}
        placeholder={isDefaulted ? undefined : (field.defaultField ? `{!Record.${field.defaultField}}` : '{!Record.FieldApiName}')}
        onChange={val => onMappingChange(field.id, m => ({ ...m, expression: val }))}
      />
      {field.typeHint && <TypeTag hint={field.typeHint} />}
      {hasDefault && (
        <label className="tree-use-default" htmlFor={`tree-${field.id}-ud`}>
          <input
            type="checkbox"
            id={`tree-${field.id}-ud`}
            checked={isDefaulted}
            onChange={e => {
              const checked = e.target.checked;
              onMappingChange(field.id, m => ({
                ...m,
                useDefault: checked,
                expression: checked ? field.defaultExpression : '',
              }));
            }}
          />
          <span>default</span>
        </label>
      )}
    </div>
  );
}

function TreeOfferField({ field, mapping, onMappingChange }) {
  const isPriceDefault = mapping.useDefaultPrice !== false;
  const isCurrDefault = mapping.useDefaultCurrency !== false;

  return (
    <>
      <div className="tree-row">
        <span className="tree-key">"offers"</span>
        <span className="tree-colon">:</span>
        <span className="tree-brace">{"{"}</span>
      </div>
      <div className="tree-children">
        <div className="tree-row">
          <span className="tree-key">"@type"</span>
          <span className="tree-colon">:</span>
          <TreeSelect
            id={`tree-${field.id}-offerType`}
            options={OFFER_TYPES}
            value={mapping.offerType || DEFAULT_OFFER.offerType}
            onChange={val => onMappingChange(field.id, m => ({ ...m, offerType: val }))}
          />
        </div>
        <div className="tree-row">
          <span className="tree-key">"price"</span>
          <span className="tree-colon">:</span>
          <TreeInput
            id={`tree-${field.id}-price`}
            value={isPriceDefault ? DEFAULT_OFFER.priceExpression : (mapping.priceExpression || '')}
            disabled={isPriceDefault}
            placeholder={isPriceDefault ? undefined : '{!Record.FieldApiName}'}
            onChange={val => onMappingChange(field.id, m => ({ ...m, priceExpression: val }))}
          />
          <TypeTag hint="Number" />
          <label className="tree-use-default" htmlFor={`tree-${field.id}-price-ud`}>
            <input
              type="checkbox"
              id={`tree-${field.id}-price-ud`}
              checked={isPriceDefault}
              onChange={e => {
                const checked = e.target.checked;
                onMappingChange(field.id, m => ({
                  ...m,
                  useDefaultPrice: checked,
                  priceExpression: checked ? DEFAULT_OFFER.priceExpression : '',
                }));
              }}
            />
            <span>default</span>
          </label>
        </div>
        <div className="tree-row">
          <span className="tree-key">"priceCurrency"</span>
          <span className="tree-colon">:</span>
          <TreeInput
            id={`tree-${field.id}-curr`}
            value={isCurrDefault ? DEFAULT_OFFER.currencyExpression : (mapping.currencyExpression || '')}
            disabled={isCurrDefault}
            placeholder={isCurrDefault ? undefined : '{!Record.FieldApiName}'}
            onChange={val => onMappingChange(field.id, m => ({ ...m, currencyExpression: val }))}
          />
          <TypeTag hint="ISO 4217" />
          <label className="tree-use-default" htmlFor={`tree-${field.id}-curr-ud`}>
            <input
              type="checkbox"
              id={`tree-${field.id}-curr-ud`}
              checked={isCurrDefault}
              onChange={e => {
                const checked = e.target.checked;
                onMappingChange(field.id, m => ({
                  ...m,
                  useDefaultCurrency: checked,
                  currencyExpression: checked ? DEFAULT_OFFER.currencyExpression : '',
                }));
              }}
            />
            <span>default</span>
          </label>
        </div>
        <div className="tree-row">
          <span className="tree-key">"seller"</span>
          <span className="tree-colon">:</span>
          <span className="tree-brace">{"{"}</span>
        </div>
        <div className="tree-children">
          <div className="tree-row">
            <span className="tree-key">"@type"</span>
            <span className="tree-colon">:</span>
            <TreeSelect
              id={`tree-${field.id}-sellerType`}
              options={SELLER_TYPES}
              value={mapping.sellerType || DEFAULT_OFFER.sellerType}
              onChange={val => onMappingChange(field.id, m => ({ ...m, sellerType: val }))}
            />
          </div>
          <div className="tree-row">
            <span className="tree-key">"name"</span>
            <span className="tree-colon">:</span>
            <TreeInput
              id={`tree-${field.id}-sellerName`}
              value={mapping.sellerName || ''}
              placeholder="Company Name"
              onChange={val => onMappingChange(field.id, m => ({ ...m, sellerName: val }))}
            />
          </div>
          <div className="tree-row">
            <span className="tree-key">"url"</span>
            <span className="tree-colon">:</span>
            <TreeInput
              id={`tree-${field.id}-sellerUrl`}
              value={mapping.sellerUrl || ''}
              placeholder="Company Website"
              onChange={val => onMappingChange(field.id, m => ({ ...m, sellerUrl: val }))}
            />
          </div>
        </div>
        <div className="tree-row"><span className="tree-brace">{"}"}</span></div>
      </div>
      <div className="tree-row"><span className="tree-brace">{"}"}</span></div>
    </>
  );
}

function TreePropertyValueField({ field, mapping, onMappingChange }) {
  return (
    <>
      <div className="tree-row">
        <span className="tree-key">"additionalProperty"</span>
        <span className="tree-colon">:</span>
        <span className="tree-brace">[</span>
      </div>
      <div className="tree-children">
        {mapping.entries.map((entry, idx) => (
          <div key={entry.id}>
            <div className="tree-row"><span className="tree-brace">{"{"}</span></div>
            <div className="tree-children">
              <div className="tree-row">
                <span className="tree-key">"@type"</span>
                <span className="tree-colon">:</span>
                <span className="tree-val-string">"PropertyValue"</span>
              </div>
              <div className="tree-row">
                <span className="tree-key">"name"</span>
                <span className="tree-colon">:</span>
                <TreeInput
                  id={`tree-${field.id}-name-${idx}`}
                  value={entry.label || ''}
                  onChange={val => onMappingChange(field.id, m => {
                    const entries = m.entries.map((e, i) => i === idx ? { ...e, label: val } : e);
                    return { ...m, entries };
                  })}
                />
              </div>
              <div className="tree-row">
                <span className="tree-key">"value"</span>
                <span className="tree-colon">:</span>
                <TreeInput
                  id={`tree-${field.id}-value-${idx}`}
                  value={entry.expression || ''}
                  placeholder="{!Record.FieldApiName}"
                  onChange={val => onMappingChange(field.id, m => {
                    const entries = m.entries.map((e, i) => i === idx ? { ...e, expression: val } : e);
                    return { ...m, entries };
                  })}
                />
              </div>
            </div>
            <div className="tree-row">
              <span className="tree-brace">{"}"}</span>
              {mapping.entries.length > 1 && (
                <button
                  type="button"
                  className="btn-remove tree-array-btn"
                  onClick={() => onMappingChange(field.id, m => ({
                    ...m,
                    entries: m.entries.filter((_, i) => i !== idx),
                  }))}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="tree-row">
          <button
            type="button"
            className="btn-add-entry tree-array-btn"
            onClick={() => onMappingChange(field.id, m => ({
              ...m,
              entries: [...m.entries, { id: crypto.randomUUID(), label: '', expression: '' }],
            }))}
          >
            + Add property
          </button>
        </div>
      </div>
      <div className="tree-row"><span className="tree-brace">]</span></div>
    </>
  );
}

function TreeObjectField({ field, mapping, defaultType, typeOptions, onMappingChange }) {
  const key = field.path.split('.')[0];
  const hasTypeChoice = typeOptions && typeOptions.length > 1;
  return (
    <>
      <div className="tree-row">
        <span className="tree-key">"{key}"</span>
        <span className="tree-colon">:</span>
        <span className="tree-brace">{"{"}</span>
      </div>
      <div className="tree-children">
        <div className="tree-row">
          <span className="tree-key">"@type"</span>
          <span className="tree-colon">:</span>
          {hasTypeChoice ? (
            <TreeSelect
              id={`tree-${field.id}-type`}
              options={typeOptions}
              value={mapping.type || defaultType}
              onChange={val => onMappingChange(field.id, m => ({ ...m, type: val }))}
            />
          ) : (
            <span className="tree-val-string">"{defaultType}"</span>
          )}
        </div>
        <div className="tree-row">
          <span className="tree-key">"name"</span>
          <span className="tree-colon">:</span>
          <TreeInput
            id={`tree-${field.id}`}
            value={mapping.expression || ''}
            placeholder="{!Record.FieldApiName}"
            onChange={val => onMappingChange(field.id, m => ({ ...m, expression: val }))}
          />
        </div>
      </div>
      <div className="tree-row"><span className="tree-brace">{"}"}</span></div>
    </>
  );
}

// ── Flat form field renderers (mobile ≤640px) ─────────────────────────────────

function FlatInput({ id, label, value, disabled, placeholder, onChange }) {
  const [isFocused, setIsFocused] = useState(false);
  const isMergeExpression = placeholder?.startsWith('{!') ?? false;
  const isEmpty = !value;
  const isWithinPlaceholder = !isEmpty && isMergeExpression
    && value.length < placeholder.length
    && placeholder.startsWith(value);
  const isPartial = !isEmpty && !disabled && /^[\w$]+$/.test(value);
  const showTabHint = !disabled && isFocused && (
    (isEmpty && isMergeExpression) || isWithinPlaceholder || isPartial
  );

  function handleKeyDown(e) {
    if (e.key !== 'Tab' || e.shiftKey || disabled) return;
    if ((isEmpty && isMergeExpression) || isWithinPlaceholder) {
      e.preventDefault();
      onChange(placeholder);
      return;
    }
    if (isPartial) {
      e.preventDefault();
      const apiName = value.replace(/^Record\./, '');
      onChange(`{!Record.${apiName}}`);
    }
  }

  return (
    <div className="mapping-row">
      <label htmlFor={id}>{label}</label>
      <span className="input-with-hint">
        <input
          type="text"
          id={id}
          value={value || ''}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          onChange={e => onChange(e.target.value)}
        />
        {showTabHint && <span className="tab-fill-hint">Tab ↹ to fill</span>}
      </span>
    </div>
  );
}

function FlatUseDefault({ id, checked, label, onChange }) {
  return (
    <div className="use-default-row">
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

function FlatGenericField({ field, mapping, onMappingChange }) {
  if (field.defaultExpression !== undefined) {
    const isDefaulted = mapping.useDefault !== false;
    return (
      <div className="field-binding-group">
        <FlatInput
          id={`${field.id}-expression`}
          label={field.label}
          value={isDefaulted ? field.defaultExpression : (mapping.expression || '')}
          disabled={isDefaulted}
          placeholder={isDefaulted ? undefined : field.defaultExpression}
          onChange={val => onMappingChange(field.id, m => ({ ...m, expression: val }))}
        />
        <FlatUseDefault
          id={`${field.id}-useDefault`}
          checked={isDefaulted}
          label="Use default"
          onChange={checked => onMappingChange(field.id, m => ({
            ...m,
            useDefault: checked,
            expression: checked ? field.defaultExpression : '',
          }))}
        />
      </div>
    );
  }
  const placeholder = field.valueType === 'commaSeparatedArray'
    ? 'e.g. color, size, material'
    : field.defaultField ? `{!Record.${field.defaultField}}` : '{!Record.FieldApiName}';
  return (
    <FlatInput
      id={`${field.id}-expression`}
      label={field.label}
      value={mapping.expression || ''}
      placeholder={placeholder}
      onChange={val => onMappingChange(field.id, m => ({ ...m, expression: val }))}
    />
  );
}

function FlatOfferField({ field, mapping, onMappingChange }) {
  const isPriceDefaulted = mapping.useDefaultPrice !== false;
  const isCurrencyDefaulted = mapping.useDefaultCurrency !== false;
  return (
    <>
      <div className="field-binding-group">
        <FlatInput
          id={`${field.id}-priceExpression`}
          label="Offer price"
          value={isPriceDefaulted ? DEFAULT_OFFER.priceExpression : (mapping.priceExpression || '')}
          disabled={isPriceDefaulted}
          placeholder={isPriceDefaulted ? undefined : DEFAULT_OFFER.priceExpression}
          onChange={val => onMappingChange(field.id, m => ({ ...m, priceExpression: val }))}
        />
        <FlatUseDefault
          id={`${field.id}-useDefaultPrice`}
          checked={isPriceDefaulted}
          label="Use default"
          onChange={checked => onMappingChange(field.id, m => ({
            ...m,
            useDefaultPrice: checked,
            priceExpression: checked ? DEFAULT_OFFER.priceExpression : '',
          }))}
        />
      </div>
      <div className="field-binding-group">
        <FlatInput
          id={`${field.id}-currencyExpression`}
          label="Offer currency"
          value={isCurrencyDefaulted ? DEFAULT_OFFER.currencyExpression : (mapping.currencyExpression || '')}
          disabled={isCurrencyDefaulted}
          placeholder={isCurrencyDefaulted ? undefined : DEFAULT_OFFER.currencyExpression}
          onChange={val => onMappingChange(field.id, m => ({ ...m, currencyExpression: val }))}
        />
        <FlatUseDefault
          id={`${field.id}-useDefaultCurrency`}
          checked={isCurrencyDefaulted}
          label="Use default"
          onChange={checked => onMappingChange(field.id, m => ({
            ...m,
            useDefaultCurrency: checked,
            currencyExpression: checked ? DEFAULT_OFFER.currencyExpression : '',
          }))}
        />
      </div>
      <FlatInput
        id={`${field.id}-sellerName`}
        label="Seller name"
        value={mapping.sellerName || ''}
        onChange={val => onMappingChange(field.id, m => ({ ...m, sellerName: val }))}
      />
      <FlatInput
        id={`${field.id}-sellerUrl`}
        label="Seller URL"
        value={mapping.sellerUrl || ''}
        onChange={val => onMappingChange(field.id, m => ({ ...m, sellerUrl: val }))}
      />
    </>
  );
}

function FlatPropertyValueField({ field, mapping, onMappingChange }) {
  return (
    <>
      {mapping.entries.map((entry, idx) => (
        <div key={entry.id} className="property-group">
          <div className="property-group-header">
            <span>Property {idx + 1}</span>
            {mapping.entries.length > 1 && (
              <button
                type="button"
                className="btn-remove"
                onClick={() => onMappingChange(field.id, m => ({
                  ...m,
                  entries: m.entries.filter((_, i) => i !== idx),
                }))}
              >
                Remove
              </button>
            )}
          </div>
          <FlatInput
            id={`${field.id}-label-${idx}`}
            label="Property name"
            value={entry.label || ''}
            onChange={val => onMappingChange(field.id, m => {
              const entries = m.entries.map((e, i) => i === idx ? { ...e, label: val } : e);
              return { ...m, entries };
            })}
          />
          <FlatInput
            id={`${field.id}-expression-${idx}`}
            label="Value"
            value={entry.expression || ''}
            placeholder="{!Record.FieldApiName}"
            onChange={val => onMappingChange(field.id, m => {
              const entries = m.entries.map((e, i) => i === idx ? { ...e, expression: val } : e);
              return { ...m, entries };
            })}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn-add-entry"
        onClick={() => onMappingChange(field.id, m => ({
          ...m,
          entries: [...m.entries, { id: crypto.randomUUID(), label: '', expression: '' }],
        }))}
      >
        + Add another property
      </button>
    </>
  );
}

// ── Main MappingEditor component ──────────────────────────────────────────────

export default function MappingEditor({ selectedFields, fields, mappings, onMappingChange, onReset }) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 640px)').matches);
  const [closedMappings, setClosedMappings] = useState(new Set());

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const selected = fields.filter(f => selectedFields.has(f.id));

  function handleAccordionToggle(fieldId) {
    setClosedMappings(prev => {
      const next = new Set(prev);
      next.has(fieldId) ? next.delete(fieldId) : next.add(fieldId);
      return next;
    });
  }

  function renderTreeField(field) {
    const mapping = mappings[field.id] || {};
    if (field.valueType === 'offer') return <TreeOfferField key={field.id} field={field} mapping={mapping} onMappingChange={onMappingChange} />;
    if (field.valueType === 'propertyValue') return <TreePropertyValueField key={field.id} field={field} mapping={mapping} onMappingChange={onMappingChange} />;
    if (field.valueType === 'brand') return <TreeObjectField key={field.id} field={field} mapping={mapping} defaultType="Brand" typeOptions={BRAND_TYPES} onMappingChange={onMappingChange} />;
    if (field.valueType === 'organization') return <TreeObjectField key={field.id} field={field} mapping={mapping} defaultType="Organization" typeOptions={ORGANIZATION_TYPES} onMappingChange={onMappingChange} />;
    return <TreeGenericField key={field.id} field={field} mapping={mapping} onMappingChange={onMappingChange} />;
  }

  if (!selected.length) {
    return (
      <section className="wizard-step" aria-labelledby="step2Heading">
        <div className="step-header">
          <h2 id="step2Heading">Salesforce Bindings</h2>
          <button type="button" onClick={onReset}>Reset</button>
        </div>
        <div className="mapping-form">
          <p className="status warning">Select at least one schema field to configure bindings.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="wizard-step" aria-labelledby="step2Heading">
      <div className="step-header">
        <h2 id="step2Heading">Salesforce Bindings</h2>
        <button type="button" onClick={onReset}>Reset</button>
      </div>

      {isMobile ? (
        // ── Flat form view (mobile ≤640px) ──
        <div className="mapping-form">
          <ul className="mapping-banner">
            <li>Enter a Salesforce merge field like <code>{'{!Record.Name}'}</code>, or a static value for any field.</li>
            <li>Type an API name (e.g. <code>Name</code> or <code>Price__c</code>) and press <kbd>Tab ↹</kbd> to wrap it automatically.</li>
          </ul>
          {selected.map(field => {
            const mapping = mappings[field.id] || {};
            const needsAccordion = field.valueType === 'offer' || field.valueType === 'propertyValue';
            if (!needsAccordion) {
              return <FlatGenericField key={field.id} field={field} mapping={mapping} onMappingChange={onMappingChange} />;
            }
            const isClosed = closedMappings.has(field.id);
            const summary = field.valueType === 'offer'
              ? (mapping.priceExpression || DEFAULT_OFFER.priceExpression)
              : `${(mapping.entries || []).length} propert${(mapping.entries || []).length === 1 ? 'y' : 'ies'}`;
            return (
              <div key={field.id} className={'mapping-accordion' + (isClosed ? ' is-closed' : '')}>
                <button type="button" className="mapping-accordion-header" onClick={() => handleAccordionToggle(field.id)}>
                  <span className="mapping-accordion-title">{field.label}</span>
                  <span className="mapping-accordion-summary">{summary}</span>
                  <span className="mapping-accordion-chevron" aria-hidden="true">▼</span>
                </button>
                <div className="mapping-accordion-body">
                  {field.valueType === 'offer'
                    ? <FlatOfferField field={field} mapping={mapping} onMappingChange={onMappingChange} />
                    : <FlatPropertyValueField field={field} mapping={mapping} onMappingChange={onMappingChange} />
                  }
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ── Tree view (desktop ≥641px) ──
        <div className="mapping-form">
          <ul className="mapping-banner">
            <li>Bind each property to a Salesforce merge expression — e.g. <code>{'{!Record.FieldApiName}'}</code> — or a static value.</li>
            <li>Type an API name (e.g. <code>Name</code> or <code>Price__c</code>) and press <kbd>Tab ↹</kbd> to wrap it automatically.</li>
          </ul>
          <div className="tree-mapping-editor">
            <div className="tree-node">
              <span className="tree-brace">{"{"}</span>
              <div className="tree-children">
                <div className="tree-row">
                  <span className="tree-key">"@context"</span>
                  <span className="tree-colon">:</span>
                  <span className="tree-val-string">"https://schema.org"</span>
                </div>
                <div className="tree-row">
                  <span className="tree-key">"@type"</span>
                  <span className="tree-colon">:</span>
                  <span className="tree-val-string">"Product"</span>
                </div>
                {selected.map(field => renderTreeField(field))}
              </div>
              <span className="tree-brace">{"}"}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
