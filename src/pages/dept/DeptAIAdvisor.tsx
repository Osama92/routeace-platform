import ZazaChatPage from "@/components/zaza/ZazaChatPage";
import { getLDNavCatalogForRole } from "@/lib/zaza/ldNavigationCatalog";

export default function DeptAIAdvisor() {
  return (
    <ZazaChatPage
      scope="LD"
      title="Zaza - Logistics Intelligence"
      subtitle="AI-powered decisions for your logistics department"
      cardTitle="Ask anything about your logistics operation"
      greeting="Hi - I'm Zaza, your Logistics Intelligence Advisor. Ask me about route consolidation, cost-per-drop, SLA risk, vendor benchmarking, budget variance, or where to find any feature in your workspace."
      placeholder="e.g. Which corridors are blowing my cost-per-drop this week?"
      catalogForRole={getLDNavCatalogForRole}
    />
  );
}
