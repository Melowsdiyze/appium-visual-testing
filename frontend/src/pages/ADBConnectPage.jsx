import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function ADBConnectPage() {
  const [ipAddress, setIpAddress] = useState('')
  const [port, setPort] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectedDevices, setConnectedDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchConnectedDevices()
  }, [])

  const fetchConnectedDevices = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/devices/adb/devices')
      setConnectedDevices(response.data.devices || [])
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!ipAddress.trim() || !port.trim()) {
      alert('Masukkan IP Address dan Port!')
      return
    }

    const fullAddress = `${ipAddress}:${port}`

    try {
      setConnecting(true)
      const response = await axios.post('/devices/adb/connect', {
        ip_address: fullAddress
      })

      if (response.data.success) {
        alert(`Berhasil connect ke ${fullAddress}`)
        setIpAddress('')
        setPort('')
        fetchConnectedDevices()
      } else {
        alert(`Gagal connect: ${response.data.output}`)
      }
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message))
    } finally {
      setConnecting(false)
    }
  }

  const getDeviceTypeIcon = (type) => {
    return type === 'physical' ? '📱' : '📲'
  }

  const getStatusColor = (status) => {
    return status === 'device' ? '#10b981' : '#f59e0b'
  }

  return (
    <div style={{
      padding: '30px',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h1 style={{
            color: 'white',
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '8px'
          }}>
            📱 Connect Physical Device
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
            Connect your Android device via ADB wireless debugging
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/devices')}
          style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            backdropFilter: 'blur(10px)'
          }}
        >
          ← Back to Devices
        </button>
      </div>

      {/* Connect Form */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#1f2937'
        }}>
          Connect New Device
        </h2>

        <div style={{
          padding: '16px',
          backgroundColor: '#eff6ff',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#1e40af', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            ℹ️ Cara Setup Wireless Debugging:
          </h3>
          <ol style={{ color: '#1e40af', fontSize: '13px', paddingLeft: '20px', margin: 0 }}>
            <li>Buka <strong>Settings → About Phone</strong></li>
            <li>Tap <strong>Build Number</strong> 7x untuk enable Developer Options</li>
            <li>Buka <strong>Settings → Developer Options</strong></li>
            <li>Enable <strong>Wireless debugging</strong></li>
            <li>Tap <strong>Pair device with pairing code</strong> (jika pertama kali)</li>
            <li>Lihat <strong>IP address & Port</strong> di menu Wireless debugging</li>
            <li>Masukkan IP dan Port di form dibawah</li>
          </ol>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              IP Address
            </label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="Contoh: 192.168.1.100"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px'
            }}>
              Port
            </label>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="Contoh: 45678"
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              padding: '12px 24px',
              backgroundColor: connecting ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: connecting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {connecting ? '🔄 Connecting...' : '🔌 Connect Device'}
          </button>

          <button
            onClick={fetchConnectedDevices}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            🔄 Refresh List
          </button>
        </div>
      </div>

      {/* Connected Devices List */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#1f2937'
        }}>
          Connected Devices ({connectedDevices.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading devices...
          </div>
        ) : connectedDevices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📱</p>
            <p style={{ fontSize: '16px', fontWeight: '500' }}>No devices connected</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Connect your first device using the form above</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {connectedDevices.map((device, index) => (
              <div
                key={index}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px' }}>
                    {getDeviceTypeIcon(device.type)}
                  </span>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                      {device.model}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                      Device ID: <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>{device.device_id}</code>
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Type: {device.type === 'physical' ? 'Physical Device' : 'Emulator'}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '6px 16px',
                  backgroundColor: getStatusColor(device.status),
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {device.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ADBConnectPage
