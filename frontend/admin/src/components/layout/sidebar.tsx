"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { useEffect, type ReactNode } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Wallet as WalletIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSidebarPreference } from "@/lib/use-sidebar-preference";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  comingSoon?: boolean;
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9.5" cy="10.5" r="2" />
      <path d="M6 16c.5-2 2-3 3.5-3s3 1 3.5 3" strokeLinecap="round" />
      <path d="M15 9.5h3M15 12.5h3" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 5.5h16a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H11l-4.5 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 10h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6M18.5 19a5 5 0 0 0-4-4.9" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 3v2m0 14v2M4.2 6.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 17.8l1.4-1.4m12.8-12.8 1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 19.5h16" strokeLinecap="round" />
      <path d="M5 15.5 9.5 11l3.5 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 7.5H19V11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M11.5 4H6a2 2 0 0 0-2 2v5.5a2 2 0 0 0 .6 1.4l7.5 7.5a2 2 0 0 0 2.8 0l5.5-5.5a2 2 0 0 0 0-2.8L12.9 4.6A2 2 0 0 0 11.5 4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.2" cy="8.2" r="1.1" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="8" cy="15" r="3.5" />
      <path d="M10.5 12.5 18 5m0 0v3.5M18 5h-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KeysIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 20.5V10l8-6 8 6v10.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12.5" r="2.2" />
      <path d="M12 14.7v4.3M12 17h1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function NewspaperIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M5 4.5h9.5L19 9v10.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 4.5V9H19" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12.5h8M8 16h5.5" strokeLinecap="round" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="m2.5 12.5 4-4a2 2 0 0 1 2.8 0l.7.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m21.5 12.5-4-4a2 2 0 0 0-2.8 0l-4.3 4.3a1.5 1.5 0 0 0 2.1 2.1l2.7-2.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 13 2.3 2.3a1.5 1.5 0 0 0 2.1-2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 10.5 2.5 12.5l4 4a2 2 0 0 0 2.8 0" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 10.5l2-2-4-4a2 2 0 0 0-2.8 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellNavIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M6 9a6 6 0 0 1 12 0v4.5l1.7 2.5H4.3L6 13.5V9Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" strokeLinecap="round" />
    </svg>
  );
}

function renderItem(
  item: NavItem,
  pathname: string,
  onClose: () => void,
  soonLabel: string,
  collapsed: boolean,
) {
  const active =
    item.href.includes("?") ? false : item.href === "/dashboard" || item.href === "/dashboard/commercial" || item.href === "/dashboard/settings"
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);

  if (item.comingSoon) {
    return (
      <span
        key={item.href}
        aria-disabled="true"
        title={item.label}
        className="flex items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm text-white/35"
      >
        <span className="flex items-center gap-2">
          {item.icon}
          <span className={collapsed ? "lg:sr-only" : ""}>{item.label}</span>
        </span>
        <span className={clsx("rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] font-bold tracking-wide uppercase", collapsed && "lg:hidden")}>
          {soonLabel}
        </span>
      </span>
    );
  }

  return (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClose}
      title={collapsed ? item.label : undefined}
      className={clsx(
        "flex items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
        collapsed && "lg:justify-center lg:px-2 [&>svg]:shrink-0",
        active
          ? "bg-gold-primary/18 text-gold-secondary"
          : "text-white/70 hover:bg-white/5 hover:text-white",
      )}
    >
      {item.icon}
      <span className={collapsed ? "lg:sr-only" : ""}>{item.label}</span>
    </Link>
  );
}

