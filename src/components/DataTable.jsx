import React from 'react';
import LoadingIndicator from './LoadingIndicator';
import { PackageOpen } from 'lucide-react';

export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found.',
  loading = false,
  className = ''
}) {
  if (loading) {
    return (
      <div className="table-container" style={{ padding: '32px 0' }}>
        <LoadingIndicator text="Loading table data..." />
      </div>
    );
  }

  return (
    <div className={`table-container ${className}`}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  width: col.width || 'auto',
                  textAlign: col.align || 'left'
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '48px 16px' }}>
                <div className="empty-state" style={{ padding: 0 }}>
                  <PackageOpen size={40} style={{ stroke: 'var(--text-muted)', opacity: 0.6 }} />
                  <p>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const rowKey = row[keyField] || row.stockId || row.productId || rowIdx;
              return (
                <tr key={rowKey}>
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      style={{ textAlign: col.align || 'left' }}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
