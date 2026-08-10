import { Check, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';

import TargetTypeChip from '@/components/forms/target-type-chip';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TargetType } from '@/graphql/types';
import { ALL_TARGET_TYPES, getTargetTypeMeta } from '@/lib/target-type-colors';
import { cn } from '@/lib/utils';

interface TargetTypePickerProps {
    className?: string;
    disabled?: boolean;
    onChange: (value: TargetType[]) => void;
    placeholder?: string;
    value: TargetType[];
}

/**
 * Multi-select picker for {@link TargetType}s. Renders a popover with a
 * searchable, checkable list and shows the current selection as colored chips.
 * Designed to bind to a `TargetType[]` value (e.g. from react-hook-form).
 */
export const TargetTypePicker = ({
    className,
    disabled,
    onChange,
    placeholder = 'Select target types...',
    value,
}: TargetTypePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggle = (type: TargetType) => {
        if (value.includes(type)) {
            onChange(value.filter((t) => t !== type));
        } else {
            onChange([...value, type]);
        }
    };

    const remove = (type: TargetType) => {
        onChange(value.filter((t) => t !== type));
    };

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <Popover
                onOpenChange={setIsOpen}
                open={isOpen}
            >
                <PopoverTrigger asChild>
                    <Button
                        className={cn(
                            'border-border-strong bg-well w-full justify-between font-mono',
                            value.length === 0 && 'text-muted-foreground',
                        )}
                        disabled={disabled}
                        role="combobox"
                        variant="outline"
                    >
                        {value.length === 0
                            ? placeholder
                            : `${value.length} type${value.length === 1 ? '' : 's'} selected`}
                        <ChevronsUpDown className="opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="p-0"
                    style={{
                        maxHeight: 'var(--radix-popover-content-available-height)',
                        width: 'var(--radix-popover-trigger-width)',
                    }}
                >
                    <Command>
                        <CommandInput
                            className="h-9"
                            placeholder="Search target types..."
                        />
                        <CommandList>
                            <CommandEmpty>No target types found.</CommandEmpty>
                            <CommandGroup>
                                {ALL_TARGET_TYPES.map((type) => {
                                    const meta = getTargetTypeMeta(type);
                                    const selected = value.includes(type);

                                    return (
                                        <CommandItem
                                            className={cn('font-mono', selected && 'text-primary')}
                                            key={type}
                                            onSelect={() => toggle(type)}
                                            value={meta.label}
                                        >
                                            <span
                                                className={cn(
                                                    'mr-2 inline-block size-2.5 rounded-full',
                                                    meta.badgeClassName,
                                                )}
                                            />
                                            {meta.label}
                                            <Check className={cn('ml-auto', selected ? 'opacity-100' : 'opacity-0')} />
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {value.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((type) => (
                        <TargetTypeChip
                            key={type}
                            onRemove={disabled ? undefined : remove}
                            type={type}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export default TargetTypePicker;
