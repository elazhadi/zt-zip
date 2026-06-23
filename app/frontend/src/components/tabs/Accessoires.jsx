export default function AccessoiresTab({ accessoires }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Référence</th>
          <th>Désignation</th>
          <th className="col-right">Quantité</th>
          <th>Unité</th>
        </tr>
      </thead>
      <tbody>
        {accessoires.map((a, i) => (
          <tr key={i}>
            <td className="col-ref">{a.ref}</td>
            <td>{a.des}</td>
            <td className="col-right col-mono">{a.qte}</td>
            <td>{a.unite}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
