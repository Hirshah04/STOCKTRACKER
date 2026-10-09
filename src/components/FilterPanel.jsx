import React, { useState, useEffect } from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';

export function FilterPanel({
  isOpen,
  onClose,
  inventory = [],
  activeFilters = {},
  onApplyFilters,
  onResetFilters
}) {
  const [staged, setStaged] = useState({
    product: 'all',
    category: 'all',
    colour: 'all',
    brand: 'all',
    unit: 'all',
    txType: 'all',
    status: 'all',
    location: 'all',
    ...activeFilters
  });

  // Sync staged filters whenever activeFilters changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setStaged({
        product: 'all',
        category: 'all',
        colour: 'all',
        brand: 'all',
        unit: 'all',
        txType: 'all',
        status: 'all',
        location: 'all',
        ...activeFilters
      });
    }
  }, [isOpen, activeFilters]);

  if (!isOpen) return null;

  // Derive unique options from actual catalog
  const products = [...new Set(inventory.map(i => i.name).filter(Boolean))].sort();
  const categories = [...new Set(inventory.map(i => i.category).filter(Boolean))].sort();
  const colours = [...new Set(inventory.map(i => i.colour).filter(Boolean))].sort();
  const brands = [...new Set(inventory.map(i => i.brandName).filter(Boolean))].sort();

  const handleChange = (field, value) => {
    setStaged(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    const emptyFilters = {
      product: 'all',
      category: 'all',
      colour: 'all',
      brand: 'all',
      unit: 'all',
      txType: 'all',
      status: 'all',
      location: 'all'
    };
    setStaged(emptyFilters);
    if (onResetFilters) {
      onResetFilters(emptyFilters);
    }
  };

  const handleApply = () => {
    onApplyFilters(staged);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Filter size={18} />
            </div>
            <h3>Filter Stock Catalog</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Product Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Product</label>
            <select
              value={staged.product}
              onChange={(e) => handleChange('product', e.target.value)}
              className="form-control"
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Category</label>
            <select
              value={staged.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="form-control"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Colour and Brand Row */}
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Colour</label>
              <select
                value={staged.colour}
                onChange={(e) => handleChange('colour', e.target.value)}
                className="form-control"
              >
                <option value="all">All Colours</option>
                {colours.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Brand</label>
              <select
                value={staged.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                className="form-control"
              >
                <option value="all">All Brands</option>
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit and Transaction Type Row */}
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Unit</label>
              <select
                value={staged.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                className="form-control"
              >
                <option value="all">All Units</option>
                <option value="piece">Piece</option>
                <option value="kg">Kg</option>
                <option value="litre">Litre</option>
                <option value="meter">Meter</option>
                <option value="set">Set</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Transaction Type</label>
              <select
                value={staged.txType}
                onChange={(e) => handleChange('txType', e.target.value)}
                className="form-control"
              >
                <option value="all">All Types</option>
                <option value="bill">Bill</option>
                <option value="challan">Challan</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          {/* Status and Location Row */}
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Stock Status</label>
              <select
                value={staged.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="form-control"
              >
                <option value="all">All Statuses</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock (≤ Threshold)</option>
                <option value="minus-stock">Minus Stock (&lt; 0)</option>
                <option value="out-of-stock">Out of Stock (= 0)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Storage Location</label>
              <select
                value={staged.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="form-control"
              >
                <option value="all">All Locations</option>
                <option value="Shop">Shop</option>
                <option value="Godown">Godown</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleReset}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={14} />
            <span>Reset Filters</span>
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApply}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilterPanel;
