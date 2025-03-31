export function formatCurrency(amount: number | string): string {
  // If amount is a string, remove any currency symbol and whitespace before parsing
  let numericAmount;
  
  if (typeof amount === 'string') {
    // Remove any currency symbol (like $, P, etc.) and whitespace
    numericAmount = parseFloat(amount.replace(/[^0-9.-]+/g, ''));
  } else {
    numericAmount = amount;
  }
  
  // Check if the amount is a valid number
  if (isNaN(numericAmount)) {
    return '₨ 0.00';
  }
  
  // Always use the Rupee symbol (₨) with a space
  return `₨ ${numericAmount.toFixed(2)}`;
} 