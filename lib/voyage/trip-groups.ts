export const TRIP_GROUPS_BY_ACTIVITY_ID2 = [
  { id: "tr12", activityId2: "AGI TR Units 1-2", label: "AGI TR Units 1-2", color: "sky" },
  { id: "tr34", activityId2: "AGI TR Units 3-4", label: "AGI TR Units 3-4", color: "emerald" },
  { id: "tr56", activityId2: "AGLI TR Units 5-6", label: "AGI TR Units 5-6", color: "amber" },
  { id: "tr7", activityId2: "AGL TR Unit 7", label: "AGI TR Unit 7", color: "violet" },
] as const

export const VALID_TRIP_ACTIVITY_ID2 = TRIP_GROUPS_BY_ACTIVITY_ID2.map((group) => group.activityId2)
