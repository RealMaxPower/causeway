/**
 * Causeway · canonical track + node data.
 *
 * Ported from the v0 prototype's tracks-data.jsx (which mutated window.TRACKS).
 * Single source of truth for the sidenav, track map, and any non-MDX
 * surface that needs the catalogue.
 *
 * Each concept node has a matching MDX file at content/nodes/<id>.mdx.
 * Bespoke-widget mapping lives inside the MDX (via direct imports),
 * not here, so this module stays content-pure.
 */

export type NodeStatus = "ready" | "drafted";
export type TrackLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export interface ConceptNode {
  id: string;
  title: string;
  pocket: string;
  time: string;
  /** Port state: is the MDX/component shipped (ready) or still pocket-only (drafted)? */
  status: NodeStatus;
  /**
   * Topic state, orthogonal to port state. Set on nodes whose underlying
   * economics is genuinely contested in the literature — the page is shipped
   * but the question isn't settled (e.g. G4 AI/automation, G5 CBDCs).
   */
  topicContested?: boolean;
  /** Marked as a recommended starting point within the track. */
  star?: boolean;
}

export interface Track {
  letter: TrackLetter;
  name: string;
  /** Short label used in the sidenav. */
  short: string;
  title: string;
  scope: string;
  why: string;
  nodes: ConceptNode[];
}

