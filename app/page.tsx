'use client';

import { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';
import { LayoutDashboard, FilePenLine, CalendarDays, LogOut, Menu, X } from 'lucide-react';

// ============================================
// BATAS AMBANG (THRESHOLD) — UBAH ANGKA DI SINI
// Semua tampilan (dashboard, warning, tabel) akan otomatis mengikuti angka di bawah ini.
// ============================================
const THRESHOLD = {
  wtp: {
    debit_inlet: { min: 50, max: 180 },   // m³/h — kapasitas pompa pasokan air baku
    debit_outlet: { min: 45, max: 150 },  // m³/h — kapasitas pasokan air bersih ke produksi
  },
  wwtp: {
    cod: { max: 100 },        // mg/L — tidak ada batas bawah spesifik
    bod: { max: 30 },         // mg/L — baku mutu domestik
    ph: { min: 6.0, max: 9.0 },
    nh3_n: { max: 10 },       // mg/L — baku mutu domestik
    // debit_inlet & debit_outlet WWTP sengaja tidak diberi batas (tidak ada baku mutu universal)
  },
};


export default function App() {
  // Auth States
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Navigation State
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'input-mingguan' | 'view-mingguan'>('dashboard');

  // Responsive / Mobile Sidebar State
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false); // reset saat kembali ke desktop
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Tutup sidebar otomatis setelah pilih menu (khusus mobile)
  const handleMenuSelect = (menu: 'dashboard' | 'input-mingguan' | 'view-mingguan') => {
    setActiveMenu(menu);
    if (isMobile) setSidebarOpen(false);
  };

  // Data States
  const [data, setData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>({ wtp: [], wwtp: [] });

  // Search Filter States (Tanggal, Bulan, Tahun)
  const [searchDateWtp, setSearchDateWtp] = useState('');
  const [searchDateWwtp, setSearchDateWwtp] = useState('');

  // Input States
  const [activeForm, setActiveForm] = useState<'wtp' | 'wwtp'>('wtp');
  const [wtpForm, setWtpForm] = useState({ debit_inlet: '', debit_outlet: '' });
  const [wwtpForm, setWwtpForm] = useState({ cod: '', bod: '', debit_inlet: '', debit_outlet: '', nh3_n: '', ph: '' });

  const chartWtpRef = useRef<HTMLCanvasElement | null>(null);
  const chartWwtpRef = useRef<HTMLCanvasElement | null>(null);
  const chartWtpInstance = useRef<Chart | null>(null);
  const chartWwtpInstance = useRef<Chart | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const resData = await res.json();
      if (res.ok) {
        setUser({
          username: resData.user.username,
          role: resData.user.role.toLowerCase()
        });
        setActiveMenu('dashboard');
      } else {
        setLoginError(resData.error || 'Login gagal');
      }
    } catch (err) {
      setLoginError('Koneksi gagal');
    }
  };

  const handleLogout = () => {
    if (chartWtpInstance.current) { chartWtpInstance.current.destroy(); chartWtpInstance.current = null; }
    if (chartWwtpInstance.current) { chartWwtpInstance.current.destroy(); chartWwtpInstance.current = null; }
    setUser(null);
    setData(null);
  };

  const renderCharts = (jsonData: any) => {
    if (!jsonData?.charts) return;

    const labelsWtp = jsonData.charts.wtp.map((d: any) => new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const labelsWwtp = jsonData.charts.wwtp.map((d: any) => new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    if (chartWtpRef.current) {
      if (chartWtpInstance.current) {
        chartWtpInstance.current.data.labels = labelsWtp;
        chartWtpInstance.current.data.datasets[0].data = jsonData.charts.wtp.map((d: any) => d.debit_inlet);
        chartWtpInstance.current.data.datasets[1].data = jsonData.charts.wtp.map((d: any) => d.debit_outlet);
        chartWtpInstance.current.update('none');
      } else {
        chartWtpInstance.current = new Chart(chartWtpRef.current, {
          type: 'line',
          data: {
            labels: labelsWtp,
            datasets: [
              { label: 'Debit Inlet', data: jsonData.charts.wtp.map((d: any) => d.debit_inlet), borderColor: '#0dcaf0', tension: 0.2 },
              { label: 'Debit Outlet', data: jsonData.charts.wtp.map((d: any) => d.debit_outlet), borderColor: '#0d6efd', tension: 0.2 }
            ]
          },
          options: { responsive: true }
        });
      }
    }

    if (chartWwtpRef.current) {
      if (chartWwtpInstance.current) {
        chartWwtpInstance.current.data.labels = labelsWwtp;
        chartWwtpInstance.current.data.datasets[0].data = jsonData.charts.wwtp.map((d: any) => d.cod);
        chartWwtpInstance.current.data.datasets[1].data = jsonData.charts.wwtp.map((d: any) => d.ph);
        chartWwtpInstance.current.update('none');
      } else {
        chartWwtpInstance.current = new Chart(chartWwtpRef.current, {
          type: 'line',
          data: {
            labels: labelsWwtp,
            datasets: [
              { label: 'COD (mg/L)', data: jsonData.charts.wwtp.map((d: any) => d.cod), borderColor: '#dc3545', tension: 0.2 },
              { label: 'pH', data: jsonData.charts.wwtp.map((d: any) => d.ph), borderColor: '#ffc107', tension: 0.2 }
            ]
          },
          options: { responsive: true }
        });
      }
    }
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/utility');
      const jsonData = await res.json();
      setData(jsonData);
      renderCharts(jsonData);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWeeklyData = async () => {
    try {
      const res = await fetch('/api/utility/weekly');
      const json = await res.json();
      setWeeklyData(json);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) return;

    if (activeMenu === 'dashboard') {
      if (chartWtpInstance.current) { chartWtpInstance.current.destroy(); chartWtpInstance.current = null; }
      if (chartWwtpInstance.current) { chartWwtpInstance.current.destroy(); chartWwtpInstance.current = null; }
      
      fetchData();
      const interval = setInterval(fetchData, 2000);
      return () => clearInterval(interval);
    } else {
      fetchWeeklyData();
    }
  }, [user, activeMenu]);

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = activeForm === 'wtp' ? { type: 'wtp', data: wtpForm } : { type: 'wwtp', data: wwtpForm };
    try {
      const res = await fetch('/api/utility/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Data Parameter Berhasil Disimpan!');
        setWtpForm({ debit_inlet: '', debit_outlet: '' });
        setWwtpForm({ cod: '', bod: '', debit_inlet: '', debit_outlet: '', nh3_n: '', ph: '' });
        fetchWeeklyData();
        setActiveMenu('dashboard');
      } else {
        alert('Gagal menyimpan data');
      }
    } catch (err) {
      alert('Gagal menyimpan data');
    }
  };

  // Ambil Data Terkini dari Database
  const latestWtp = data?.charts?.wtp && data.charts.wtp.length > 0 
    ? data.charts.wtp[data.charts.wtp.length - 1] 
    : data?.latest?.wtp;

  const latestWwtp = data?.charts?.wwtp && data.charts.wwtp.length > 0 
    ? data.charts.wwtp[data.charts.wwtp.length - 1] 
    : data?.latest?.wwtp;

  // LOGIKA CEK WARNING BATAS ATAS & BAWAH PARAMETER WTP
  const isWtpWarning = latestWtp 
    ? Number(latestWtp.debit_inlet) < THRESHOLD.wtp.debit_inlet.min || Number(latestWtp.debit_inlet) > THRESHOLD.wtp.debit_inlet.max ||
      Number(latestWtp.debit_outlet) < THRESHOLD.wtp.debit_outlet.min || Number(latestWtp.debit_outlet) > THRESHOLD.wtp.debit_outlet.max
    : false;

  // LOGIKA CEK WARNING BATAS ATAS & BAWAH PARAMETER WWTP
  const isWwtpWarning = latestWwtp 
    ? Number(latestWwtp.ph) < THRESHOLD.wwtp.ph.min || Number(latestWwtp.ph) > THRESHOLD.wwtp.ph.max ||
      Number(latestWwtp.cod) > THRESHOLD.wwtp.cod.max ||
      Number(latestWwtp.bod) > THRESHOLD.wwtp.bod.max ||
      Number(latestWwtp.nh3_n) > THRESHOLD.wwtp.nh3_n.max
    : false;

  // Urutkan data tabel berdasarkan ID terbesar
  const sortedWtp = weeklyData?.wtp 
    ? [...weeklyData.wtp].sort((a: any, b: any) => Number(b.id) - Number(a.id))
    : [];

  const sortedWwtp = weeklyData?.wwtp 
    ? [...weeklyData.wwtp].sort((a: any, b: any) => Number(b.id) - Number(a.id))
    : [];

  // FILTER PENCARIAN TANGGAL WTP (Metode konversi string lokal presisi tinggi)
  const filteredWtp = sortedWtp.filter((item: any) => {
    if (!searchDateWtp) return true;
    
    // Pecah string tanggal bawaan komputer lokal ke format YYYY-MM-DD secara aman
    const localString = new Date(item.created_at).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }); // Output format id-ID: DD/MM/YYYY
    
    const [day, month, year] = localString.split('/');
    const formattedItemDate = `${year}-${month}-${day}`; // Menjadi YYYY-MM-DD

    return formattedItemDate === searchDateWtp;
  });

  // FILTER PENCARIAN TANGGAL WWTP (Metode konversi string lokal presisi tinggi)
  const filteredWwtp = sortedWwtp.filter((item: any) => {
    if (!searchDateWwtp) return true;

    const localString = new Date(item.created_at).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const [day, month, year] = localString.split('/');
    const formattedItemDate = `${year}-${month}-${day}`;

    return formattedItemDate === searchDateWwtp;
  });

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f3f5', fontFamily: 'sans-serif' }}>
        <form onSubmit={handleLogin} style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '320px' }}>
          <h3 style={{ textAlign: 'center', color: '#0d6efd', marginBottom: '20px' }}>JAPFA UTILITY LOGIN</h3>
          {loginError && <p style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{loginError}</p>}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Username</label>
            <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Password</label>
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>MASUK</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', position: 'relative' }}>

      {/* TOP BAR MOBILE (hanya tampil di layar kecil) */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', backgroundColor: '#212529', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 40 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Menu size={24} />
          </button>
          <span style={{ color: '#0d6efd', fontWeight: 'bold' }}>JAPFA UTILITY</span>
          <div style={{ width: '24px' }} /> {/* spacer biar judul center */}
        </div>
      )}

      {/* OVERLAY GELAP saat sidebar mobile terbuka */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 45 }}
        />
      )}

      {/* SIDEBAR */}
      <div style={{
        width: '260px',
        backgroundColor: '#212529',
        color: '#fff',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 50,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: 'transform 0.25s ease-in-out',
      }}>
        <div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginBottom: '12px', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <X size={22} />
            </button>
          )}
          <h3 style={{ color: '#0d6efd', margin: '0 0 8px 0', fontWeight: 'bold', textAlign: 'center' }}>JAPFA UTILITY</h3>
          <p style={{ fontSize: '12px', color: '#a6a6a6', textAlign: 'center', borderBottom: '1px solid #3c4145', paddingBottom: '16px', marginBottom: '20px' }}>
            {user.username.toUpperCase()} ({user.role.toUpperCase()})
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => handleMenuSelect('dashboard')} style={{ padding: '12px', textAlign: 'left', backgroundColor: activeMenu === 'dashboard' ? '#0d6efd' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LayoutDashboard size={18} /> Result Dashboard
            </button>
            
            {user.role === 'engineer' && (
              <button onClick={() => handleMenuSelect('input-mingguan')} style={{ padding: '12px', textAlign: 'left', backgroundColor: activeMenu === 'input-mingguan' ? '#0d6efd' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FilePenLine size={18} /> Input Log Mingguan
              </button>
            )}

            <button onClick={() => handleMenuSelect('view-mingguan')} style={{ padding: '12px', textAlign: 'left', backgroundColor: activeMenu === 'view-mingguan' ? '#0d6efd' : 'transparent', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarDays size={18} /> Data Log 1 Minggu
            </button>
          </div>
        </div>

        <button onClick={handleLogout} style={{ padding: '10px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          <LogOut size={18} /> LOGOUT
        </button>
      </div>

      {/* CONTENT REGION */}
      <div style={{ flex: 1, padding: isMobile ? '72px 16px 24px 16px' : '32px', overflowY: 'auto', width: '100%' }}>
        
        {/* MENU: DASHBOARD */}
        {activeMenu === 'dashboard' && (
          <div>
            <h2 style={{ color: '#212529', margin: '0 0 24px 0' }}>Result System Monitoring</h2>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
              {/* WTP STATUS BLOCK */}
              <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#000000' }}>WTP Status</h3>
                <p>Debit Inlet: <strong style={{ color: (Number(latestWtp?.debit_inlet) < THRESHOLD.wtp.debit_inlet.min || Number(latestWtp?.debit_inlet) > THRESHOLD.wtp.debit_inlet.max) ? 'red' : 'inherit' }}>{latestWtp?.debit_inlet || 0}</strong> m³/h</p>
                <p>Debit Outlet: <strong style={{ color: (Number(latestWtp?.debit_outlet) < THRESHOLD.wtp.debit_outlet.min || Number(latestWtp?.debit_outlet) > THRESHOLD.wtp.debit_outlet.max) ? 'red' : 'inherit' }}>{latestWtp?.debit_outlet || 0}</strong> m³/h</p>
                <span style={{ backgroundColor: isWtpWarning ? '#dc3545' : '#25c281', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  {isWtpWarning ? 'WARNING: Parameter WTP Tidak Normal!' : 'Normal'}
                </span>
              </div>

              {/* WWTP STATUS BLOCK */}
              <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#212529' }}>WWTP Status</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div>
                    <p>COD: <strong style={{ color: Number(latestWwtp?.cod) > THRESHOLD.wwtp.cod.max ? 'red' : 'inherit' }}>{latestWwtp?.cod || 0}</strong> mg/L</p>
                    <p>BOD: <strong style={{ color: Number(latestWwtp?.bod) > THRESHOLD.wwtp.bod.max ? 'red' : 'inherit' }}>{latestWwtp?.bod || 0}</strong> mg/L</p>
                    <p>pH: <strong style={{ color: (Number(latestWwtp?.ph) < THRESHOLD.wwtp.ph.min || Number(latestWwtp?.ph) > THRESHOLD.wwtp.ph.max) ? 'red' : 'inherit' }}>{latestWwtp?.ph || 0}</strong></p>
                  </div>
                  <div>
                    <p>Debit Inlet: <strong>{latestWwtp?.debit_inlet || 0}</strong> m³/h</p>
                    <p>Debit Outlet: <strong>{latestWwtp?.debit_outlet || 0}</strong> m³/h</p>
                    <p>NH3-N: <strong style={{ color: Number(latestWwtp?.nh3_n) > THRESHOLD.wwtp.nh3_n.max ? 'red' : 'inherit' }}>{latestWwtp?.nh3_n || 0}</strong> mg/L</p>
                  </div>
                </div>
                <span style={{ backgroundColor: isWwtpWarning ? '#dc3545' : '#25c281', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  {isWwtpWarning ? 'WARNING: Parameter WWTP Tidak Stabil!' : 'Normal'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#6c757d' }}>Grafik Aliran WTP</h4>
                <div style={{ position: 'relative', height: '280px' }}>
                  <canvas ref={chartWtpRef}></canvas>
                </div>
              </div>
              <div style={{ flex: 1, backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#6c757d' }}>Grafik Parameter WWTP</h4>
                <div style={{ position: 'relative', height: '280px' }}>
                  <canvas ref={chartWwtpRef}></canvas>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MENU: FORM INPUT MINGGUAN */}
        {activeMenu === 'input-mingguan' && user.role === 'engineer' && (
          <div style={{ backgroundColor: '#fff', padding: '28px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h2 style={{ margin: '0 0 6px 0' }}>Form Input Parameter Utility</h2>
            <div style={{ marginBottom: '20px', marginTop: '16px' }}>
              <button onClick={() => setActiveForm('wtp')} style={{ padding: '10px 20px', marginRight: '10px', backgroundColor: activeForm === 'wtp' ? '#0dcaf0' : '#e9ecef', color: activeForm === 'wtp' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Opsi WTP</button>
              <button onClick={() => setActiveForm('wwtp')} style={{ padding: '10px 20px', backgroundColor: activeForm === 'wwtp' ? '#212529' : '#e9ecef', color: activeForm === 'wwtp' ? '#fff' : '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Opsi WWTP</button>
            </div>
            <form onSubmit={handleInputSubmit}>
              {activeForm === 'wtp' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px' }}>Debit Inlet (m³/h)</label>
                    <input type="number" step="0.01" value={wtpForm.debit_inlet} onChange={(e) => setWtpForm({...wtpForm, debit_inlet: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px' }}>Debit Outlet (m³/h)</label>
                    <input type="number" step="0.01" value={wtpForm.debit_outlet} onChange={(e) => setWtpForm({...wtpForm, debit_outlet: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px' }}>COD (mg/L)</label>
                    <input type="number" step="0.01" value={wwtpForm.cod} onChange={(e) => setWwtpForm({...wwtpForm, cod: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px' }}>BOD (mg/L)</label>
                    <input type="number" step="0.01" value={wwtpForm.bod} onChange={(e) => setWwtpForm({...wwtpForm, bod: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px' }}>Debit Inlet (m³/h)</label>
                    <input type="number" step="0.01" value={wwtpForm.debit_inlet} onChange={(e) => setWwtpForm({...wwtpForm, debit_inlet: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px' }}>Debit Outlet (m³/h)</label>
                    <input type="number" step="0.01" value={wwtpForm.debit_outlet} onChange={(e) => setWwtpForm({...wwtpForm, debit_outlet: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px' }}>NH3-N (mg/L)</label>
                    <input type="number" step="0.01" value={wwtpForm.nh3_n} onChange={(e) => setWwtpForm({...wwtpForm, nh3_n: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px' }}>pH</label>
                    <input type="number" step="0.01" value={wwtpForm.ph} onChange={(e) => setWwtpForm({...wwtpForm, ph: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                  </div>
                </div>
              )}
              <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>KIRIM DATA LOG</button>
            </form>
          </div>
        )}

        {/* MENU: DATA LOG TABEL 1 MINGGU */}
        {activeMenu === 'view-mingguan' && (
          <div>
            <h2 style={{ margin: '0 0 24px 0' }}>Laporan Rekap Log Mingguan (7 Hari Terakhir)</h2>
            
            {/* TABEL HISTORI WTP */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ color: '#000000', margin: 0 }}>Histori Mingguan WTP</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Cari Tanggal:</label>
                  <input 
                    type="date" 
                    value={searchDateWtp} 
                    onChange={(e) => setSearchDateWtp(e.target.value)} 
                    style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} 
                  />
                  {searchDateWtp && (
                    <button 
                      onClick={() => setSearchDateWtp('')} 
                      style={{ padding: '6px 10px', backgroundColor: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Waktu Log</th>
                      <th style={{ padding: '12px' }}>Debit Inlet (m³/h)</th>
                      <th style={{ padding: '12px' }}>Debit Outlet (m³/h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWtp.length > 0 ? (
                      filteredWtp.map((item: any) => {
                        const isWtpInletAlert = Number(item.debit_inlet) < THRESHOLD.wtp.debit_inlet.min || Number(item.debit_inlet) > THRESHOLD.wtp.debit_inlet.max;
                        const isWtpOutletAlert = Number(item.debit_outlet) < THRESHOLD.wtp.debit_outlet.min || Number(item.debit_outlet) > THRESHOLD.wtp.debit_outlet.max;
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '12px' }}>
                              {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} -{' '}
                              {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td style={{ padding: '12px', color: isWtpInletAlert ? 'red' : 'inherit', fontWeight: isWtpInletAlert ? 'bold' : 'normal' }}>{item.debit_inlet}</td>
                            <td style={{ padding: '12px', color: isWtpOutletAlert ? 'red' : 'inherit', fontWeight: isWtpOutletAlert ? 'bold' : 'normal' }}>{item.debit_outlet}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Data tidak ditemukan pada tanggal tersebut.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABEL HISTORI WWTP */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ color: '#212529', margin: 0 }}>Histori Mingguan WWTP</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Cari Tanggal:</label>
                  <input 
                    type="date" 
                    value={searchDateWwtp} 
                    onChange={(e) => setSearchDateWwtp(e.target.value)} 
                    style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} 
                  />
                  {searchDateWwtp && (
                    <button 
                      onClick={() => setSearchDateWwtp('')} 
                      style={{ padding: '6px 10px', backgroundColor: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 1 }}>
                    <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>Waktu Log</th>
                      <th style={{ padding: '12px' }}>COD</th>
                      <th style={{ padding: '12px' }}>BOD</th>
                      <th style={{ padding: '12px' }}>Inlet</th>
                      <th style={{ padding: '12px' }}>Outlet</th>
                      <th style={{ padding: '12px' }}>NH3-N</th>
                      <th style={{ padding: '12px' }}>pH</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWwtp.length > 0 ? (
                      filteredWwtp.map((item: any) => {
                        const isCodAlert = Number(item.cod) > THRESHOLD.wwtp.cod.max;
                        const isBodAlert = Number(item.bod) > THRESHOLD.wwtp.bod.max;
                        const isNh3Alert = Number(item.nh3_n) > THRESHOLD.wwtp.nh3_n.max;
                        const isPhAlert = Number(item.ph) < THRESHOLD.wwtp.ph.min || Number(item.ph) > THRESHOLD.wwtp.ph.max;

                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                            <td style={{ padding: '12px' }}>
                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} -{' '}
                            {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                            <td style={{ padding: '12px', color: isCodAlert ? 'red' : 'inherit', fontWeight: isCodAlert ? 'bold' : 'normal' }}>{item.cod}</td>
                            <td style={{ padding: '12px', color: isBodAlert ? 'red' : 'inherit', fontWeight: isBodAlert ? 'bold' : 'normal' }}>{item.bod}</td>
                            <td style={{ padding: '12px' }}>{item.debit_inlet}</td>
                            <td style={{ padding: '12px' }}>{item.debit_outlet}</td>
                            <td style={{ padding: '12px', color: isNh3Alert ? 'red' : 'inherit', fontWeight: isNh3Alert ? 'bold' : 'normal' }}>{item.nh3_n}</td>
                            <td style={{ padding: '12px', color: isPhAlert ? 'red' : 'inherit', fontWeight: isPhAlert ? 'bold' : 'normal' }}>{item.ph}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Data tidak ditemukan pada tanggal tersebut.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
