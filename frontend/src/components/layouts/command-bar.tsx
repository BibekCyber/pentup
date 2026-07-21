import type { ReactNode } from 'react';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export interface CommandBarProps {
    actions?: ReactNode;
    className?: string;
    ctx?: ReactNode;
    title: ReactNode;
}

/**
 * EMBER Command Bar — presentational sticky page header.
 *
 * Matches `ember.css` `.cmdbar` (sticky, backdrop-blur, bottom border). Purely
 * presentational: it owns no data or handlers. Pages compose it in later phases
 * by moving their existing header contents into the `title`/`ctx`/`actions`
 * slots. The mobile-drawer/collapse `SidebarTrigger` is kept internally.
 */
export const CommandBar = ({ actions, className, ctx, title }: CommandBarProps) => {
    return (
        <header
            className={cn(
                'bg-background/80 border-border sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur-md',
                className,
            )}
        >
            <SidebarTrigger className="-ml-1" />
            <Separator
                className="mr-1 h-4"
                orientation="vertical"
            />
            <h1 className="min-w-0 truncate text-base font-semibold tracking-tight">{title}</h1>
            {ctx ? (
                <div className="text-muted-foreground flex min-w-0 items-center gap-2 font-mono text-xs">{ctx}</div>
            ) : null}
            {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
        </header>
    );
};

export default CommandBar;
