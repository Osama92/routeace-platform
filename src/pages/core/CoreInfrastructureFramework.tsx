import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Database,
  GitBranch,
  Globe2,
  HardDrive,
  Layers,
  LifeBuoy,
  Lock,
  Network,
  Search,
  Server,
  ShieldAlert,
  Siren,
  Sparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Core Infrastructure Framework
 * ─────────────────────────────────────────────────────────────
 * Internal scaffold for the Routeace Core team. Each module here
 * is a placeholder UI with explicit Pointer Notes for the
 * platform/infra engineers so the work can be completed without
 * needing to re-derive scope from product.
 *
 * Nothing on this page is exposed to customers - it lives under
 * /core and is gated by CoreProtectedRoute.
 */

type Status = "scaffold" | "in-design" | "blocked";

interface InfraModule {
  id: string;
  title: string;
  category:
    | "Reliability"
    | "Scaling"
    | "Security"
    | "Observability"
    | "Disaster Recovery";
  status: Status;
  icon: React.ElementType;
  summary: string;
  pointerNotes: string[];
  /** External tooling / refs to install or evaluate */
  stack?: string[];
}

const MODULES: InfraModule[] = [
  {
    id: "chaos-ai",
    title: "Chaos AI Engine",
    category: "Reliability",
    status: "scaffold",
    icon: Siren,
    summary:
      "Continuously injects controlled failures (DB latency, 5xx, auth expiry, network jitter) and validates self-healing.",
    stack: ["AWS Fault Injection Simulator", "Gremlin", "k6 chaos extension"],
    pointerNotes: [
      "Run only in `staging` and shadow ≤1% production traffic - use feature-flag `chaos.enabled` per env.",
      "Persist every injection in a `chaos_runs` table (id, env, scenario, started_at, ended_at, blast_radius, outcome).",
      "Outcome must include automated SLO checks: error_rate, p95 latency, queue_depth - auto-rollback if any breach > 2 min.",
      "Wire the scheduler to GitHub Actions (cron: every 5 min staging, daily 02:00 UTC for shadow prod).",
      "UI hook: this card should later render last 10 runs from the backend service `core-chaos-runner` (deploy as edge function + worker).",
    ],
  },
  {
    id: "shadow-replay",
    title: "Shadow Traffic Replay",
    category: "Reliability",
    status: "scaffold",
    icon: GitBranch,
    summary:
      "Mirrors real production requests into a parallel environment and diffs the responses for regression detection.",
    stack: ["Envoy mirror filter", "GoReplay", "Diffy by Twitter"],
    pointerNotes: [
      "Provision a sidecar (Envoy or Nginx with `mirror`) at the edge - capture only idempotent GET/POST endpoints first.",
      "Strip PII before mirroring: tokens, phone, NIN, BVN, payment card data. Use a deny-list at the proxy layer.",
      "Diff service compares JSON bodies with field-level tolerance (timestamps, request_ids ignored).",
      "Store discrepancies in `shadow_diffs` (endpoint, request_hash, prod_status, shadow_status, diff_json).",
      "Add a UI tab here that paginates `shadow_diffs` ordered by frequency.",
    ],
  },
  {
    id: "self-heal",
    title: "Self-Healing Engine",
    category: "Reliability",
    status: "scaffold",
    icon: LifeBuoy,
    summary:
      "Retries with exponential backoff, fails over to replicas, drains stuck queues, recycles workers without human input.",
    stack: ["BullMQ retry", "pg_bouncer failover", "Kubernetes liveness probes"],
    pointerNotes: [
      "Centralize retry policy in `lib/reliability/retry.ts` - never re-implement per call site.",
      "DB failover: configure a read-replica DSN and a circuit breaker (`opossum`) that flips after 5 consecutive errors in 30s.",
      "Queue recovery: nightly job moves jobs older than 24h from `failed` → `retry` (max 3 attempts), older than that → `dead-letter`.",
      "Expose `/health/deep` from each edge function returning DB ping + queue depth + last successful job.",
      "Alert on healing actions (Slack `#core-incidents`) so on-call still has visibility.",
    ],
  },
  {
    id: "queue-system",
    title: "Background Queue System",
    category: "Scaling",
    status: "scaffold",
    icon: Boxes,
    summary:
      "Move heavy work (AI scoring, fuel calc, report generation, notifications) off request path.",
    stack: ["Upstash Redis", "BullMQ", "Inngest (alt)"],
    pointerNotes: [
      "Enable Lovable Cloud's edge functions to enqueue via Upstash REST (no socket required).",
      "Define queues: `ai-scoring`, `report-gen`, `notifications`, `fuel-recompute`, `dispatch-postprocess`.",
      "Idempotency: every job carries a `job_key`; workers check `processed_jobs` table before executing.",
      "Add a worker process (separate Node service or Inngest function) - NOT in the React app.",
      "Render queue depth + lag on this page once `/core/queues/stats` endpoint exists.",
    ],
  },
  {
    id: "db-scaling",
    title: "Database Scaling & Sharding",
    category: "Scaling",
    status: "in-design",
    icon: Database,
    summary:
      "Read/write split on Postgres, sharding key on `organization_id`, hot-path indexes everywhere.",
    stack: ["Supabase read replicas", "Citus (future)", "PgHero for slow-query review"],
    pointerNotes: [
      "Step 1 (no schema change): enable Supabase read replica, route analytics + dashboard queries to it.",
      "Step 2: audit every query hitting `dispatches`, `organization_members`, `vehicles`, `drivers` - add covering indexes.",
      "Step 3 (future): introduce Citus distribution on `organization_id` once monthly writes exceed 50M rows.",
      "Never query without `organization_id` filter - add a Postgres `pg_audit` rule to flag missing filters.",
      "Track p95/p99 slow queries via PgHero weekly, attach to this card.",
    ],
  },
  {
    id: "caching",
    title: "Caching Layer",
    category: "Scaling",
    status: "scaffold",
    icon: Zap,
    summary:
      "Edge cache for dashboards (5–15 min TTL) and computed pricing results.",
    stack: ["Upstash Redis", "stale-while-revalidate", "TanStack Query persistence"],
    pointerNotes: [
      "Wrap dashboard aggregations in `cached(key, ttl, fn)` helper located at `lib/cache/index.ts`.",
      "Cache keys MUST include `organization_id` to avoid cross-tenant leakage.",
      "Invalidate on mutation: dispatch save → bust `dashboard:{org}:*`, invoice post → bust `finance:{org}:*`.",
      "On the client, configure TanStack Query `staleTime: 60_000` for read-only dashboards.",
    ],
  },
  {
    id: "rate-limit",
    title: "Rate Limiting & Abuse Control",
    category: "Security",
    status: "scaffold",
    icon: ShieldAlert,
    summary:
      "Per-user, per-IP, per-API-key throttling with sliding windows. Auth endpoints get the strictest limits.",
    stack: ["Upstash Ratelimit", "Cloudflare WAF rules"],
    pointerNotes: [
      "Auth endpoints: 5 req/sec per IP, 30 req/min per email.",
      "API endpoints: per `api_keys.rate_limit_per_minute` and `rate_limit_per_day` (already on schema).",
      "Block list: maintain `blocked_ips` table; reject before hitting any business logic.",
      "Return RFC-compliant `429` with `Retry-After` header.",
      "Surface live throttling stats here once `core-rate-stats` edge function is deployed.",
    ],
  },
  {
    id: "monitoring",
    title: "Monitoring & Alerting",
    category: "Observability",
    status: "scaffold",
    icon: Activity,
    summary:
      "Real-time CPU/mem/latency/error-rate metrics with alerting into PagerDuty + Slack.",
    stack: ["Sentry", "BetterStack / Logtail", "Grafana Cloud"],
    pointerNotes: [
      "Sentry already exists for client errors - extend to all edge functions (init in each `index.ts`).",
      "Log structured JSON: `{ ts, level, fn, org_id, user_id, request_id, msg, ctx }`.",
      "Alert thresholds: error_rate > 1% over 5 min, p95 latency > 500ms over 5 min, queue lag > 60s.",
      "PagerDuty: route `severity=critical` to on-call, `severity=warning` to Slack only.",
      "Render last 24h incident timeline from `incidents` table in this card.",
    ],
  },
  {
    id: "tenant-isolation",
    title: "Multi-Tenant Isolation Audit",
    category: "Security",
    status: "scaffold",
    icon: Lock,
    summary:
      "Static and runtime checks that every query is scoped by `organization_id` and RLS policies are non-recursive.",
    pointerNotes: [
      "Already fixed: `organization_members` self-recursion (replaced with `get_user_organization()`).",
      "Add a CI check: scan `.sql` migrations for policies that reference their own table without `SECURITY DEFINER` helper.",
      "Runtime: log any query that returns rows belonging to multiple `organization_id` for any non-super-admin caller.",
      "Quarterly: run `supabase--linter` and triage all warnings here.",
    ],
  },
  {
    id: "auto-scaling",
    title: "Auto-Scaling Engine",
    category: "Scaling",
    status: "in-design",
    icon: Server,
    summary:
      "Horizontally scale workers and edge function concurrency based on CPU and queue depth.",
    stack: ["Supabase edge function concurrency", "Fly.io scale --min/--max"],
    pointerNotes: [
      "Edge functions: keep stateless. Set concurrency limits per function in `supabase/config.toml` once observed traffic justifies.",
      "Worker process (queue consumers): host on Fly.io / Railway with `min=1 max=10` and CPU-based autoscale.",
      "Trigger thresholds: scale up at CPU>70% sustained 2 min OR queue lag >30s. Scale down after 10 min idle.",
    ],
  },
  {
    id: "incident-ai",
    title: "Incident Response AI",
    category: "Observability",
    status: "scaffold",
    icon: AlertTriangle,
    summary:
      "Classifies, prioritizes, and applies first-response runbooks to incoming alerts.",
    pointerNotes: [
      "Use Lovable AI Gateway (`google/gemini-2.5-flash`) - already wired via `LOVABLE_API_KEY`.",
      "Input: alert payload + last 200 log lines. Output: severity (critical/medium/low), category, suggested runbook step.",
      "Store in `incident_classifications` and link to PagerDuty incident id.",
      "Never auto-execute destructive actions - always require human approval for db writes / restarts.",
    ],
  },
  {
    id: "security-watchdog",
    title: "Security Watchdog",
    category: "Security",
    status: "scaffold",
    icon: ShieldAlert,
    summary:
      "Detects cross-tenant access attempts, unusual API spikes, role-escalation tries.",
    pointerNotes: [
      "Tail `audit_logs` and `access_governance_log` in a worker; flag patterns: same actor escalating self, off-hours role grants, IP changes mid-session.",
      "Auto-actions: revoke API key on confirmed leak, require step-up auth on suspicious sign-in.",
      "Surface live alerts in `/core/security` (already routed) - link out from this card.",
    ],
  },
  {
    id: "system-memory",
    title: "System Memory & Learning Loop",
    category: "Observability",
    status: "scaffold",
    icon: Sparkles,
    summary:
      "Persistent memory of past incidents and applied fixes - replay the fix when the same signature recurs.",
    pointerNotes: [
      "Schema: `incident_memory(signature_hash, incident_summary, fix_applied, success, occurred_count, last_seen_at)`.",
      "Signature = hash of (error_class + endpoint + module). Bump `occurred_count` on each match.",
      "When `occurred_count >= 3` and last fix succeeded, auto-apply on next match (with audit log).",
    ],
  },
  {
    id: "war-room",
    title: "Live War-Room Dashboard",
    category: "Observability",
    status: "scaffold",
    icon: Network,
    summary:
      "Single pane: uptime, active users, system load, live incidents, healing actions taken.",
    pointerNotes: [
      "Realtime: subscribe via Supabase Realtime to `incidents`, `chaos_runs`, `healing_actions`.",
      "KPIs to render: uptime % rolling 24h/7d/30d, p95 latency, error budget remaining.",
      "This becomes the home of `/core/war-room` - file a ticket once the data sources are live.",
    ],
  },
  {
    id: "safe-deploy",
    title: "Safe Deployment Engine",
    category: "Disaster Recovery",
    status: "scaffold",
    icon: Layers,
    summary:
      "Shadow test before deploy → 1% → 10% → 50% → 100% rollout with auto-rollback on error spike.",
    stack: ["GitHub Actions environments", "LaunchDarkly / Unleash"],
    pointerNotes: [
      "Wrap risky changes in feature flags (use Unleash self-hosted or LaunchDarkly).",
      "Rollout checks every stage: error_rate delta vs previous version, p95 delta. Abort and rollback if either > 25% worse.",
      "Required approvals: Super Admin for any change touching auth, payments, or DB schema.",
    ],
  },
  {
    id: "dr-backup",
    title: "Disaster Recovery & Backups",
    category: "Disaster Recovery",
    status: "scaffold",
    icon: HardDrive,
    summary:
      "Automated daily DB snapshots, multi-region failover plan, < 5 min RTO target.",
    pointerNotes: [
      "Supabase PITR is enabled on Lovable Cloud - verify retention is 7 days minimum.",
      "Quarterly fire-drill: restore latest snapshot to a scratch project and run smoke tests (login, dispatch, invoice).",
      "Document the runbook in `core/runbooks/dr.md` - keep Super Admin contact ladder current.",
      "Multi-region: out of scope until ARR > $1M; design doc only for now.",
    ],
  },
  {
    id: "global-edge",
    title: "Global Edge & CDN",
    category: "Scaling",
    status: "scaffold",
    icon: Globe2,
    summary:
      "Static assets and read-only API responses served from edge POPs close to users.",
    pointerNotes: [
      "Lovable hosting already CDNs static assets. Add `Cache-Control: public, s-maxage=300` on truly public endpoints.",
      "For African users, prioritize Lagos/Cape Town/Nairobi PoPs (Cloudflare auto-routes).",
      "Never cache anything keyed by a logged-in user without `Vary: Authorization`.",
    ],
  },
];

