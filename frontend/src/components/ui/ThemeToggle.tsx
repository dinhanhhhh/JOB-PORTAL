"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-input bg-background/70 hover:bg-accent/50"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === "dark" ? <span>☀️ Light</span> : <span>🌙 Dark</span>}
    </Button>
  );
}
