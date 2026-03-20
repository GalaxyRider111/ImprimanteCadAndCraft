import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, KeyRound } from 'lucide-react'; // Am înlocuit Mail cu User și am adăugat KeyRound
import './Login.scss';
import logoImg from '../../assets/logo.svg';

const Login = () => {
  const navigate = useNavigate();
  
  // Stările pentru formularul de login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Stările noi pentru logica de backend
  const [error, setError] = useState('');
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [tempToken, setTempToken] = useState(''); // Păstrăm temporar token-ul până schimbă parola

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Încercăm mai întâi să ne logăm ca Participant
      let res = await fetch('http://localhost:3000/api/auth/participant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
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
      let data = await res.json();

      if (res.ok) {
        // Dacă e prima logare, oprim navigarea și afișăm formularul de schimbare parolă
        if (data.requirePasswordChange) {
          setTempToken(data.token);
          setNeedsPasswordChange(true);
          return;
        }
        
        // Dacă a mai intrat pe cont, îl lăsăm direct în Dashboard
        localStorage.setItem('token', data.token);
        localStorage.setItem('teamId', data.teamId);
        localStorage.setItem('role', 'participant');
        navigate('/dashboard');
        return;
      }

      // 2. Dacă username-ul nu există la participanți, încercăm la Admin
      if (data.message === "Username incorect.") {
        const adminRes = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (adminRes.status === 401) {
    // Ștergem token-ul vechi ca să nu mai încerce să se logheze automat
    localStorage.removeItem('token'); 
    
    // Îi dăm o alertă vizuală
    alert("Sesiune expirată! Te-ai conectat de pe alt dispozitiv. Vei fi redirecționat către Login.");
    
    // Îl aruncăm efectiv afară din pagină, înapoi la Login
    window.location.href = '/login'; 
    return; // Oprim execuția restului de cod
  }
        const adminData = await adminRes.json();

        if (adminRes.ok) {
          localStorage.setItem('token', adminData.token);
          localStorage.setItem('role', 'admin');
          navigate('/admin');
          return;
        } else {
          setError(adminData.message || adminData.error || 'Parolă admin greșită.');
          return;
        }
      }

      // 3. Dacă e altă eroare (ex: Parolă participant greșită)
      setError(data.message || 'Eroare la autentificare');

    } catch (err) {
      setError('Nu s-a putut conecta la server. Verifică dacă backend-ul este pornit.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}` 
        },
        // --- MODIFICARE AICI: Trimitem și parola veche, pe care o avem deja în state! ---
        body: JSON.stringify({ 
          username: username, 
          oldPassword: password, 
          newPassword: newPassword 
        })
      });

      // --- MODIFICARE AICI: Citim răspunsul ÎNAINTE să dăm kick ---
      const data = await res.json(); 

      if (res.status === 401) {
        // Verificăm dacă 401 vine de la Paznic (Single Device) sau e doar o eroare de validare
        if (data.code === 'SESSION_KICKED' || (data.message && data.message.includes('Sesiune expirată'))) {
          localStorage.removeItem('token'); 
          alert("Sesiune expirată! Te-ai conectat de pe alt dispozitiv.");
          window.location.href = '/login'; 
          return; 
        } else {
          // E o simplă eroare (ex: parola prea scurtă, parola veche nu se potrivește)
          setError(data.message || 'Eroare la modificarea parolei.');
          return;
        }
      }

      if (res.ok) {
        // Parola a fost schimbată cu succes! 
        // Dacă backend-ul ne dă un token NOU după schimbare, îl folosim pe ăla. Dacă nu, îl ținem pe cel temporar.
        localStorage.setItem('token', data.token || tempToken);
        localStorage.setItem('role', 'participant');
        navigate('/dashboard');
      } else {
        setError(data.message || 'Eroare la schimbarea parolei.');
      }
    } catch (err) {
      setError('Eroare de conexiune.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logoImg} alt="CAD&CRAFT Logo" className="login-logo-clean" />
          
          {/* Schimbăm textul în funcție de ecranul pe care suntem */}
          <h2>{needsPasswordChange ? "Securizare Cont" : "Bine ai venit!"}</h2>
          <p>{needsPasswordChange 
            ? "Fiind prima logare, te rugăm să alegi o parolă nouă." 
            : "Autentifică-te pentru a accesa platforma"}
          </p>
        </div>

        {/* Afișarea erorilor */}
        {error && <div style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</div>}

        {/* ECRANUL 1: LOGIN NORMAL */}
        {!needsPasswordChange ? (
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Utilizator</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input 
                  type="text" 
                  placeholder="nume.utilizator" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
        ) : (
          /* ECRANUL 2: SCHIMBARE PAROLĂ OBLIGATORIE */
          <form onSubmit={handlePasswordChange} className="login-form">
            <div className="input-group">
              <label>Parolă Nouă (Minim 6 caractere)</label>
              <div className="input-wrapper">
                <KeyRound className="input-icon" size={20} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-btn">
              <Lock size={20} />
              <span>Salvează și Continuă</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;