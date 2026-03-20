import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { LogOut, Printer, Users, CheckCircle, Wrench, XCircle, Play, Download, CheckSquare } from 'lucide-react';
import './Admin.scss';
import logoImg from '../../assets/logo.svg';

const Admin = () => {
  const navigate = useNavigate();
  const [printers, setPrinters] = useState([]);
  
  // Utilizatorii sunt doar de formă momentan, deoarece logica noastră de echipe din backend e puțin diferită. 
  // Păstrăm secțiunea de UI ca să nu stricăm designul, dar le lăsăm "fake".
  const [users, setUsers] = useState([
    { id: 101, name: 'Andrei Constantinescu', email: 'andrei@raptor.ro', role: 'admin' },
    { id: 102, name: 'Concurent Test', email: 'concurent@raptor.ro', role: 'user' },
  ]);

  // --- 1. ADUCEREA DATELOR REALE ---
  const fetchPrinters = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3000/api/admin/printers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.status === 401) {
    // Ștergem token-ul vechi ca să nu mai încerce să se logheze automat
    localStorage.removeItem('token'); 
    
    // Îi dăm o alertă vizuală
    alert("Sesiune expirată! Te-ai conectat de pe alt dispozitiv. Vei fi redirecționat către Login.");
    
    // Îl aruncăm efectiv afară din pagină, înapoi la Login
    window.location.href = '/login'; 
    return; // Oprim execuția restului de cod
  }
      
      // Dacă adminul nu e autorizat, îl dăm afară
      if (res.status === 401 || res.status === 403) {
        navigate('/login');
        return;
      }

      // Formatăm datele din Firebase pentru tabel
      const formattedPrinters = data.map(p => {
        let secondsLeft = 0;
        let userName = '-';
        let fileName = '-';

        if (p.teamDetails) {
          userName = p.teamDetails.name || 'Echipă Necunoscută';
          // Dacă are un fișier în Cloudinary, afișăm doar textul 'Descarcă STL'
          fileName = p.teamDetails.fileUrl ? 'Da' : '-';
        }

        if (p.estimatedEndTime) {
          const endTimeMs = p.estimatedEndTime._seconds 
                              ? p.estimatedEndTime._seconds * 1000 
      :   new Date(p.estimatedEndTime).getTime();

           const now = new Date().getTime();
          secondsLeft = Math.max(0, Math.floor((endTimeMs - now) / 1000));
        }

        return {
          id: p.id,
          name: p.name,
          status: p.status, // statusul brut din firebase
          secondsLeft: secondsLeft,
          fileName: fileName,
          user: userName,
          currentTeamId: p.currentTeam, // Avem nevoie de ID-ul echipei pentru download
          fileUrl: p.teamDetails?.fileUrl
        };
      });

      setPrinters(formattedPrinters);
    } catch (error) {
      console.error("Eroare la aducerea imprimantelor pentru admin:", error);
    }
  };

  // --- 2. WEBSOCKETS ȘI TIMER LOCAL ---
  useEffect(() => {
    fetchPrinters();

    const socket = io('http://localhost:3000');
    socket.on('printersUpdated', () => {
      fetchPrinters();
    });

    const timer = setInterval(() => {
      setPrinters(current => current.map(p => {
        if (p.secondsLeft > 0 && p.status === 'occupied') {
          return { ...p, secondsLeft: p.secondsLeft - 1 };
        }
        return p;
      }));
    }, 1000);

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, []);

  const formatTime = (sec) => {
    if (!sec || sec === 0) return "-";
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // --- 3. ACȚIUNI REALE ADMIN ---

  const handleDownload = (teamId) => {
    const token = localStorage.getItem('token');
    // Deschidem link-ul de redirect de la backend într-un tab nou
    window.open(`http://localhost:3000/api/admin/download/${teamId}?token=${token}`, '_blank');
  };

  const handleStartPrint = async (printerId) => {
    const min = prompt("Câte minute durează printul?");
    if (!min || isNaN(min)) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3000/api/admin/assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ printerId, durationInMinutes: parseInt(min) })
      });

      if (res.status === 401) {
    // Ștergem token-ul vechi ca să nu mai încerce să se logheze automat
    localStorage.removeItem('token'); 
    
    // Îi dăm o alertă vizuală
    alert("Sesiune expirată! Te-ai conectat de pe alt dispozitiv. Vei fi redirecționat către Login.");
    
    // Îl aruncăm efectiv afară din pagină, înapoi la Login
    window.location.href = '/login'; 
    return; // Oprim execuția restului de cod
  }
      // Nu dăm refetch aici, pentru că va veni semnalul prin Socket
    } catch (err) {
      alert("Eroare la pornirea printului.");
    }
  };

  const handleCompletePrint = async (printerId) => {
    if(!window.confirm("Sigur vrei să eliberezi imprimanta?")) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3000/api/admin/complete/${printerId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
    // Ștergem token-ul vechi ca să nu mai încerce să se logheze automat
    localStorage.removeItem('token'); 
    
    // Îi dăm o alertă vizuală
    alert("Sesiune expirată! Te-ai conectat de pe alt dispozitiv. Vei fi redirecționat către Login.");
    
    // Îl aruncăm efectiv afară din pagină, înapoi la Login
    window.location.href = '/login'; 
    return; // Oprim execuția restului de cod
  }
    } catch (err) {
      alert("Eroare la eliberare.");
    }
  };

  const toggleMaintenance = async (printerId, currentStatus) => {
    const newStatus = currentStatus === 'maintenance' ? 'free' : 'maintenance';
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3000/api/admin/printers/${printerId}/log`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ message: `Status schimbat manual în ${newStatus}`, status: newStatus })
      });
      if (res.status === 401) {
    // Ștergem token-ul vechi ca să nu mai încerce să se logheze automat
    localStorage.removeItem('token'); 
    
    // Îi dăm o alertă vizuală
    alert("Sesiune expirată! Te-ai conectat de pe alt dispozitiv. Vei fi redirecționat către Login.");
    
    // Îl aruncăm efectiv afară din pagină, înapoi la Login
    window.location.href = '/login'; 
    return; // Oprim execuția restului de cod
  }
    } catch (err) {
      alert("Eroare la schimbarea statusului.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="admin-dashboard-page">
      <header className="admin-header">
        <div className="header-left">
          <img src={logoImg} alt="CAD&CRAFT" className="admin-logo" />
          <div className="admin-title">
            <h1>Panou Control</h1>
            <span className="badge">ADMIN</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} /> Deconectare
        </button>
      </header>

      <main className="admin-content">
        
        {/* SECȚIUNEA 1: IMPRIMANTE */}
        <section className="admin-section">
          <div className="section-header">
            <h2><Printer size={24} /> Management Imprimante</h2>
            <div className="stats">
               Total: {printers.length} | 
               Active: {printers.filter(p => p.status === 'occupied').length} | 
               În Așteptare: {printers.filter(p => p.status === 'pending_admin').length}
            </div>
          </div>
          
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nume Imprimantă</th>
                  <th>Status</th>
                  <th>Echipă</th>
                  <th>Fișier (STL)</th>
                  <th>Timp Rămas</th>
                  <th>Acțiuni Admin</th>
                </tr>
              </thead>
              <tbody>
                {printers.map(printer => (
                  <tr key={printer.id}>
                    <td className="name-col">{printer.name}</td>
                    <td>
                      <span className={`status-badge ${printer.status}`}>
                        {printer.status === 'free' && 'Liberă'}
                        {printer.status === 'reserving' && 'Echipa încarcă...'}
                        {printer.status === 'pending_admin' && 'Așteaptă Start'}
                        {printer.status === 'occupied' && 'În Printare'}
                        {printer.status === 'maintenance' && 'Mentenanță'}
                      </span>
                    </td>
                    <td className="user-col">{printer.user}</td>
                    <td className="file-col">
                      {printer.fileUrl ? (
                        <button className="btn-repair" style={{padding: '5px 10px'}} onClick={() => window.open(printer.fileUrl, '_blank')}>
                          <Download size={16} /> Descarcă
                        </button>
                      ) : '-'}
                    </td>
                    <td className="time-col">{formatTime(printer.secondsLeft)}</td>
                    <td className="actions-col">
  
  {/* 1. BUTON START: Apare DOAR când fișierul este urcat și așteaptă aprobarea */}
  {printer.status === 'pending_admin' && (
    <button 
      className="btn-maintenance" 
      style={{ backgroundColor: '#28a745', color: 'white', border: 'none' }} 
      onClick={() => handleStartPrint(printer.id)}
    >
      <Play size={18} /> Start Print
    </button>
  )}

  {/* 2. BUTON FINALIZAT: Apare DOAR când printarea este efectiv pornită (occupied) */}
  {printer.status === 'occupied' && (
    <button 
      className="btn-repair" 
      style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
      onClick={() => handleCompletePrint(printer.id)} 
      title="Eliberează imprimanta"
    >
      <CheckSquare size={18} /> Finalizează
    </button>
  )}
  
  {/* 3. BUTOANE MENTENANȚĂ: Apar doar dacă imprimanta e liberă sau deja în mentenanță */}
  {(printer.status === 'free' || printer.status === 'maintenance') && (
    printer.status === 'maintenance' ? (
      <button className="btn-repair" onClick={() => toggleMaintenance(printer.id, printer.status)}>
        <CheckCircle size={18} /> Reparată
      </button>
    ) : (
      <button className="btn-maintenance" onClick={() => toggleMaintenance(printer.id, printer.status)}>
        <Wrench size={18} /> Mentenanță
      </button>
    )
  )}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECȚIUNEA 2: UTILIZATORI (UI doar de design momentan) */}
        <section className="admin-section">
          <div className="section-header">
            <h2><Users size={24} /> Management Utilizatori (UI Mockup)</h2>
          </div>
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nume Complet</th>
                  <th>Email</th>
                  <th>Rol Curent</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="name-col">{user.name}</td>
                    <td>{user.email}</td>
                    <td><span className={`role-badge ${user.role}`}>{user.role.toUpperCase()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Admin;