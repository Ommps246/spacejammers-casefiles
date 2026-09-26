import { latLonToVector3, type Vec3 } from "@/lib/geo";

/**
 * Development-only inspection of the globe, driven by the URL, e.g.
 *   /?inspect&testpins&view=india&tonemap=aces
 * Always null in production builds.
 */
export type DevView = {
  inspect: boolean;
  showTestPins: boolean;
  cameraPosition?: Vec3;
  toneMapping?: "aces" | "neutral";
};

const VIEWS: Record<string, readonly [lat: number, lon: number, distance: number]> = {
  overview: [35, 38, 3.4],
  india: [12.3, 78.4, 1.32],
  london: [51.5, -0.13, 1.22],
  terra: [25, 61, 1.75], // close on the Terra marker and its ground track
};

export function readDevView(search: string): DevView | null {
  if (process.env.NODE_ENV === "production") return null;
  const params = new URLSearchParams(search);
  if (!params.has("inspect")) return null;
  const view = VIEWS[params.get("view") ?? ""];
  const tone = params.get("tonemap");
  return {
    inspect: true,
    showTestPins: params.has("testpins"),
    cameraPosition: view ? latLonToVector3(...view) : undefined,
    toneMapping: tone === "aces" || tone === "neutral" ? tone : undefined,
  };
}
