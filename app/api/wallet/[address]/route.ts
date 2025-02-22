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
            "https://api.studio.thegraph.com/query/507/och/version/latest",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: `
            query {
              user(id: "${walletAddress.toLowerCase()}") {
                heroes {
                  id
                  tokenId
                  lastUpgrade
                  level
                  stakedSince
                }
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

        // Check if user exists and has heroes
        if (!data.data.user) {
            return NextResponse.json({
                walletAddress,
                heroes: []
            })
        }

        // Map heroes to a more usable structure
        const heroes = data.data.user.heroes.map((hero: any) => ({
            id: hero.tokenId,
            level: parseInt(hero.level),
            lastUpgrade: hero.lastUpgrade,
            stakedSince: hero.stakedSince
        }))

        return NextResponse.json({
            walletAddress,
            heroes
        })
    } catch (error: any) {
        console.error(`Error fetching heroes for wallet ${walletAddress}:`, error)
        return NextResponse.json(
            { error: `Error fetching wallet data: ${error.message}` },
            { status: 500 }
        )
    }
}