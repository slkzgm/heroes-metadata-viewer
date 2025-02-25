import { NextResponse } from "next/server";
import { getClient } from "@/lib/viem";
import { parseAbi } from "viem";

// ABI minimal pour le contrat de jeu
const levelingGameAbi = parseAbi([
  "function stakeI(uint256 tokenId) view returns (uint256)",
]);

// Adresse du contrat de jeu
const LEVELING_GAME_CONTRACT = "0x06D7Ee1D50828Ca96e11890A1601f6fe61F1e584";

export async function GET(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  const publicClient = getClient();
  const tokenId = params.tokenId;

  try {
    // Récupération de la donnée stakeI qui contient plusieurs informations
    const stakeData = await publicClient.readContract({
      address: LEVELING_GAME_CONTRACT,
      abi: levelingGameAbi,
      functionName: "stakeI",
      args: [BigInt(tokenId)],
    });

    // Extraction du timestamp de la dernière upgrade (training)
    const lastUpgradeTime =
      (stakeData >> BigInt(8)) & ((BigInt(1) << BigInt(44)) - BigInt(1));
    const lastUpgradeSeconds = Number(lastUpgradeTime);

    // Pour cet exemple, nous utiliserons la même valeur pour stakedSince
    // Dans une implémentation réelle, vous extrairiez les bits appropriés
    // ou utiliseriez une autre méthode du contrat pour obtenir cette valeur
    const stakedSinceSeconds = lastUpgradeSeconds;

    // Extraction du niveau (à adapter selon votre contrat)
    // Exemple : extraire les 8 premiers bits pour le niveau
    const level = Number(stakeData & BigInt(0xff));

    // Formatage des timestamp en chaînes pour correspondre au format de TheGraph
    const lastUpgrade = lastUpgradeSeconds.toString();
    const stakedSince = stakedSinceSeconds.toString();

    return NextResponse.json({
      lastUpgrade,
      stakedSince,
      level: level || 1, // Utiliser 1 comme niveau par défaut si extraction échoue
    });
  } catch (error: any) {
    console.error(`Error fetching training time for token ${tokenId}:`, error);
    return NextResponse.json(
      { error: `Error fetching onchain data: ${error.message}` },
      { status: 500 }
    );
  }
}