const statusStyles: Record<Status, string> = {
  scaffold: "bg-muted text-muted-foreground",
  "in-design": "bg-primary/15 text-primary",
  blocked: "bg-destructive/15 text-destructive",
};

const categories: Array<InfraModule["category"] | "All"> = [
  "All",
  "Reliability",
  "Scaling",
  "Security",
  "Observability",
  "Disaster Recovery",
];

export default function CoreInfrastructureFramework() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("All");

  const filtered = useMemo(() => {
    return MODULES.filter((m) => {
      const matchesCat = category === "All" || m.category === category;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.pointerNotes.some((n) => n.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [search, category]);

  const counts = useMemo(() => {
    return {
      total: MODULES.length,
      scaffold: MODULES.filter((m) => m.status === "scaffold").length,
      design: MODULES.filter((m) => m.status === "in-design").length,
      blocked: MODULES.filter((m) => m.status === "blocked").length,
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link to="/core/dashboard" className="hover:text-foreground transition-colors">
              Core
            </Link>
            <span>/</span>
            <span className="text-foreground">Infrastructure Framework</span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-heading font-bold text-foreground"
          >
            Infrastructure Framework
          </motion.h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Internal scaffolding for the Routeace Core team. Each module below is a
            placeholder with explicit <span className="text-foreground font-medium">Pointer Notes</span> for
            the platform/infra engineers to complete the implementation. Nothing on this
            page is exposed to customers.
          </p>
        </div>

        {/* Status grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Modules</p>
              <p className="text-2xl font-bold text-foreground">{counts.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Scaffolded</p>
              <p className="text-2xl font-bold text-muted-foreground">{counts.scaffold}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">In Design</p>
              <p className="text-2xl font-bold text-primary">{counts.design}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Blocked</p>
              <p className="text-2xl font-bold text-destructive">{counts.blocked}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search modules, summaries, pointer notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Tabs value={category} onValueChange={(v) => setCategory(v as any)}>
            <TabsList className="h-auto flex-wrap">
              {categories.map((c) => (
                <TabsTrigger key={c} value={c} className="text-xs">
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Module list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((m) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{m.title}</CardTitle>
                          <CardDescription className="mt-1 text-xs">
                            <Badge variant="outline" className="text-[10px] mr-2">
                              {m.category}
                            </Badge>
                            <Badge className={`text-[10px] ${statusStyles[m.status]}`}>
                              {m.status}
                            </Badge>
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground pt-2">{m.summary}</p>
                  </CardHeader>
                  <CardContent>
                    {m.stack && m.stack.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-foreground mb-1">
                          Suggested stack
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {m.stack.map((s) => (
                            <Badge key={s} variant="secondary" className="text-[10px]">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">
                        Pointer notes for engineering
                      </p>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        {m.pointerNotes.map((n, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary">→</span>
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No modules match your filter.</p>
          </div>
        )}

        <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Implementation note:</span>{" "}
            This page is the source of truth for what infrastructure work remains. As
            modules ship, flip their <code className="text-primary">status</code> to{" "}
            <code className="text-primary">in-design</code>, then remove them once the
            real dashboards/services are live and linked from{" "}
            <Link to="/core/dashboard" className="text-primary hover:underline">
              /core/dashboard
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
