// app/api/training/[address]/route.ts
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

    // Query the subgraph for training data
    const response = await fetch(process.env.THEGRAPH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
      body: JSON.stringify({
        query: `{
          upgrades(
            first: 1000
            where: {user: "${walletAddress.toLowerCase()}"}
            orderBy: blockTimestamp
            orderDirection: desc
          ) {
            __typename
            newLevel
            oldLevel
            blockTimestamp
            hero {
              id
            }
          }
        }`,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch data from The Graph");
    }

    const data = await response.json();

    // Set cache control headers
    const responseObj = NextResponse.json(data);

    responseObj.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    responseObj.headers.set("Pragma", "no-cache");
    responseObj.headers.set("Expires", "0");

    return responseObj;
  } catch (error: any) {
    console.error(
      `Error fetching training data for wallet ${walletAddress}:`,
      error
    );
    return NextResponse.json(
      { error: `Error fetching training data: ${error.message}` },
      { status: 500 }
    );
  }
}
