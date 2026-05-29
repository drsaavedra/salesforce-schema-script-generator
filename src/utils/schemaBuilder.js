import { DEFAULT_OFFER } from '../constants.js';
import { rawExpression } from './rawExpression.js';

/**
 * Builds a graph node for a single selected field.
 * @param {object} graph   - The JSON-LD graph object being assembled (mutated).
 * @param {object} field   - FieldDescriptor from schema-parser.
 * @param {object} mapping - The mapping object for this field (from mappings state).
 */
export function applySelectedField(graph, field, mapping) {
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
    if (!parts.length) return;
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
 * Assembles the full Product JSON-LD graph from the selected fields and custom
 * variations. Shared by ScriptOutput (script generation) and SchemaPreviewModal
 * (preview tree) so the two can never diverge.
 *
 * Perf: builds a fieldId→field Map once (O(fields)) instead of calling
 * fields.find() per selected field (which would be O(selected × fields)).
 *
 * @param {Set}    selectedFields  - Set of selected field ids.
 * @param {Array}  fields          - All FieldDescriptors.
 * @param {object} mappings        - fieldId → mapping object.
 * @param {Array}  customVariations - Array of { id, name, expression } objects.
 * @returns {object} the assembled JSON-LD graph.
 */
export function buildProductGraph(selectedFields, fields, mappings, customVariations) {
  const graph = {
    '@context': 'https://schema.org',
    '@type': 'Product',
  };

  const fieldsById = new Map(fields.map(f => [f.id, f]));
  for (const fieldId of selectedFields) {
    const field = fieldsById.get(fieldId);
    if (field) {
      applySelectedField(graph, field, mappings[fieldId] || {});
    }
  }

  applyCustomVariations(graph, customVariations);
  return graph;
}

/**
 * Appends additionalProperty entries from customVariations to the graph.
 * @param {object} graph            - The JSON-LD graph object (mutated).
 * @param {Array}  customVariations - Array of { id, name, expression } objects.
 */
export function applyCustomVariations(graph, customVariations) {
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
