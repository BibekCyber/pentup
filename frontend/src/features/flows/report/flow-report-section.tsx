import type { ReportSection, ReportSubItem } from '@/lib/report-model';

import Markdown from '@/components/shared/markdown';
import { StatusBadge } from '@/components/shared/severity-badge';

const SubtaskBlock = ({ subtask }: { subtask: ReportSubItem }) => (
    <div className="border-border/70 border-l-2 pl-4">
        <div className="flex items-center justify-between gap-3">
            <h4 className="text-foreground min-w-0 text-sm font-semibold break-words">{subtask.title}</h4>
            <StatusBadge status={subtask.status} />
        </div>
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

const FlowReportSection = ({ section }: FlowReportSectionProps) => (
    <section
        className="scroll-mt-24 space-y-4"
        id={section.id}
    >
        <div className="flex items-center justify-between gap-3 border-b pb-2">
            <h2 className="text-foreground min-w-0 text-xl font-semibold break-words">{section.title}</h2>
            <StatusBadge status={section.status} />
        </div>

        {section.resultMarkdown && (
            <Markdown
                className="text-sm"
                disableHeadingIds
            >
                {section.resultMarkdown}
            </Markdown>
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

export default FlowReportSection;
