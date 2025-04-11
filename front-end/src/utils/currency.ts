export function formatCurrency(amount: number | string): string {
  // If amount is a string, remove any currency symbol and whitespace before parsing
  let numericAmount;
  
  if (typeof amount === 'string') {
    // Check if it already includes currency format
    if (amount.includes('Rs ') || amount.includes('₹ ')) {
      // If it's already formatted, extract the numeric part
      const cleanedAmount = amount.replace(/[^0-9.-]+/g, '');
      numericAmount = parseFloat(cleanedAmount);
    } else {
      // Otherwise just remove any non-numeric characters except decimal point
      const cleanedAmount = amount.replace(/[^0-9.-]+/g, '');
      numericAmount = parseFloat(cleanedAmount);
    }
  } else {
    numericAmount = amount;
  }
  
  // Check if the amount is a valid number
  if (isNaN(numericAmount)) {
    return 'Rs 0.00';
  }
  
  // Use Rs symbol with a space
  return `Rs ${numericAmount.toFixed(2)}`;
} 