import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Settings2, Shield, Lock, CreditCard, Target, Zap,
  MessageSquare, Bell, Radio, Search, Globe, BarChart3,
} from "lucide-react";
import { format } from "date-fns";

interface Props {
  creditBalance: number;
  totalConsumed: number;
  totalPurchased: number;
  transactions: any[];
  osLabel: string;
}

const GTM_CREDIT_COSTS = {
  view_signal: 0,
  capture_signal: 1,
  view_match: 2,
  unlock_contact: 5,
  start_conversation: 3,
  schedule_meeting: 2,
  export_lead: 10,
};

export default function GTMAutomationTab({
  creditBalance, totalConsumed, totalPurchased, transactions, osLabel,
}: Props) {
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoEngage, setAutoEngage] = useState(false);
  const [autoMatch, setAutoMatch] = useState(true);
  const [intentThreshold, setIntentThreshold] = useState([70]);
  const [engagementChannel, setEngagementChannel] = useState("whatsapp");
  const [engagementTone, setEngagementTone] = useState("professional");
  const [notifyHighIntent, setNotifyHighIntent] = useState(true);
  const [notifyNewMatch, setNotifyNewMatch] = useState(true);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Settings2 className="h-5 w-5" /> Automation & Credit Controls
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Credit Balance */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Credit Balance</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono">{creditBalance}</div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>Purchased: {totalPurchased}</span>
              <span>Used: {totalConsumed}</span>
            </div>
            <div className="mt-3 w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, totalPurchased > 0 ? ((creditBalance / totalPurchased) * 100) : 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {totalPurchased > 0 ? `${((creditBalance / totalPurchased) * 100).toFixed(0)}% remaining` : "No credits purchased yet"}
            </p>
          </CardContent>
        </Card>

        {/* Credit Costs */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Action Costs</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {Object.entries(GTM_CREDIT_COSTS).map(([action, cost]) => (
              <div key={action} className="flex justify-between text-xs items-center">
                <span className="capitalize">{action.replace(/_/g, " ")}</span>
                <Badge variant="outline" className="font-mono text-[10px]">{cost} cr</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Anti-Leakage */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Anti-Leakage Protection</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><Lock className="h-3 w-3 text-green-400" /> Contact info masked by default</div>
            <div className="flex items-center gap-2"><Shield className="h-3 w-3 text-green-400" /> Platform-only messaging enforced</div>
            <div className="flex items-center gap-2"><CreditCard className="h-3 w-3 text-green-400" /> Credit-gated engagement</div>
            <div className="flex items-center gap-2"><Target className="h-3 w-3 text-green-400" /> Deal tracking required</div>
            <div className="flex items-center gap-2"><BarChart3 className="h-3 w-3 text-green-400" /> Attribution tracking active</div>
            <div className="flex items-center gap-2"><Globe className="h-3 w-3 text-green-400" /> Dynamic pricing for premium leads</div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" /> Automation Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto Capture */}
            <div className="p-3 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium">Auto-Capture Signals</span>
                </div>
                <Switch checked={autoCapture} onCheckedChange={setAutoCapture} />
              </div>
              <p className="text-xs text-muted-foreground">Automatically ingest signals from connected platforms (Google, Meta, X)</p>
            </div>

            {/* Auto Match */}
            <div className="p-3 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium">Auto-Match Engine</span>
                </div>
                <Switch checked={autoMatch} onCheckedChange={setAutoMatch} />
              </div>
              <p className="text-xs text-muted-foreground">Automatically match high-intent signals to supply nodes</p>
            </div>

            {/* Auto Engage */}
            <div className="p-3 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium">Auto-Engage Leads</span>
                </div>
                <Switch checked={autoEngage} onCheckedChange={setAutoEngage} />
              </div>
              <p className="text-xs text-muted-foreground">Send automated context-aware messages to high-intent leads</p>
            </div>

            {/* Notifications */}
            <div className="p-3 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium">Notifications</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>High-intent signal alerts</span>
                  <Switch checked={notifyHighIntent} onCheckedChange={setNotifyHighIntent} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>New match notifications</span>
                  <Switch checked={notifyNewMatch} onCheckedChange={setNotifyNewMatch} />
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Intent Threshold (%)</label>
              <Slider value={intentThreshold} onValueChange={setIntentThreshold} min={30} max={95} step={5} />
              <p className="text-xs text-muted-foreground text-center">{intentThreshold[0]}% minimum confidence</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Engagement Channel</label>
              <Select value={engagementChannel} onValueChange={setEngagementChannel}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="multi">Multi-Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Engagement Tone</label>
              <Select value={engagementTone} onValueChange={setEngagementTone}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="urgent">Urgent / Direct</SelectItem>
                  <SelectItem value="consultative">Consultative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Credit Transactions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Credit Activity</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No credit activity yet</p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {transactions.slice(0, 30).map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{tx.action_type?.replace(/_/g, " ")}</Badge>
                    <span className="text-muted-foreground">{tx.action_label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {tx.credits_consumed > 0 && <span className="text-red-400 font-mono">-{tx.credits_consumed}</span>}
                    {tx.credits_purchased > 0 && <span className="text-green-400 font-mono">+{tx.credits_purchased}</span>}
                    <span className="text-muted-foreground text-[10px]">{format(new Date(tx.created_at), "MMM d HH:mm")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
