/** Display order for operations openings on the operations page. */
export const OPERATIONS_OFFICE_ORDER = [
  "denver",
  "colorado-springs",
  "grand-junction",
  "salt-lake-city",
] as const;

export type OperationsOfficeSlug = (typeof OPERATIONS_OFFICE_ORDER)[number];
