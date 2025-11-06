import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Professional {
  status: string;
}

interface StatusDistributionChartProps {
  professionals: Professional[];
}

const STATUS_COLORS = {
  waiting_approval: "hsl(var(--chart-2))",
  approved: "hsl(var(--chart-1))",
  rejected: "hsl(var(--chart-3))",
  inactive: "hsl(var(--chart-4))",
};

const STATUS_LABELS = {
  waiting_approval: "Pendientes",
  approved: "Aprobados",
  rejected: "Rechazados",
  inactive: "Inactivos",
};

export const StatusDistributionChart = ({ professionals }: StatusDistributionChartProps) => {
  const statusCounts = professionals.reduce((acc, prof) => {
    acc[prof.status] = (acc[prof.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    status: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
    count,
    fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "hsl(var(--chart-5))",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por Estado</CardTitle>
        <CardDescription>Cantidad de profesionales según su estado</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="status" 
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
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
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
