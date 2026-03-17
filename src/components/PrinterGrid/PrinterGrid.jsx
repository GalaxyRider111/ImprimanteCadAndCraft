import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client'; // Trebuie să ai instalat socket.io-client!
import './PrinterGrid.scss';
import { Printer, CheckCircle, Clock, AlertTriangle, User, UploadCloud, X, Wrench } from 'lucide-react';

const PrinterGrid = () => {
  const [printers, setPrinters] = useState([]);
  const [activeUploadId, setActiveUploadId] = useState(null);
  const [reservationToken, setReservationToken] = useState(null); // Aici salvăm cheia primită de la server
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false); // Să arătăm un loading spinner
  const [isDragging, setIsDragging] = useState(false);
  // 1. Funcția care aduce imprimantele din backend
  const fetchPrinters = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/queue/printers');
      const data = await res.json();
      
      // Adaptăm datele din Firebase la formatul pe care îl așteaptă interfața ta
      const formattedPrinters = data.map(p => {
        let status = 'available';
        let title = 'Disponibilă';
        let secondsLeft = 0;

        if (p.status === 'reserving') {
          status = 'booking';
          title = 'Se configurează...';
        } else if (p.status === 'occupied' || p.status === 'printing' || p.status === 'pending_admin') {
          status = 'printing';
          title = p.status === 'pending_admin' ? 'Așteaptă Admin' : 'Printare Activă';
          
          if (p.estimatedEndTime) {
            // Calculăm câte secunde mai sunt până se termină
            const end = new Date(p.estimatedEndTime).getTime();
            const now = new Date().getTime();
            secondsLeft = Math.max(0, Math.floor((end - now) / 1000));
          }
        } else if (p.status === 'maintenance') {
          status = 'maintenance';
          title = 'Mentenanță';
        }

        return {
          id: p.id,
          name: p.name,
          status: status,
          title: title,
          secondsLeft: secondsLeft,
          // Dacă ar avea un teamId asociat în Firebase, am putea pune numele echipei la user
          user: p.status === 'reserving' ? 'În curs...' : null, 
          fileName: '' 
        };
      });

      setPrinters(formattedPrinters);
    } catch (err) {
      console.error("Eroare la aducerea imprimantelor:", err);
    }
  };

  // 2. Conectarea la WebSockets și pornirea cronometrului local
  useEffect(() => {
    // Aducem datele la încărcarea paginii
    fetchPrinters();

    // Ne conectăm la serverul de Sockets
    const socket = io('http://localhost:3000');
    
    // Când serverul strigă "printersUpdated", noi facem iar fetch!
    socket.on('printersUpdated', () => {
      fetchPrinters();
    });

    // Cronometrul care scade secundele local pentru efectul vizual
    const timer = setInterval(() => {
      setPrinters(currentPrinters => 
        currentPrinters.map(printer => {
          if (printer.secondsLeft > 0 && printer.status !== 'maintenance') {
            return { ...printer, secondsLeft: printer.secondsLeft - 1 };
          }
          return printer;
        })
      );
    }, 1000);

    return () => {
      clearInterval(timer);
      socket.disconnect(); // Curățăm conexiunea la ieșirea din pagină
    };
  }, []);

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "--:--";
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // 3. Când dă click pe "Rezervă Acum"
  const handleReserveClick = async (printerId) => {
    setErrorMsg('');
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`http://localhost:3000/api/queue/lock/${printerId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        // Dacă a reușit să blocheze imprimanta, salvăm token-ul temporar și deschidem fereastra de Upload
        setReservationToken(data.reservationToken);
        setActiveUploadId(printerId);
        // Serverul a trimis deja prin Socket semnalul către ceilalți că imprimanta e 'reserving'
      } else {
        // Dacă echipa mai are alta rezervată sau la print, afișăm eroarea
        setErrorMsg(data.message);
        alert(data.message); // Temporar, folosim un simplu alert.
      }
    } catch (err) {
      console.error(err);
      alert('Eroare de conexiune la blocarea imprimantei.');
    }
  };

  // Această funcție o vom lega de încărcarea fișierului real (în pasul următor)
  const handlePrint = async (printerId) => {
    if (!selectedFile) {
      alert("Te rog să selectezi un fișier .stl mai întâi!");
      return;
    }

    setIsUploading(true);
    const token = localStorage.getItem('token');
    
    // Pregătim "pachetul" pentru server
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('printerId', printerId);
    formData.append('reservationToken', reservationToken);
    formData.append('wantsToBePresent', 'true'); // Presupunem că vrea să fie prezent

    try {
      const res = await fetch('http://localhost:3000/api/queue/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // ATENȚIE: La FormData NU punem 'Content-Type': 'application/json'
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        alert("Fișier trimis cu succes! Așteptăm aprobarea Adminului.");
        setActiveUploadId(null);
        setSelectedFile(null);
        setReservationToken(null);
        // Serverul va emite 'printersUpdated' și imprimanta se va face Roșie/Printare Activă
      } else {
        alert("Eroare: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Eroare la trimiterea fișierului.");
    } finally {
      setIsUploading(false);
    }
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

  // --- FUNCȚII PENTRU DRAG & DROP ---
  const handleDragOver = (e) => {
    e.preventDefault(); // Oprește browserul din a deschide fișierul
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Prindem fișierul aruncat
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="printer-grid-container">
      {printers.length === 0 ? <p style={{textAlign: 'center', width: '100%'}}>Se încarcă imprimantele...</p> : null}
      
      {printers.map((printer) => (
        <div key={printer.id} className={`printer-card ${printer.status}`}>
          
          {/* Am ascuns numărul dacă ID-ul e un string lung (cum e la Firebase) */}
          <span className="printer-number" style={{ fontSize: '12px' }}>{printer.name.split(' ')[0]}</span>

          {/* DISPLAY PRINCIPAL */}
          <div className="status-display">
            <div className="icon-wrapper">
              {getIcon(printer.status)}
            </div>
            
            <h3>{printer.name}</h3>
            
            <div className="info-block">
                <div className="status-pill">{printer.title}</div>
                
                {printer.status === 'printing' && printer.secondsLeft > 0 && (
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
                    <p style={{ fontWeight: 'bold', marginTop: '10px' }}>{printer.fileName || 'Fișier în lucru'}</p>
                    <div className="user-badge"><User size={12}/> Echipa ta/Alta</div>
                  </>
                )}
                
                {printer.status === 'available' && (
                   <button className="action-btn" onClick={() => handleReserveClick(printer.id)}>Rezervă Acum</button>
                )}

                {/* STATUS: BOOKING (GALBEN/PORTOCALIU) */}
                {printer.status === 'booking' && (
                  <>
                    <AlertTriangle size={32} className="mb-2 icon-warn" />
                    <h4>Se configurează</h4>
                    <p className="locked-user">De către o echipă</p>
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
            <button className="close-btn" onClick={() => { setActiveUploadId(null); setReservationToken(null); }}><X /></button>
            <h3>Setup {printer.name}</h3>
            
            <div 
              className="drag-drop-area" 
              style={{ 
                position: 'relative',
                border: isDragging ? '2px dashed #0056b3' : '', // Se face albastră când tragi un fișier
                backgroundColor: isDragging ? 'rgba(0, 86, 179, 0.05)' : ''
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <UploadCloud size={40} className="cloud-icon" color={isDragging ? '#0056b3' : 'currentColor'}/>
              
              <p>{selectedFile ? selectedFile.name : "Trage fișierul STL aici sau apasă"}</p>
              
              <input 
                type="file" 
                accept=".stl,.txt,.jpg"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                }}
              />
            </div>
            
            <button 
              className="confirm-print-btn"
              onClick={() => handlePrint(printer.id)}
            >
              ÎNCARCĂ FIȘIER
            </button>
          </div>

        </div>
      ))}
    </div>
  );
};

export default PrinterGrid;