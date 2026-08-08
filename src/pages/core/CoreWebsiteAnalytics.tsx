import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users, Eye, TrendingUp, Globe, Smartphone, Search, Link2, Radio, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const SOURCE_ICON: Record<string, any> = {
  search: Search,
  social: Radio,
  referral: Link2,
  direct: Globe,
};

const fmtNum = (n: number) => new Intl.NumberFormat("en-NG").format(n || 0);

export default function CoreWebsiteAnalytics() {
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ["core-website-analytics", days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_website_analytics", { p_days: days });
      if (error) throw error;
      return data as any;
    },
  });

  const daily: any[] = data?.daily ?? [];
  const peak = daily.reduce((m, d) => Math.max(m, Number(d.visitors) || 0), 0);

  return (
    <DashboardLayout
      title="Website Analytics"
      subtitle="Anonymous visitor traffic to the public marketing pages"
    >
      <div className="space-y-6">
        {/* Range selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Button
                key={r.days}
                size="sm"
                variant={days === r.days ? "default" : "outline"}
                onClick={() => setDays(r.days)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <Badge variant="outline" className="gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            Cookieless · no personal data stored
          </Badge>
        </div>

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm text-destructive">
              Could not load analytics: {(error as any)?.message ?? "unknown error"}
            </CardContent>
          </Card>
        )}

        {/* Headline counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Today", v: data?.today, icon: Eye },
            { label: "Last 7 days", v: data?.week, icon: Users },
            { label: "Last 30 days", v: data?.month, icon: TrendingUp },
          ].map(({ label, v, icon: Icon }) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-medium">
                  <Icon className="w-4 h-4" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tabular-nums">
                  {isLoading ? "…" : fmtNum(v?.visitors)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  visitors · {isLoading ? "…" : fmtNum(v?.pageviews)} pageviews
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Signup conversion */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Signup Conversion</CardTitle>
            <CardDescription>
              Organisations created against unique visitors over the selected range.
              Visitors are anonymous by design, so this is a funnel rate rather than
              per-visitor attribution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold tabular-nums">{fmtNum(data?.conversion?.visitors)}</p>
                <p className="text-xs text-muted-foreground">Visitors</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{fmtNum(data?.conversion?.signups)}</p>
                <p className="text-xs text-muted-foreground">Signups</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-primary">
                  {data?.conversion?.rate_pct ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground">Conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily trend — simple bar chart, no chart lib needed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Daily Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            {daily.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No traffic recorded yet. Data appears once the marketing pages receive visits.
              </p>
            ) : (
              <div className="flex items-end gap-1 h-40 overflow-x-auto">
                {daily.map((d: any) => {
                  const v = Number(d.visitors) || 0;
                  const pct = peak > 0 ? (v / peak) * 100 : 0;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 min-w-[8px] flex flex-col items-center justify-end h-full group"
                      title={`${d.date}: ${v} visitors, ${d.pageviews} pageviews`}
                    >
                      <div
                        className="w-full bg-primary/70 group-hover:bg-primary rounded-t transition-colors"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {daily.length > 0 && (
              <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                <span>{format(parseISO(daily[0].date), "dd MMM")}</span>
                <span>{format(parseISO(daily[daily.length - 1].date), "dd MMM")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top pages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Top Pages</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Path</TableHead>
                    <TableHead className="text-xs text-right">Visitors</TableHead>
                    <TableHead className="text-xs text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.top_pages ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">No data</TableCell></TableRow>
                  ) : (data?.top_pages ?? []).map((p: any) => (
                    <TableRow key={p.path}>
                      <TableCell className="font-mono text-xs">{p.path}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtNum(p.visitors)}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtNum(p.pageviews)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Traffic sources */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs text-right">Visitors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.sources ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-6">No data</TableCell></TableRow>
                  ) : (data?.sources ?? []).map((s: any, i: number) => {
                    const Icon = SOURCE_ICON[s.type] ?? Globe;
                    return (
                      <TableRow key={`${s.type}-${s.host ?? i}`}>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="capitalize">{s.type}</span>
                            {s.host && <span className="text-muted-foreground">· {s.host}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmtNum(s.visitors)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Countries */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="w-4 h-4" /> Countries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Country</TableHead>
                    <TableHead className="text-xs text-right">Visitors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.countries ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-6">No data</TableCell></TableRow>
                  ) : (data?.countries ?? []).map((c: any) => (
                    <TableRow key={c.country}>
                      <TableCell className="text-xs font-mono">{c.country}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtNum(c.visitors)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Devices */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Devices
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Device</TableHead>
                    <TableHead className="text-xs text-right">Visitors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.devices ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-6">No data</TableCell></TableRow>
                  ) : (data?.devices ?? []).map((d: any) => (
                    <TableRow key={d.device}>
                      <TableCell className="text-xs capitalize">{d.device}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{fmtNum(d.visitors)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground">
          Visitors are identified by an anonymous hash of IP + user agent with a salt that
          rotates daily. No cookie is set and no personal data is stored. Because the salt
          rotates, weekly and monthly figures count unique visitor-days rather than
          deduplicated people. Known crawlers are excluded.
        </p>
      </div>
    </DashboardLayout>
  );
}
