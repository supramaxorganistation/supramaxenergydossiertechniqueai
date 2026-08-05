import { useEffect, useState } from 'react';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import './App.css';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'technician' | 'client';
};

type Dossier = {
  _id: string;
  customerDetails: {
    name: string;
    cin: string;
    phone: string;
    address: string;
    stegMeterRef: string;
  };
  pvSystemParams: {
    peakPowerKwc: number;
    panelCount: number;
    panelBrand: string;
    inverterModel: string;
    dcCableLength: number;
    acCableLength: number;
  };
  calculations: {
    estimatedAnnualYieldKwh: number;
    dcVoltageDropPercent: number;
    acVoltageDropPercent: number;
    statusOk: boolean;
  };
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  documents: { fileName: string; fileUrl: string; fileType: string; uploadedAt: string }[];
  createdBy: { name: string; email: string };
  assignedTechnician?: { name: string; email: string };
  createdAt: string;
};

type Screen = 'dashboard' | 'dossiers' | 'dossier-detail' | 'dossier-create' | 'admin';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [screen, setScreen] = useState<Screen>('dashboard');
  
  // Auth form state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');

  // Dossier state
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerCin: '',
    customerPhone: '',
    customerAddress: '',
    stegMeterRef: '',
    peakPowerKwc: 3,
    panelCount: 8,
    panelBrand: 'JinkoSolar',
    inverterModel: 'Growatt 3000S',
    dcCableLength: 20,
    acCableLength: 10
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch('http://localhost:5000/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        loadDossiers();
      } else {
        setToken('');
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Token verification failed:', err);
    }
  };

  const loadDossiers = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/dossiers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDossiers(data);
      }
    } catch (err) {
      console.error('Error loading dossiers:', err);
    }
  };

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const body = isRegister
        ? { name: authName, email: authEmail, password: authPassword }
        : { email: authEmail, password: authPassword };

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Authentication failed');
        return;
      }

      const newToken = data.token;
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
      setScreen('dashboard');
    } catch (err) {
      setError('Network error');
      console.error(err);
    }
  };

  const handleCreateDossier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    try {
      const payload = {
        customerDetails: {
          name: formData.customerName,
          cin: formData.customerCin,
          phone: formData.customerPhone,
          address: formData.customerAddress,
          stegMeterRef: formData.stegMeterRef
        },
        pvSystemParams: {
          peakPowerKwc: parseFloat(formData.peakPowerKwc.toString()),
          panelCount: parseInt(formData.panelCount.toString()),
          panelBrand: formData.panelBrand,
          inverterModel: formData.inverterModel,
          dcCableLength: parseFloat(formData.dcCableLength.toString()),
          acCableLength: parseFloat(formData.acCableLength.toString())
        }
      };

      const response = await fetch('http://localhost:5000/api/dossiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setFormData({
          customerName: '',
          customerCin: '',
          customerPhone: '',
          customerAddress: '',
          stegMeterRef: '',
          peakPowerKwc: 3,
          panelCount: 8,
          panelBrand: 'JinkoSolar',
          inverterModel: 'Growatt 3000S',
          dcCableLength: 20,
          acCableLength: 10
        });
        loadDossiers();
        setScreen('dossiers');
      }
    } catch (err) {
      console.error('Error creating dossier:', err);
    }
  };

  const handleUploadFile = async (dossierId: string) => {
    if (!uploadFile || !token) return;

    const formDataObj = new FormData();
    formDataObj.append('file', uploadFile);

    try {
      const response = await fetch(`http://localhost:5000/api/dossiers/${dossierId}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });

      if (response.ok) {
        setUploadFile(null);
        if (selectedDossier) {
          loadDossiers();
          const updated = dossiers.find(d => d._id === dossierId);
          if (updated) setSelectedDossier(updated);
        }
      }
    } catch (err) {
      console.error('Error uploading file:', err);
    }
  };

  const handleScanDatasheet = async (dossierId: string) => {
    if (!datasheetFile || !token) return;

    setIsScanning(true);
    const formDataObj = new FormData();
    formDataObj.append('datasheet', datasheetFile);

    try {
      const response = await fetch(`http://localhost:5000/api/dossiers/${dossierId}/scan-equipment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });

      if (response.ok) {
        const result = await response.json();
        setScanResult(result.scannedData);
        setDatasheetFile(null);
        loadDossiers();
        // Reload selected dossier
        if (selectedDossier) {
          const updated = dossiers.find(d => d._id === dossierId);
          if (updated) setSelectedDossier(updated);
        }
      } else {
        alert('Failed to scan datasheet');
      }
    } catch (err) {
      console.error('Error scanning datasheet:', err);
      alert('Error scanning datasheet');
    } finally {
      setIsScanning(false);
    }
  };

  const handleGeneratePdf = async (dossierId: string) => {
    if (!token) return;

    setIsGeneratingPdf(true);
    try {
      const response = await fetch(`http://localhost:5000/api/dossiers/${dossierId}/export-pdf`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Get filename from content-disposition header
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'dossier.pdf';

        // Download PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to generate PDF');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('token');
    setScreen('dashboard');
  };

  if (!isAuthenticated) {
    return (
      <main className="app-shell">
        <section className="hero-card">
          <h1>Supramax Energy Platform</h1>
          <p>Système de Gestion des Dossiers Techniques Énergétiques</p>
        </section>

        <form onSubmit={handleAuth} className="form-card">
          {isRegister && (
            <input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="Full name" required />
          )}
          <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" required />
          <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" required />
          <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
          <button type="button" onClick={() => setIsRegister(!isRegister)} style={{ backgroundColor: '#6b7280' }}>
            {isRegister ? 'Back to Login' : 'Create Account'}
          </button>
        </form>

        {error && <div style={{ color: 'red', textAlign: 'center', marginTop: 16 }}>{error}</div>}
      </main>
    );
  }

  // Dashboard screen
  if (screen === 'dashboard') {
    const totalDossiers = dossiers.length;
    const totalPowerKwc = dossiers.reduce((sum, d) => sum + d.pvSystemParams.peakPowerKwc, 0);
    const pendingCount = dossiers.filter(d => d.status === 'PENDING_APPROVAL').length;
    const statusData = [
      { name: 'DRAFT', value: dossiers.filter(d => d.status === 'DRAFT').length },
      { name: 'PENDING', value: dossiers.filter(d => d.status === 'PENDING_APPROVAL').length },
      { name: 'APPROVED', value: dossiers.filter(d => d.status === 'APPROVED').length }
    ];
    const monthlyYield = [
      { month: 'Jan', yield: 1200 },
      { month: 'Feb', yield: 1350 },
      { month: 'Mar', yield: 1500 },
      { month: 'Apr', yield: 1400 },
      { month: 'May', yield: 1600 },
      { month: 'Jun', yield: 1700 }
    ];
    const COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

    return (
      <main className="app-shell">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1>Dashboard</h1>
            <p>Welcome, {currentUser?.name} ({currentUser?.role})</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setScreen('dossiers')}>Dossiers</button>
            {(currentUser?.role === 'admin' || currentUser?.role === 'technician') && (
              <button onClick={() => setScreen('dossier-create')} style={{ backgroundColor: '#10b981' }}>
                + New Dossier
              </button>
            )}
            {currentUser?.role === 'admin' && <button onClick={() => setScreen('admin')}>Admin</button>}
            <button onClick={handleLogout} style={{ backgroundColor: '#ef4444' }}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="hero-card" style={{ textAlign: 'center' }}>
            <h3>{totalDossiers}</h3>
            <p>Total Dossiers</p>
          </div>
          <div className="hero-card" style={{ textAlign: 'center' }}>
            <h3>{totalPowerKwc.toFixed(1)} kWc</h3>
            <p>Total Power</p>
          </div>
          <div className="hero-card" style={{ textAlign: 'center' }}>
            <h3>{pendingCount}</h3>
            <p>Pending Approval</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div className="hero-card">
            <h3>Dossier Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="hero-card">
            <h3>Estimated Monthly Yield (kWh)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyYield}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="yield" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    );
  }

  // Dossiers list screen
  if (screen === 'dossiers') {
    return (
      <main className="app-shell">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>Gestion des Dossiers</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setScreen('dashboard')}>Dashboard</button>
            {(currentUser?.role === 'admin' || currentUser?.role === 'technician') && (
              <button onClick={() => setScreen('dossier-create')} style={{ backgroundColor: '#10b981' }}>
                + New Dossier
              </button>
            )}
            <button onClick={handleLogout} style={{ backgroundColor: '#ef4444' }}>
              Logout
            </button>
          </div>
        </div>

        <div className="hero-card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Power (kWc)</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Created By</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dossiers.map((dossier) => (
                <tr key={dossier._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px' }}>{dossier.customerDetails.name}</td>
                  <td style={{ padding: '8px' }}>{dossier.pvSystemParams.peakPowerKwc}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ backgroundColor: dossier.status === 'APPROVED' ? '#d1fae5' : '#fef3c7', padding: '4px 8px', borderRadius: '4px' }}>
                      {dossier.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>{dossier.createdBy.name}</td>
                  <td style={{ padding: '8px' }}>
                    <button onClick={() => { setSelectedDossier(dossier); setScreen('dossier-detail'); }} style={{ fontSize: '12px', padding: '4px 8px' }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    );
  }

  // Dossier detail screen
  if (screen === 'dossier-detail' && selectedDossier) {
    return (
      <main className="app-shell">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1>{selectedDossier.customerDetails.name}</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setScreen('dossiers')}>Back</button>
            <button onClick={handleLogout} style={{ backgroundColor: '#ef4444' }}>Logout</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="hero-card">
            <h3>Customer Details</h3>
            <p><strong>Name:</strong> {selectedDossier.customerDetails.name}</p>
            <p><strong>CIN:</strong> {selectedDossier.customerDetails.cin}</p>
            <p><strong>Phone:</strong> {selectedDossier.customerDetails.phone}</p>
            <p><strong>Address:</strong> {selectedDossier.customerDetails.address}</p>
            <p><strong>STEG Meter Ref:</strong> {selectedDossier.customerDetails.stegMeterRef}</p>
          </div>

          <div className="hero-card">
            <h3>PV System</h3>
            <p><strong>Peak Power:</strong> {selectedDossier.pvSystemParams.peakPowerKwc} kWc</p>
            <p><strong>Panels:</strong> {selectedDossier.pvSystemParams.panelCount} x {selectedDossier.pvSystemParams.panelBrand}</p>
            <p><strong>Inverter:</strong> {selectedDossier.pvSystemParams.inverterModel}</p>
            <p><strong>DC Cable:</strong> {selectedDossier.pvSystemParams.dcCableLength}m</p>
            <p><strong>AC Cable:</strong> {selectedDossier.pvSystemParams.acCableLength}m</p>
          </div>

          <div className="hero-card">
            <h3>Calculations</h3>
            <p><strong>Annual Yield:</strong> {selectedDossier.calculations.estimatedAnnualYieldKwh} kWh</p>
            <p><strong>DC Voltage Drop:</strong> {selectedDossier.calculations.dcVoltageDropPercent.toFixed(2)}%</p>
            <p><strong>AC Voltage Drop:</strong> {selectedDossier.calculations.acVoltageDropPercent.toFixed(2)}%</p>
            <p><strong>Status:</strong> {selectedDossier.calculations.statusOk ? '✅ OK' : '❌ Issues'}</p>
          </div>

          <div className="hero-card">
            <h3>Dossier Status</h3>
            <p><strong>Status:</strong> {selectedDossier.status}</p>
            <p><strong>Created:</strong> {new Date(selectedDossier.createdAt).toLocaleDateString()}</p>
            <p><strong>By:</strong> {selectedDossier.createdBy.name}</p>
            {selectedDossier.assignedTechnician && <p><strong>Technician:</strong> {selectedDossier.assignedTechnician.name}</p>}
          </div>
        </div>

        <div className="hero-card" style={{ marginTop: '16px' }}>
          <h3>Documents</h3>
          {selectedDossier.documents.length === 0 ? (
            <p>No documents uploaded yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {selectedDossier.documents.map((doc, idx) => (
                <li key={idx} style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between' }}>
                  <a href={`http://localhost:5000${doc.fileUrl}`} target="_blank" rel="noreferrer">{doc.fileName}</a>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}

          {(currentUser?.role === 'admin' || currentUser?.role === 'technician' || (currentUser?.role === 'client' && selectedDossier.createdBy.email === currentUser.email)) && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
              <button onClick={() => handleUploadFile(selectedDossier._id)}>Upload</button>
            </div>
          )}
        </div>

        <div className="hero-card">
          <h3>🤖 AI Datasheet Scanner</h3>
          <p style={{ fontSize: '12px', marginBottom: '12px' }}>Upload PDF datasheets to automatically extract technical specifications (Panel, Inverter, Protection devices, Cables)</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => setDatasheetFile(e.target.files?.[0] || null)}
              disabled={isScanning}
            />
            <button 
              onClick={() => handleScanDatasheet(selectedDossier._id)}
              disabled={!datasheetFile || isScanning}
              style={{ backgroundColor: isScanning ? '#ccc' : '#667eea' }}
            >
              {isScanning ? 'Scanning...' : 'Scan Equipment'}
            </button>
          </div>
          
          {scanResult && (
            <div style={{ 
              marginTop: '12px', 
              padding: '10px', 
              backgroundColor: '#e6f0f7', 
              border: '1px solid #0099cc', 
              borderRadius: '4px'
            }}>
              <p><strong>Extracted:</strong> {scanResult.brand} {scanResult.model}</p>
              <p><strong>Category:</strong> {scanResult.category}</p>
              <p style={{ fontSize: '10px', color: '#666' }}>Data populated in equipment fields</p>
            </div>
          )}
        </div>

        <div className="hero-card">
          <h3>📄 Generate STEG Technical Dossier</h3>
          <p style={{ fontSize: '12px', marginBottom: '12px' }}>Generate a complete 21-page STEG-compliant technical dossier PDF with all calculations and compliance checks</p>
          <button 
            onClick={() => handleGeneratePdf(selectedDossier._id)}
            disabled={isGeneratingPdf}
            style={{ 
              backgroundColor: isGeneratingPdf ? '#ccc' : '#10b981',
              width: '100%',
              padding: '12px',
              fontSize: '14px'
            }}
          >
            {isGeneratingPdf ? '⏳ Generating PDF...' : '📥 Download STEG Dossier PDF'}
          </button>
          <p style={{ fontSize: '10px', marginTop: '8px', color: '#666' }}>
            Includes: Temperature adjustments, string compatibility, cable sizing (NF C 15-100), voltage drop analysis, wind resistance check, compliance summary
          </p>
        </div>
      </main>
    );
  }

  // Create dossier screen
  if (screen === 'dossier-create') {
    return (
      <main className="app-shell">
        <h1>Create New Dossier</h1>
        <form onSubmit={handleCreateDossier} className="hero-card">
          <h3>Customer Information</h3>
          <input value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} placeholder="Customer Name" required />
          <input value={formData.customerCin} onChange={(e) => setFormData({ ...formData, customerCin: e.target.value })} placeholder="CIN" required />
          <input value={formData.customerPhone} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} placeholder="Phone" required />
          <input value={formData.customerAddress} onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })} placeholder="Address" required />
          <input value={formData.stegMeterRef} onChange={(e) => setFormData({ ...formData, stegMeterRef: e.target.value })} placeholder="STEG Meter Reference" required />

          <h3>PV System Parameters</h3>
          <input type="number" step="0.1" value={formData.peakPowerKwc} onChange={(e) => setFormData({ ...formData, peakPowerKwc: parseFloat(e.target.value) })} placeholder="Peak Power (kWc)" required />
          <input type="number" value={formData.panelCount} onChange={(e) => setFormData({ ...formData, panelCount: parseInt(e.target.value) })} placeholder="Panel Count" required />
          <input value={formData.panelBrand} onChange={(e) => setFormData({ ...formData, panelBrand: e.target.value })} placeholder="Panel Brand" required />
          <input value={formData.inverterModel} onChange={(e) => setFormData({ ...formData, inverterModel: e.target.value })} placeholder="Inverter Model" required />
          <input type="number" step="0.1" value={formData.dcCableLength} onChange={(e) => setFormData({ ...formData, dcCableLength: parseFloat(e.target.value) })} placeholder="DC Cable Length (m)" />
          <input type="number" step="0.1" value={formData.acCableLength} onChange={(e) => setFormData({ ...formData, acCableLength: parseFloat(e.target.value) })} placeholder="AC Cable Length (m)" />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" style={{ backgroundColor: '#10b981' }}>Create Dossier</button>
            <button type="button" onClick={() => setScreen('dossiers')}>Cancel</button>
          </div>
        </form>
      </main>
    );
  }

  // Admin screen
  if (screen === 'admin' && currentUser?.role === 'admin') {
    return (
      <main className="app-shell">
        <h1>Administration Panel</h1>
        <div className="hero-card">
          <h3>User Management</h3>
          <p>Coming soon...</p>
          <button onClick={() => setScreen('dashboard')}>Back to Dashboard</button>
        </div>
      </main>
    );
  }

  return <div>Unknown screen</div>;
}

export default App;
