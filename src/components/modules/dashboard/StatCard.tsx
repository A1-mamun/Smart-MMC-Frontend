import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  trend?: { value: number; suffix?: string };
  className?: string;
};

const StatCard = ({ label, value, sublabel, icon: Icon, trend, className }: StatCardProps) => {
  const positive = trend && trend.value >= 0;
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
            {trend && (
              <p className={cn("text-xs mt-2", positive ? "text-emerald-600" : "text-destructive")}>
                {positive ? "▲" : "▼"} {Math.abs(trend.value)}
                {trend.suffix || "%"} vs previous
              </p>
            )}
          </div>
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;