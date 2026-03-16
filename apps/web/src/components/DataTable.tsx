type Props<T extends Record<string, string | number | boolean | null>> = {
  title: string;
  rows: T[];
};

export function DataTable<T extends Record<string, string | number | boolean | null>>({ title, rows }: Props<T>) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <section className="table-shell">
      <div className="table-header">
        <h3>{title}</h3>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column}>{String(row[column])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
