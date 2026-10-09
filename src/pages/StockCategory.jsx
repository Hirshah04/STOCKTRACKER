import React, { useState, useEffect, useMemo } from 'react';
import { stockService } from '../services/stockService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatUnit } from '../utils/formatters';
import { exportInventoryToCSV } from '../utils/exportCSV';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import FilterPanel from '../components/FilterPanel';
import ConfirmationModal from '../components/ConfirmationModal';
import LoadingIndicator from '../components/LoadingIndicator';
import {
  Layers,
  Filter,
  Download,
  PlusCircle,
  TrendingDown,
  AlertOctagon,
  Trash2
} from 'lucide-react';
import './StockCategory.css';

export function StockCategory({ onNavigate, onTriggerSell, onTriggerDefective }) {
  const { isOwner } = useAuth();
  const { showToast } = useToast();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Active filters
  const [filters, setFilters] = useState({
    product: 'all',
    category: 'all',
    colour: 'all',
    brand: 'all',
    unit: 'all',
    txType: 'all',
    status: 'all',
    location: 'all'
  });

  // Delete confirmation
  const [deleteItem, setDeleteItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res = await stockService.getStocks();
      setInventory(res.data || []);
    } catch (err) {
      showToast('Failed to load inventory: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Filter logic implementing multi-condition AND matching
  const filteredInventory = useMemo(() => {
    const q = search.toLowerCase().trim();

    return inventory.filter(item => {
      const nameStr = (item.name || '').toLowerCase();
      const catStr = (item.category || '').toLowerCase();
      const colStr = (item.colour || '').toLowerCase();
      const brandStr = (item.brandName || '').toLowerCase();

      const matchesSearch = !q ||
        nameStr.includes(q) ||
        catStr.includes(q) ||
        colStr.includes(q) ||
        brandStr.includes(q);

      const matchesProduct = filters.product === 'all' ||
        (item.productId || item.id) === filters.product ||
        item.name === filters.product;

      const matchesCategory = filters.category === 'all' || item.category === filters.category;
      const matchesColour = filters.colour === 'all' || (item.colour && item.colour.toLowerCase() === filters.colour.toLowerCase());
      const matchesBrand = filters.brand === 'all' || (item.brandName && item.brandName.toLowerCase() === filters.brand.toLowerCase());
      const matchesUnit = filters.unit === 'all' || (item.unit && item.unit.toLowerCase() === filters.unit.toLowerCase());
      const matchesLocation = filters.location === 'all' || (item.location || 'Shop') === filters.location;
      const matchesTxType = filters.txType === 'all' || (item.transactionType && item.transactionType.toLowerCase() === filters.txType.toLowerCase());

      let matchesStatus = true;
      const qty = Number(item.quantity);
      const threshold = item.lowStockThreshold !== undefined ? Number(item.lowStockThreshold) : 5;

      if (filters.status === 'in-stock') {
        matchesStatus = qty > threshold;
      } else if (filters.status === 'low-stock') {
        const isAlertOn = item.lowStockAlertEnabled === true || item.lowStockAlertEnabled === 'true';
        matchesStatus = isAlertOn && qty <= threshold;
      } else if (filters.status === 'minus-stock') {
        matchesStatus = qty < 0;
      } else if (filters.status === 'out-of-stock') {
        matchesStatus = qty === 0;
      }

      return matchesSearch && matchesProduct && matchesCategory && matchesColour && matchesBrand && matchesUnit && matchesLocation && matchesTxType && matchesStatus;
    });
  }, [inventory, search, filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== 'all').length;
  }, [filters]);

  // Handle Export CSV
  const handleExportCSV = () => {
    try {
      exportInventoryToCSV(filteredInventory);
      showToast('Inventory catalog CSV exported successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'warning');
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    const id = deleteItem.id || deleteItem.stockId;

    try {
      await stockService.deleteStock(id);
      showToast(`"${deleteItem.name}" deleted from catalog.`, 'info');
      setDeleteItem(null);
      await loadInventory();
    } catch (err) {
      showToast('Failed to delete item: ' + err.message, 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Product Name',
      key: 'name',
      render: (row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong className="product-name-highlight">{row.name}</strong>
            {row.brandName && <span className="badge badge-indigo" style={{ fontSize: '0.6875rem' }}>{row.brandName}</span>}
          </div>
          <div className="storage-location-row">
            <span className="storage-location-badge">{row.location || 'Shop'}</span>
            {row.ragNumber && <span className="storage-rag-badge">Rag: {row.ragNumber}</span>}
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      key: 'category',
      render: (row) => <span style={{ color: 'var(--text-secondary)' }}>{row.category}</span>
    },
    {
      header: 'Colour',
      key: 'colour',
      render: (row) => (
        <span className="colour-pill">
          <span className="colour-dot" />
          {row.colour || 'N/A'}
        </span>
      )
    },
    {
      header: 'Quantity & Unit',
      key: 'quantity',
      render: (row) => {
        const qty = Number(row.quantity);
        const isMinus = qty < 0;
        return (
          <strong style={{ color: isMinus ? 'var(--danger)' : 'var(--text-primary)' }}>
            {row.quantity} {formatUnit(row.unit)}
          </strong>
        );
      }
    },
    {
      header: 'Price',
      key: 'price',
      render: (row) => <strong>{formatCurrency(row.price)}</strong>
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => {
        const qty = Number(row.quantity);
        const threshold = row.lowStockThreshold !== undefined ? Number(row.lowStockThreshold) : 5;
        const isAlertOn = row.lowStockAlertEnabled === true || row.lowStockAlertEnabled === 'true';

        if (qty < 0) {
          return <span className="badge badge-minus-stock">Minus Stock</span>;
        } else if (qty === 0) {
          return <span className="badge badge-minus-stock">Out of Stock</span>;
        } else if (isAlertOn && qty <= threshold) {
          return <span className="badge badge-low-stock">Low Stock</span>;
        } else {
          return <span className="badge badge-in-stock">In Stock</span>;
        }
      }
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="table-actions">
          <button
            type="button"
            className="btn-table-action text-primary"
            title="Sell Stock"
            onClick={() => onTriggerSell ? onTriggerSell(row.productId || row.id) : onNavigate('sell-stock')}
          >
            <TrendingDown size={15} />
          </button>
          <button
            type="button"
            className="btn-table-action"
            title="Report Defective"
            onClick={() => onTriggerDefective ? onTriggerDefective(row.id || row.stockId) : onNavigate('defective-stock')}
          >
            <AlertOctagon size={15} />
          </button>
          {isOwner && (
            <button
              type="button"
              className="btn-table-action text-danger"
              title="Delete Record"
              onClick={() => setDeleteItem(row)}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      )
    }
  ];

  if (loading && inventory.length === 0) {
    return <LoadingIndicator fullPage text="Loading stock catalog..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Catalog</h1>
          <p className="page-subtitle">
            Comprehensive inventory ledger, real-time stock levels, and unit tracking.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportCSV}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

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
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="catalog-controls-bar">
        <div className="catalog-search-filters">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search stock by product, category, colour, or brand..."
          />
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setIsFilterPanelOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}
          >
            <Filter size={16} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="badge badge-indigo" style={{ padding: '1px 6px', fontSize: '0.7rem' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="catalog-meta-bar">
        Showing: {filteredInventory.length} matching product{filteredInventory.length !== 1 ? 's' : ''} (from {inventory.length} total)
      </div>

      <DataTable
        columns={columns}
        data={filteredInventory}
        keyField="id"
        emptyMessage="No stock items match your search or filters."
        loading={loading}
      />

      {/* Filter Modal Panel */}
      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        inventory={inventory}
        activeFilters={filters}
        onApplyFilters={setFilters}
        onResetFilters={setFilters}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteItem)}
        title="Delete Stock Record"
        message={`Are you sure you want to permanently delete "${deleteItem?.name}" (${deleteItem?.colour || 'Standard'}) from the catalog? This action cannot be undone.`}
        confirmText="Delete Record"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteItem(null)}
      />
    </div>
  );
}

export default StockCategory;
