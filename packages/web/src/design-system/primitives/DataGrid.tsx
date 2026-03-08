/**
 * DataGrid - Dense data table for investigation data
 * Arkham-style sortable, filterable tables
 */

import React, { useState, useMemo } from 'react';
import './DataGrid.css';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  minWidth?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectedRow?: T | null;
  maxHeight?: string;
  stickyHeader?: boolean;
  compact?: boolean;
  striped?: boolean;
  className?: string;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataGrid<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  selectedRow,
  maxHeight,
  stickyHeader = true,
  compact = false,
  striped = false,
  className = ''
}: DataGridProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : 1;
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDir]);

  if (loading) {
    return (
      <div className={`data-grid data-grid--loading ${className}`}>
        <div className="data-grid__skeleton">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="data-grid__skeleton-row">
              {columns.map((col, j) => (
                <div key={j} className="skeleton" style={{ width: col.width || '100%', height: '16px' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`data-grid ${compact ? 'data-grid--compact' : ''} ${striped ? 'data-grid--striped' : ''} ${className}`}
      style={{ maxHeight }}
    >
      <table className="data-grid__table">
        <thead className={`data-grid__head ${stickyHeader ? 'data-grid__head--sticky' : ''}`}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`data-grid__th ${col.sortable ? 'data-grid__th--sortable' : ''} ${sortKey === col.key ? 'data-grid__th--active' : ''}`}
                style={{ 
                  width: col.width, 
                  minWidth: col.minWidth,
                  textAlign: col.align || 'left' 
                }}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="data-grid__th-content">
                  {col.header}
                  {col.sortable && (
                    <span className="data-grid__sort-icon">
                      {sortKey === col.key && sortDir === 'asc' && '▲'}
                      {sortKey === col.key && sortDir === 'desc' && '▼'}
                      {(sortKey !== col.key || !sortDir) && '⇅'}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody className="data-grid__body">
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-grid__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => (
              <tr
                key={String(row[keyField])}
                className={`data-grid__row ${onRowClick ? 'data-grid__row--clickable' : ''} ${selectedRow && selectedRow[keyField] === row[keyField] ? 'data-grid__row--selected' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="data-grid__td"
                    style={{ textAlign: col.align || 'left' }}
                  >
                    {col.render ? col.render(row[col.key], row, index) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataGrid;