function SidebarGroup({ id, title, children, collapsed }: { id: string; title: string; children: ReactNode; collapsed: boolean }) {
  const [expanded, setExpanded] = useSidebarPreference(`khadmatona.sidebar.group.${id}`, true);
  return <div className="mt-3 border-t border-white/10 pt-2">
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className={clsx("flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-xs font-semibold text-white/50 hover:bg-white/5 hover:text-white", collapsed && "lg:hidden")}>
      <span>{title}</span><ChevronDown aria-hidden="true" className={clsx("h-4 w-4 transition-transform", !expanded && "-rotate-90 rtl:rotate-90")} />
    </button>
    <div className={clsx("space-y-1", !expanded && (collapsed ? "hidden lg:block" : "hidden"))}>{children}</div>
  </div>;
}

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const t = useTranslations("Dashboard");
  const nav = useTranslations("Nav");
  const groups = useTranslations("SidebarGroups");
  const [collapsed, setCollapsed] = useSidebarPreference("khadmatona.sidebar.collapsed", false);
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes("Admin") ?? false;
  const isCommercial =
    user?.roles?.some((role) => role === "Commercial" || role === "SeniorCommercial") ?? false;

  const items: NavItem[] = [
    { href: "/dashboard", label: t("overview"), icon: <HomeIcon /> },
    { href: "/dashboard/analytics", label: t("analytics"), icon: <ChartIcon /> },
    ...(isAdmin ? [{ href: "/dashboard/finance", label: t("finance"), icon: <ChartIcon /> }] : []),
    { href: "/dashboard/properties", label: t("properties"), icon: <BuildingIcon /> },
    { href: "/dashboard/visits", label: t("visits"), icon: <CalendarIcon /> },
    { href: "/dashboard/rental", label: t("rental"), icon: <KeysIcon /> },
    { href: "/dashboard/contacts", label: t("contacts"), icon: <ContactIcon /> },
    { href: "/dashboard/property-alerts", label: t("propertyAlerts"), icon: <BellNavIcon /> },
    { href: "/dashboard/whatsapp", label: t("whatsapp"), icon: <ChatIcon /> },
    { href: "/dashboard/blog", label: t("blog"), icon: <NewspaperIcon /> },
  ];

  if (isAdmin) items.push(
    { href: "/dashboard/commissions", label: t("commissions"), icon: <WalletIcon className="h-4 w-4 shrink-0" /> },
    { href: "/dashboard/reports", label: t("reports"), icon: <NewspaperIcon /> },
  );

  const leadItems: NavItem[] = [
    { href: "/dashboard/leads/contact", label: t("contactMessages"), icon: <MailIcon /> },
    { href: "/dashboard/leads/sell", label: groups("sales"), icon: <TagIcon /> },
    { href: "/dashboard/leads/buy", label: groups("purchases"), icon: <TagIcon /> },
    { href: "/dashboard/leads/rent", label: groups("rentals"), icon: <KeyIcon /> },
    { href: "/dashboard/leads/visit", label: groups("visits"), icon: <CalendarIcon /> },
  ];

  // Real-estate professionals applying to partner with KHADAMATONA - a
  // distinct audience from the customer leadItems above, so it gets its own
  // top-level entry rather than being folded into the "Demandes" group.
  const commercialLeadItems: NavItem[] = [
    { href: "/dashboard/commercial-leads", label: t("commercialLeads"), icon: <HandshakeIcon /> },
  ];

  const trailingItems: NavItem[] = [
    { href: "/dashboard/users", label: t("users"), icon: <UsersIcon /> },
    { href: "/dashboard/settings", label: t("settings"), icon: <SettingsIcon /> },
    { href: "/dashboard/settings/social", label: t("socialPublishing"), icon: <SettingsIcon /> },
  ];

  // A Commercial account never sees any of the Admin nav above - it gets its
  // own small, self-contained section instead (My Properties/Add
  // Property/My Leads), matching what its dashboard layout actually lets it
  // reach. Profile is reached via the header menu, not this sidebar, on
  // both sides.
  const commercialItems: NavItem[] = [
    { href: "/dashboard/commercial", label: t("commercialOverview"), icon: <HomeIcon /> },
    { href: "/dashboard/commercial/properties", label: t("commercialMyProperties"), icon: <BuildingIcon /> },
    { href: "/dashboard/commercial/properties?new=1", label: t("commercialAddProperty"), icon: <PlusIcon /> },
    { href: "/dashboard/rental", label: t("rental"), icon: <KeysIcon /> },
    { href: "/dashboard/commercial/leads", label: t("commercialMyLeads"), icon: <MailIcon /> },
    { href: "/dashboard/commercial/visits", label: t("commercialVisits"), icon: <CalendarIcon /> },
    { href: "/dashboard/commercial/whatsapp", label: t("commercialWhatsapp"), icon: <ChatIcon /> },
    { href: "/dashboard/commercial/contacts", label: t("commercialContacts"), icon: <ContactIcon /> },
  ];

  const taskItem: NavItem = { href: "/dashboard/tasks", label: groups("tasks"), icon: <CalendarIcon /> };
  const pick = (source: NavItem[], paths: string[]) => source.filter((item) => paths.includes(item.href));
  const renderGroup = (title: string, entries: NavItem[]) => <SidebarGroup key={entries[0]?.href ?? title} id={entries[0]?.href ?? title} title={title} collapsed={collapsed}>{entries.map((item) => renderItem(item, pathname, onClose, t("soon"), collapsed))}</SidebarGroup>;

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <>
      {/* Mobile/tablet overlay - dismisses the drawer on outside click. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={clsx(
          "fixed inset-0 z-40 bg-ink/50 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={clsx(
          "fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col gap-1 overflow-y-auto bg-ink p-5 text-white/70",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "max-lg:-translate-x-full max-lg:rtl:translate-x-full",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:max-w-none",
          collapsed ? "lg:w-20 lg:p-3" : "lg:w-60",
        )}
      >
        <div className={clsx("mb-4 flex items-center justify-between px-2", collapsed && "lg:justify-center lg:px-0")}>
          <Link
            href="/"
            onClick={onClose}
            className={clsx("font-display text-xl font-semibold text-white transition-opacity hover:opacity-80", collapsed && "lg:hidden")}
          >
            {nav("brand")}
          </Link>
          <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={groups(collapsed ? "expandSidebar" : "collapseSidebar")} title={groups(collapsed ? "expandSidebar" : "collapseSidebar")} aria-expanded={!collapsed} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-gold-secondary hover:bg-white/10 lg:flex">
            {collapsed ? <PanelLeftOpen size={20} className="rtl:rotate-180" /> : <PanelLeftClose size={20} className="rtl:rotate-180" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={nav("closeMenu")}
            className="rounded-md p-1 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>
        {isCommercial && !isAdmin ? (
          <nav aria-label={groups("navigation")}>
            {renderGroup(groups("overview"), pick(commercialItems, ["/dashboard/commercial"]))}
            {renderGroup(groups("properties"), pick(commercialItems, ["/dashboard/commercial/properties", "/dashboard/commercial/properties?new=1", "/dashboard/rental"]))}
            {renderGroup(groups("clients"), pick(commercialItems, ["/dashboard/commercial/leads", "/dashboard/commercial/visits", "/dashboard/commercial/contacts"]))}
            {renderGroup(groups("communication"), [...pick(commercialItems, ["/dashboard/commercial/whatsapp"]), taskItem])}
          </nav>
        ) : (
          <nav aria-label={groups("navigation")}>
            {renderGroup(groups("overview"), pick(items, ["/dashboard", "/dashboard/analytics", "/dashboard/finance", "/dashboard/commissions", "/dashboard/reports"]))}
            {renderGroup(groups("properties"), pick(items, ["/dashboard/properties", "/dashboard/visits", "/dashboard/rental"]))}
            {renderGroup(t("leads"), leadItems)}
            {renderGroup(groups("clients"), [...pick(items, ["/dashboard/contacts", "/dashboard/property-alerts"]), ...commercialLeadItems])}
            {renderGroup(groups("administration"), [...pick(items, ["/dashboard/blog"]), ...trailingItems])}
            {renderGroup(groups("communication"), [...pick(items, ["/dashboard/whatsapp"]), taskItem])}
          </nav>
        )}
      </aside>
    </>
  );
}
