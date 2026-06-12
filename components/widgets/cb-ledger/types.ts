export type EventSegment =
  | { kind: "text"; text: string }
  | { kind: "action"; text: string }
  | { kind: "money-up"; text: string }
  | { kind: "money-down"; text: string }
  | { kind: "neutral"; text: string };

export interface CBEvent {
  t: string;
  segments: EventSegment[];
}

export interface CBState {
  cb: {
    treasuries: number;
    mbs: number;
    gold: number;
    fxSwaps: number;
    currency: number;
    bankReserves: number;
    reverseRepo: number;
    tga: number;
  };
  bank: {
    reserves: number;
    securities: number;
    loans: number;
    deposits: number;
    wholesale: number;
    equity: number;
  };
  pulse: Record<string, "new" | "shrink">;
  events: CBEvent[];
  step: number;
}

export type CBAction =
  | { type: "QE" }
  | { type: "QT" }
  | { type: "CASH" }
  | { type: "LOAN" }
  | { type: "RESET" };
