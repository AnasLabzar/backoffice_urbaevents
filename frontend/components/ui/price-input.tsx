import { Input } from "./input";

// --- COMPONENT SPECIAL PRICE INPUT (CINEMATIC) ---
interface PriceInputProps {
    value?: string | number;
    onChange: (val: string) => void;
    placeholder?: string;
    label?: string; // Optional label inside
    id?: string;
}

export function PriceInput({ value, onChange, placeholder, id }: PriceInputProps) {
    // Fonction bach n-formatiw l-arqam b l-commas
    const formatNumber = (num: string) => {
        if (!num) return "";
        // N-7yydo ay haja machi raqm awla point
        const cleanNum = num.replace(/[^0-9.]/g, "");
        if (cleanNum === "") return "";

        // N-farqo l-entier 3la decimal
        const parts = cleanNum.split(".");
        // N-zido commas l-partie l-kbira
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        // N-limitiw decimal l 2 arqam
        if (parts[1]) {
            parts[1] = parts[1].substring(0, 2);
        }

        return parts.join(".");
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 1. N-akhdo l-raw value
        const rawVal = e.target.value;
        // 2. N-formatiwha
        const formatted = formatNumber(rawVal);
        // 3. N-siftoha l-parent
        onChange(formatted);
    };

    const handleBlur = () => {
        // Mli l-user ykhroj, n-zido .00 ila maktbhash (UX Ndiya)
        if (value && !value.toString().includes(".")) {
            onChange(value.toString() + ".00");
        }
    };

    return (
        <div className="relative">
            <Input
                id={id}
                type="text"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder || "0.00"}
                className="pr-12 text-right font-mono tracking-tight font-medium" // Police mono bach l-arqam tji mqadda
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-muted-foreground text-sm font-semibold">DH</span>
            </div>
        </div>
    );
}