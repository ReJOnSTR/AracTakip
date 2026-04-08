import { useEffect, useState } from 'react'



export default function TopProgressBar({ loading }) {
    const [progress, setProgress] = useState(0)
    const [visible, setVisible] = useState(false)
    const [fading, setFading] = useState(false)

    useEffect(() => {
        let raf
        let timeout

        if (loading) {
            setProgress(0)
            setVisible(true)
            setFading(false)

            let current = 0
            const tick = () => {
                if (current < 30) current += 3
                else if (current < 60) current += 1.5
                else if (current < 80) current += 0.6
                else if (current < 88) current += 0.2
                setProgress(Math.min(current, 88))
                if (current < 88) {
                    raf = requestAnimationFrame(tick)
                }
            }
            raf = requestAnimationFrame(tick)
        } else {
            cancelAnimationFrame(raf)
            setProgress(100)
            timeout = setTimeout(() => {
                setFading(true)
                timeout = setTimeout(() => {
                    setVisible(false)
                    setProgress(0)
                    setFading(false)
                }, 300)
            }, 200)
        }

        return () => {
            cancelAnimationFrame(raf)
            clearTimeout(timeout)
        }
    }, [loading])

    if (!visible) return null

    return (
        <>
            <div
                className="top-progress-bar"
                style={{ opacity: fading ? 0 : 0.4 }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: 'var(--text-muted)',
                        transition: progress === 100
                            ? 'width 0.3s ease-out'
                            : 'width 0.15s linear',
                    }}
                />
            </div>
        </>
    )
}
