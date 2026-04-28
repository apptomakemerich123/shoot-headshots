import Link from "next/link";

export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  children,
  className,
  href,
  type,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const base =
    "inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60";
  const solid = "bg-white text-black hover:bg-white/90";

  if (href) {
    return (
      <Link href={href} className={cn(base, solid, className)}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type ?? "button"}
      disabled={disabled}
      onClick={onClick}
      className={cn(base, solid, className)}
    >
      {children}
    </button>
  );
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--panel)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

