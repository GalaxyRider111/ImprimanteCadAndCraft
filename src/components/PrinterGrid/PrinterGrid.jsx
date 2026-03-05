import React, { useState, useEffect } from 'react';
import './PrinterGrid.scss';
import { Printer, CheckCircle, Clock, AlertTriangle, User, UploadCloud, X, Wrench } from 'lucide-react';

const PrinterGrid = () => {
  const [activeUploadId, setActiveUploadId] = useState(null);

  // --- INITIAL DATA (20 IMPRIMANTE) ---
  const initialPrinters = [
    // CATEGORIA A - PRUSA
    { id: 1, name: 'Prusa MK4 #1', status: 'printing', title: 'Printare Activă', secondsLeft: 4681, fileName: 'roti_robot.stl', user: 'Andrei' },
    { id: 2, name: 'Prusa MK4 #2', status: 'available', title: 'Disponibilă', secondsLeft: 0 },
    { id: 3, name: 'Prusa Mini #1', status: 'available', title: 'Disponibilă', secondsLeft: 0 },
    { id: 4, name: 'Prusa Mini #2', status: 'booking', title: 'Se configurează...', secondsLeft: 240, user: 'Matei', fileName: 'setup...' },
    { id: 5, name: 'Prusa XL', status: 'printing', title: 'Printare Activă', secondsLeft: 12400, fileName: 'chassis_v3.stl', user: 'Elena' },

    // CATEGORIA B - BAMBU
    { id: 6, name: 'Bambu X1C #1', status: 'printing', title: 'Printare Activă', secondsLeft: 1200, fileName: 'drone_frame.stl', user: 'Victor' },
    { id: 7, name: 'Bambu X1C #2', status: 'available', title: 'Disponibilă', secondsLeft: 0 },
    { id: 8, name: 'Bambu P1P #1', status: 'available', title: 'Disponibilă', secondsLeft: 0 },
    { id: 9, name: 'Bambu P1P #2', status: 'booking', title: 'Se configurează...', secondsLeft: 180, user: 'Echipa 5', fileName: 'setup...' },
    { id: 10, name: 'Bambu A1 Mini', status: 'available', title: 'Disponibilă', secondsLeft: 0 },

    // CATEGORIA C - CREALITY
    { id: 11, name: 'Ender 3 V3 #1', status: 'maintenance', title: 'Mentenanță', secondsLeft: 0 },
    { id: 12, name: 'Ender 3 V3 #2', status: 'available', title: 'Disponibilă', secondsLeft: 0 },
    { id: 13, name: 'Ender 5 Plus', status: 'printing', title: 'Printare Activă', secondsLeft: 8400, fileName: 'helmet_prop.stl', user: 'Cosmin' },
    { id: 14, name: 'CR-10 Smart', status: 'available', title: 'Disponibilă', secondsLeft: 0 },
    { id: 15, name: 'K1 Max', status: 'booking', title: 'Se configurează...', secondsLeft: 60, user: 'Alex', fileName: 'setup...' },

    // CATEGORIA D - RESIN & ALTELE
    { id: 16, name: 'Anycubic Mono', status: 'available', title: 'Disponibilă', secondsLeft: 0 },
    { id: 17, name: 'Elegoo Saturn', status: 'printing', title: 'Printare Activă', secondsLeft: 3600, fileName: 'miniature_dnd.stl', user: 'Diana' },
    { id: 18, name: 'Formlabs 3+', status: 'maintenance', title: 'Mentenanță', secondsLeft: 0 },
    { id: 19, name: 'Voron 2.4', status: 'printing', title: 'Printare Activă', secondsLeft: 500, fileName: 'gear_test.stl', user: 'Admin' },
    { id: 20, name: 'RatRig V-Core', status: 'available', title: 'Disponibilă', secondsLeft: 0 },
  ];

  const [printers, setPrinters] = useState(initialPrinters);

  // --- LOGICA TIMER ---
  useEffect(() => {
    const timer = setInterval(() => {
      setPrinters(currentPrinters => 
        currentPrinters.map(printer => {
          // Scădem timpul dacă e activă
          if (printer.secondsLeft > 0 && printer.status !== 'maintenance') {
            return { ...printer, secondsLeft: printer.secondsLeft - 1 };
          }
          // Dacă timpul expiră la booking, o facem din nou verde (disponibilă)
          if (printer.secondsLeft === 0 && printer.status === 'booking') {
             return { ...printer, status: 'available', title: 'Disponibilă', user: null };
          }
          return printer;
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const toggleUpload = (id) => setActiveUploadId(activeUploadId === id ? null : id);

  // --- FUNCȚIA NOUĂ: HANDLE PRINT ---
  const handlePrint = (id) => {
    // 1. Închidem fereastra de upload
    setActiveUploadId(null);

    // 2. Modificăm statusul imprimantei specifice
    setPrinters(currentPrinters =>
      currentPrinters.map(printer => {
        if (printer.id === id) {
          return {
            ...printer,
            status: 'booking', // O facem GALBENĂ (booking)
            title: 'Configurare...', // Schimbăm titlul
            secondsLeft: 300, // Îi dăm 5 minute (300 secunde)
            user: 'Eu (Tu)' // Arătăm că tu ai rezervat-o
          };
        }
        return printer;
      })
    );
  };

  const getIcon = (status) => {
    switch(status) {
      case 'available': return <CheckCircle size={36} strokeWidth={2.5} />;
      case 'printing': return <Printer size={36} strokeWidth={2.5} />;
      case 'booking': return <AlertTriangle size={36} strokeWidth={2.5} />;
      case 'maintenance': return <Wrench size={36} strokeWidth={2.5} />;
      default: return <Printer size={36} />;
    }
  };

  return (
    <div className="printer-grid-container">
      {printers.map((printer) => (
        <div key={printer.id} className={`printer-card ${printer.status}`}>
          
          <span className="printer-number">{printer.id}</span>

          {/* DISPLAY PRINCIPAL */}
          <div className="status-display">
            <div className="icon-wrapper">
              {getIcon(printer.status)}
            </div>
            
            <h3>{printer.name}</h3>
            
            <div className="info-block">
                <div className="status-pill">{printer.title}</div>
                
                {printer.status === 'printing' && (
                   <div className="mini-timer">{formatTime(printer.secondsLeft)}</div>
                )}
            </div>
          </div>

          {/* SLIDE DOWN PANEL (Hover) */}
          <div className={`slide-panel ${activeUploadId === printer.id ? 'hidden' : ''}`}>
             <div className="panel-content">
                {printer.status === 'printing' && (
                  <>
                    <Clock size={32} className="mb-2" />
                    <h2 style={{ fontSize: '2rem', margin: '5px 0' }}>{formatTime(printer.secondsLeft)}</h2>
                    <p style={{ opacity: 0.8 }}>Rămas</p>
                    <p style={{ fontWeight: 'bold', marginTop: '10px' }}>{printer.fileName}</p>
                    <div className="user-badge"><User size={12}/> {printer.user}</div>
                  </>
                )}
                
                {printer.status === 'available' && (
                   <button className="action-btn" onClick={() => toggleUpload(printer.id)}>Rezervă Acum</button>
                )}

                {/* STATUS: BOOKING (GALBEN/PORTOCALIU) */}
                {printer.status === 'booking' && (
                  <>
                    <AlertTriangle size={32} className="mb-2 icon-warn" />
                    <h4>Configurare în curs</h4>
                    <p className="locked-user">De către: <strong>{printer.user}</strong></p>
                    <p>Expiră în: {formatTime(printer.secondsLeft)}</p>
                  </>
                )}

                {printer.status === 'maintenance' && (
                  <>
                    <Wrench size={32} className="mb-2" />
                    <h4>Mentenanță</h4>
                    <p>Indisponibilă momentan.</p>
                  </>
                )}
             </div>
          </div>

          {/* UPLOAD OVERLAY */}
          <div className={`upload-overlay ${activeUploadId === printer.id ? 'active' : ''}`}>
            <button className="close-btn" onClick={() => setActiveUploadId(null)}><X /></button>
            <h3>Setup {printer.name}</h3>
            <div className="drag-drop-area">
              <UploadCloud size={40} className="cloud-icon"/>
              <p>Drag & Drop .STL</p>
            </div>
            
            {/* AICI AM MODIFICAT BUTONUL SĂ APELEZE FUNCȚIA HANDLE PRINT */}
            <button 
              className="confirm-print-btn"
              onClick={() => handlePrint(printer.id)}
            >
              PRINT
            </button>
          </div>

        </div>
      ))}
    </div>
  );
};

export default PrinterGrid;