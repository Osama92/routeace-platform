import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  MessageSquare, Send, Phone, Mail, Calendar, Plus,
  ArrowRight, User, Building2, Clock, Zap,
} from "lucide-react";
import { format } from "date-fns";
import { generateEngagementMessage, classifyIntent } from "@/hooks/useGTMBrain";

interface Props {
  conversations: any[];
  meetings: any[];
  opportunities: any[];
  entities: any[];
  supplyNodes: any[];
  onStartConversation: (entityId: string, supplyNodeId: string, opportunityId?: string, channel?: string) => Promise<void>;
  onScheduleMeeting: (data: { entity_id?: string; supply_node_id?: string; opportunity_id?: string; scheduled_time: string; notes?: string }) => Promise<void>;
  canAfford: (action: string) => boolean;
  spendCredits: (action: string) => Promise<boolean>;
  osLabel: string;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <Phone className="h-3 w-3 text-green-400" />,
  email: <Mail className="h-3 w-3 text-blue-400" />,
  sms: <MessageSquare className="h-3 w-3 text-amber-400" />,
  call: <Phone className="h-3 w-3 text-purple-400" />,
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  paused: "bg-amber-500/20 text-amber-400",
  closed: "bg-muted text-muted-foreground",
  converted: "bg-blue-500/20 text-blue-400",
};

