export const TYPE_LABEL = {
  porte:           'Porte-fenêtre coulissante',
  fenetre:         'Fenêtre coulissante',
  ouvrant_pf:      'Ouvrant à la française',
  oscillo_battant: 'Oscillo-battant',
  fixe:            'Panneau fixe',
  basculant:       'Basculant',
}

export function typeLabel(type) {
  return TYPE_LABEL[type] || type || '—'
}
