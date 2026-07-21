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

/** Ordered list of all target types, used to render pickers/filters. */
export const ALL_TARGET_TYPES: TargetType[] = [TargetType.WebApp, TargetType.Cloud];

/** Returns the display metadata for a target type, falling back to General. */
export const getTargetTypeMeta = (type: TargetType): TargetTypeMeta =>
    TARGET_TYPE_META[type] ?? TARGET_TYPE_META[TargetType.General];

/** Convenience label lookup. */
export const getTargetTypeLabel = (type: TargetType): string => getTargetTypeMeta(type).label;
