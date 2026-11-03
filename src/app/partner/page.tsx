"use client";

import { AllCommunityModule, ModuleRegistry, themeQuartz, type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Nav } from "@/components/Nav";
import { STATUS_LABEL, STATUS_PILL, type BasketView } from "@/lib/types";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  accentColor: "#24338a",
  backgroundColor: "#ffffff",
  foregroundColor: "#141a33",
  headerBackgroundColor: "#eef1fa",
  borderColor: "#e1e5f2",
  rowHoverColor: "#f6f7fc",
  fontFamily: "var(--font-geist-sans)",
  headerFontWeight: 600,
  wrapperBorderRadius: 16,
});

/** Shrink the phone photo before upload: proof only needs to be readable. */
async function resizePhoto(file: File, maxSide = 900): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

// Local partner view in Bamako: every paid basket, what to prepare, and delivery confirmation.
export default function PartnerPage() {
  const [rows, setRows] = useState<BasketView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const deliverTarget = useRef<string | null>(null);

  const load = useCallback(async () => setRows(await (await fetch("/api/baskets")).json()), []);

  useEffect(() => {
    const tick = () => fetch("/api/baskets").then((r) => r.json()).then(setRows);
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, []);

  const startPreparing = useCallback(
    async (id: string) => {
      setBusy(id);
      await fetch(`/api/baskets/${id}/status`, { method: "POST" });
      setBusy(null);
      load();
    },
    [load],
  );

  const askPhoto = useCallback((id: string) => {
    deliverTarget.current = id;
    fileInput.current?.click();
  }, []);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const id = deliverTarget.current;
    e.target.value = "";
    if (!file || !id) return;
    setBusy(id);
    const photo = await resizePhoto(file);
    await fetch(`/api/baskets/${id}/deliver`, { method: "POST", body: JSON.stringify({ photo }) });
    setBusy(null);
    load();
  }

  const columns = useMemo<ColDef<BasketView>[]>(
    () => [
      { headerName: "Recipient", field: "recipientName", flex: 1, minWidth: 130 },
      { headerName: "City", field: "recipientCity", width: 110 },
      {
        headerName: "Items",
        valueGetter: (p) => p.data?.lines.map((l) => `${l.quantity}× ${l.name}`).join(", "),
        flex: 2,
        minWidth: 220,
        tooltipValueGetter: (p) => p.value,
      },
      { headerName: "Merchants", valueGetter: (p) => p.data?.merchants.join(", "), flex: 1, minWidth: 160 },
      { headerName: "Total", field: "totalUsd", width: 100, valueFormatter: (p) => `$${p.value}` },
      {
        headerName: "Status",
        field: "status",
        width: 140,
        filter: true,
        cellRenderer: (p: ICellRendererParams<BasketView>) => {
          const s = p.value as BasketView["status"];
          return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[s]}`}>{STATUS_LABEL[s]}</span>;
        },
      },
      {
        headerName: "Paid",
        valueGetter: (p) => p.data?.events.find((e) => e.status === "paid")?.at,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleString() : ""),
        sort: "desc",
        width: 170,
      },
      {
        headerName: "Action",
        width: 180,
        sortable: false,
        cellRenderer: (p: ICellRendererParams<BasketView>) => {
          const b = p.data!;
          if (busy === b.id) return <span className="text-muted">Working…</span>;
          if (b.status === "paid")
            return (
              <button className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-canvas" onClick={() => startPreparing(b.id)}>
                Start preparing
              </button>
            );
          if (b.status === "preparing")
            return (
              <button className="rounded-full bg-leaf px-3 py-1 text-xs font-semibold text-canvas" onClick={() => askPhoto(b.id)}>
                Confirm delivery (photo)
              </button>
            );
          return (
            <Link href={`/baskets/${b.id}`} className="text-indigo underline">
              View
            </Link>
          );
        },
      },
    ],
    [busy, startPreparing, askPhoto],
  );

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-16">
      <Nav />
      <p className="text-sm font-medium uppercase tracking-wide text-indigo">Bamako partner</p>
      <h1 className="font-display text-3xl font-semibold">Baskets to prepare and deliver</h1>
      <p className="mb-6 mt-1 max-w-2xl text-muted">
        Every paid basket lands here. Delivery is confirmed with a photo, shared with the sender and recorded on the PayPal
        transaction.
      </p>
      <dl className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "To prepare", value: rows.filter((r) => r.status === "paid").length },
          { label: "To deliver", value: rows.filter((r) => r.status === "preparing").length },
          { label: "Delivered", value: rows.filter((r) => r.status === "delivered").length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-paper p-4">
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="font-display text-3xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div style={{ height: 480 }}>
        <AgGridReact<BasketView>
          theme={gridTheme}
          rowData={rows}
          columnDefs={columns}
          getRowId={(p) => p.data.id}
          defaultColDef={{ sortable: true, resizable: true }}
          overlayNoRowsTemplate="No paid baskets yet."
        />
      </div>
      <input ref={fileInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
    </main>
  );
}
