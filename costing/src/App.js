// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './login';
import Register from './register';
import MainPage from './MainPage'; 
import LabellingPage from './LabellingPage';
import RawMaterialsPage from './RawMaterialsPage';
import PackagingPage from './PackagingPage';
import ArchivePage from './ArchivePage'; // ✅ Correctly imported
import Navbar from './Navbar';
import 'font-awesome/css/font-awesome.min.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/main" element={<><Navbar /><MainPage /></>} />
        <Route path="/labelling" element={<><Navbar /><LabellingPage /></>} />
        <Route path="/packaging" element={<><Navbar /><PackagingPage /></>} />
        <Route path="/raw-materials" element={<><Navbar /><RawMaterialsPage /></>} />
        <Route path="/archive" element={<><Navbar /><ArchivePage /></>} /> {/* ✅ Corrected */}
      </Routes>
    </Router>
  );
};

export default App;
