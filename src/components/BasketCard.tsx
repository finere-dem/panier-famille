type Line = { productId: string; name: string; unit: string; quantity: number; unitPriceUsd: number };

// Basket summary shared by the chat and the tracking page. The budget bar shows how much of
// the sender's budget the agent used.
export function BasketCard({
  title,
  lines,
  totalUsd,
  budgetUsd,
  merchants,
}: {
  title: string;
  lines: Line[];
  totalUsd: number;
  budgetUsd?: number;
  merchants: string[];
}) {
  const used = budgetUsd ? Math.min(100, Math.round((totalUsd / budgetUsd) * 100)) : 0;
  return (
    <div className="rounded-2xl border border-sand bg-paper p-5 shadow-sm">
      <p className="mb-3 font-display text-lg font-semibold">{title}</p>
      <ul className="mb-4 space-y-2 text-sm">
        {lines.map((l) => (
          <li key={l.productId} className="flex items-baseline justify-between gap-4">
            <span>
              <span className="font-medium">{l.quantity} ×</span> {l.name}{" "}
              <span className="text-muted">· {l.unit}</span>
            </span>
            <span className="tabular-nums">${l.quantity * l.unitPriceUsd}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between border-t border-sand pt-3">
        <span className="font-medium">Total</span>
        <span className="font-display text-xl font-semibold tabular-nums">${totalUsd}</span>
      </div>
      {budgetUsd ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-sand">
            <div className="h-full rounded-full bg-ochre" style={{ width: `${used}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            ${totalUsd} of your ${budgetUsd} budget · ${budgetUsd - totalUsd} left
          </p>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted">From local merchants: {merchants.join(", ")}</p>
    </div>
  );
}
