"use client";

import React from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fr } from "date-fns/locale"; // Pour le Français
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";

registerLocale("fr", fr); // Enregistrer le français

interface DatePickerInputProps {
    date: Date | null | undefined;
    setDate: (date: Date | null) => void;
    className?: string;
    placeholder?: string;
}

export function DatePickerInput({ date, setDate, className, placeholder }: DatePickerInputProps) {
    return (
        <div className="relative w-full">
            <div className="absolute left-3 top-2.5 z-10 pointer-events-none text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
            </div>
            <DatePicker
                selected={date}
                onChange={(date) => setDate(date)}
                locale="fr"
                dateFormat="dd/MM/yyyy"
                placeholderText={placeholder || "JJ/MM/AAAA"}
                showYearDropdown
                scrollableYearDropdown
                yearDropdownItemNumber={15} // Khaliwh ychouf 15 3am lfoq o lte7t
                className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9",
                    className
                )}
                wrapperClassName="w-full"
            />
        </div>
    );
}