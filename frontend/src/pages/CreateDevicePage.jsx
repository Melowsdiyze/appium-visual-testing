import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function CreateDevicePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    device_type: 'emulator',
    device_model: 'Pixel_6_Pro_API_34',
    android_version: '14.0',
    memory: '4096',
    storage: '8192',
    cpu_cores: '2',
    adb_host: '',
    adb_port: '5555'
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('Device name is required')
      return
    }

    if (formData.device_type === 'real_device' && !formData.adb_host.trim()) {
      setError('ADB Host IP is required for real device')
      return
    }

    try {
      setLoading(true)
      setError('')

      await axios.post('/devices/create', formData)

      navigate('/dashboard/devices')
    } catch (error) {
      console.error('Error creating device:', error)
      setError(error.response?.data?.detail || 'Failed to create device')
    } finally {
      setLoading(false)
    }
  }

  const isRealDevice = formData.device_type === 'real_device'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button
          onClick={() => navigate('/dashboard/devices')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'transparent',
            color: '#94a3b8',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '15px',
            padding: '5px 0'
          }}
        >
          ← Back to Devices
        </button>
        <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
          Create New Device
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Create Android emulator or connect real device via ADB
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Form */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '30px'
        }}>
          <form onSubmit={handleSubmit}>
            {/* Error */}
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

            {/* Device Type */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '10px'
              }}>
                Device Type *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  onClick={() => setFormData({...formData, device_type: 'emulator'})}
                  style={{
                    padding: '20px',
                    backgroundColor: formData.device_type === 'emulator' ? '#3b82f6' : '#1e293b',
                    border: `2px solid ${formData.device_type === 'emulator' ? '#3b82f6' : '#334155'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📱</div>
                  <div style={{ color: '#ffffff', fontWeight: '600', marginBottom: '5px' }}>Emulator</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Virtual Android device</div>
                </div>
                <div
                  onClick={() => setFormData({...formData, device_type: 'real_device'})}
                  style={{
                    padding: '20px',
                    backgroundColor: formData.device_type === 'real_device' ? '#3b82f6' : '#1e293b',
                    border: `2px solid ${formData.device_type === 'real_device' ? '#3b82f6' : '#334155'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📲</div>
                  <div style={{ color: '#ffffff', fontWeight: '600', marginBottom: '5px' }}>Real Device</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>Connect via ADB</div>
                </div>
              </div>
            </div>

            {/* Device Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                Device Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., My Test Device"
                required
                style={{
                  width: '100%',
                  padding: '10px 15px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* ADB Connection (Real Device Only) */}
            {isRealDevice && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    ADB Host IP *
                  </label>
                  <input
                    type="text"
                    name="adb_host"
                    value={formData.adb_host}
                    onChange={handleChange}
                    placeholder="e.g., 192.168.1.100"
                    required={isRealDevice}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ color: '#64748b', fontSize: '12px', marginTop: '5px' }}>
                    IP address of your Android device
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    ADB Port
                  </label>
                  <input
                    type="text"
                    name="adb_port"
                    value={formData.adb_port}
                    onChange={handleChange}
                    placeholder="5555"
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ color: '#64748b', fontSize: '12px', marginTop: '5px' }}>
                    Default: 5555
                  </p>
                </div>
              </>
            )}

            {/* Emulator Options */}
            {!isRealDevice && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    Device Model
                  </label>
                  <select
                    name="device_model"
                    value={formData.device_model}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  >
                    <option value="Pixel_6_Pro_API_34">Pixel 6 Pro</option>
                    <option value="Pixel_5_API_33">Pixel 5</option>
                    <option value="Pixel_4_API_30">Pixel 4</option>
                    <option value="Samsung_Galaxy_S10">Samsung Galaxy S10</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    Android Version
                  </label>
                  <select
                    name="android_version"
                    value={formData.android_version}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '10px 15px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  >
                    <option value="14.0">Android 14.0</option>
                    <option value="13.0">Android 13.0</option>
                    <option value="12.0">Android 12.0</option>
                    <option value="11.0">Android 11.0</option>
                  </select>
                </div>

                {/* Resource Settings */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '15px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      RAM (MB)
                    </label>
                    <select
                      name="memory"
                      value={formData.memory}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    >
                      <option value="2048">2 GB</option>
                      <option value="4096">4 GB</option>
                      <option value="6144">6 GB</option>
                      <option value="8192">8 GB</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      Storage (MB)
                    </label>
                    <select
                      name="storage"
                      value={formData.storage}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    >
                      <option value="4096">4 GB</option>
                      <option value="8192">8 GB</option>
                      <option value="16384">16 GB</option>
                      <option value="32768">32 GB</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '8px'
                    }}>
                      CPU Cores
                    </label>
                    <select
                      name="cpu_cores"
                      value={formData.cpu_cores}
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    >
                      <option value="1">1 Core</option>
                      <option value="2">2 Cores</option>
                      <option value="4">4 Cores</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  backgroundColor: loading ? '#64748b' : '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                {loading ? 'Creating...' : `✅ Create ${isRealDevice ? 'Connection' : 'Device'}`}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/devices')}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '30px'
        }}>
          <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
            {isRealDevice ? '📲 Real Device Setup' : '📱 Emulator Info'}
          </h3>

          {isRealDevice ? (
            <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '15px' }}>
                Connect your Android device via ADB over network.
              </p>

              <div style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px'
              }}>
                <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>
                  📋 Setup Steps:
                </h4>
                <ol style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8' }}>
                  <li>Enable Developer Options on device</li>
                  <li>Enable USB Debugging</li>
                  <li>Connect via USB first</li>
                  <li>Run: adb tcpip 5555</li>
                  <li>Disconnect USB</li>
                  <li>Find device IP in Settings → About</li>
                  <li>Enter IP above and connect</li>
                </ol>
              </div>

              <div style={{
                backgroundColor: '#dcfce7',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '15px'
              }}>
                <h4 style={{ color: '#166534', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>
                  ✅ Advantages:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#15803d' }}>
                  <li>Much faster than emulator</li>
                  <li>Real device performance</li>
                  <li>Actual sensors & hardware</li>
                  <li>VNC & Element Inspector available</li>
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '15px' }}>
                Creating emulator will start Docker container with Android.
              </p>

              <div style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px'
              }}>
                <h4 style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>
                  📋 Includes:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8' }}>
                  <li>Appium Server</li>
                  <li>VNC Server (remote view)</li>
                  <li>ADB access</li>
                  <li>Element Inspector</li>
                </ul>
              </div>

              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: '8px',
                padding: '15px'
              }}>
                <h4 style={{ color: '#92400e', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>
                  ⚠️ Note:
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#78350f' }}>
                  <li>Creation: 2-5 minutes</li>
                  <li>Higher RAM = Better performance</li>
                  <li>Requires KVM for acceleration</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateDevicePage
