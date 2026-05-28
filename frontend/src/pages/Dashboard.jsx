import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import DevicesPage from './DevicesPage'
import CreateDevicePage from './CreateDevicePage'
import ElementInspectorPage from './ElementInspectorPage'
import ViewDevicePage from './ViewDevicePage'
import ScriptsPage from './ScriptsPage'
import CreateScriptPage from './CreateScriptPage'
import EditScriptPage from './EditScriptPage'
import ResultsPage from './ResultsPage'
import ADBConnectPage from './ADBConnectPage'

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()

  const currentPath = location.pathname.split('/')[2] || 'devices'

  const setTab = (tab) => {
    navigate(`/dashboard/${tab}`)
  }

  const username = user?.username || 'User'
  const userRole = user?.role || 'user'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      padding: '20px'
    }}>
      {/* NAVBAR */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: '#ffffff', margin: 0, fontSize: '24px' }}>
            📱 Appium Visual Platform
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ color: '#94a3b8', fontSize: '14px' }}>
              Welcome, <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{username}</span> ({userRole})
            </span>
            <button
              onClick={onLogout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '10px',
        marginBottom: '20px',
        borderRadius: '8px',
        display: 'flex',
        gap: '10px',
        border: '1px solid #334155'
      }}>
        <button
          onClick={() => setTab('devices')}
          style={{
            padding: '10px 20px',
            backgroundColor: currentPath === 'devices' ? '#3b82f6' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: currentPath === 'devices' ? '600' : 'normal'
          }}
        >
          📱 Devices
        </button>
        <button
          onClick={() => setTab('scripts')}
          style={{
            padding: '10px 20px',
            backgroundColor: currentPath === 'scripts' ? '#3b82f6' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: currentPath === 'scripts' ? '600' : 'normal'
          }}
        >
          📝 Scripts
        </button>
        <button
          onClick={() => setTab('results')}
          style={{
            padding: '10px 20px',
            backgroundColor: currentPath === 'results' ? '#3b82f6' : 'transparent',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: currentPath === 'results' ? '600' : 'normal'
          }}
        >
          📊 Results
        </button>
      </div>

      {/* CONTENT AREA */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '20px',
        borderRadius: '8px',
        minHeight: '500px',
        border: '1px solid #334155'
      }}>
        <Routes>
          <Route path="/" element={<DevicesPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="/devices/create" element={<CreateDevicePage />} />
          <Route path="/devices/adb-connect" element={<ADBConnectPage />} />
          <Route path="/devices/view/:deviceId" element={<ViewDevicePage />} />
          <Route path="/devices/inspect/:deviceId" element={<ElementInspectorPage />} />
          <Route path="/scripts" element={<ScriptsPage />} />
          <Route path="/scripts/create" element={<CreateScriptPage />} />
          <Route path="/scripts/edit/:scriptId" element={<EditScriptPage />} />
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </div>
    </div>
  )
}

export default Dashboard
