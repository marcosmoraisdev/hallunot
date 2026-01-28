interface SectionHeaderProps {
  step: number
  title: string
  subtitle?: string
}

export function SectionHeader({ step, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {step}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-foreground sm:text-base">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
