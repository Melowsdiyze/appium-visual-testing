import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import VirtualKeyboard from '../components/VirtualKeyboard'

function ViewDevicePage() {
  const { deviceId } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const vncIframeRef = useRef(null)

  useEffect(() => {
    fetchDeviceDetails()
  }, [deviceId])

  useEffect(() => {
    // Auto-focus iframe for keyboard input and inject CSS to hide fullscreen button
    if (vncIframeRef.current && device) {
      const focusIframe = () => {
        try {
          vncIframeRef.current.focus()
        } catch (e) {
          console.log('Could not focus iframe:', e)
        }
      }

      // Focus on mount and when clicking anywhere on the page
      focusIframe()
      window.addEventListener('click', focusIframe)

      // Try to hide fullscreen button after iframe loads
      const hideFullscreenButton = () => {
        try {
          const iframeDoc = vncIframeRef.current.contentDocument || vncIframeRef.current.contentWindow.document
          if (iframeDoc) {
            const style = iframeDoc.createElement('style')
            style.textContent = `
              #noVNC_fullscreen_button,
              button[title="Fullscreen"],
              .noVNC_button[title="Fullscreen"] {
                display: none !important;
              }
            `
            iframeDoc.head.appendChild(style)
          }
        } catch (e) {
          // Cross-origin iframe, cannot access
          console.log('Cannot inject CSS (cross-origin):', e)
        }
      }

      // Try to inject after a delay
      setTimeout(hideFullscreenButton, 2000)

      return () => window.removeEventListener('click', focusIframe)
    }
  }, [device])

  const fetchDeviceDetails = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/devices/${deviceId}/status`)
      setDevice(response.data)
    } catch (error) {
      console.error('Error fetching device:', error)
      setError('Failed to load device details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ color: '#94a3b8', marginTop: '20px' }}>Loading device...</p>
      </div>
    )
  }

  if (error || !device) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#dc2626', marginBottom: '20px' }}>{error || 'Device not found'}</p>
        <button
          onClick={() => navigate('/dashboard/devices')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Back to Devices
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#0a0f1a',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
            📱 {device.name}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Device Viewer - Full Screen
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/devices')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#64748b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          ← Back
        </button>
      </div>

      {/* Main Content - Split View */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '20px',
        flex: 1
      }}>
        {/* Left Panel - VNC Viewer */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'auto'
        }}>
          {device.vnc_url ? (
            <div style={{
              width: '100%',
              maxWidth: '1080px',
              height: 'calc(100vh - 100px)',
              minHeight: '1920px',
              backgroundColor: '#000000',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid #334155'
            }}>
              <iframe
                ref={vncIframeRef}
                src={device.vnc_url}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="Device VNC Viewer"
                allow="clipboard-read; clipboard-write"
                tabIndex="0"
              />
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8'
            }}>
              VNC not available for this device
            </div>
          )}
        </div>

        {/* Right Panel - Virtual Keyboard */}
        <div>
          <VirtualKeyboard deviceId={deviceId} />
        </div>
      </div>
    </div>
  )
}

export default ViewDevicePage
