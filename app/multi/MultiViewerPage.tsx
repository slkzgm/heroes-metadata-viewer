"use client"

import MultiHeroViewer from "@/components/MultiHeroViewer"
import PageLayout from "@/components/PageLayout"

export default function MultiViewerPage() {
    return (
        <PageLayout title="Onchain Heroes Wallet Viewer" widerContent={true}>
            <MultiHeroViewer />
        </PageLayout>
    )
}