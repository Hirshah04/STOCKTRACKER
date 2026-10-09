import React, { useState, useEffect, useMemo } from 'react';
import { stockService } from '../services/stockService';
import { useToast } from '../hooks/useToast';
import { formatDateTime, formatUnit, getTodayString } from '../utils/formatters';
import DataTable from '../components/DataTable';
import SearchBar from '../components/SearchBar';
import LoadingIndicator from '../components/LoadingIndicator';
import {
  ClipboardList,
  ArrowUpDown,
  Calendar,
  X
} from 'lucide-react';
import './ActivityLog.css';

export function ActivityLog() {
  const { showToast } = useToast();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [period, setPeriod] = useState('all'); // 'all' | 'day' | 'week' | 'month' | 'year'
  const [selectedDate, setSelectedDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [activityType, setActivityType] = useState('all');
  const [search, setSearch] = useState('');

  const loadActivities = async () => {
    try {
      setLoading(true);
      const res = await stockService.getActivities({
        period,
        date: selectedDate,
        sort: sortOrder
      });
      setActivities(res.data || []);
    } catch (err) {
      showToast('Failed to load activity logs: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [period, selectedDate, sortOrder]);

  const handlePeriodChange = (p) => {
    setPeriod(p);
    setSelectedDate('');
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setSelectedDate(val);
    if (val) {
      setPeriod('all');
    }
  };

  const handleClearDate = () => {
    setSelectedDate('');
    setPeriod('all');
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // Client-side search and type filtering
  const filteredActivities = useMemo(() => {
    const q = search.toLowerCase().trim();

    return activities.filter(tx => {
      const nameStr = (tx.itemName || '').toLowerCase();
      const colStr = (tx.colour || '').toLowerCase();
      const userStr = (tx.user || '').toLowerCase();
      const notesStr = (tx.notes || '').toLowerCase();
      const billStr = (tx.billNo || '').toLowerCase();
      const challanStr = (tx.challanNo || '').toLowerCase();
      const brandStr = (tx.brandName || '').toLowerCase();

      const matchesSearch = !q ||
        nameStr.includes(q) ||
        colStr.includes(q) ||
        userStr.includes(q) ||
        notesStr.includes(q) ||
        billStr.includes(q) ||
        challanStr.includes(q) ||
        brandStr.includes(q);

      const matchesType = activityType === 'all' || tx.type === activityType;

      return matchesSearch && matchesType;
    });
  }, [activities, search, activityType]);

  const columns = [
    {
      header: 'Timestamp',
      key: 'timestamp',
      width: '160px',
      render: (row) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          {formatDateTime(row.timestamp)}
        </span>
      )
    },
    {
      header: 'Product & Colour',
      key: 'itemName',
      render: (row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{row.itemName}</strong>
            {row.brandName && (
              <span className="badge badge-indigo" style={{ fontSize: '0.6875rem' }}>
                {row.brandName}
              </span>
            )}
            <span className="colour-pill">
              <span className="colour-dot" />
              {row.colour || 'N/A'}
            </span>
          </div>
          {row.notes && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Note: {row.notes}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Activity Type',
      key: 'type',
      width: '130px',
      render: (row) => {
        let badgeClass = 'badge-indigo';
        if (row.type === 'sell') badgeClass = 'badge-success';
        else if (row.type === 'damage') badgeClass = 'badge-danger';
        return <span className={`badge ${badgeClass}`}>{row.type}</span>;
      }
    },
    {
      header: 'Tx Info / Ref',
      key: 'transactionType',
      render: (row) => {
        let refStr = '';
        if (row.transactionType === 'bill' && row.billNo) refStr = ` (${row.billNo})`;
        else if (row.transactionType === 'challan' && row.challanNo) refStr = ` (${row.challanNo})`;

        return (
          <div>
            {row.transactionType ? (
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
                Type: {row.transactionType.toUpperCase()}{refStr}
              </div>
            ) : null}
            {row.price !== null && row.price !== undefined && row.price !== '' ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Price: ₹{row.price}
              </div>
            ) : null}
            {!row.transactionType && (row.price === null || row.price === undefined || row.price === '') && (
              <span style={{ color: 'var(--text-muted)' }}>-</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Quantity Changed',
      key: 'quantity',
      render: (row) => {
        let prefix = '';
        let color = 'var(--text-primary)';
        if (row.type === 'sell') {
          prefix = '-';
          color = 'var(--success)';
        } else if (row.type === 'add' || row.type === 'product_add') {
          prefix = '+';
          color = 'var(--primary)';
        } else if (row.type === 'damage') {
          prefix = '-';
          color = 'var(--danger)';
        }

        return (
          <strong style={{ color }}>
            {prefix}{row.quantity} {formatUnit(row.unit)}
          </strong>
        );
      }
    },
    {
      header: 'Logged By',
      key: 'user',
      width: '120px',
      render: (row) => <code>@{row.user}</code>
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">
            Comprehensive immutable audit trail of all inventory additions, counter sales, and damages.
          </p>
        </div>
      </div>

      {/* Top Period Filters & Sort Controls */}
      <div className="activity-controls-bar">
        {/* Period Buttons */}
        <div className="period-filters">
          {['all', 'day', 'week', 'month', 'year'].map(p => (
            <button
              key={p}
              type="button"
              className={`period-btn ${period === p && !selectedDate ? 'active' : ''}`}
              onClick={() => handlePeriodChange(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Date Picker Filter */}
        <div className="date-picker-box">
          <label htmlFor="activity-date-filter">Filter by Date:</label>
          <input
            id="activity-date-filter"
            type="date"
            value={selectedDate}
            max={getTodayString()}
            onChange={handleDateChange}
            className="form-control"
            style={{ width: 160, height: 36, padding: '4px 10px', fontSize: '0.8125rem' }}
          />
          {selectedDate && (
            <button
              type="button"
              className="btn-icon"
              title="Clear Date"
              onClick={handleClearDate}
              style={{ width: 34, height: 34 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort Order Toggle */}
        <button
          type="button"
          className="btn btn-outline"
          onClick={toggleSortOrder}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36 }}
        >
          <ArrowUpDown size={15} />
          <span>{sortOrder === 'desc' ? 'Newest → Oldest' : 'Oldest → Newest'}</span>
        </button>
      </div>

      {/* Search and Activity Type Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search logs by product, colour, user, bill/challan, or notes..."
        />

        <div style={{ minWidth: 200 }}>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="form-control"
            style={{ height: 38, fontSize: '0.875rem' }}
          >
            <option value="all">All Activities</option>
            <option value="product_add">Product Added</option>
            <option value="add">Stock Added</option>
            <option value="sell">Stock Sold</option>
            <option value="damage">Stock Marked Defective</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredActivities}
        keyField="id"
        emptyMessage="No activity records found matching the selected period and filters."
        loading={loading}
      />
    </div>
  );
}

export default ActivityLog;
