import deployedAddresses from "../../../shared/deployed-addresses.json";
import petitionRegistryAbi from "../../../shared/abis/PetitionRegistry.json";
import implementerRegistryAbi from "../../../shared/abis/ImplementerRegistry.json";
import escrowMilestonesAbi from "../../../shared/abis/EscrowMilestones.json";

export type Address = `0x${string}`;

function envOrDefault(value: string | undefined, fallback: string | undefined): string {
  if (value && value.length > 0) return value;
  if (fallback && fallback.length > 0) return fallback;
  return "";
}

export const CONTRACT_ADDRESSES = {
  petitionRegistry: envOrDefault(
    process.env.NEXT_PUBLIC_PETITION_REGISTRY_ADDRESS,
    deployedAddresses.petitionRegistry,
  ) as Address | "",
  implementerRegistry: envOrDefault(
    process.env.NEXT_PUBLIC_IMPLEMENTER_REGISTRY_ADDRESS,
    deployedAddresses.implementerRegistry,
  ) as Address | "",
  escrowMilestones: envOrDefault(
    process.env.NEXT_PUBLIC_ESCROW_MILESTONES_ADDRESS,
    deployedAddresses.escrowMilestones,
  ) as Address | "",
};

export const ABIS = {
  petitionRegistry: petitionRegistryAbi,
  implementerRegistry: implementerRegistryAbi,
  escrowMilestones: escrowMilestonesAbi,
};