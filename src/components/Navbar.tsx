import { Link, useLocation } from "react-router-dom";
import { Bell, LayoutGrid, LogOut, MessageSquareText, ScrollText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "@/components/LanguageToggle";

const Navbar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  const navLinks = [
    { label: t("nav.schemes"), path: "/schemes" },
    { label: t("nav.dashboard"), path: "/dashboard" },
    { label: t("nav.chat"), path: "/chat" },
  ];

  const mobileNavLinks = [
    { label: t("nav.schemes"), path: "/schemes", icon: ScrollText },
    { label: t("nav.dashboard"), path: "/dashboard", icon: LayoutGrid },
    { label: t("nav.chat"), path: "/chat", icon: MessageSquareText },
  ];

  return (
    <>
      <nav className="fixed top-0 w-full z-50 glass-panel h-20 flex justify-between items-center px-4 md:px-8">
        <div className="flex items-center gap-4 md:gap-8 min-w-0">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <img
              src="/brand/samarth-shayak-mark.svg"
              alt="Samarth Shayak"
              className="h-11 w-11 rounded-xl object-contain shrink-0"
            />
            <span className="text-xl md:text-2xl font-extrabold text-primary tracking-tighter font-headline truncate">
              Samarth Shayak
            </span>
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}
                className={`font-headline font-bold tracking-tight transition-colors ${location.pathname === link.path ? "text-primary border-b-2 border-primary pb-1" : "text-foreground hover:text-primary"}`}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <LanguageToggle />
          {user ? (
            <>
              <Link to="/dashboard" className="p-2 rounded-full bg-surface-highest/40 hover:bg-surface-highest/60 transition-all text-on-surface-variant hidden md:flex">
                <Bell className="w-5 h-5" />
              </Link>
              <button onClick={() => signOut()} className="p-2 rounded-full bg-surface-highest/40 hover:bg-surface-highest/60 transition-all text-on-surface-variant" title={t("nav.signOut")}>
                <LogOut className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex w-9 h-9 rounded-full gradient-primary items-center justify-center text-xs font-bold text-primary-foreground">
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
            </>
          ) : (
            <Link to="/auth" className="gradient-primary text-primary-foreground font-headline font-bold px-4 md:px-5 py-2 rounded-lg text-sm">
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-outline-variant/20 bg-surface-container/95 backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-1 px-2 py-2">
          {mobileNavLinks.map((link) => {
            const isActive = location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-on-surface-variant hover:text-foreground hover:bg-surface-high"
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
