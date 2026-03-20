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
      const token = localStorage.getItem('token');
      // Aducem și ID-ul nostru din token pentru a ști cine suntem "noi"
      const decodedToken = token ? JSON.parse(atob(token.split('.')[1])) : null;
      const myTeamId = decodedToken ? decodedToken.teamId : null;

      const res = await fetch('http://localhost:3000/api/queue/printers');
      const data = await res.json();

      const savedRes = localStorage.getItem('activeReservation');
      if (savedRes) {
        try {
          const { printerId } = JSON.parse(savedRes);
          // Căutăm imprimanta în datele proaspete venite de la backend
          const realPrinter = data.find(p => p.id === printerId);
          
          // Dacă imprimanta a devenit liberă ('free') în backend, dar noi o aveam salvată,
          // înseamnă că timpul a expirat! Ștergem fantoma din browser.
          if (realPrinter && realPrinter.status !== 'reserving') {
             console.log("🧹 Backend-ul a anulat rezervarea. Curățăm memoria browserului.");
             localStorage.removeItem('activeReservation');
             setActiveUploadId(null);
             setReservationToken(null);
             setSelectedFile(null);
          }
        } catch (e) {
          console.error("Eroare la parsarea localStorage", e);
        }
      }


      if (res.status === 401) {
        localStorage.removeItem('token'); 
        alert("Sesiune expirată! Te-ai conectat de pe alt dispozitiv. Vei fi redirecționat către Login.");
        window.location.href = '/login'; 
        return; 
      }
      
      const formattedPrinters = data.map(p => {
        let status = 'available';
        let title = 'Disponibilă';
        let secondsLeft = 0;
        let printingUser = null; // Aici vom salva cine printează

        if (p.status === 'reserving') {
          status = 'booking';
          title = 'Se configurează...';
        } else if (p.status === 'occupied' || p.status === 'printing' || p.status === 'pending_admin') {
          status = 'printing';
          title = p.status === 'pending_admin' ? 'Așteaptă Admin' : 'Printare Activă';
          
          if (p.estimatedEndTime) {
            const endTimeMs = p.estimatedEndTime._seconds 
                              ? p.estimatedEndTime._seconds * 1000 
                              : new Date(p.estimatedEndTime).getTime();

            const now = new Date().getTime();
          
            secondsLeft = Math.max(0, Math.floor((endTimeMs - now) / 1000));
          }

          // --- LOGICA NOUĂ PENTRU NUME ECHIPĂ ---
          if (p.currentTeam === myTeamId) {
             // Dacă e echipa noastră, nu ne interesează altceva!
             printingUser = "Echipa ta";
          } else if (p.teamDetails && p.teamDetails.teamName) {
             // Dacă e altă echipă ȘI backend-ul ne-a trimis numele
             printingUser = p.teamDetails.teamName;
          } else {
             // Dacă e altă echipă dar backend-ul nu ne-a trimis numele încă
             printingUser = 'Altă echipă';
          }
          // --------------------------------------

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
          user: p.status === 'reserving' ? 'În curs...' : printingUser, // Folosim variabila noastră aici!
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

    const savedRes = localStorage.getItem('activeReservation');
    if (savedRes) {
      try {
        const { printerId, token } = JSON.parse(savedRes);
        setActiveUploadId(printerId);
        setReservationToken(token);
      } catch (e) {
        console.error("Eroare la citirea rezervării din memorie.");
      }
    }

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

  // Efect care urmărește timpul rezervării active
  useEffect(() => {
    // Verificăm dacă utilizatorul are o rezervare în curs chiar acum
    if (activeUploadId) {
      const myPrinter = printers.find(p => p.id === activeUploadId);
      
      // Dacă imprimanta există și timpul ei a ajuns la 0 (sau mai puțin)
      if (myPrinter && 
        myPrinter.status === 'reserving' && 
        myPrinter.secondsLeft !== undefined && 
        myPrinter.secondsLeft <= 0) {
        console.log("⏳ Timpul a expirat! Anulăm rezervarea automat...");
        
        // Apelăm exact aceeași funcție pe care o folosește butonul "X"
        handleCancelReservation(activeUploadId);
        
        // Opțional: Poți afișa un mesaj ca să știe de ce i s-a închis fereastra
        alert("Timpul alocat pentru încărcarea fișierului a expirat. Imprimanta a fost eliberată.");
      }
    }
  }, [printers, activeUploadId]); // Se rulează de fiecare dată când "printers" (cronometrul) se actualizează

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

      if (res.status === 401) {
    // Ștergem token-ul vechi ca să nu mai încerce să se logheze automat
    localStorage.removeItem('token'); 
    
    // Îi dăm o alertă vizuală
    alert("Sesiune expirată! Te-ai conectat de pe alt dispozitiv. Vei fi redirecționat către Login.");
    
    // Îl aruncăm efectiv afară din pagină, înapoi la Login
    window.location.href = '/login'; 
    return; // Oprim execuția restului de cod
  }

      if (res.ok) {
        // Dacă a reușit să blocheze imprimanta, salvăm token-ul temporar și deschidem fereastra de Upload
        setReservationToken(data.reservationToken);
        setActiveUploadId(printerId);

        localStorage.setItem('activeReservation', JSON.stringify({
          printerId: printerId,
          token: data.reservationToken
        }));

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

  // Funcția care anulează rezervarea când apeși pe X
  const handleCancelReservation = async (printerId) => {
    // 1. Închidem instantaneu interfața (UX bun, pare că se mișcă super rapid)
    setActiveUploadId(null);
    setReservationToken(null);
    setSelectedFile(null);

    localStorage.removeItem('activeReservation');

    // 2. Trimitem semnalul la server să o deblocheze în baza de date
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3000/api/queue/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ printerId })
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
      // Nu trebuie să facem nimic altceva, de îndată ce serverul primește cererea, 
      // va da update și Socket-ul o va face verde pentru toată lumea automat!
    } catch (error) {
      console.error("Eroare la deblocarea imprimantei:", error);
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

      if (res.status === 401) {
    // Ștergem token-ul vechi ca să nu mai încerce să se logheze automat
    localStorage.removeItem('token'); 
    
    // Îi dăm o alertă vizuală
    alert("Sesiune expirată! Te-ai conectat de pe alt dispozitiv. Vei fi redirecționat către Login.");
    
    // Îl aruncăm efectiv afară din pagină, înapoi la Login
    window.location.href = '/login'; 
    return; // Oprim execuția restului de cod
  }

      const data = await res.json();

      if (res.ok) {
        alert("Fișier trimis cu succes! Așteptăm aprobarea Adminului.");
        setActiveUploadId(null);
        setSelectedFile(null);
        setReservationToken(null);


        localStorage.removeItem('activeReservation');

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
                    <div className="user-badge" style={{ backgroundColor: printer.user === 'Echipa ta' ? '#28a745' : '#6c757d', color: 'white' }}>
                      <User size={12} style={{ marginRight: '5px' }}/> 
                      {printer.user}
                    </div>
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
            <button className="close-btn" onClick={() => handleCancelReservation(printer.id)}><X /></button>            <h3>Setup {printer.name}</h3>
            
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
                accept=".stl"  
                onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                // Dublă verificare în JavaScript
                  if (!file.name.toLowerCase().endsWith('.stl')) {
                    alert("Te rugăm să încarci doar fișiere cu extensia .stl!");
                    e.target.value = ''; // Resetăm input-ul
                    setSelectedFile(null);
                    return;
                  }
                  setSelectedFile(file);
                }
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