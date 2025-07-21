import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Select from 'react-select';

const PackagingPage = () => {
 const [packagingData, setPackagingData] = useState([]);
 const [mainData, setMainData] = useState([]); // State for main products data
   const [searchQuery, setSearchQuery] = useState('');
   const [filteredData, setFilteredData] = useState([]);
   const [product, setProduct] = useState({
    Product: '',
    SKU: '',
    StockAvailable: 0,
    Supplier: '',
    BaseCost: '',
    CostPrice: 0,
    lastUpdated: null, // New field for tracking the last update time
    updatedBy: '', // New field for tracking the user who updated the product
    extras: [], // now an array of selected extras
  });
  const [rowEdits, setRowEdits] = useState({});

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  
  const auth = getAuth();
  const user = auth.currentUser;

  const [customExtra, setCustomExtra] = useState('');

  const extrasList = [
  'Carton',
  'Container',
  'Insert',
  'Label',
  'OuterBox',
  'Scoop',
  'Shredding',
  'Sticker',
  'TissuePaper',
  'Other'
];

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'packagingData'));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPackagingData(data);
        setFilteredData(data); // Initially, display all Raw Materials data

        const mainQuerySnapshot = await getDocs(collection(db, 'mainData'));
        const mainData = mainQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMainData(mainData);
      } catch (error) {
        console.error('Error fetching Packaging data:', error);
      }
    };
    fetchData();
  }, []);
  
 useEffect(() => {
    // Filter data when search query changes
    const filtered = packagingData.filter((productData) =>
      productData.Product.toLowerCase().includes(searchQuery) ||
      productData.SKU.toLowerCase().includes(searchQuery) ||
      productData.Supplier.toLowerCase().includes(searchQuery)
    );
    setFilteredData(filtered);
  }, [searchQuery, packagingData]);
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

const calculateTotalCost = (productData) => {
  const base = parseFloat(productData.BaseCost) || 0;
  const extras = productData.extras || [];

  const extrasTotal = extras.reduce((sum, extra) => {
    const extraCost = parseFloat(productData[extra]) || 0;
    return sum + extraCost;
  }, 0);

  return base + extrasTotal;
};

const handleChange = (e) => {
  const { name, value } = e.target;
  const numericFields = ['BaseCost', 'CostPrice', 'StockAvailable'];

  setProduct((prev) => {
    const updated = {
      ...prev,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value,
    };

    updated.CostPrice = calculateTotalCost(updated);
    return updated;
  });
};



 const handleAddNew = async (e) => {
  e.preventDefault();
  if (user) {
    try {
      // Construct the full product object including individual extra costs
      const fullProduct = {
        ...product,
        lastUpdated: new Date(),
        updatedBy: user.displayName || (user.email ? user.email.split('@')[0] : ''),
      };

      // Add individual extra costs to the object
      (product.extras || []).forEach((extra) => {
        fullProduct[extra] = parseFloat(product[extra]) || 0;
      });

      // Ensure BaseCost and CostPrice are saved as numbers
      fullProduct.BaseCost = parseFloat(product.BaseCost) || 0;
      fullProduct.CostPrice = calculateTotalCost(fullProduct); // Recalculate for safety

      // Save to Firestore
      await addDoc(collection(db, 'packagingData'), fullProduct);
      resetForm();
    } catch (error) {
      console.error('Error adding new packaging data:', error);
    }
  }
};


  const updateLabelCostInMainData = async (MainProductSKU, CostPrice) => {
    // Find the matching SKU in mainData
    const matchingMainProduct = mainData.find(product => product.SKU === MainProductSKU);

    if (matchingMainProduct) {
      // If a match is found, update the LabelCost in mainData
      const docRef = doc(db, 'mainData', matchingMainProduct.id);
      await updateDoc(docRef, { PackageCost: CostPrice });
      console.log(`LabelCost updated to ${CostPrice} for SKU ${MainProductSKU}`);
    } else {
      console.log(`No matching SKU found for MainProductSKU: ${MainProductSKU}`);
    }
  };

