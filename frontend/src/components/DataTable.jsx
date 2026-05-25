export default function DataTable({ columns, rows, onEdit, onDelete, rowKey, extraActions, pagination, onPageChange }) {
  const count = pagination?.count ?? rows.length;
  const limit = pagination?.limit ?? rows.length;
  const offset = pagination?.offset ?? 0;
  const firstRecord = count === 0 ? 0 : offset + 1;
  const lastRecord = Math.min(offset + rows.length, count);
  const canGoPrevious = offset > 0;
  const canGoNext = offset + limit < count;

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
      {pagination ? (
        <div className="pagination-bar">
          <span>
            Showing {firstRecord}-{lastRecord} of {count}
          </span>
          <div className="pagination-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => onPageChange(Math.max(offset - limit, 0))}
              disabled={!canGoPrevious}
            >
              Previous
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => onPageChange(offset + limit)}
              disabled={!canGoNext}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
