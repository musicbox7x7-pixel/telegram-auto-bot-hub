import { Bot, Rss, Zap, RefreshCw, Shield, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Rss,
    title: "Парсинг каналов",
    description: "Автоматический сбор контента из любых Telegram-каналов и RSS-источников в режиме реального времени.",
  },
  {
    icon: Bot,
    title: "ИИ-переработка",
    description: "Искусственный интеллект перерабатывает собранный контент, делая его уникальным и адаптированным под ваш стиль.",
  },
  {
    icon: Zap,
    title: "Автопубликация",
    description: "Настройте расписание — система автоматически публикует посты в ваши каналы без вашего участия.",
  },
  {
    icon: RefreshCw,
    title: "Мультиканальность",
    description: "Управляйте десятками каналов из единой панели. Копируйте, переносите, миксуйте контент.",
  },
  {
    icon: Shield,
    title: "Антидетект",
    description: "Умная система защиты от блокировок. Рандомизация стилей, задержки, уникализация контента.",
  },
  {
    icon: BarChart3,
    title: "Аналитика",
    description: "Детальная статистика по каждому каналу: охваты, подписчики, вовлечённость, лучшее время постинга.",
  },
];

const FeaturesSection = () => {
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
            Всё для <span className="text-gradient">автоматизации</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Полный набор инструментов для создания и управления Telegram-империей
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-xl glass hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
