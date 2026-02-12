import { useState, useEffect } from "react";
import {
  Send, Settings, Rss, Plus, Play, Pause, Globe,
  Trash2, Clock, Hash, TrendingUp, Users, Eye,
  LogOut, Shield, User, ChevronRight, ChevronLeft,
  Calendar as CalendarIcon, Timer, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

type Channel = {
  id: string;
  name: string;
  telegram_chat_id: string | null;
  telegram_bot_token: string | null;
  is_active: boolean;
  publish_interval_minutes: number;
  created_at: string;
};

type Source = {
  id: string;
  channel_id: string;
  name: string;
  source_type: "telegram" | "rss" | "web";
  url: string | null;
  telegram_source_id: string | null;
  is_active: boolean;
  posts_collected: number;
};

type ScheduledPost = {
  id: string;
  channel_id: string;
  text: string;
  scheduled_at: string;
  published_at: string | null;
  status: "pending" | "published" | "failed" | "skipped";
};

const INTERVALS = [
  { value: 5, label: "Каждые 5 мин" },
  { value: 10, label: "Каждые 10 мин" },
  { value: 30, label: "Каждые 30 мин" },
  { value: 60, label: "Каждый час" },
  { value: 120, label: "Каждые 2 часа" },
  { value: 240, label: "Каждые 4 часа" },
  { value: 480, label: "Каждые 8 часов" },
  { value: 1440, label: "Раз в день" },
];

const Dashboard = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [activeTab, setActiveTab] = useState<"channels" | "sources" | "schedule" | "stats">("channels");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();

  // Dialogs
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelChatId, setNewChannelChatId] = useState("");
  const [newChannelToken, setNewChannelToken] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState<"telegram" | "rss" | "web">("telegram");
  const [newSourceUrl, setNewSourceUrl] = useState("");

  const fetchChannels = async () => {
    const { data } = await supabase.from("channels").select("*").order("created_at");
    if (data) setChannels(data);
  };

  const fetchSources = async (channelId: string) => {
    const { data } = await supabase.from("sources").select("*").eq("channel_id", channelId).order("created_at");
    if (data) setSources(data);
  };

  const fetchPosts = async (channelId: string) => {
    const { data } = await supabase.from("scheduled_posts").select("*").eq("channel_id", channelId).order("scheduled_at", { ascending: true });
    if (data) setPosts(data);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchSources(selectedChannel.id);
      fetchPosts(selectedChannel.id);
    }
  }, [selectedChannel]);

  const addChannel = async () => {
    if (!newChannelName || !user) return;
    const { error } = await supabase.from("channels").insert({
      user_id: user.id,
      name: newChannelName,
      telegram_chat_id: newChannelChatId || null,
      telegram_bot_token: newChannelToken || null,
    });
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Канал добавлен" });
      setAddChannelOpen(false);
      setNewChannelName("");
      setNewChannelChatId("");
      setNewChannelToken("");
      fetchChannels();
    }
  };

  const addSource = async () => {
    if (!newSourceName || !selectedChannel || !user) return;
    const { error } = await supabase.from("sources").insert({
      channel_id: selectedChannel.id,
      user_id: user.id,
      name: newSourceName,
      source_type: newSourceType,
      url: newSourceType !== "telegram" ? newSourceUrl : null,
      telegram_source_id: newSourceType === "telegram" ? newSourceUrl : null,
    });
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Источник добавлен" });
      setAddSourceOpen(false);
      setNewSourceName("");
      setNewSourceUrl("");
      fetchSources(selectedChannel.id);
    }
  };

  const toggleChannel = async (ch: Channel) => {
    await supabase.from("channels").update({ is_active: !ch.is_active }).eq("id", ch.id);
    fetchChannels();
  };

  const deleteChannel = async (id: string) => {
    await supabase.from("channels").delete().eq("id", id);
    if (selectedChannel?.id === id) setSelectedChannel(null);
    fetchChannels();
  };

  const updateInterval = async (channelId: string, minutes: number) => {
    await supabase.from("channels").update({ publish_interval_minutes: minutes }).eq("id", channelId);
    fetchChannels();
    if (selectedChannel?.id === channelId) {
      setSelectedChannel(prev => prev ? { ...prev, publish_interval_minutes: minutes } : null);
    }
  };

  const toggleSource = async (src: Source) => {
    await supabase.from("sources").update({ is_active: !src.is_active }).eq("id", src.id);
    if (selectedChannel) fetchSources(selectedChannel.id);
  };

  const deleteSource = async (id: string) => {
    await supabase.from("sources").delete().eq("id", id);
    if (selectedChannel) fetchSources(selectedChannel.id);
  };

  const filteredPosts = posts.filter(p => {
    if (!selectedDate) return true;
    const postDate = new Date(p.scheduled_at);
    return postDate.toDateString() === selectedDate.toDateString();
  });

  const sourceIcon = (type: string) => {
    if (type === "telegram") return <Send className="w-4 h-4 text-primary" />;
    if (type === "rss") return <Rss className="w-4 h-4 text-accent" />;
    return <Globe className="w-4 h-4 text-muted-foreground" />;
  };

  // Channel detail view
  if (selectedChannel) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border glass sticky top-0 z-50">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => { setSelectedChannel(null); setActiveTab("channels"); }}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                {selectedChannel.name[0]}
              </div>
              <span className="font-display font-bold">{selectedChannel.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${selectedChannel.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {selectedChannel.is_active ? "Активен" : "Пауза"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/profile"><Button variant="ghost" size="icon"><User className="w-4 h-4" /></Button></Link>
              {isAdmin && <Link to="/admin"><Button variant="ghost" size="icon"><Shield className="w-4 h-4" /></Button></Link>}
              <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          {/* Channel settings bar */}
          <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl glass">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Частота публикаций:</span>
              <Select
                value={String(selectedChannel.publish_interval_minutes)}
                onValueChange={(v) => updateInterval(selectedChannel.id, Number(v))}
              >
                <SelectTrigger className="w-[180px] h-8 bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVALS.map(i => (
                    <SelectItem key={i.value} value={String(i.value)}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleChannel(selectedChannel)}
            >
              {selectedChannel.is_active ? <><Pause className="w-4 h-4" /> Пауза</> : <><Play className="w-4 h-4" /> Запустить</>}
            </Button>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 mb-6 p-1 rounded-lg bg-secondary/50 w-fit">
            {(["sources", "schedule"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {{ sources: "Источники", schedule: "Расписание" }[tab]}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {activeTab === "sources" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="font-display text-xl font-semibold">Источники для «{selectedChannel.name}»</h2>
                    <Dialog open={addSourceOpen} onOpenChange={setAddSourceOpen}>
                      <DialogTrigger asChild>
                        <Button variant="hero" size="sm"><Plus className="w-4 h-4" /> Добавить</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Добавить источник</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-4">
                          <Select value={newSourceType} onValueChange={(v) => setNewSourceType(v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="telegram">Telegram канал</SelectItem>
                              <SelectItem value="rss">RSS лента</SelectItem>
                              <SelectItem value="web">Веб-сайт</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input placeholder="Название" value={newSourceName} onChange={e => setNewSourceName(e.target.value)} />
                          <Input
                            placeholder={newSourceType === "telegram" ? "@channel_name" : "https://..."}
                            value={newSourceUrl}
                            onChange={e => setNewSourceUrl(e.target.value)}
                          />
                          <Button variant="hero" className="w-full" onClick={addSource}>Добавить</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {sources.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      Нет источников. Добавьте первый источник для парсинга.
                    </div>
                  )}

                  <div className="grid gap-3">
                    {sources.map(src => (
                      <div key={src.id} className="p-4 rounded-xl glass flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                            {sourceIcon(src.source_type)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{src.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {src.source_type === "telegram" ? "Telegram" : src.source_type === "rss" ? "RSS" : "Web"} · {src.posts_collected} собрано
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${src.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {src.is_active ? "Активен" : "Пауза"}
                          </span>
                          <Button variant="ghost" size="icon" onClick={() => toggleSource(src)}>
                            {src.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteSource(src.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "schedule" && (
                <div className="space-y-6">
                  <h2 className="font-display text-xl font-semibold">Расписание публикаций</h2>
                  <div className="grid md:grid-cols-[auto_1fr] gap-6">
                    <div className="glass rounded-xl p-4">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        locale={ru}
                        className="pointer-events-auto"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: ru }) : "Все даты"}
                        </h3>
                        <span className="text-xs text-muted-foreground">{filteredPosts.length} постов</span>
                      </div>
                      {filteredPosts.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">Нет запланированных публикаций</div>
                      )}
                      {filteredPosts.map(post => (
                        <div key={post.id} className="p-3 rounded-lg glass flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="text-sm font-medium truncate max-w-[300px]">{post.text.slice(0, 80)}...</div>
                              <div className="text-xs text-muted-foreground">{format(new Date(post.scheduled_at), "HH:mm", { locale: ru })}</div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            post.status === "published" ? "bg-primary/20 text-primary"
                            : post.status === "failed" ? "bg-destructive/20 text-destructive"
                            : "bg-accent/20 text-accent"
                          }`}>
                            {{ pending: "Ожидает", published: "Опубликован", failed: "Ошибка", skipped: "Пропущен" }[post.status]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Main channel list view
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
            { icon: Hash, label: "Каналов", value: String(channels.length) },
            { icon: TrendingUp, label: "Активных", value: String(channels.filter(c => c.is_active).length) },
            { icon: Users, label: "Источников", value: "—" },
            { icon: Eye, label: "Публикаций", value: "—" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-xl glass">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-2xl font-display font-bold">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Channel cards */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-xl font-semibold">Мои каналы</h2>
          <Dialog open={addChannelOpen} onOpenChange={setAddChannelOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm"><Plus className="w-4 h-4" /> Добавить канал</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Новый Telegram канал</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <Input placeholder="Название канала" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
                <Input placeholder="Chat ID (напр. -1001234567890)" value={newChannelChatId} onChange={e => setNewChannelChatId(e.target.value)} />
                <Input placeholder="Bot Token" type="password" value={newChannelToken} onChange={e => setNewChannelToken(e.target.value)} />
                <Button variant="hero" className="w-full" onClick={addChannel}>Создать</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {channels.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Send className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>У вас пока нет каналов. Добавьте первый!</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map(ch => (
            <motion.div
              key={ch.id}
              whileHover={{ scale: 1.02 }}
              className="p-5 rounded-xl glass cursor-pointer group"
              onClick={() => { setSelectedChannel(ch); setActiveTab("sources"); }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                    {ch.name[0]}
                  </div>
                  <div>
                    <div className="font-display font-semibold">{ch.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {INTERVALS.find(i => i.value === ch.publish_interval_minutes)?.label || `${ch.publish_interval_minutes} мин`}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${ch.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {ch.is_active ? "Активен" : "Пауза"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Нажмите для настройки</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>

              {/* Action buttons - stop propagation */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => { e.stopPropagation(); toggleChannel(ch); }}
                >
                  {ch.is_active ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  {ch.is_active ? "Пауза" : "Запуск"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); deleteChannel(ch.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