export const TRACK_ORDER: TrackLetter[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

export const TRACKS: Record<TrackLetter, Track> = {
  A: {
    letter: "A",
    name: "Foundations",
    short: "Money",
    title: "Money: what it actually is",
    scope:
      "Six nodes building the floor: what money is, who issues it, what gives it value, and why dollars are not just one currency among many.",
    why: "Most macro arguments fail because the participants are using the same words for different things. Track A fixes the vocabulary so every later argument has a chance.",
    nodes: [
      {
        id: "A1",
        title: "Why money exists",
        pocket:
          "Barter is a myth — there's no archaeological record of a society that ran on it. Debt and credit came first. Money emerged later as a unit for measuring obligations to the temple, the king, and each other. Knowing this changes how you read every monetary debate.",
        time: "5 min",
        status: "ready",
      },
      {
        id: "A2",
        title: "Three jobs of money",
        pocket:
          "Money is three jobs in one object: medium of exchange, unit of account, store of value. The same dollar bill is doing all three; most monetary debates are really debates about which job the system should optimise for.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "A3",
        title: "How banks create money",
        pocket:
          "When a bank issues a loan, it doesn't lend out a saver's deposit — it writes a new deposit into your account. Money is created by the act of lending and destroyed by the act of repayment.",
        time: "13 min",
        status: "ready",
        star: true,
      },
      {
        id: "A4",
        title: "Central banks & the base",
        pocket:
          "Two issuers exist in modern economies: the central bank (currency + bank reserves — the 'monetary base') and commercial banks (deposits, the money you actually spend). Most money is the second kind. This is the single most surprising fact in monetary economics for non-specialists.",
        time: "11 min",
        status: "ready",
        star: true,
      },
      {
        id: "A5",
        title: "Inflation & deflation",
        pocket:
          "Inflation isn't 'prices going up' — it's the unit of account losing purchasing power across a basket. Deflation is the same arrow reversed, and is more dangerous than inflation because debt burdens grow against falling nominal income. Two honest economists can disagree about whether either is happening because they're disagreeing about the basket.",
        time: "10 min",
        status: "ready",
      },
      {
        id: "A6",
        title: "Currency & the dollar",
        pocket:
          "The dollar smiles: it rallies when the US does exceptionally well AND when the world does exceptionally badly, only weakening in the boring middle. Every EM crisis since the 1980s is also a strong-dollar event. Knowing which side of the smile you're on predicts most global stress.",
        time: "12 min",
        status: "ready",
        star: true,
      },
    ],
  },

  B: {
    letter: "B",
    name: "Markets",
    short: "Markets & prices",
    title: "Markets & prices",
    scope:
      "Four nodes on prices as a coordination mechanism — and the cases where they get it wrong.",
    why: "Markets are the most studied human institution. Track B is the minimum viable model — enough to think about whether a given market is doing its job.",
    nodes: [
      {
        id: "B1",
        title: "Supply and demand, properly",
        pocket:
          "Not 'two crossing lines.' Supply and demand are two distributions of willingness — to sell, to buy — meeting at a price that clears the most desperate of each. Re-derive it once and you'll never read a price the same way.",
        time: "6 min",
        status: "ready",
        star: true,
      },
      {
        id: "B2",
        title: "Price as information",
        pocket:
          "A price compresses millions of distributed decisions into one number. That's its magic. It is also why prices fail when distributed decisions are bad — bubbles, panics, and externalities.",
        time: "6 min",
        status: "ready",
        star: true,
      },
      {
        id: "B3",
        title: "When markets fail",
        pocket:
          "Externalities, public goods, asymmetric information, market power. The four canonical failure modes. Real-world failures are usually combinations of all four.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "B4",
        title: "What clears markets when prices can't",
        pocket:
          "Queues, rationing, relationships, status, regulation. Every economy has some markets and some non-market clearing. Knowing which is which prevents a lot of bad arguments.",
        time: "6 min",
        status: "ready",
      },
    ],
  },

  C: {
    letter: "C",
    name: "Macro",
    short: "The macroeconomy",
    title: "The macroeconomy",
    scope:
      "Five nodes on the aggregate: the cycle, employment, inflation, and the rate-setting machinery.",
    why: "The macroeconomy is what you experience as 'the economy.' Track C lets you read it instead of having opinions about it.",
    nodes: [
      {
        id: "C1",
        title: "GDP, properly",
        pocket:
          "GDP measures market activity, sliced three ways — production, expenditure, income — that have to come out equal. It is the agreed-upon scoreboard, not a measure of welfare. Once you see the lenses, every macro debate becomes legible.",
        time: "5 min",
        status: "ready",
        star: true,
      },
      {
        id: "C2",
        title: "The business cycle",
        pocket:
          "Booms end because they exhaust their own preconditions — too much credit, too tight a labor market, too elevated asset prices. The recession that follows is the system reverting to a sustainable state, painfully.",
        time: "13 min",
        status: "ready",
        star: true,
      },
      {
        id: "C3",
        title: "Unemployment, three ways",
        pocket:
          "Frictional, structural, cyclical. Only the third one responds to demand stimulus. Mistaking one for another is how policy makes recessions worse.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "C4",
        title: "Inflation regimes",
        pocket:
          "Demand-pull, cost-push, expectations-driven, fiscal-dominant. Same headline number, four different causes, four different cures. Knowing which one you're in is the whole game.",
        time: "10 min",
        status: "ready",
      },
      {
        id: "C5",
        title: "Rates as the price of time",
        pocket:
          "A central bank changes one number — the policy rate. Treasuries, mortgages, credit, equities, the dollar, jobs, prices all respond — but at different speeds. The 'long and variable lags' are the whole story.",
        time: "10 min",
        status: "ready",
      },
    ],
  },

  D: {
    letter: "D",
    name: "Trade",
    short: "Trade & capital",
    title: "Trade & capital",
    scope:
      "Five nodes on the cross-border economy — goods, money, technology, and the political fight over all three.",
    why: "Most arguments about trade are emotional because the gains are diffuse and the losses are concentrated. Track D makes the trade-offs concrete.",
    nodes: [
      {
        id: "D1",
        title: "Comparative advantage — and the modern critiques",
        pocket:
          "Ricardo's argument is correct under tight assumptions that real economies often violate. The textbook version is right; the policy debates are about whether the assumptions hold.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "D2",
        title: "Balance of payments without tears",
        pocket:
          "Every country's external accounts must balance to zero, by accounting identity. Trade deficits are matched by capital surpluses. 'We are running a trade deficit' and 'we are receiving foreign investment' are the same sentence.",
        time: "10 min",
        status: "ready",
        star: true,
      },
      {
        id: "D3",
        title: "Supply chains as financial structures",
        pocket:
          "A modern supply chain isn't just goods moving — it's working capital, trade credit, and inventory finance. Disruptions are usually credit events that look like physical events.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "D4",
        title: "Capital flows & sudden stops",
        pocket:
          "Foreign money rushes in for years, then flips. The reversal — the 'sudden stop' — is the canonical script of emerging-market crises since 1994. Recognising the diagnostics (CA deficit, short-term FX debt, reserve cover) is the entire alarm system.",
        time: "10 min",
        status: "ready",
        star: true,
      },
      {
        id: "D5",
        title: "Tariffs and industrial policy",
        pocket:
          "A tariff is a tax on your own consumers paid to defend your own producers. Whether that's smart depends entirely on which producers and over what time horizon — i.e. it is a political choice, not an economic one.",
        time: "6 min",
        status: "ready",
      },
    ],
  },

  E: {
    letter: "E",
    name: "Institutions",
    short: "Fiscal & institutions",
    title: "Fiscal & institutions",
    scope:
      "Five nodes on government finance and the supra-national plumbing — the debt-sustainability math, central banks compared, Bretton Woods, reserve currencies, sanctions.",
    why: "Fiscal arithmetic and institutional power are the two halves of how states act on the economy. Track E covers both.",
    nodes: [
      {
        id: "E1",
        title: "Fiscal basics",
        pocket:
          "Debt/GDP follows one equation: it grows by r − g, plus the primary deficit. When growth beats interest, debt erodes; when interest beats growth, debt compounds. Three knobs, thirty years, the whole drama of public finance.",
        time: "7 min",
        status: "ready",
        star: true,
      },
      {
        id: "E2",
        title: "Central banks compared",
        pocket:
          "The Fed, ECB, BoE, BoJ, PBoC have very different mandates, governance, tools, and audiences. Treating them as equivalent is the most common error in commentary.",
        time: "7 min",
        status: "ready",
      },
      {
        id: "E3",
        title: "The Bretton Woods siblings",
        pocket:
          "IMF (lender of last resort), World Bank (development finance), BIS (central bankers' central bank), WTO (rules). Built in 1944 for a world that no longer exists; still running it anyway.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "E4",
        title: "Reserve currencies — what makes one",
        pocket:
          "Liquidity, rule of law, deep capital markets, and the willingness of the issuer to run external deficits. Few currencies meet all four. The dollar is the only one that meets all four overwhelmingly.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "E5",
        title: "Sanctions architecture",
        pocket:
          "Modern sanctions are a feature of dollar-clearing infrastructure. Every cross-border dollar transaction touches a US bank, which makes US sanctions globally enforceable in a way no other country's are.",
        time: "6 min",
        status: "ready",
      },
    ],
  },

  F: {
    letter: "F",
    name: "Crises",
    short: "Cycles & crises",
    title: "Cycles & crises",
    scope:
      "Four nodes on what breaks. One general anatomy, and three replayable case studies. Plus 1929, 1970s, 1997, 2020, 2022 as deep-dive expansions.",
    why: "Crises feel obvious in retrospect and incomprehensible in the moment. Track F builds the muscle to see them while they're happening.",
    nodes: [
      {
        id: "F1",
        title: "Anatomy of a crisis",
        pocket:
          "Same template every time: leverage build-up, complacency, trigger, panic, contagion, intervention, blame. The names change; the structure doesn't.",
        time: "5 min",
        status: "ready",
        star: true,
      },
      {
        id: "F2",
        title: "Replay 2008",
        pocket:
          "Aug 2007 → Mar 2009, month by month. Compare what was visible to a normal observer to what was happening underneath that almost nobody could see.",
        time: "11 min",
        status: "ready",
        star: true,
      },
      {
        id: "F3",
        title: "Bubble detection",
        pocket:
          "You can't reliably call the top, but you can size leverage, valuation, and credit growth. Bubbles are visible as risk; the timing is the part that's unknowable.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "F4",
        title: "Debt cycles, long and short",
        pocket:
          "Short cycles run on credit (5–8y); long cycles run on debt levels (50–75y). The first is what monetary policy responds to. The second is what restructures or inflates eventually, regardless of policy.",
        time: "6 min",
        status: "ready",
      },
    ],
  },

  G: {
    letter: "G",
    name: "Frontier",
    short: "Modern frontier",
    title: "The modern frontier",
    scope:
      "Five nodes on the live arguments — what's contested right now and likely to matter for the next decade.",
    why: "Every track ends in a place where reasonable people disagree. Track G is where Causeway is honest about what's not settled.",
    nodes: [
      {
        id: "G1",
        title: "Inequality, properly",
        pocket:
          "Inequality is a shape, not a number. The Lorenz curve sketches the shape — how much of the income the bottom 50% earn, the top 10%, the top 1%. The Gini compresses it into one digit and hides which slice is doing the inequality. Two countries can share a Gini and need opposite policies.",
        time: "10 min",
        status: "ready",
        star: true,
      },
      {
        id: "G6",
        title: "Trade policy as a macro variable",
        pocket:
          "Tariffs aren't a step change, they're a band. A 10% MFN is rounding; a 60% MFN is a different regime. Read with reshoring capex and the bipartisan continuity of the toolkit (Section 301, IRA, CHIPS, export controls), trade policy is a durable macro variable — not an episode.",
        time: "9 min",
        status: "ready",
      },
      {
        id: "G2",
        title: "Energy transition as macro shock",
        pocket:
          "A cleaner energy system is also a more capital-intensive one — front-loaded investment, back-loaded payoff. That's an inflation profile, not a deflation profile, regardless of which side you're rooting for.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "G3",
        title: "Demographics is destiny (slowly)",
        pocket:
          "Aging is the slowest-moving variable in macro and the most predictable. It pushes labor up, savings up, real rates down, fiscal stress up. The whole world is getting older; the rates are different.",
        time: "6 min",
        status: "ready",
      },
      {
        id: "G4",
        title: "AI and labor",
        pocket:
          "The honest answer: nobody knows. The dishonest answers come from anyone with a confident number. Track G holds the disagreement up to the light instead of resolving it.",
        time: "6 min",
        status: "ready",
        topicContested: true,
      },
      {
        id: "G5",
        title: "Digital money: CBDCs, stablecoins, the rest",
        pocket:
          "The technical debate is small. The political debate — who can program your money, who can see your transactions, who can confiscate them — is enormous and largely under-discussed.",
        time: "6 min",
        status: "ready",
        topicContested: true,
      },
    ],
  },

  H: {
    letter: "H",
    name: "Leverage",
    short: "Leverage in your life",
    title: "Leverage in your life",
    scope:
      "Eight nodes — the point of the rest. Read the regime; decide on housing, savings, career, big purchases, currency, debt, portfolio.",
    why: "Tracks A–G are scaffolding. Track H is the building. Every node here is a real decision macro can either help or hurt — never settle.",
    nodes: [
      {
        id: "H1",
        title: "Reading the regime",
        pocket:
          "Four orthogonal axes — inflation, money, labor, credit — combine into a regime read. Three of four agreeing is high-confidence; two is a turning point. The dashboard updates daily.",
        time: "11 min",
        status: "ready",
        star: true,
      },
      {
        id: "H2",
        title: "Saving in this regime",
        pocket:
          "There is no asset that always wins. Stocks dominate in disinflationary booms; long bonds in disinflationary downturns; gold and commodities in stagflation. Cash never dominates; it survives. The 2022 lesson: 60/40 fails when both halves are wrong for the regime at once.",
        time: "11 min",
        status: "ready",
        star: true,
      },
      {
        id: "H3",
        title: "Housing as a financial decision",
        pocket:
          "Your fixed-rate mortgage is itself an asset. Selling to chase a lower rate elsewhere usually destroys more value than it creates. Refinance windows reopen on a 3–5y cadence.",
        time: "13 min",
        status: "ready",
        star: true,
      },
      {
        id: "H4",
        title: "Career, by sector cyclicality",
        pocket:
          "Knowledge work, finance, autos, construction, healthcare, public sector — each runs on its own clock. Negotiating leverage is highest just before your sector's hiring cycle turns.",
        time: "9 min",
        status: "ready",
      },
      {
        id: "H5",
        title: "Big-ticket purchases & their financing",
        pocket:
          "List price moves slowly; dealer incentives and financing rates move fast. Watch the second pair, not the first.",
        time: "9 min",
        status: "ready",
      },
      {
        id: "H6",
        title: "Currency exposure you didn't know you had",
        pocket:
          "Foreign trips, foreign assets, foreign-denominated income. Hedging is cheap when the dollar is strong; expensive when it's weak. Most people do it backwards.",
        time: "9 min",
        status: "ready",
      },
      {
        id: "H7",
        title: "Debt, used well",
        pocket:
          "Borrowing against an appreciating asset at a fixed real rate is one of the most powerful tools available to a normal household — and the most overused, on the wrong assets.",
        time: "10 min",
        status: "ready",
      },
      {
        id: "H8",
        title: "Portfolio under regime change",
        pocket:
          "Duration is your single biggest portfolio dial. Extending duration into a cuts cycle is the canonical late-cycle move; doing it too early is the canonical mistake. Stagger.",
        time: "10 min",
        status: "ready",
      },
      {
        id: "H9",
        title: "Crypto in a real portfolio",
        pocket:
          "Two honest readings of bitcoin coexist: a tail-risk asset (no cashflow, regulation-killable, 80%-drawdown-prone) and a reserve-asset candidate (fixed supply, network effects, dollar-debasement hedge). Sizing differs by an order of magnitude. The right allocation depends on which reading you believe — and what happens to the portfolio if you're wrong.",
        time: "13 min",
        status: "ready",
        topicContested: true,
      },
    ],
  },
};

/** Look up a node by id across all tracks. Returns null if not found. */
export function findNode(
  id: string,
): { node: ConceptNode; track: Track } | null {
  for (const letter of TRACK_ORDER) {
    const track = TRACKS[letter];
    const node = track.nodes.find((n) => n.id === id);
    if (node) return { node, track };
  }
  return null;
}

/** All node ids in track-major order — useful for static params and prev/next. */
export function allNodeIds(): string[] {
  return TRACK_ORDER.flatMap((l) => TRACKS[l].nodes.map((n) => n.id));
}

/** Total count of concept nodes across all tracks. */
export const TOTAL_NODES = allNodeIds().length;
