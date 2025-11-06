import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Professional {
  sector_catalog?: { name: string };
}

interface SectorDistributionChartProps {
  professionals: Professional[];
}

export const SectorDistributionChart = ({ professionals }: SectorDistributionChartProps) => {
  const sectorCounts = professionals.reduce((acc, prof) => {
    const sector = prof.sector_catalog?.name || "Sin sector";
    acc[sector] = (acc[sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(sectorCounts)
    .map(([sector, count]) => ({
      sector,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 sectores

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sectores Más Populares</CardTitle>
        <CardDescription>Top 10 sectores con más profesionales</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number" 
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <YAxis 
              dataKey="sector" 
              type="category" 
              width={150}
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
            <Bar 
              dataKey="count" 
              fill="hsl(var(--primary))" 
              radius={[0, 8, 8, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
