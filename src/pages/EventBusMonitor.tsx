import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEventBusMetrics, useRealtimeEvents } from "@/hooks/useEventBus";
import { Activity, ArrowRight, Shield, Zap, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

const statusIcon = (status: string) => {
  switch (status) {
    case "delivered": return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
    case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const osBadgeColor = (os: string) => {
  switch (os) {
    case "logistics": return "bg-blue-100 text-blue-800";
    case "industry": return "bg-green-100 text-green-800";
    case "portodash": return "bg-purple-100 text-purple-800";
    case "platform": return "bg-orange-100 text-orange-800";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function EventBusMonitor() {
  const { events, contracts, subscriptions, metrics, isLoading } = useEventBusMetrics();
  const liveEvents = useRealtimeEvents();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Event Bus & API Contracts</h1>
        <p className="text-muted-foreground">Cross-OS communication infrastructure with field-level isolation</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalEvents}</p>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{metrics.pendingEvents}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{metrics.deliveredEvents}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{metrics.failedEvents}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Event Stream</TabsTrigger>
          <TabsTrigger value="contracts">API Contracts</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="live">Live Feed</TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Platform Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No events yet</p>
                  <p className="text-sm">Events will appear here as OS systems communicate</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Flow</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.slice(0, 20).map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-sm">{e.event_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={osBadgeColor(e.source_os)}>{e.source_os}</Badge>
                            <ArrowRight className="h-3 w-3" />
                            <Badge variant="outline" className={osBadgeColor(e.target_os)}>{e.target_os}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{e.resource_type}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {statusIcon(e.status)}
                            <span className="text-sm capitalize">{e.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(e.created_at), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Contracts Tab */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                API Contracts Registry
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No contracts defined</p>
                  <p className="text-sm">API contracts enforce field-level isolation between OS</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contracts.map((c: any) => (
                    <Card key={c.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{c.contract_name}</h3>
                          <Badge variant={c.is_active ? "default" : "secondary"}>
                            {c.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className={osBadgeColor(c.source_os)}>{c.source_os}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="outline" className={osBadgeColor(c.target_os)}>{c.target_os}</Badge>
                          <span className="text-xs text-muted-foreground ml-2">
                            {c.method} {c.endpoint_path}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Allowed Fields</p>
                            <div className="flex flex-wrap gap-1">
                              {(c.allowed_fields || []).map((f: string) => (
                                <Badge key={f} variant="outline" className="text-xs bg-green-50 text-green-700">{f}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Restricted Fields</p>
                            <div className="flex flex-wrap gap-1">
                              {(c.restricted_fields || []).map((f: string) => (
                                <Badge key={f} variant="outline" className="text-xs bg-red-50 text-red-700">{f}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Event Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No active subscriptions</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subscriber OS</TableHead>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Badge variant="outline" className={osBadgeColor(s.subscriber_os)}>{s.subscriber_os}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{s.event_type}</TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? "default" : "secondary"}>
                            {s.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Feed Tab */}
        <TabsContent value="live">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 animate-pulse text-green-500" />
                Live Event Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {liveEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Listening for events…</p>
                  <p className="text-sm">Real-time events will appear here as they're published</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {liveEvents.map((e: any, i) => (
                    <div key={e.id || i} className="flex items-center gap-3 p-2 rounded border">
                      {statusIcon(e.status)}
                      <span className="font-mono text-sm">{e.event_type}</span>
                      <Badge variant="outline" className={osBadgeColor(e.source_os)}>{e.source_os}</Badge>
                      <ArrowRight className="h-3 w-3" />
                      <Badge variant="outline" className={osBadgeColor(e.target_os)}>{e.target_os}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
