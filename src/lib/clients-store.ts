import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_COUNTS } from "@/lib/countries";
import { COUNTRY_NAMES } from "@/lib/world";

export type ImportNotice = {
  ok: boolean;
  message: string;
};

type ClientsState = {
  counts: Record<string, number>;
  selectedId: string | null;
  hoveredId: string | null;
  importNotice: ImportNotice | null;
  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setCount: (id: string, n: number) => void;
  replaceCounts: (incoming: Record<string, number>, notice: ImportNotice) => void;
  clearNotice: () => void;
  reset: () => void;
};

function emptyBook(): Record<string, number> {
  const next: Record<string, number> = {};
  for (const id of Object.keys(COUNTRY_NAMES)) next[id] = 0;
  return next;
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      counts: { ...DEFAULT_COUNTS },
      selectedId: null,
      hoveredId: null,
      importNotice: null,
      setHovered: (id) => set({ hoveredId: id }),
      setSelected: (id) => set({ selectedId: id, hoveredId: null }),
      setCount: (id, n) => {
        const next = Math.max(0, Math.min(99999, Math.round(n)));
        set({ counts: { ...get().counts, [id]: next } });
      },
      replaceCounts: (incoming, notice) => {
        const counts = emptyBook();
        for (const [id, n] of Object.entries(incoming)) {
          if (id in COUNTRY_NAMES) counts[id] = n;
        }
        set({ counts, selectedId: null, hoveredId: null, importNotice: notice });
      },
      clearNotice: () => set({ importNotice: null }),
      reset: () =>
        set({
          counts: { ...DEFAULT_COUNTS },
          selectedId: null,
          hoveredId: null,
          importNotice: { ok: true, message: "Restored the sample book." },
        }),
    }),
    {
      name: "client-atlas-v1",
      partialize: (s) => ({ counts: s.counts }),
    },
  ),
);
