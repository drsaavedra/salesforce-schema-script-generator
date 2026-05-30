import { useState } from 'react';

// Default partial expansion: a bare API name (e.g. "StockKeepingUnit") typed into
// a merge-expression field is wrapped as {!Record.StockKeepingUnit} on Tab.
function defaultExpandPartial(value) {
  const apiName = value.replace(/^Record\./, '');
  return `{!Record.${apiName}}`;
}

/**
 * Shared Tab-to-fill behavior for merge-expression inputs.
 *
 * Three states trigger the "Tab ↹ to fill" affordance:
 *   - empty + the placeholder is a {!...} merge expression  → fill with placeholder
 *   - the value is a prefix of the placeholder (mid-typing) → fill with placeholder
 *   - the value is a bare API name (e.g. "Name")            → expand via expandPartial
 *
 * @param {object}   opts
 * @param {string}   opts.value          - current input value
 * @param {string}   opts.placeholder    - placeholder text (merge expression when fillable)
 * @param {boolean}  [opts.disabled]     - when true, Tab-to-fill is inert
 * @param {Function} opts.onChange       - called with the filled value
 * @param {Function} [opts.expandPartial] - maps a bare API name to a full expression;
 *                    return a falsy value to abort the fill (e.g. reserved names)
 * @returns {{ showTabHint: boolean, onFocus: Function, onBlur: Function, onKeyDown: Function }}
 */
export function useTabToFill({ value, placeholder, disabled = false, onChange, expandPartial = defaultExpandPartial }) {
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

  function onKeyDown(e) {
    if (e.key !== 'Tab' || e.shiftKey || disabled) return;
    if ((isEmpty && isMergeExpression) || isWithinPlaceholder) {
      e.preventDefault();
      onChange(placeholder);
      return;
    }
    if (isPartial) {
      e.preventDefault();
      const expanded = expandPartial(value);
      if (expanded) onChange(expanded);
    }
  }

  return {
    showTabHint,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onKeyDown,
  };
}
