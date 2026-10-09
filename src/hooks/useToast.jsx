import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(toast => {
          let Icon = Info;
          let iconColor = 'var(--info)';

          if (toast.type === 'success') {
            Icon = CheckCircle2;
            iconColor = 'var(--success)';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            iconColor = 'var(--warning)';
          } else if (toast.type === 'danger') {
            Icon = AlertCircle;
            iconColor = 'var(--danger)';
          }

          return (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />
              <span className="toast-message" style={{ flex: 1 }}>{toast.message}</span>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2
                }}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default useToast;
