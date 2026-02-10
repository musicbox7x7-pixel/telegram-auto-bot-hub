import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Send, Settings, User, CreditCard, LogOut, Crown, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type Plan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  features: string[];
};

const Profile = () => {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("subscription_plans").select("*").order("sort_order").then(({ data }) => {
      if (data) setPlans(data.map(p => ({ ...p, features: Array.isArray(p.features) ? p.features as string[] : [] })));
    });
    if (user) {
      supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10).then(({ data }) => {
        if (data) setPayments(data);
      });
    }
  }, [user]);

  useEffect(() => {
    setDisplayName(profile?.display_name || "");
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Сохранено" });
    }
  };

  const currentPlan = plans.find(p => p.id === profile?.subscription_plan_id);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">TeleBot<span className="text-primary">.pro</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/dashboard"><Button variant="ghost" size="sm">Дашборд</Button></Link>
            {isAdmin && <Link to="/admin"><Button variant="ghost" size="sm">Админ</Button></Link>}
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-8 flex items-center gap-2">
            <User className="w-6 h-6 text-primary" /> Личный кабинет
          </h1>

          {/* Profile info */}
          <div className="glass rounded-xl p-6 mb-6">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Профиль
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <Input value={user?.email || ""} disabled className="bg-secondary/50 border-border mt-1" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Имя</label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-secondary/50 border-border mt-1" placeholder="Ваше имя" />
              </div>
              <Button variant="hero" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить"}
              </Button>
            </div>
          </div>

          {/* Subscription */}
          <div className="glass rounded-xl p-6 mb-6">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-primary" /> Подписка
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full text-sm bg-gradient-primary text-primary-foreground font-medium">
                {currentPlan?.name || "Без подписки"}
              </span>
              <span className="text-sm text-muted-foreground">
                {isAdmin ? "Админ — бесплатный доступ" : profile?.subscription_status === "active" ? "Активна" : profile?.subscription_status || "Нет"}
              </span>
            </div>
            {!isAdmin && (
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map(plan => (
                  <div key={plan.id} className={`p-4 rounded-xl border ${plan.id === profile?.subscription_plan_id ? "border-primary" : "border-border"} bg-secondary/30`}>
                    <div className="font-display font-semibold">{plan.name}</div>
                    <div className="text-primary font-bold text-lg">{plan.price_monthly} ₽<span className="text-xs text-muted-foreground">/мес</span></div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {plan.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                    </ul>
                    <Button variant={plan.id === profile?.subscription_plan_id ? "secondary" : "hero"} size="sm" className="w-full mt-3" disabled={plan.id === profile?.subscription_plan_id}>
                      {plan.id === profile?.subscription_plan_id ? "Текущий" : "Выбрать"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments */}
          <div className="glass rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> История платежей
            </h2>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Платежей пока нет</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <div className="text-sm font-medium">{p.amount} {p.currency}</div>
                      <div className="text-xs text-muted-foreground">{p.gateway} · {new Date(p.created_at).toLocaleDateString("ru")}</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${p.status === "success" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {p.status === "success" ? "Оплачен" : p.status === "pending" ? "Ожидает" : p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
