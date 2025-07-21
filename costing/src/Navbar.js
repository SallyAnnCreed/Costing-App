import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    if (window.confirm("Are you sure you want to log out?")) {
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Costing App</div>
      <ul className="navbar-links">
        <li><Link to="/main" className="nav-link">Home</Link></li>
        <li><Link to="/labelling" className="nav-link">Labelling</Link></li>
        <li><Link to="/packaging" className="nav-link">Packaging</Link></li>
        <li><Link to="/raw-materials" className="nav-link">Raw Materials</Link></li>
        <li><Link to="/archive" className="nav-link">Archive</Link></li>
        <li>
          <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
