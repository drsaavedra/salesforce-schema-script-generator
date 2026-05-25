import { useState, useEffect } from 'react';
import { loadSchemaFields } from './schema-parser.js';
import { DEFAULT_OFFER } from './constants.js';
import StepsNav from './components/StepsNav.jsx';
import FieldList from './components/FieldList.jsx';
import MappingEditor from './components/MappingEditor.jsx';
import VariationAttrsPanel from './components/VariationAttrsPanel.jsx';

function buildDefaultMappings(fields) {
  const mappings = {};
  for (const field of fields) {
    mappings[field.id] = defaultMapping(field);
  }
  return mappings;
}

function defaultMapping(field) {
  if (field.valueType === 'offer') return { ...DEFAULT_OFFER };
  if (field.valueType === 'propertyValue') return { entries: [{ id: crypto.randomUUID(), label: '', expression: '' }] };
  if (field.valueType === 'brand') return { expression: '', type: 'Brand' };
  if (field.valueType === 'organization') return { expression: '', type: 'Organization' };
  if (field.defaultExpression !== undefined) return { expression: field.defaultExpression };
  return { expression: field.defaultField ? `{!Record.${field.defaultField}}` : '' };
}

export default function App() {
  const [fields, setFields] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFields, setSelectedFields] = useState(new Set());
  const [mappings, setMappings] = useState({});
  const [customVariations, setCustomVariations] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    loadSchemaFields('Product').then(({ fields: loadedFields, error }) => {
      if (error) {
        setSchemaError(error);
        setSchemaLoading(false);
        return;
      }
      setFields(loadedFields);
      const defaults = loadedFields.filter(f => f.defaultSelected);
      const defaultSet = new Set(defaults.map(f => f.id));
      setSelectedFields(defaultSet);
      setMappings(buildDefaultMappings(defaults));
      setSchemaLoading(false);
    });
  }, []);

  function handleToggleField(field) {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field.id)) {
        next.delete(field.id);
      } else {
        next.add(field.id);
      }
      return next;
    });
    setMappings(prev => {
      if (prev[field.id]) return prev;
      return { ...prev, [field.id]: defaultMapping(field) };
    });
  }

  function handleSelectAll() {
    const next = new Set(fields.map(f => f.id));
    setSelectedFields(next);
    const newMappings = { ...mappings };
    for (const f of fields) {
      if (!newMappings[f.id]) newMappings[f.id] = defaultMapping(f);
    }
    setMappings(newMappings);
  }

  function handleClearAll() {
    setSelectedFields(new Set());
    setMappings({});
  }

  function handleRecommended() {
    const recommended = fields.filter(f => f.defaultSelected);
    setSelectedFields(new Set(recommended.map(f => f.id)));
    setMappings(buildDefaultMappings(recommended));
  }

  function handleMappingChange(fieldId, updater) {
    setMappings(prev => ({
      ...prev,
      [fieldId]: typeof updater === 'function' ? updater(prev[fieldId]) : updater,
    }));
  }

  function handleReset() {
    const newMappings = {};
    for (const fieldId of selectedFields) {
      const field = fields.find(f => f.id === fieldId);
      if (field) newMappings[fieldId] = defaultMapping(field);
    }
    setMappings(newMappings);
    setCustomVariations([]);
  }

  return (
    <>
      <header className="app-header">
        <div>
          <p className="eyebrow">Salesforce B2B Commerce SEO</p>
          <h1>Product Schema Script Generator</h1>
        </div>
        <div className="header-links">
          <a className="source-link-readme" href="https://github.com/drsaavedra/salesforce-schema-script-generator#readme" target="_blank" rel="noreferrer">README.md</a>
          <a className="source-link" href="https://schema.org/Product" target="_blank" rel="noreferrer">schema.org/Product</a>
        </div>
      </header>

      <div className="wizard-container">
        <StepsNav currentStep={currentStep} onGoToStep={setCurrentStep} />

        <div className="schema-toolbar">
          <button type="button" className="btn-preview-schema" onClick={() => setIsPreviewOpen(true)}>
            Preview Schema
          </button>
        </div>

        {currentStep === 1 && (
          <FieldList
            fields={fields}
            schemaLoading={schemaLoading}
            schemaError={schemaError}
            selectedFields={selectedFields}
            onToggleField={handleToggleField}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            onRecommended={handleRecommended}
            onNext={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 2 && (
          <>
            <MappingEditor
              selectedFields={selectedFields}
              fields={fields}
              mappings={mappings}
              onMappingChange={handleMappingChange}
              onReset={handleReset}
            />
            <VariationAttrsPanel
              entries={customVariations}
              onEntriesChange={setCustomVariations}
            />
            <div className="step-footer">
              <button type="button" onClick={() => setCurrentStep(1)}>← Back</button>
              <button type="button" className="btn-primary" onClick={() => setCurrentStep(3)}>Finish →</button>
            </div>
          </>
        )}
        {currentStep === 3 && (
          <p>[ScriptOutput placeholder]</p>
        )}
        {currentStep === 3 && (
          <div className="step-footer">
            <button type="button" onClick={() => setCurrentStep(2)}>← Edit</button>
          </div>
        )}
      </div>

      {isPreviewOpen && (
        <p>[SchemaPreviewModal placeholder]</p>
      )}
    </>
  );
}
