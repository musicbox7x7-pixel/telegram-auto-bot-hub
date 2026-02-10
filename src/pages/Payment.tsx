import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Send, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type Plan = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
};

const gateways = [
  { id: "yookassa", name: "ЮКасса", icon: "💳" },
  { id: "robokassa", name: "Робокасса", icon: "🏦" },
  { id: "cloudpayments", name: "CloudPayments", icon: "☁️" },
  { id: "unitpay", name: "UnitPay", icon: "💰" },
  { id: "yoomoney", name: "ЮMoney", icon: "💜" },
  { id: "payanyway", name: "PayAnyway", icon: "🔄" },
  { id: "yandexpay", name: "Yandex Pay", icon: "🟡" },
  { id: "leadpay", name: "LeadPay", icon: "🚀" },
];

const Payment = () => {
  const [searchParams] = useSearchParams();
  const planSlug = searchParams.get("plan");
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (planSlug) {
      supabase.from("subscription_plans").select("*").eq("slug", planSlug).maybeSingle().then(({ data }) => {
        if (data) setPlan({ ...data, features: Array.isArray(data.features) ? data.features as string[] : [] });
      });
    }
  }, [planSlug]);

  const handlePayment = async () => {
    if (!user || !plan || !selectedGateway) return;
    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: { planId: plan.id, gateway: selectedGateway, userId: user.id },
      });

      if (error) throw error;

      if (data?.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        // For demo: simulate successful payment
        await supabase.from("payments").insert({
          user_id: user.id,
          plan_id: plan.id,
          amount: plan.price_monthly,
          gateway: selectedGateway,
          status: "success" as any,
        });
        await supabase.from("profiles").update({
          subscription_plan_id: plan.id,
          subscription_status: "active" as any,
        }).eq("user_id", user.id);

        toast({ title: "Подписка активирована!", description: `Тариф "${plan.name}" подключён` });
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({ title: "Ошибка", description: "Платёжная система временно недоступна. Попробуйте позже.", variant: "destructive" });
    }
    setProcessing(false);
  };

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">TeleBot<span className="text-primary">.pro</span></span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-2 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> Оплата подписки
          </h1>
          <p className="text-muted-foreground mb-8">Выберите способ оплаты для тарифа «{plan.name}»</p>

          {/* Plan summary */}
          <div className="glass rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-display text-lg font-semibold">{plan.name}</div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {plan.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                </ul>
              </div>
              <div className="text-right">
                <div className="text-3xl font-display font-bold text-primary">{plan.price_monthly} ₽</div>
                <div className="text-xs text-muted-foreground">в месяц</div>
              </div>
            </div>
          </div>

          {/* Gateway selection */}
          <h2 className="font-display font-semibold mb-4">Способ оплаты</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {gateways.map(gw => (
              <button
                key={gw.id}
                onClick={() => setSelectedGateway(gw.id)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  selectedGateway === gw.id
                    ? "border-primary bg-primary/10 glow-primary"
                    : "border-border bg-secondary/30 hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-1">{gw.icon}</div>
                <div className="text-xs font-medium">{gw.name}</div>
              </button>
            ))}
          </div>

          <Button
            variant="hero"
            size="lg"
            className="w-full"
            disabled={!selectedGateway || processing}
            onClick={handlePayment}
          >
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Оплатить {plan.price_monthly} ₽
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Payment;
