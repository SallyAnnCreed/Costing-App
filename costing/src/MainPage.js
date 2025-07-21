import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Select from 'react-select';

const MainPage = () => {
  const [mainData, setMainData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [product, setProduct] = useState({
    Product: '',
    Variant: '',
    SKU: '',
    Size: '',
    LabelCost: 0,
    PackageCost: 0,
    RawMaterialCost: 0,
    UnitCost: 0,
    VAT: 15,
    VATAmount: 0,
    ExVAT: 0,
    SellingPrice: 0,
    GPAmount: 0,
    GPPercentage: 0,
    lastUpdated: null,
    updatedBy: '',
    rawMaterialsUsed: [],
    labelUsed: '',
    packagingUsed: '',
    Note: '',
    InsertApplied: false,
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [labelOptions, setLabelOptions] = useState([]);
  const [packagingOptions, setPackagingOptions] = useState([]);

  const smallSelectStyles = {
  container: (provided) => ({
    ...provided,
    minWidth: '160px',
    fontSize: '12px'
  }),
  control: (provided) => ({
    ...provided,
    minHeight: '28px',
    padding: '0 4px',
    fontSize: '12px'
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 6px'
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    padding: '4px'
  }),
  clearIndicator: (provided) => ({
    ...provided,
    padding: '4px'
  }),
  menu: (provided) => ({
    ...provided,
    fontSize: '12px'
  }),
};

const handleInlineUpdate = async (productData) => {
  if (!user) return;

  try {
    const { UnitCost, SellingPrice, GPAmount, GPPercentage } = calculateProfitFields(productData);

    const updatedProduct = {
      ...productData,
      UnitCost,
      SellingPrice,
      GPAmount,
      GPPercentage,
      lastUpdated: new Date(),
      updatedBy: user.displayName || (user.email ? user.email.split('@')[0] : ''),
    };

    const docRef = doc(db, 'mainData', productData.id);
    await updateDoc(docRef, updatedProduct);
    await fetchData();
  } catch (error) {
    console.error('Error inline updating product:', error);
    setErrorMessage('Error updating product. Please try again later.');
  }
};

const handleArchive = async (productData) => {
  try {
    await addDoc(collection(db, 'archiveData'), {
      ...productData,
      archivedAt: new Date() // ✅ Include archive timestamp
    });

    await deleteDoc(doc(db, 'mainData', productData.id));
    await fetchData(); // Refresh the main page
  } catch (error) {
    console.error('Error archiving product:', error);
    setErrorMessage('Error archiving product. Please try again later.');
  }
};

  const auth = getAuth();
  const user = auth.currentUser;

const calculateGP = (UnitCost, ExVAT) => ExVAT - UnitCost;

const calculateGPPercentage = (UnitCost, ExVAT) =>
  ExVAT ? ((ExVAT - UnitCost) / ExVAT) * 100 : 0;


const getUnitCost = (product) =>
    Number(product.LabelCost) + Number(product.PackageCost) + Number(product.RawMaterialCost);

const getSellingPrice = (product) =>
    Number(product.VATAmount) + Number(product.ExVAT);

  const [noteDialog, setNoteDialog] = useState({ visible: false, mode: '', content: '', productId: '' });
const handleAddNote = (product) => {
  setNoteDialog({ visible: true, mode: 'add', content: '', productId: product.id });
};

const handleEditNote = (product) => {
  setNoteDialog({ visible: true, mode: 'edit', content: product.note || '', productId: product.id });
};

const handleViewNote = (product) => {
  setNoteDialog({ visible: true, mode: 'view', content: product.note || '', productId: product.id });
};

useEffect(() => {
  const fetchExtras = async () => {
    const labelSnap = await getDocs(collection(db, 'labellingData'));
    const packagingSnap = await getDocs(collection(db, 'packagingData'));

    setLabelOptions(labelSnap.docs.map(doc => doc.data()));
    setPackagingOptions(packagingSnap.docs.map(doc => doc.data()));
  };
  fetchExtras();
}, []);

useEffect(() => {
  const fetchRawMaterials = async () => {
    const snapshot = await getDocs(collection(db, 'rawMaterialsData'));
    const materials = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setRawMaterialsList(materials);
  };
  fetchRawMaterials();
}, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'mainData'));
      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          id: doc.id,
          ...docData,
          rawMaterialsUsed: Array.isArray(docData.rawMaterialsUsed) ? docData.rawMaterialsUsed : [],
        };
      });
      setMainData(data);
      setFilteredData(data);
    } catch (error) {
      console.error('Error fetching main data:', error);
      setErrorMessage('Error fetching data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = mainData.filter((productData) =>
      (productData.Product && productData.Product.toLowerCase().includes(searchQuery)) ||
      (productData.SKU && productData.SKU.toLowerCase().includes(searchQuery))
    );
    setFilteredData(filtered);
  }, [searchQuery, mainData]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

