import React, { useState, useEffect } from 'react';
import { stockService } from '../services/stockService';
import { productService } from '../services/productService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getTodayString, isFutureDate } from '../utils/formatters';
import LoadingIndicator from '../components/LoadingIndicator';
import { PlusCircle, ArrowLeft, Check, Layers, AlertCircle } from 'lucide-react';
import './AddStock.css';

export function AddStock({ onNavigate }) {
  const { isOwner } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [productId, setProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [colour, setColour] = useState('');
  const [customColour, setCustomColour] = useState('');
  const [unit, setUnit] = useState('piece');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [brandName, setBrandName] = useState('');
  const [buyDate, setBuyDate] = useState(getTodayString());
  const [transactionType, setTransactionType] = useState('');
  const [billNo, setBillNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [location, setLocation] = useState('Shop');
  const [ragNumber, setRagNumber] = useState('');
  const [lowStockAlertEnabled, setLowStockAlertEnabled] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  useEffect(() => {
    const fetchProducts = async () => {
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
    fetchProducts();
  }, [showToast]);

  const handleProductChange = (e) => {
    const id = e.target.value;
    setProductId(id);
    const prod = products.find(p => (p.id || p.productId) === id);
    setSelectedProduct(prod || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOwner) {
      showToast('Staff accounts are not authorized to add stock.', 'danger');
      return;
    }

    if (!productId) {
      showToast('Please select a product from the list.', 'warning');
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast('Quantity must be a positive number greater than 0.', 'warning');
      return;
    }

    if (buyDate && isFutureDate(buyDate)) {
      showToast('Buy Date cannot be in the future.', 'danger');
      return;
    }

    let finalColour = colour;
    let customCol = '';
    if (colour === 'Other') {
      customCol = customColour.trim();
      finalColour = customCol || 'Other';
    }

    setSubmitting(true);
    try {
      const res = await stockService.addStock({
        productId,
        colour: finalColour,
        customColour: customCol,
        quantity: qtyNum,
        unit: unit.toLowerCase(),
        price: price !== '' ? parseFloat(price) : null,
        brandName: brandName.trim(),
        buyDate: buyDate || undefined,
        transactionType: transactionType || undefined,
        billNo: billNo.trim() || undefined,
        challanNo: challanNo.trim() || undefined,
        location,
        ragNumber: ragNumber.trim() || undefined,
        lowStockAlertEnabled,
        lowStockThreshold: Number(lowStockThreshold) || 10
      });

      showToast(res.message || 'Stock added successfully!', 'success');

      // Reset form
      setProductId('');
      setSelectedProduct(null);
      setColour('');
      setCustomColour('');
      setQuantity('');
      setPrice('');
      setBrandName('');
      setBillNo('');
      setChallanNo('');
      setRagNumber('');
      setLowStockAlertEnabled(false);

      if (onNavigate) {
        onNavigate('inventory');
      }
    } catch (err) {
      showToast(err.message || 'Failed to add stock.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator fullPage text="Loading master products..." />;
  }

  return (
    <div className="page-container">
      <div className="add-stock-container">
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '6px 12px' }}
            onClick={() => onNavigate && onNavigate('inventory')}
          >
            <ArrowLeft size={16} />
            <span>Back to Stock Catalog</span>
          </button>
        </div>

        <div className="add-stock-card">
          <div className="add-stock-card-header">
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <PlusCircle size={24} color="var(--primary)" />
              <span>Add Stock / Replenish Inventory</span>
            </h1>
            <p className="page-subtitle">
              Record new deliveries and replenish inventory levels.
            </p>
          </div>

          {!isOwner ? (
            <div className="form-summary-box" style={{ borderColor: 'var(--danger-border)', backgroundColor: 'var(--danger-bg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--danger)' }}>
                <AlertCircle size={20} />
                <strong>Access Restricted: Only shop owners can add stock records.</strong>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Product Info Section */}
              <div className="add-stock-form-section">
                <div className="add-stock-section-title">1. Product Information</div>

                <div className="form-group">
                  <label>Product Name*</label>
                  <select
                    value={productId}
                    onChange={handleProductChange}
                    required
                    className="form-control"
                  >
                    <option value="">-- Select Master Product --</option>
                    {products.map(p => (
                      <option key={p.id || p.productId} value={p.id || p.productId}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                  </select>
                  {products.length === 0 && (
                    <span className="form-help" style={{ color: 'var(--warning)' }}>
                      No master products found. Please add a product in Products Master first.
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    value={selectedProduct?.category || ''}
                    readOnly
                    placeholder="Auto-filled from selected product"
                    className="input-readonly"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Colour (Optional)</label>
                    <select
                      value={colour}
                      onChange={(e) => setColour(e.target.value)}
                      className="form-control"
                    >
                      <option value="">Select Colour</option>
                      <option value="Red">Red</option>
                      <option value="Blue">Blue</option>
                      <option value="Black">Black</option>
                      <option value="White">White</option>
                      <option value="Green">Green</option>
                      <option value="Yellow">Yellow</option>
                      <option value="Other">Other</option>
                    </select>

                    {colour === 'Other' && (
                      <div style={{ marginTop: 10 }}>
                        <input
                          type="text"
                          value={customColour}
                          onChange={(e) => setCustomColour(e.target.value)}
                          placeholder="e.g. Navy Blue, Dark Orange"
                          className="form-control"
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Unit*</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      required
                      className="form-control"
                    >
                      <option value="piece">Piece</option>
                      <option value="kg">Kg</option>
                      <option value="litre">Litre</option>
                      <option value="meter">Meter</option>
                      <option value="set">Set</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quantity and Pricing Section */}
              <div className="add-stock-form-section">
                <div className="add-stock-section-title">2. Quantity & Pricing</div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity to Add*</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      min="1"
                      required
                      placeholder="e.g. 50"
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Cost / Selling Price (₹) (Optional)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min="0"
                      step="any"
                      placeholder="e.g. 450"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Brand Name (Optional)</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. Raymond, Nike"
                      className="form-control"
                    />
                  </div>

                  <div className="form-group">
                    <label>Buy Date (Optional)</label>
                    <input
                      type="date"
                      value={buyDate}
                      max={getTodayString()}
                      onChange={(e) => setBuyDate(e.target.value)}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              {/* Transaction & Storage Details */}
              <div className="add-stock-form-section">
                <div className="add-stock-section-title">3. Transaction & Location</div>

                <div className="form-group">
                  <label>Transaction Type (Optional)</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="form-control"
                  >
                    <option value="">-- None --</option>
                    <option value="bill">Bill</option>
                    <option value="challan">Challan</option>
                    <option value="cash">Cash</option>
                  </select>

                  {transactionType === 'bill' && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        type="text"
                        value={billNo}
                        onChange={(e) => setBillNo(e.target.value)}
                        placeholder="Enter Bill Number (e.g. INV-1002)"
                        className="form-control"
                      />
                    </div>
                  )}

                  {transactionType === 'challan' && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        type="text"
                        value={challanNo}
                        onChange={(e) => setChallanNo(e.target.value)}
                        placeholder="Enter Challan Number (e.g. CH-908)"
                        className="form-control"
                      />
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Storage Location</label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="form-control"
                    >
                      <option value="Shop">Shop</option>
                      <option value="Godown">Godown</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Rack / Rag Number (Optional)</label>
                    <input
                      type="text"
                      value={ragNumber}
                      onChange={(e) => setRagNumber(e.target.value)}
                      placeholder="e.g. Rack A-12"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Enable Low Stock Alert?</label>
                    <select
                      value={lowStockAlertEnabled ? 'true' : 'false'}
                      onChange={(e) => setLowStockAlertEnabled(e.target.value === 'true')}
                      className="form-control"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>

                  {lowStockAlertEnabled && (
                    <div className="form-group">
                      <label>Low Stock Alert Threshold</label>
                      <input
                        type="number"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value)}
                        min="0"
                        placeholder="e.g. 10"
                        className="form-control"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => onNavigate && onNavigate('inventory')}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  <Check size={16} />
                  <span>{submitting ? 'Adding Stock...' : 'Save & Add Stock'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddStock;
