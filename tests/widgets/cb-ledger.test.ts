import { describe, expect, it } from "vitest";
import {
  CB_INITIAL,
  STEP_AMOUNT,
  cbReducer,
  initState,
} from "@/components/widgets/cb-ledger/reducer";
import type { CBState } from "@/components/widgets/cb-ledger/types";

function baseMoney(s: CBState): number {
  return s.cb.currency + s.cb.bankReserves;
}

function broadMoney(s: CBState): number {
  return s.cb.currency + s.bank.deposits;
}

function cbAssets(s: CBState): number {
  return s.cb.treasuries + s.cb.mbs + s.cb.gold + s.cb.fxSwaps;
}

function cbLiab(s: CBState): number {
  return s.cb.currency + s.cb.bankReserves + s.cb.reverseRepo + s.cb.tga;
}

function bankAssets(s: CBState): number {
  return s.bank.reserves + s.bank.securities + s.bank.loans;
}

function bankLiab(s: CBState): number {
  return s.bank.deposits + s.bank.wholesale + s.bank.equity;
}

describe("cb-ledger reducer", () => {
  describe("CB_INITIAL", () => {
    it("CB balance sheet is identity (assets = liabilities)", () => {
      expect(cbAssets(CB_INITIAL)).toBe(cbLiab(CB_INITIAL));
    });

    it("commercial bank balance sheet is identity", () => {
      expect(bankAssets(CB_INITIAL)).toBe(bankLiab(CB_INITIAL));
    });

    it("the shared row is identical between CB and bank", () => {
      expect(CB_INITIAL.cb.bankReserves).toBe(CB_INITIAL.bank.reserves);
    });
  });

  describe("QE", () => {
    it("CB Treasuries up by STEP; bank reserves up by STEP; bank securities down by STEP", () => {
      const before = initState();
      const after = cbReducer(before, { type: "QE" });
      expect(after.cb.treasuries).toBe(before.cb.treasuries + STEP_AMOUNT);
      expect(after.cb.bankReserves).toBe(before.cb.bankReserves + STEP_AMOUNT);
      expect(after.bank.reserves).toBe(before.bank.reserves + STEP_AMOUNT);
      expect(after.bank.securities).toBe(before.bank.securities - STEP_AMOUNT);
    });

    it("BASE money increases by STEP", () => {
      const before = initState();
      const after = cbReducer(before, { type: "QE" });
      expect(baseMoney(after)).toBe(baseMoney(before) + STEP_AMOUNT);
    });

    it("BROAD money is UNCHANGED — the canonical insight", () => {
      const before = initState();
      const after = cbReducer(before, { type: "QE" });
      expect(broadMoney(after)).toBe(broadMoney(before));
    });

    it("the shared row identity is preserved", () => {
      const after = cbReducer(initState(), { type: "QE" });
      expect(after.cb.bankReserves).toBe(after.bank.reserves);
    });

    it("both balance sheets stay in identity", () => {
      const after = cbReducer(initState(), { type: "QE" });
      expect(cbAssets(after)).toBe(cbLiab(after));
      expect(bankAssets(after)).toBe(bankLiab(after));
    });
  });

  describe("QT", () => {
    it("reverses QE exactly", () => {
      const before = initState();
      const afterQE = cbReducer(before, { type: "QE" });
      const afterQT = cbReducer(afterQE, { type: "QT" });
      expect(afterQT.cb.treasuries).toBe(before.cb.treasuries);
      expect(afterQT.cb.bankReserves).toBe(before.cb.bankReserves);
      expect(afterQT.bank.reserves).toBe(before.bank.reserves);
      expect(afterQT.bank.securities).toBe(before.bank.securities);
    });

    it("blocks when bank doesn't have enough reserves", () => {
      const drained: CBState = {
        ...initState(),
        cb: { ...initState().cb, treasuries: 50 },
        bank: { ...initState().bank, reserves: 50 },
      };
      const after = cbReducer(drained, { type: "QT" });
      // Balances unchanged
      expect(after.cb.treasuries).toBe(50);
      expect(after.bank.reserves).toBe(50);
    });
  });

  describe("CASH (cash withdrawal)", () => {
    it("currency in circulation up, bank reserves down, both by STEP", () => {
      const before = initState();
      const after = cbReducer(before, { type: "CASH" });
      expect(after.cb.currency).toBe(before.cb.currency + STEP_AMOUNT);
      expect(after.cb.bankReserves).toBe(before.cb.bankReserves - STEP_AMOUNT);
    });

    it("bank deposits down by STEP, bank reserves down by STEP", () => {
      const before = initState();
      const after = cbReducer(before, { type: "CASH" });
      expect(after.bank.deposits).toBe(before.bank.deposits - STEP_AMOUNT);
      expect(after.bank.reserves).toBe(before.bank.reserves - STEP_AMOUNT);
    });

    it("BASE money UNCHANGED — composition shifts from reserves to currency", () => {
      const before = initState();
      const after = cbReducer(before, { type: "CASH" });
      expect(baseMoney(after)).toBe(baseMoney(before));
    });

    it("BROAD money UNCHANGED — deposit becomes currency in circulation, both count", () => {
      const before = initState();
      const after = cbReducer(before, { type: "CASH" });
      expect(broadMoney(after)).toBe(broadMoney(before));
    });

    it("the shared row identity is preserved", () => {
      const after = cbReducer(initState(), { type: "CASH" });
      expect(after.cb.bankReserves).toBe(after.bank.reserves);
    });

    it("blocks when reserves or deposits are insufficient", () => {
      const tight: CBState = {
        ...initState(),
        bank: { ...initState().bank, reserves: 50 },
      };
      const after = cbReducer(tight, { type: "CASH" });
      expect(after.bank.reserves).toBe(50); // unchanged
    });
  });

  describe("LOAN (bank issues loan)", () => {
    it("bank loans and deposits both up by STEP", () => {
      const before = initState();
      const after = cbReducer(before, { type: "LOAN" });
      expect(after.bank.loans).toBe(before.bank.loans + STEP_AMOUNT);
      expect(after.bank.deposits).toBe(before.bank.deposits + STEP_AMOUNT);
    });

    it("CB ledger is UNCHANGED", () => {
      const before = initState();
      const after = cbReducer(before, { type: "LOAN" });
      expect(after.cb).toEqual(before.cb);
    });

    it("BASE money UNCHANGED", () => {
      const before = initState();
      const after = cbReducer(before, { type: "LOAN" });
      expect(baseMoney(after)).toBe(baseMoney(before));
    });

    it("BROAD money UP by STEP — the asymmetric insight", () => {
      const before = initState();
      const after = cbReducer(before, { type: "LOAN" });
      expect(broadMoney(after)).toBe(broadMoney(before) + STEP_AMOUNT);
    });

    it("bank balance sheet stays in identity", () => {
      const after = cbReducer(initState(), { type: "LOAN" });
      expect(bankAssets(after)).toBe(bankLiab(after));
    });
  });

  describe("RESET", () => {
    it("returns to CB_INITIAL after any combination of actions", () => {
      let s = initState();
      s = cbReducer(s, { type: "QE" });
      s = cbReducer(s, { type: "LOAN" });
      s = cbReducer(s, { type: "CASH" });
      s = cbReducer(s, { type: "RESET" });
      expect(s.cb).toEqual(CB_INITIAL.cb);
      expect(s.bank).toEqual(CB_INITIAL.bank);
    });
  });

  describe("reducer purity", () => {
    it("doesn't mutate input state", () => {
      const before = initState();
      const snapshot = JSON.stringify(before);
      cbReducer(before, { type: "QE" });
      cbReducer(before, { type: "LOAN" });
      cbReducer(before, { type: "CASH" });
      expect(JSON.stringify(before)).toBe(snapshot);
    });
  });

  describe("combined action invariants", () => {
    it("QE then LOAN: base +STEP, broad +STEP (independent channels)", () => {
      const before = initState();
      const after = cbReducer(cbReducer(before, { type: "QE" }), { type: "LOAN" });
      expect(baseMoney(after)).toBe(baseMoney(before) + STEP_AMOUNT);
      expect(broadMoney(after)).toBe(broadMoney(before) + STEP_AMOUNT);
    });

    it("five QEs then five QTs returns to original CB state", () => {
      let s = initState();
      for (let i = 0; i < 5; i++) s = cbReducer(s, { type: "QE" });
      for (let i = 0; i < 5; i++) s = cbReducer(s, { type: "QT" });
      expect(s.cb).toEqual(CB_INITIAL.cb);
      expect(s.bank).toEqual(CB_INITIAL.bank);
    });
  });
});