useEffect(() => {
  const updatedUnitCost = getUnitCost(product);
  const updatedSellingPrice = getSellingPrice(product);
  const updatedGPAmount = calculateGP(updatedUnitCost, product.ExVAT);
  const updatedGPPercentage = calculateGPPercentage(updatedUnitCost, product.ExVAT);

  setProduct((prev) => {
    if (
      prev.UnitCost !== updatedUnitCost ||
      prev.SellingPrice !== updatedSellingPrice ||
      prev.GPAmount !== updatedGPAmount ||
      prev.GPPercentage !== updatedGPPercentage
    ) {
      return {
        ...prev,
        UnitCost: updatedUnitCost,
        SellingPrice: updatedSellingPrice,
        GPAmount: updatedGPAmount,
        GPPercentage: updatedGPPercentage,
      };
    }
    return prev;
  });
}, [product]);

const handleChange = (e) => {
  const { name, value } = e.target;

  if (name === "SellingPrice") {
    const sellingPrice = parseFloat(value) || 0;
    const VATRate = 15;
    const exVAT = sellingPrice / (1 + VATRate / 100);
    const vatAmount = sellingPrice - exVAT;

    setProduct((prevState) => ({
      ...prevState,
      [name]: value,
      ExVAT: exVAT.toFixed(2),
      VATAmount: vatAmount.toFixed(2),
    }));
  } else {
    setProduct((prevState) => ({
      ...prevState,
      [name]: value
    }));
  }
};

  const handleLabelChange = async (selectedProduct, id) => {
  const selectedLabel = labelOptions.find(l => l.Product === selectedProduct);
  const labelCost = selectedLabel?.CostPrice || 0;

  const updatedData = mainData.map(item => {
    if (item.id === id) {
      const unitCost = getUnitCost({ ...item, LabelCost: labelCost });

      return {
        ...item,
        labelUsed: selectedProduct || '',
        LabelCost: labelCost,
        UnitCost: unitCost
      };
    }
    return item;
  });

  setMainData(updatedData);

  const item = updatedData.find(i => i.id === id);
  await updateDoc(doc(db, 'mainData', id), {
    labelUsed: item.labelUsed || '',
    LabelCost: item.LabelCost || 0,
    UnitCost: item.UnitCost || 0
  });
};

const handlePackagingChange = async (selectedProduct, id) => {
  const selectedPackaging = packagingOptions.find(p => p.Product === selectedProduct);
  const basePackageCost = parseFloat(selectedPackaging?.CostPrice || 0);

  const updatedData = mainData.map(item => {
    if (item.id === id) {
      const insertExtra = item.insertApplied ? 5 : 0;
      const finalPackageCost = basePackageCost + insertExtra;

      return {
        ...item,
        packagingUsed: selectedProduct || '',
        basePackageCost, // 🔄 Store the base cost separately
        PackageCost: finalPackageCost,
        UnitCost: getUnitCost({ ...item, PackageCost: finalPackageCost })
      };
    }
    return item;
  });

  setMainData(updatedData);

  const item = updatedData.find(i => i.id === id);
  await updateDoc(doc(db, 'mainData', id), {
    packagingUsed: item.packagingUsed || '',
    basePackageCost: item.basePackageCost || 0,
    PackageCost: item.PackageCost || 0,
    UnitCost: item.UnitCost || 0
  });
};
  
