import { CheckCircle, X } from "lucide-react";

const rows = [
  { feature: "Sales + Orders in one system", ra: true, sf: false },
  { feature: "WhatsApp integration (native)", ra: true, sf: "limited" },
  { feature: "Offline capability", ra: true, sf: false },
  { feature: "AI included (not add-on)", ra: true, sf: false },
  { feature: "Pricing in local currency (₦)", ra: true, sf: false },
  { feature: "Distribution & channel sales", ra: true, sf: "add-on" },
  { feature: "Logistics handoff built-in", ra: true, sf: false },
  { feature: "Field rep mobile-first UX", ra: true, sf: "limited" },
];

const Cell = ({ value }: { value: boolean | string }) => {
  if (value === true) return <CheckCircle className="w-4 h-4 text-primary mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/50 mx-auto" />;
  return <span className="text-xs text-muted-foreground font-medium">{value}</span>;
};

const IndustryPricingComparison = () => (
  <section className="py-20 px-6 bg-muted/30 border-t border-border">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-3">RouteAce vs Traditional CRM</h2>
      <p className="text-center text-muted-foreground mb-10">
        Generic CRM gives contact management. RouteAce gives revenue execution with fulfillment awareness.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 font-medium">Feature</th>
              <th className="text-center py-3 font-semibold text-primary w-28">RouteAce</th>
              <th className="text-center py-3 font-medium text-muted-foreground w-28">Salesforce</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-b border-border/50">
                <td className="py-3">{row.feature}</td>
                <td className="py-3 text-center"><Cell value={row.ra} /></td>
                <td className="py-3 text-center"><Cell value={row.sf} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

export default IndustryPricingComparison;
