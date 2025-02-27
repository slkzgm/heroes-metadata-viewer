// app/training/page.tsx
import TrainingViewerPage from "./TrainingViewerPage";

export const metadata = {
  title: "Onchain Heroes Training Stats",
  description: "View training statistics for Onchain Heroes",
};

export default function Training() {
  return <TrainingViewerPage />;
}
