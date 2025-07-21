import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const LabellingPage = () => {
  const [labellingData, setLabellingData] = useState([]);
  const [mainData, setMainData] = useState([]); // State for main products data
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [product, setProduct] = useState({
    Product: '',
    SKU: '',
    Supplier: '',
    CostPrice: 0,
    lastUpdated: null,
    updatedBy: '',
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch labelling data
        const querySnapshot = await getDocs(collection(db, 'labellingData'));
        const labellingData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLabellingData(labellingData);
        setFilteredData(labellingData);

        // Fetch main data to compare SKU and MainProductSKU
        const mainQuerySnapshot = await getDocs(collection(db, 'mainData'));
        const mainData = mainQuerySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMainData(mainData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Filter data when search query changes
    const filtered = labellingData.filter((productData) =>
      productData.Product.toLowerCase().includes(searchQuery) ||
      productData.SKU.toLowerCase().includes(searchQuery) ||
      productData.Variant.toLowerCase().includes(searchQuery) ||
      productData.MainProductSKU.toLowerCase().includes(searchQuery) ||
      productData.Supplier.toLowerCase().includes(searchQuery)
    );
    setFilteredData(filtered);
  }, [searchQuery, labellingData]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProduct((prevState) => {
      const updatedProduct = { ...prevState, [name]: value };
      return updatedProduct;
    });
  };

  const handleAddNew = async (e) => {
    e.preventDefault();
    if (user) {
      try {
        const newProduct = {
          ...product,
          lastUpdated: new Date(),
          updatedBy: user.displayName || (user.email ? user.email.split('@')[0] : ''),
        };
        await addDoc(collection(db, 'labellingData'), newProduct);
        resetForm();
      } catch (error) {
        console.error('Error adding new labelling data:', error);
      }
    }
  };

  const updateLabelCostInMainData = async (MainProductSKU, CostPrice) => {
    // Find the matching SKU in mainData
    const matchingMainProduct = mainData.find(product => product.SKU === MainProductSKU);

    if (matchingMainProduct) {
      // If a match is found, update the LabelCost in mainData
      const docRef = doc(db, 'mainData', matchingMainProduct.id);
      await updateDoc(docRef, { LabelCost: CostPrice });
      console.log(`LabelCost updated to ${CostPrice} for SKU ${MainProductSKU}`);
    } else {
      console.log(`No matching SKU found for MainProductSKU: ${MainProductSKU}`);
    }
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
        const docRef = doc(db, 'labellingData', editingProductId);
        await updateDoc(docRef, updatedProduct);

        // After editing labellingData, update mainData for the matching MainProductSKU
        await updateLabelCostInMainData(updatedProduct.MainProductSKU, updatedProduct.CostPrice);

        resetForm();
      } catch (error) {
        console.error('Error editing labelling data:', error);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      const docRef = doc(db, 'labellingData', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const resetForm = () => {
    setProduct({
      Product: '',
      SKU: '',
      MainProductSKU: '',
      Supplier: '',
      CostPrice: 0,
      lastUpdated: null,
      updatedBy: '',
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
      <h1>Labelling Data</h1>

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
            padding: '8px 15px',
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
              {['Product','SKU', 'Supplier', 'CostPrice'].map((key) => (
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

            <button
              type="submit"
              style={{
                backgroundColor: isEditMode ? '#007bff' : '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                fontSize: '14px',
                borderRadius: '5px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              {isEditMode ? 'Update Product' : 'Add Product'}
            </button>
          </form>
        </div>
      )}
<div style={{ width: '100%' }}>
  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', border: '1px solid #ddd' }}>
    <thead>
      <tr>
        {['Product', 'SKU', 'Supplier', 'Cost Price', 'Last Updated', 'Updated By', 'Actions'].map((header) => (
          <th
  key={header}
  style={{
    backgroundColor: '#fff',
    padding: '8px',
    border: '1px solid #ddd'
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

export default LabellingPage;
