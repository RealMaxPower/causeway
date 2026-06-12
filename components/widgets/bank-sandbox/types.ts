/** Bank-sandbox shared types. */

export type AccountSide = "asset" | "liability";
export type AccountKind = "reserve" | "loan" | "deposit" | "equity";

export interface AccountMeta {
  kind: AccountKind;
  side: AccountSide;
  label: string;
}

/** Tagged segment for the event log — colour-coded without dangerouslySetInnerHTML. */
export type EventSegment =
  | { kind: "text"; text: string }
  | { kind: "borrower"; text: string }
  | { kind: "money-up"; text: string }
  | { kind: "money-down"; text: string };

export interface BankEvent {
  /** Timestamp string like "12:34". */
  t: string;
  segments: EventSegment[];
}

export interface BankState {
  balances: Record<string, number>;
  events: BankEvent[];
  /** Map of account key → pulse animation hint for one render. */
  pulse: Record<string, "new" | "shrink">;
  /** Monotonically increasing counter so each loan is a fresh "session". */
  loanCounter: number;
}

export type BankAction =
  | { type: "ISSUE_LOAN"; borrower: string; amount: number }
  | { type: "REPAY"; borrower: string; amount: number }
  | { type: "DEFAULT"; borrower: string }
  | { type: "WITHDRAW"; borrower: string; amount: number }
  | { type: "RESET" };
