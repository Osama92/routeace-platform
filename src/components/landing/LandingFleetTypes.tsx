import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import vanImg from "@/assets/landing/img-6-van-driver.png";
import scaniaImg from "@/assets/landing/img-9-scania.png";
import fleetBoss1Img from "@/assets/landing/img-1-fleet-owner.png";
import femaleDriverImg from "@/assets/landing/img-5-female-driver.png";
import fleetOwner2Img from "@/assets/landing/img-3-blue-trucks.png";

const IMG_VANS = vanImg;
const IMG_HAULAGE = scaniaImg;
const IMG_FLEET_BOSS = fleetBoss1Img;
const IMG_FEMALE_DRIVER = femaleDriverImg;
const IMG_FLEET_OWNER_2 = fleetOwner2Img;
const IMG_BIKES = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=85&auto=format&fit=crop";

const fleetCards = [
  {
    img: IMG_BIKES,
    title: "Motorcycles & Bikes",
    desc: "Fast, agile delivery for urban environments. Perfect for quick commerce and last-mile deliveries through traffic.",
    points: ["Quick urban deliveries", "Real-time GPS tracking", "Safety monitoring"],
  },
  {
    img: IMG_VANS,
    title: "Vans & Light Trucks",
    desc: "Medium cargo capacity for local and regional distribution. Ideal for multi-drop routes and bulk deliveries.",
    points: ["Multi-stop optimization", "Load capacity planning", "Route efficiency"],
  },
  {
    img: IMG_HAULAGE,
    title: "Heavy Trucks",
    desc: "Long-haul distribution for large cargo volumes. Enterprise-grade tracking and management for cross-country routes.",
    points: ["Long-distance tracking", "Fuel optimization", "Maintenance alerts"],
  },
];

const portraits = [
  { img: IMG_FLEET_BOSS,    role: "Fleet Owners and 3PL Operators",  desc: "Full visibility on every asset, every naira." },
  { img: IMG_FEMALE_DRIVER, role: "Drivers and Riders",              desc: "Simpler jobs, transparent earnings, no WhatsApp chaos." },
  { img: IMG_HAULAGE,       role: "Haulage and Long-Haul Operators", desc: "Lagos to Kano with SLA compliance documented." },
  { img: IMG_FLEET_OWNER_2, role: "Last-Mile and Express Operators", desc: "Per-drop billing that rewards speed and volume." },
];

export default function LandingFleetTypes() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-3">Manage Every Vehicle Type</h2>
          <p className="text-sm text-muted-foreground">From motorcycles to heavy trucks, RouteAce handles your entire mixed fleet</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {fleetCards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.08 * i, duration: 0.5 }}
            >
              <Card className="h-full overflow-hidden bg-card/80 hover:border-primary/30 transition-colors">
                <div className="relative h-44 w-full overflow-hidden bg-muted">
                  <img src={c.img} alt={c.title} className="absolute inset-0 w-full h-full object-cover" />
                </div>
                <CardContent className="pt-5">
                  <h3 className="font-semibold text-base mb-2">{c.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{c.desc}</p>
                  <ul className="space-y-1.5">
                    {c.points.map(p => (
                      <li key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {portraits.map((p, i) => (
            <motion.div
              key={p.role}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.06 * i, duration: 0.45 }}
              className="glass-card overflow-hidden"
            >
              <div className="relative h-40 w-full overflow-hidden bg-muted">
                <img src={p.img} alt={p.role} className="absolute inset-0 w-full h-full object-cover object-top" />
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold leading-snug">{p.role}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
