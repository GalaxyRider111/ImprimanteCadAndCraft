import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react';
import './Login.scss';
import logoImg from '../../assets/logo.svg';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulare login: Dacă e admin@test.com merge la admin, altfel la dashboard
    if (email === 'admin@test.com') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          {/* --- MODIFICARE AICI: Imaginea este directă, fără container --- */}
          <img src={logoImg} alt="CAD&CRAFT Logo" className="login-logo-clean" />
          
          <h2>Bine ai venit!</h2>
          <p>Autentifică-te pentru a accesa platforma</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>Email</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input 
                type="email" 
                placeholder="nume@mail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Parolă</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="login-btn">
            <LogIn size={20} />
            <span>Intră în cont</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;