import { Suspense } from "react";
import { BasketTracker } from "./BasketTracker";

// The route param is dynamic, so the tracker streams in behind a Suspense boundary
// (required by cacheComponents to keep the shell prerenderable).
export default function BasketPage({ params }: PageProps<"/baskets/[id]">) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-xl px-4 pt-8 text-zinc-500">Loading basket…</main>}>
      <BasketTracker params={params} />
    </Suspense>
  );
}
