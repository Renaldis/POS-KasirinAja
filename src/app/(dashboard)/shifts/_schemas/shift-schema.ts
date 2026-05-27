import { z } from 'zod';

export const openShiftSchema = z.object({
  openingCash: z.coerce.number().min(0, 'Modal awal tidak boleh negatif'),
});

export const closeShiftSchema = z.object({
  shiftId: z.string().min(1, 'Shift tidak valid'),
  closingCash: z.coerce.number().min(0, 'Uang fisik akhir tidak boleh negatif'),
});

export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
