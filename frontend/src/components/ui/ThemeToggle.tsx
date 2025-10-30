"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="backdrop-blur-sm gap-1.5"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </Button>
  );
}
