import { useState } from "react";
import { Layout } from "@/components/Layout";
import { DemoWelcome } from "@/components/DemoWelcome";
import { MacroCommentary } from "@/components/MacroCommentary";
import { TradingDashboard } from "@/components/TradingDashboard";
import { Reports } from "@/components/Reports";

const Index = () => {
  const [activeModule, setActiveModule] = useState("welcome");

  const renderActiveModule = () => {
    switch (activeModule) {
      case "welcome":
        return <DemoWelcome onModuleSelect={setActiveModule} />;
      case "commentary":
        return <MacroCommentary />;
      case "trading":
        return <TradingDashboard />;
      case "reports":
        return <Reports />;
      default:
        return <DemoWelcome onModuleSelect={setActiveModule} />;
    }
  };

  return (
    <Layout activeModule={activeModule} onModuleChange={setActiveModule}>
      {renderActiveModule()}
    </Layout>
  );
};

export default Index;
