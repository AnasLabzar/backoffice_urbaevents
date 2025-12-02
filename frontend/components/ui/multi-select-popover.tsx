"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { IconSelector, IconCheck } from "@tabler/icons-react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Hada howa type li khass ykon consistent
type TeamMember = { id: string, name: string };

export function MultiSelectPopover({ title, options, selectedIds, onChange }: {
    title: string;
    options: TeamMember[];
    selectedIds: string[];
    onChange: (id: string, isChecked: boolean) => void;
}) {
    const [open, setOpen] = React.useState(false);

    // Calculate selected count label
    const selectedCount = selectedIds.length;
    let label = title;
    if (selectedCount > 0) {
        if (selectedCount === options.length) label = "Tout le monde";
        else label = `${selectedCount} sélectionné(s)`;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between bg-white dark:bg-black/20">
                    <span className="truncate text-foreground/80 font-normal">
                        {label}
                    </span>
                    <IconSelector className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Rechercher..." />
                    <CommandList>
                        <CommandEmpty>Aucun résultat.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedIds.includes(option.id);
                                return (
                                    <CommandItem
                                        key={option.id}
                                        value={option.name}
                                        onSelect={() => {
                                            onChange(option.id, !isSelected);
                                        }}
                                    >
                                        <div className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                        )}>
                                            <IconCheck className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{option.name}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}