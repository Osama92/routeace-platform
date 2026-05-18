import ZazaChatPage from "@/components/zaza/ZazaChatPage";
import { getLCNavCatalogForRole } from "@/lib/zaza/lcNavigationCatalog";

export default function LCAIAdvisor() {
  return (
    <ZazaChatPage
      scope="LC"
      title="Zaza - Logistics Company Advisor"
      subtitle="AI-powered decisions for your 3PL operation"
      cardTitle="Ask anything about your company operations"
      greeting="Hi - I'm Zaza, your Logistics Company Advisor. Ask me about fleet utilisation, customer revenue, vendor cost, cashflow, SLA risk, or where to find any feature in your workspace."
      placeholder="e.g. Take me to the cashflow forecast, or how is my fleet utilisation this week?"
      catalogForRole={getLCNavCatalogForRole}
    />
  );
}
