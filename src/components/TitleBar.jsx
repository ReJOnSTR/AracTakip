
import React from 'react'

export default function TitleBar() {
    return (
        <div style={{
            height: '38px',
            background: '#18181b', // var(--bg-secondary)
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitAppRegion: 'drag',
            userSelect: 'none',
            color: '#71717a', // var(--text-muted)
            fontSize: '12px',
            fontWeight: 500,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999
        }}>
            {/* Title can go here if needed, or left empty for clean look */}
            <span>Muayen</span>
        </div>
    )
}
