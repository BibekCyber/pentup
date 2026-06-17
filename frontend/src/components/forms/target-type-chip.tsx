import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { TargetType } from '@/graphql/types';
import { getTargetTypeMeta } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';

interface TargetTypeChipProps {
    className?: string;
    /** When provided, renders a small remove button on the chip. */
    onRemove?: (type: TargetType) => void;
    type: TargetType;
}

/**
 * A small colored chip representing a single {@link TargetType}. Colors are
 * sourced from the shared palette so a given target type looks identical in the
 * picker, the template form, and the templates list.
 */
export const TargetTypeChip = ({ className, onRemove, type }: TargetTypeChipProps) => {
    const meta = getTargetTypeMeta(type);

    return (
        <Badge
            className={cn('border-transparent', meta.badgeClassName, className)}
            variant="outline"
        >
            {meta.label}
            {onRemove ? (
                <button
                    aria-label={`Remove ${meta.label}`}
                    className="-mr-0.5 ml-0.5 rounded-full opacity-70 transition-opacity hover:opacity-100"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove(type);
                    }}
                    type="button"
                >
                    <X className="size-3" />
                </button>
            ) : null}
        </Badge>
    );
};

export default TargetTypeChip;
