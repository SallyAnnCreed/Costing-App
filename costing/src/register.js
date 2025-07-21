// src/register.js
import React, { useState } from 'react';
import { auth, createUserWithEmailAndPassword } from './firebase'; 
import './styles.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!email.endsWith('@sallyanncreed.co.za')) {
      setError('Please use a valid email like yourname@sallyanncreed.co.za');
      return;
    }

    setLoading(true); 

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log("User created successfully!");
    } catch (error) {
      setError(error.message); 
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="main-content"> {/* This is key for centering */}
      <div className="container">
        <h1>Register</h1>
        <form onSubmit={handleRegister}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <a href="/login">Already have an account? Login</a>
      </div>
    </div>
  );
};

export default Register;
