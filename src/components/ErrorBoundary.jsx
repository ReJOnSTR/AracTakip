import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo })
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '300px',
                    padding: '40px',
                    gap: '20px',
                    color: 'var(--text-primary)',
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <AlertTriangle size={32} color="#ef4444" />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                        Bir hata oluştu
                    </h2>
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        maxWidth: '400px',
                        margin: 0,
                        lineHeight: '1.5',
                    }}>
                        Beklenmeyen bir sorun meydana geldi. Sayfayı yenilemeyi deneyin.
                    </p>
                    {this.state.error && (
                        <details style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            background: 'var(--bg-tertiary)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            maxWidth: '500px',
                            width: '100%',
                            cursor: 'pointer',
                        }}>
                            <summary style={{ marginBottom: '8px', fontWeight: '500' }}>Hata detayı</summary>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                margin: 0,
                                fontFamily: 'monospace',
                            }}>
                                {this.state.error.toString()}
                            </pre>
                        </details>
                    )}
                    <button
                        onClick={this.handleReload}
                        className="btn btn-primary"
                        style={{ gap: '8px', marginTop: '10px' }}
                    >
                        <RefreshCw size={16} />
                        Sayfayı Yenile
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
