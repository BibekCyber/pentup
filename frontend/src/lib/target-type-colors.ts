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
        badgeClassName: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
        label: 'API',
    },
    [TargetType.Aws]: {
        badgeClassName: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
        label: 'AWS',
    },
    [TargetType.Azure]: {
        badgeClassName: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
        label: 'Azure',
    },
    [TargetType.Gcp]: {
        badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
        label: 'GCP',
    },
    [TargetType.General]: {
        badgeClassName: 'bg-muted text-muted-foreground',
        label: 'General',
    },
    [TargetType.MobileBackend]: {
        badgeClassName: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300',
        label: 'Mobile Backend',
    },
    [TargetType.Network]: {
        badgeClassName: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
        label: 'Network',
    },
    [TargetType.WebApp]: {
        badgeClassName: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
        label: 'Web App',
    },
};

/** Ordered list of all target types, used to render pickers/filters. */
export const ALL_TARGET_TYPES: TargetType[] = [
    TargetType.WebApp,
    TargetType.Api,
    TargetType.Aws,
    TargetType.Azure,
    TargetType.Gcp,
    TargetType.Network,
    TargetType.MobileBackend,
    TargetType.General,
];

/** Returns the display metadata for a target type, falling back to General. */
export const getTargetTypeMeta = (type: TargetType): TargetTypeMeta =>
    TARGET_TYPE_META[type] ?? TARGET_TYPE_META[TargetType.General];

/** Convenience label lookup. */
export const getTargetTypeLabel = (type: TargetType): string => getTargetTypeMeta(type).label;
