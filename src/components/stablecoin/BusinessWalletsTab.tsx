import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { DataZeroState } from "@/components/shared/DataZeroState";

// Live data wiring pending: backed by future `business_wallets` table.
const BusinessWalletsTab = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Business Wallets</CardTitle>
        <Button size="sm" disabled>+ Add Wallet</Button>
      </div>
    </CardHeader>
    <CardContent>
      <DataZeroState
        icon={Wallet}
        title="No business wallets connected"
        description="Connect custodial wallets across Ethereum, Polygon, and Tron to manage stablecoin balances and auto-conversion settings."
      />
    </CardContent>
  </Card>
);

export default BusinessWalletsTab;
