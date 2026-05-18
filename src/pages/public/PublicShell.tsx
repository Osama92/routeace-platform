import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import brandMark from "@/assets/routeace-mark.png";
import { ReactNode } from "react";

export default function PublicShell({
  title, description, canonical, children, jsonLd,
}: {
  title: string;
  description: string;
  canonical: string;
  children: ReactNode;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}) {
  const fullTitle = `${title} - RouteAce`;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://routeaceglyde.app/" },
      { "@type": "ListItem", position: 2, name: title, item: canonical },
    ],
  };
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        {ldArray.map((ld, i) => (
          <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
        ))}
      </Helmet>
      <header className="border-b border-border/40 bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2"><img src={brandMark} alt="RouteAce" className="w-7 h-7 object-contain" /><span className="font-bold">RouteAce</span></div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">{children}</main>
    </div>
  );
}
