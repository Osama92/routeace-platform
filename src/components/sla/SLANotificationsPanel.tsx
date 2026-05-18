import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";

const SLANotificationsPanel = () => {
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["sla-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_risk_notifications")
        .select(`
          *,
          dispatches(dispatch_number),
          customers(company_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Send notification mutation
  const sendNotification = useMutation({
    mutationFn: async ({ notificationId, type }: { notificationId: string; type: string }) => {
      // In production, this would call an edge function to send the notification
      const { error } = await supabase
        .from("sla_risk_notifications")
        .update({
          notification_status: "sent",
          notification_sent_at: new Date().toISOString(),
        })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-notifications"] });
      toast.success("Notification sent successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send notification");
    },
  });

  const getRiskLevelBadge = (level: string, score: number) => {
    const config = {
      critical: { variant: "destructive" as const, color: "bg-red-500" },
      high: { variant: "destructive" as const, color: "bg-orange-500" },
      medium: { variant: "secondary" as const, color: "bg-amber-500" },
      low: { variant: "outline" as const, color: "bg-green-500" },
    };
    const { variant, color } = config[level as keyof typeof config] || config.medium;
    return (
      <Badge variant={variant} className="gap-1">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        {level} ({score}%)
      </Badge>
    );
  };

  const getNotificationStatusBadge = (status: string) => {
    const icons = {
      pending: Clock,
      sent: CheckCircle,
      delivered: CheckCircle,
      failed: XCircle,
      acknowledged: CheckCircle,
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return (
      <Badge variant={status === "sent" || status === "delivered" ? "default" : "secondary"} className="gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="w-4 h-4" />;
      case "sms": return <MessageSquare className="w-4 h-4" />;
      case "whatsapp": return <MessageSquare className="w-4 h-4 text-green-500" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  // Analytics
  const totalNotifications = notifications.length;
  const sentNotifications = notifications.filter((n: any) => n.notification_status === "sent").length;
  const breachesPrevented = notifications.filter((n: any) => n.breach_prevented).length;
  const acknowledgedRate = notifications.length > 0 
    ? ((notifications.filter((n: any) => n.acknowledged_at).length / notifications.length) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notifications</p>
                <p className="text-2xl font-bold">{totalNotifications}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">{sentNotifications}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Send className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Breaches Prevented</p>
                <p className="text-2xl font-bold">{breachesPrevented}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acknowledgement Rate</p>
                <p className="text-2xl font-bold">{acknowledgedRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            SLA Risk Notifications
          </CardTitle>
          <CardDescription>
            Client notifications sent when deliveries are at risk of SLA breach
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispatch</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Recommendation</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((notification: any) => (
                <TableRow key={notification.id}>
                  <TableCell className="font-mono text-sm">
                    {notification.dispatches?.dispatch_number || "-"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{notification.customers?.company_name}</p>
                      <p className="text-xs text-muted-foreground">{notification.customers?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRiskLevelBadge(notification.risk_level, notification.risk_score)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getNotificationIcon(notification.notification_type)}
                      <span className="capitalize">{notification.notification_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getNotificationStatusBadge(notification.notification_status)}
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm text-muted-foreground truncate">
                      {notification.ai_recommendation || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    {notification.notification_sent_at 
                      ? new Date(notification.notification_sent_at).toLocaleString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {notification.notification_status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendNotification.mutate({
                          notificationId: notification.id,
                          type: notification.notification_type,
                        })}
                        disabled={sendNotification.isPending}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send
                      </Button>
                    )}
                    {notification.breach_prevented && (
                      <Badge variant="outline" className="text-green-500 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Prevented
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {notifications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No SLA risk notifications sent yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sample Notification Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preview</CardTitle>
          <CardDescription>
            Example of the notification clients receive when routes are at risk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="font-semibold">Delivery Update - Route RA-204</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your delivery on Route RA-204 is currently experiencing moderate risk of delay 
              due to traffic congestion in the Lagos-Ibadan corridor. Our operations team is 
              actively working to optimize the route and minimize any potential impact to your SLA.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Expected delay: 2-4 hours</span>
              <span>|</span>
              <span>New ETA: Feb 10, 2026 4:00 PM</span>
            </div>
            <p className="text-xs text-muted-foreground italic">
              This is a proactive notification. No action is required from you at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SLANotificationsPanel;
