import { DISCLAIMER_TEXT } from "@/lib/constants"

export function Disclaimer() {
  return (
    <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
      {DISCLAIMER_TEXT}
    </p>
  )
}
