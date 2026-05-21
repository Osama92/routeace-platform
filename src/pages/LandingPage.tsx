import { Helmet } from "react-helmet-async";
import LandingHero from "@/components/landing/LandingHero";
// Theme toggle now lives inside LandingHero's header to avoid CTA overlap.
import LandingDistributionReality from "@/components/landing/LandingDistributionReality";
import LandingNigeriaMap from "@/components/landing/LandingNigeriaMap";
import LandingLCSection from "@/components/landing/LandingLCSection";
import LandingFleetTypes from "@/components/landing/LandingFleetTypes";
import LandingLDSection from "@/components/landing/LandingLDSection";
import LandingLogisticsOS from "@/components/landing/LandingLogisticsOS";
import LandingLiveIntelligence from "@/components/landing/LandingLiveIntelligence";
import LandingPricingSection from "@/components/landing/LandingPricingSection";
import LandingNigeriaValue from "@/components/landing/LandingNigeriaValue";
import LandingBottomCTA from "@/components/landing/LandingBottomCTA";

const LandingPage = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>RouteAce - Fleet & Distribution Intelligence for Africa</title>
      <meta name="description" content="Stop revenue leakage in your logistics operation. RouteAce delivers real-time tracking, intelligent dispatch, and SLA enforcement for African fleets." />
      <link rel="canonical" href="https://routeace.app/" />
      <meta property="og:title" content="RouteAce - Fleet & Distribution Intelligence for Africa" />
      <meta property="og:description" content="Real-time tracking, intelligent dispatch, and SLA enforcement built for Nigerian and African logistics operators." />
      <meta property="og:url" content="https://routeace.app/" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "RouteAce",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
        description: "Distribution Intelligence Platform for African logistics."
      })}</script>
    </Helmet>
    <LandingHero />
    <LandingDistributionReality />
    <LandingNigeriaMap />
    <LandingLCSection />
    <LandingFleetTypes />
    <LandingLDSection />
    <LandingLogisticsOS />
    <LandingLiveIntelligence />
    <LandingPricingSection />
    <LandingNigeriaValue />
    <LandingBottomCTA />
  </div>
);

export default LandingPage;
