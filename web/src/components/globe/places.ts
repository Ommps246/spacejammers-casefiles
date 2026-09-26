export type Place = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  labelSide: "left" | "right";
  /** The case a click on the pin opens, and how the hover label names it. */
  caseId?: string;
  caseLabel?: string;
};

// Same coordinates as pipeline/regions.py (the NASA POWER grid-cell centres).
// Label sides follow the landing mockup: Chennai to the right, Nilgiris to the left.
export const CASE_PLACES: readonly Place[] = [
  { id: "chennai", name: "Chennai", lat: 13.08, lon: 80.27, labelSide: "right", caseId: "chennai-night-heat", caseLabel: "night-heat case" },
  { id: "nilgiris", name: "Nilgiris", lat: 11.41, lon: 76.7, labelSide: "left", caseId: "nilgiris-heat", caseLabel: "heat case" },
];

// Orientation check for the texture mapping: a pin that must land on the Thames.
export const TEST_PLACES: readonly Place[] = [
  { id: "london", name: "London (test)", lat: 51.5, lon: -0.13, labelSide: "right" },
];
