import { NextResponse } from "next/server"
import { getClient } from "@/lib/viem"
import { parseAbi } from "viem"

// ABI minimal pour le contrat de jeu
const levelingGameAbi = parseAbi([
    'function stakeI(uint256 tokenId) view returns (uint256)',
])

// Adresse du contrat de jeu
const LEVELING_GAME_CONTRACT = '0x06D7Ee1D50828Ca96e11890A1601f6fe61F1e584'

export async function GET(
    request: Request,
    { params }: { params: { tokenId: string } }
) {
    const publicClient = getClient()
    const tokenId = params.tokenId

    try {
        // Récupération de la donnée stakeI qui contient plusieurs informations,
        // dont le timestamp de la dernière training (upgradeTime) dans les bits 8 à 52.
        const stakeData = await publicClient.readContract({
            address: LEVELING_GAME_CONTRACT,
            abi: levelingGameAbi,
            functionName: 'stakeI',
            args: [BigInt(tokenId)],
        })

        // Extraction du timestamp de la dernière training :
        // Décalage de 8 bits à droite et masque sur 44 bits (2^44 - 1)
        const trainingTime = (stakeData >> BigInt(8)) & ((BigInt(1) << BigInt(44)) - BigInt(1))

        // Conversion du BigInt en nombre
        const timestampInSeconds = Number(trainingTime)

        // Vérification que le timestamp est raisonnable (entre le 1er janvier 2000 et le 1er janvier 2100)
        const minTimestamp = 946684800
        const maxTimestamp = 4102444800

        const isValidTimestamp = timestampInSeconds > minTimestamp && timestampInSeconds < maxTimestamp

        // Construction de la réponse avec le nouveau format
        const onchainData = {
            lastUpgrade: isValidTimestamp ? timestampInSeconds : 0,
            stakedSince: isValidTimestamp ? timestampInSeconds : 0, // On utilise la même valeur pour l'exemple
            level: 1 // Niveau par défaut, à remplacer par la vraie valeur si disponible
        }

        return NextResponse.json(onchainData)
    } catch (error: any) {
        console.error(`Error fetching training time for token ${tokenId}:`, error)
        return NextResponse.json(
            { error: `Error fetching onchain data: ${error.message}` },
            { status: 500 }
        )
    }
}