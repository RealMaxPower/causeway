/**
 * Bank-sandbox reducer. Pure (no DOM, no globals). The state is the entire
 * widget state; everything in the UI is derived from it.
 *
 * Architectural note: the legacy v0 widget kept a module-level `ACCOUNTS`
 * dictionary that it MUTATED inside the reducer to register dynamic loan
 * keys. That breaks under React StrictMode and RSC navigation. The fix here
 * is to derive labels and metadata at render time from the key itself — the
 * widget needs no mutable lookup table.
 */

import type {
  AccountMeta,
  BankAction,
  BankEvent,
  BankState,
  EventSegment,
} from "./types";

/** Static accounts that always exist. Dynamic per-borrower keys are derived. */
const STATIC_ACCOUNTS: Record<string, AccountMeta> = {
  reserve: { kind: "reserve", side: "asset", label: "Reserves at central bank" },
  loanGeneral: { kind: "loan", side: "asset", label: "Loan · existing book" },
  depGen: { kind: "deposit", side: "liability", label: "Deposit · existing customers" },
  equity: { kind: "equity", side: "liability", label: "Bank equity" },
};

/** Resolve any account key (static or dynamic loan_X / dep_X) to its metadata. */
export function getAccountMeta(key: string): AccountMeta | null {
  if (key in STATIC_ACCOUNTS) return STATIC_ACCOUNTS[key];
  if (key.startsWith("loan_")) {
    const borrower = key.slice("loan_".length);
    return { kind: "loan", side: "asset", label: `Loan · ${borrower}` };
  }
  if (key.startsWith("dep_")) {
    const borrower = key.slice("dep_".length);
    return { kind: "deposit", side: "liability", label: `Deposit · ${borrower}` };
  }
  return null;
}

function nowStamp(): string {
  const d = new Date();
  return `${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds(),
  ).padStart(2, "0")}`;
}

const INITIAL_EVENT: BankEvent = {
  t: "00:00",
  segments: [
    {
      kind: "text",
      text: "System initialised. Bank starts with $1,200 in deposits and $200 reserves.",
    },
  ],
};

export const INITIAL_STATE: BankState = {
  balances: {
    reserve: 200,
    loanGeneral: 1000,
    depGen: 1000,
    equity: 200,
  },
  events: [INITIAL_EVENT],
  pulse: {},
  loanCounter: 0,
};

const MAX_EVENTS = 40;

function pushEvent(state: BankState, segments: EventSegment[]): BankEvent[] {
  return [{ t: nowStamp(), segments }, ...state.events].slice(0, MAX_EVENTS);
}

export function bankReducer(state: BankState, action: BankAction): BankState {
  switch (action.type) {
    case "ISSUE_LOAN": {
      const { borrower, amount } = action;
      const loanKey = `loan_${borrower}`;
      const depKey = `dep_${borrower}`;
      const balances = { ...state.balances };
      balances[loanKey] = (balances[loanKey] || 0) + amount;
      balances[depKey] = (balances[depKey] || 0) + amount;
      return {
        ...state,
        balances,
        pulse: { [loanKey]: "new", [depKey]: "new" },
        events: pushEvent(state, [
          { kind: "text", text: "Loan issued to " },
          { kind: "borrower", text: borrower },
          { kind: "text", text: ` · $${amount}. Asset (loan) and liability (deposit) created — ` },
          { kind: "money-up", text: `money supply +$${amount}` },
          { kind: "text", text: "." },
        ]),
        loanCounter: state.loanCounter + 1,
      };
    }

    case "REPAY": {
      const { borrower, amount } = action;
      const loanKey = `loan_${borrower}`;
      const depKey = `dep_${borrower}`;
      const balances = { ...state.balances };
      const pay = Math.min(
        amount,
        balances[loanKey] || 0,
        balances[depKey] || 0,
      );
      if (pay <= 0) {
        return {
          ...state,
          pulse: {},
          events: pushEvent(state, [
            { kind: "text", text: `No outstanding loan to ${borrower}.` },
          ]),
        };
      }
      balances[loanKey] -= pay;
      balances[depKey] -= pay;
      if (balances[loanKey] === 0) delete balances[loanKey];
      if (balances[depKey] === 0) delete balances[depKey];
      return {
        ...state,
        balances,
        pulse: { [loanKey]: "shrink", [depKey]: "shrink" },
        events: pushEvent(state, [
          { kind: "borrower", text: borrower },
          { kind: "text", text: ` repaid $${pay}. Both loan and deposit shrink — ` },
          { kind: "money-down", text: `money supply −$${pay}` },
          { kind: "text", text: "." },
        ]),
      };
    }

    case "DEFAULT": {
      const { borrower } = action;
      const loanKey = `loan_${borrower}`;
      const balances = { ...state.balances };
      const lost = balances[loanKey] || 0;
      if (lost <= 0) {
        return {
          ...state,
          pulse: {},
          events: pushEvent(state, [
            { kind: "text", text: `Nothing to default on for ${borrower}.` },
          ]),
        };
      }
      delete balances[loanKey];
      balances.equity = (balances.equity || 0) - lost;
      return {
        ...state,
        balances,
        pulse: { [loanKey]: "shrink", equity: "shrink" },
        events: pushEvent(state, [
          { kind: "borrower", text: borrower },
          { kind: "text", text: ` defaulted on $${lost}. Loan written off; ` },
          { kind: "money-down", text: `equity −$${lost}` },
          { kind: "text", text: ". Bank takes the loss." },
        ]),
      };
    }

    case "WITHDRAW": {
      const { borrower, amount } = action;
      const depKey = `dep_${borrower}`;
      const balances = { ...state.balances };
      const have = balances[depKey] || 0;
      const take = Math.min(amount, have, balances.reserve || 0);
      if (take <= 0) {
        return {
          ...state,
          pulse: {},
          events: pushEvent(state, [
            {
              kind: "text",
              text: "Cannot withdraw — insufficient deposits or bank reserves.",
            },
          ]),
        };
      }
      balances[depKey] -= take;
      balances.reserve -= take;
      if (balances[depKey] === 0) delete balances[depKey];
      return {
        ...state,
        balances,
        pulse: { [depKey]: "shrink", reserve: "shrink" },
        events: pushEvent(state, [
          { kind: "borrower", text: borrower },
          { kind: "text", text: ` withdrew $${take} cash. Reserves drained.` },
        ]),
      };
    }

    case "RESET":
      return structuredClone(INITIAL_STATE);

    default:
      return state;
  }
}

/** Build a fresh starting state for useReducer's initializer. */
export function initState(): BankState {
  return structuredClone(INITIAL_STATE);
}
