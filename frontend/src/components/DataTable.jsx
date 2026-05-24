export default function DataTable({ columns, rows, onEdit, onDelete, rowKey, extraActions }) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="empty-state">
                No records found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row[rowKey]}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? "-"}</td>
                ))}
                <td className="action-cell">
                  {extraActions ? <span className="action-slot">{extraActions(row)}</span> : null}
                  <button type="button" className="ghost-button" onClick={() => onEdit(row)}>
                    Edit
                  </button>
                  <button type="button" className="danger-button" onClick={() => onDelete(row)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
