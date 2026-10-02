import { TargetType } from '@/graphql/types';

/**
 * Visual metadata for each {@link TargetType}. The colors are intentionally
 * chosen to read well on both light and dark themes and are reused everywhere a
 * target type is rendered (chips, the picker, and any future detect-result UI)
 * so a given type always looks the same.
 */
export interface TargetTypeMeta {
    /** Tailwind background + text classes for a chip/badge. */
    badgeClassName: string;
    /** Human-friendly label shown to users. */
    label: string;
}

export const TARGET_TYPE_META: Record<TargetType, TargetTypeMeta> = {
    [TargetType.Api]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'API',
    },
    [TargetType.Aws]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'AWS',
    },
    [TargetType.Azure]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'Azure',
    },
    [TargetType.Cloud]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'Cloud',
    },
    [TargetType.Gcp]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'GCP',
    },
    [TargetType.General]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'General',
    },
    [TargetType.MobileBackend]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'Mobile Backend',
    },
    [TargetType.Network]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'Network',
    },
    [TargetType.WebApp]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'Web',
    },
};

/**
 * Ordered list of target types offered in pickers/filters (template editor,
 * templates-page filter bar). Grouped web -> cloud -> other so the cloud
 * providers sit next to the generic Cloud tag. `Cloud` is the generic
 * cloud tag: a template tagged `Cloud` applies to every provider, while an
 * `Aws`/`Azure`/`Gcp` tag scopes it to that one provider.
 */
export const ALL_TARGET_TYPES: TargetType[] = [
    TargetType.WebApp,
    TargetType.Api,
    TargetType.Aws,
    TargetType.Azure,
    TargetType.Gcp,
    TargetType.Cloud,
    TargetType.Network,
    TargetType.MobileBackend,
    TargetType.General,
];

/** Returns the display metadata for a target type, falling back to General. */
export const getTargetTypeMeta = (type: TargetType): TargetTypeMeta =>
    TARGET_TYPE_META[type] ?? TARGET_TYPE_META[TargetType.General];

/** Convenience label lookup. */
export const getTargetTypeLabel = (type: TargetType): string => getTargetTypeMeta(type).label;

/**
 * Report-facing engagement descriptor. Scans collapse to two engagement classes
 * — Web and Cloud — so a report simply states which one it is rather than the raw
 * flow title. Returns an empty string when the type is unknown, so callers can
 * fall back to the previous behaviour without breaking older reports.
 */
export const getEngagementLabel = (type?: null | TargetType): string => {
    if (type === TargetType.Cloud) {
        return 'Cloud Infrastructure';
    }

    if (type === TargetType.WebApp || type === TargetType.Api) {
        return 'Web Application';
    }

    return type ? getTargetTypeLabel(type) : '';
};

/** Short engagement kind — "Web" or "Cloud" — for chips and footers. */
export const getEngagementKind = (type?: null | TargetType): string => {
    if (type === TargetType.Cloud) {
        return 'Cloud';
    }

    if (type === TargetType.WebApp || type === TargetType.Api) {
        return 'Web';
    }

    return type ? getTargetTypeLabel(type) : '';
};
