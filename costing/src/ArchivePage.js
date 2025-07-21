// src/ArchivePage.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

const ArchivePage = () => {
  const [archiveData, setArchiveData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const rowsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchArchived();
  }, []);

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'archiveData'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setArchiveData(data);
    } catch (error) {
      console.error('Error fetching archive:', error);
      setErrorMessage('Failed to load archive data.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (product) => {
    const confirmRestore = window.confirm(`Are you sure you want to restore ${product.Product}?`);
    if (!confirmRestore) return;

    try {
      await setDoc(doc(db, 'mainData', product.id), {
        ...product,
        lastUpdated: new Date(),
        archivedAt: null
      });

      await deleteDoc(doc(db, 'archiveData', product.id));

      setArchiveData(prev => prev.filter(p => p.id !== product.id));
    } catch (error) {
      console.error('Error restoring product:', error);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Product", "Variant", "Raw Materials Used", "Label Used", "Packaging Used", "SKU", "Insert (y/n)", "Size",
      "Label Cost", "Package Cost", "Raw Material Cost", "Unit Cost", "VAT (R)", "ExVAT (R)", "Selling Price",
      "GP Amount", "GP %", "Archived At", "Updated By"
    ];

    const rows = archiveData.map(product => [
      product.Product,
      product.Variant,
      (product.rawMaterialsUsed || []).map(m => `${m.name} (${m.amountUsed})`).join('; '),
      product.labelUsed,
      product.packagingUsed,
      product.SKU,
      product.insertApplied ? 'Yes' : 'No',
      product.Size,
      product.LabelCost,
      product.PackageCost,
      product.RawMaterialCost,
      product.UnitCost,
      product.VATAmount,
      product.ExVAT,
      product.SellingPrice,
      product.GPAmount,
      `${product.GPPercentage}%`,
      formatDate(product.archivedAt),
      product.updatedBy
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${val}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'archived_products.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = archiveData.filter(product =>
    product.Product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.SKU?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '20px' }}>
      <h2>Archived Products</h2>

      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by Product or SKU"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '6px 10px', width: '250px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '14px' }}
        />
        <button
          onClick={exportCSV}
          style={{ padding: '6px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px' }}
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <p>Loading archived products...</p>
      ) : errorMessage ? (
        <p style={{ color: 'red' }}>{errorMessage}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr>
              {["Product", "Variant", "Raw Materials Used", "Label Used", "Packaging Used", "SKU", "Insert (y/n)", "Size", "Label Cost", "Package Cost", "Raw Material Cost", "Unit Cost", "VAT (R)", "ExVAT (R)", "Selling Price", "GP Amount", "GP %", "Archived At", "Updated By", "Actions"].map(header => (
                <th key={header} style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f8f9fa' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.slice(0, rowsPerPage).map(product => (
              <tr key={product.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.Product}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.Variant}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{(product.rawMaterialsUsed || []).map((mat, idx) => (
                  <div key={idx}>{mat.name || '—'} ({mat.amountUsed || 0})</div>
                ))}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.labelUsed}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.packagingUsed}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.SKU}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.insertApplied ? 'Yes' : 'No'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.Size}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatCurrency(product.LabelCost)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatCurrency(product.PackageCost)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatCurrency(product.RawMaterialCost)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatCurrency(product.UnitCost)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatCurrency(product.VATAmount)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatCurrency(product.ExVAT)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatCurrency(product.SellingPrice)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatCurrency(product.GPAmount)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{Number(product.GPPercentage || 0).toFixed(2)}%</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(product.archivedAt)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.updatedBy}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button onClick={() => handleRestore(product)} style={{ padding: '6px 10px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '13px' }}>Restore</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  function formatCurrency(value) {
    const num = Number(value);
    return isNaN(num) ? 'R0.00' : `R${num.toFixed(2)}`;
  }
};

export default ArchivePage;
