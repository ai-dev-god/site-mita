export interface TableLayout {
  id: string;
  label: string;
  zone: string;
  x: number; // % of canvas width
  y: number; // % of canvas height
  w: number; // % of canvas width
  h: number; // % of canvas height
  shape: "round" | "square" | "rectangle";
  maxCovers: number;
}

export interface ZoneLayout {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export interface FloorPlan {
  tables: TableLayout[];
  zones: ZoneLayout[];
}

const STORAGE_KEY = "lmbsc_floor_plan";

const DEFAULT_PLAN: FloorPlan = {
  zones: [
    { id: "s1", label: "Salon 1", x: 3, y: 3, w: 30, h: 25, color: "#2C4A2E" },
    { id: "s2", label: "Salon 2", x: 3, y: 32, w: 30, h: 22, color: "#4A7A4C" },
    { id: "s3", label: "Salon 3", x: 3, y: 58, w: 52, h: 20, color: "#B8962E" },
    { id: "s4", label: "Salon 4", x: 3, y: 81, w: 52, h: 16, color: "#D97706" },
  ],
  tables: [
    // Salon 1
    { id: "t1", label: "1", zone: "Salon 1", x: 5, y: 6, w: 7, h: 10, shape: "round", maxCovers: 4 },
    { id: "t2", label: "2", zone: "Salon 1", x: 15, y: 6, w: 7, h: 10, shape: "round", maxCovers: 4 },
    { id: "t3", label: "3", zone: "Salon 1", x: 25, y: 6, w: 7, h: 10, shape: "round", maxCovers: 2 },
    // Salon 2
    { id: "t4", label: "4", zone: "Salon 2", x: 5, y: 34, w: 7, h: 10, shape: "round", maxCovers: 4 },
    { id: "t5", label: "5", zone: "Salon 2", x: 15, y: 34, w: 7, h: 10, shape: "round", maxCovers: 4 },
    { id: "t6", label: "6", zone: "Salon 2", x: 25, y: 34, w: 7, h: 10, shape: "square", maxCovers: 4 },
    // Salon 3
    { id: "t7", label: "7", zone: "Salon 3", x: 5, y: 61, w: 10, h: 12, shape: "rectangle", maxCovers: 6 },
    { id: "t8", label: "8", zone: "Salon 3", x: 20, y: 61, w: 10, h: 12, shape: "rectangle", maxCovers: 6 },
    { id: "t9", label: "9", zone: "Salon 3", x: 38, y: 61, w: 10, h: 12, shape: "rectangle", maxCovers: 6 },
    // Salon 4
    { id: "t10", label: "10", zone: "Salon 4", x: 5, y: 84, w: 9, h: 10, shape: "round", maxCovers: 4 },
    { id: "t11", label: "11", zone: "Salon 4", x: 20, y: 84, w: 9, h: 10, shape: "round", maxCovers: 4 },
    { id: "t12", label: "12", zone: "Salon 4", x: 38, y: 84, w: 9, h: 10, shape: "round", maxCovers: 4 },
  ],
};

export function loadFloorPlan(): FloorPlan {
  if (typeof window === "undefined") return DEFAULT_PLAN;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLAN;
    return JSON.parse(raw) as FloorPlan;
  } catch {
    return DEFAULT_PLAN;
  }
}

export function saveFloorPlan(fp: FloorPlan): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fp));
}
