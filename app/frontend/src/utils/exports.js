import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const REF_ORDER = [
  '6099BIS', 'PL600.01', 'PL600.03', 'PL600.04',
  'PL600.10-11', 'PL600.20-21-22', 'PL600.32', 'PL600.30', 'PL600.60',
]

const HEADER_COLOR = [30, 64, 175] // --blue

function todayStr() {
  return new Date().toLocaleDateString('fr-FR')
}

function buildRecapRows(results) {
  const map = {}
  results.debits.forEach(d =>
    d.lignes.forEach(l => {
      if (!map[l.ref]) map[l.ref] = { ref: l.ref, des: l.des, coupe: l.coupe }
    })
  )
  const refSort = results.refSort || {}
  return Object.values(map)
    .sort((a, b) => (refSort[a.ref] ?? 999) - (refSort[b.ref] ?? 999))
    .map(r => [r.ref, r.des, r.coupe, results.optim?.[r.ref]?.bars?.length ?? '—'])
}

// ---- PDF simplifié : Récap débitage + Accessoires uniquement ----
export function exportPDFSimple(results, lot, refClient = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { stats, accessoires } = results

  doc.setFontSize(15)
  doc.setFont(undefined, 'bold')
  doc.text('Récap débitage — Commande barres', 14, 18)
  doc.setFont(undefined, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  if (refClient) doc.text(`Réf. client : ${refClient}`, 14, 25)
  doc.text(
    `Date : ${todayStr()}   |   Barres totales : ${stats.barres}   |   Métré : ${stats.metreTotal_m} m   |   Chute : ${stats.chutePct}%`,
    14, refClient ? 30 : 25
  )
  doc.setTextColor(0)

  let y = refClient ? 36 : 32

  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('Récap débitage — chantier complet', 14, y)
  doc.setFont(undefined, 'normal')
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['Référence', 'Désignation', 'Coupe', 'Barres à commander']],
    body: buildRecapRows(results),
    styles: { fontSize: 9 },
    headStyles: { fillColor: HEADER_COLOR },
    columnStyles: { 3: { halign: 'right' } },
  })
  y = doc.lastAutoTable.finalY + 8

  if (accessoires.length > 0) {
    if (y > 230) { doc.addPage(); y = 14 }
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('Accessoires', 14, y)
    doc.setFont(undefined, 'normal')
    y += 3
    autoTable(doc, {
      startY: y,
      head: [['Référence', 'Désignation', 'Quantité', 'Unité']],
      body: accessoires.map(a => [a.ref, a.des, a.qte, a.unite]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: HEADER_COLOR },
      columnStyles: { 2: { halign: 'right' } },
    })
  }

  const slug = refClient ? `-${refClient.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
  doc.save(`recap-commande${slug}-${todayStr().replace(/\//g, '-')}.pdf`)
}

export function exportPDF(results, lot) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const { stats, debits, optim, accessoires, vitrage } = results

  // ---- En-tête ----
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text('ULYSSE 70 — Fiche de débitage', 14, 18)
  doc.setFont(undefined, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Date : ${todayStr()}`, 14, 25)
  doc.text(
    `Barres : ${stats.barres}   |   Métré : ${stats.metreTotal_m} m   |   Chute : ${stats.chutePct}%`,
    14, 30
  )
  doc.setTextColor(0)

  let y = 36

  // ---- Châssis ----
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('Châssis du chantier', 14, y)
  doc.setFont(undefined, 'normal')
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['#', 'Configuration', 'Type', 'L (mm)', 'H (mm)', 'Quantité', 'Coloris']],
    body: lot.map((c, i) => [
      i + 1,
      c.config,
      c.type === 'porte' ? 'Porte-fenêtre' : 'Fenêtre',
      c.L,
      c.H,
      c.Q,
      c.color || '',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: HEADER_COLOR },
  })
  y = doc.lastAutoTable.finalY + 8

  // ---- Débitage ----
  if (y > 230) { doc.addPage(); y = 14 }
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('Débitage', 14, y)
  doc.setFont(undefined, 'normal')
  y += 3

  const debitRows = debits.flatMap((d, i) =>
    d.lignes.map(l => [`Ch.${i + 1}`, l.ref, l.des, l.coupe, l.formule, l.long, l.qte])
  )
  autoTable(doc, {
    startY: y,
    head: [['Châssis', 'Réf.', 'Désignation', 'Coupe', 'Formule', 'Long. mm', 'Qté']],
    body: debitRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: HEADER_COLOR },
    columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } },
  })
  y = doc.lastAutoTable.finalY + 8

  // ---- Mise en barre (résumé tabulaire) ----
  if (y > 230) { doc.addPage(); y = 14 }
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('Mise en barre — résumé', 14, y)
  doc.setFont(undefined, 'normal')
  y += 3

  const barreRows = Object.entries(optim)
    .sort((a, b) => REF_ORDER.indexOf(a[0]) - REF_ORDER.indexOf(b[0]))
    .flatMap(([ref, { bars, barre }]) =>
      bars.map((b, i) => [ref, `B${i + 1}`, barre, b.cuts.join(' + '), `${b.rem} mm`])
    )
  autoTable(doc, {
    startY: y,
    head: [['Référence', 'Barre', 'L barre', 'Coupes (mm)', 'Chute']],
    body: barreRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: HEADER_COLOR },
  })
  y = doc.lastAutoTable.finalY + 8

  // ---- Vitrage ----
  if (y > 230) { doc.addPage(); y = 14 }
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('Vitrage', 14, y)
  doc.setFont(undefined, 'normal')
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['Repère', 'Config', 'Largeur mm', 'Hauteur mm', 'Qté', 'Surface m²']],
    body: vitrage.map(v => [
      `#${v.repere}`,
      v.config,
      v.larg,
      v.haut,
      v.qte,
      (v.larg * v.haut / 1e6 * v.qte).toFixed(2),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: HEADER_COLOR },
    columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
  })
  y = doc.lastAutoTable.finalY + 8

  // ---- Accessoires ----
  if (y > 230) { doc.addPage(); y = 14 }
  doc.setFontSize(11)
  doc.setFont(undefined, 'bold')
  doc.text('Accessoires', 14, y)
  doc.setFont(undefined, 'normal')
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['Référence', 'Désignation', 'Quantité', 'Unité']],
    body: accessoires.map(a => [a.ref, a.des, a.qte, a.unite]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: HEADER_COLOR },
    columnStyles: { 2: { halign: 'right' } },
  })

  doc.save(`debitage-${todayStr().replace(/\//g, '-')}.pdf`)
}

