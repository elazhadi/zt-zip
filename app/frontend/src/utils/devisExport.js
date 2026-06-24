import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const BLUE = [30, 64, 175]

function today() { return new Date().toLocaleDateString('fr-FR') }

function fmt(n) { return n != null ? Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—' }

// Calcule les lignes de prix à partir des résultats et d'un map ref→ligne de tarif.
export function calcLignesPrix(results, lignesMap) {
  const profils = []
  let totalProfils = 0

  const refSort = results.refSort || {}
  const sortedRefs = Object.keys(results.optim || {}).sort((a, b) => {
    return (refSort[a] ?? 999) - (refSort[b] ?? 999)
  })

  for (const ref of sortedRefs) {
    const { bars, barre } = results.optim[ref]
    const nbBarres = bars.length
    const metrage  = +(nbBarres * barre / 1000).toFixed(3)
    const ligne    = lignesMap[ref]
    let total = null
    if (ligne) {
      const pu = parseFloat(ligne.prix_unitaire) || 0
      total = ligne.unite_prix === 'ml' ? +(metrage * pu).toFixed(2) : +(nbBarres * pu).toFixed(2)
      totalProfils += total
    }
    profils.push({ ref, designation: ligne?.designation || '', nbBarres, barre, metrage, prix: ligne ? parseFloat(ligne.prix_unitaire) : null, unite: ligne?.unite_prix || null, total })
  }

  const accessoires = []
  let totalAcc = 0
  for (const a of results.accessoires || []) {
    const ligne = lignesMap[a.ref]
    let total = null
    if (ligne) {
      const pu = parseFloat(ligne.prix_unitaire) || 0
      total = +(a.qte * pu).toFixed(2)
      totalAcc += total
    }
    accessoires.push({ ref: a.ref, designation: a.des, qte: a.qte, unite: a.unite, prix: ligne ? parseFloat(ligne.prix_unitaire) : null, total })
  }

  return {
    profils,
    accessoires,
    totalProfils: +totalProfils.toFixed(2),
    totalAcc:     +totalAcc.toFixed(2),
    total:        +(totalProfils + totalAcc).toFixed(2),
  }
}

// ---- PDF ----
export function exportDevisPDF({ numero, client_nom, reference_client, tarif_nom, results, lot, prix, user_nom }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const dateStr = today()

  // En-tête
  doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.setTextColor(...BLUE)
  doc.text('DEVIS', 14, 18)
  doc.setFontSize(11); doc.setTextColor(0); doc.setFont(undefined, 'normal')
  if (numero) doc.text(`N° ${numero}`, 14, 25)
  doc.text(`Date : ${dateStr}`, 14, 31)
  if (tarif_nom) doc.text(`Tarif : ${tarif_nom}`, 14, 37)
  if (user_nom)  doc.text(`Établi par : ${user_nom}`, 14, 43)

  // Bloc client
  if (client_nom || reference_client) {
    doc.setFont(undefined, 'bold')
    doc.text('Client', 130, 18)
    doc.setFont(undefined, 'normal')
    if (client_nom)       doc.text(client_nom,       130, 25)
    if (reference_client) doc.text(`Réf. : ${reference_client}`, 130, 31)
  }

  let y = 52

  // Châssis
  doc.setFontSize(11); doc.setFont(undefined, 'bold')
  doc.text('Châssis du chantier', 14, y); y += 2
  autoTable(doc, {
    startY: y,
    head: [['#', 'Config', 'Type', 'L mm', 'H mm', 'Qté', 'Coloris']],
    body: lot.map((c, i) => [
      i + 1, c.config,
      c.type === 'porte' ? 'Porte-fenêtre' : 'Fenêtre',
      c.L, c.H, c.Q, c.color || '',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BLUE },
  })
  y = doc.lastAutoTable.finalY + 8

  // Profilés
  if (y > 230) { doc.addPage(); y = 14 }
  doc.setFont(undefined, 'bold')
  doc.text('Profilés', 14, y); y += 2
  autoTable(doc, {
    startY: y,
    head: [['Référence', 'Désignation', 'Nb barres', 'L barre', 'Métré (m)', 'Prix unit.', 'Unité', 'Total MAD']],
    body: prix.profils.map(p => [
      p.ref, p.designation, p.nbBarres, p.barre,
      p.metrage,
      p.prix != null ? fmt(p.prix) : '—',
      p.unite === 'ml' ? 'MAD/ML' : p.unite === 'barre' ? 'MAD/Barre' : '—',
      p.total != null ? fmt(p.total) : '—',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BLUE },
    columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 7: { halign: 'right' } },
    foot: [[{ content: `Sous-total profilés`, colSpan: 7, styles: { fontStyle: 'bold' } }, { content: fmt(prix.totalProfils), styles: { fontStyle: 'bold', halign: 'right' } }]],
    footStyles: { fillColor: [239, 246, 255] },
  })
  y = doc.lastAutoTable.finalY + 8

  // Accessoires
  if (prix.accessoires.length > 0) {
    if (y > 230) { doc.addPage(); y = 14 }
    doc.setFont(undefined, 'bold')
    doc.text('Accessoires', 14, y); y += 2
    autoTable(doc, {
      startY: y,
      head: [['Référence', 'Désignation', 'Qté', 'Unité', 'Prix unit.', 'Total MAD']],
      body: prix.accessoires.map(a => [
        a.ref, a.designation, a.qte, a.unite,
        a.prix != null ? fmt(a.prix) : '—',
        a.total != null ? fmt(a.total) : '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: BLUE },
      columnStyles: { 2: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
      foot: [[{ content: 'Sous-total accessoires', colSpan: 5, styles: { fontStyle: 'bold' } }, { content: fmt(prix.totalAcc), styles: { fontStyle: 'bold', halign: 'right' } }]],
      footStyles: { fillColor: [239, 246, 255] },
    })
    y = doc.lastAutoTable.finalY + 8
  }

  // Total
  if (y > 260) { doc.addPage(); y = 14 }
  doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.setTextColor(...BLUE)
  doc.text(`TOTAL HT : ${fmt(prix.total)} MAD`, 14, y + 8)
  doc.setTextColor(0)

  doc.save(`devis-${numero || dateStr.replace(/\//g, '-')}.pdf`)
}

// ---- Excel ----
export function exportDevisXLSX({ numero, client_nom, reference_client, tarif_nom, results, lot, prix }) {
  const wb = XLSX.utils.book_new()

  // Feuille Info
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Numéro devis', numero || ''],
    ['Client',       client_nom || ''],
    ['Référence',    reference_client || ''],
    ['Tarif',        tarif_nom || ''],
    ['Date',         new Date().toLocaleDateString('fr-FR')],
    ['Total HT (MAD)', prix.total],
  ]), 'Infos')

  // Feuille Châssis
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['#', 'Config', 'Type', 'L (mm)', 'H (mm)', 'Qté', 'Coloris'],
    ...lot.map((c, i) => [
      i + 1, c.config,
      c.type === 'porte' ? 'Porte-fenêtre' : 'Fenêtre',
      c.L, c.H, c.Q, c.color || '',
    ]),
  ]), 'Châssis')

  // Feuille Profilés
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Référence', 'Désignation', 'Nb barres', 'L barre (mm)', 'Métré (m)', 'Prix unitaire (MAD)', 'Unité prix', 'Total MAD'],
    ...prix.profils.map(p => [
      p.ref, p.designation, p.nbBarres, p.barre,
      p.metrage, p.prix ?? '', p.unite ?? '', p.total ?? '',
    ]),
    ['', '', '', '', '', '', 'SOUS-TOTAL', prix.totalProfils],
  ]), 'Profilés')

  // Feuille Accessoires
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Référence', 'Désignation', 'Qté', 'Unité', 'Prix unitaire (MAD)', 'Total MAD'],
    ...prix.accessoires.map(a => [
      a.ref, a.designation, a.qte, a.unite, a.prix ?? '', a.total ?? '',
    ]),
    ['', '', '', '', 'SOUS-TOTAL', prix.totalAcc],
  ]), 'Accessoires')

  XLSX.writeFile(wb, `devis-${numero || 'export'}.xlsx`)
}
