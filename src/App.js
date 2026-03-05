import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importăm paginile noastre
import Login from './pages/Login/Login';
import Admin from './pages/Admin/Admin';
import Dashboard from './pages/Dashboard/Dashboard'; // Acesta este codul tău vechi din App.js mutat aici!

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect automat către Login când intri pe site */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;