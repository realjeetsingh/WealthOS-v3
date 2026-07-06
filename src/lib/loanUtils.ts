/**
 * EMI Calculation Engine & Loan Utilities
 */

/**
 * Calculate EMI using standard formula: [P * R * (1+R)^N] / [(1+R)^N-1]
 * @param principal Principal amount
 * @param annualRate Annual interest rate in percentage
 * @param tenureMonths Tenure in months
 */
export const calculateEMI = (principal: number, annualRate: number, tenureMonths: number): number => {
  if (annualRate === 0) return principal / tenureMonths;
  const monthlyRate = annualRate / (12 * 100);
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
};

/**
 * Calculate Total Payable (Principal + Total Interest)
 */
export const calculateTotalPayable = (emi: number, tenureMonths: number): number => {
  return Math.round(emi * tenureMonths * 100) / 100;
};

/**
 * Calculate Total Interest
 */
export const calculateTotalInterest = (totalPayable: number, principal: number): number => {
  return Math.round((totalPayable - principal) * 100) / 100;
};

/**
 * Calculate remaining interest and principal (Amortization logic simplified)
 */
export const getLoanBreakdown = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
  paidMonths: number
) => {
  const monthlyRate = annualRate / (12 * 100);
  let currentBalance = principal;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;

  for (let i = 0; i < paidMonths; i++) {
    const interestForMonth = currentBalance * monthlyRate;
    const emi = calculateEMI(principal, annualRate, tenureMonths);
    const principalForMonth = emi - interestForMonth;
    
    totalInterestPaid += interestForMonth;
    totalPrincipalPaid += principalForMonth;
    currentBalance -= principalForMonth;
  }

  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const totalRepayable = emi * tenureMonths;
  const totalInterest = totalRepayable - principal;

  return {
    remainingPrincipal: Math.max(0, currentBalance),
    totalInterestRemaining: Math.max(0, totalInterest - totalInterestPaid),
    interestPaid: totalInterestPaid,
    principalPaid: totalPrincipalPaid
  };
};

/**
 * Prepayment Simulator
 * Returns new tenure and interest saved
 */
export const simulatePrepayment = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
  paidMonths: number,
  prepaymentAmount: number
) => {
  const monthlyRate = annualRate / (12 * 100);
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  
  // Calculate current balance before prepayment
  let currentBalance = principal;
  for (let i = 0; i < paidMonths; i++) {
    const interest = currentBalance * monthlyRate;
    currentBalance -= (emi - interest);
  }

  const balanceAfterPrepayment = currentBalance - prepaymentAmount;
  if (balanceAfterPrepayment <= 0) return { newTenure: 0, interestSaved: 0 };

  // Calculate how many months left with original EMI
  // log(EMI / (EMI - Balance * R)) / log(1 + R)
  const newTenureLeft = Math.log(emi / (emi - balanceAfterPrepayment * monthlyRate)) / Math.log(1 + monthlyRate);
  
  const originalTenureLeft = tenureMonths - paidMonths;
  const originalInterestRemaining = (emi * originalTenureLeft) - currentBalance;
  const newInterestRemaining = (emi * newTenureLeft) - balanceAfterPrepayment;

  return {
    originalTenureLeft,
    newTenureLeft: Math.ceil(newTenureLeft),
    tenureSaved: originalTenureLeft - Math.ceil(newTenureLeft),
    interestSaved: Math.round(originalInterestRemaining - newInterestRemaining)
  };
};

/**
 * Loan Health Score
 * 0-30: Critical, 30-70: Risky, 70-100: Healthy
 */
export const calculateLoanHealth = (monthlyIncome: number, totalEMI: number, activeLoansCount: number) => {
  if (monthlyIncome <= 0) return { score: 0, status: 'Critical', label: 'Critical' };
  
  const emiToIncomeRatio = (totalEMI / monthlyIncome) * 100;
  
  let score = 100;
  
  // Ratio impact
  if (emiToIncomeRatio > 50) score -= 60;
  else if (emiToIncomeRatio > 40) score -= 40;
  else if (emiToIncomeRatio > 30) score -= 20;
  else if (emiToIncomeRatio > 20) score -= 10;

  // Loan count impact
  if (activeLoansCount > 5) score -= 20;
  else if (activeLoansCount > 3) score -= 10;

  score = Math.max(0, score);
  
  let status = 'Healthy';
  if (score < 40) status = 'Critical';
  else if (score < 70) status = 'Risky';
  
  return { score, status, label: status };
};
