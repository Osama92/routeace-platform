import { ReactNode } from "react";
import PortoDashSidebar from "./PortoDashSidebar";
import Header from "@/components/layout/Header";

export interface PortoDashLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const PortoDashLayout = ({ children, title, subtitle }: PortoDashLayoutProps) => (
  <div className="min-h-screen bg-background">
    <PortoDashSidebar />
    <main className="ml-[280px] transition-all duration-300">
      <Header title={title} subtitle={subtitle} />
      <div className="p-8 pt-4">{children}</div>
    </main>
  </div>
);

export default PortoDashLayout;
