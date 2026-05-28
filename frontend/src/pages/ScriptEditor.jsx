import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

function ScriptEditor() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [script, setScript] = useState({
    name: '',
    description: '',
    code: `# Appium Python Test Script
from appium import webdriver
from appium.options.android import UiAutomator2Options
from appium.webdriver.common.appiumby import AppiumBy
import time

# Setup capabilities
options = UiAutomator2Options()
options.platform_name = "Android"
options.automation_name = "UiAutomator2"

# Connect to Appium server
driver = webdriver.Remote("http://YOUR_SERVER_IP:APPIUM_PORT", options=options)

try:
    # Your test code here
    print("Device connected successfully!")
    time.sleep(2)

    # Example: Find element and click
    # element = driver.find_element(AppiumBy.ID, "com.example:id/button")
    # element.click()

finally:
    driver.quit()
`,
    language: 'python',
    device_id: null
  })

  const [devices, setDevices] = useState([])
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [showInspector, setShowInspector] = useState(false)
  const [pageSource, setPageSource] = useState(null)
  const [executionResult, setExecutionResult] = useState(null)

  useEffect(() => {
    fetchDevices()
    if (id) {
      fetchScript()
    }
  }, [id])

  const fetchDevices = async () => {
    try {
      const response = await axios.get('/device/list')
      setDevices(response.data)
    } catch (error) {
      console.error('Error fetching devices:', error)
    }
  }

  const fetchScript = async () => {
    try {
      const response = await axios.get(`/codegen/scripts/${id}`)
      setScript(response.data)
    } catch (error) {
      console.error('Error fetching script:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (id) {
        await axios.put(`/codegen/scripts/${id}`, script)
        alert('Script saved successfully!')
      } else {
        const response = await axios.post('/codegen/scripts', script)
        alert('Script created successfully!')
        navigate(`/dashboard/scripts/edit/${response.data.id}`)
      }
    } catch (error) {
      console.error('Error saving script:', error)
      alert('Error saving script: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async () => {
    if (!script.device_id) {
      alert('Please select a device first!')
      return
    }

    try {
      setRunning(true)
      setExecutionResult(null)
      const response = await axios.post('/executor/execute', {
        script_id: id,
        device_id: script.device_id,
        code: script.code
      })
      setExecutionResult(response.data)
      alert('Script executed successfully!')
    } catch (error) {
      console.error('Error running script:', error)
      setExecutionResult({
        status: 'error',
        error: error.message
      })
      alert('Error running script: ' + error.message)
    } finally {
      setRunning(false)
    }
  }

  const handleInspectElements = async () => {
    if (!script.device_id) {
      alert('Please select a device first!')
      return
    }

    try {
      const response = await axios.get(`/device/${script.device_id}/page-source`)
      setPageSource(response.data)
      setShowInspector(true)
    } catch (error) {
      console.error('Error fetching page source:', error)
      alert('Error: ' + error.message)
    }
  }

  const parsePageSource = (xml) => {
    const elements = []
    const regex = /<node[^>]*>/g
    const matches = xml.matchAll(regex)

    for (const match of matches) {
      const nodeStr = match[0]
      const attrs = {}
      const attrRegex = /(\w+)="([^"]*)"/g
      const attrMatches = nodeStr.matchAll(attrRegex)

      for (const attrMatch of attrMatches) {
        attrs[attrMatch[1]] = attrMatch[2]
      }

      if (attrs.class || attrs['resource-id'] || attrs.text) {
        elements.push(attrs)
      }
    }

    return elements
  }

  const handleElementClick = (element) => {
    let locator = ''
    if (element['resource-id']) {
      locator = `driver.find_element(AppiumBy.ID, "${element['resource-id']}")`
    } else if (element.text) {
      locator = `driver.find_element(AppiumBy.XPATH, "//*[@text='${element.text}']")`
    } else if (element.class) {
      locator = `driver.find_element(AppiumBy.CLASS_NAME, "${element.class}")`
    }

    if (locator) {
      setScript({ ...script, code: script.code + `\n${locator}\n` })
    }
  }

  return (
    <div className="flex flex-col h-screen bg-dark-900">
      {/* Toolbar */}
      <div className="bg-dark-800 border-b border-dark-700 px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/scripts')}
          className="btn btn-secondary"
        >
          ← Back
        </button>

        <input
          type="text"
          placeholder="Script Name"
          value={script.name}
          onChange={(e) => setScript({ ...script, name: e.target.value })}
          className="input flex-1 max-w-xs"
        />

        <select
          value={script.device_id || ''}
          onChange={(e) => setScript({ ...script, device_id: e.target.value })}
          className="input max-w-xs"
        >
          <option value="">Select Device</option>
          {devices.map(device => (
            <option key={device.id} value={device.id}>
              {device.name} ({device.status})
            </option>
          ))}
        </select>

        <div className="flex-1"></div>

        <button
          onClick={handleInspectElements}
          disabled={!script.device_id}
          className="btn btn-primary disabled:opacity-50"
        >
          🔍 Inspect Elements
        </button>

        <button
          onClick={handleRun}
          disabled={running || !script.device_id}
          className="btn bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
        >
          ▶️ {running ? 'Running...' : 'Run'}
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary disabled:opacity-50"
        >
          💾 {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Main Editor + Inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor */}
        <div className={showInspector ? 'w-2/3' : 'w-full'}>
          <textarea
            value={script.code}
            onChange={(e) => setScript({ ...script, code: e.target.value })}
            className="w-full h-full bg-dark-900 text-white p-4 font-mono text-sm resize-none border-0 focus:outline-none focus:ring-2 focus:ring-primary-500"
            style={{ fontFamily: 'Monaco, Consolas, monospace' }}
          />
        </div>

        {/* Element Inspector Panel */}
        {showInspector && (
          <div className="w-1/3 bg-dark-800 border-l border-dark-700 overflow-auto">
            <div className="px-4 py-3 border-b border-dark-700 flex justify-between items-center">
              <h3 className="font-semibold">Element Inspector</h3>
              <button
                onClick={() => setShowInspector(false)}
                className="btn bg-dark-700 hover:bg-dark-600 text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {pageSource && (
                <>
                  <p className="text-sm text-dark-400 mb-4">
                    Click on an element to insert locator code
                  </p>

                  {parsePageSource(pageSource).map((element, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleElementClick(element)}
                      className="bg-dark-700 hover:bg-primary-600 p-3 mb-2 rounded cursor-pointer border border-dark-600 transition-all"
                    >
                      <div className="text-sm font-semibold mb-1">
                        {element.class?.split('.').pop() || 'View'}
                      </div>
                      {element['resource-id'] && (
                        <div className="text-xs text-green-400">
                          ID: {element['resource-id']}
                        </div>
                      )}
                      {element.text && (
                        <div className="text-xs text-yellow-400">
                          Text: "{element.text}"
                        </div>
                      )}
                      {element.bounds && (
                        <div className="text-xs text-dark-400">
                          Bounds: {element.bounds}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Execution Result Panel */}
      {executionResult && (
        <div className={`px-4 py-3 border-t border-dark-700 max-h-48 overflow-auto ${
          executionResult.status === 'error' ? 'bg-red-900/20' : 'bg-green-900/20'
        }`}>
          <h4 className="font-semibold mb-2">
            {executionResult.status === 'error' ? '❌ Execution Failed' : '✅ Execution Successful'}
          </h4>
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {executionResult.output || executionResult.error || 'No output'}
          </pre>
        </div>
      )}
    </div>
  )
}

export default ScriptEditor
