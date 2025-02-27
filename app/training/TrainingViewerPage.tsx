"use client";

import TrainingStats from "@/components/TrainingStats";
import PageLayout from "@/components/PageLayout";

export default function TrainingViewerPage() {
  return (
    <PageLayout title="Onchain Heroes Training Stats" widerContent={true}>
      <TrainingStats />
    </PageLayout>
  );
}
