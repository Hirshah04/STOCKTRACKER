import React, { useState, useEffect } from 'react';
import { stockService } from '../services/stockService';
import { useToast } from '../hooks/useToast';
import { formatTimeAgo, formatUnit } from '../utils/formatters';
import LoadingIndicator from '../components/LoadingIndicator';
import { AlertOctagon, Check, History, AlertTriangle } from 'lucide-react';
import './DefectiveStock.css';

export function DefectiveStock({ preselectedStockId = null, onNavigate }) {
  const { showToast } = useToast();

  const [inventory, setInventory] = useState([]);
  const [damagedLogs, setDamagedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [stockId, setStockId] = useState(preselectedStockId || '');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [stocksRes, actsRes] = await Promise.all([
        stockService.getStocks(),
        stockService.getActivities({ period: 'all', sort: 'desc' })
      ]);
      setInventory(stocksRes.data || []);
      const allActs = actsRes.data || [];
      setDamagedLogs(allActs.filter(a => a.type === 'damage'));
    } catch (err) {
      showToast('Failed to load defective stock data: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedItem = inventory.find(i => (i.id || i.stockId) === stockId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stockId) {
      showToast('Please select a stock item.', 'warning');
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast('Defective quantity must be greater than 0.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await stockService.defectiveStock(stockId, {
        quantity: qtyNum,
        notes: notes.trim()
      });

      showToast(res.message || 'Defective stock reported successfully.', 'success');
      setStockId('');
      setQuantity('');
      setNotes('');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to log defective stock.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && inventory.length === 0) {
    return <LoadingIndicator fullPage text="Loading inventory records..." />;
  }

  const unitText = formatUnit(selectedItem?.unit);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertOctagon size={24} color="var(--danger)" />
            <span>Defective & Damaged Stock</span>
          </h1>
          <p className="page-subtitle">
            Log damaged, expired, or defective products to audit inventory losses.
          </p>
        </div>
      </div>

      <div className="defective-stock-layout">
        {/* Form Card */}
        <div className="defective-stock-card">
          <h3 className="card-title" style={{ marginBottom: 18 }}>Report Damaged Stock</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Select Product from Stock*</label>
              <select
                value={stockId}
                onChange={(e) => setStockId(e.target.value)}
                required
                className="form-control"
              >
                <option value="">-- Select Product Item --</option>
                {inventory.map(item => (
                  <option key={item.id || item.stockId} value={item.id || item.stockId}>
                    {item.name} {item.colour ? `(${item.colour})` : ''} - Available: {item.quantity} {formatUnit(item.unit)}
                  </option>
                ))}
              </select>
            </div>

            {selectedItem && (
              <div className="form-summary-box">
                <div className="form-summary-row">
                  <span style={{ color: 'var(--text-muted)' }}>Current Available Stock:</span>
                  <strong style={{ color: selectedItem.quantity < 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {selectedItem.quantity} {unitText}
                  </strong>
                </div>
                <div className="form-summary-row">
                  <span style={{ color: 'var(--text-muted)' }}>Storage Location:</span>
                  <span>{selectedItem.location || 'Shop'} {selectedItem.ragNumber ? `(Rag: ${selectedItem.ragNumber})` : ''}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Defective Quantity*</label>
              <div className="input-unit-wrapper">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  required
                  placeholder="Enter quantity damaged"
                  className="form-control"
                />
                <span className="input-unit-badge">{unitText}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Damage Reason / Inspection Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Torn packaging, water damage, broken seal"
                className="form-control"
              />
            </div>

            <button
              type="submit"
              className="btn btn-danger"
              style={{ width: '100%', height: 42, marginTop: 10 }}
              disabled={submitting || !stockId}
            >
              <AlertTriangle size={16} />
              <span>{submitting ? 'Recording Loss...' : 'Log Defective Stock'}</span>
            </button>
          </form>
        </div>

        {/* Recent Defective Logs Card */}
        <div className="defective-stock-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 className="card-title">Recent Defective Logs</h3>
            <span className="badge badge-danger">{damagedLogs.length} Records</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 440, overflowY: 'auto' }}>
            {damagedLogs.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <Check size={36} color="var(--success)" style={{ opacity: 0.8 }} />
                <p>No damaged stock recorded.</p>
              </div>
            ) : (
              damagedLogs.slice(0, 10).map((log, idx) => (
                <div
                  key={log.id || log.activityId || idx}
                  style={{
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {log.itemName}
                    </strong>
                    {log.colour && log.colour !== 'N/A' && (
                      <span className="colour-pill" style={{ marginLeft: 6 }}>
                        <span className="colour-dot" />
                        {log.colour}
                      </span>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatTimeAgo(log.timestamp)} by @{log.user}
                      {log.notes && ` • "${log.notes}"`}
                    </div>
                  </div>
                  <strong style={{ color: 'var(--danger)', fontSize: '0.9375rem' }}>
                    -{log.quantity} {formatUnit(log.unit)}
                  </strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DefectiveStock;
