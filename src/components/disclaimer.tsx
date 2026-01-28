import { AlertCircle } from "lucide-react"
import { DISCLAIMER_TEXT } from "@/lib/constants"

export function Disclaimer() {
  return (
    <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 text-center">
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        {DISCLAIMER_TEXT}
      </p>
    </div>
  )
}
