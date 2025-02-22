"use client"

import TokenViewer from "@/components/TokenViewer"
import PageLayout from "@/components/PageLayout"

export default function TokenViewerPage() {
    return (
        <PageLayout title="Onchain Heroes Viewer">
            <TokenViewer />
        </PageLayout>
    )
}