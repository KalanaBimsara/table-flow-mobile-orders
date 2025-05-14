
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export const useTheme = () => {
  const { theme, setTheme } = React.useContext(ThemeProviderContext)
  return { theme, setTheme }
}

const ThemeProviderContext = React.createContext<{
  theme: string
  setTheme: (theme: string) => void
}>({
  theme: "system",
  setTheme: () => null,
})