export function exportXLSX(results, lot) {
  const { debits, optim, accessoires, vitrage } = results
  const wb = XLSX.utils.book_new()

  // Feuille 1 : Châssis
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['#', 'Configuration', 'Type', 'L (mm)', 'H (mm)', 'Quantité', 'Coloris'],
      ...lot.map((c, i) => [
        i + 1,
        c.config,
        c.type === 'porte' ? 'Porte-fenêtre' : 'Fenêtre',
        c.L, c.H, c.Q,
        c.color || '',
      ]),
    ]),
    'Châssis'
  )

  // Feuille 2 : Débitage
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Châssis', 'Référence', 'Désignation', 'Type de coupe', 'Formule', 'Longueur (mm)', 'Quantité'],
      ...debits.flatMap((d, i) =>
        d.lignes.map(l => [`Ch.${i + 1}`, l.ref, l.des, l.coupe, l.formule, l.long, l.qte])
      ),
    ]),
    'Débitage'
  )

  // Feuille 3 : Mise en barre
  const barreData = [['Référence', 'Barre #', 'L barre (mm)', 'Coupes (mm)', 'Chute (mm)']]
  Object.entries(optim)
    .sort((a, b) => REF_ORDER.indexOf(a[0]) - REF_ORDER.indexOf(b[0]))
    .forEach(([ref, { bars, barre }]) => {
      bars.forEach((b, i) => {
        barreData.push([ref, i + 1, barre, b.cuts.join(' + '), b.rem])
      })
    })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(barreData), 'Mise en barre')

  // Feuille 4 : Accessoires
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Référence', 'Désignation', 'Quantité', 'Unité'],
      ...accessoires.map(a => [a.ref, a.des, a.qte, a.unite]),
    ]),
    'Accessoires'
  )

  XLSX.writeFile(wb, `debitage-${todayStr().replace(/\//g, '-')}.xlsx`)
}
