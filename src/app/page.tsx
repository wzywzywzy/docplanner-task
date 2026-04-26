import { Suspense } from "react";
import HomeContent from "@/components/HomeContent";

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Suspense
        fallback={
          <div className="text-center py-12 text-gray-400">Loading...</div>
        }
      >
        <HomeContent />
      </Suspense>
    </div>
  );
}
