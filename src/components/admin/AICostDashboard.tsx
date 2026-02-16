import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquare, Zap, DollarSign, Users, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface DailyStats {
  date: string;
  messages: number;
  users: number;
}

interface PlanUsage {
  plan_name: string;
  plan_slug: string;
  user_count: number;
  total_messages_today: number;
  avg_messages: number;
}

// Cost constants for Gemini 2.5 Flash
const AVG_INPUT_TOKENS = 5000; // system prompt + context + history
const AVG_OUTPUT_TOKENS = 600;
const COST_PER_1M_INPUT = 0.15; // USD per 1M input tokens
const COST_PER_1M_OUTPUT = 0.60; // USD per 1M output tokens

function estimateCost(messageCount: number): number {
  const inputCost = (messageCount * AVG_INPUT_TOKENS / 1_000_000) * COST_PER_1M_INPUT;
  const outputCost = (messageCount * AVG_OUTPUT_TOKENS / 1_000_000) * COST_PER_1M_OUTPUT;
  return inputCost + outputCost;
}

export function AICostDashboard() {
  const [loading, setLoading] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalConversations, setTotalConversations] = useState(0);
  const [todayMessages, setTodayMessages] = useState(0);
  const [todayActiveUsers, setTodayActiveUsers] = useState(0);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [planUsage, setPlanUsage] = useState<PlanUsage[]>([]);
  const [last30DaysMessages, setLast30DaysMessages] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTotals(),
        loadTodayStats(),
        loadDailyHistory(),
        loadPlanUsage(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadTotals = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("role", "assistant");
    
    setTotalMessages(data?.length ?? 0);

    const { count: msgCount } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("role", "assistant");
    
    setTotalMessages(msgCount ?? 0);

    const { count: convCount } = await supabase
      .from("chat_conversations")
      .select("*", { count: "exact", head: true });
    
    setTotalConversations(convCount ?? 0);
  };

  const loadTodayStats = async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("role", "assistant")
      .gte("created_at", todayStart.toISOString());

    setTodayMessages(count ?? 0);

    // Active users today (those with daily count > 0)
    const { data: activeData } = await supabase
      .from("professionals")
      .select("id")
      .gt("ai_messages_daily_count", 0)
      .gt("ai_messages_daily_reset_at", new Date().toISOString());

    setTodayActiveUsers(activeData?.length ?? 0);
  };

  const loadDailyHistory = async () => {
    // Get messages per day for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("created_at, conversation_id")
      .eq("role", "assistant")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (!messages) return;

    setLast30DaysMessages(messages.length);

    // Group by date
    const byDate: Record<string, { messages: number; users: Set<string> }> = {};
    messages.forEach((m) => {
      const date = m.created_at.split("T")[0];
      if (!byDate[date]) byDate[date] = { messages: 0, users: new Set() };
      byDate[date].messages++;
      byDate[date].users.add(m.conversation_id);
    });

    const stats = Object.entries(byDate)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
        messages: data.messages,
        users: data.users.size,
      }))
      .slice(-14); // Last 14 days for the chart

    setDailyStats(stats);
  };

  const loadPlanUsage = async () => {
    const { data } = await (supabase as any)
      .from("professionals")
      .select(`
        ai_messages_daily_count,
        ai_messages_daily_reset_at,
        subscription_plans (name, slug, ai_messages_limit)
      `)
      .gt("ai_messages_daily_count", 0);

    if (!data) return;

    const byPlan: Record<string, PlanUsage> = {};
    data.forEach((p: any) => {
      const slug = p.subscription_plans?.slug || "free";
      const name = p.subscription_plans?.name || "Free";
      if (!byPlan[slug]) {
        byPlan[slug] = { plan_name: name, plan_slug: slug, user_count: 0, total_messages_today: 0, avg_messages: 0 };
      }
      byPlan[slug].user_count++;
      byPlan[slug].total_messages_today += p.ai_messages_daily_count || 0;
    });

    Object.values(byPlan).forEach((p) => {
      p.avg_messages = p.user_count > 0 ? Math.round(p.total_messages_today / p.user_count) : 0;
    });

    setPlanUsage(Object.values(byPlan));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const todayCost = estimateCost(todayMessages);
  const last30Cost = estimateCost(last30DaysMessages);
  const totalCost = estimateCost(totalMessages);
  const avgDailyMessages = last30DaysMessages > 0 ? Math.round(last30DaysMessages / 30) : 0;
  const projectedMonthlyCost = estimateCost(avgDailyMessages * 30);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Coste estimado de Alic.IA</h2>
        <p className="text-sm text-muted-foreground">
          Modelo: Gemini 2.5 Flash · ~{AVG_INPUT_TOKENS.toLocaleString()} tokens entrada + ~{AVG_OUTPUT_TOKENS} tokens salida por mensaje
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">${todayCost.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">Coste hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-secondary/10">
                <MessageSquare className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayMessages}</p>
                <p className="text-xs text-muted-foreground">Mensajes hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayActiveUsers}</p>
                <p className="text-xs text-muted-foreground">Usuarios activos hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <TrendingUp className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">${projectedMonthlyCost.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Proyección mensual</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimos 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Mensajes totales</span>
                <span className="font-semibold">{last30DaysMessages.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Media diaria</span>
                <span className="font-semibold">{avgDailyMessages}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Coste estimado</span>
                <span className="font-semibold text-primary">${last30Cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Tokens consumidos (est.)</span>
                <span className="font-semibold">{((last30DaysMessages * (AVG_INPUT_TOKENS + AVG_OUTPUT_TOKENS)) / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Mensajes IA</span>
                <span className="font-semibold">{totalMessages.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Conversaciones</span>
                <span className="font-semibold">{totalConversations.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Coste estimado total</span>
                <span className="font-semibold text-primary">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Coste por mensaje</span>
                <span className="font-semibold">${totalMessages > 0 ? (totalCost / totalMessages * 1000).toFixed(2) : "0"}‰</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uso por plan (hoy)</CardTitle>
          </CardHeader>
          <CardContent>
            {planUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin uso hoy</p>
            ) : (
              <div className="space-y-3">
                {planUsage.map((p) => (
                  <div key={p.plan_slug} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={p.plan_slug === "premium" ? "default" : "secondary"} className="text-xs">
                        {p.plan_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{p.user_count} usuarios</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{p.total_messages_today} msg</span>
                      <span className="text-xs text-muted-foreground ml-1">(~{p.avg_messages}/u)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      {dailyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Mensajes diarios (últimos 14 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-sm">{label}</p>
                          <p className="text-sm">{data.messages} mensajes</p>
                          <p className="text-sm">{data.users} conversaciones</p>
                          <p className="text-sm text-primary font-medium">~${estimateCost(data.messages).toFixed(3)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Reference */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Referencia de precios (Gemini 2.5 Flash):</strong></p>
              <p>Input: ${COST_PER_1M_INPUT}/1M tokens · Output: ${COST_PER_1M_OUTPUT}/1M tokens</p>
              <p>Estimación por mensaje: ~${estimateCost(1).toFixed(4)} USD ({AVG_INPUT_TOKENS.toLocaleString()} in + {AVG_OUTPUT_TOKENS} out tokens)</p>
              <p className="text-xs mt-2">⚠️ Los costes son estimaciones basadas en promedios. El coste real puede variar según la longitud del historial de conversación.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
