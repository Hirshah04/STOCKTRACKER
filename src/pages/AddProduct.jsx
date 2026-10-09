import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/formatters';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import LoadingIndicator from '../components/LoadingIndicator';
import { Boxes, Plus, X, Tag, PackagePlus } from 'lucide-react';
import './AddProduct.css';

export function AddProduct() {
  const { isOwner } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await productService.getProducts();
      setProducts(res.data || []);
    } catch (err) {
      showToast('Failed to load products: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) {
      showToast('Product name and category are required.', 'warning');
      return;
    }

    if (!isOwner) {
      showToast('Forbidden: Staff accounts are not authorized to create products.', 'danger');
      return;
    }

    setSubmitting(true);
    try {
      const res = await productService.createProduct({
        name: name.trim(),
        category: category.trim()
      });
      showToast(res.message || `Product "${name}" added to master list!`, 'success');
      setName('');
      setCategory('');
      setIsModalOpen(false);
      await loadProducts();
    } catch (err) {
      showToast(err.message || 'Failed to add product.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered products
  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
  });

  const columns = [
    {
      header: 'Product Name',
      key: 'name',
      render: (row) => <strong style={{ color: 'var(--text-primary)' }}>{row.name}</strong>
    },
    {
      header: 'Category',
      key: 'category',
      render: (row) => <span className="badge badge-indigo">{row.category}</span>
    },
    {
      header: 'Created By',
      key: 'createdBy',
      render: (row) => <code>@{row.createdBy || 'system'}</code>
    },
    {
      header: 'Date Added',
      key: 'createdAt',
      render: (row) => <span style={{ color: 'var(--text-muted)' }}>{formatDate(row.createdAt)}</span>
    }
  ];

  if (loading && products.length === 0) {
    return <LoadingIndicator fullPage text="Loading master products..." />;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products Master List</h1>
          <p className="page-subtitle">
            Maintain catalog definitions and categories for stock management.
          </p>
        </div>

        {isOwner && (
          <div className="page-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} />
              <span>Add New Product</span>
            </button>
          </div>
        )}
      </div>

      <div className="products-controls-bar">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search products by name or category..."
        />
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Total Master Products: {products.length}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        keyField="id"
        emptyMessage="No products created yet. Click 'Add New Product' to begin."
        loading={loading}
      />

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
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
                  <PackagePlus size={18} />
                </div>
                <h3>Add New Product</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct}>
              <div className="modal-body">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 16 }}>
                  Create a master product record. Master products can subsequently be selected when adding stock.
                </p>

                <div className="form-group">
                  <label>Product Name*</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cotton, Polyester, Silk, Shoes, Wheat Flour"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Category*</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Fabric, Apparel, Footwear, Groceries"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddProduct;
