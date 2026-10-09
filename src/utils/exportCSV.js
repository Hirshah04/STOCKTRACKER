// CSV Exporter for Stock Inventory Catalog

export function exportInventoryToCSV(inventory = []) {
  if (!inventory || inventory.length === 0) {
    throw new Error('No products in catalog to export.');
  }

  const headers = [
    'Product ID',
    'Product Name',
    'Category',
    'Colour',
    'Quantity',
    'Unit',
    'Price (₹)',
    'Brand',
    'Storage Location',
    'Rack / Rag Number'
  ];

  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = inventory.map(item => [
    escapeCSV(item.id || item.stockId),
    escapeCSV(item.name || ''),
    escapeCSV(item.category || ''),
    escapeCSV(item.colour || 'N/A'),
    item.quantity ?? 0,
    escapeCSV(item.unit || 'piece'),
    item.price !== null && item.price !== undefined ? item.price : '',
    escapeCSV(item.brandName || ''),
    escapeCSV(item.location || 'Shop'),
    escapeCSV(item.ragNumber || '')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];

  link.setAttribute('href', url);
  link.setAttribute('download', `inventory_catalog_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default exportInventoryToCSV;
