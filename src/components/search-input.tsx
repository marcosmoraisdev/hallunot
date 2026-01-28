import { Search } from "lucide-react"
import { cn } from "@/lib/cn"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "h-10 w-full rounded-xl border border-border/50 bg-transparent pl-10 pr-4",
          "text-sm text-foreground placeholder:text-muted-foreground",
          "transition-colors focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      />
    </div>
  )
}
