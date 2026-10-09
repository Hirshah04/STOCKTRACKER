import React, { useState, useEffect, useMemo } from 'react';
import { stockService } from '../services/stockService';
import { productService } from '../services/productService';
import { useToast } from '../hooks/useToast';
import { getTodayString, isFutureDate, formatUnit } from '../utils/formatters';
import LoadingIndicator from '../components/LoadingIndicator';
import { TrendingDown, ArrowLeft, Check, Sparkles, AlertCircle } from 'lucide-react';
import './SellStock.css';

export function SellStock({ onNavigate, preselectedProductId = null }) {
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form selections
  const [selectedProductId, setSelectedProductId] = useState('');
  const [colour, setColour] = useState('');
  const [brand, setBrand] = useState('');
  const [sellQty, setSellQty] = useState('');
  const [price, setPrice] = useState('');
  const [saleDate, setSaleDate] = useState(getTodayString());
  const [txType, setTxType] = useState('');
  const [billNo, setBillNo] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [notes, setNotes] = useState('');

  // Load product catalog and current stock
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [prodsRes, stocksRes] = await Promise.all([
          productService.getProducts().catch(() => ({ data: [] })),
          stockService.getStocks().catch(() => ({ data: [] }))
        ]);
        setProducts(prodsRes.data || []);
        setInventory(stocksRes.data || []);
      } catch (err) {
        showToast('Failed to load stock data: ' + err.message, 'danger');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [showToast]);

  // Aggregate distinct products
  const productOptions = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      const id = p.id || p.productId;
      map.set(id, { id, name: p.name, category: p.category });
    });
    inventory.forEach(i => {
      const id = i.productId || i.id;
      if (!map.has(id)) {
        map.set(id, { id, name: i.name, category: i.category });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, inventory]);

  // Handle preselected product
  useEffect(() => {
    if (preselectedProductId && productOptions.some(p => p.id === preselectedProductId)) {
      setSelectedProductId(preselectedProductId);
    }
  }, [preselectedProductId, productOptions]);

  // Stocks matching selected product
  const matchingStocksForProduct = useMemo(() => {
    if (!selectedProductId) return [];
    return inventory.filter(i =>
      (i.productId || i.id) === selectedProductId ||
      (i.name && i.name.toLowerCase() === selectedProductId.toLowerCase())
    );
  }, [selectedProductId, inventory]);

  // Distinct colours available for selected product
  const distinctColours = useMemo(() => {
    return [...new Set(matchingStocksForProduct.map(i => (i.colour || '').trim()).filter(Boolean))];
  }, [matchingStocksForProduct]);

  // Cascading colour auto-selection
  useEffect(() => {
    if (!selectedProductId) {
      setColour('');
      return;
    }
    if (distinctColours.length === 1) {
      setColour(distinctColours[0]);
    } else if (!distinctColours.includes(colour)) {
      setColour('');
    }
  }, [selectedProductId, distinctColours]);

  // Stocks matching product AND colour
  const matchingStocksForColour = useMemo(() => {
    if (!selectedProductId) return [];
    return matchingStocksForProduct.filter(i => {
      if (!colour) return true;
      return (i.colour || '').toLowerCase() === colour.toLowerCase();
    });
  }, [selectedProductId, matchingStocksForProduct, colour]);

  // Distinct brands available for selected product & colour
  const distinctBrands = useMemo(() => {
    return [...new Set(matchingStocksForColour.map(i => (i.brandName || '').trim()).filter(Boolean))];
  }, [matchingStocksForColour]);

  // Cascading brand auto-selection
  useEffect(() => {
    if (!selectedProductId) {
      setBrand('');
      return;
    }
    if (distinctBrands.length === 1) {
      setBrand(distinctBrands[0]);
    } else if (!distinctBrands.includes(brand)) {
      setBrand('');
    }
  }, [selectedProductId, distinctBrands]);

  // Exact target stock record
  const targetStockItem = useMemo(() => {
    if (!selectedProductId) return null;
    return matchingStocksForColour.find(i => {
      if (!brand) return true;
      return (i.brandName || '').toLowerCase() === brand.toLowerCase();
    }) || matchingStocksForProduct[0] || null;
  }, [selectedProductId, matchingStocksForColour, matchingStocksForProduct, brand]);

  const availableQuantity = targetStockItem ? Number(targetStockItem.quantity) : 0;
  const unit = targetStockItem?.unit || 'piece';
  const unitDisplay = formatUnit(unit);

  // Live resulting stock calculation preview
  const numSellQty = parseInt(sellQty, 10) || 0;
  const resultingStock = availableQuantity - numSellQty;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedProductId) {
      showToast('Please select a product first.', 'warning');
      return;
    }

    if (numSellQty <= 0) {
      showToast('Selling quantity must be a positive number greater than 0.', 'warning');
      return;
    }

    if (saleDate && isFutureDate(saleDate)) {
      showToast('Sale Date cannot be in the future.', 'danger');
      return;
    }

    if (!targetStockItem) {
      showToast('No stock record found for the selected combination.', 'warning');
      return;
    }

    const stockId = targetStockItem.id || targetStockItem.stockId;

    setSubmitting(true);
    try {
      const res = await stockService.sellStock(stockId, {
        quantity: numSellQty,
        price: price !== '' ? parseFloat(price) : null,
        saleDate: saleDate || undefined,
        brandName: brand || undefined,
        colour: colour || undefined,
        transactionType: txType || undefined,
        billNo: billNo.trim() || undefined,
        challanNo: challanNo.trim() || undefined,
        notes: notes.trim() || undefined
      });

      showToast(res.message || 'Sale recorded successfully!', 'success');

      // Reset
      setSelectedProductId('');
      setColour('');
      setBrand('');
      setSellQty('');
      setPrice('');
      setBillNo('');
      setChallanNo('');
      setNotes('');

      if (onNavigate) {
        onNavigate('inventory');
      }
    } catch (err) {
      showToast(err.message || 'Failed to record sale.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator fullPage text="Loading inventory for sales..." />;
  }

  const selectedProductObj = productOptions.find(p => p.id === selectedProductId);

  return (
    <div className="page-container">
      <div className="sell-stock-container">
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

        <div className="sell-stock-card">
          <div className="sell-stock-card-header">
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingDown size={24} color="var(--primary)" />
              <span>Sell Stock</span>
            </h1>
            <p className="page-subtitle">
              Record customer sales. Negative stock levels are supported for counter sales.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Product Selection Dropdown (Empty by default) */}
            <div className="form-group">
              <label>Select Product*</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
                className="form-control"
              >
                <option value="">-- Select Product --</option>
                {productOptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Cascading Colour Selection */}
            {selectedProductId && distinctColours.length > 0 && (
              <div className="form-group">
                <label>
                  <span>Colour</span>
                  {distinctColours.length === 1 && (
                    <span className="badge badge-indigo" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Sparkles size={11} />
                      Auto-Selected: {colour}
                    </span>
                  )}
                </label>
                {distinctColours.length > 1 ? (
                  <select
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="form-control"
                  >
                    <option value="">-- Select Colour --</option>
                    {distinctColours.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={colour}
                    readOnly
                    className="input-readonly"
                  />
                )}
              </div>
            )}

            {/* Step 3: Cascading Brand Selection */}
            {selectedProductId && distinctBrands.length > 0 && (
              <div className="form-group">
                <label>
                  <span>Brand</span>
                  {distinctBrands.length === 1 && (
                    <span className="badge badge-indigo" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Sparkles size={11} />
                      Auto-Selected: {brand}
                    </span>
                  )}
                </label>
                {distinctBrands.length > 1 ? (
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="form-control"
                  >
                    <option value="">-- Select Brand --</option>
                    {distinctBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={brand}
                    readOnly
                    className="input-readonly"
                  />
                )}
              </div>
            )}

            {/* Step 4: Available Stock Summary Card */}
            {selectedProductId && (
              <div className="sell-summary-banner">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Available Stock
                    </span>
                    <div style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: availableQuantity < 0 ? 'var(--danger)' : availableQuantity === 0 ? 'var(--warning)' : 'var(--success)',
                      marginTop: 2
                    }}>
                      {availableQuantity} {unitDisplay}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Category
                    </span>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                      {selectedProductObj?.category || targetStockItem?.category || '-'}
                    </div>
                  </div>

                  {targetStockItem?.location && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        Location
                      </span>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {targetStockItem.location} {targetStockItem.ragNumber ? `(Rag: ${targetStockItem.ragNumber})` : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Quantity & Live Resulting Stock */}
            <div className="form-group">
              <label>Sell Quantity*</label>
              <div className="input-unit-wrapper">
                <input
                  type="number"
                  value={sellQty}
                  onChange={(e) => setSellQty(e.target.value)}
                  min="1"
                  required
                  placeholder="Enter quantity to sell"
                  className="form-control"
                />
                <span className="input-unit-badge">{unitDisplay}</span>
              </div>
            </div>

            {/* Live Calculation Preview */}
            {selectedProductId && (
              <div className="sell-preview-banner">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Resulting stock after sale:
                </span>
                <strong style={{
                  fontSize: '1rem',
                  fontFamily: 'var(--font-heading)',
                  color: resultingStock < 0 ? 'var(--danger)' : 'var(--success)'
                }}>
                  {resultingStock} {unitDisplay} {resultingStock < 0 ? ' (Minus Stock)' : ''}
                </strong>
              </div>
            )}

            {/* Step 6: Pricing and Date */}
            <div className="form-row" style={{ marginTop: 18 }}>
              <div className="form-group">
                <label>Selling Price (₹) (Optional)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="any"
                  placeholder="e.g. 500"
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>Sale Date (Optional)</label>
                <input
                  type="date"
                  value={saleDate}
                  max={getTodayString()}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="form-control"
                />
              </div>
            </div>

            {/* Step 7: Transaction Type */}
            <div className="form-group">
              <label>Transaction Type (Optional)</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="form-control"
              >
                <option value="">-- None --</option>
                <option value="bill">Bill</option>
                <option value="challan">Challan</option>
                <option value="cash">Cash</option>
              </select>

              {txType === 'bill' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    type="text"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
                    placeholder="Enter Bill Number (e.g. INV-2005)"
                    className="form-control"
                  />
                </div>
              )}

              {txType === 'challan' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    type="text"
                    value={challanNo}
                    onChange={(e) => setChallanNo(e.target.value)}
                    placeholder="Enter Challan Number (e.g. CH-4011)"
                    className="form-control"
                  />
                </div>
              )}
            </div>

            {/* Step 8: Notes */}
            <div className="form-group">
              <label>Notes / Reason (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Counter sale, regular customer"
                className="form-control"
              />
            </div>

            {/* Submit */}
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
                disabled={submitting || !selectedProductId}
              >
                <Check size={16} />
                <span>{submitting ? 'Recording Sale...' : 'Complete Sale'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SellStock;
