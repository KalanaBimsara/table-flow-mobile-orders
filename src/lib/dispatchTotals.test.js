import { describe, expect, test } from 'bun:test';
import { totalDispatchedUnits } from './dispatchTotals';

describe('total dispatched units in the filtered scan records', () => {
  test('adds scanned quantities instead of counting scan records or order quantities', () => {
    expect(totalDispatchedUnits([
      { operation_mode: 'dispatch', quantity: 2 },
      { operation_mode: 'dispatch', quantity: 3 },
    ])).toBe(5);
  });

  test('excludes returned units from the dispatched total', () => {
    expect(totalDispatchedUnits([
      { operation_mode: 'dispatch', quantity: 2 },
      { operation_mode: 'RETURN', quantity: 7 },
    ])).toBe(2);
  });
});