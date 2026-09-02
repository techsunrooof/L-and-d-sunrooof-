"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconUserPlus,
  IconSitemap,
  IconSparkles,
  type IconProps,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<IconProps>;
  /** Also active for these path prefixes. */
  match?: (path: string) => boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Home", Icon: IconHome, match: (p) => p === "/" || p.startsWith("/day") },
  { href: "/onboarding", label: "Onboarding", Icon: IconUserPlus },
  { href: "/process", label: "Process flow", Icon: IconSitemap },
  { href: "/assistant", label: "AI assistant", Icon: IconSparkles },
];

function isActive(item: NavItem, path: string): boolean {
  if (item.match) return item.match(path);
  return path === item.href || path.startsWith(item.href + "/");
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <>
      {/* Mobile: top bar keeps the real wordmark visible */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-hairline bg-paper/90 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" aria-label="SUNROOOF Learning home" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sunrooof-black.svg" alt="SUNROOOF" className="h-4 w-auto" />
          <span className="font-[family-name:var(--font-inter)] text-xs text-grey">Learning</span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  active ? "bg-warm text-sun" : "text-grey",
                )}
              >
                <item.Icon size={20} stroke={1.75} />
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Desktop: left sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-hairline bg-paper md:flex">
        {/* Logo zone: generous padding, "Learning" label, closed by a hairline */}
        <div className="border-b border-hairline px-6 pb-6 pt-8">
          <Link href="/" aria-label="SUNROOOF Learning home" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sunrooof-black.svg" alt="SUNROOOF" className="h-[18px] w-auto" />
            <span className="mt-2 block font-[family-name:var(--font-inter)] text-xs text-grey">
              Learning
            </span>
          </Link>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-warm font-medium text-ink"
                    : "text-grey hover:bg-hairline/40 hover:text-ink",
                )}
              >
                <item.Icon
                  size={20}
                  stroke={1.75}
                  className={active ? "text-sun" : "text-grey"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
