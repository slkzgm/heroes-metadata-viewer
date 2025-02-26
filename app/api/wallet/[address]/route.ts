import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  const walletAddress = params.address;

  try {
    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Query the subgraph for heroes owned by this wallet and token balance
    const response = await fetch(process.env.THEGRAPH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      body: JSON.stringify({
        query: `{
                      user(id: "${walletAddress.toLowerCase()}") {
                        id
                        balance {
                          balance
                        }
                        heroes(first: 1000) {
                          id
                          tokenId
                          lastUpgrade
                          lastClaim
                          level
                          stakedSince
                        }
                      }
                    }`,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch data from The Graph");
    }

    const data = await response.json();

    // Check if user exists and has heroes
    if (!data.data.user) {
      return NextResponse.json({
        walletAddress,
        heroes: [],
        balance: { balance: "0" },
      });
    }

    // Map heroes to a more usable structure
    const heroes = data.data.user.heroes.map((hero: any) => ({
      id: hero.tokenId,
      level: parseInt(hero.level),
      lastUpgrade: hero.lastUpgrade,
      stakedSince: hero.stakedSince,
      lastClaim: hero.lastClaim,
    }));

    // Configuration des en-têtes pour éviter la mise en cache de la réponse
    const responseObj = NextResponse.json({
      walletAddress,
      heroes,
      balance: data.data.user.balance,
    });

    responseObj.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    responseObj.headers.set("Pragma", "no-cache");
    responseObj.headers.set("Expires", "0");

    return responseObj;
  } catch (error: any) {
    console.error(`Error fetching heroes for wallet ${walletAddress}:`, error);
    return NextResponse.json(
      { error: `Error fetching wallet data: ${error.message}` },
      { status: 500 }
    );
  }
}
