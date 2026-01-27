"use client"

import { useTheme } from "next-themes"
import * as Switch from "@radix-ui/react-switch"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <div className="h-6 w-11" />

  const isDark = theme === "dark"

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
        {isDark ? "Dark" : "Light"}
      </span>
      <Switch.Root
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        className="relative h-6 w-11 cursor-pointer rounded-full bg-accent transition-colors data-[state=checked]:bg-primary"
      >
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </div>
  )
}
