import { useEffect, useImperativeHandle, useRef } from 'react';

import { cn } from '@/lib/utils';

import { TerminalFrame } from './terminal-frame';
import { processLog } from './terminal-sanitizer';
import { useTerminalSearch } from './use-terminal-search';
import { useXterm } from './use-xterm';

interface TerminalProps {
    className?: string;
    logs: string[];
    searchValue?: string;
    // When set, the terminal renders inside a premium framed "window" (traffic-light
    // header + title + copy button + padded body). Omit for a bare, inline terminal.
    title?: string;
}

interface TerminalRef {
    findNext: () => void;
    findPrevious: () => void;
}

const Terminal = ({
    className,
    logs,
    ref,
    searchValue,
    title,
}: TerminalProps & { ref?: React.RefObject<null | TerminalRef> }) => {
    const { clear, containerRef, isReady, scrollToBottom, searchAddon, write } = useXterm();
    const { findNext, findPrevious } = useTerminalSearch(searchAddon, isReady, searchValue);

    const lastLogIndexRef = useRef(0);
    const prevLogsLengthRef = useRef(0);

    useImperativeHandle(ref, () => ({ findNext, findPrevious }), [findNext, findPrevious]);

    useEffect(() => {
        if (!isReady) {
            return;
        }

        if (logs.length === 0 && prevLogsLengthRef.current > 0) {
            clear();
            lastLogIndexRef.current = 0;
            prevLogsLengthRef.current = 0;

            return;
        }

        if (logs.length === 0) {
            return;
        }

        if (logs.length >= lastLogIndexRef.current) {
            const newLogs = logs.slice(lastLogIndexRef.current);

            if (newLogs.length > 0) {
                const batch = newLogs.filter(Boolean).map(processLog).join('\r\n');

                if (batch) {
                    write(batch + '\r\n');
                    scrollToBottom();
                }
            }
        } else {
            clear();

            const batch = logs.filter(Boolean).map(processLog).join('\r\n');

            if (batch) {
                write(batch + '\r\n');
            }

            scrollToBottom();
        }

        lastLogIndexRef.current = logs.length;
        prevLogsLengthRef.current = logs.length;
    }, [logs, isReady, write, clear, scrollToBottom]);

    // Bare terminal (inline usages control their own container/background).
    if (!title) {
        return (
            <div
                className={cn('overflow-hidden', className)}
                ref={containerRef}
                style={{ contain: 'strict' }}
            />
        );
    }

    // Premium framed terminal — a dark "window" with a header and padded body.
    return (
        <TerminalFrame
            className={className}
            copyText={logs.filter(Boolean).join('\n')}
            title={title}
        >
            <div className="size-full p-3">
                <div
                    className="size-full"
                    ref={containerRef}
                    style={{ contain: 'strict' }}
                />
            </div>
        </TerminalFrame>
    );
};

Terminal.displayName = 'Terminal';

export type { TerminalRef };
export default Terminal;
