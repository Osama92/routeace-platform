import FMCGZeroState from "../FMCGZeroState";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";

const WarehouseDashboard = () => {
  return (
    <>
      <FMCGZeroState role="warehouse_manager" />
      <FMCGAIInsightPanel role="warehouse" />
    </>
  );
};

export default WarehouseDashboard;
