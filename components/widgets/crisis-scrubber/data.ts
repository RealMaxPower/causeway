/**
 * Crisis-scrubber data: six-stage template applied to four reference
 * episodes. The pattern is the same; the costumes differ.
 *
 * Each episode has stages with (window, visible, underneath, tell) and
 * a metrics array with one value per stage so a per-stage bar can be
 * positioned along the path of values.
 */

export interface Stage {
  /** Calendar window for this stage (free-text). */
  window: string;
  /** What a normal observer sees at this stage. */
  visible: string;
  /** What's actually happening structurally. */
  underneath: string;
  /** The single tell that gives the stage away to someone reading the plumbing. */
  tell: string;
}

export interface Metric {
  lbl: string;
  vals: number[];
}

export interface Episode {
  name: string;
  blurb: string;
  stages: Stage[];
  metrics: Metric[];
}

export const STAGE_NAMES = [
  "Build-up",
  "Complacency",
  "Trigger",
  "Panic",
  "Contagion",
  "Intervention",
] as const;

export const EPISODES: Episode[] = [
  {
    name: "2008 · Global Financial Crisis",
    blurb:
      "US subprime mortgages → global credit freeze. The reference modern crisis.",
    stages: [
      {
        window: "2003–2006",
        visible:
          "House prices keep climbing. Homeownership at all-time highs. Wall Street earnings records.",
        underneath:
          "Mortgage credit underwriting deteriorates. Securitization pipeline produces AAA-rated debt from BBB-rated loans. Bank leverage at investment banks reaches 30:1.",
        tell: "AAA tranches yielding 80 bps over Treasuries while subprime loss models assume housing never falls nationally.",
      },
      {
        window: "early 2007",
        visible:
          "Some subprime lenders fold (New Century). Bernanke testimony: 'subprime is contained.' Markets shrug.",
        underneath:
          "ABX index of subprime CDS already moving sharply. Quant funds posting unexplained losses in August. Repo lenders quietly tighten haircuts on subprime collateral.",
        tell: "BNP Paribas freezes three funds 'because we can't price them.' That sentence is the whole crisis in one line.",
      },
      {
        window: "Aug 2007–Mar 2008",
        visible:
          "Bear Stearns hedge funds collapse. Fed cuts. Bear Stearns itself fails over a weekend. Fed-engineered rescue at $2/share.",
        underneath:
          "Repo market — the plumbing for funding $4T of bank assets overnight — fails for subprime collateral. Then for ABS. Then for everything. A bank run, but on broker-dealers.",
        tell: "Repo haircuts on AAA mortgage paper go from 1% to 25% in six months. Banks have to find $24 of new equity for every $100 of assets, immediately.",
      },
      {
        window: "Sep–Oct 2008",
        visible:
          "Lehman bankruptcy weekend. AIG nationalised. Money-market fund 'breaks the buck.' TARP debated in Congress. Stock market −40%.",
        underneath:
          "Wholesale funding markets seize for ALL counterparties, prime and subprime. Banks stop lending to each other. The plumbing isn't broken — it's gone.",
        tell: "LIBOR-OIS spread blows out from 10 bps to 360 bps. That spread is the price of distrusting your fellow banks. It had never moved like that before.",
      },
      {
        window: "Oct 2008–Mar 2009",
        visible:
          "Iceland banks fail. Eastern Europe in IMF programs. UK, Ireland, Spain in housing crashes. China announces ¥4T stimulus.",
        underneath:
          "Dollar funding shortage abroad becomes the dominant problem. Foreign banks holding dollar assets need dollars to roll their funding. The Fed swap lines become the crisis-resolution tool.",
        tell: "Fed Reserve currency swap lines peak at $580B outstanding. The global financial system has become a dollar-funding system; the Fed is its lender of last resort.",
      },
      {
        window: "Mar 2009–2012",
        visible:
          "Fed funds at 0%. QE1, QE2, QE3. Stress tests. Dodd-Frank. Eurozone crisis as second-wave aftershock.",
        underneath:
          "Bank capital rebuilds. Shadow banking shrinks. Macroprudential regulation invented. Inflation-targeting framework subtly mutates to allow above-target overshoots.",
        tell: "Fed balance sheet from $0.9T to $4.5T. The intervention works; the politics never fully recover. 'Bailout' becomes a permanent epithet.",
      },
    ],
    metrics: [
      { lbl: "Bank leverage (×)",       vals: [22, 28, 30, 32, 26, 18] },
      { lbl: "Credit spread (bps)",     vals: [70, 90, 180, 590, 800, 350] },
      { lbl: "VIX",                     vals: [12, 15, 28, 80, 60, 28] },
      { lbl: "Bank deposit growth (%)", vals: [8, 7, 4, -2, -6, 12] },
      { lbl: "Fed B/S ($T)",            vals: [0.8, 0.9, 0.9, 2.1, 2.3, 4.5] },
    ],
  },

  {
    name: "1997 · Asian Crisis",
    blurb:
      "Thailand → Indonesia → Korea. Sudden stop in emerging-market capital flows.",
    stages: [
      {
        window: "1992–1996",
        visible:
          "Asian Tiger growth story. Thailand, Korea, Indonesia growing 7-10%/yr. FDI booms. 'Asian values' literature flourishes.",
        underneath:
          "Domestic banks borrow dollars short-term, lend baht long-term to property developers. Currency-mismatch on bank balance sheets reaches catastrophic levels. Foreign-currency debt > FX reserves in several countries.",
        tell: "Thai short-term external debt = 1.5× FX reserves by mid-1996. Any reversal of capital flows is mathematically a default.",
      },
      {
        window: "early 1997",
        visible:
          "Thai property prices stall. Some finance companies fail. The baht peg holds. IMF mission says risks are manageable.",
        underneath:
          "Hedge funds (Soros and others) build large short-baht positions, smelling the fixed peg. BoT spends FX reserves defending. Foreign banks quietly stop rolling Thai bank credit lines.",
        tell: "BoT FX reserves halve in six months on undisclosed forward sales. The market doesn't know how depleted reserves really are.",
      },
      {
        window: "Jul 1997",
        visible:
          "Thailand floats the baht — 'we just couldn't defend it anymore.' Currency falls 20% in a week. Stock market crashes.",
        underneath:
          "Domestic banks now have dollar liabilities marked at a baht that has halved. They are immediately insolvent. The trigger isn't economics; it's the moment foreign creditors stop renewing.",
        tell: "Thai bank dollar liabilities revalue by 50%+ overnight. The currency move alone makes the banking system non-viable.",
      },
      {
        window: "Aug–Nov 1997",
        visible:
          "Indonesia floats. Korea hits the wall in November — a G20 economy with $200B GDP suddenly cannot roll its short-term external debt. KOSPI −50%.",
        underneath:
          "Contagion through three channels: similar policy regimes (peer countries get sold), shared creditors (banks pull credit from all EM), trade links (regional supply chains seize). Same structure as every EM crisis since.",
        tell: "Korea wakes up one morning with $4B of FX reserves and $24B of short-term debt rolling that week. That is not a recession; that is a financial accident.",
      },
      {
        window: "Dec 1997–1998",
        visible:
          "Russia defaults Aug 1998 — entirely separate country, same mechanism. LTCM blows up Sep 1998. The crisis goes global.",
        underneath:
          "Capital flight from all emerging markets indiscriminately. Brazil hit despite different fundamentals. The market re-prices EM as a single asset class.",
        tell: "EMBI+ spread (EM bonds vs Treasuries) goes from 350 bps to 1700 bps in 60 days. EM countries are temporarily un-financeable at any price.",
      },
      {
        window: "1998–2000",
        visible:
          "IMF programs in Thailand, Indonesia, Korea. Major recessions. Indonesian regime change. 'Washington consensus' under attack.",
        underneath:
          "Affected countries rebuild FX reserves obsessively (this is where the 'global savings glut' begins). Asian central banks accumulate Treasuries through the 2000s. The 2008 crisis is partly funded by this.",
        tell: "Korean FX reserves go from $9B to $440B over 25 years. 'Never again' becomes structural reserve-accumulation policy.",
      },
    ],
    metrics: [
      { lbl: "ST ext. debt / reserves", vals: [1.0, 1.5, 1.8, 2.4, 2.0, 0.6] },
      { lbl: "Currency vs USD (% peg)", vals: [100, 98, 60, 45, 50, 70] },
      { lbl: "EMBI+ spread (bps)",      vals: [350, 380, 450, 900, 1700, 750] },
      { lbl: "Real GDP growth (%)",     vals: [8, 6, 1, -7, -10, 4] },
      { lbl: "IMF lending ($B)",        vals: [0, 2, 17, 42, 60, 110] },
    ],
  },

  {
    name: "1929 · Great Depression",
    blurb:
      "Stock-market bubble → bank failures → deflation spiral. The reference catastrophe.",
    stages: [
      {
        window: "1925–1929",
        visible:
          "Stocks compound at 25%/yr. Margin loans available at 90% LTV. New industries — radio, autos, electricity. 'A permanently high plateau.'",
        underneath:
          "Margin debt reaches 10% of GDP. Bank chains in agricultural states already failing on farm debt. Fed deliberately tightens in 1928 to puncture the bubble without supporting the economy.",
        tell: "Brokers' loans grow from $1B in 1921 to $8.5B in 1929. The market is increasingly people borrowing money to buy stocks from people who borrowed money to buy stocks.",
      },
      {
        window: "early 1929",
        visible:
          "Some warning voices — Roger Babson, Paul Warburg — dismissed as bears. Fed raises rates to 6%. Market wobbles in spring, resumes climbing.",
        underneath:
          "Loan portfolios of New York banks increasingly concentrated in call loans against stocks. Industrial production peaks in June. Auto sales decline before the crash.",
        tell: "Industrial production peaks four months before the stock market does. The real economy is already turning.",
      },
      {
        window: "Oct 1929",
        visible:
          "Black Thursday Oct 24, Black Tuesday Oct 29. Market −25% in a week, −40% in a month. Margin calls cascade.",
        underneath:
          "Forced selling triggers more margin calls. Brokers seize collateral. Banks holding broker paper take losses. The shock spreads from Wall Street to bank balance sheets within weeks.",
        tell: "Margin debt is recalled; collateral is dumped at any price. The 'price' becomes whatever a forced seller will accept from a non-forced buyer — i.e. almost nothing.",
      },
      {
        window: "1930–1932",
        visible:
          "Four waves of bank failures. 9,000 banks fail. Money supply shrinks by 1/3. Unemployment to 25%. Hooverville shantytowns.",
        underneath:
          "Fed refuses to expand the monetary base — gold-standard orthodoxy. Bank failures destroy deposits, which destroys money. Prices fall 25%. Real debt burdens rise even as nominal debts shrink.",
        tell: "M2 contracts 33% from 1929-1933. This is not a recession; this is a chronic monetary haemorrhage that the central bank refuses to staunch.",
      },
      {
        window: "1931",
        visible:
          "Creditanstalt fails in Austria, May. Germany imposes capital controls. UK leaves gold standard September. World trade collapses 65%.",
        underneath:
          "The gold standard transmits deflation country-to-country. Each country exporting unemployment to others through currency policy. Smoot-Hawley tariffs make it worse.",
        tell: "Countries that leave gold in 1931 recover years earlier than those that stay. Sweden, UK out fast. France, US stay — and pay.",
      },
      {
        window: "1933–1939",
        visible:
          "FDR closes banks, ends gold convertibility, devalues dollar 40%. New Deal programs. Glass-Steagall, SEC, FDIC. Recovery — but interrupted by 1937 mini-crash.",
        underneath:
          "FDIC ends bank runs as a transmission mechanism. Devaluation makes monetary expansion possible. Fiscal policy turns. The institutional infrastructure built 1933-1935 is still load-bearing in 2026.",
        tell: "Real GDP recovers 1933-1937 at 9%/yr — fastest sustained growth in US history — once the deflation stops. The fix is monetary, not structural.",
      },
    ],
    metrics: [
      { lbl: "Margin debt / GDP (%)",  vals: [4, 7, 10, 8, 4, 1] },
      { lbl: "Stock index (1929=100)", vals: [60, 100, 70, 30, 20, 50] },
      { lbl: "Bank failures / yr",     vals: [600, 650, 800, 2300, 1500, 60] },
      { lbl: "Money supply (M2, %Δ)",  vals: [5, 1, -8, -15, -10, 8] },
      { lbl: "Unemployment (%)",       vals: [4, 3, 9, 25, 23, 14] },
    ],
  },

  {
    name: "2022 · Inflation surge",
    blurb:
      "Post-COVID stimulus + supply shocks → inflation → fastest hiking cycle in 40 years → bank failures. The reference modern monetary regime change.",
    stages: [
      {
        window: "2020–2021",
        visible:
          "$5T US fiscal + monetary stimulus. Stocks and home prices melt up. 'K-shaped recovery' chatter. Fed says inflation is transitory.",
        underneath:
          "M2 expands 40% in 18 months — biggest peacetime surge since 1942. Goods-services consumption mix dislocated by lockdowns. Global supply chains running at structural deficit. Wage growth accelerating below the radar.",
        tell: "Used-car prices up 40% YoY by mid-2021. The two-decade run of goods disinflation that the entire 2% inflation regime was built on stopped quietly in Q4 2020.",
      },
      {
        window: "late 2021–early 2022",
        visible:
          "CPI prints 7% in December 2021. Powell pivots — 'transitory' is retired. Markets pricing 3-4 Fed hikes for 2022. Russia invades Ukraine; energy spikes 30% in two weeks.",
        underneath:
          "Wage-price feedback engaging. Rent inflation locks in as new leases reset 15-20% above old ones. Long-dated breakevens drift up; the bond market quietly stops trusting the 2% anchor it had taken for granted since 1996.",
        tell: "5y breakeven inflation expectations break above 3.5% for the first time since the indexed-bond market began. The market has voted; it just hasn't told the Fed yet.",
      },
      {
        window: "Mar–Jun 2022",
        visible:
          "Fed lifts off — 25bp hike. By June, 75bp hikes are normal. CPI peaks at 9.1% in June. Headline news every month is the next inflation print.",
        underneath:
          "Real yields swing from −1% to +1% in eight months — the fastest move in real-rate territory since the Volcker years. Every long-duration asset — tech stocks, crypto, 30y bonds — is mathematically re-priced downward. The discount-rate denominator dominates everything.",
        tell: "Crypto market cap halves before the Fed even reaches neutral. Long-duration is the canary; it always dies first.",
      },
      {
        window: "Jul–Oct 2022",
        visible:
          "S&P −25%. Nasdaq −33%. 'Everything bubble' deflates. UK 'mini-budget' (Sept 23) triggers a gilt crisis; pension LDI strategies nearly fail. BOE has to step back in.",
        underneath:
          "Liability-driven investment pension funds were structurally short volatility on long gilts. The 30y gilt yield rising 100bp in a week triggered margin calls; forced selling forced more selling. The Fed and ECB watching, learning where the next break point is.",
        tell: "BOE buys gilts to stabilise a market it had been promising to shrink — three days after committing to QT. Central banks can promise tightening; markets decide whether they're allowed to deliver.",
      },
      {
        window: "Mar–May 2023",
        visible:
          "Silicon Valley Bank fails over a weekend — March 10, 2023. Signature and First Republic follow. Credit Suisse, the global SIB, gets shotgun-married to UBS. Yield curve most inverted since 1981.",
        underneath:
          "Banks loaded with low-coupon Treasuries and MBS bought at 2020-21 prices. Held-to-maturity accounting hid the losses; depositor flight forced realisation. The first interest-rate-driven bank run of the digital age — deposits left in hours, not days.",
        tell: "SVB's depositor base withdrew $42B in one day. The deposit franchise that took 40 years to build evaporated in 8 hours, coordinated on Twitter and group chats.",
      },
      {
        window: "Jun 2023–2024",
        visible:
          "Fed-Treasury creates the BTFP, lending against Treasuries at par. Hike cycle ends July 2023 at 5.25-5.50%. Inflation grinds toward 3%, then 2.5%. Equities recover. AI capex absorbs the duration repricing.",
        underneath:
          "BTFP papered over banking-sector unrealised losses without monetising the debt — clever, but introduced moral hazard. Inflation falls partly because the labor market cools, partly because base effects roll off. The 'soft landing' remains contingent on which of those persists.",
        tell: "5.25% policy rate held for 13 months without breaking anything visible. Either the lags really are longer this time, or something is still fragile and hasn't shown up yet.",
      },
    ],
    metrics: [
      { lbl: "CPI YoY (%)",            vals: [6.8, 7.5, 9.1, 7.7, 5.0, 2.6] },
      { lbl: "Fed funds (%)",          vals: [0.0, 0.25, 1.75, 4.5, 5.0, 5.25] },
      { lbl: "10y Treasury (%)",       vals: [1.5, 2.5, 3.0, 3.9, 3.5, 4.2] },
      { lbl: "S&P 500 (Jan'20=100)",   vals: [165, 152, 128, 124, 142, 190] },
      { lbl: "Bank failures / qtr",    vals: [0, 0, 0, 0, 3, 0] },
    ],
  },
];
