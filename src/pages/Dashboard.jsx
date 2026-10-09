import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { stockService } from '../services/stockService';
import { productService } from '../services/productService';
import { formatTimeAgo, formatUnit } from '../utils/formatters';
import LoadingIndicator from '../components/LoadingIndicator';
import {
  Boxes,
  PackageCheck,
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  TrendingDown,
  Layers,
  ArrowRight,
  X,
  CheckCircle2
} from 'lucide-react';
import './Dashboard.css';

export function Dashboard({ onNavigate }) {
  const { user, shopInfo, isOwner } = useAuth();

  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal view states
  const [activeModal, setActiveModal] = useState(null); // 'unique' | 'low' | 'minus' | null

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [prodsRes, stocksRes, actsRes] = await Promise.all([
        productService.getProducts().catch(() => ({ data: [] })),
        stockService.getStocks().catch(() => ({ data: [] })),
        stockService.getActivities({ period: 'all', sort: 'desc' }).catch(() => ({ data: [] }))
      ]);

      setProducts(prodsRes.data || []);
      setInventory(stocksRes.data || []);
      setActivities(actsRes.data || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Unique Products Count (Distinct product names across products & inventory)
  const uniqueProductsCount = useMemo(() => {
    const set = new Set();
    products.forEach(p => p.name && set.add(p.name.trim().toLowerCase()));
    inventory.forEach(i => i.name && set.add(i.name.trim().toLowerCase()));
    return set.size;
  }, [products, inventory]);

  // Available Stock Sum
  const totalStockQuantity = useMemo(() => {
    return inventory.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [inventory]);

  // Low Stock Items (lowStockAlertEnabled && quantity <= threshold, including negative)
  const lowStockItems = useMemo(() => {
    return inventory.filter(item => {
      const isAlertOn = item.lowStockAlertEnabled === true || item.lowStockAlertEnabled === 'true';
      const threshold = item.lowStockThreshold !== undefined ? Number(item.lowStockThreshold) : 5;
      return isAlertOn && Number(item.quantity) <= threshold;
    });
  }, [inventory]);

  // Minus Stock Items (quantity < 0)
  const minusStockItems = useMemo(() => {
    return inventory
      .filter(item => Number(item.quantity) < 0)
      .sort((a, b) => Number(a.quantity) - Number(b.quantity));
  }, [inventory]);

  // Unique Products Grouped by Name and Unit for Modal
  const uniqueProductsGrouped = useMemo(() => {
    const groupMap = new Map();

    inventory.forEach(item => {
      const name = (item.name || '').trim();
      const unit = (item.unit || 'piece').toLowerCase();
      const key = `${name}___${unit}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          name,
          unit,
          totalQty: 0,
          colours: new Set(),
          brands: new Set()
        });
      }

      const g = groupMap.get(key);
      g.totalQty += Number(item.quantity) || 0;
      if (item.colour && item.colour !== 'N/A') g.colours.add(item.colour);
      if (item.brandName) g.brands.add(item.brandName);
    });

    // Master products with 0 stock
    products.forEach(p => {
      const name = (p.name || '').trim();
      const exists = Array.from(groupMap.values()).some(g => g.name.toLowerCase() === name.toLowerCase());
      if (!exists) {
        groupMap.set(`${name}___piece`, {
          name,
          unit: 'piece',
          totalQty: 0,
          colours: new Set(),
          brands: new Set()
        });
      }
    });

    return Array.from(groupMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, inventory]);

  if (loading) {
    return <LoadingIndicator fullPage text="Loading dashboard statistics..." />;
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.username?.toUpperCase()}!
          </h1>
          <p className="page-subtitle">
            {shopInfo
              ? `Inventory summary for ${shopInfo.name} (${shopInfo.phone || 'Shop'})`
              : 'Inventory summary for your shop.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="page-actions">
          {isOwner && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onNavigate('products')}
            >
              <Boxes size={16} />
              <span>Add Product</span>
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('add-stock')}
            >
              <PlusCircle size={16} />
              <span>Add Stock</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => onNavigate('sell-stock')}
          >
            <TrendingDown size={16} />
            <span>Sell Stock</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="dashboard-stats-grid">
        {/* Unique Products */}
        <div
          className="stat-card clickable"
          onClick={() => setActiveModal('unique')}
          title="Click to view unique products breakdown"
        >
          <div className="stat-icon stat-icon-indigo">
            <Boxes />
          </div>
          <div className="stat-details">
            <span className="stat-label">Unique Products</span>
            <span className="stat-value">{uniqueProductsCount}</span>
          </div>
        </div>

        {/* Available Stock */}
        <div className="stat-card">
          <div className="stat-icon stat-icon-emerald">
            <PackageCheck />
          </div>
          <div className="stat-details">
            <span className="stat-label">Available Stock</span>
            <span className="stat-value">{totalStockQuantity}</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div
          className="stat-card clickable"
          onClick={() => setActiveModal('low')}
          title="Click to view low stock items"
        >
          <div className="stat-icon stat-icon-amber">
            <AlertTriangle />
          </div>
          <div className="stat-details">
            <span className="stat-label">Low Stock</span>
            <span className="stat-value" style={{ color: lowStockItems.length > 0 ? 'var(--warning)' : undefined }}>
              {lowStockItems.length}
            </span>
          </div>
        </div>

        {/* Minus Stock Items */}
        <div
          className="stat-card clickable"
          onClick={() => setActiveModal('minus')}
          title="Click to view minus stock products"
        >
          <div className="stat-icon stat-icon-rose">
            <MinusCircle />
          </div>
          <div className="stat-details">
            <span className="stat-label">Minus Stock</span>
            <span className="stat-value" style={{ color: minusStockItems.length > 0 ? 'var(--danger)' : undefined }}>
              {minusStockItems.length}
            </span>
          </div>
        </div>
      </div>

      {/* Details Grid: Low Stock Warnings & Recent Activity */}
      <div className="dashboard-details-grid">
        {/* Low Stock Alerts Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Low Stock Alerts</h3>
            <span className={`badge ${lowStockItems.length > 0 ? 'badge-warning' : 'badge-neutral'}`}>
              {lowStockItems.length} Item{lowStockItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="dashboard-alert-list">
            {lowStockItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <CheckCircle2 size={36} color="var(--success)" style={{ opacity: 0.8 }} />
                <p>All stock levels are healthy!</p>
              </div>
            ) : (
              lowStockItems.slice(0, 5).map((item, idx) => {
                const isMinus = Number(item.quantity) < 0;
                const unitText = formatUnit(item.unit);
                const threshold = item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5;
                return (
                  <div key={item.id || item.stockId || idx} className="dashboard-list-item">
                    <div className="dashboard-list-info">
                      <span className="dashboard-list-title">
                        {item.name}
                        {item.colour && item.colour !== 'N/A' && (
                          <span className="colour-pill">
                            <span className="colour-dot" />
                            {item.colour}
                          </span>
                        )}
                      </span>
                      <span className="dashboard-list-subtitle">
                        {item.category} {item.brandName ? `• ${item.brandName}` : ''}
                      </span>
                    </div>
                    <div className="dashboard-list-meta">
                      <span className={`badge ${isMinus ? 'badge-danger' : 'badge-warning'}`}>
                        {item.quantity} {unitText}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Alert at {threshold}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Activity</h3>
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '4px 10px', fontSize: '0.8125rem' }}
              onClick={() => onNavigate('transactions')}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="dashboard-activity-list">
            {activities.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <Layers size={36} color="var(--text-muted)" style={{ opacity: 0.8 }} />
                <p>No activity logged yet.</p>
              </div>
            ) : (
              activities.slice(0, 5).map((tx, idx) => {
                let badgeClass = 'badge-indigo';
                let prefix = '';
                let qtyColor = 'var(--text-primary)';

                if (tx.type === 'sell') {
                  badgeClass = 'badge-success';
                  prefix = '-';
                  qtyColor = 'var(--success)';
                } else if (tx.type === 'add' || tx.type === 'product_add') {
                  badgeClass = 'badge-indigo';
                  prefix = '+';
                  qtyColor = 'var(--primary)';
                } else if (tx.type === 'damage') {
                  badgeClass = 'badge-danger';
                  prefix = '-';
                  qtyColor = 'var(--danger)';
                }

                const unitText = formatUnit(tx.unit);

                return (
                  <div key={tx.id || tx.activityId || idx} className="dashboard-list-item">
                    <div className="dashboard-list-info">
                      <span className="dashboard-list-title">
                        {tx.itemName}
                        {tx.colour && tx.colour !== 'N/A' && (
                          <span className="colour-pill">
                            <span className="colour-dot" />
                            {tx.colour}
                          </span>
                        )}
                      </span>
                      <span className="dashboard-list-subtitle">
                        {formatTimeAgo(tx.timestamp)} by @{tx.user}
                      </span>
                    </div>
                    <div className="dashboard-list-meta">
                      <strong style={{ fontSize: '0.875rem', color: qtyColor }}>
                        {prefix}{tx.quantity} {unitText}
                      </strong>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem' }}>
                        {tx.type}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL: UNIQUE PRODUCTS SUMMARY ================= */}
      {activeModal === 'unique' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Unique Products Summary</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>
                Overview of unique products and total available stock aggregated by product name and unit.
              </p>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Available Stock</th>
                      <th>Unit</th>
                      <th>Variants / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueProductsGrouped.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      uniqueProductsGrouped.map((item, idx) => {
                        const unitText = formatUnit(item.unit);
                        const coloursStr = Array.from(item.colours).join(', ') || 'N/A';
                        const brandsStr = Array.from(item.brands).join(', ') || '-';
                        return (
                          <tr key={idx}>
                            <td><strong>{item.name}</strong></td>
                            <td>
                              <strong style={{ color: item.totalQty < 0 ? 'var(--danger)' : 'var(--success)' }}>
                                {item.totalQty} {unitText}
                              </strong>
                            </td>
                            <td><code>{unitText}</code></td>
                            <td>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                Colours: {coloursStr} | Brands: {brandsStr}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: LOW STOCK ITEMS ================= */}
      {activeModal === 'low' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Low Stock Products</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>
                Products currently at or below their configured low stock alert threshold.
              </p>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Available Stock</th>
                      <th>Alert Threshold</th>
                      <th>Colour</th>
                      <th>Brand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                          No products currently below low stock threshold.
                        </td>
                      </tr>
                    ) : (
                      lowStockItems.map((item, idx) => {
                        const unitText = formatUnit(item.unit);
                        const isMinus = Number(item.quantity) < 0;
                        const threshold = item.lowStockThreshold !== undefined ? item.lowStockThreshold : 5;
                        return (
                          <tr key={item.id || item.stockId || idx}>
                            <td>
                              <strong>{item.name}</strong>
                              {item.category && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({item.category})</span>}
                            </td>
                            <td>
                              <strong style={{ color: isMinus ? 'var(--danger)' : 'var(--warning)' }}>
                                {item.quantity} {unitText}
                              </strong>
                            </td>
                            <td><code>{threshold} {unitText}</code></td>
                            <td>
                              <span className="colour-pill">
                                <span className="colour-dot" />
                                {item.colour || 'N/A'}
                              </span>
                            </td>
                            <td>{item.brandName || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MINUS STOCK ITEMS ================= */}
      {activeModal === 'minus' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-container modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Minus Stock Products</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>
                Products currently having negative stock levels (sold more than currently recorded in stock).
              </p>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Colour</th>
                      <th>Brand</th>
                      <th>Current Negative Stock</th>
                      <th>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {minusStockItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                          No products currently in minus stock.
                        </td>
                      </tr>
                    ) : (
                      minusStockItems.map((item, idx) => {
                        const unitText = formatUnit(item.unit);
                        return (
                          <tr key={item.id || item.stockId || idx}>
                            <td>
                              <strong>{item.name}</strong>
                              {item.category && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({item.category})</span>}
                            </td>
                            <td>
                              <span className="colour-pill">
                                <span className="colour-dot" />
                                {item.colour || 'N/A'}
                              </span>
                            </td>
                            <td>{item.brandName || '-'}</td>
                            <td>
                              <strong style={{ color: 'var(--danger)' }}>
                                {item.quantity} {unitText}
                              </strong>
                            </td>
                            <td><code>{unitText}</code></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
