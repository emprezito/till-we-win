import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, AlertTriangle, Clock } from "lucide-react";

interface UsageLog {
  id: string;
  created_at: string;
  function_name: string;
  key_index: number;
  endpoint: string;
  status: string;
  skipped: boolean;
  skip_reason: string | null;
}

interface UsageStats {
  today: number;
  todayActual: number;
  todaySkipped: number;
  last7Days: number;
  byKey: Record<number, number>;
  recentLogs: UsageLog[];
}

function computeStats(logs: UsageLog[]): UsageStats {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const todayLogs = logs.filter((l) => l.created_at >= todayStart);
  const weekLogs = logs.filter((l) => l.created_at >= weekAgo);

  const byKey: Record<number, number> = {};
  for (const log of todayLogs.filter((l) => !l.skipped)) {
    byKey[log.key_index] = (byKey[log.key_index] || 0) + 1;
  }

  return {
    today: todayLogs.length,
    todayActual: todayLogs.filter((l) => !l.skipped).length,
    todaySkipped: todayLogs.filter((l) => l.skipped).length,
    last7Days: weekLogs.filter((l) => !l.skipped).length,
    byKey,
    recentLogs: logs.slice(0, 50),
  };
}

export default function ApiUsageStats() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["api-usage-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as UsageLog[];
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm uppercase tracking-widest">API Usage Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = computeStats(logs || []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm uppercase tracking-widest">API Usage Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Zap className="h-4 w-4" />} label="Today (Actual)" value={stats.todayActual} />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Today (Skipped)" value={stats.todaySkipped} variant="muted" />
          <StatCard icon={<Activity className="h-4 w-4" />} label="7-Day Total" value={stats.last7Days} />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Total Logged" value={logs?.length || 0} variant="muted" />
        </div>

        {/* Per-Key Breakdown */}
        {Object.keys(stats.byKey).length > 0 && (
          <div>
            <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Today's Calls by Key
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byKey)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([key, count]) => (
                  <Badge key={key} variant="secondary" className="font-mono text-xs">
                    Key {Number(key) + 1}: {count} calls
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Recent Logs */}
        <div>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Recent API Calls
          </h3>
          <div className="max-h-64 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Function</TableHead>
                  <TableHead className="text-xs">Endpoint</TableHead>
                  <TableHead className="text-xs">Key</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentLogs.map((log) => (
                  <TableRow key={log.id} className="text-xs">
                    <TableCell className="whitespace-nowrap py-1.5 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="py-1.5">{log.function_name}</TableCell>
                    <TableCell className="max-w-[120px] truncate py-1.5 font-mono text-[11px]">
                      {log.skipped ? log.skip_reason || "skipped" : log.endpoint}
                    </TableCell>
                    <TableCell className="py-1.5">{log.skipped ? "—" : log.key_index + 1}</TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant={log.status === "success" ? "default" : log.skipped ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {stats.recentLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-4 text-center text-muted-foreground">
                      No API calls logged yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: "default" | "muted";
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-bold ${variant === "muted" ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