const calculateProfitFields = (product) => {
  const unitCost = getUnitCost(product);
  const exVAT = parseFloat(product.ExVAT) || 0;

  return {
    UnitCost: unitCost,
   SellingPrice: parseFloat(product.SellingPrice) || 0,
    GPAmount: calculateGP(unitCost, exVAT),
    GPPercentage: calculateGPPercentage(unitCost, exVAT),
  };
};

const handleAddNew = async (e) => {
  e.preventDefault();
  if (!user) return;

  try {
    const { UnitCost, SellingPrice, GPAmount, GPPercentage } = calculateProfitFields(product);

    const newProduct = {
      ...product,
      UnitCost,
      SellingPrice,
      GPAmount,
      GPPercentage,
      lastUpdated: new Date(),
      updatedBy: user.displayName || (user.email ? user.email.split('@')[0] : ''),
    };

    await addDoc(collection(db, 'mainData'), newProduct);
    await fetchData();
    resetForm();
  } catch (error) {
    console.error('Error adding new main data:', error);
    setErrorMessage('Error adding product. Please try again later.');
  }
};

const handleEdit = async (e) => {
  e.preventDefault();
  if (!user) return;

  try {
    const { UnitCost, SellingPrice, GPAmount, GPPercentage } = calculateProfitFields(product);

    const updatedProduct = {
      ...product,
      UnitCost,
      SellingPrice,
      GPAmount,
      GPPercentage,
      lastUpdated: new Date(),
      updatedBy: user.displayName || (user.email ? user.email.split('@')[0] : ''),
    };

    const docRef = doc(db, 'mainData', editingProductId);
    await updateDoc(docRef, updatedProduct);
    await fetchData();
    resetForm();
  } catch (error) {
    console.error('Error editing main data:', error);
    setErrorMessage('Error editing product. Please try again later.');
  }
};

  const handleDelete = async (id) => {
    try {
      const docRef = doc(db, 'mainData', id);
      await deleteDoc(docRef);
      await fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      setErrorMessage('Error deleting product. Please try again later.');
    }
  };

  const resetForm = () => {
    setProduct({
      Product: '',
      Variant: '',
      SKU: '',
      Size: '',
      LabelCost: 0,
      PackageCost: 0,
      RawMaterialCost: 0,
      UnitCost: 0,
      VAT: 0,
      VATAmount: 0,
      ExVAT: 0,
      SellingPrice: 0,
      GPAmount: 0,
      GPPercentage: 0,
      rawMaterialsUsed: [],
      labelUsed: '',
      packagingUsed: '',
      Notes: '',
    });
    setIsEditMode(false);
    setEditingProductId(null);
    setIsFormVisible(false);
  };

  const handleEditClick = (productData) => {
    setIsEditMode(true);
    setEditingProductId(productData.id);
    setProduct(productData);
    setIsFormVisible(true);
  };

  const handleAddRawMaterial = async (id) => {
    const updatedData = mainData.map(item => {
      if (item.id === id) {
        const updatedMaterials = item.rawMaterialsUsed ? [...item.rawMaterialsUsed, ''] : [''];
        return { ...item, rawMaterialsUsed: updatedMaterials };
      }
      return item;
    });
    setMainData(updatedData);
    const productRef = doc(db, 'mainData', id);
    await updateDoc(productRef, { rawMaterialsUsed: updatedData.find(item => item.id === id).rawMaterialsUsed });
  };

  const actionButtonStyle = {
  backgroundColor: '#0d6efd',
  color: 'white',
  border: 'none',
  padding: '5px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer'
};

  const handleAmountUsedChange = (id, index, newAmount) => {
  const updatedData = mainData.map(item => {
    if (item.id === id) {
      const updatedMaterials = [...item.rawMaterialsUsed];

      // ✅ store string so user can type ".5", "0.5", etc. naturally
      updatedMaterials[index].amountUsed = newAmount;

      // ✅ parse only when calculating
      const rawMaterialCost = updatedMaterials.reduce((acc, mat) => {
        const rawMat = rawMaterialsList.find(m => m.Product === mat.name);
        if (!rawMat || !rawMat.Size || !rawMat.CostPrice) return acc;

        const size = parseFloat(rawMat.Size);
        const price = parseFloat(rawMat.CostPrice);
        const used = parseFloat(mat.amountUsed || 0); // ✅ parse here safely

        const cost = size > 0 ? (used / size) * price : 0;
        return acc + cost;
      }, 0);

      const updatedUnitCost = getUnitCost({
        ...item,
        RawMaterialCost: rawMaterialCost,
      });

      return {
        ...item,
        rawMaterialsUsed: updatedMaterials,
        RawMaterialCost: rawMaterialCost,
        UnitCost: updatedUnitCost,
      };
    }
    return item;
  });

  setMainData(updatedData);

  const updatedItem = updatedData.find(item => item.id === id);
  const productRef = doc(db, 'mainData', id);
  updateDoc(productRef, {
    rawMaterialsUsed: updatedItem.rawMaterialsUsed,
    RawMaterialCost: updatedItem.RawMaterialCost,
    UnitCost: updatedItem.UnitCost,
  });
};

  const handleRawMaterialsChange = (option, id, index) => {
  const selectedMaterialName = option?.value || '';

  const updatedData = mainData.map(item => {
    if (item.id === id) {
      const updatedMaterials = [...item.rawMaterialsUsed];
      updatedMaterials[index] = {
  name: selectedMaterialName,
  amountUsed: 0
};

// Calculate new raw material cost
const selectedCosts = updatedMaterials.reduce((acc, mat) => {
  const rawMat = rawMaterialsList.find(r => r.Product === mat.name);
  if (!rawMat || !rawMat.Size || !rawMat.CostPrice) return acc;

  const size = parseFloat(rawMat.Size);
  const price = parseFloat(rawMat.CostPrice);
  const used = parseFloat(mat.amountUsed || 0);

  const cost = size > 0 ? (used / size) * price : 0;
  return acc + cost;
}, 0);

      return {
        ...item,
        rawMaterialsUsed: updatedMaterials,
        RawMaterialCost: selectedCosts,
        UnitCost: getUnitCost({ ...item, RawMaterialCost: selectedCosts }), // update UnitCost
      };
    }
    return item;
  });

  setMainData(updatedData);

  const updatedItem = updatedData.find(item => item.id === id);
  const productRef = doc(db, 'mainData', id);
  updateDoc(productRef, {
    rawMaterialsUsed: updatedItem.rawMaterialsUsed,
    RawMaterialCost: updatedItem.RawMaterialCost,
    UnitCost: updatedItem.UnitCost,
  });
};

