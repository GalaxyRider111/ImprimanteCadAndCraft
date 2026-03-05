import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Printer, Users, AlertCircle, CheckCircle, Wrench, XCircle } from 'lucide-react';
import './Admin.scss';
import logoImg from '../../assets/logo.svg';

const Admin = () => {
  const navigate = useNavigate();

  // --- STATE: IMPRIMANTE (Toate cele 20) ---
  const [printers, setPrinters] = useState([
    { id: 1, name: 'Prusa MK4 #1', status: 'printing', secondsLeft: 4681, fileName: 'roti_robot.stl', user: 'Matei Popa' },
    { id: 2, name: 'Prusa MK4 #2', status: 'available', secondsLeft: 0, fileName: null, user: null },
    { id: 3, name: 'Prusa Mini #1', status: 'available', secondsLeft: 0, fileName: null, user: null },
    { id: 4, name: 'Prusa Mini #2', status: 'booking', secondsLeft: 240, fileName: 'setup...', user: 'Elena Vlad' },
    { id: 5, name: 'Prusa XL', status: 'printing', secondsLeft: 12400, fileName: 'chassis_v3.stl', user: 'Andrei C.' },
    { id: 6, name: 'Bambu X1C #1', status: 'printing', secondsLeft: 1200, fileName: 'drone_frame.stl', user: 'Victor M.' },
    { id: 7, name: 'Bambu X1C #2', status: 'available', secondsLeft: 0, fileName: null, user: null },
    { id: 8, name: 'Bambu P1P #1', status: 'available', secondsLeft: 0, fileName: null, user: null },
    { id: 9, name: 'Bambu P1P #2', status: 'booking', secondsLeft: 180, fileName: 'setup...', user: 'Alexandru D.' },
    { id: 10, name: 'Bambu A1 Mini', status: 'available', secondsLeft: 0, fileName: null, user: null },
    { id: 11, name: 'Ender 3 V3 #1', status: 'maintenance', secondsLeft: 0, fileName: null, user: null },
    { id: 12, name: 'Ender 3 V3 #2', status: 'available', secondsLeft: 0, fileName: null, user: null },
    { id: 13, name: 'Ender 5 Plus', status: 'printing', secondsLeft: 8400, fileName: 'helmet_prop.stl', user: 'Cosmin R.' },
    { id: 14, name: 'CR-10 Smart', status: 'available', secondsLeft: 0, fileName: null, user: null },
    { id: 15, name: 'K1 Max', status: 'booking', secondsLeft: 60, fileName: 'setup...', user: 'Diana F.' },
    { id: 16, name: 'Anycubic Mono', status: 'available', secondsLeft: 0, fileName: null, user: null },
    { id: 17, name: 'Elegoo Saturn', status: 'printing', secondsLeft: 3600, fileName: 'miniature.stl', user: 'Vlad T.' },
    { id: 18, name: 'Formlabs 3+', status: 'maintenance', secondsLeft: 0, fileName: null, user: null },
    { id: 19, name: 'Voron 2.4', status: 'printing', secondsLeft: 500, fileName: 'gear_test.stl', user: 'Admin' },
    { id: 20, name: 'RatRig V-Core', status: 'available', secondsLeft: 0, fileName: null, user: null },
  ]);

  // --- STATE: UTILIZATORI ---
  const [users, setUsers] = useState([
    { id: 101, name: 'Andrei Constantinescu', email: 'andrei@raptor.ro', role: 'admin' },
    { id: 102, name: 'Matei Popa', email: 'matei@raptor.ro', role: 'user' },
    { id: 103, name: 'Elena Vlad', email: 'elena@raptor.ro', role: 'user' },
    { id: 104, name: 'Victor Munteanu', email: 'victor@raptor.ro', role: 'user' },
    { id: 105, name: 'Cosmin Radu', email: 'cosmin@raptor.ro', role: 'admin' },
  ]);

  // --- TIMER SIMPLIFICAT (scade timpul pt cele active) ---
  useEffect(() => {
    const timer = setInterval(() => {
      setPrinters(current => current.map(p => {
        if (p.secondsLeft > 0 && p.status !== 'maintenance') {
          return { ...p, secondsLeft: p.secondsLeft - 1 };
        }
        if (p.secondsLeft === 0 && p.status === 'booking') {
          return { ...p, status: 'available', user: null, fileName: null };
        }
        return p;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (sec) => {
    if (!sec) return "-";
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // --- ACȚIUNI IMPRIMANTE ---
  const cancelPrint = (id) => {
    if(window.confirm("Sigur vrei să anulezi acest print/rezervare?")) {
      setPrinters(current => current.map(p => 
        p.id === id ? { ...p, status: 'available', secondsLeft: 0, user: null, fileName: null } : p
      ));
    }
  };

  const toggleMaintenance = (id, currentStatus) => {
    setPrinters(current => current.map(p => {
      if (p.id === id) {
        if (currentStatus === 'maintenance') {
          return { ...p, status: 'available' };
        } else {
          return { ...p, status: 'maintenance', secondsLeft: 0, user: null, fileName: null };
        }
      }
      return p;
    }));
  };

  // --- ACȚIUNI UTILIZATORI ---
  const changeUserRole = (id, newRole) => {
    setUsers(current => current.map(u => 
      u.id === id ? { ...u, role: newRole } : u
    ));
  };

  return (
    <div className="admin-dashboard-page">
      {/* HEADER SIMPLU ȘI CURAT */}
      <header className="admin-header">
        <div className="header-left">
          <img src={logoImg} alt="CAD&CRAFT" className="admin-logo" />
          <div className="admin-title">
            <h1>Panou Control</h1>
            <span className="badge">ADMIN</span>
          </div>
        </div>
        <button className="logout-btn" onClick={() => navigate('/login')}>
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
               Active: {printers.filter(p => p.status === 'printing').length} | 
               Mentenanță: {printers.filter(p => p.status === 'maintenance').length}
            </div>
          </div>
          
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Imprimantă</th>
                  <th>Status</th>
                  <th>Utilizator</th>
                  <th>Fișier</th>
                  <th>Timp Rămas</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {printers.map(printer => (
                  <tr key={printer.id}>
                    <td className="id-col">#{printer.id}</td>
                    <td className="name-col">{printer.name}</td>
                    <td>
                      <span className={`status-badge ${printer.status}`}>
                        {printer.status === 'printing' && 'În Printare'}
                        {printer.status === 'available' && 'Liberă'}
                        {printer.status === 'booking' && 'Configurare'}
                        {printer.status === 'maintenance' && 'Mentenanță'}
                      </span>
                    </td>
                    <td className="user-col">{printer.user || '-'}</td>
                    <td className="file-col">{printer.fileName || '-'}</td>
                    <td className="time-col">{formatTime(printer.secondsLeft)}</td>
                    <td className="actions-col">
                      {(printer.status === 'printing' || printer.status === 'booking') && (
                        <button className="btn-cancel" onClick={() => cancelPrint(printer.id)} title="Anulează">
                          <XCircle size={18} /> Anulează
                        </button>
                      )}
                      
                      {printer.status === 'maintenance' ? (
                        <button className="btn-repair" onClick={() => toggleMaintenance(printer.id, printer.status)}>
                          <CheckCircle size={18} /> Reparata (Activare)
                        </button>
                      ) : (
                        <button className="btn-maintenance" onClick={() => toggleMaintenance(printer.id, printer.status)} title="Pune în mentenanță">
                          <Wrench size={18} /> Mentenanță
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECȚIUNEA 2: UTILIZATORI */}
        <section className="admin-section">
          <div className="section-header">
            <h2><Users size={24} /> Management Utilizatori</h2>
          </div>
          
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nume Complet</th>
                  <th>Email</th>
                  <th>Rol Curent</th>
                  <th>Modifică Rol</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="name-col">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="actions-col">
                      <select 
                        className="role-select" 
                        value={user.role} 
                        onChange={(e) => changeUserRole(user.id, e.target.value)}
                      >
                        <option value="user">USER</option>
                        <option value="admin">ADMIN</option>
                      </select>
                    </td>
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