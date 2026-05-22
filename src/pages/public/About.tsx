import PublicShell from "./PublicShell";
import trucksDepot from "@/assets/about/trucks-depot.jpg";
import lagosTraffic from "@/assets/about/lagos-traffic.jpg";
import operatorImg from "@/assets/about/operator.jpg";
import driverWaving from "@/assets/about/driver-waving-truck.jpg";

const beliefs = [
  "Logistics in Africa is not behind; it is different. Tools built for the US suburb don't survive Apapa traffic.",
  "Connectivity-first, not connectivity-only. Every workflow must survive offline.",
  "Decisions, not dashboards. Surface the next action, not another chart.",
];

const stats = [
  { value: "1", label: "truck where it started" },
  { value: "1", label: "driver. One spreadsheet." },
  { value: "Pan-African", label: "the ambition from day one" },
];

const ROAD_HORIZON = driverWaving;

export default function About() {
  return (
    <PublicShell
      title="About"
      description="RouteAce is Africa's distribution intelligence infrastructure, operated by Glyde Systems."
      canonical="https://routeace.app/about"
    >
      <div className="-mx-6 md:-mx-0 space-y-0 animate-in fade-in duration-700">
        {/* Section 1 — Hero with background video */}
        <section className="relative py-16 md:py-24 px-6 overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover opacity-65"
            src=""
          />
          <div
            className="absolute inset-0 -z-0 opacity-60 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.18), transparent 60%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background pointer-events-none" />
          <div className="relative">
            <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight leading-[1.05]">
              About RouteAce
            </h1>
            <p className="text-xl md:text-2xl italic text-primary mt-8 md:mt-10">
              Built in Nigeria. Scaled for the continent.
            </p>
            <div className="mt-10 h-px w-full bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
          </div>
        </section>

        {/* Section 2 — Origin Story */}
        <section className="py-16 md:py-24 px-6 grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          <div className="border-l-2 border-primary pl-6">
            <p className="text-lg leading-relaxed text-foreground/90">
              RouteAce is operated by{" "}
              <strong className="text-primary font-bold">Glyde Systems</strong>,
              building the operating layer for African distribution. We started
              with one truck, one driver, and a spreadsheet that broke in the
              rain. We now run dispatch, fleet, fuel, finance, and intelligence
              for operators across West Africa.
            </p>
          </div>
          <div>
            <div className="space-y-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-4xl md:text-5xl font-bold text-primary leading-none">
                    {s.value}
                  </div>
                  <div className="mt-2 text-sm uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            <img
              src={trucksDepot}
              alt="Fleet of trucks — RouteAce origin"
              loading="lazy"
              className="rounded-xl w-full h-64 object-cover mt-6 border border-border opacity-90"
            />
            <p className="text-xs text-muted-foreground text-center mt-2 italic">
              From one truck. To an operating system for African freight.
            </p>
          </div>
        </section>

        {/* Section 3 — What we believe */}
        <section className="py-16 md:py-24 px-6">
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-12">
            What we believe
          </h2>
          <div className="border-t border-border/60">
            {beliefs.map((belief, i) => (
              <div key={i}>
                <div className="group relative border-b border-border/60 py-8 md:py-10 transition-all duration-300">
                  <div className="relative flex items-start gap-6 md:gap-8">
                    <span
                      aria-hidden
                      className="text-6xl md:text-7xl font-bold text-primary opacity-10 group-hover:opacity-30 transition-opacity duration-300 leading-none select-none shrink-0"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="text-lg md:text-xl font-medium leading-relaxed pt-2 md:pt-3 transition-transform duration-300 group-hover:translate-x-1">
                      {belief}
                    </p>
                  </div>
                </div>

                {i === 0 && (
                  <div className="my-8 overflow-hidden rounded-2xl">
                    <img
                      src={lagosTraffic}
                      alt="African road logistics"
                      loading="lazy"
                      className="w-full h-48 md:h-64 object-cover object-center opacity-75 hover:opacity-90 transition-opacity duration-500"
                    />
                  </div>
                )}

                {i === 2 && (
                  <div className="my-8 overflow-hidden rounded-2xl">
                    <img
                      src={operatorImg}
                      alt="Operator working at a logistics command desk"
                      loading="lazy"
                      className="w-full h-48 md:h-64 object-cover object-center opacity-75 hover:opacity-90 transition-opacity duration-500"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 4 — Closing pull-quote */}
        <section className="py-16 md:py-24 px-6">
          <div
            className="relative rounded-2xl overflow-hidden border border-border/60 border-l-4 border-l-primary px-6 md:px-12 py-12 md:py-16 text-center"
            style={{ boxShadow: "0 0 60px -20px hsl(var(--primary) / 0.35)" }}
          >
            <img
              src={ROAD_HORIZON}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/40" />
            <div className="relative">
              <blockquote className="text-3xl md:text-4xl font-bold leading-tight">
                "We started with one truck. We're building for a million."
              </blockquote>
              <div className="mt-6 text-sm text-muted-foreground">
                RouteAce · Operated by Glyde Systems · Lagos, Nigeria
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
