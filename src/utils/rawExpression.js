export const RAW_EXPRESSION_KEY = '__rawExpression';

export function rawExpression(value) {
  return { [RAW_EXPRESSION_KEY]: value };
}
