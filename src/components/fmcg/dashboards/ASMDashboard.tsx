import FMCGZeroState from "../FMCGZeroState";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";

const ASMDashboard = () => {
  return (
    <>
      <FMCGZeroState role="area_sales_manager" />
      <FMCGAIInsightPanel role="asm" />
    </>
  );
};

export default ASMDashboard;
