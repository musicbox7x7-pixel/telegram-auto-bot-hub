import { motion } from "framer-motion";
import { Search, Bot, Send, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Добавьте источники",
    description: "Укажите Telegram-каналы, RSS-ленты или веб-сайты для парсинга контента.",
  },
  {
    icon: Bot,
    step: "02",
    title: "ИИ обработает",
    description: "Наш ИИ переработает контент: перепишет, адаптирует под ваш стиль и сделает уникальным.",
  },
  {
    icon: Send,
    step: "03",
    title: "Автопубликация",
    description: "Настройте расписание — посты будут публиковаться автоматически в нужное время.",
  },
  {
    icon: BarChart3,
    step: "04",
    title: "Анализируйте",
    description: "Следите за статистикой, оптимизируйте стратегию и масштабируйте каналы.",
  },
];

const HowItWorksSection = () => {
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
            Как это <span className="text-gradient">работает</span>
          </h2>
          <p className="text-muted-foreground text-lg">4 простых шага к полной автоматизации</p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50" />

          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-6 relative z-10">
                <step.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="text-xs font-mono text-primary mb-2">{step.step}</div>
              <h3 className="font-display text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
