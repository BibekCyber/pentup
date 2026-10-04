import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

export interface PageTab {
    /** Small count pill after the label (hidden when 0 or undefined). */
    count?: number;
    /** Match the path exactly, so a parent tab is not active on its children. */
    end?: boolean;
    id: string;
    label: string;
    path: string;
}

interface PageTabsProps {
    className?: string;
    tabs: readonly PageTab[];
}

// Horizontal underline tab strip used as an in-page sub-nav (Settings, Templates).
export const PageTabs = ({ className, tabs }: PageTabsProps) => (
    <div className={cn('border-border text-muted-foreground flex flex-wrap items-center gap-1 border-b', className)}>
        {tabs.map((tab) => (
            <NavLink
                className={({ isActive }) =>
                    cn(
                        'relative -mb-px inline-flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors',
                        isActive ? 'border-primary text-foreground' : 'hover:text-foreground border-transparent',
                    )
                }
                end={tab.end}
                key={tab.id}
                to={tab.path}
            >
                {tab.label}
                {tab.count ? (
                    <span className="bg-primary/15 text-primary min-w-[18px] rounded-full px-1.5 text-center font-mono text-[10.5px] leading-[18px] font-semibold tabular-nums">
                        {tab.count > 99 ? '99+' : tab.count}
                    </span>
                ) : null}
            </NavLink>
        ))}
    </div>
);

export default PageTabs;
