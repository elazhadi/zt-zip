function todayStr() {
  return new Date().toLocaleDateString('fr-FR');
}

export function printFicheAtelier(results, lot, refClient = '') {
  const { debits, accessoires, stats } = results;

  const chassisBlocks = debits.map((d, idx) => {
    const c = d.chassis;
    const gammeLabel = c.gamme && c.gamme !== 'ulysse70' ? `[${c.gamme}] ` : '';
    const TYPE_LABEL = { porte:'Porte-fenêtre coulissante', fenetre:'Fenêtre coulissante', ouvrant_pf:"Ouvrant à la française", oscillo_battant:'Oscillo-battant', fixe:'Panneau fixe', basculant:'Basculant' }
    const typeLabel = TYPE_LABEL[c.type] || c.type || '—';
    const qteLabel = c.Q > 1 ? ` × ${c.Q}` : '';
    const colorLabel = c.color ? ` · ${c.color}` : '';
    const title = `${gammeLabel}${c.config} ${typeLabel} — ${c.L} × ${c.H} mm${qteLabel}${colorLabel}`;

    const rows = d.lignes.map(l => `
      <tr>
        <td class="ref">${l.ref}</td>
        <td>${l.des}</td>
        <td class="ctr">${l.coupe === 'Onglet 45°' ? '45°' : 'Droite'}</td>
        <td class="num">${l.long}</td>
        <td class="num">${l.qte}</td>
        <td class="check"></td>
      </tr>`).join('');

    return `
      <div class="chassis-block">
        <div class="chassis-title">Repère #${idx + 1} — ${title}</div>
        <table>
          <thead>
            <tr><th>Référence</th><th>Désignation</th><th>Coupe</th><th>Long. (mm)</th><th>Qté</th><th>✓</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  const accessRows = accessoires.map(a => `
    <tr>
      <td class="ref">${a.ref}</td>
      <td>${a.des}</td>
      <td class="num">${a.qte}</td>
      <td>${a.unite}</td>
      <td class="check"></td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fiche atelier${refClient ? ' — ' + refClient : ''}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 12mm 14mm; }

.header { display: flex; justify-content: space-between; align-items: flex-start;
  border-bottom: 2px solid #1e40af; padding-bottom: 6px; margin-bottom: 10px; }
.header-title { font-size: 15px; font-weight: bold; color: #1e40af; }
.header-sub  { font-size: 10px; color: #555; margin-top: 2px; }
.header-right { text-align: right; }
.header-ref  { font-size: 13px; font-weight: bold; }
.header-date { font-size: 10px; color: #555; margin-top: 2px; }

.stats-bar { display: flex; gap: 24px; background: #eff6ff; padding: 6px 10px;
  border-radius: 4px; margin-bottom: 12px; font-size: 10px; }
.stats-bar b { color: #1e40af; }

.section-title { font-size: 12px; font-weight: bold; color: #1e40af;
  margin: 14px 0 4px; border-bottom: 1px solid #bfdbfe; padding-bottom: 2px; }

.chassis-block { margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
.chassis-title { background: #1e40af; color: #fff; font-weight: bold; font-size: 11px;
  padding: 4px 8px; border-radius: 3px 3px 0 0; }

table { width: 100%; border-collapse: collapse; }
th { background: #dbeafe; font-size: 10px; font-weight: bold;
  padding: 4px 6px; text-align: left; border: 1px solid #bfdbfe; }
td { padding: 3px 6px; border: 1px solid #e5e7eb; vertical-align: middle; }
tr:nth-child(even) td { background: #f9fafb; }
td.ref   { font-family: monospace; font-size: 10px; color: #1e40af; font-weight: bold; white-space: nowrap; }
td.num   { text-align: right; font-family: monospace; }
td.ctr   { text-align: center; }
td.check { width: 22px; text-align: center; }

.footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb;
  font-size: 10px; color: #777; display: flex; justify-content: space-between; }

@media print {
  body { padding: 6mm 8mm; }
  @page { margin: 8mm; size: A4 portrait; }
}
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="header-title">FICHE DE FABRICATION — ATELIER</div>
    <div class="header-sub">Gabarys · Débitage aluminium</div>
  </div>
  <div class="header-right">
    ${refClient ? `<div class="header-ref">Réf. client : ${refClient}</div>` : ''}
    <div class="header-date">Date : ${todayStr()}</div>
  </div>
</div>

<div class="stats-bar">
  <span>Barres totales : <b>${stats.barres}</b></span>
  <span>Métré : <b>${stats.metreTotal_m} m</b></span>
  <span>Chute : <b>${stats.chuteTotale_m} m (${stats.chutePct}%)</b></span>
  <span>Châssis : <b>${lot.length}</b></span>
</div>

<div class="section-title">Coupes par châssis</div>
${chassisBlocks}

${accessoires.length > 0 ? `
<div class="section-title">Accessoires</div>
<table>
  <thead>
    <tr><th>Référence</th><th>Désignation</th><th>Qté</th><th>Unité</th><th>✓</th></tr>
  </thead>
  <tbody>${accessRows}</tbody>
</table>` : ''}

<div class="footer">
  <span>Gabarys — Généré le ${todayStr()}</span>
  <span>Date fabrication : __ / __ / ______&emsp;&emsp;Visa atelier : ___________________</span>
</div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=840,height=1000');
  if (!win) {
    alert("Fenêtre bloquée par le navigateur — autorisez les popups pour ce site.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
