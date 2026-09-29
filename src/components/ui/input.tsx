import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // "text-base" (16px) no mobile evita o zoom automático do Safari
          // ao focar o campo (ele dá zoom sempre que o font-size é < 16px);
          // a partir do "sm" volta pro texto normal da tela (14px).
          "flex h-10 w-full rounded-md border border-input bg-background/60 px-3 py-2 text-base shadow-sm transition-colors sm:text-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
