import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Eye, TrendingUp, Compass, Shield, Zap, Clock } from "lucide-react";
import { motion } from "framer-motion";

export interface VisionBoardData {
  companyName: string;
  industry: string;
  mission: string;
  vision: string;
  financialGoal: string;
  ninetyDayGoal: string;
  twelveMonthTarget: string;
  whereWePlay: string[];
  howWeWin: string[];
  enablers: string[];
  whatWeWontDo: string[];
  fleetExpansionTarget: string;
  marketExpansionTarget: string;
  kpiTargets: { label: string; value: string }[];
}

interface StrategicVisionBoardProps {
  data: VisionBoardData;
}

const StrategicVisionBoard = ({ data }: StrategicVisionBoardProps) => {
  const sections = [
    {
      title: "MISSION",
      icon: Target,
      content: data.mission,
      color: "from-primary/20 to-primary/5",
      borderColor: "border-primary/30",
    },
    {
      title: "VISION",
      icon: Eye,
      content: data.vision,
      color: "from-blue-500/20 to-blue-500/5",
      borderColor: "border-blue-500/30",
    },
    {
      title: "FINANCIAL GOAL",
      icon: TrendingUp,
      content: data.financialGoal,
      color: "from-green-500/20 to-green-500/5",
      borderColor: "border-green-500/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">{data.companyName}</h2>
        <p className="text-muted-foreground">Strategic Vision Board</p>
        <Badge variant="outline" className="mt-2">{data.industry}</Badge>
      </div>

      {/* Mission / Vision / Financial Goal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={`h-full border ${section.borderColor} bg-gradient-to-br ${section.color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
                  <section.icon className="w-4 h-4" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{section.content}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 90-Day Goal & 12-Month Target */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
                <Clock className="w-4 h-4 text-amber-500" />
                90-DAY GOAL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{data.ninetyDayGoal}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-purple-500" />
                12-MONTH TARGET
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{data.twelveMonthTarget}</p>
              <div className="mt-2 flex gap-2 flex-wrap">
                <Badge variant="secondary">Fleet: {data.fleetExpansionTarget}</Badge>
                <Badge variant="secondary">Market: {data.marketExpansionTarget}</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Where We Play / How We Win */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              WHERE WE PLAY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {data.whereWePlay.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              HOW WE WIN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {data.howWeWin.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Enablers & What We Won't Do */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              ENABLERS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.enablers.map((item, i) => (
                <Badge key={i} variant="outline">{item}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-destructive">
              WHAT WE WILL NOT DO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {data.whatWeWontDo.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-destructive mt-0.5">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* KPI Scoreboard */}
      {data.kpiTargets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">
              KPI SCOREBOARD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.kpiTargets.map((kpi, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold">{kpi.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StrategicVisionBoard;
