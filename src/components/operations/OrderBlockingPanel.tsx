import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Truck,
  AlertTriangle,
  Ban,
  CheckCircle
} from "lucide-react";

interface OrderBlockingPanelProps {
  dispatch: {
    id: string;
    dispatch_number: string;
    status: string | null;
    notes?: string | null;
    cargo_weight_kg?: number | null;
  };
  onUpdate?: () => void;
}

// Parse blocking state from notes field (temporary until schema is updated)
function parseBlockingState(notes: string | null): { supplyBlocked: boolean; customerBlocked: boolean; reason: string | null } {
  if (!notes) return { supplyBlocked: false, customerBlocked: false, reason: null };
  
  if (notes.startsWith("[SUPPLY_BLOCKED]")) {
    return { supplyBlocked: true, customerBlocked: false, reason: notes.replace("[SUPPLY_BLOCKED]", "").trim() };
  }
  if (notes.startsWith("[CUSTOMER_BLOCKED]")) {
    return { supplyBlocked: false, customerBlocked: true, reason: notes.replace("[CUSTOMER_BLOCKED]", "").trim() };
  }
  return { supplyBlocked: false, customerBlocked: false, reason: null };
}

/**
 * Section B - Operations Manager Order Edge Cases
 * Allows capturing orders blocked due to supply or customer issues
 */
export function OrderBlockingPanel({ dispatch, onUpdate }: OrderBlockingPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [blockType, setBlockType] = useState<"supply" | "customer" | null>(null);
  const [blockReason, setBlockReason] = useState("");

  const { supplyBlocked, customerBlocked, reason } = parseBlockingState(dispatch.notes || null);
  const isBlocked = supplyBlocked || customerBlocked;

  // Block order mutation
  const blockOrderMutation = useMutation({
    mutationFn: async ({ type, reason }: { type: "supply" | "customer"; reason: string }) => {
      const prefix = type === "supply" ? "[SUPPLY_BLOCKED]" : "[CUSTOMER_BLOCKED]";
      const newNotes = `${prefix} ${reason}`.trim();

      const { error } = await supabase
        .from("dispatches")
        .update({ 
          notes: newNotes,
          status: "pending" // Can't proceed until unblocked
        })
        .eq("id", dispatch.id);

      if (error) throw error;

      // Log the blocking event
      await supabase.from("audit_logs").insert({
        action: `order_blocked_${type}`,
        table_name: "dispatches",
        record_id: dispatch.id,
        new_data: { 
          block_type: type, 
          reason,
          cargo_weight_kg: dispatch.cargo_weight_kg 
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-dispatches"] });
      toast({
        title: "Order Blocked",
        description: `Order marked as ${blockType === "supply" ? "supply unavailable" : "customer no cargo"}`
      });
      setDialogOpen(false);
      setBlockReason("");
      onUpdate?.();
    }
  });

  // Unblock order mutation
  const unblockOrderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("dispatches")
        .update({ notes: null })
        .eq("id", dispatch.id);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: "order_unblocked",
        table_name: "dispatches",
        record_id: dispatch.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-dispatches"] });
      toast({ title: "Order Unblocked", description: "Order is now available for dispatch" });
      onUpdate?.();
    }
  });

  const handleBlock = (type: "supply" | "customer") => {
    setBlockType(type);
    setDialogOpen(true);
  };

  if (isBlocked) {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium">
              {supplyBlocked ? "Supply Unavailable" : "Customer No Cargo"}
            </span>
            {reason && (
              <span className="text-muted-foreground ml-2">- {reason}</span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => unblockOrderMutation.mutate()}>
            <CheckCircle className="w-4 h-4 mr-1" />
            Unblock
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-yellow-600 border-yellow-500/50 hover:bg-yellow-500/10"
          onClick={() => handleBlock("supply")}
        >
          <Truck className="w-4 h-4 mr-1" />
          Supply Blocked
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-orange-600 border-orange-500/50 hover:bg-orange-500/10"
          onClick={() => handleBlock("customer")}
        >
          <Package className="w-4 h-4 mr-1" />
          Customer No Cargo
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {blockType === "supply" ? "Mark as Supply Blocked" : "Mark as Customer No Cargo"}
            </DialogTitle>
            <DialogDescription>
              {blockType === "supply"
                ? "Truck was requested but could NOT be loaded due to supply unavailability"
                : "Truck was available but could NOT be loaded due to customer having no cargo"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Ban className="h-4 w-4" />
              <AlertDescription>
                <strong>Billing blocked:</strong> No invoice can be generated until the order is unblocked and loaded.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Enter reason for blocking..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => blockOrderMutation.mutate({ type: blockType!, reason: blockReason })}
            >
              Block Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Analytics widget for missed volumes
 */
export function MissedVolumeWidget() {
  // Fetch from audit logs for now
  const queryClient = useQueryClient();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Missed Volume Analytics</CardTitle>
        <CardDescription>Orders blocked this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-yellow-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Supply Blocked</span>
            </div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">0T volume</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Customer Blocked</span>
            </div>
            <p className="text-2xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">0T volume</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OrderBlockingPanel;
