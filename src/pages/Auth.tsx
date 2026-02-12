import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Send, Mail, Lock, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "login" | "register" | "forgot" | "reset";

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if this is a password reset callback
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("reset");
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && mode !== "reset") return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === "forgot") {
      const { error } = await resetPassword(email);
      setSubmitting(false);
      if (error) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Письмо отправлено", description: "Проверьте почту для сброса пароля" });
        setMode("login");
      }
      return;
    }

    if (mode === "reset") {
      const { error } = await updatePassword(password);
      setSubmitting(false);
      if (error) {
        toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Пароль обновлён", description: "Вы можете войти с новым паролем" });
        navigate("/dashboard");
      }
      return;
    }

    const { error } = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);

    setSubmitting(false);

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else if (mode === "register") {
      toast({ title: "Регистрация", description: "Проверьте почту для подтверждения аккаунта" });
    }
  };

  const titles: Record<AuthMode, string> = {
    login: "Вход в аккаунт",
    register: "Создать аккаунт",
    forgot: "Восстановить пароль",
    reset: "Новый пароль",
  };

  const subtitles: Record<AuthMode, string> = {
    login: "Войдите для управления каналами",
    register: "Начните автоматизацию за 2 минуты",
    forgot: "Введите email для получения ссылки сброса",
    reset: "Придумайте новый пароль",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Send className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">TeleBot<span className="text-primary">.pro</span></span>
        </Link>

        <div className="glass rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold text-center mb-2">
            {titles[mode]}
          </h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            {subtitles[mode]}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode !== "reset" && (
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border"
                  required
                />
              </div>
            )}
            {(mode === "login" || mode === "register" || mode === "reset") && (
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder={mode === "reset" ? "Новый пароль" : "Пароль"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-secondary/50 border-border"
                  required
                  minLength={6}
                />
              </div>
            )}
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {mode === "login" && "Войти"}
              {mode === "register" && "Зарегистрироваться"}
              {mode === "forgot" && "Отправить ссылку"}
              {mode === "reset" && "Сохранить пароль"}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === "login" && (
              <>
                <button
                  onClick={() => setMode("forgot")}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                >
                  Забыли пароль?
                </button>
                <button
                  onClick={() => setMode("register")}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors block w-full"
                >
                  Нет аккаунта? Зарегистрироваться
                </button>
              </>
            )}
            {mode === "register" && (
              <button
                onClick={() => setMode("login")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Уже есть аккаунт? Войти
              </button>
            )}
            {mode === "forgot" && (
              <button
                onClick={() => setMode("login")}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Вернуться ко входу
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
