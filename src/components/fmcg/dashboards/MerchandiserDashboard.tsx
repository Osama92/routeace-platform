import FMCGZeroState from "../FMCGZeroState";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";

const MerchandiserDashboard = () => {
  return (
    <>
      <FMCGZeroState role="merchandiser" />
      <FMCGAIInsightPanel role="merchandiser" />
    </>
  );
};

export default MerchandiserDashboard;
