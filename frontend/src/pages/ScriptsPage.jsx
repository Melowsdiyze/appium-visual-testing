import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function ScriptsPage() {
  const navigate = useNavigate()
  const [scripts, setScripts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedScript, setSelectedScript] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetchScripts()
  }, [])

  const fetchScripts = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/codegen/scripts')
      setScripts(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching scripts:', error)
      // For now, just set empty array if endpoint doesn't exist
      setScripts([])
    } finally {
      setLoading(false)
    }
  }

  const handleViewScript = (script) => {
    setSelectedScript(script)
  }

  const handleRunScript = async () => {
    if (!selectedScript) return

    try {
      setRunning(true)
      // Get available devices first
      const devicesResponse = await axios.get('/devices/list')
      const devices = devicesResponse.data

      if (devices.length === 0) {
        alert('No devices available. Please create a device first.')
        return
      }

      // Run on all available devices
      const deviceIds = devices.map(d => d.id)

      await axios.post('/codegen/run', {
        language: 'python', // Default to python for now
        code: selectedScript.code,
        environment: 'default',
        devices: deviceIds
      })

      alert('Script execution started! Check Results page for status.')
      navigate('/dashboard/results')
    } catch (error) {
      console.error('Error running script:', error)
      alert('Failed to run script: ' + (error.response?.data?.detail || error.message))
    } finally {
      setRunning(false)
    }
  }

  const handleDownloadScript = () => {
    if (!selectedScript) return

    const blob = new Blob([selectedScript.code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedScript.name}.py`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ color: '#94a3b8', marginTop: '20px' }}>Loading scripts...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
            My Test Scripts
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Create and manage your Appium automation scripts
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/scripts/create')}
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
          <span>+</span> Create Script
        </button>
      </div>

      {/* Empty State */}
      {scripts.length === 0 ? (
        <div style={{
          backgroundColor: '#1e293b',
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
            <span style={{ fontSize: '40px' }}>📝</span>
          </div>
          <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
            No scripts yet
          </h3>
          <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
            Create your first test script to automate mobile testing
          </p>
          <button
            onClick={() => navigate('/dashboard/scripts/create')}
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
            <span>+</span> Create Script
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: selectedScript ? '1fr 2fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {/* Scripts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scripts.map((script) => (
              <div
                key={script.id}
                onClick={() => handleViewScript(script)}
                style={{
                  backgroundColor: selectedScript?.id === script.id ? '#1e40af' : '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '15px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    backgroundColor: '#3b82f6',
                    padding: '8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '20px' }}>📝</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {script.name}
                    </h4>
                    <p style={{ color: '#94a3b8', fontSize: '11px', margin: '4px 0 0 0' }}>
                      {new Date(script.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Script Details */}
          {selectedScript && (
            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                    {selectedScript.name}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Created: {new Date(selectedScript.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedScript(null)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    padding: '0',
                    width: '30px',
                    height: '30px'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '15px',
                overflowX: 'auto',
                marginBottom: '20px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <pre style={{
                  color: '#ffffff',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {selectedScript.code}
                </pre>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleRunScript}
                  disabled={running}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: running ? '#64748b' : '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: running ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {running ? '⏳ Running...' : '▶️ Run Script'}
                </button>
                <button
                  onClick={handleDownloadScript}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#334155',
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
                  ⬇️ Download
                </button>
                <button
                  onClick={() => navigate(`/dashboard/scripts/edit/${selectedScript.id}`)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f59e0b',
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
                  ✏️ Edit Script
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ScriptsPage
