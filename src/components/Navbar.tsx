import { Link, useLocation } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
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

  return (
    <nav className="fixed top-0 w-full z-50 glass-panel h-20 flex justify-between items-center px-6 md:px-8">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-2xl font-extrabold text-primary tracking-tighter font-headline">
          Samarth Sahayak
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
      <div className="flex items-center gap-3">
        <LanguageToggle />
        {user ? (
          <>
            <Link to="/dashboard" className="p-2 rounded-full bg-surface-highest/40 hover:bg-surface-highest/60 transition-all text-on-surface-variant hidden md:flex">
              <Bell className="w-5 h-5" />
            </Link>
            <button onClick={() => signOut()} className="p-2 rounded-full bg-surface-highest/40 hover:bg-surface-highest/60 transition-all text-on-surface-variant" title={t("nav.signOut")}>
              <LogOut className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {user.email?.[0]?.toUpperCase() || "U"}
            </div>
          </>
        ) : (
          <Link to="/auth" className="gradient-primary text-primary-foreground font-headline font-bold px-5 py-2 rounded-lg text-sm">
            {t("nav.signIn")}
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
