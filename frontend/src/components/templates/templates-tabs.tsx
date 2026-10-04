import PageTabs, { type PageTab } from '@/components/layouts/page-tabs';
import { useTemplates } from '@/providers/templates-provider';

// Sub-nav for the Templates section: the shared Library for everyone, plus the
// review queue (admins) or the user's own submissions (everyone else who can
// author templates). Counts show requests still waiting for a decision.
const TemplatesTabs = () => {
    const { canSubmitTemplates, isTemplateAdmin, pendingRequestsCount } = useTemplates();

    const tabs: PageTab[] = [{ end: true, id: 'library', label: 'Library', path: '/templates' }];

    if (isTemplateAdmin) {
        tabs.push({ count: pendingRequestsCount, id: 'review', label: 'Review queue', path: '/templates/review' });
    } else if (canSubmitTemplates) {
        tabs.push({
            count: pendingRequestsCount,
            id: 'submissions',
            label: 'My submissions',
            path: '/templates/submissions',
        });
    }

    if (tabs.length < 2) {
        return null;
    }

    return <PageTabs tabs={tabs} />;
};

export default TemplatesTabs;
