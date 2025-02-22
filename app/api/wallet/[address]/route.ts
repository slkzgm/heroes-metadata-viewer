import { NextResponse } from "next/server"

export async function GET(
    request: Request,
    { params }: { params: { address: string } }
) {
    const walletAddress = params.address

    try {
        // Validate wallet address format
        if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return NextResponse.json(
                { error: "Invalid wallet address format" },
                { status: 400 }
            )
        }

        // Query the subgraph for heroes owned by this wallet
        const response = await fetch(
            "https://api.studio.thegraph.com/query/105023/onchain-heroes-subgraph/version/latest",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: `
            query {
              heroEntities(where: { owner: "${walletAddress}" }) {
                id
                level
                stakeTime
                lastClaimTime
                isStaked
                lastUpgradeTime
              }
            }
          `,
                }),
            }
        )

        if (!response.ok) {
            throw new Error("Failed to fetch data from The Graph")
        }

        const data = await response.json()

        const heroesWithBasicInfo = data.data.heroEntities.map((hero: any) => {
            return {
                ...hero,
                metadata: {
                    name: `Hero #${hero.id}`,
                    image: `https://api.onchainheroes.xyz/hero/${hero.id}/image`, // On utilise directement l'URL externe
                    description: "",
                    attributes: []
                }
            }
        })

        return NextResponse.json({
            walletAddress,
            heroes: heroesWithBasicInfo
        })
    } catch (error: any) {
        console.error(`Error fetching heroes for wallet ${walletAddress}:`, error)
        return NextResponse.json(
            { error: `Error fetching wallet data: ${error.message}` },
            { status: 500 }
        )
    }
}