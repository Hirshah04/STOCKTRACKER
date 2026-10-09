// Utility formatters

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatTimeAgo(dateStr) {
  if (!dateStr) return 'recently';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'recently';
  
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '-';
  const num = Number(amount);
  if (isNaN(num)) return '-';
  return `₹${num.toLocaleString('en-IN')}`;
}

export function formatUnit(unit) {
  if (!unit) return 'Piece';
  return unit.charAt(0).toUpperCase() + unit.slice(1);
}

export function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

export function isFutureDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return d > todayEnd;
}
