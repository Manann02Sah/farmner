import { Link, useLocation } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface SidebarItem {
  icon: LucideIcon;
  label: string;
  path?: string;
  active?: boolean;
  onClick?: () => void;
}

interface SidebarProps {
  title: string;
  subtitle?: string;
  items: SidebarItem[];
  bottomActions?: React.ReactNode;
}

const Sidebar = ({ title, subtitle, items, bottomActions }: SidebarProps) => {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-[calc(100vh-5rem)] pt-6 pb-4 px-4 bg-surface-low">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-xs text-primary-foreground font-bold">S</span>
          </div>
          <span className="font-headline font-bold text-primary text-sm">{title}</span>
        </div>
        {subtitle && (
          <span className="text-xs text-on-surface-variant uppercase tracking-wider ml-8">{subtitle}</span>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const isActive = item.active ?? (item.path ? location.pathname === item.path : false);
          const className = `flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            isActive
              ? "bg-surface-highest text-primary"
              : "text-on-surface-variant hover:text-foreground hover:bg-surface-container"
          }`;

          if (item.onClick) {
            return (
              <button
                key={`${item.label}-${item.path ?? "action"}`}
                type="button"
                onClick={item.onClick}
                className={className}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={`${item.label}-${item.path ?? "link"}`}
              to={item.path ?? location.pathname}
              className={className}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {bottomActions && <div className="mt-auto space-y-2">{bottomActions}</div>}
    </aside>
  );
};

export default Sidebar;
