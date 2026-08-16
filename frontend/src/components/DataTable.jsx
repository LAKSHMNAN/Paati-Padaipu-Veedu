function EditIcon() {
  return (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg className="button-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function DataTable({
  columns,
  rows,
  onEdit,
  onDelete,
  rowKey,
  extraActions,
  canEditRow,
  pagination,
  onPageChange,
}) {
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
              <th key={column.key} style={column.align ? { textAlign: column.align } : undefined}>
                {column.label}
              </th>
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
                  <td key={column.key} style={column.align ? { textAlign: column.align } : undefined}>
                    {column.render ? column.render(row) : row[column.key] ?? "-"}
                  </td>
                ))}
                <td className="action-cell">
                  {extraActions ? <span className="action-slot">{extraActions(row)}</span> : null}
                  {onEdit && (canEditRow ? canEditRow(row) : true) ? (
                    <button type="button" className="ghost-button" onClick={() => onEdit(row)}>
                      <EditIcon />
                      Edit
                    </button>
                  ) : null}
                  <button type="button" className="danger-button" onClick={() => onDelete(row)}>
                    <DeleteIcon />
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
