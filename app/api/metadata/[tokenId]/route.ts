import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  const tokenId = params.tokenId;

  try {
    const response = await fetch(
      `https://api.onchainheroes.xyz/hero/${tokenId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch metadata");
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching metadata" },
      { status: 500 }
    );
  }
}
