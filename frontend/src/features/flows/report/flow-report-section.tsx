import { ChevronDown, Target } from 'lucide-react';
import { useState } from 'react';

import type { ReportSection, ReportSubItem } from '@/lib/report-model';

import FindingCard from '@/components/shared/finding-card';
import Markdown from '@/components/shared/markdown';
import { StatusBadge } from '@/components/shared/severity-badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const SubtaskBlock = ({ subtask }: { subtask: ReportSubItem }) => (
    <div className="border-border/70 border-l-2 pl-4">
        <div className="flex items-center justify-between gap-3">
            <h4 className="text-foreground min-w-0 text-sm font-semibold break-words">{subtask.title}</h4>
            <StatusBadge status={subtask.status} />
        </div>
        {subtask.description && <p className="text-muted-foreground mt-1 text-xs">{subtask.description}</p>}
        {subtask.resultMarkdown && (
            <Markdown
                className="mt-2 text-sm"
                disableHeadingIds
            >
                {subtask.resultMarkdown}
            </Markdown>
        )}
    </div>
);

interface FlowReportSectionProps {
    section: ReportSection;
}

const FlowReportSection = ({ section }: FlowReportSectionProps) => {
    const [objectiveOpen, setObjectiveOpen] = useState(false);

    return (
        <section
            className="scroll-mt-24 space-y-4"
            id={section.id}
        >
            <div className="flex items-center justify-between gap-3 border-b pb-2">
                <h2 className="text-foreground min-w-0 text-xl font-semibold break-words">{section.title}</h2>
                <StatusBadge status={section.status} />
            </div>

            {section.input && (
                <Collapsible
                    onOpenChange={setObjectiveOpen}
                    open={objectiveOpen}
                >
                    <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm font-medium">
                        <Target className="size-4" />
                        Objective
                        <ChevronDown className={cn('size-4 transition-transform', objectiveOpen && 'rotate-180')} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="text-muted-foreground border-border bg-muted/30 mt-2 rounded-md border p-3 text-sm">{section.input}</CollapsibleContent>
                </Collapsible>
            )}

            {section.resultMarkdown && (
                <Markdown
                    className="text-sm"
                    disableHeadingIds
                >
                    {section.resultMarkdown}
                </Markdown>
            )}

            {section.findings.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-foreground text-sm font-semibold tracking-wide uppercase">Findings</h3>
                    {section.findings.map((finding) => (
                        <FindingCard
                            finding={finding}
                            key={finding.id}
                        />
                    ))}
                </div>
            )}

            {section.subtasks.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-foreground text-sm font-semibold tracking-wide uppercase">Subtasks</h3>
                    <div className="space-y-5">
                        {section.subtasks.map((subtask) => (
                            <SubtaskBlock
                                key={subtask.id}
                                subtask={subtask}
                            />
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};

export default FlowReportSection;
