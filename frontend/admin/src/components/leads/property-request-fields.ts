import type { PropertyRequestType } from "@/types/lead";

export const PROPERTY_REQUEST_TYPES: PropertyRequestType[] = [
  "apartment",
  "house_villa",
  "riad",
  "land",
  "commercial",
  "office",
  "shop",
];

export type PropertyDetailFieldKind = "number" | "text" | "boolean";

export interface PropertyDetailField {
  key: string;
  /** Looked up as `Leads.field.<labelKey>`. */
  labelKey: string;
  kind: PropertyDetailFieldKind;
  /** Which property types show this field. */
  types: PropertyRequestType[];
}

/**
 * Single source of truth for the "Property Details" group: an ordered list
 * of rows (1-2 fields each), every field appearing in exactly one fixed
 * row/position for the whole form's lifetime regardless of which property
 * type is selected - LeadForm never unmounts a field, it only shows/hides
 * it per `types`, which is what lets entered values survive a type switch.
 * Adding a field or a whole new type is a config edit here, not new
 * branching logic in the form itself.
 */
export const PROPERTY_DETAIL_ROWS: PropertyDetailField[][] = [
  [
    {
      key: "surface",
      labelKey: "surface",
      kind: "number",
      types: ["apartment", "land", "commercial", "shop", "office"],
    },
  ],
  [
    { key: "landSurface", labelKey: "landSurface", kind: "number", types: ["house_villa", "riad"] },
    { key: "builtSurface", labelKey: "builtSurface", kind: "number", types: ["house_villa", "riad"] },
  ],
  [
    { key: "bedrooms", labelKey: "bedrooms", kind: "number", types: ["apartment", "house_villa", "riad"] },
    { key: "bathrooms", labelKey: "bathrooms", kind: "number", types: ["apartment", "house_villa", "riad"] },
  ],
  [
    { key: "floor", labelKey: "floor", kind: "number", types: ["apartment", "commercial", "shop", "office"] },
    { key: "elevator", labelKey: "elevator", kind: "boolean", types: ["apartment"] },
  ],
  [
    { key: "furnished", labelKey: "furnished", kind: "boolean", types: ["apartment"] },
    { key: "balcony", labelKey: "balcony", kind: "boolean", types: ["apartment"] },
  ],
  [{ key: "parking", labelKey: "parking", kind: "boolean", types: ["apartment", "commercial", "shop", "office"] }],
  [
    { key: "floorsCount", labelKey: "floorsCount", kind: "number", types: ["house_villa", "riad"] },
    { key: "garage", labelKey: "garage", kind: "boolean", types: ["house_villa", "riad"] },
  ],
  [
    { key: "garden", labelKey: "garden", kind: "boolean", types: ["house_villa", "riad"] },
    { key: "pool", labelKey: "pool", kind: "boolean", types: ["house_villa", "riad"] },
  ],
  [{ key: "landType", labelKey: "landType", kind: "text", types: ["land"] }],
  [
    { key: "buildable", labelKey: "buildable", kind: "boolean", types: ["land"] },
    { key: "titleDeed", labelKey: "titleDeed", kind: "boolean", types: ["land"] },
  ],
  [
    { key: "activityType", labelKey: "activityType", kind: "text", types: ["commercial", "shop"] },
    { key: "storageRoom", labelKey: "storageRoom", kind: "boolean", types: ["commercial", "shop"] },
  ],
  [{ key: "meetingRooms", labelKey: "meetingRooms", kind: "number", types: ["office"] }],
];
