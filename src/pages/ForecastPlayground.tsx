import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { SuperUserGuard } from "@/components/SuperUserGuard";
import { LabsComingSoon } from "@/components/labs/LabsComingSoon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, ArrowRight, Brain } from "lucide-react";

export default function ForecastPlaygroundHub() {
  const navigate = useNavigate();

  return (
    <SuperUserGuard fallback={<LabsComingSoon title="Forecast Playground" description="This feature is currently in private beta." />}>
      <Layout>
        <main className="space-y-6">
          <header className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl border bg-card flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Forecast Playground</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Hub interne — lance l’outil de forecasting et ses visualisations.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">Internal</Badge>
              <Badge variant="outline" className="text-xs">SuperUser</Badge>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5 text-primary" />
                  Forecast Playground
                </CardTitle>
                <CardDescription>
                  Accès à l’outil complet (forecast-proxy + surface-proxy) tel qu’il existait avant.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button onClick={() => navigate("/forecast-playground/tool")} className="w-full">
                  Ouvrir l’outil
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open("/forecast-playground/tool", "_blank")}
                  className="w-full"
                >
                  Ouvrir dans un nouvel onglet
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Macro Lab
                </CardTitle>
                <CardDescription>
                  Copie Macro Analysis pour tests (webhook dédié).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button onClick={() => navigate("/forecast-playground/macro-commentary")} className="w-full">
                  Ouvrir l’outil
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open("/forecast-playground/macro-commentary", "_blank")}
                  className="w-full"
                >
                  Ouvrir dans un nouvel onglet
                </Button>
              </CardContent>
            </Card>
          </section>
        </main>
      </Layout>
    </SuperUserGuard>
  );
}
