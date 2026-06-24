import * as XLSX from 'xlsx'

const TYPE_LABEL = {
  porte:           'Porte-fenêtre coulissante',
  fenetre:         'Fenêtre coulissante',
  ouvrant_pf:      'Ouvrant à la française',
  oscillo_battant: 'Oscillo-battant',
  fixe:            'Panneau fixe',
  basculant:       'Basculant',
}
const fmtDate = d => new Date(d).toLocaleDateString('fr-FR')

function autoWidth(ws, rows) {
  const cols = []
  rows.forEach(r => r.forEach((cell, ci) => {
    const len = String(cell ?? '').length
    if (!cols[ci] || cols[ci].wch < len) cols[ci] = { wch: Math.min(len + 2, 50) }
  }))
  ws['!cols'] = cols
}

function addSheet(wb, name, rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  autoWidth(ws, rows)
  XLSX.utils.book_append_sheet(wb, ws, name)
}

// ---- Global ou par gamme ----
export function exportChantiers(chantiers, { gamme, from, to } = {}) {
  const wb = XLSX.utils.book_new()

  const chanRows = [
    ['ID', 'Référence client', 'Date', 'Vendeur', 'Site', 'Statut', 'Nb châssis'],
    ...chantiers.map(c => [
      c.id, c.reference_client || '', fmtDate(c.date_creation),
      c.vendeur_nom || '', c.site_nom || '', c.statut, c.chassis.length,
    ]),
  ]
  addSheet(wb, 'Chantiers', chanRows)

  const chassisRows = [
    ['Chantier ID', 'Référence client', 'Date', 'Vendeur', 'Repère',
     'Gamme', 'Config', 'Type', 'L (mm)', 'H (mm)', 'Qté', 'Coloris'],
  ]
  chantiers.forEach(c => {
    c.chassis.forEach(ch => {
      chassisRows.push([
        c.id, c.reference_client || '', fmtDate(c.date_creation), c.vendeur_nom || '',
        ch.repere, ch.gamme, ch.config,
        TYPE_LABEL[ch.type_ouvrage] || ch.type_ouvrage,
        ch.largeur, ch.hauteur, ch.quantite, ch.coloris || '',
      ])
    })
  })
  addSheet(wb, 'Châssis', chassisRows)

  const parts = ['chantiers']
  if (gamme) parts.push(gamme)
  if (from || to) parts.push(`${from || ''}__${to || ''}`)
  XLSX.writeFile(wb, `${parts.join('-')}.xlsx`)
}

// ---- Par projet : inclut le débitage ----
export function exportProjet(chantier, chassis, resultats) {
  const wb = XLSX.utils.book_new()

  // Infos
  addSheet(wb, 'Chantier', [
    ['Référence client', chantier.reference_client || ''],
    ['Date',            fmtDate(chantier.date_creation)],
    ['Vendeur',         chantier.vendeur_nom || ''],
    ['Site',            chantier.site_nom || ''],
    ['Statut',          chantier.statut],
  ])

  // Châssis
  addSheet(wb, 'Châssis', [
    ['Repère', 'Gamme', 'Config', 'Type', 'L (mm)', 'H (mm)', 'Qté', 'Coloris'],
    ...chassis.map(ch => [
      ch.repere, ch.gamme, ch.config,
      TYPE_LABEL[ch.type_ouvrage] || ch.type_ouvrage,
      ch.largeur, ch.hauteur, ch.quantite, ch.coloris || '',
    ]),
  ])

  if (resultats) {
    // Débitage
    addSheet(wb, 'Débitage', [
      ['Châssis', 'Référence', 'Désignation', 'Coupe', 'Long. (mm)', 'Qté'],
      ...resultats.debits.flatMap((d, i) =>
        d.lignes.map(l => [`#${i + 1}`, l.ref, l.des, l.coupe, l.long, l.qte])
      ),
    ])

    // Mise en barre
    const barreRows = [['Référence', 'Barre #', 'L barre (mm)', 'Coupes (mm)', 'Chute (mm)']]
    Object.entries(resultats.optim).forEach(([ref, { bars, barre }]) => {
      bars.forEach((b, i) => {
        barreRows.push([ref, i + 1, barre, b.cuts.join(' + '), b.rem])
      })
    })
    addSheet(wb, 'Mise en barre', barreRows)

    // Récap barres à commander
    const refSort = resultats.refSort || {}
    const refs = Object.keys(resultats.optim).sort((a, b) => (refSort[a] ?? 999) - (refSort[b] ?? 999))
    addSheet(wb, 'Récap débitage', [
      ['Référence', 'Barres à commander'],
      ...refs.map(ref => [ref, resultats.optim[ref].bars.length]),
    ])

    // Accessoires
    if (resultats.accessoires?.length) {
      addSheet(wb, 'Accessoires', [
        ['Référence', 'Désignation', 'Quantité', 'Unité'],
        ...resultats.accessoires.map(a => [a.ref, a.des, a.qte, a.unite]),
      ])
    }
  }

  const ref = chantier.reference_client?.replace(/[^a-zA-Z0-9]/g, '_') || `chantier-${chantier.id}`
  XLSX.writeFile(wb, `${ref}.xlsx`)
}
