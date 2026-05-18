import { AlertTriangle } from "lucide-react";

interface Props {
  /** Short label, e.g. "EU Freight Compliance" */
  feature: string;
  /** Optional override message */
  message?: string;
}

/**
 * Renders a prominent banner indicating that the surrounding view is showing
 * sample/demo data rather than live tenant data. Used as a safety guard for
 * pages whose live data wiring is still pending so users are never misled.
 */
const DemoDataBanner = ({ feature, message }: Props) => (
  <div
    role="alert"
    className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
  >
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
    <div>
      <p className="font-semibold">Sample data preview</p>
      <p className="text-amber-900/80 dark:text-amber-200/80">
        {message ??
          `${feature} is showing illustrative sample data. Live tenant data wiring is pending and will replace this view automatically once connected.`}
      </p>
    </div>
  </div>
);

export default DemoDataBanner;
