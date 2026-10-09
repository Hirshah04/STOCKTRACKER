import React from 'react';

export function LoadingIndicator({ text = 'Loading data...', size = 32, fullPage = false }) {
  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: fullPage ? '60px 20px' : '32px 16px',
      color: 'var(--text-muted)'
    }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '3px solid var(--border-color)',
          borderTopColor: 'var(--primary)',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      {text && <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{text}</span>}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (fullPage) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        width: '100%'
      }}>
        {content}
      </div>
    );
  }

  return content;
}

export default LoadingIndicator;
