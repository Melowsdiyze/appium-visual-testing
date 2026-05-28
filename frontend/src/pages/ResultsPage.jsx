import { useState, useEffect } from 'react'
import axios from 'axios'

function ResultsPage() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedResult, setSelectedResult] = useState(null)
  const [logs, setLogs] = useState('')
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    fetchResults()

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      const hasRunning = results.some(r => r.status === 'running' || r.status === 'pending')
      if (hasRunning) {
        fetchResults()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [results])

  const fetchResults = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/codegen/executions')
      setResults(response.data)
    } catch (error) {
      console.error('Error fetching results:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const viewLogs = async (result) => {
    setSelectedResult(result)
    setLoadingLogs(true)
    try {
      const response = await axios.get(`/codegen/executions/${result.id}/logs`)
      setLogs(response.data.logs || 'No logs available')
    } catch (error) {
      setLogs('Error loading logs: ' + error.message)
    } finally {
      setLoadingLogs(false)
    }
  }

  const formatDuration = (started, finished) => {
    if (!started) return '-'
    const start = new Date(started)
    const end = finished ? new Date(finished) : new Date()
    const diffSec = Math.floor((end - start) / 1000)

    if (diffSec < 60) return diffSec + 's'
    if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ' + (diffSec % 60) + 's'
    return Math.floor(diffSec / 3600) + 'h ' + Math.floor((diffSec % 3600) / 60) + 'm'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
      case 'success':
        return '#10b981'
      case 'failed':
      case 'error':
        return '#dc2626'
      case 'running':
        return '#3b82f6'
      case 'pending':
        return '#f59e0b'
      default:
        return '#64748b'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
      case 'success':
        return '✅'
      case 'failed':
      case 'error':
        return '❌'
      case 'running':
        return '⏳'
      case 'pending':
        return '⏸️'
      default:
        return '•'
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
        <p style={{ color: '#94a3b8', marginTop: '20px' }}>Loading results...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
          📊 Test Results
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          View and analyze your test execution results
        </p>
      </div>

      {results.length === 0 ? (
        <div style={{
          padding: '60px',
          textAlign: 'center',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
          <h3 style={{ color: '#ffffff', fontSize: '20px', marginBottom: '10px' }}>
            No test results yet
          </h3>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
            Run your first test script to see results here
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: selectedResult ? '1fr 2fr' : '1fr',
          gap: '20px'
        }}>
          {/* Results List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {results.map((result) => {
              const statusColor = getStatusColor(result.status)
              const statusIcon = getStatusIcon(result.status)

              return (
                <div
                  key={result.id}
                  onClick={() => viewLogs(result)}
                  style={{
                    backgroundColor: selectedResult?.id === result.id ? '#1e293b' : '#0f172a',
                    border: `1px solid ${selectedResult?.id === result.id ? statusColor : '#334155'}`,
                    borderRadius: '12px',
                    padding: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                    <div style={{
                      backgroundColor: statusColor,
                      color: '#ffffff',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {statusIcon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '600',
                        margin: 0,
                        marginBottom: '4px'
                      }}>
                        {result.script_name}
                      </h4>
                      <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, marginBottom: '6px' }}>
                        📱 Device: {result.device_name}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '11px',
                          color: statusColor,
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {result.status}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>
                          🕐 {new Date(result.started_at).toLocaleString()}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>
                          ⏱️ {formatDuration(result.started_at, result.finished_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Result Details */}
          {selectedResult && (
            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '20px',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                    {selectedResult.script_name}
                  </h3>
                  <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                    Device: {selectedResult.device_name}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Executed: {new Date(selectedResult.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedResult(null)}
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

              {/* Status Badge */}
              <div style={{
                display: 'inline-block',
                padding: '8px 16px',
                backgroundColor: getStatusColor(selectedResult.status),
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '20px'
              }}>
                {getStatusIcon(selectedResult.status)} {selectedResult.status.toUpperCase()}
              </div>

              {/* Statistics */}
              {selectedResult.stats && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    backgroundColor: '#0f172a',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Duration</div>
                    <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
                      {selectedResult.stats.duration}s
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#0f172a',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Steps</div>
                    <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
                      {selectedResult.stats.total_steps}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#0f172a',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #10b981'
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Passed</div>
                    <div style={{ color: '#10b981', fontSize: '18px', fontWeight: '600' }}>
                      {selectedResult.stats.passed}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: '#0f172a',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #dc2626'
                  }}>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Failed</div>
                    <div style={{ color: '#dc2626', fontSize: '18px', fontWeight: '600' }}>
                      {selectedResult.stats.failed}
                    </div>
                  </div>
                </div>
              )}

              {/* Logs */}
              <div>
                <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                  📄 Execution Log
                </h4>
                <div style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '15px',
                  maxHeight: '500px',
                  overflowY: 'auto'
                }}>
                  {loadingLogs ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <div className="spinner" style={{ margin: '0 auto' }}></div>
                      <p style={{ color: '#94a3b8', marginTop: '10px' }}>Loading logs...</p>
                    </div>
                  ) : (
                    <pre style={{
                      color: '#e2e8f0',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {logs || 'No logs available'}
                    </pre>
                  )}
                </div>
              </div>

              {/* Screenshots */}
              {selectedResult.screenshots && selectedResult.screenshots.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>
                    Screenshots
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {selectedResult.screenshots.map((screenshot, index) => (
                      <img
                        key={index}
                        src={screenshot}
                        alt={`Screenshot ${index + 1}`}
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid #334155'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ResultsPage
