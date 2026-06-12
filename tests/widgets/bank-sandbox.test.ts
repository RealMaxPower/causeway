import { describe, expect, it } from "vitest";
import {
  INITIAL_STATE,
  bankReducer,
  getAccountMeta,
  initState,
} from "@/components/widgets/bank-sandbox/reducer";
import type { BankState } from "@/components/widgets/bank-sandbox/types";

function totalAssets(state: BankState): number {
  return Object.entries(state.balances).reduce((sum, [k, v]) => {
    const meta = getAccountMeta(k);
    return meta && meta.side === "asset" ? sum + v : sum;
  }, 0);
}

function totalLiabilities(state: BankState): number {
  return Object.entries(state.balances).reduce((sum, [k, v]) => {
    const meta = getAccountMeta(k);
    return meta && meta.side === "liability" ? sum + v : sum;
  }, 0);
}

function totalDeposits(state: BankState): number {
  return Object.entries(state.balances).reduce((sum, [k, v]) => {
    const meta = getAccountMeta(k);
    return meta && meta.kind === "deposit" ? sum + v : sum;
  }, 0);
}

describe("bank-sandbox reducer", () => {
  describe("INITIAL_STATE", () => {
    it("balance sheet sums to zero (assets = liabilities + equity)", () => {
      const a = totalAssets(INITIAL_STATE);
      const l = totalLiabilities(INITIAL_STATE);
      expect(a).toBe(l);
      expect(a).toBe(1200); // 200 reserves + 1000 loanGeneral
    });

    it("starts with reserve 200, loanGeneral 1000, depGen 1000, equity 200", () => {
      expect(INITIAL_STATE.balances.reserve).toBe(200);
      expect(INITIAL_STATE.balances.loanGeneral).toBe(1000);
      expect(INITIAL_STATE.balances.depGen).toBe(1000);
      expect(INITIAL_STATE.balances.equity).toBe(200);
    });
  });

  describe("initState()", () => {
    it("returns a fresh deep copy each call (no shared mutable refs)", () => {
      const a = initState();
      const b = initState();
      a.balances.reserve = 999;
      expect(b.balances.reserve).toBe(200);
      expect(INITIAL_STATE.balances.reserve).toBe(200);
    });
  });

  describe("ISSUE_LOAN", () => {
    it("creates matching loan asset and deposit liability — both sides grow equally", () => {
      const before = initState();
      const after = bankReducer(before, {
        type: "ISSUE_LOAN",
        borrower: "Alice",
        amount: 500,
      });
      expect(after.balances.loan_Alice).toBe(500);
      expect(after.balances.dep_Alice).toBe(500);
      expect(totalAssets(after)).toBe(totalAssets(before) + 500);
      expect(totalLiabilities(after)).toBe(totalLiabilities(before) + 500);
    });

    it("preserves the balance-sheet identity (A = L + E)", () => {
      const after = bankReducer(initState(), {
        type: "ISSUE_LOAN",
        borrower: "Bao",
        amount: 750,
      });
      expect(totalAssets(after)).toBe(totalLiabilities(after));
    });

    it("does not touch reserves (the canonical pedagogical insight)", () => {
      const before = initState();
      const after = bankReducer(before, {
        type: "ISSUE_LOAN",
        borrower: "Carla",
        amount: 200,
      });
      expect(after.balances.reserve).toBe(before.balances.reserve);
    });

    it("increments loanCounter", () => {
      const before = initState();
      const after = bankReducer(before, {
        type: "ISSUE_LOAN",
        borrower: "Dev",
        amount: 100,
      });
      expect(after.loanCounter).toBe(before.loanCounter + 1);
    });

    it("multiple loans to the same borrower accumulate", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 100 });
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 250 });
      expect(s.balances.loan_Alice).toBe(350);
      expect(s.balances.dep_Alice).toBe(350);
    });
  });

  describe("REPAY", () => {
    it("shrinks both loan and deposit by the repaid amount", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 500 });
      s = bankReducer(s, { type: "REPAY", borrower: "Alice", amount: 200 });
      expect(s.balances.loan_Alice).toBe(300);
      expect(s.balances.dep_Alice).toBe(300);
    });

    it("removes the account keys when fully repaid", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 500 });
      s = bankReducer(s, { type: "REPAY", borrower: "Alice", amount: 500 });
      expect("loan_Alice" in s.balances).toBe(false);
      expect("dep_Alice" in s.balances).toBe(false);
    });

    it("caps repayment at min(loan, deposit, amount)", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 100 });
      s = bankReducer(s, { type: "REPAY", borrower: "Alice", amount: 999 });
      expect("loan_Alice" in s.balances).toBe(false);
      expect("dep_Alice" in s.balances).toBe(false);
    });

    it("no-ops cleanly when there's no outstanding loan", () => {
      const before = initState();
      const after = bankReducer(before, {
        type: "REPAY",
        borrower: "Esra",
        amount: 100,
      });
      expect(after.balances).toEqual(before.balances);
    });

    it("preserves the balance-sheet identity", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 400 });
      s = bankReducer(s, { type: "REPAY", borrower: "Alice", amount: 150 });
      expect(totalAssets(s)).toBe(totalLiabilities(s));
    });
  });

  describe("DEFAULT", () => {
    it("writes off the loan and hits equity by the same amount", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 600 });
      const equityBefore = s.balances.equity;
      s = bankReducer(s, { type: "DEFAULT", borrower: "Alice" });
      expect("loan_Alice" in s.balances).toBe(false);
      expect(s.balances.equity).toBe(equityBefore - 600);
    });

    it("the matching deposit survives — that's the structural point", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Bao", amount: 400 });
      s = bankReducer(s, { type: "DEFAULT", borrower: "Bao" });
      expect(s.balances.dep_Bao).toBe(400);
    });

    it("preserves the balance-sheet identity even when equity goes negative", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 5000 });
      s = bankReducer(s, { type: "DEFAULT", borrower: "Alice" });
      expect(totalAssets(s)).toBe(totalLiabilities(s));
      expect(s.balances.equity).toBeLessThan(0);
    });

    it("no-ops cleanly when there's nothing to default on", () => {
      const before = initState();
      const after = bankReducer(before, { type: "DEFAULT", borrower: "Esra" });
      expect(after.balances).toEqual(before.balances);
    });
  });

  describe("WITHDRAW", () => {
    it("shrinks both the deposit and bank reserves by the withdrawn amount", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 500 });
      const reservesBefore = s.balances.reserve;
      s = bankReducer(s, { type: "WITHDRAW", borrower: "Alice", amount: 100 });
      expect(s.balances.dep_Alice).toBe(400);
      expect(s.balances.reserve).toBe(reservesBefore - 100);
    });

    it("caps withdrawal at the smaller of deposit and reserves", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 1000 });
      // Bank only has 200 reserves
      s = bankReducer(s, { type: "WITHDRAW", borrower: "Alice", amount: 500 });
      expect(s.balances.reserve).toBe(0);
      expect(s.balances.dep_Alice).toBe(800);
    });

    it("does not affect total deposits across the system except by the withdrawn amount", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 500 });
      const totalBefore = totalDeposits(s);
      s = bankReducer(s, { type: "WITHDRAW", borrower: "Alice", amount: 100 });
      expect(totalDeposits(s)).toBe(totalBefore - 100);
    });

    it("no-ops when reserves are zero", () => {
      const before = { ...initState(), balances: { ...initState().balances, reserve: 0 } };
      const after = bankReducer(before, {
        type: "WITHDRAW",
        borrower: "Alice",
        amount: 100,
      });
      expect(after.balances.reserve).toBe(0);
    });
  });

  describe("RESET", () => {
    it("returns to INITIAL_STATE", () => {
      let s = initState();
      s = bankReducer(s, { type: "ISSUE_LOAN", borrower: "Alice", amount: 500 });
      s = bankReducer(s, { type: "DEFAULT", borrower: "Alice" });
      s = bankReducer(s, { type: "RESET" });
      expect(s.balances).toEqual(INITIAL_STATE.balances);
    });

    it("returns a fresh copy (post-reset mutation doesn't leak)", () => {
      const s = bankReducer(initState(), { type: "RESET" });
      s.balances.reserve = 1;
      const fresh = bankReducer(initState(), { type: "RESET" });
      expect(fresh.balances.reserve).toBe(200);
    });
  });

  describe("getAccountMeta", () => {
    it("resolves static accounts", () => {
      expect(getAccountMeta("reserve")?.kind).toBe("reserve");
      expect(getAccountMeta("loanGeneral")?.kind).toBe("loan");
      expect(getAccountMeta("depGen")?.kind).toBe("deposit");
      expect(getAccountMeta("equity")?.kind).toBe("equity");
    });

    it("derives dynamic loan/deposit keys from their prefix", () => {
      expect(getAccountMeta("loan_Alice")?.label).toBe("Loan · Alice");
      expect(getAccountMeta("dep_Bao")?.label).toBe("Deposit · Bao");
      expect(getAccountMeta("loan_Carla")?.side).toBe("asset");
      expect(getAccountMeta("dep_Dev")?.side).toBe("liability");
    });

    it("returns null for unknown keys", () => {
      expect(getAccountMeta("garbage")).toBeNull();
      expect(getAccountMeta("")).toBeNull();
    });
  });

  describe("reducer purity", () => {
    it("doesn't mutate the input state", () => {
      const before = initState();
      const beforeSnapshot = JSON.stringify(before);
      bankReducer(before, { type: "ISSUE_LOAN", borrower: "Alice", amount: 500 });
      expect(JSON.stringify(before)).toBe(beforeSnapshot);
    });

    it("multiple identical actions produce identical results modulo event timestamps", () => {
      const s1 = bankReducer(initState(), {
        type: "ISSUE_LOAN",
        borrower: "Alice",
        amount: 500,
      });
      const s2 = bankReducer(initState(), {
        type: "ISSUE_LOAN",
        borrower: "Alice",
        amount: 500,
      });
      expect(s1.balances).toEqual(s2.balances);
      expect(s1.loanCounter).toBe(s2.loanCounter);
    });
  });
});
