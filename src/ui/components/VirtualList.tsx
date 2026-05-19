import React, { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualListProps<T> {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    itemHeight: number;
    containerClassName?: string;
    overscan?: number;
}

export function VirtualList<T>({
    items,
    renderItem,
    itemHeight,
    containerClassName = '',
    overscan = 5
}: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
            }
        };

        updateHeight();
        window.addEventListener('resize', updateHeight);
        
        // Also use ResizeObserver for more accuracy
        const resizeObserver = new ResizeObserver(updateHeight);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateHeight);
            resizeObserver.disconnect();
        };
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
        const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const end = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
        
        return {
            startIndex: start,
            endIndex: end,
            totalHeight: items.length * itemHeight,
            offsetY: start * itemHeight
        };
    }, [items.length, itemHeight, scrollTop, containerHeight, overscan]);

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className={`overflow-y-auto relative ${containerClassName}`}
        >
            <div style={{ height: totalHeight, width: '100%', pointerEvents: 'none' }} />
            <div
                className="absolute top-0 left-0 w-full"
                style={{ transform: `translateY(${offsetY}px)` }}
            >
                {items.slice(startIndex, endIndex).map((item, index) => (
                    <div key={startIndex + index} style={{ height: itemHeight }}>
                        {renderItem(item, startIndex + index)}
                    </div>
                ))}
            </div>
        </div>
    );
}
