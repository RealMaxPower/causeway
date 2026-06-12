/**
 * cb-ledger reducer — two stacked balance sheets sharing one row.
 *
 * Bank reserves at CB (cb.bankReserves) == commercial bank's reserves
 * asset (bank.reserves). Every action keeps that identity intact.
 *
 * Pure: no DOM, no module-level mutation, no globals.
 */

import type { CBAction, CBEvent, CBState, EventSegment } from "./types";

export const STEP_AMOUNT = 100; // $B per click

export const CB_INITIAL: CBState = {
  cb: {
    treasuries: 4000,
    mbs: 2500,
    gold: 100,
    fxSwaps: 100,
    currency: 2300,
    bankReserves: 3200, // shared row with bank.reserves below
    reverseRepo: 850,
    tga: 350,
  },
  bank: {
    reserves: 3200, // mirrors cb.bankReserves
    securities: 2500,
    loans: 12000,
    deposits: 15000,
    wholesale: 1000,
    equity: 1700,
  },
  pulse: {},
  events: [
    {
      t: "00:00",
      segments: [
        {
          kind: "text",
          text: "System initialised. Two issuers, two ledgers, one shared row.",
        },
      ],
    },
  ],
  step: 0,
};

function stamp(): string {
  const d = new Date();
  return `${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds(),
  ).padStart(2, "0")}`;
}

function pushEvent(state: CBState, segments: EventSegment[]): CBEvent[] {
  return [{ t: stamp(), segments }, ...state.events].slice(0, 40);
}

export function cbReducer(state: CBState, action: CBAction): CBState {
  switch (action.type) {
    case "QE": {
      // CB buys $STEP of Treasuries from the bank.
      // CB: treasuries +, bankReserves +. Bank: securities −, reserves +.
      return {
        ...state,
        cb: {
          ...state.cb,
          treasuries: state.cb.treasuries + STEP_AMOUNT,
          bankReserves: state.cb.bankReserves + STEP_AMOUNT,
        },
        bank: {
          ...state.bank,
          securities: state.bank.securities - STEP_AMOUNT,
          reserves: state.bank.reserves + STEP_AMOUNT,
        },
        pulse: {
          cb_treasuries: "new",
          cb_bankReserves: "new",
          bank_securities: "shrink",
          bank_reserves: "new",
        },
        events: pushEvent(state, [
          { kind: "action", text: "QE" },
          {
            kind: "text",
            text: ` · CB buys $${STEP_AMOUNT}B Treasuries from the bank. `,
          },
          { kind: "money-up", text: `Base money +$${STEP_AMOUNT}B.` },
          { kind: "text", text: " Broad money: " },
          { kind: "neutral", text: "unchanged" },
          { kind: "text", text: "." },
        ]),
        step: state.step + 1,
      };
    }

    case "QT": {
      if (
        state.cb.treasuries < STEP_AMOUNT ||
        state.bank.reserves < STEP_AMOUNT
      ) {
        return {
          ...state,
          pulse: {},
          events: pushEvent(state, [
            { kind: "money-down", text: "QT blocked" },
            {
              kind: "text",
              text: " — insufficient Treasuries on CB book or reserves at bank.",
            },
          ]),
          step: state.step + 1,
        };
      }
      return {
        ...state,
        cb: {
          ...state.cb,
          treasuries: state.cb.treasuries - STEP_AMOUNT,
          bankReserves: state.cb.bankReserves - STEP_AMOUNT,
        },
        bank: {
          ...state.bank,
          securities: state.bank.securities + STEP_AMOUNT,
          reserves: state.bank.reserves - STEP_AMOUNT,
        },
        pulse: {
          cb_treasuries: "shrink",
          cb_bankReserves: "shrink",
          bank_securities: "new",
          bank_reserves: "shrink",
        },
        events: pushEvent(state, [
          { kind: "action", text: "QT" },
          {
            kind: "text",
            text: ` · CB sells $${STEP_AMOUNT}B Treasuries back. `,
          },
          { kind: "money-down", text: `Base money −$${STEP_AMOUNT}B.` },
          { kind: "text", text: " Broad money: " },
          { kind: "neutral", text: "unchanged" },
          { kind: "text", text: "." },
        ]),
        step: state.step + 1,
      };
    }

    case "CASH": {
      // Customer withdraws cash. CB: currency +, bankReserves -.
      // Bank: reserves -, deposits -.
      if (
        state.bank.reserves < STEP_AMOUNT ||
        state.bank.deposits < STEP_AMOUNT
      ) {
        return {
          ...state,
          pulse: {},
          events: pushEvent(state, [
            { kind: "money-down", text: "Cash withdrawal blocked" },
            { kind: "text", text: " — insufficient reserves or deposits." },
          ]),
          step: state.step + 1,
        };
      }
      return {
        ...state,
        cb: {
          ...state.cb,
          currency: state.cb.currency + STEP_AMOUNT,
          bankReserves: state.cb.bankReserves - STEP_AMOUNT,
        },
        bank: {
          ...state.bank,
          reserves: state.bank.reserves - STEP_AMOUNT,
          deposits: state.bank.deposits - STEP_AMOUNT,
        },
        pulse: {
          cb_currency: "new",
          cb_bankReserves: "shrink",
          bank_reserves: "shrink",
          bank_deposits: "shrink",
        },
        events: pushEvent(state, [
          { kind: "action", text: "Cash withdrawal" },
          {
            kind: "text",
            text: ` · $${STEP_AMOUNT}B leaves the bank as notes. Base money: `,
          },
          { kind: "neutral", text: "unchanged" },
          {
            kind: "text",
            text: " (composition shift). Broad money: ",
          },
          { kind: "neutral", text: "unchanged" },
          {
            kind: "text",
            text: " (deposit → currency in circulation, both count).",
          },
        ]),
        step: state.step + 1,
      };
    }

    case "LOAN": {
      // Bank issues loan + matching deposit. CB does not move.
      return {
        ...state,
        bank: {
          ...state.bank,
          loans: state.bank.loans + STEP_AMOUNT,
          deposits: state.bank.deposits + STEP_AMOUNT,
        },
        pulse: { bank_loans: "new", bank_deposits: "new" },
        events: pushEvent(state, [
          { kind: "action", text: "Bank issues loan" },
          {
            kind: "text",
            text: ` · $${STEP_AMOUNT}B loan + matching deposit. Base money: `,
          },
          { kind: "neutral", text: "unchanged" },
          { kind: "text", text: ". " },
          { kind: "money-up", text: `Broad money +$${STEP_AMOUNT}B.` },
          { kind: "text", text: " The asymmetry is the point." },
        ]),
        step: state.step + 1,
      };
    }

    case "RESET":
      return structuredClone(CB_INITIAL);

    default:
      return state;
  }
}

export function initState(): CBState {
  return structuredClone(CB_INITIAL);
}
