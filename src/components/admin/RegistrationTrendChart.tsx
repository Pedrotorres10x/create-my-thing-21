import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface Professional {
  created_at: string;
}

interface RegistrationTrendChartProps {
  professionals: Professional[];
}

export const RegistrationTrendChart = ({ professionals }: RegistrationTrendChartProps) => {
  // Get last 12 months
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(startOfMonth(new Date()), 11 - i);
    return {
      date,
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM yyyy", { locale: es }),
      count: 0,
    };
  });

  // Count registrations per month
  professionals.forEach((prof) => {
    const monthKey = format(startOfMonth(parseISO(prof.created_at)), "yyyy-MM");
    const monthData = last12Months.find((m) => m.key === monthKey);
    if (monthData) {
      monthData.count++;
    }
  });

  const data = last12Months.map((month) => ({
    month: month.label,
    registros: month.count,
  }));

  // Calculate cumulative
  let cumulative = 0;
  const dataWithCumulative = data.map((item) => {
    cumulative += item.registros;
    return {
      ...item,
      acumulado: cumulative,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución de Registros</CardTitle>
        <CardDescription>Registros mensuales de los últimos 12 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dataWithCumulative}>
            <defs>
              <linearGradient id="colorRegistros" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Area 
              type="monotone" 
              dataKey="registros" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1}
              fill="url(#colorRegistros)"
              name="Registros del mes"
            />
            <Line 
              type="monotone" 
              dataKey="acumulado" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-2))" }}
              name="Total acumulado"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
