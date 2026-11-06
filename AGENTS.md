# Architecture rules

- Dispatch totals use scanned quantities from the date-filtered gate-pass records, not full order quantities; keep the calculation in a pure tested helper to prevent overcounting partially scanned orders.