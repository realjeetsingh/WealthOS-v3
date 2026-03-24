/**
 * Formats a number as Indian Rupee (INR) currency.
 * Uses en-IN locale for correct comma placement (e.g., 1,00,000).
 */
export function formatCurrency(value: number | string): string {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
}
