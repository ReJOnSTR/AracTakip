import React, { useState, useEffect, useRef } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

// Helper Component for Scrollable Lists with Up/Down Buttons
export const ScrollableList = ({ children, height = '210px' }) => {
    const scrollRef = useRef(null)
    const [canScrollUp, setCanScrollUp] = useState(false)
    const [canScrollDown, setCanScrollDown] = useState(false)

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
            setCanScrollUp(scrollTop > 0)
            setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1) // -1/tolerance for float issues
        }
    }

    useEffect(() => {
        checkScroll()
        // Re-check on children change or resize
        window.addEventListener('resize', checkScroll)
        return () => window.removeEventListener('resize', checkScroll)
    }, [children])

    const scroll = (direction) => {
        if (scrollRef.current) {
            const scrollAmount = 70
            scrollRef.current.scrollBy({
                top: direction === 'up' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
        }
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: height }}>
            {/* Up Button */}
            {canScrollUp && (
                <button
                    onClick={() => scroll('up')}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(to bottom, var(--bg-tertiary) 40%, transparent)',
                        border: 'none',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        zIndex: 20,
                    }}
                >
                    <ChevronUp size={16} />
                </button>
            )}

            {/* List Container */}
            <div
                ref={scrollRef}
                onScroll={checkScroll}
                className="hide-scrollbar"
                style={{
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    height: '100%', // Fill the relative container
                    overflowY: 'auto',
                    width: '100%',
                    padding: '10px 2px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                <style>{`
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                `}</style>
                {children}
            </div>

            {/* Down Button */}
            {canScrollDown && (
                <button
                    onClick={() => scroll('down')}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(to top, var(--bg-tertiary) 40%, transparent)',
                        border: 'none',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        zIndex: 20,
                    }}
                >
                    <ChevronDown size={16} />
                </button>
            )}
        </div>
    )
}
