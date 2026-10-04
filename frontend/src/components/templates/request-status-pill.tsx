import { StatusPill, type StatusTone } from '@/components/shared/status-pill';
import { TemplateRequestKind, TemplateRequestStatus } from '@/graphql/types';

const STATUS_DISPLAY: Record<TemplateRequestStatus, { label: string; tone: StatusTone }> = {
    [TemplateRequestStatus.Approved]: { label: 'Approved', tone: 'finished' },
    [TemplateRequestStatus.Closed]: { label: 'Closed', tone: 'created' },
    [TemplateRequestStatus.Pending]: { label: 'Pending review', tone: 'waiting' },
    [TemplateRequestStatus.Rejected]: { label: 'Changes requested', tone: 'failed' },
    [TemplateRequestStatus.Withdrawn]: { label: 'Withdrawn', tone: 'created' },
};

export const getRequestStatusLabel = (status: TemplateRequestStatus) => STATUS_DISPLAY[status].label;

export const getRequestKindLabel = (kind: TemplateRequestKind) =>
    kind === TemplateRequestKind.Create ? 'New template' : 'Change';

interface RequestStatusPillProps {
    className?: string;
    status: TemplateRequestStatus;
}

export const RequestStatusPill = ({ className, status }: RequestStatusPillProps) => {
    const { label, tone } = STATUS_DISPLAY[status];

    return (
        <StatusPill
            className={className}
            label={label}
            pulse={status === TemplateRequestStatus.Pending}
            tone={tone}
        />
    );
};

export default RequestStatusPill;
