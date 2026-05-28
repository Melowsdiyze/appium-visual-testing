import { useState } from 'react'
import axios from 'axios'

function VirtualKeyboard({ deviceId }) {
  const [textInput, setTextInput] = useState('')
  const [sending, setSending] = useState(false)

  const sendText = async () => {
    if (!textInput.trim()) return

    try {
      setSending(true)
      await axios.post(`/devices/${deviceId}/input/text`, {
        text: textInput
      })
      setTextInput('')
    } catch (error) {
      console.error('Error sending text:', error)
      alert('Failed to send text: ' + (error.response?.data?.detail || error.message))
    } finally {
      setSending(false)
    }
  }

  const sendKeyEvent = async (keycode) => {
    try {
      await axios.post(`/devices/${deviceId}/input/keyevent`, {
        keycode
      })
    } catch (error) {
      console.error('Error sending key event:', error)
      alert('Failed to send key: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setTextInput(text)
    } catch (error) {
      console.error('Error pasting:', error)
      alert('Failed to paste from clipboard')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendText()
    }
  }

  return (
    <div style={{
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '20px'
    }}>
      <h3 style={{
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '15px'
      }}>
        ⌨️ Virtual Keyboard
      </h3>

      {/* Text Input Field */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type text here..."
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={handlePaste}
            style={{
              padding: '12px 16px',
              backgroundColor: '#64748b',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
            title="Paste from clipboard"
          >
            📋 Paste
          </button>
          <button
            onClick={sendText}
            disabled={sending || !textInput.trim()}
            style={{
              padding: '12px 20px',
              backgroundColor: sending || !textInput.trim() ? '#334155' : '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: sending || !textInput.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {sending ? '⏳ Sending...' : '📤 Send'}
          </button>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '12px' }}>
          Type text and click Send, or press Enter to send to device
        </p>
      </div>

      {/* Special Keys */}
      <div>
        <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '10px' }}>
          Special Keys:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_ENTER')} label="Enter" icon="↵" />
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_DEL')} label="Backspace" icon="⌫" />
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_SPACE')} label="Space" icon="␣" />
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_TAB')} label="Tab" icon="⇥" />
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_BACK')} label="Back" icon="←" />
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_HOME')} label="Home" icon="🏠" />
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_MENU')} label="Menu" icon="☰" />
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_SEARCH')} label="Search" icon="🔍" />
        </div>
      </div>

      {/* Arrow Keys */}
      <div style={{ marginTop: '15px' }}>
        <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '10px' }}>
          Arrow Keys:
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          maxWidth: '200px'
        }}>
          <div></div>
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_DPAD_UP')} label="↑" icon="↑" />
          <div></div>
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_DPAD_LEFT')} label="←" icon="←" />
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_DPAD_CENTER')} label="OK" icon="⊙" />
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_DPAD_RIGHT')} label="→" icon="→" />
          <div></div>
          <KeyButton onClick={() => sendKeyEvent('KEYCODE_DPAD_DOWN')} label="↓" icon="↓" />
          <div></div>
        </div>
      </div>
    </div>
  )
}

function KeyButton({ onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px',
        backgroundColor: '#334155',
        color: '#ffffff',
        border: '1px solid #475569',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#475569'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#334155'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      title={label}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{label}</span>
    </button>
  )
}

export default VirtualKeyboard
