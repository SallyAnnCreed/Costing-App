import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const RawMaterialsPage = () => {
 const [rawMaterialsData, setRawMaterialsData] = useState([]);
 const [mainData, setMainData] = useState([]); // State for main products data
   const [searchQuery, setSearchQuery] = useState('');
   const [filteredData, setFilteredData] = useState([]);
   const [product, setProduct] = useState({
     Product: '',
     SKU: '',
    //  MainProduct: '',
     Variant: '',
    Size: 0,
    Measurement: '',
    //  MainProductSKU: '',
    //  StockAvailable: 0,
     Supplier: '',
     CostPrice: 0,
     lastUpdated: null, // New field for tracking the last update time
     updatedBy: '', // New field for tracking the user who updated the product
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  
  const auth = getAuth();
  const user = auth.currentUser;

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'rawMaterialsData'));
        const rawMaterialsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRawMaterialsData(rawMaterialsData);
        setFilteredData(rawMaterialsData);

        // Fetch main data to compare SKU and MainProductSKU
        const mainQuerySnapshot = await getDocs(collection(db, 'mainData'));
        const mainData = mainQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMainData(mainData);
      } catch (error) {
        console.error('Error fetching Raw Materials data:', error);
      }
    };
    fetchData();
  }, []);
  
 useEffect(() => {
    // Filter data when search query changes
    const filtered = rawMaterialsData.filter((productData) =>
      productData.Product.toLowerCase().includes(searchQuery) ||
      productData.SKU.toLowerCase().includes(searchQuery) ||
      // productData.MainProductSKU.toLowerCase().includes(searchQuery) ||
      productData.Variant.toLowerCase().includes(searchQuery) ||
      productData.Supplier.toLowerCase().includes(searchQuery)
    );
    setFilteredData(filtered);
  }, [searchQuery, rawMaterialsData]);
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const handleMeasurementChange = async (newMeasurement, productId) => {
  // Update local states
  setFilteredData((prevFiltered) =>
    prevFiltered.map((item) =>
      item.id === productId ? { ...item, Measurement: newMeasurement } : item
    )
  );
  setRawMaterialsData((prevData) =>
    prevData.map((item) =>
      item.id === productId ? { ...item, Measurement: newMeasurement } : item
    )
  );

  try {
    const docRef = doc(db, 'rawMaterialsData', productId);
    await updateDoc(docRef, {
      Measurement: newMeasurement,
      lastUpdated: new Date(),
      updatedBy: user?.displayName || (user?.email ? user.email.split('@')[0] : ''),
    });
    console.log(`Updated measurement to ${newMeasurement} for ID: ${productId}`);
  } catch (error) {
    console.error('Error updating measurement:', error);
  }
};
  
   const handleChange = (e) => {
    const { name, value } = e.target;

    setProduct((prevState) => {
      const updatedProduct = { ...prevState, [name]: value };

      return updatedProduct;
    });
  };

  const updateRawMaterialsCostInMainData = async (MainProductSKU, CostPrice) => {
    // Find the matching SKU in mainData
    const matchingMainProduct = mainData.find(product => product.SKU === MainProductSKU);

    if (matchingMainProduct) {
      // If a match is found, update the LabelCost in mainData
      const docRef = doc(db, 'mainData', matchingMainProduct.id);
      await updateDoc(docRef, { RawMaterialCost: CostPrice });
      console.log(`Raw Material Cost updated to ${CostPrice} for SKU ${MainProductSKU}`);
    } else {
      console.log(`No matching SKU found for MainProductSKU: ${MainProductSKU}`);
    }
  };

   const handleAddNew = async (e) => {
    e.preventDefault();
    if (user) {
      try {
        const newProduct = {
          ...product,
          lastUpdated: new Date(),
          updatedBy: user.displayName || (user.email ? user.email.split('@')[0] : ''), // Extract the part before @
        };
        await addDoc(collection(db, 'rawMaterialsData'), newProduct);
        resetForm();
      } catch (error) {
        console.error('Error adding new raw materials data:', error);
      }
    }
  };

const fetchRawMaterialsData = async () => {
  const snapshot = await getDocs(collection(db, 'rawMaterialsData'));
  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  setRawMaterialsData(data);
  setFilteredData(data); // ✅ Sync filteredData too
};

const handleEdit = async (e) => {
  e.preventDefault();
  if (user) {
    try {
      const updatedProduct = {
        ...product,
        lastUpdated: new Date(),
        updatedBy: user.displayName || (user.email ? user.email.split('@')[0] : ''),
      };

      const docRef = doc(db, 'rawMaterialsData', editingProductId);
      await updateDoc(docRef, updatedProduct);

      if (updatedProduct.MainProductSKU) {
        await updateRawMaterialsCostInMainData(updatedProduct.MainProductSKU, updatedProduct.CostPrice);
      }

      await fetchRawMaterialsData(); // ✅ ensure fresh data
      resetForm();                   // ✅ only close the form after sync
    } catch (error) {
      console.error('Error editing raw materials data:', error);
    }
  }
};


const handleEditClick = (productData) => {
  setIsEditMode(true);
  setEditingProductId(productData.id);
  setProduct(productData);
  setIsFormVisible(true);
};

const handleDelete = async (id) => {
  try {
    const docRef = doc(db, 'rawMaterialsData', id);
    await deleteDoc(docRef);
    await fetchRawMaterialsData(); // ✅ Refresh the list
  } catch (error) {
    console.error('Error deleting product:', error);
  }
};


 const resetForm = () => {
  setProduct({
    Product: '',
    SKU: '',
    Variant: '',
    Size: 0,
    Measurement: '',
    Supplier: '',
    CostPrice: 0,
    MainProductSKU: '',  // ✅ Include this if used
    lastUpdated: null,
    updatedBy: '',
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
      <h1>Raw Materials Data</h1>

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
        {['Product', 'SKU', 'Size', 'Supplier', 'CostPrice'].map((key) => (
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
        {[
          'Product',
          'SKU',
          'Size',
          'Measurement',
          'Supplier',
          'Cost Price',
          'Last Updated',
          'Updated By',
          'Actions'
        ].map((header) => (
          <th
            key={header}
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: '#fff',
              padding: '8px',
              border: '1px solid #ddd',
              zIndex: 1
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
  .map((productData) => (
            <tr key={productData.id}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.Product}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.SKU}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.Size}</td>
              <td>
  <select
    value={productData.Measurement || ''}
    onChange={(e) => handleMeasurementChange(e.target.value, productData.id)}
    style={{
      padding: '4px',
      fontSize: '12px',
      width: '100%',
      borderRadius: '4px'
    }}
  >
    <option value="">Select</option>
    <option value="kg">kg</option>
    <option value="g">g</option>
    <option value="ml">ml</option>
    <option value="unit">unit</option>
  </select>
</td>
              {/* <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.MainProductSKU}</td> */}
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.Supplier}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.CostPrice}</td>
          
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                {formatDate(productData.lastUpdated)}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{productData.updatedBy}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                <button
                  onClick={() => handleEditClick(productData)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginRight: '5px',
                    marginBottom: '5px'
                  }}
                >
                  Edit
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
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
};

export default RawMaterialsPage;
