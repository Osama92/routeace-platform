import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Fuel, Users, Wrench, Radar } from "lucide-react";
import tiredDriverImg from "@/assets/landing/img-4-tired-driver.png";
import volatileRoadImg from "@/assets/landing/img-volatile-road.png";
import marginLeakageImg from "@/assets/landing/img-margin-leakage.png";
import fleetDowntimeImg from "@/assets/landing/img-fleet-downtime.png";
import deliveryVisibilityImg from "@/assets/landing/img-delivery-visibility.png";
import fuel1Img from "@/assets/landing/img-fuel-1.png";
import fuel2Img from "@/assets/landing/img-fuel-2.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.1 * i, duration: 0.5 } }),
};

type RealityCard = {
  icon: any;
  title: string;
  stat: string;
  statLabel: string;
  desc: string;
  color: string;
  bg: string;
  img?: string | null;
  imgs?: string[];
};

const realityCards: RealityCard[] = [
  { icon: AlertTriangle, title: "Traffic Volatility", stat: "25%", statLabel: "efficiency lost daily", desc: "Delivery routes collapse daily. Lagos alone loses 25% delivery efficiency to unpredictable congestion.", color: "text-infra-orange", bg: "bg-infra-orange/10", img: volatileRoadImg },
  { icon: Wrench, title: "Fleet Downtime Leakage", stat: "18%+", statLabel: "operational uptime lost monthly", desc: "Reactive maintenance, breakdowns, and delayed repairs silently reduce fleet productivity and increase delivery failures.", color: "text-info", bg: "bg-info/10", img: fleetDowntimeImg },
  { icon: TrendingDown, title: "Margin Leakage", stat: "10–15%", statLabel: "profit eroded", desc: "Poor route planning and blind promotions erode margins. Reactive route-to-market kills profitability.", color: "text-destructive", bg: "bg-destructive/10", img: marginLeakageImg },
  { icon: Fuel, title: "Fuel & Cost Leakage", stat: "15%+", statLabel: "avoidable logistics cost increase", desc: "Fuel abuse, inefficient routing, idle time, and fragmented operations quietly reduce transport profitability daily.", color: "text-warning", bg: "bg-warning/10", imgs: [fuel1Img, fuel2Img] },
  { icon: Radar, title: "Delivery Visibility Gaps", stat: "40%+", statLabel: "of delivery issues detected too late", desc: "Most companies lose operational visibility after dispatch, making SLA recovery and proactive intervention nearly impossible.", color: "text-muted-foreground", bg: "bg-muted/30", img: deliveryVisibilityImg },
  { icon: Users, title: "Driver & Rep Fraud", stat: "₦8.2M", statLabel: "avg. annual loss", desc: "Ghost trips, fuel theft, falsified delivery confirmations - invisible without GPS-verified systems.", color: "text-infra-purple", bg: "bg-infra-purple/10", img: tiredDriverImg },
];

const CardImageSlideshow = ({ images, alt }: { images: string[]; alt: string }) => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 3500);
    return () => clearInterval(t);
  }, [images.length]);
  return (
    <div className="relative h-32 w-full overflow-hidden">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${i === idx ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/40 to-transparent" />
    </div>
  );
};

const LandingDistributionReality = () => (
  <section className="py-24 px-6 border-y border-border/30">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <Badge variant="outline" className="mb-4 text-xs tracking-wider uppercase">The Nigerian Distribution Reality</Badge>
        <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">
          Nigeria's ₦40 Trillion Distribution Market<br />
          <span className="gradient-text">Runs on Guesswork.</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Every logistics operator, distributor, and sales team faces the same structural challenges. 
          RouteAce replaces guesswork with intelligence.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {realityCards.map((card, i) => (
          <motion.div key={card.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Card className="h-full border-border/40 hover:border-border/70 transition-all bg-card/60 backdrop-blur-sm group overflow-hidden">
              {card.imgs ? (
                <CardImageSlideshow images={card.imgs} alt={card.title} />
              ) : card.img ? (
                <div className="relative h-32 w-full overflow-hidden">
                  <img src={card.img} alt={card.title} className="absolute inset-0 w-full h-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/40 to-transparent" />
                </div>
              ) : null}
              <CardContent className="pt-6">
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <h3 className="font-semibold mb-1 text-sm">{card.title}</h3>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-2xl font-bold font-heading ${card.color}`}>{card.stat}</span>
                  <span className="text-[10px] text-muted-foreground">{card.statLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center mt-14 glass-card p-6 max-w-3xl mx-auto"
      >
        <p className="text-sm text-foreground font-medium mb-1">
          These are not software problems. They are <span className="text-primary">infrastructure problems.</span>
        </p>
        <p className="text-xs text-muted-foreground">
          RouteAce is the intelligence infrastructure that solves them at scale.
        </p>
      </motion.div>
    </div>
  </section>
);

export default LandingDistributionReality;
