import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function DevicesPage() {
  const navigate = useNavigate()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await axios.get('/devices/list')
      setDevices(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching devices:', error)
      setError('Failed to load devices')
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm('Are you sure you want to delete this device?')) {
      return
    }

    try {
      await axios.delete(`/devices/${deviceId}`)
      await fetchDevices()
    } catch (error) {
      console.error('Error deleting device:', error)
      alert('Failed to delete device')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ color: '#94a3b8', marginTop: '20px' }}>Loading devices...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
            My Devices
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Manage your Android emulators and devices
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/dashboard/devices/adb-connect')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>📱</span> Connect Physical Device
          </button>
          <button
            onClick={() => navigate('/dashboard/devices/create')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>+</span> Create Emulator
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#dc2626',
          color: '#ffffff',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {/* Empty State */}
      {devices.length === 0 ? (
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '60px 40px',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: '#334155',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <span style={{ fontSize: '40px' }}>📱</span>
          </div>
          <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
            No devices yet
          </h3>
          <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
            Create your first Android device to start testing
          </p>
          <button
            onClick={() => navigate('/dashboard/devices/create')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>+</span> Create Device
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {devices.map((device) => {
            const deviceName = device?.name || 'Unknown Device'
            const deviceModel = device?.device_model || 'Unknown Model'
            const deviceStatus = device?.status || 'unknown'
            const appiumUrl = device?.appium_url || ''
            const vncUrl = device?.vnc_url || ''
            const deviceId = device?.id || ''

            return (
              <div
                key={deviceId}
                style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '20px'
                }}
              >
                {/* Device Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                  <div style={{
                    backgroundColor: '#3b82f6',
                    padding: '12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '24px' }}>📱</span>
                  </div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {deviceName}
                    </h4>
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0 0' }}>
                      {deviceModel}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ marginBottom: '15px' }}>
                  <span style={{
                    padding: '4px 12px',
                    backgroundColor: deviceStatus === 'running' ? '#10b981' : deviceStatus === 'creating' ? '#f59e0b' : '#dc2626',
                    color: '#ffffff',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {deviceStatus}
                  </span>
                </div>

                {/* Device Info */}
                <div style={{ marginBottom: '15px' }}>
                  {appiumUrl && (
                    <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>
                      ⚡ {appiumUrl.split('://')[1] || appiumUrl}
                    </div>
                  )}
                  {vncUrl && (
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      👁️ VNC Available
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  paddingTop: '15px',
                  borderTop: '1px solid #334155'
                }}>
                  {vncUrl && (
                    <button
                      onClick={() => navigate(`/dashboard/devices/view/${deviceId}`)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      👁️ View
                    </button>
                  )}
                  {deviceStatus === 'running' && (
                    <button
                      onClick={() => navigate(`/dashboard/devices/inspect/${deviceId}`)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      🔍 Inspect
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteDevice(deviceId)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DevicesPage
