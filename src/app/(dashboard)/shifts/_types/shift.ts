export type ActiveShift = {
  id: string;
  openingCash: string;
  openedAt: string;
  cashierName: string;
};

export type ShiftListItem = {
  id: string;
  cashierName: string;
  openingCash: string;
  closingCash: string | null;
  expectedCash: string | null;
  cashDifference: string | null;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
};

export type ShiftActionState = {
  success: boolean;
  message?: string;
};
