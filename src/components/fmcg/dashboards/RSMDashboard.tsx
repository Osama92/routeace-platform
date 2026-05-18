import FMCGZeroState from "../FMCGZeroState";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";

const RSMDashboard = () => {
  // RSM dashboard requires FMCG-specific tables (fmcg_territories, fmcg_reps, etc.)
  // Show zero-state until real FMCG data infrastructure is connected
  return (
    <>
      <FMCGZeroState role="regional_sales_manager" />
      <FMCGAIInsightPanel role="rsm" />
    </>
  );
};

export default RSMDashboard;
