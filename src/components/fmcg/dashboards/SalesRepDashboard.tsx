import FMCGZeroState from "../FMCGZeroState";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";

const SalesRepDashboard = () => {
  return (
    <>
      <FMCGZeroState role="sales_representative" />
      <FMCGAIInsightPanel role="sales_rep" />
    </>
  );
};

export default SalesRepDashboard;
