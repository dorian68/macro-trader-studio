import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-white border border-white/10 shadow-[inset_0_0_12px_rgba(255,255,255,0.15)] backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "gradient-primary text-white hover:bg-none hover:bg-accent hover:border-accent hover:shadow-glow-primary shadow-soft",
        success: "gradient-success text-white hover:bg-none hover:bg-success-dark hover:shadow-glow-success shadow-soft",
        danger: "bg-danger text-white hover:bg-danger-dark shadow-soft",
        warning: "bg-warning text-white hover:bg-warning-dark shadow-soft",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-white/20 bg-transparent hover:bg-accent hover:border-accent hover:text-white shadow-soft",
        secondary: "bg-secondary text-white hover:bg-accent hover:text-white shadow-soft",
        ghost: "hover:bg-accent hover:text-white border-transparent shadow-none",
        link: "text-white underline-offset-4 hover:text-accent border-none shadow-none",
        premium: "gradient-card border border-white/10 text-white hover:bg-none hover:bg-accent hover:border-accent hover:shadow-medium shadow-soft",
      },
      size: {
        default: "h-10 sm:h-11 px-4 py-2 min-h-[44px]",
        sm: "h-9 sm:h-10 rounded-md px-3 min-h-[44px]",
        lg: "h-11 sm:h-12 rounded-md px-8 min-h-[44px]",
        icon: "h-10 w-10 sm:h-11 sm:w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
