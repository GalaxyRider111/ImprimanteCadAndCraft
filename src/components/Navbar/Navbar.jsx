import React from 'react';
import './Navbar.scss';
import { LogOut, User } from 'lucide-react';
// Importăm logo-ul din assets. 
// ".." ne scoate din folderul Navbar, al doilea ".." ne scoate din components -> ajungem in src
import logoImg from '../../assets/logo.svg'; 

const Navbar = ({ userName, onLogout }) => {
  return (
    <nav className="navbar">
      
      {/* ZONA STÂNGA: Logo Image în Box */}
      <div className="navbar-left">
        <div className="logo-box">
          <img src={logoImg} alt="CAD&CRAFT Logo" className="logo-img" />
        </div>
      </div>

      {/* ZONA DREAPTA: User și Logout */}
      <div className="navbar-right">
        <div className="user-info">
          <User size={20} />
          <span>{userName}</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} />
          <span>Deconectare</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;