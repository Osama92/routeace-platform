/**
 * Universal Industry Role Hook
 * Returns the appropriate role hook based on industry code.
 */
import { usePharmaRole, type PharmaRole, PHARMA_ROLE_LABELS, PHARMA_ROLE_DESCRIPTIONS, PHARMA_ROLE_CATEGORIES } from "@/hooks/usePharmaRole";
import { useAgriRole, type AgriRole, AGRI_ROLE_LABELS, AGRI_ROLE_DESCRIPTIONS, AGRI_ROLE_CATEGORIES } from "@/hooks/useAgriRole";
import { useBuildingRole, type BuildingRole, BUILDING_ROLE_LABELS, BUILDING_ROLE_DESCRIPTIONS, BUILDING_ROLE_CATEGORIES } from "@/hooks/useBuildingRole";
import { useCosmeticsRole, type CosmeticsRole, COSMETICS_ROLE_LABELS, COSMETICS_ROLE_DESCRIPTIONS, COSMETICS_ROLE_CATEGORIES } from "@/hooks/useCosmeticsRole";
import { useBFSIRole, type BFSIRole, BFSI_ROLE_LABELS, BFSI_ROLE_DESCRIPTIONS, BFSI_ROLE_CATEGORIES } from "@/hooks/useBFSIRole";
import { useAutoRole, type AutoRole, AUTO_ROLE_LABELS, AUTO_ROLE_DESCRIPTIONS, AUTO_ROLE_CATEGORIES } from "@/hooks/useAutoRole";
import { useConsumerRole, type ConsumerRole, CONSUMER_ROLE_LABELS, CONSUMER_ROLE_DESCRIPTIONS, CONSUMER_ROLE_CATEGORIES } from "@/hooks/useConsumerRole";
import { useFMCGRole, type FMCGRole, FMCG_ROLE_LABELS, FMCG_ROLE_DESCRIPTIONS } from "@/hooks/useFMCGRole";

export type AnyIndustryRole = PharmaRole | AgriRole | BuildingRole | CosmeticsRole | BFSIRole | AutoRole | ConsumerRole | FMCGRole;

export interface IndustryRoleConfig {
  role: AnyIndustryRole | null;
  loading: boolean;
  setRole: (role: any) => Promise<any>;
  labels: Record<string, string>;
  descriptions: Record<string, string>;
  categories: Record<string, { label: string; roles: string[] }>;
}

// Industries that have dedicated role systems
export const ROLE_ENABLED_INDUSTRIES = ["pharma", "agri", "building", "cosmetics", "bfsi", "auto", "consumer", "fmcg"];

export function useIndustryRole(industryCode: string): IndustryRoleConfig | null {
  const pharma = usePharmaRole();
  const agri = useAgriRole();
  const building = useBuildingRole();
  const cosmetics = useCosmeticsRole();
  const bfsi = useBFSIRole();
  const auto = useAutoRole();
  const consumer = useConsumerRole();
  const fmcg = useFMCGRole();

  switch (industryCode) {
    case "pharma":
      return { role: pharma.pharmaRole, loading: pharma.loading, setRole: pharma.setRole, labels: PHARMA_ROLE_LABELS, descriptions: PHARMA_ROLE_DESCRIPTIONS, categories: PHARMA_ROLE_CATEGORIES };
    case "agri":
      return { role: agri.agriRole, loading: agri.loading, setRole: agri.setRole, labels: AGRI_ROLE_LABELS, descriptions: AGRI_ROLE_DESCRIPTIONS, categories: AGRI_ROLE_CATEGORIES };
    case "building":
      return { role: building.buildingRole, loading: building.loading, setRole: building.setRole, labels: BUILDING_ROLE_LABELS, descriptions: BUILDING_ROLE_DESCRIPTIONS, categories: BUILDING_ROLE_CATEGORIES };
    case "cosmetics":
      return { role: cosmetics.cosmeticsRole, loading: cosmetics.loading, setRole: cosmetics.setRole, labels: COSMETICS_ROLE_LABELS, descriptions: COSMETICS_ROLE_DESCRIPTIONS, categories: COSMETICS_ROLE_CATEGORIES };
    case "bfsi":
      return { role: bfsi.bfsiRole, loading: bfsi.loading, setRole: bfsi.setRole, labels: BFSI_ROLE_LABELS, descriptions: BFSI_ROLE_DESCRIPTIONS, categories: BFSI_ROLE_CATEGORIES };
    case "auto":
      return { role: auto.autoRole, loading: auto.loading, setRole: auto.setRole, labels: AUTO_ROLE_LABELS, descriptions: AUTO_ROLE_DESCRIPTIONS, categories: AUTO_ROLE_CATEGORIES };
    case "consumer":
      return { role: consumer.consumerRole, loading: consumer.loading, setRole: consumer.setRole, labels: CONSUMER_ROLE_LABELS, descriptions: CONSUMER_ROLE_DESCRIPTIONS, categories: CONSUMER_ROLE_CATEGORIES };
    case "fmcg":
      return { role: fmcg.fmcgRole, loading: fmcg.loading, setRole: fmcg.setRole, labels: FMCG_ROLE_LABELS, descriptions: FMCG_ROLE_DESCRIPTIONS, categories: {} };
    default:
      return null;
  }
}
