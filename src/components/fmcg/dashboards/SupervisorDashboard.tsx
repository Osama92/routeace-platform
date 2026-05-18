import FMCGZeroState from "../FMCGZeroState";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";

const SupervisorDashboard = () => {
  return (
    <>
      <FMCGZeroState role="sales_supervisor" />
      <FMCGAIInsightPanel role="supervisor" />
    </>
  );
};

export default SupervisorDashboard;
