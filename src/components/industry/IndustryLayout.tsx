import { ReactNode } from "react";
import IndustrySidebar from "./IndustrySidebar";

interface IndustryLayoutProps {
  children: ReactNode;
  industryCode: string;
}

const IndustryLayout = ({ children, industryCode }: IndustryLayoutProps) => {
  return (
    <div className="min-h-screen flex">
      <IndustrySidebar industryCode={industryCode} />
      <main className="flex-1 ml-[280px] p-8 bg-background">
        {children}
      </main>
    </div>
  );
};

export default IndustryLayout;
