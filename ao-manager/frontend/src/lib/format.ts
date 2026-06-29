export function fmtNum(value: number | null | undefined, decimals = 0): string {
  if (value == null) return '—'
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtDH(value: number | null | undefined, decimals = 0): string {
  if (value == null) return '—'
  return `${fmtNum(value, decimals)} DH`
}
