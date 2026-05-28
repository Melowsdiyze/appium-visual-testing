import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'

function EditScriptPage() {
  const { scriptId } = useParams()
  const navigate = useNavigate()

  const [scriptName, setScriptName] = useState('')
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState({
    python: '',
    javascript: '',
    java: '',
    ruby: ''
  })
  const [selectedDevices, setSelectedDevices] = useState([])
  const [devices, setDevices] = useState([])
  const [environments, setEnvironments] = useState([])
  const [selectedEnv, setSelectedEnv] = useState('default')
  const [requirements, setRequirements] = useState('appium-python-client\nselenium\nrequests')
  const [showRequirementsPopup, setShowRequirementsPopup] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)

  useEffect(() => {
    loadScript()
    loadDevices()
    loadEnvironments()
  }, [scriptId])

  const loadScript = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/codegen/scripts`)
      const scripts = response.data
      const script = scripts.find(s => s.id === scriptId)

      if (script) {
        setScriptName(script.name)
        setLanguage(script.language || 'python')
        setCode({ ...code, [script.language || 'python']: script.code })

        if (script.config) {
          if (script.config.devices) {
            setSelectedDevices(script.config.devices)
          }
          if (script.config.environment) {
            setSelectedEnv(script.config.environment)
          }
          if (script.config.requirements) {
            setRequirements(script.config.requirements)
          }
        }
      } else {
        alert('Script not found')
        navigate('/dashboard/scripts')
      }
    } catch (error) {
      console.error('Error loading script:', error)
      alert('Failed to load script')
    } finally {
      setLoading(false)
    }
  }

  const loadDevices = async () => {
    try {
      const response = await axios.get('/devices/list')
      setDevices(response.data)
    } catch (error) {
      console.error('Error loading devices:', error)
    }
  }

  const loadEnvironments = async () => {
    try {
      const response = await axios.get('/codegen/environments')
      setEnvironments(response.data)
    } catch (error) {
      console.error('Error loading environments:', error)
    }
  }

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleLineNumbers = (text) => {
    const lines = text.split('\n')
    return lines.map((_, i) => (i + 1).toString().padStart(3, ' ')).join('\n')
  }

  const handleDeviceToggle = (deviceId) => {
    if (selectedDevices.includes(deviceId)) {
      setSelectedDevices(selectedDevices.filter(id => id !== deviceId))
    } else {
      setSelectedDevices([...selectedDevices, deviceId])
    }
  }

  const handleSave = async () => {
    if (!scriptName.trim()) {
      alert('Script name is required')
      return
    }

    if (!code[language].trim()) {
      alert('Code cannot be empty')
      return
    }

    try {
      setSaving(true)
      await axios.put(`/codegen/scripts/${scriptId}`, {
        name: scriptName,
        code: code[language],
        language,
        environment: selectedEnv,
        devices: selectedDevices,
        schedule: null,
        config: {
          environment: selectedEnv,
          devices: selectedDevices,
          requirements: requirements
        }
      })

      alert('Script updated successfully!')
      navigate('/dashboard/scripts')
    } catch (error) {
      alert('Failed to update script: ' + (error.response?.data?.detail || error.message))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>Loading script...</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
          ✏️ Edit Script
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard/scripts')} style={{ padding: '10px 20px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', backgroundColor: saving ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column - Code Editor */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              Script Name
            </label>
            <input type="text" value={scriptName} onChange={(e) => setScriptName(e.target.value)} placeholder="My Test Script" style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              Programming Language
            </label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px', fontSize: '14px' }}>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="ruby">Ruby</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ color: '#94a3b8', fontSize: '14px' }}>Code Editor</label>
              <button onClick={() => setShowRequirementsPopup(true)} style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                📦 Requirements.txt
              </button>
            </div>
            <div style={{ display: 'flex', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', height: '400px' }}>
              <div ref={lineNumbersRef} style={{ backgroundColor: '#1e293b', padding: '10px 8px', color: '#64748b', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.5', textAlign: 'right', userSelect: 'none', minWidth: '45px', overflow: 'hidden', whiteSpace: 'pre' }}>
                {handleLineNumbers(code[language])}
              </div>
              <textarea ref={textareaRef} onScroll={handleScroll} value={code[language]} onChange={(e) => setCode({ ...code, [language]: e.target.value })} placeholder={`Write your ${language} code here...`} style={{ flex: 1, padding: '10px', backgroundColor: '#0f172a', color: '#e2e8f0', border: 'none', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.5', resize: 'none', outline: 'none' }} spellCheck={false} />
            </div>
          </div>
        </div>

        {/* Right Column - Settings */}
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              📱 Select Devices (can select multiple)
            </label>
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '12px', maxHeight: '200px', overflowY: 'auto' }}>
              {devices.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>No devices available</p>
              ) : (
                devices.map(device => (
                  <label key={device.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderRadius: '4px', backgroundColor: selectedDevices.includes(device.id) ? '#1e293b' : 'transparent' }}>
                    <input type="checkbox" checked={selectedDevices.includes(device.id)} onChange={() => handleDeviceToggle(device.id)} style={{ marginRight: '10px' }} />
                    <span style={{ color: 'white', fontSize: '14px' }}>{device.name}</span>
                    <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '12px' }}>{device.device_model}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              Environment
            </label>
            <select value={selectedEnv} onChange={(e) => setSelectedEnv(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px', fontSize: '14px' }}>
              <option value="default">Default</option>
              {environments.map(env => (
                <option key={env.name} value={env.name}>{env.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requirements Popup */}
      {showRequirementsPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: 'white', fontSize: '18px', margin: 0 }}>📦 Requirements.txt</h3>
              <button onClick={() => setShowRequirementsPopup(false)} style={{ backgroundColor: 'transparent', color: '#94a3b8', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>
            <textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="package-name==version" style={{ width: '100%', height: '300px', padding: '12px', backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', resize: 'none', boxSizing: 'border-box' }} />
            <button onClick={() => setShowRequirementsPopup(false)} style={{ marginTop: '16px', width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
              Save Requirements
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditScriptPage
