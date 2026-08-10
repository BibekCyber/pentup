import type { ReactNode } from 'react';

import { Search } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export interface CommandBarProps {
    actions?: ReactNode;
    className?: string;
    ctx?: ReactNode;
    search?: { onChange: (value: string) => void; placeholder?: string; value: string };
    title: ReactNode;
}

/**
 * EMBER Command Bar — presentational sticky page header.
 *
 * Matches `ember.css` `.cmdbar` (56px tall, backdrop-blur, bottom border,
 * comfortable ~22px horizontal padding). Layout mirrors the prototype:
 * `SidebarTrigger` (mobile only) → page `title` → optional mono `ctx` slot →
 * flexible spacer → search pill (`.kbar`) → page `actions`.
 *
 * On desktop the sidebar is collapsed via the sidebar rail's own control, so
 * the command-bar trigger (and its adjacent separator) is hidden at `md` and up
 * while remaining available on mobile to open the sidebar Sheet.
 *
 * The search pill is a real controlled text input when a page supplies the
 * `search` prop, and is hidden entirely otherwise so only pages that support
 * search show it. Pages compose the bar via the `title`/`ctx`/`actions` slots.
 */
export const CommandBar = ({ actions, className, ctx, search, title }: CommandBarProps) => {
    return (
        <header
            className={cn(
                'bg-background/80 border-border sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3.5 border-b px-[22px] backdrop-blur-md',
                className,
            )}
        >
            <SidebarTrigger className="-ml-1 md:hidden" />
            <Separator
                className="mr-1 h-4 md:hidden"
                orientation="vertical"
            />
            <h1 className="min-w-0 truncate text-base font-semibold tracking-tight">{title}</h1>
            {ctx ? (
                <div className="text-muted-foreground flex min-w-0 items-center gap-2 overflow-hidden font-mono text-[11.5px]">
                    {ctx}
                </div>
            ) : null}

            <div className="ml-auto flex items-center gap-2.5">
                {/* Search pill — a real controlled input when the page supplies `search`. */}
                {search ? (
                    <div className="bg-well border-border focus-within:border-border-strong hidden h-[34px] min-w-[220px] items-center gap-2 rounded-md border pr-2.5 pl-3 transition-colors md:flex">
                        <Search className="text-muted-foreground size-[15px] shrink-0" />
                        <input
                            className="placeholder:text-muted-foreground w-full bg-transparent text-[13px] outline-none"
                            onChange={(event) => search.onChange(event.target.value)}
                            placeholder={search.placeholder}
                            type="text"
                            value={search.value}
                        />
                    </div>
                ) : null}

                {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
            </div>
        </header>
    );
};

export default CommandBar;
