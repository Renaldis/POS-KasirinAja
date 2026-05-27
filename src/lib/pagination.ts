export const pageSizeOptions = [5, 10, 15] as const;

export function normalizePageSize(value: string | undefined) {
  const parsedValue = Number(value);

  if (pageSizeOptions.includes(parsedValue as (typeof pageSizeOptions)[number])) {
    return parsedValue;
  }

  return 10;
}

export function normalizePage(value: string | undefined) {
  const parsedValue = Number(value);

  if (Number.isInteger(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return 1;
}
