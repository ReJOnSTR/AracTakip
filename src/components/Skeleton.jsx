import './Skeleton.css'

export function Skeleton({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) {
    return (
        <div
            className="skeleton-pulse"
            style={{
                width,
                height,
                borderRadius,
                background: 'var(--bg-tertiary)',
                ...style,
            }}
        />
    )
}

export function SkeletonCard({ height = '120px' }) {
    return (
        <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <Skeleton width="80px" height="12px" />
                <Skeleton width="32px" height="32px" borderRadius="8px" />
            </div>
            <div>
                <Skeleton width="60px" height="28px" borderRadius="4px" />
                <Skeleton width="50px" height="11px" borderRadius="4px" style={{ marginTop: '6px' }} />
            </div>
        </div>
    )
}

export function SkeletonList({ rows = 4 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={{
                    padding: '10px 12px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <Skeleton width="100px" height="13px" />
                        <Skeleton width="140px" height="11px" />
                    </div>
                    <Skeleton width="60px" height="11px" />
                </div>
            ))}
        </div>
    )
}

export function DashboardSkeleton() {
    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <Skeleton width="200px" height="24px" borderRadius="4px" />
                    <Skeleton width="300px" height="14px" borderRadius="4px" style={{ marginTop: '8px' }} />
                </div>
            </div>

            {/* Quick Actions */}
            <Skeleton width="100px" height="14px" borderRadius="4px" style={{ marginBottom: '15px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height="42px" borderRadius="8px" />
                ))}
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div className="card">
                    <div className="card-header">
                        <Skeleton width="200px" height="16px" />
                    </div>
                    <SkeletonList rows={5} />
                </div>
                <div className="card">
                    <div className="card-header">
                        <Skeleton width="100px" height="16px" />
                    </div>
                    <SkeletonList rows={3} />
                </div>
            </div>
        </div>
    )
}
