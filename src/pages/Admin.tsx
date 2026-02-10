import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  Send, Users, Shield, Search, Crown, Trash2, LogOut, ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type UserRow = {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  subscription_status: string | null;
  subscription_plan_id: string | null;
  created_at: string;
};

type Plan = { id: string; name: string; slug: string };

const Admin = () => {
  const { signOut } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: plansData }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("subscription_plans").select("id, name, slug").order("sort_order"),
      supabase.from("user_roles").select("*"),
    ]);
    setUsers(profiles || []);
    setPlans(plansData || []);
    const rolesMap: Record<string, string[]> = {};
    rolesData?.forEach(r => {
      if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
      rolesMap[r.user_id].push(r.role);
    });
    setRoles(rolesMap);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleAdmin = async (userId: string) => {
    const isCurrentlyAdmin = roles[userId]?.includes("admin");
    if (isCurrentlyAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" as any });
    }
    await fetchData();
    toast({ title: isCurrentlyAdmin ? "Роль админа снята" : "Роль админа назначена" });
  };

  const updatePlan = async (userId: string, planId: string | null) => {
    await supabase.from("profiles").update({
      subscription_plan_id: planId,
      subscription_status: planId ? "active" : null
    } as any).eq("user_id", userId);
    await fetchData();
    toast({ title: "Тариф обновлён" });
  };

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

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
            <Link to="/profile"><Button variant="ghost" size="sm">Профиль</Button></Link>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Админ-панель
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Всего пользователей", value: users.length, icon: Users },
              { label: "Админов", value: Object.values(roles).filter(r => r.includes("admin")).length, icon: Shield },
              { label: "С подпиской", value: users.filter(u => u.subscription_status === "active").length, icon: Crown },
              { label: "Новых сегодня", value: users.filter(u => new Date(u.created_at).toDateString() === new Date().toDateString()).length, icon: Users },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl glass">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <div className="text-2xl font-display font-bold">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Поиск по email или имени..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary/50 border-border" />
          </div>

          {/* Users table */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs text-muted-foreground font-medium">Email</th>
                    <th className="text-left p-4 text-xs text-muted-foreground font-medium">Имя</th>
                    <th className="text-left p-4 text-xs text-muted-foreground font-medium">Роль</th>
                    <th className="text-left p-4 text-xs text-muted-foreground font-medium">Тариф</th>
                    <th className="text-left p-4 text-xs text-muted-foreground font-medium">Статус</th>
                    <th className="text-left p-4 text-xs text-muted-foreground font-medium">Дата</th>
                    <th className="text-left p-4 text-xs text-muted-foreground font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => {
                    const userRoles = roles[u.user_id] || ["user"];
                    const plan = plans.find(p => p.id === u.subscription_plan_id);
                    return (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="p-4 text-sm">{u.email}</td>
                        <td className="p-4 text-sm text-muted-foreground">{u.display_name || "—"}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${userRoles.includes("admin") ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {userRoles.includes("admin") ? "Админ" : "Пользователь"}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            className="bg-secondary/50 border border-border rounded-md px-2 py-1 text-xs text-foreground"
                            value={u.subscription_plan_id || ""}
                            onChange={e => updatePlan(u.user_id, e.target.value || null)}
                          >
                            <option value="">Нет</option>
                            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${u.subscription_status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {u.subscription_status || "—"}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("ru")}</td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm" onClick={() => toggleAdmin(u.user_id)}>
                            {userRoles.includes("admin") ? "Снять админа" : "Сделать админом"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Admin;