export default function GTMConversationsTab({
  conversations, meetings, opportunities, entities, supplyNodes,
  onStartConversation, onScheduleMeeting, canAfford, spendCredits, osLabel,
}: Props) {
  const [showConvDialog, setShowConvDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [convForm, setConvForm] = useState({ entityId: "", supplyNodeId: "", opportunityId: "", channel: "whatsapp" });
  const [meetingForm, setMeetingForm] = useState({ entityId: "", supplyNodeId: "", opportunityId: "", scheduledTime: "", notes: "" });

  const handleStartConv = async () => {
    if (!convForm.entityId && !convForm.supplyNodeId) return;
    const ok = await spendCredits("start_conversation");
    if (!ok) return;
    await onStartConversation(convForm.entityId, convForm.supplyNodeId, convForm.opportunityId || undefined, convForm.channel);
    setConvForm({ entityId: "", supplyNodeId: "", opportunityId: "", channel: "whatsapp" });
    setShowConvDialog(false);
  };

  const handleScheduleMeeting = async () => {
    if (!meetingForm.scheduledTime) return;
    const ok = await spendCredits("schedule_meeting");
    if (!ok) return;
    await onScheduleMeeting({
      entity_id: meetingForm.entityId || undefined,
      supply_node_id: meetingForm.supplyNodeId || undefined,
      opportunity_id: meetingForm.opportunityId || undefined,
      scheduled_time: meetingForm.scheduledTime,
      notes: meetingForm.notes || undefined,
    });
    setMeetingForm({ entityId: "", supplyNodeId: "", opportunityId: "", scheduledTime: "", notes: "" });
    setShowMeetingDialog(false);
  };

  const activeConvs = conversations.filter(c => c.status === "active");
  const closedConvs = conversations.filter(c => c.status !== "active");

  // Suggested engagements from uncontacted high-intent opportunities
  const suggestedEngagements = opportunities
    .filter(o => o.stage === "new" && o.priority && ["critical", "high"].includes(o.priority))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" /> Conversations & Meetings
        </h3>
        <div className="flex gap-2">
          <Dialog open={showConvDialog} onOpenChange={setShowConvDialog}>
            <DialogTrigger asChild>
              <Button size="sm"><MessageSquare className="h-4 w-4 mr-1" /> Start Conversation <span className="ml-1 text-xs opacity-60">(3cr)</span></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Start {osLabel} Conversation</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={convForm.channel} onValueChange={v => setConvForm({ ...convForm, channel: v })}>
                  <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="call">Phone Call</SelectItem>
                  </SelectContent>
                </Select>
                {entities.length > 0 && (
                  <Select value={convForm.entityId} onValueChange={v => setConvForm({ ...convForm, entityId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Entity (Lead)" /></SelectTrigger>
                    <SelectContent>
                      {entities.slice(0, 20).map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name} - {e.location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {supplyNodes.length > 0 && (
                  <Select value={convForm.supplyNodeId} onValueChange={v => setConvForm({ ...convForm, supplyNodeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Supply Node" /></SelectTrigger>
                    <SelectContent>
                      {supplyNodes.slice(0, 20).map(n => (
                        <SelectItem key={n.id} value={n.id}>{n.business_name} - {n.city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {opportunities.length > 0 && (
                  <Select value={convForm.opportunityId} onValueChange={v => setConvForm({ ...convForm, opportunityId: v })}>
                    <SelectTrigger><SelectValue placeholder="Link to Opportunity (optional)" /></SelectTrigger>
                    <SelectContent>
                      {opportunities.slice(0, 20).map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.title?.substring(0, 60)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={handleStartConv} className="w-full" disabled={!canAfford("start_conversation")}>
                  {canAfford("start_conversation") ? "Start Conversation" : "Insufficient Credits (3 required)"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Calendar className="h-4 w-4 mr-1" /> Schedule Meeting <span className="ml-1 text-xs opacity-60">(2cr)</span></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule Meeting</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input type="datetime-local" value={meetingForm.scheduledTime} onChange={e => setMeetingForm({ ...meetingForm, scheduledTime: e.target.value })} />
                {opportunities.length > 0 && (
                  <Select value={meetingForm.opportunityId} onValueChange={v => setMeetingForm({ ...meetingForm, opportunityId: v })}>
                    <SelectTrigger><SelectValue placeholder="Link to Opportunity" /></SelectTrigger>
                    <SelectContent>
                      {opportunities.slice(0, 20).map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.title?.substring(0, 60)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Textarea placeholder="Meeting notes / agenda" value={meetingForm.notes} onChange={e => setMeetingForm({ ...meetingForm, notes: e.target.value })} rows={3} />
                <Button onClick={handleScheduleMeeting} className="w-full" disabled={!canAfford("schedule_meeting")}>
                  {canAfford("schedule_meeting") ? "Schedule Meeting" : "Insufficient Credits (2 required)"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Suggested Engagements */}
      {suggestedEngagements.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-400" /> Suggested Engagements - High-Intent Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suggestedEngagements.map(opp => {
                const msg = generateEngagementMessage(opp, "active_buy");
                return (
                  <div key={opp.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{opp.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={opp.priority === "critical" ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}>
                            {opp.priority}
                          </Badge>
                          {opp.geo_location && <span className="text-xs text-muted-foreground">📍 {opp.geo_location}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 italic">"{msg.substring(0, 120)}…"</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs shrink-0">
                        <Send className="h-3 w-3 mr-1" /> Engage
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Conversations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Active Conversations ({activeConvs.length})</h4>
          {activeConvs.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">
              No active conversations. Engage high-intent leads to start.
            </CardContent></Card>
          ) : (
            activeConvs.map(conv => (
              <Card key={conv.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {CHANNEL_ICONS[conv.channel] || <MessageSquare className="h-3 w-3" />}
                      <div>
                        <p className="text-sm font-medium">
                          {conv.gtm_entities?.name || conv.gtm_supply_nodes?.business_name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conv.channel} · {conv.last_message_at ? format(new Date(conv.last_message_at), "MMM d HH:mm") : "-"}
                        </p>
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[conv.status]}>{conv.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Meetings */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Scheduled Meetings ({meetings.length})</h4>
          {meetings.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">
              No meetings scheduled yet.
            </CardContent></Card>
          ) : (
            meetings.map(meeting => (
              <Card key={meeting.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {meeting.gtm_entities?.name || meeting.gtm_supply_nodes?.business_name || "Meeting"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {meeting.scheduled_time ? format(new Date(meeting.scheduled_time), "MMM d, yyyy HH:mm") : "-"}
                      </p>
                      {meeting.notes && <p className="text-xs text-muted-foreground mt-1">{meeting.notes}</p>}
                    </div>
                    <Badge className={meeting.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}>
                      {meeting.status || "scheduled"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

