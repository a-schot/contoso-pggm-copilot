import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageOn, annualAccrual, contributionSplit, pensionableSalary, projectPension } from '../src/domain/pension.ts';

test('pensionable salary subtracts the franchise', () => {
  assert.equal(pensionableSalary(52_000, 1), 34_455);
});

test('pensionable salary applies the part-time factor', () => {
  assert.equal(pensionableSalary(46_000, 0.6), 17_073);
});

test('pensionable salary is capped at the salary cap', () => {
  assert.equal(pensionableSalary(150_000, 1), 120_255);
});

test('pensionable salary is never negative (salary below franchise)', () => {
  assert.equal(pensionableSalary(16_000, 0.9), 0);
});

test('pensionable salary rejects invalid part-time factors', () => {
  assert.throws(() => pensionableSalary(40_000, 0), RangeError);
  assert.throws(() => pensionableSalary(40_000, 1.2), RangeError);
});

test('annual accrual is 1.75% of pensionable salary', () => {
  assert.equal(annualAccrual(34_455), 602.96);
});

test('contribution split is 60% employer / 40% employee', () => {
  assert.deepEqual(contributionSplit(10_000), { total: 2_700, employer: 1_620, employee: 1_080 });
});

test('age is calculated in whole years', () => {
  assert.equal(ageOn('1972-04-15', '2026-11-18'), 54);
  assert.equal(ageOn('1979-12-20', '2026-11-18'), 46);
});

test('projection at the standard retirement age adds future accrual', () => {
  const result = projectPension({
    birthDate: '1972-04-15', fullTimeSalary: 52_000, partTimeFactor: 1, accruedToDate: 5_000, asOf: '2026-11-18',
  });
  assert.equal(result.yearsToRetirement, 14);
  assert.equal(result.futureAccrual, 8_441.44);
  assert.equal(result.unreducedAnnualPension, 13_441.44);
  assert.equal(result.earlyRetirementReduction, 0);
  assert.equal(result.projectedAnnualPension, 13_441.44);
  assert.equal(result.retirementDate, '2040-04-15');
});

test('projection stops accrual at early retirement and reduces the total pension', () => {
  const result = projectPension({
    birthDate: '1972-04-15', fullTimeSalary: 52_000, partTimeFactor: 1, accruedToDate: 5_000, asOf: '2026-11-18', retirementAge: 63,
  });
  assert.equal(result.yearsToRetirement, 9);
  assert.equal(result.futureAccrual, 5_426.64);
  assert.equal(result.unreducedAnnualPension, 10_426.64);
  assert.equal(result.earlyRetirementReduction, 0.325);
  assert.equal(result.projectedAnnualPension, 7_037.98);
});

test('projection accepts the earliest retirement age', () => {
  const result = projectPension({
    birthDate: '1972-04-15', fullTimeSalary: 52_000, partTimeFactor: 1, accruedToDate: 0, asOf: '2026-11-18', retirementAge: 60,
  });
  assert.equal(result.yearsToRetirement, 6);
  assert.equal(result.earlyRetirementReduction, 0.52);
});

test('projection accepts retirement at the member current age without future accrual', () => {
  const result = projectPension({
    birthDate: '1966-06-30', fullTimeSalary: 52_000, partTimeFactor: 1, accruedToDate: 5_000, asOf: '2026-11-18', retirementAge: 60,
  });
  assert.equal(result.yearsToRetirement, 0);
  assert.equal(result.futureAccrual, 0);
});

test('projection rejects retirement ages outside the supported range or below current age', () => {
  const base = {
    birthDate: '1972-04-15', fullTimeSalary: 52_000, partTimeFactor: 1, accruedToDate: 0, asOf: '2026-11-18',
  };
  assert.throws(() => projectPension({ ...base, retirementAge: 59 }), RangeError);
  assert.throws(() => projectPension({ ...base, retirementAge: 69 }), RangeError);
  assert.throws(() => projectPension({ ...base, retirementAge: 53 }), RangeError);
});
