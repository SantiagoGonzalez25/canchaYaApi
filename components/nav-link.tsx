"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
  className,
  activeClassName,
}: {
  href: string;
  label: string;
  className: string;
  activeClassName: string;
}) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={active ? `${className} ${activeClassName}` : className}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
