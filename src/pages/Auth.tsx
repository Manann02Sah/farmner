import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success(t("dash.welcome") + "!");
        navigate("/dashboard");
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast.success(t("auth.signUpDesc"));
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-headline font-extrabold text-3xl mb-2">
            {isLogin ? t("auth.welcomeBack") : t("auth.join")}
          </h1>
          <p className="text-on-surface-variant">
            {isLogin ? t("auth.signInDesc") : t("auth.signUpDesc")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container rounded-2xl p-8 ghost-border space-y-5">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input type="text" placeholder={t("auth.fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-surface-highest pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input type="email" placeholder={t("auth.email")} value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-surface-highest pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input type="password" placeholder={t("auth.password")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              className="w-full bg-surface-highest pl-10 pr-4 py-3 rounded-xl text-sm text-foreground placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full gradient-primary text-primary-foreground font-headline font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>{isLogin ? t("auth.signIn") : t("auth.createAccount")} <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-on-surface-variant">
          {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
            {isLogin ? t("auth.signUp") : t("auth.signIn")}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
