import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.ComponentProps<'input'> {
  /** For phone/email/id fields: types left-to-right but stays right-aligned to match the rest of an RTL form. */
  ltr?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ltr, dir, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        dir={ltr ? 'ltr' : dir}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          ltr && 'text-right',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'
