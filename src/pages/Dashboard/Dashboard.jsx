import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar.jsx'; 
import PrinterGrid from '../../components/PrinterGrid/PrinterGrid.jsx'; 

function Dashboard() {
  const navigate = useNavigate();
  const userName = "Andrei Constantinescu";

  // Funcția pentru butonul de logout din Navbar
  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="dashboard-page">
      {/* Background Blobs (dacă le mai folosești) */}
      <div className="blob-container">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <Navbar 
        userName={userName} 
        onLogout={handleLogout} 
      />

      {/* Main Content */}
      <main style={{ 
        maxWidth: '1200px', 
        margin: '40px auto', 
        padding: '20px' 
      }}>
        
        {/* Titlu Secțiune */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '40px', 
          color: '#003566' 
        }}>
          <h1 style={{ fontFamily: 'Montserrat', fontSize: '2.5rem', margin: 0, fontWeight: 800 }}>
            Status Imprimante
          </h1>
          <p style={{ fontFamily: 'Open Sans', fontSize: '1.1rem', color: '#1D1D1D' }}>
            Treci cu mouse-ul peste carduri pentru detalii
          </p>
        </div>

        {/* Componenta Grid Imprimante */}
        <PrinterGrid />

      </main>
    </div>
  );
}

export default Dashboard;