const handleToggleInsert = async (id) => {
  const updated = mainData.map(product => {
    if (product.id === id) {
      const isApplied = !product.insertApplied;
      const basePackageCost = parseFloat(product.basePackageCost || 0);
      const newPackageCost = isApplied ? basePackageCost + 5 : basePackageCost;

      const updatedProduct = {
        ...product,
        insertApplied: isApplied,
        PackageCost: newPackageCost,
        UnitCost: getUnitCost({ ...product, PackageCost: newPackageCost })
      };

      return updatedProduct;
    }
    return product;
  });

  setMainData(updated);

  const updatedItem = updated.find(p => p.id === id);
  await updateDoc(doc(db, 'mainData', id), {
    insertApplied: updatedItem.insertApplied,
    PackageCost: updatedItem.PackageCost,
    UnitCost: updatedItem.UnitCost
  });
};

const handleRemoveRawMaterial = async (id, index) => {
  const updatedData = mainData.map(item => {
    if (item.id === id) {
      const updatedMaterials = [...item.rawMaterialsUsed];
      updatedMaterials.splice(index, 1); // Remove one material

      // Recalculate RawMaterialCost
     const newRawMaterialCost = updatedMaterials.reduce((acc, mat) => {
  const rawMat = rawMaterialsList.find(r => r.Product === mat.name);
  if (!rawMat || !rawMat.Size || !rawMat.CostPrice) return acc;

  const size = parseFloat(rawMat.Size);
  const price = parseFloat(rawMat.CostPrice);
  const used = parseFloat(mat.amountUsed || 0);

  const cost = size > 0 ? (used / size) * price : 0;
  return acc + cost;
}, 0);

      const updatedUnitCost = getUnitCost({ ...item, RawMaterialCost: newRawMaterialCost });

      return {
        ...item,
        rawMaterialsUsed: updatedMaterials,
        RawMaterialCost: newRawMaterialCost,
        UnitCost: updatedUnitCost,
      };
    }
    return item;
  });

  setMainData(updatedData);

  const updatedItem = updatedData.find(item => item.id === id);
  const productRef = doc(db, 'mainData', id);
  await updateDoc(productRef, {
    rawMaterialsUsed: updatedItem.rawMaterialsUsed,
    RawMaterialCost: updatedItem.RawMaterialCost,
    UnitCost: updatedItem.UnitCost,
  });
};

  const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const exportToCSV = () => {
  if (!filteredData.length) return;

  const headers = [
    'Product', 'Variant', 'RawMaterialsUsed', 'SKU', 'Size',
    'labelUsed', 'LabelCost',
    'packagingUsed', 'PackageCost',
    'insertApplied',
    'RawMaterialCost', 'UnitCost',
    'VAT', 'VATAmount', 'ExVAT',
    'SellingPrice', 'GPAmount', 'GPPercentage',
    'lastUpdated', 'updatedBy', 'Note'
  ];

  const rows = filteredData.map(row => {
    return headers.map(field => {
      let value = row[field];

      // 👇 Format rawMaterialsUsed into readable string
      if (field === 'RawMaterialsUsed') {
        const materials = row.rawMaterialsUsed || [];
        value = materials.map(m => {
          const name = m?.name || '';
          const amt = m?.amountUsed || '';
          return `${name}${amt ? ` (${amt})` : ''}`;
        }).join('; ');
      }

      // Format date
      if (field === 'lastUpdated' && value?.toDate) {
        value = value.toDate().toLocaleString();
      }

      // Handle undefined/null
      if (value === undefined || value === null) value = '';

      // Escape for CSV
      if (typeof value === 'string') {
        value = `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    }).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'products_export.csv';
  link.click();
};

  const getCellStyle = (value) => {
    if (value > 0) return { color: 'green' };
    if (value < 0) return { color: 'red' };
    return {};
  };

 const safeToFixed = (value) => {
  const num = Number(value);
  return isNaN(num) ? 'R0.00' : `R${num.toFixed(2)}`;
};

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '20px' }}>
      {user && (
        <div style={{ fontSize: '24px', color: '#333', marginBottom: '10px', fontWeight: 'bold' }}>
          Hello, <span style={{ color: '#0d6efd' }}>{user.email.split('@')[0]}</span>
        </div>
      )}
    
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '600px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search products by name or SKU"
            style={{ padding: '12px 16px 12px 36px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ccc', width: '90%' }}
          />
          <i className="fa fa-search" style={{ position: 'absolute', top: '50%', left: '12px', transform: 'translateY(-50%)', fontSize: '18px', color: '#aaa' }} />
        </div>
      </div>
    
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <button onClick={exportToCSV} style={{ padding: '10px 20px', backgroundColor: '#198754', color: 'white', border: 'none', borderRadius: '8px', marginRight: '10px', fontWeight: 'bold', width: '14.8%' }}>Export CSV</button>
        <button onClick={() => { resetForm(); setIsFormVisible(true); }} style={{ padding: '10px 20px', backgroundColor: '#0d6efd', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', width: '14.8%' }}>Add Product</button>
      </div>
    
      {isFormVisible && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <form onSubmit={isEditMode ? handleEdit : handleAddNew} style={{ width: '400px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', position: 'relative' }}>
            <span onClick={resetForm} style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '18px', cursor: 'pointer' }}>❌</span>
            <h3>{isEditMode ? 'Edit Product' : 'Add Product'}</h3>
    
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
              {['Product', 'Variant', 'SKU', 'SellingPrice'].map((key) => (
                <div key={key} style={{ marginBottom: '10px' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
                  <input type="text" name={key} value={product[key]} onChange={handleChange} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              ))}
            </div>
    
            <button type="submit" style={{ backgroundColor: isEditMode ? '#0d6efd' : '#198754', color: 'white', border: 'none', padding: '10px 20px', fontSize: '14px', borderRadius: '5px', cursor: 'pointer', width: '100%' }}>
              {isEditMode ? 'Update Product' : 'Add Product'}
            </button>
          </form>
        </div>
      )}
    
      {loading && <p>Loading data...</p>}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

<div style={{ width: '100%' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', border: '1px solid #ddd' }}>
  <thead>
    <tr>
      {[
        'Product', 'Variant', 'Raw Materials Used', 'Label Used', 'Packaging Used', 'SKU','Insert (y/n)','Size', 'Label Cost', 'Package Cost',
        'Raw Material Cost', 'Unit Cost', 'VAT (R)', 'ExVAT (R)',
        'Selling Price', 'GP Amount', 'GP %', 'Last Updated', 'Updated By', 'Actions'
      ].map((header) => (
        <th key={header} style={{  border: '1px solid #ddd',
              padding: '8px',
              backgroundColor: '#f9f9f9',
              position: 'sticky',
              top: 0,
              zIndex: 1, }}>{header}</th>
      ))}
    </tr>
  </thead>
  <tbody>
  {[...filteredData]
  .sort((a, b) => String(a.Product).localeCompare(String(b.Product), undefined, { sensitivity: 'base' }))
  .map((productData) => (

      <tr key={productData.id}>
        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{String(productData.Product)}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{productData.Variant}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
          {(productData.rawMaterialsUsed ?? []).map((materialObj, index) => {
            const selectedName = materialObj?.name || '';
            const amountUsed = materialObj?.amountUsed || '';
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                <Select
                  value={selectedName ? { value: selectedName, label: selectedName } : null}
                  onChange={(option) => handleRawMaterialsChange(option, productData.id, index)}
                  options={rawMaterialsList.map(material => ({
                    value: material.Product,
                    label: material.Product
                  }))}
                  placeholder="Select raw material"
                  isClearable
                  styles={{
                    container: (provided) => ({ ...provided, flex: 1, minWidth: '150px' }),
                    control: (provided) => ({ ...provided, minHeight: '30px', fontSize: '12px' }),
                    menu: (provided) => ({ ...provided, fontSize: '12px' })
                  }}
                />
                <input
                  type="number"
                  placeholder="Amount Used"
                  value={amountUsed}
                  onChange={(e) => handleAmountUsedChange(productData.id, index, e.target.value)}
                  style={{ width: '80px', marginLeft: '5px', fontSize: '12px' }}
                />
                <button
                  onClick={() => handleRemoveRawMaterial(productData.id, index)}
                  style={{
                    marginLeft: '6px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ❌
                </button>
              </div>
            );
          })}
          <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => handleAddRawMaterial(productData.id)}
              style={{
                backgroundColor: '#198754',
                color: 'white',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ➕ Add
            </button>
          </div>
        </td>
        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
          <Select
            value={productData.labelUsed ? { label: productData.labelUsed, value: productData.labelUsed } : null}
            onChange={(option) => handleLabelChange(option?.value, productData.id)}
            options={labelOptions.map(opt => ({ label: opt.Product, value: opt.Product }))}
            placeholder="Label"
            isClearable
            styles={smallSelectStyles}
          />
        </td>
        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
          <Select
            value={productData.packagingUsed ? { label: productData.packagingUsed, value: productData.packagingUsed } : null}
            onChange={(option) => handlePackagingChange(option?.value, productData.id)}
            options={packagingOptions.map(opt => ({ label: opt.Product, value: opt.Product }))}
            placeholder="Packaging"
            isClearable
            styles={smallSelectStyles}
          />
        </td>
        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{productData.SKU}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
          <input
            type="checkbox"
            checked={productData.insertApplied || false}
            onChange={() => handleToggleInsert(productData.id)}
          />
        </td>
        <td style={{ border: '1px solid #ddd', padding: '8px' }}>
          {(productData.rawMaterialsUsed ?? []).map((material, index) => {
            const matched = rawMaterialsList.find(r => r.Product === material?.name);
            const size = matched?.Size || '';
            const measurement = matched?.Measurement || '';
            return (
              <div key={index} style={{ fontSize: '12px', marginBottom: '5px' }}>
               {size && measurement ? `${size}${measurement}` : '—'}
              </div>
            );
          })}
        </td>
        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{safeToFixed(productData.LabelCost)}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{safeToFixed(productData.PackageCost)}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{safeToFixed(productData.RawMaterialCost)}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{safeToFixed(productData.UnitCost)}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{safeToFixed(productData.VATAmount)}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{safeToFixed(productData.ExVAT)}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{safeToFixed(productData.SellingPrice)}</td>
        <td style={{ ...getCellStyle(Number(productData.GPAmount)), border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
          {safeToFixed(productData.GPAmount)}
        </td>
        <td style={{ ...getCellStyle(Number(productData.GPPercentage)), border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
         <td style={{ ...getCellStyle(Number(productData.GPPercentage)), border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
  {isNaN(Number(productData.GPPercentage)) 
    ? '0.00%' 
    : `${Number(productData.GPPercentage).toFixed(2)}%`
  }
</td>
        </td>
        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{formatDate(productData.lastUpdated)}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px' }}>{productData.updatedBy}</td>
        <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => handleInlineUpdate(productData)} style={{ ...actionButtonStyle, backgroundColor: '#0dcaf0' }}>Update</button>
              <button onClick={() => handleEditClick(productData)} style={actionButtonStyle}>Edit</button>
              <button
  onClick={() => handleArchive(productData)}
  style={{ ...actionButtonStyle, backgroundColor: '#6c757d' }}
>
  Archive
</button>

              <button onClick={() => handleDelete(productData.id)} style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}>Delete</button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => handleAddNote(productData)} style={{ ...actionButtonStyle, backgroundColor: '#6f42c1' }}>Add Note</button>
              <button onClick={() => handleViewNote(productData)} style={{ ...actionButtonStyle, backgroundColor: '#20c997' }}>View Note</button>
              <button onClick={() => handleEditNote(productData)} style={{ ...actionButtonStyle, backgroundColor: '#ffc107', color: '#000' }}>Edit Note</button>
            </div>
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>

{noteDialog.visible && (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', width: '400px' }}>
      <h3>{noteDialog.mode === 'view' ? 'View Note' : noteDialog.mode === 'edit' ? 'Edit Note' : 'Add Note'}</h3>
      {noteDialog.mode === 'view' ? (
        <p>{noteDialog.content || 'No note available.'}</p>
      ) : (
        <textarea
          rows="5"
          style={{ width: '100%', marginBottom: '10px' }}
          value={noteDialog.content}
          onChange={(e) => setNoteDialog(prev => ({ ...prev, content: e.target.value }))}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setNoteDialog({ visible: false, mode: '', content: '', productId: '' })}>Close</button>
        {noteDialog.mode !== 'view' && (
          <button
            onClick={async () => {
              const docRef = doc(db, 'mainData', noteDialog.productId);
              await updateDoc(docRef, { note: noteDialog.content });
              setNoteDialog({ visible: false, mode: '', content: '', productId: '' });
              await fetchData();
            }}
          >
            Save
          </button>
        )}
      </div>
    </div>
  </div>
)}
    </div>
    </div>
      );
    };
    
    export default MainPage;