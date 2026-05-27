CREATE UNIQUE INDEX "shifts_one_open_shift_per_cashier"
ON "shifts"("store_id", "cashier_id")
WHERE "status" = 'open';
