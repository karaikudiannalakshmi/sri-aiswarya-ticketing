// Central place for currency formatting so it's a one-line change if this
// ever needs to support a different currency or locale formatting.
const CURRENCY_CODE = 'LKR'

export function formatCurrency(amount) {
  const n = Number(amount || 0)
  return `${CURRENCY_CODE} ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const CURRENCY = CURRENCY_CODE
