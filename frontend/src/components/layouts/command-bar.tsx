import type { ReactNode } from 'react';

import { Bell, Search } from 'lucide-react';

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
 * Matches `ember.css` `.cmdbar` (56px tall, backdrop-blur, bottom border,
 * comfortable ~22px horizontal padding). Layout mirrors the prototype:
 * `SidebarTrigger` → page `title` → optional mono `ctx` slot → flexible
 * spacer → search pill (`.kbar`) → page `actions` → alerts bell.
 *
 * The search pill and bell are purely presentational affordances — there is no
 * global command palette or alerts feed wired yet, so both are harmless when
 * clicked. Pages compose the bar via the `title`/`ctx`/`actions` slots.
 */
export const CommandBar = ({ actions, className, ctx, title }: CommandBarProps) => {
    return (
        <header
            className={cn(
                'bg-background/80 border-border sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3.5 border-b px-[22px] backdrop-blur-md',
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
                <div className="text-muted-foreground flex min-w-0 items-center gap-2 overflow-hidden font-mono text-[11.5px]">
                    {ctx}
                </div>
            ) : null}

            <div className="ml-auto flex items-center gap-2.5">
                {/* Search pill — visual affordance only (no palette wired yet). */}
                <button
                    aria-label="Search"
                    className="bg-well border-border text-muted-foreground hover:border-border-strong hover:text-foreground hidden h-[34px] min-w-[220px] cursor-text items-center gap-2 rounded-md border pr-2.5 pl-3 text-[13px] transition-colors md:flex"
                    type="button"
                >
                    <Search className="size-[15px] shrink-0" />
                    <span className="truncate">Search…</span>
                    <kbd className="text-muted-foreground border-border ml-auto rounded-[5px] border bg-[var(--hover)] px-1.5 py-px font-mono text-[10px] leading-none">
                        ⌘K
                    </kbd>
                </button>

                {actions ? <div className="flex items-center gap-2">{actions}</div> : null}

                {/* Alerts bell — visual affordance only (no feed wired yet). */}
                <button
                    aria-label="Alerts"
                    className="text-muted-foreground hover:bg-well hover:border-border hover:text-foreground relative grid size-[34px] place-items-center rounded-md border border-transparent transition-colors"
                    type="button"
                >
                    <Bell className="size-[17px]" />
                    <span className="bg-primary absolute top-[7px] right-[9px] size-1.5 rounded-full" />
                </button>
            </div>
        </header>
    );
};

export default CommandBar;
