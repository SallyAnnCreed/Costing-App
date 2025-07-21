// src/login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, signInWithEmailAndPassword } from './firebase';
import './styles.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 
  const navigate = useNavigate(); 

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("User signed in successfully!");
      navigate('/main'); 
    } catch (error) {
      setError(error.message); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content"> {/* Needed for proper centering */}
      <div className="container">
        <h1>Login</h1>
        <form onSubmit={handleLogin}>
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <a href="/register">Don't have an account? Register</a>
      </div>
    </div>
  );
};

export default Login;
