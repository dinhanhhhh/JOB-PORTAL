"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

interface CustomButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof Button> {
  loading?: boolean;
}

const CustomButton = ({
  loading,
  children,
  disabled,
  className,
  ...props
}: CustomButtonProps) => {
  return (
    <Button
      className={cn("interactive-button", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
};

export default CustomButton;
