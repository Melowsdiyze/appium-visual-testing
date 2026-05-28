import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import VirtualKeyboard from '../components/VirtualKeyboard'

function ElementInspectorPage() {
  const { deviceId } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pageSource, setPageSource] = useState('')
  const [elements, setElements] = useState([])
  const [selectedElement, setSelectedElement] = useState(null)
  const [inspecting, setInspecting] = useState(false)
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

  const inspectElements = async () => {
    try {
      setInspecting(true)
      setError('')

      // Call the page-source endpoint to get UI hierarchy
      const response = await axios.get(`/devices/${deviceId}/page-source`)

      // Response might be plain XML string
      const xmlString = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
      setPageSource(xmlString)

      // Parse XML to extract elements
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

      // Check for parsing errors
      const parserError = xmlDoc.getElementsByTagName('parsererror')
      if (parserError.length > 0) {
        throw new Error('Failed to parse XML from device')
      }

      const parsedElements = parseElements(xmlDoc.documentElement, [], 0)

      if (parsedElements.length === 0) {
        throw new Error('No UI elements found. Device might not be ready.')
      }

      setElements(parsedElements)
    } catch (error) {
      console.error('Error inspecting elements:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to inspect elements'
      setError(`${errorMsg}. Make sure the device is running and Appium is ready.`)
    } finally {
      setInspecting(false)
    }
  }

  const parseElements = (node, path, depth) => {
    if (!node || node.nodeType !== 1) return []

    const element = {
      id: Math.random().toString(36).substr(2, 9),
      tag: node.nodeName,
      depth: depth,
      path: [...path, node.nodeName].join(' > '),
      attributes: {},
      xpath: generateXPath(node),
      bounds: node.getAttribute('bounds') || '',
      text: node.getAttribute('text') || '',
      resourceId: node.getAttribute('resource-id') || '',
      className: node.getAttribute('class') || '',
      packageName: node.getAttribute('package') || '',
      contentDesc: node.getAttribute('content-desc') || '',
      checkable: node.getAttribute('checkable') === 'true',
      checked: node.getAttribute('checked') === 'true',
      clickable: node.getAttribute('clickable') === 'true',
      enabled: node.getAttribute('enabled') === 'true',
      focusable: node.getAttribute('focusable') === 'true',
      focused: node.getAttribute('focused') === 'true',
      scrollable: node.getAttribute('scrollable') === 'true',
      longClickable: node.getAttribute('long-clickable') === 'true',
      password: node.getAttribute('password') === 'true',
      selected: node.getAttribute('selected') === 'true'
    }

    // Get all attributes
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i]
      element.attributes[attr.name] = attr.value
    }

    const result = [element]

    // Recursively parse children
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i]
      if (child.nodeType === 1) {
        result.push(...parseElements(child, [...path, node.nodeName], depth + 1))
      }
    }

    return result
  }

  const generateXPath = (node) => {
    if (!node || node.nodeType !== 1) return ''

    const getElementIndex = (element) => {
      let index = 1
      let sibling = element.previousSibling
      while (sibling) {
        if (sibling.nodeType === 1 && sibling.nodeName === element.nodeName) {
          index++
        }
        sibling = sibling.previousSibling
      }
      return index
    }

    const parts = []
    let current = node

    while (current && current.nodeType === 1) {
      const index = getElementIndex(current)
      const tagName = current.nodeName
      parts.unshift(`${tagName}[${index}]`)
      current = current.parentNode
    }

    return '//' + parts.join('/')
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ color: '#94a3b8', marginTop: '20px' }}>Loading device...</p>
      </div>
    )
  }

  if (!device) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#dc2626' }}>Device not found</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
            🔍 Element Inspector
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Device: {device.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={inspectElements}
            disabled={inspecting}
            style={{
              padding: '10px 20px',
              backgroundColor: inspecting ? '#64748b' : '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: inspecting ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {inspecting ? '🔄 Inspecting...' : '🔍 Inspect Elements'}
          </button>
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

      {/* Main Content - Split View */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(500px, 700px) 1fr',
        gap: '20px',
        minHeight: 'calc(100vh - 200px)'
      }}>
        {/* Left Panel - VNC Viewer & Keyboard */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          height: 'calc(100vh - 200px)',
          overflow: 'auto'
        }}>
          {/* VNC Viewer */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '20px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '600px'
          }}>
            <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
              📱 Device Screen
            </h3>
            {device.vnc_url ? (
              <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                overflow: 'auto',
                backgroundColor: '#000000',
                borderRadius: '8px',
                position: 'relative'
              }}>
                {/* Portrait device container - fullscreen */}
                <iframe
                  ref={vncIframeRef}
                  src={device.vnc_url}
                  style={{
                    width: '100%',
                    minHeight: '1400px',
                    height: '100%',
                    border: 'none',
                    borderRadius: '8px'
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

          {/* Virtual Keyboard */}
          <VirtualKeyboard deviceId={deviceId} />
        </div>

        {/* Right Panel - Element Tree & Properties */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>
            🌳 Element Hierarchy
          </h3>

          {elements.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              textAlign: 'center'
            }}>
              <div>
                <p style={{ marginBottom: '10px' }}>No elements inspected yet</p>
                <p style={{ fontSize: '14px' }}>Click "Inspect Elements" to start</p>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px', overflow: 'hidden' }}>
              {/* Element Tree */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '10px'
              }}>
                {elements.map((element) => (
                  <div
                    key={element.id}
                    onClick={() => setSelectedElement(element)}
                    style={{
                      paddingLeft: `${element.depth * 15}px`,
                      padding: '8px',
                      marginBottom: '5px',
                      backgroundColor: selectedElement?.id === element.id ? '#3b82f6' : 'transparent',
                      color: '#ffffff',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedElement?.id !== element.id) {
                        e.currentTarget.style.backgroundColor = '#334155'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedElement?.id !== element.id) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <span style={{ color: '#60a5fa' }}>&lt;{element.tag}&gt;</span>
                    {element.text && (
                      <span style={{ color: '#94a3b8', marginLeft: '8px' }}>
                        "{element.text}"
                      </span>
                    )}
                    {element.resourceId && (
                      <span style={{ color: '#fbbf24', marginLeft: '8px', fontSize: '11px' }}>
                        @{element.resourceId.split('/').pop()}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Selected Element Properties */}
              {selectedElement && (
                <div style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '15px',
                  maxHeight: '40%',
                  overflow: 'auto'
                }}>
                  <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                    📋 Element Properties
                  </h4>

                  {/* XPath */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                      XPath:
                    </label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input
                        type="text"
                        value={selectedElement.xpath}
                        readOnly
                        style={{
                          flex: 1,
                          padding: '6px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        onClick={() => copyToClipboard(selectedElement.xpath)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Resource ID */}
                  {selectedElement.resourceId && (
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                        Resource ID:
                      </label>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <input
                          type="text"
                          value={selectedElement.resourceId}
                          readOnly
                          style={{
                            flex: 1,
                            padding: '6px',
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '4px',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}
                        />
                        <button
                          onClick={() => copyToClipboard(selectedElement.resourceId)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#3b82f6',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Other Properties Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    fontSize: '12px'
                  }}>
                    <PropertyItem label="Class" value={selectedElement.className} />
                    <PropertyItem label="Package" value={selectedElement.packageName} />
                    <PropertyItem label="Text" value={selectedElement.text} />
                    <PropertyItem label="Content Desc" value={selectedElement.contentDesc} />
                    <PropertyItem label="Bounds" value={selectedElement.bounds} />
                    <PropertyItem label="Clickable" value={selectedElement.clickable ? '✓' : '✗'} />
                    <PropertyItem label="Enabled" value={selectedElement.enabled ? '✓' : '✗'} />
                    <PropertyItem label="Focusable" value={selectedElement.focusable ? '✓' : '✗'} />
                    <PropertyItem label="Scrollable" value={selectedElement.scrollable ? '✓' : '✗'} />
                    <PropertyItem label="Checkable" value={selectedElement.checkable ? '✓' : '✗'} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PropertyItem({ label, value }) {
  if (!value) return null

  return (
    <div style={{
      backgroundColor: '#0f172a',
      padding: '8px',
      borderRadius: '4px',
      border: '1px solid #334155'
    }}>
      <div style={{ color: '#94a3b8', marginBottom: '3px' }}>{label}:</div>
      <div style={{ color: '#ffffff', fontFamily: 'monospace', wordBreak: 'break-word' }}>
        {value}
      </div>
    </div>
  )
}

export default ElementInspectorPage
