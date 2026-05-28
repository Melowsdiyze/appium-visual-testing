import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

function DeviceViewer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [powerAction, setPowerAction] = useState(null)

  useEffect(() => {
    fetchDevice()
  }, [id])

  const fetchDevice = async () => {
    try {
      setLoading(true)
      // Get all devices and find by ID
      const response = await axios.get('/device/list')
      const foundDevice = response.data.find(d => d.id === id)

      if (foundDevice) {
        setDevice(foundDevice)
      }
    } catch (error) {
      console.error('Error fetching device:', error)
      alert('Error loading device')
    } finally {
      setLoading(false)
    }
  }

  const handlePowerAction = async (action) => {
    try {
      setPowerAction(action)
      await axios.post(`/device/${id}/power?action=${action}`)
      setTimeout(() => setPowerAction(null), 1000)
    } catch (error) {
      console.error('Error power action:', error)
      alert('Error: ' + error.message)
      setPowerAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-dark-900">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-dark-300">Loading device...</p>
        </div>
      </div>
    )
  }

  if (!device || !device.vnc_url) {
    return (
      <div className="flex justify-center items-center h-screen bg-dark-900 flex-col gap-4">
        <p className="text-xl text-red-400">Device VNC not available</p>
        <button
          onClick={() => navigate('/dashboard/devices')}
          className="btn btn-primary"
        >
          ← Back to Devices
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-dark-900">
      {/* Toolbar */}
      <div className="bg-dark-800 border-b border-dark-700 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/devices')}
          className="btn btn-secondary"
        >
          ← Back
        </button>

        <div className="flex-1">
          <strong className="text-lg">{device.name}</strong>
          <span className="ml-4 text-dark-400">
            Status: <span className={`status-badge status-${device.status.toLowerCase()}`}>{device.status}</span>
          </span>
        </div>

        {/* Power Controls */}
        <div className="flex gap-2 border-l border-dark-700 pl-4">
          <button
            onClick={() => handlePowerAction('wake')}
            disabled={powerAction !== null}
            className="btn bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            title="Wake up device"
          >
            {powerAction === 'wake' ? '⏳' : '☀️ Wake'}
          </button>

          <button
            onClick={() => handlePowerAction('press')}
            disabled={powerAction !== null}
            className="btn btn-primary disabled:opacity-50"
            title="Press power button"
          >
            {powerAction === 'press' ? '⏳' : '⚡ Power'}
          </button>

          <button
            onClick={() => handlePowerAction('sleep')}
            disabled={powerAction !== null}
            className="btn bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50"
            title="Put device to sleep"
          >
            {powerAction === 'sleep' ? '⏳' : '🌙 Sleep'}
          </button>
        </div>
      </div>

      {/* VNC Viewer */}
      <div className="flex-1 relative bg-black">
        <iframe
          src={device.vnc_url}
          className="w-full h-full border-0"
          title="Device Screen"
        />
      </div>
    </div>
  )
}

export default DeviceViewer
