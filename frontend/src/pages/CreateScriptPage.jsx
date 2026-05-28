import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function CreateScriptPage() {
  const navigate = useNavigate()
  const [scriptName, setScriptName] = useState('')
  const [language, setLanguage] = useState('python')
  const textareaRef = useRef(null)
  const lineNumbersRef = useRef(null)
  const [code, setCode] = useState({
    python: `from appium import webdriver
from appium.options.android import UiAutomator2Options

# Appium server URL
appium_server = "http://localhost:4723"

# Capabilities
options = UiAutomator2Options()
options.platform_name = "Android"
options.automation_name = "UiAutomator2"

# Connect to device
driver = webdriver.Remote(appium_server, options=options)

try:
    # Your test code here
    print("Device connected successfully!")

    # Example: Find and click element
    # element = driver.find_element(by=AppiumBy.ID, value="com.example:id/button")
    # element.click()

finally:
    driver.quit()
`,
    javascript: `const { remote } = require('webdriverio');

const capabilities = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': 'Android',
};

const wdOpts = {
  hostname: 'localhost',
  port: 4723,
  capabilities,
};

async function runTest() {
  const driver = await remote(wdOpts);
  try {
    console.log('Device connected successfully!');

    // Your test code here
    // const element = await driver.$('~buttonId');
    // await element.click();

  } finally {
    await driver.deleteSession();
  }
}

runTest().catch(console.error);
`,
    java: `import io.appium.java_client.AppiumDriver;
import io.appium.java_client.android.AndroidDriver;
import org.openqa.selenium.remote.DesiredCapabilities;
import java.net.URL;

public class AppiumTest {
    public static void main(String[] args) throws Exception {
        DesiredCapabilities caps = new DesiredCapabilities();
        caps.setCapability("platformName", "Android");
        caps.setCapability("automationName", "UiAutomator2");

        AppiumDriver driver = new AndroidDriver(
            new URL("http://localhost:4723"), caps
        );

        try {
            System.out.println("Device connected successfully!");

            // Your test code here
            // WebElement element = driver.findElement(By.id("buttonId"));
            // element.click();

        } finally {
            driver.quit();
        }
    }
}
`,
    ruby: `require 'appium_lib'

caps = {
  platformName: 'Android',
  automationName: 'UiAutomator2'
}

appium_lib = {
  server_url: 'http://localhost:4723'
}

driver = Appium::Driver.new({ caps: caps, appium_lib: appium_lib }, true)
driver.start_driver

begin
  puts 'Device connected successfully!'

  # Your test code here
  # element = driver.find_element(:id, 'buttonId')
  # element.click

ensure
  driver.driver_quit
end
`
  })

  const [devices, setDevices] = useState([])
  const [selectedDevices, setSelectedDevices] = useState([])
  const [environments, setEnvironments] = useState([])
  const [selectedEnv, setSelectedEnv] = useState('default')
  const [showEnvModal, setShowEnvModal] = useState(false)
  const [showReqModal, setShowReqModal] = useState(false)
  const [newEnvName, setNewEnvName] = useState('')
  const [requirements, setRequirements] = useState('')
  const [installingEnv, setInstallingEnv] = useState(false)
  const [installStatus, setInstallStatus] = useState(null)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleType, setScheduleType] = useState('once')
  const [scheduleTime, setScheduleTime] = useState('')
  const [cronExpression, setCronExpression] = useState('0 0 * * *')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetchDevices()
    fetchEnvironments()
  }, [])

  const fetchDevices = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/devices/list')
      setDevices(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching devices:', error)
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  const fetchEnvironments = async () => {
    try {
      const response = await axios.get('/codegen/environments')
      setEnvironments(Array.isArray(response.data) ? response.data : [{ name: 'default', requirements: '' }])
    } catch (error) {
      console.error('Error fetching environments:', error)
      setEnvironments([{ name: 'default', requirements: '' }])
    }
  }

  const handleCreateEnvironment = async () => {
    if (!newEnvName.trim()) {
      alert('Please enter environment name')
      return
    }

    try {
      setInstallingEnv(true)
      setInstallStatus({ status: 'installing', installed: [], total: 0 })

      await axios.post('/codegen/environments', {
        name: newEnvName,
        requirements: requirements
      })

      // Poll for installation status
      const envName = newEnvName
      const checkStatus = setInterval(async () => {
        try {
          const response = await axios.get(`/codegen/environments/${envName}/status`)
          setInstallStatus({
            status: response.data.status,
            installed: response.data.installed_packages,
            total: response.data.total_packages
          })

          if (response.data.status === 'ready' || response.data.status === 'error') {
            clearInterval(checkStatus)
            setInstallingEnv(false)

            setTimeout(() => {
              setShowEnvModal(false)
              setNewEnvName('')
              setRequirements('')
              setInstallStatus(null)
              fetchEnvironments()

              if (response.data.status === 'ready') {
                alert('Environment created and packages installed successfully!')
              } else {
                alert('Environment created but some packages failed to install.')
              }
            }, 1000)
          }
        } catch (error) {
          console.error('Error checking status:', error)
          clearInterval(checkStatus)
          setInstallingEnv(false)
        }
      }, 1000)

    } catch (error) {
      console.error('Error creating environment:', error)
      alert('Failed to create environment: ' + (error.response?.data?.detail || error.message))
      setInstallingEnv(false)
      setInstallStatus(null)
    }
  }

  const handleDeviceToggle = (deviceId) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    )
  }

  const handleSave = async () => {
    if (!scriptName.trim()) {
      alert('Please enter a script name')
      return
    }

    if (!code[language].trim()) {
      alert('Please write some code')
      return
    }

    try {
      setSaving(true)
      await axios.post('/codegen/scripts', {
        name: scriptName,
        language: language,
        code: code[language],
        environment: selectedEnv,
        devices: selectedDevices,
        schedule: scheduleEnabled ? {
          type: scheduleType,
          time: scheduleType === 'once' ? scheduleTime : null,
          cron: scheduleType === 'recurring' ? cronExpression : null
        } : null
      })
      alert('Script saved successfully!')
      navigate('/dashboard/scripts')
    } catch (error) {
      console.error('Error saving script:', error)
      alert('Failed to save script: ' + (error.response?.data?.detail || error.message))
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async () => {
    if (selectedDevices.length === 0) {
      alert('Please select at least one device')
      return
    }

    try {
      setRunning(true)
      await axios.post('/codegen/run', {
        language: language,
        code: code[language],
        environment: selectedEnv,
        devices: selectedDevices
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

  const handleLineNumbers = (text) => {
    const lines = text.split('\n')
    return lines.map((_, i) => i + 1).join('\n')
  }

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang)
  }

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
            ✍️ Create Test Script
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Write automation scripts in your preferred language
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/scripts')}
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

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        overflow: 'hidden'
      }}>
        {/* Left Panel - Code Editor */}
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Script Name & Language */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                Script Name
              </label>
              <input
                type="text"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                placeholder="Enter script name..."
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                Language
              </label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="ruby">Ruby</option>
              </select>
            </div>
          </div>

          {/* Code Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <label style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
              Code Editor
            </label>
            <div style={{
              flex: 1,
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              position: 'relative'
            }}>
              {/* Line Numbers */}
              <div
                ref={lineNumbersRef}
                style={{
                  padding: '12px 8px',
                  backgroundColor: '#0f172a',
                  color: '#64748b',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  lineHeight: '1.5',
                  textAlign: 'right',
                  userSelect: 'none',
                  borderRight: '1px solid #334155',
                  minWidth: '50px',
                  whiteSpace: 'pre',
                  overflow: 'hidden'
                }}
              >
                {handleLineNumbers(code[language])}
              </div>
              {/* Code Textarea */}
              <textarea
                ref={textareaRef}
                value={code[language]}
                onChange={(e) => setCode({ ...code, [language]: e.target.value })}
                onScroll={handleScroll}
                spellCheck="false"
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  lineHeight: '1.5',
                  outline: 'none',
                  resize: 'none',
                  whiteSpace: 'pre',
                  overflowWrap: 'normal',
                  overflowX: 'auto'
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Configuration */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflow: 'auto'
        }}>
          {/* Environment Selection */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>
              🌍 Environment
            </h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <select
                value={selectedEnv}
                onChange={(e) => setSelectedEnv(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {environments.map((env) => (
                  <option key={env.name} value={env.name}>{env.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowEnvModal(true)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                + New
              </button>
            </div>
            <button
              onClick={() => setShowReqModal(true)}
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#334155',
                color: '#ffffff',
                border: '1px solid #475569',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              📄 requirements.txt
            </button>
          </div>

          {/* Device Selection */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>
              📱 Select Devices
            </h3>
            {loading ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading devices...</p>
            ) : devices.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>No devices available</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {devices.map((device) => (
                  <label
                    key={device.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px',
                      backgroundColor: selectedDevices.includes(device.id) ? '#1e40af' : '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleDeviceToggle(device.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                        {device.name}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                        {device.status}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Settings */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', margin: 0 }}>
                ⏰ Schedule Execution
              </h3>
            </div>

            {scheduleEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                    Schedule Type
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="once">Run Once</option>
                    <option value="recurring">Recurring</option>
                  </select>
                </div>

                {scheduleType === 'once' ? (
                  <div>
                    <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ color: '#94a3b8', fontSize: '12px', display: 'block', marginBottom: '5px' }}>
                      Cron Expression
                    </label>
                    <input
                      type="text"
                      value={cronExpression}
                      onChange={(e) => setCronExpression(e.target.value)}
                      placeholder="0 0 * * *"
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <p style={{ color: '#64748b', fontSize: '11px', marginTop: '5px' }}>
                      Format: minute hour day month weekday
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <button
              onClick={handleRun}
              disabled={running || selectedDevices.length === 0}
              style={{
                padding: '12px 20px',
                backgroundColor: running ? '#64748b' : '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: running || selectedDevices.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {running ? '⏳ Running...' : '▶️ Run Now'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 20px',
                backgroundColor: saving ? '#64748b' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {saving ? '💾 Saving...' : '💾 Save Script'}
            </button>
          </div>
        </div>
      </div>

      {/* Create Environment Modal */}
      {showEnvModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
              Create New Environment
            </h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Environment Name
              </label>
              <input
                type="text"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="e.g., selenium-env"
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#94a3b8', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                Requirements (optional)
              </label>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="appium&#10;selenium&#10;pytest"
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Installation Progress */}
            {installStatus && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                  <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600' }}>
                    Installing Packages...
                  </span>
                </div>
                <div style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '4px',
                  height: '8px',
                  overflow: 'hidden',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    backgroundColor: '#10b981',
                    height: '100%',
                    width: `${installStatus.total > 0 ? (installStatus.installed.length / installStatus.total) * 100 : 0}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                  {installStatus.installed.length} of {installStatus.total} packages installed
                </p>
                {installStatus.installed.length > 0 && (
                  <p style={{ color: '#64748b', fontSize: '11px', marginTop: '8px' }}>
                    Latest: {installStatus.installed[installStatus.installed.length - 1]}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: installStatus ? '15px' : '0' }}>
              <button
                onClick={handleCreateEnvironment}
                disabled={installingEnv}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: installingEnv ? '#64748b' : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: installingEnv ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                {installingEnv ? '⏳ Installing...' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowEnvModal(false)
                  setNewEnvName('')
                  setRequirements('')
                  setInstallStatus(null)
                }}
                disabled={installingEnv}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#64748b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: installingEnv ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirements.txt Modal */}
      {showReqModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '30px',
            width: '90%',
            maxWidth: '600px'
          }}>
            <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '10px' }}>
              📄 requirements.txt
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
              Environment: <span style={{ color: '#10b981', fontWeight: '600' }}>{selectedEnv}</span>
            </p>
            <div style={{ marginBottom: '20px' }}>
              <textarea
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Enter package names (one per line):&#10;appium&#10;selenium&#10;pytest&#10;requests"
                rows={12}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowReqModal(false)
                  alert('Requirements saved for this session. Create environment to persist.')
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowReqModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#64748b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateScriptPage
