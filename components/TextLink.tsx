import type { ComponentProps } from "react";

export default function TextLink({ className = "", ...props }: ComponentProps<"a">) {
  return (
    <a
      {...props}
      className={`underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-900 ${className}`}
    />
  );
}
