// lib/viem.ts
import { createPublicClient, http } from "viem";
import { abstract } from "viem/chains";

export const publicClient = createPublicClient({
  chain: abstract,
  transport: http(),
});

export function getClient() {
  return publicClient;
}
