import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Старт",
    price: "0",
    period: "навсегда",
    description: "Для знакомства с платформой",
    features: ["1 канал", "3 источника парсинга", "50 постов/месяц", "Базовый ИИ", "Email поддержка"],
    cta: "Начать бесплатно",
    popular: false,
  },
  {
    name: "Про",
    price: "990",
    period: "/мес",
    description: "Для активных каналов",
    features: ["10 каналов", "Безлимит источников", "Безлимит постов", "Продвинутый ИИ", "Аналитика", "Приоритетная поддержка"],
    cta: "Выбрать Про",
    popular: true,
  },
  {
    name: "Бизнес",
    price: "2 990",
    period: "/мес",
    description: "Для медиа-сетей",
    features: ["Безлимит каналов", "Безлимит источников", "Безлимит постов", "GPT-4 ИИ", "Полная аналитика", "API доступ", "Персональный менеджер"],
    cta: "Связаться",
    popular: false,
  },
];

const PricingSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Тарифы</span>
          </h2>
          <p className="text-muted-foreground text-lg">Выберите план под ваши задачи</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-2xl ${
                plan.popular
                  ? "bg-gradient-card border-2 border-primary/40 glow-primary"
                  : "glass"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-xs font-semibold text-primary-foreground">
                  Популярный
                </div>
              )}

              <h3 className="font-display text-2xl font-bold mb-1">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-display font-bold">₽{plan.price}</span>
                <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "hero-outline"}
                className="w-full"
                size="lg"
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
