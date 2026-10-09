import React from 'react';
import { Search, X } from 'lucide-react';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  style = {},
  className = ''
}) {
  return (
    <div
      className={`input-with-icon ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        maxWidth: 420,
        ...style
      }}
    >
      <Search size={18} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-control"
        style={{
          paddingLeft: 38,
          paddingRight: value ? 36 : 14,
          height: 38,
          fontSize: '0.875rem'
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 10,
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
