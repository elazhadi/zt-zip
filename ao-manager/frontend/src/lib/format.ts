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

export function fmtDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—'
  const normalized = value.replace(' ', 'T')
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return value
  if (withTime && normalized.length > 10) {
    return d.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
  return d.toLocaleDateString('fr-FR')
}
