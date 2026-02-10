import { useState } from "react";
import {
  Send, Settings, BarChart3, Rss, Bot, Plus, Play, Pause,
  Trash2, ExternalLink, Clock, Hash, TrendingUp, Users, Eye,
  LogOut, Shield, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

type Channel = {
  id: string;
  name: string;
  subscribers: number;
  postsToday: number;
  status: "active" | "paused";
};

type Source = {
  id: string;
  name: string;
  type: "telegram" | "rss" | "web";
  postsCollected: number;
  status: "active" | "paused";
};

type ScheduledPost = {
  id: string;
  title: string;
  channel: string;
  scheduledAt: string;
  status: "pending" | "published" | "failed";
};

const mockChannels: Channel[] = [
  { id: "1", name: "Новости Технологий", subscribers: 15420, postsToday: 8, status: "active" },
  { id: "2", name: "Крипто Дайджест", subscribers: 8930, postsToday: 12, status: "active" },
  { id: "3", name: "AI & ML News", subscribers: 23100, postsToday: 0, status: "paused" },
];

const mockSources: Source[] = [
  { id: "1", name: "@techcrunch_ru", type: "telegram", postsCollected: 342, status: "active" },
  { id: "2", name: "@coindesk", type: "telegram", postsCollected: 891, status: "active" },
  { id: "3", name: "habr.com/rss", type: "rss", postsCollected: 1205, status: "active" },
  { id: "4", name: "@ai_newsfeed", type: "telegram", postsCollected: 567, status: "paused" },
];

const mockPosts: ScheduledPost[] = [
  { id: "1", title: "Apple представила новый чип M5 Ultra...", channel: "Новости Технологий", scheduledAt: "Сегодня, 14:00", status: "pending" },
  { id: "2", title: "Bitcoin преодолел отметку $150,000...", channel: "Крипто Дайджест", scheduledAt: "Сегодня, 15:30", status: "pending" },
  { id: "3", title: "OpenAI анонсировала GPT-6...", channel: "Новости Технологий", scheduledAt: "Сегодня, 12:00", status: "published" },
  { id: "4", title: "Ethereum перешёл на новый протокол...", channel: "Крипто Дайджест", scheduledAt: "Сегодня, 10:00", status: "published" },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<"channels" | "sources" | "posts" | "stats">("channels");
  const { isAdmin, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold">TeleBot<span className="text-primary">.pro</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/profile"><Button variant="ghost" size="icon"><User className="w-4 h-4" /></Button></Link>
            {isAdmin && <Link to="/admin"><Button variant="ghost" size="icon"><Shield className="w-4 h-4" /></Button></Link>}
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Hash, label: "Каналов", value: "3", color: "text-primary" },
            { icon: TrendingUp, label: "Постов сегодня", value: "20", color: "text-primary" },
            { icon: Users, label: "Подписчиков", value: "47.4K", color: "text-primary" },
            { icon: Eye, label: "Охват", value: "128K", color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl glass">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-2xl font-display font-bold">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-secondary/50 w-fit">
          {(["channels", "sources", "posts", "stats"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-gradient-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {{ channels: "Каналы", sources: "Источники", posts: "Публикации", stats: "Статистика" }[tab]}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === "channels" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-display text-xl font-semibold">Мои каналы</h2>
                <Button variant="hero" size="sm"><Plus className="w-4 h-4" /> Добавить канал</Button>
              </div>
              <div className="grid gap-4">
                {mockChannels.map((ch) => (
                  <div key={ch.id} className="p-5 rounded-xl glass flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                        {ch.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{ch.name}</div>
                        <div className="text-sm text-muted-foreground">{ch.subscribers.toLocaleString()} подписчиков · {ch.postsToday} постов сегодня</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${ch.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {ch.status === "active" ? "Активен" : "Пауза"}
                      </span>
                      <Button variant="ghost" size="icon">{ch.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</Button>
                      <Button variant="ghost" size="icon"><Settings className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "sources" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-display text-xl font-semibold">Источники парсинга</h2>
                <Button variant="hero" size="sm"><Plus className="w-4 h-4" /> Добавить источник</Button>
              </div>
              <div className="grid gap-4">
                {mockSources.map((src) => (
                  <div key={src.id} className="p-5 rounded-xl glass flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        {src.type === "telegram" ? <Send className="w-5 h-5 text-primary" /> : <Rss className="w-5 h-5 text-accent" />}
                      </div>
                      <div>
                        <div className="font-semibold">{src.name}</div>
                        <div className="text-sm text-muted-foreground">{src.type === "telegram" ? "Telegram" : "RSS"} · {src.postsCollected} собрано</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${src.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {src.status === "active" ? "Активен" : "Пауза"}
                      </span>
                      <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "posts" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-display text-xl font-semibold">Публикации</h2>
                <Button variant="hero" size="sm"><Plus className="w-4 h-4" /> Создать пост</Button>
              </div>
              <div className="grid gap-3">
                {mockPosts.map((post) => (
                  <div key={post.id} className="p-4 rounded-xl glass flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        {post.status === "published" ? <ExternalLink className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{post.title}</div>
                        <div className="text-xs text-muted-foreground">{post.channel} · {post.scheduledAt}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      post.status === "published" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                    }`}>
                      {post.status === "published" ? "Опубликован" : "Ожидает"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-6">
              <h2 className="font-display text-xl font-semibold">Статистика</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl glass">
                  <h3 className="text-sm text-muted-foreground mb-4">Посты за неделю</h3>
                  <div className="flex items-end gap-2 h-40">
                    {[35, 48, 62, 41, 55, 72, 58].map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gradient-primary rounded-t-sm" style={{ height: `${(v / 72) * 100}%` }} />
                        <span className="text-[10px] text-muted-foreground">
                          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 rounded-xl glass">
                  <h3 className="text-sm text-muted-foreground mb-4">Рост подписчиков</h3>
                  <div className="flex items-end gap-2 h-40">
                    {[120, 180, 150, 220, 310, 280, 350].map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gradient-to-t from-accent to-primary rounded-t-sm" style={{ height: `${(v / 350) * 100}%` }} />
                        <span className="text-[10px] text-muted-foreground">
                          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