const handleEdit = async (e) => {
  e.preventDefault();
  if (user) {
    try {
      // Construct the updated product object
      const updatedProduct = {
        ...product,
        lastUpdated: new Date(),
        updatedBy: user.displayName || (user.email ? user.email.split('@')[0] : ''),
      };

      // Add individual extra costs to the object
      (product.extras || []).forEach((extra) => {
        updatedProduct[extra] = parseFloat(product[extra]) || 0;
      });

      // Ensure BaseCost and CostPrice are numeric and accurate
      updatedProduct.BaseCost = parseFloat(product.BaseCost) || 0;
      updatedProduct.CostPrice = calculateTotalCost(updatedProduct); // Recalculate just in case

      // Save to Firestore
      const docRef = doc(db, 'packagingData', editingProductId);
      await updateDoc(docRef, updatedProduct);

      // Optionally update mainData (if the SKU matches)
      await updateLabelCostInMainData(updatedProduct.SKU, updatedProduct.CostPrice);

      resetForm();
    } catch (error) {
      console.error('Error editing packaging data:', error);
    }
  }
};

  
const handleEditClick = (productData) => {
  setIsEditMode(true);
  setEditingProductId(productData.id);
  setProduct({
    ...productData,
    extras: Array.isArray(productData.extras) ? productData.extras : [], // <-- fix here
  });
  setIsFormVisible(true);
};


  const handleDelete = async (id) => {
    try {
      const docRef = doc(db, 'packagingData', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const resetForm = () => {
    setProduct({
    Product: '',
    SKU: '',
    Supplier: '',
    BaseCost:'',
    CostPrice: 0,
    lastUpdated: null, // New field for tracking the last update time
    updatedBy: '', // New field for tracking the user who updated the product
    extras: '',
    });
    setIsEditMode(false);
    setEditingProductId(null);
    setIsFormVisible(false);
  };

  const handleAddProductClick = () => {
    setIsEditMode(false);
    resetForm();
    setIsFormVisible(true);
  };
  
    const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '20px' }}>
      <h1>Packaging Data</h1>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search products by name, SKU, or supplier"
          style={{
            padding: '10px',
            fontSize: '14px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            marginRight: '20px',
            width: '300px',
          }}
        />
        
        <button
          onClick={handleAddProductClick}
          style={{
            ppadding: '8px 15px',
            fontSize: '16px',
            width: '200px', 
            cursor: 'pointer',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            textAlign: 'center',
            marginLeft: '1500px'
          }}
        >
          Add Product
        </button>
      </div>

      {isFormVisible && (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}
  >
    <form
      onSubmit={isEditMode ? handleEdit : handleAddNew}
      style={{
        width: '400px',
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
        position: 'relative',
      }}
    >
      <span
        onClick={resetForm}
        style={{
          position: 'absolute',
          top: '10px',
          right: '15px',
          fontSize: '18px',
          cursor: 'pointer',
        }}
      >
        ❌
      </span>

      <h3>{isEditMode ? 'Edit Product' : 'Add Product'}</h3>
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          marginBottom: '10px',
        }}
      >
      {['Product', 'SKU', 'Supplier'].map((key) => (
          <div key={key} style={{ marginBottom: '10px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
              {key.replace(/([A-Z])/g, ' $1')}
            </label>
            <input
              type={typeof product[key] === 'number' ? 'number' : 'text'}
              name={key}
              value={product[key]}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
        ))}
      </div>

      <button type="submit" style={{ width: '100%', padding: '10px', marginTop: '10px', borderRadius: '4px', backgroundColor: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}>
        {isEditMode ? 'Update Product' : 'Add Product'}
      </button>
    </form>
  </div>
)}
<div style={{ width: '100%' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', border: '1px solid #ddd' }}>
    <thead>
      <tr>
        {['Product', 'SKU', 'Supplier', 'Base Cost', 'Extras', 'Cost Price', 'Last Updated', 'Updated By', 'Actions'].map((header) => (
          <th
            key={header}
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: '#fff',
              padding: '8px',
              border: '1px solid #ddd',
              zIndex: 1,
            }}
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  <tbody>
  {[...filteredData]
  .sort((a, b) => String(a.Product).localeCompare(String(b.Product), undefined, { sensitivity: 'base' }))
  .map((productData) => {

      const row = rowEdits[productData.id] || productData;

      return (
        <tr key={productData.id}>
          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.Product}</td>
          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.SKU}</td>
          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.Supplier}</td>

          {/* Base Cost */}
          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
            <input
              type="number"
              step="0.01"
              value={row.BaseCost || ''}
              onChange={(e) => {
                const baseCost = parseFloat(e.target.value) || 0;
                const extras = row.extras || [];
                const extrasTotal = extras.reduce((acc, extra) => acc + (parseFloat(row[extra]) || 0), 0);
                const updatedRow = {
                  ...row,
                  BaseCost: baseCost,
                  CostPrice: baseCost + extrasTotal,
                };
                setRowEdits((prev) => ({ ...prev, [productData.id]: updatedRow }));
              }}
              style={{
                padding: '5px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                width: '100px',
              }}
            />
          </td>

          {/* Extras */}
          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
            <div style={{ minWidth: '200px' }}>
              <Select
                isMulti
                options={extrasList.map((extra) => ({ value: extra, label: extra }))}
                value={(row.extras || []).map((extra) => ({ value: extra, label: extra }))}
                onChange={(selectedOptions) => {
                  const selectedExtras = selectedOptions.map((opt) => opt.value);
                  const updatedRow = {
                    ...row,
                    extras: selectedExtras,
                    CostPrice:
                      (parseFloat(row.BaseCost) || 0) +
                      selectedExtras.reduce((acc, extra) => acc + (parseFloat(row[extra]) || 0), 0),
                  };
                  setRowEdits((prev) => ({ ...prev, [productData.id]: updatedRow }));
                }}
                placeholder="Select extras"
              />

              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(row.extras || []).map((extra) => (
                  <div key={extra} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '14px' }}>{extra}:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={row[extra] || ''}
                      onChange={(e) => {
                        const updatedValue = parseFloat(e.target.value) || 0;
                        const updatedRow = {
                          ...row,
                          [extra]: updatedValue,
                        };
                        const extrasTotal = (row.extras || []).reduce(
                          (acc, item) =>
                            acc + (item === extra ? updatedValue : parseFloat(row[item]) || 0),
                          0
                        );
                        updatedRow.CostPrice = (parseFloat(row.BaseCost) || 0) + extrasTotal;
                        setRowEdits((prev) => ({ ...prev, [productData.id]: updatedRow }));
                      }}
                      style={{
                        padding: '5px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        width: '100px',
                      }}
                    />
                  </div>
                ))}

                {/* Custom input for 'Other' */}
              {(row.extras || []).includes('Other') && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
    <label style={{ fontSize: '14px' }}>Enter custom extra name:</label>
    <input
      type="text"
      value={customExtra}
      onChange={(e) => setCustomExtra(e.target.value)}
      placeholder="e.g. Foam Wrap"
      style={{
        padding: '5px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        width: '100%',
      }}
      onBlur={() => {
        const trimmed = customExtra.trim();
        if (
          trimmed &&
          !row.extras.includes(trimmed) &&
          trimmed.toLowerCase() !== 'other'
        ) {
          const newExtras = [...row.extras.filter((e) => e !== 'Other'), trimmed];
          const updatedRow = {
            ...row,
            extras: newExtras,
            CostPrice:
              (parseFloat(row.BaseCost) || 0) +
              newExtras.reduce((acc, extra) => acc + (parseFloat(row[extra]) || 0), 0),
          };
          setRowEdits((prev) => ({
            ...prev,
            [productData.id]: updatedRow,
          }));
        }

        setCustomExtra('');
      }}
    />
  </div>
)}
              </div>
            </div>
          </td>

          {/* Cost Price */}
          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
            R{Number(row.CostPrice || 0).toFixed(2)}
          </td>

          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
            {formatDate(productData.lastUpdated)}
          </td>
          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
            {productData.updatedBy}
          </td>

          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
            <button
              onClick={() => handleEditClick(row)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginRight: '5px',
              }}
            >
              Edit
            </button>
            <button
              onClick={async () => {
                const editedRow = rowEdits[productData.id];
                if (!editedRow) return;

                const docRef = doc(db, 'packagingData', productData.id);
                const saveData = {
                  ...editedRow,
                  lastUpdated: new Date(),
                  updatedBy: user?.displayName || user?.email?.split('@')[0] || '',
                };
                (editedRow.extras || []).forEach((extra) => {
                  saveData[extra] = parseFloat(editedRow[extra]) || 0;
                });
                saveData.BaseCost = parseFloat(editedRow.BaseCost) || 0;
                saveData.CostPrice = calculateTotalCost(saveData);

                await updateDoc(docRef, saveData);

                const snapshot = await getDocs(collection(db, 'packagingData'));
                const updated = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setPackagingData(updated);
                setFilteredData(updated);

                setRowEdits((prev) => {
                  const updatedEdits = { ...prev };
                  delete updatedEdits[productData.id];
                  return updatedEdits;
                });
              }}
              style={{
                padding: '5px 10px',
                backgroundColor: 'green',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '5px',
              }}
            >
              Save
            </button>
            <button
              onClick={() => handleDelete(productData.id)}
              style={{
                padding: '5px 10px',
                backgroundColor: '#FF0000',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '5px',
              }}
            >
              Delete
            </button>
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
</div>
    </div>
  );
};

export default PackagingPage;
