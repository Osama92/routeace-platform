import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Package, TrendingUp } from "lucide-react";
import networkBgVideo from "@/assets/landing/network-bg.mp4";
import sectionBgVideo from "@/assets/landing/section-bg.mp4";

const cities = [
  { name: "Lagos", x: 130, y: 280, score: 78, desc: "Distribution density hub", routes: "1,240", color: "hsl(var(--primary))" },
  { name: "Abuja", x: 220, y: 195, score: 74, desc: "Government & enterprise", routes: "680", color: "hsl(var(--info))" },
  { name: "Kano", x: 250, y: 95, score: 66, desc: "Northern corridor gateway", routes: "520", color: "hsl(var(--infra-orange))" },
  { name: "Port Harcourt", x: 195, y: 310, score: 70, desc: "Oil & gas logistics", routes: "440", color: "hsl(var(--success))" },
  { name: "Ibadan", x: 135, y: 250, score: 64, desc: "SW distribution relay", routes: "380", color: "hsl(var(--infra-purple))" },
];

const corridors = [
  { from: { x: 130, y: 280 }, to: { x: 220, y: 195 }, label: "Lagos → Abuja", volume: "₦2.4B/mo (est.)" },
  { from: { x: 220, y: 195 }, to: { x: 250, y: 95 }, label: "Abuja → Kano", volume: "₦1.1B/mo (est.)" },
  { from: { x: 130, y: 280 }, to: { x: 195, y: 310 }, label: "Lagos → PH", volume: "₦980M/mo (est.)" },
];

const LandingNigeriaMap = () => (
  <section className="relative overflow-hidden py-24 px-6">
    {/* Looping background video */}
    <video
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover object-center z-0"
    >
      <source src={sectionBgVideo} type="video/mp4" />
    </video>
    {/* Dark overlay so text stays readable */}
    <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10" />

    <div className="max-w-6xl mx-auto relative z-20">
      <div className="text-center mb-14">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">🇳🇬 Nigeria Distribution Map</Badge>
        <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4 text-white">
          Built for Nigeria's Major Distribution Corridors
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto text-sm text-white/80">
          RouteAce is optimised for Nigerian road logistics - Lagos traffic, Kano-Abuja corridor delays,
          Port Harcourt oil-sector SLAs. Scores reflect RouteAce's infrastructure readiness index by region.
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-3 italic text-white/50">
          Readiness index scores reflect regional infrastructure analysis · Not live route data
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Map Visualization */}
        <div className="lg:col-span-3 glass-card p-8 relative overflow-hidden">
          <video
            src={networkBgVideo}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/70 via-background/40 to-background/70 pointer-events-none" />
          <div className="absolute top-4 right-4 z-10">
            <span className="flex items-center gap-1.5 text-[10px] text-success uppercase tracking-widest font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live Network
            </span>
          </div>

          <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto relative z-10">
            {/* Nigeria outline (simplified) */}
            <motion.path
              d="M80,120 Q120,60 200,50 Q280,55 320,100 Q340,140 330,200 Q310,260 280,300 Q240,340 200,350 Q160,340 130,310 Q100,280 90,240 Q75,190 80,120Z"
              fill="hsl(var(--secondary))" fillOpacity="0.3"
              stroke="hsl(var(--border))" strokeWidth="1"
              initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
              viewport={{ once: true }} transition={{ duration: 2 }}
            />

            {/* Trade corridors */}
            {corridors.map((c, i) => (
              <motion.line key={i}
                x1={c.from.x} y1={c.from.y} x2={c.to.x} y2={c.to.y}
                stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 4" opacity="0.4"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
                viewport={{ once: true }} transition={{ duration: 1.5, delay: 0.5 + i * 0.3 }}
              />
            ))}

            {/* City nodes */}
            {cities.map((city, i) => (
              <g key={city.name}>
                <motion.circle
                  cx={city.x} cy={city.y} r="20"
                  fill={city.color} fillOpacity="0.1"
                  initial={{ scale: 0 }} whileInView={{ scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.15 }}
                />
                <motion.circle
                  cx={city.x} cy={city.y} r="6"
                  fill={city.color}
                  initial={{ scale: 0 }} whileInView={{ scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.15, type: "spring" }}
                />
                <text x={city.x} y={city.y + 18} textAnchor="middle" className="fill-foreground text-[9px] font-bold">{city.name}</text>
                <text x={city.x} y={city.y + 28} textAnchor="middle" className="fill-muted-foreground text-[7px]">Score: {city.score}</text>
              </g>
            ))}
          </svg>
        </div>

        {/* Corridor Details */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Major Trade Corridors</h3>
          {corridors.map((c, i) => (
            <motion.div key={c.label}
              initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              className="glass-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{c.label}</span>
                <span className="text-xs text-primary font-mono">{c.volume}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <motion.div
                  className="bg-primary h-1.5 rounded-full"
                  initial={{ width: "0%" }}
                  whileInView={{ width: `${80 - i * 15}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
            </motion.div>
          ))}

          {/* City stats */}
          <div className="glass-card p-4 mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">City Distribution Scores</h4>
            <div className="space-y-3">
              {cities.map(city => (
                <div key={city.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="text-xs">{city.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{city.routes} routes</span>
                    <span className="text-xs font-bold text-primary">{city.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default LandingNigeriaMap;
