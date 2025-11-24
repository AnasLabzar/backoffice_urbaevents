"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
// ✅ FIX: On utilise IconSelector (l'équivalent Tabler pour les doubles flèches)
import { IconSelector, IconCheck } from "@tabler/icons-react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

type TeamMember = { id: string, name: string };

export function MultiSelectPopover({ title, options, selectedIds, onChange }: {
    title: string;
    options: TeamMember[];
    selectedIds: string[];
    onChange: (id: string, isChecked: boolean) => void;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                    <span className="truncate">
                        {selectedIds.length > 0 ? `${selectedIds.length} sél.` : title}
                    </span>
                    {/* ✅ FIX: Utilisation de IconSelector ici */}
                    <IconSelector className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder={`Chercher ${title}...`} />
                    <CommandList>
                        <CommandEmpty>Aucun membre trouvé.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.id}
                                    value={option.name}
                                    onSelect={() => {
                                        onChange(option.id, !selectedIds.includes(option.id));
                                    }}
                                >
                                    <IconCheck
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedIds.includes(option.id) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}