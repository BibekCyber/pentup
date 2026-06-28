import { useEffect, useRef, useState } from 'react';

import type { ReportTocEntry } from '@/lib/report-model';

import { cn } from '@/lib/utils';

interface FlowReportTocProps {
    entries: ReportTocEntry[];
}

const FlowReportToc = ({ entries }: FlowReportTocProps) => {
    const [activeId, setActiveId] = useState<string | undefined>(entries[0]?.id);
    const visibleIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        visibleIds.current = new Set();

        const observer = new IntersectionObserver(
            (observed) => {
                for (const entry of observed) {
                    if (entry.isIntersecting) {
                        visibleIds.current.add(entry.target.id);
                    } else {
                        visibleIds.current.delete(entry.target.id);
                    }
                }

                const firstVisible = entries.find((entry) => visibleIds.current.has(entry.id));

                if (firstVisible) {
                    setActiveId(firstVisible.id);
                }
            },
            { rootMargin: '-80px 0px -65% 0px', threshold: 0 },
        );

        const observedElements = entries.map((entry) => document.getElementById(entry.id)).filter((element): element is HTMLElement => element !== null);

        observedElements.forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, [entries]);

    const handleJump = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveId(id);
    };

    return (
        <nav className="space-y-0.5">
            <p className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wide uppercase">Contents</p>
            {entries.map((entry) => (
                <button
                    className={cn(
                        'block w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                        entry.level > 1 && 'pl-5 text-xs',
                        activeId === entry.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                    key={entry.id}
                    onClick={() => handleJump(entry.id)}
                    title={entry.title}
                    type="button"
                >
                    {entry.title}
                </button>
            ))}
        </nav>
    );
};

export default FlowReportToc;
