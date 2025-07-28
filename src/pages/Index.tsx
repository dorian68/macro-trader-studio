import { useState } from "react";
import { Layout } from "@/components/Layout";
import { DemoWelcome } from "@/components/DemoWelcome";
import { MacroCommentary } from "@/components/MacroCommentary";
import { TechnicalAnalysis } from "@/components/TechnicalAnalysis";
import { TradeIdeas } from "@/components/TradeIdeas";
import { Reports } from "@/components/Reports";

const Index = () => {
  const [activeModule, setActiveModule] = useState("welcome");

  const renderActiveModule = () => {
    switch (activeModule) {
      case "welcome":
        return <DemoWelcome onModuleSelect={setActiveModule} />;
      case "commentary":
        return <MacroCommentary />;
      case "technical":
        return <TechnicalAnalysis />;
      case "trade-ideas":
        return <TradeIdeas />;
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
