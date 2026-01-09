"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SparklineChart } from "./SparklineChart";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  sparklineData?: number[];
}

export function MetricCard({
  title,
  value,
  subtitle,
  secondaryValue,
  secondaryLabel,
  sparklineData,
}: MetricCardProps) {
  return (
    <Card className="flex-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-4">
          <div>
            {subtitle && (
              <span className="text-xs text-muted-foreground block mb-1">
                {subtitle}
              </span>
            )}
            <span className="text-3xl font-bold">{value}</span>
          </div>
          {secondaryValue && (
            <div className="text-right">
              {secondaryLabel && (
                <span className="text-xs text-muted-foreground block mb-1">
                  {secondaryLabel}
                </span>
              )}
              <span className="text-3xl font-bold">{secondaryValue}</span>
            </div>
          )}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 h-12">
            <SparklineChart data={sparklineData} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
