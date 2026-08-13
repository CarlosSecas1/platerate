"use client";

import { useEffect, useMemo, useState } from "react";

type EstimateInput = {
  followers: number;
  engagementRate: number;
  deliverables: number;
  platform: string;
  videoType: string;
  usageRights: string;
  exclusivity: string;
  travel: boolean;
};

type Estimate = {
  low: number;
  high: number;
  midpoint: number;
  expectedViews: number;
  confidence: string;
};

type PricingBreakdown = {
  creatorFee: number;
  productionFee: number;
  platformFactor: number;
  videoFactor: number;
  deliverableFactor: number;
  rightsFactor: number;
  exclusivityFactor: number;
  travelFee: number;
};

type CreatorComparison = {
  id: string;
  name: string;
  platform: string;
  followers: number;
  engagementRate: number;
  low: number;
  high: number;
  midpoint: number;
  expectedViews: number;
};

type YouTubeCreator = {
  id: string;
  title: string;
  handle: string;
  thumbnail: string;
  subscribers: number | null;
};

const platformLabels: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };
const videoLabels: Record<string, string> = { mention: "quick mention", dedicated: "dedicated video", visit: "on-site visit video" };
const rightsLabels: Record<string, string> = { organic: "creator-channel use only", ninety: "90 days of paid-ad usage", perpetual: "perpetual brand usage" };
const exclusivityLabels: Record<string, string> = { none: "no category exclusivity", thirty: "30 days of category exclusivity", ninety: "90 days of category exclusivity" };

function getPricingBreakdown(input: EstimateInput): PricingBreakdown & { expectedViews: number } {
  const platformFactor: Record<string, number> = { instagram: 1, tiktok: 0.9, youtube: 1.55 };
  const videoFactor: Record<string, number> = { mention: 0.65, dedicated: 1, visit: 1.35 };
  const rightsFactor: Record<string, number> = { organic: 1, ninety: 1.35, perpetual: 1.85 };
  const exclusivityFactor: Record<string, number> = { none: 1, thirty: 1.2, ninety: 1.45 };
  const expectedViews = Math.max(500, input.followers * Math.min(0.65, 0.08 + input.engagementRate / 100 * 4.2));
  const creatorFee = Math.max(180, expectedViews * 0.035);
  const productionFee = input.videoType === "visit" ? 350 : 175;
  return {
    expectedViews,
    creatorFee,
    productionFee,
    platformFactor: platformFactor[input.platform] || 1,
    videoFactor: videoFactor[input.videoType] || 1,
    deliverableFactor: 1 + (input.deliverables - 1) * 0.62,
    rightsFactor: rightsFactor[input.usageRights] || 1,
    exclusivityFactor: exclusivityFactor[input.exclusivity] || 1,
    travelFee: input.travel ? 250 : 0,
  };
}

function calculateEstimate(input: EstimateInput): Estimate {
  const details = getPricingBreakdown(input);
  const subtotal = (details.creatorFee + details.productionFee) * details.platformFactor *
    details.videoFactor * details.deliverableFactor * details.rightsFactor *
    details.exclusivityFactor + details.travelFee;
  const low = Math.round((subtotal * 0.82) / 50) * 50;
  const high = Math.round((subtotal * 1.25) / 50) * 50;
  return { low, high, midpoint: Math.round(((low + high) / 2) / 50) * 50, expectedViews: Math.round(details.expectedViews), confidence: "Planning estimate" };
}

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const compact = (value: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export default function Home() {
  const [input, setInput] = useState<EstimateInput>({ followers: 50000, engagementRate: 4, deliverables: 1, platform: "instagram", videoType: "dedicated", usageRights: "organic", exclusivity: "none", travel: false });
  const [followerCount, setFollowerCount] = useState("50000");
  const estimate = useMemo(() => calculateEstimate(input), [input]);
  const [animated, setAnimated] = useState(estimate);
  const [creatorHandle, setCreatorHandle] = useState("");
  const [creator, setCreator] = useState<YouTubeCreator | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [comparisonName, setComparisonName] = useState("");
  const [comparisons, setComparisons] = useState<CreatorComparison[]>([]);
  const [messageCopied, setMessageCopied] = useState(false);
  const breakdown = useMemo(() => getPricingBreakdown(input), [input]);
  const negotiationMessage = useMemo(() => {
    const recipient = creator?.title || comparisonName.trim() || "there";
    const deliverable = `${input.deliverables} ${videoLabels[input.videoType]}${input.deliverables > 1 ? "s" : ""}`;
    const visitNote = input.travel ? " The offer also accounts for travel to the restaurant." : "";
    return `Hi ${recipient}, I’m reaching out from our restaurant about a paid collaboration. We’d like to propose ${deliverable} on ${platformLabels[input.platform]} for a target fee of ${money(animated.midpoint)}. This includes ${rightsLabels[input.usageRights]} and ${exclusivityLabels[input.exclusivity]}.${visitNote} Please let us know if this scope works for you—we’re happy to discuss the details.`;
  }, [animated.midpoint, comparisonName, creator, input]);

  useEffect(() => {
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_PRICING_API || "http://127.0.0.1:8000"}/api/estimate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Pricing service unavailable");
        setAnimated(await response.json());
      } catch (error) {
        if ((error as Error).name !== "AbortError") setAnimated(estimate);
      }
    }, 120);
    return () => { window.clearTimeout(id); controller.abort(); };
  }, [estimate, input]);

  useEffect(() => {
    const closeHelpPanels = (except?: HTMLDetailsElement) => {
      document.querySelectorAll<HTMLDetailsElement>(".field-title details[open]").forEach((panel) => {
        if (panel !== except) panel.removeAttribute("open");
      });
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const openPanel = document.querySelector<HTMLDetailsElement>(".field-title details[open]");
      if (openPanel && !openPanel.contains(target)) closeHelpPanels();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeHelpPanels();
    };
    const handleToggle = (event: Event) => {
      const panel = event.target;
      if (panel instanceof HTMLDetailsElement && panel.open && panel.matches(".field-title details")) closeHelpPanels(panel);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("toggle", handleToggle, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("toggle", handleToggle, true);
    };
  }, []);

  const update = (key: keyof EstimateInput, value: string | number | boolean) => setInput((current) => ({ ...current, [key]: value }));

  const lookupCreator = async () => {
    const handle = creatorHandle.trim();
    if (!handle) { setLookupState("error"); setLookupMessage("Enter a YouTube handle first."); return; }
    setLookupState("loading");
    setLookupMessage("");
    setCreator(null);
    try {
      const response = await fetch(`/api/youtube?handle=${encodeURIComponent(handle)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn’t find that channel.");
      setCreator(data);
      setComparisonName(data.title);
      setLookupState("success");
      if (data.subscribers !== null) {
        setInput((current) => ({ ...current, platform: "youtube", followers: data.subscribers }));
        setFollowerCount(String(data.subscribers));
        setLookupMessage("Subscriber count added to your estimate.");
      } else {
        setLookupMessage("This creator hides their subscriber count. Enter it manually if you know it.");
      }
    } catch (error) {
      setLookupState("error");
      setLookupMessage((error as Error).message);
    }
  };

  const addComparison = () => {
    if (comparisons.length >= 3) return;
    const name = comparisonName.trim() || creator?.title || `${platformLabels[input.platform]} creator ${comparisons.length + 1}`;
    setComparisons((current) => [...current, {
      id: `${Date.now()}-${current.length}`,
      name,
      platform: input.platform,
      followers: input.followers,
      engagementRate: input.engagementRate,
      low: animated.low,
      high: animated.high,
      midpoint: animated.midpoint,
      expectedViews: animated.expectedViews,
    }]);
    setComparisonName("");
  };

  const copyNegotiationMessage = async () => {
    await navigator.clipboard?.writeText(negotiationMessage);
    setMessageCopied(true);
    window.setTimeout(() => setMessageCopied(false), 1800);
  };

  return (
    <main>
      <nav className="nav wrap">
        <a className="brand" href="#top" aria-label="PlateRate home"><span>PR</span> PlateRate</a>
        <a className="nav-link" href="#method">How it works</a>
      </nav>

      <section className="hero wrap" id="top">
        <div className="eyebrow"><span /> CREATOR PRICING, MADE CLEAR</div>
        <h1>Know what a food<br />creator is <em>worth.</em></h1>
        <p>Build a fair, data-informed offer for your next restaurant promotion—in under a minute.</p>
      </section>

      <section className="calculator wrap" aria-label="Influencer price calculator">
        <div className="form-panel">
          <div className="panel-heading"><span>01</span><div><h2>Creator details</h2><p>Tell us about their audience and the campaign.</p></div></div>

          <div className="creator-lookup">
            <div className="lookup-heading"><div><span>AUTOFILL FROM YOUTUBE</span><p>Enter a channel handle to add its public subscriber count.</p></div><i>OPTIONAL</i></div>
            <div className="lookup-row"><div className="handle-input"><b>@</b><input aria-label="YouTube creator handle" placeholder="creatorhandle" value={creatorHandle.replace(/^@/, "")} onChange={(e) => { setCreatorHandle(e.target.value); setLookupState("idle"); setCreator(null); }} onKeyDown={(e) => { if (e.key === "Enter") lookupCreator(); }} /></div><button type="button" onClick={lookupCreator} disabled={lookupState === "loading"}>{lookupState === "loading" ? "Finding…" : "Find creator"}</button></div>
            {creator && <div className="creator-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={creator.thumbnail} alt="" />
              <div><strong>{creator.title}</strong><span>{creator.handle} · {creator.subscribers === null ? "Subscribers hidden" : `${compact(creator.subscribers)} subscribers`}</span></div>
              <b aria-label="Creator found">✓</b>
            </div>}
            {lookupMessage && <p className={`lookup-message ${lookupState}`}>{lookupMessage}</p>}
            <div className="roadmap-note"><span aria-hidden="true">↗</span><p><strong>More creator lookups are in development.</strong> Instagram and TikTok support are coming next. For now, enter their metrics manually below.</p></div>
          </div>

          <div className="field-grid">
            <label className="field"><span>Platform</span><select value={input.platform} onChange={(e) => { update("platform", e.target.value); if (e.target.value !== "youtube") { setCreator(null); setLookupState("idle"); } }}><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option></select></label>
            <label className="field"><span>Follower count</span><div className="input-suffix"><input type="number" inputMode="numeric" min="1000" max="10000000" step="1000" value={followerCount} onChange={(e) => { const value = e.target.value; setFollowerCount(value); if (value !== "" && Number.isFinite(Number(value))) update("followers", Math.min(10000000, Math.max(1, Number(value)))); }} onBlur={() => { const value = Math.min(10000000, Math.max(1000, Number(followerCount) || 1000)); setFollowerCount(String(value)); update("followers", value); }} /><b>followers</b></div></label>
            <div className="field engagement-field">
              <div className="field-title"><label htmlFor="engagement-rate">Average engagement rate</label><details><summary aria-label="Explain engagement rate">What&apos;s this?</summary><div className="help-popover"><strong>How engaged is their audience?</strong><p>It&apos;s the percentage of followers who typically like, comment, save, or share a post.</p><code>Average interactions ÷ followers × 100</code><p className="help-example">Example: 2,000 interactions ÷ 50,000 followers = 4%</p></div></details></div>
              <div className="input-suffix"><input id="engagement-rate" type="number" min="0.1" max="30" step="0.1" value={input.engagementRate} onChange={(e) => update("engagementRate", Number(e.target.value))} /><b>%</b></div>
              <small className="field-help">Not sure? Leave it at 4% as a general planning estimate.</small>
            </div>
            <label className="field"><span>Number of videos</span><select value={input.deliverables} onChange={(e) => update("deliverables", Number(e.target.value))}><option value="1">1 video</option><option value="2">2 videos</option><option value="3">3 videos</option><option value="4">4 videos</option></select></label>
          </div>

          <div className="divider" />
          <div className="section-label">VIDEO SCOPE</div>
          <div className="choice-row">
            {[['mention','Quick mention','Short integration'],['dedicated','Dedicated video','Full creator feature'],['visit','On-site visit','Filmed at restaurant']].map(([value,title,desc]) => <button key={value} className={input.videoType === value ? "choice active" : "choice"} onClick={() => update("videoType", value)}><b>{title}</b><span>{desc}</span></button>)}
          </div>

          <div className="field-grid secondary">
            <div className="field">
              <div className="field-title"><label htmlFor="usage-rights">Usage rights</label><details><summary aria-label="Explain usage rights">What&apos;s this?</summary><div className="help-popover scope-help"><strong>Where can you reuse the video?</strong><p>Usage rights determine whether the video stays on the creator&apos;s account or can also be used by your restaurant.</p><ul><li><b>Creator&apos;s channels:</b> no paid advertising.</li><li><b>90-day paid ads:</b> advertise with it for 90 days.</li><li><b>Perpetual use:</b> reuse it indefinitely.</li></ul><p className="help-example">More usage usually means a higher creator fee.</p></div></details></div>
              <select id="usage-rights" value={input.usageRights} onChange={(e) => update("usageRights", e.target.value)}><option value="organic">Creator&apos;s channels only</option><option value="ninety">90-day paid ads</option><option value="perpetual">Perpetual brand use</option></select>
            </div>
            <div className="field">
              <div className="field-title"><label htmlFor="exclusivity">Category exclusivity</label><details><summary aria-label="Explain category exclusivity">What&apos;s this?</summary><div className="help-popover scope-help"><strong>Can they promote competitors?</strong><p>Exclusivity is a period when the creator agrees not to promote competing restaurants or food businesses.</p><ul><li><b>None:</b> they may promote competitors.</li><li><b>30 or 90 days:</b> they avoid agreed-upon competitors during that period.</li></ul><p className="help-example">Longer exclusivity costs more because it limits other sponsorships.</p></div></details></div>
              <select id="exclusivity" value={input.exclusivity} onChange={(e) => update("exclusivity", e.target.value)}><option value="none">None</option><option value="thirty">30 days</option><option value="ninety">90 days</option></select>
            </div>
          </div>
          <label className="check"><input type="checkbox" checked={input.travel} onChange={(e) => update("travel", e.target.checked)} /><span /> Creator travels to the restaurant</label>
        </div>

        <aside className="result-panel" aria-live="polite">
          <div className="result-top"><span>YOUR ESTIMATE</span><i>LIVE</i></div>
          <p className="result-kicker">Recommended offer range</p>
          <div className="price">{money(animated.low)} <small>—</small> {money(animated.high)}</div>
          <p className="result-copy">A fair range for this campaign based on audience size, engagement and scope.</p>
          <div className="range"><span style={{ width: `${Math.min(92, Math.max(28, input.engagementRate * 8))}%` }} /></div>
          <div className="metrics"><div><span>SWEET SPOT</span><b>{money(animated.midpoint)}</b></div><div><span>EST. VIEWS</span><b>{compact(animated.expectedViews)}</b></div></div>
          <div className="offer-box"><span>OUR TAKE</span><p>Start near <strong>{money(animated.midpoint)}</strong>. You have room to negotiate, but protect the creator&apos;s production time and audience value.</p></div>
          <button className="copy-button" onClick={() => navigator.clipboard?.writeText(`Suggested creator offer: ${money(animated.low)}–${money(animated.high)} (target ${money(animated.midpoint)})`)}>Copy offer summary</button>
          <p className="fineprint">Estimate only. Final fees vary by creator, market and production needs.</p>
        </aside>
      </section>

      <section className="decision-tools wrap" aria-label="Offer planning tools">
        <div className="section-heading">
          <span>NEXT STEPS</span>
          <h2>Understand it. Compare it. Send it.</h2>
          <p>Turn the estimate into a decision you can explain and an offer you can confidently make.</p>
        </div>

        <div className="tool-grid">
          <article className="tool-card breakdown-card">
            <div className="tool-card-heading"><span>02</span><div><h3>Why this price?</h3><p>See what moves the estimate up or down.</p></div></div>
            <div className="breakdown-list">
              <div><span>Audience &amp; estimated reach</span><b>{money(breakdown.creatorFee)}</b></div>
              <div><span>Production base</span><b>{money(breakdown.productionFee)}</b></div>
              <div><span>{platformLabels[input.platform]} platform</span><b>×{breakdown.platformFactor.toFixed(2)}</b></div>
              <div><span>{videoLabels[input.videoType]}</span><b>×{breakdown.videoFactor.toFixed(2)}</b></div>
              <div><span>{input.deliverables} video{input.deliverables > 1 ? "s" : ""}</span><b>×{breakdown.deliverableFactor.toFixed(2)}</b></div>
              <div><span>Usage rights</span><b>×{breakdown.rightsFactor.toFixed(2)}</b></div>
              <div><span>Category exclusivity</span><b>×{breakdown.exclusivityFactor.toFixed(2)}</b></div>
              {breakdown.travelFee > 0 && <div><span>On-site travel allowance</span><b>+{money(breakdown.travelFee)}</b></div>}
            </div>
            <p className="tool-note">The final range adds flexibility for negotiation, market differences, and production complexity.</p>
          </article>

          <article className="tool-card message-card">
            <div className="tool-card-heading"><span>03</span><div><h3>Start the conversation</h3><p>Use a clear offer that defines the scope.</p></div></div>
            <label className="mini-field"><span>Creator name or @handle</span><input value={comparisonName} onChange={(e) => setComparisonName(e.target.value)} placeholder="e.g. Maya or @foodwithmaya" /></label>
            <textarea readOnly value={negotiationMessage} aria-label="Generated negotiation message" />
            <button className="primary-action" type="button" onClick={copyNegotiationMessage}>{messageCopied ? "Copied to clipboard ✓" : "Copy negotiation message"}</button>
          </article>
        </div>
      </section>

      <section className="comparison-section wrap" aria-label="Creator comparison">
        <div className="comparison-heading">
          <div><span>CREATOR SHORTLIST</span><h2>Compare up to three offers.</h2><p>Adjust the calculator, name the creator above, then save each scenario here.</p></div>
          <button className="primary-action" type="button" onClick={addComparison} disabled={comparisons.length >= 3}>+ Add current estimate</button>
        </div>
        {comparisons.length === 0 ? (
          <div className="comparison-empty"><b>No creators saved yet.</b><span>Your first saved estimate will appear here.</span></div>
        ) : (
          <div className="comparison-grid">
            {comparisons.map((item) => {
              const cpm = item.midpoint / item.expectedViews * 1000;
              const lowestCpm = Math.min(...comparisons.map((candidate) => candidate.midpoint / candidate.expectedViews * 1000));
              return <article className="comparison-card" key={item.id}>
                <button className="remove-comparison" type="button" aria-label={`Remove ${item.name}`} onClick={() => setComparisons((current) => current.filter((candidate) => candidate.id !== item.id))}>×</button>
                <span className="platform-pill">{platformLabels[item.platform]}</span>
                <h3>{item.name}</h3>
                <div className="comparison-price">{money(item.low)}–{money(item.high)}</div>
                <dl>
                  <div><dt>Followers</dt><dd>{compact(item.followers)}</dd></div>
                  <div><dt>Engagement</dt><dd>{item.engagementRate}%</dd></div>
                  <div><dt>Est. views</dt><dd>{compact(item.expectedViews)}</dd></div>
                  <div><dt>Est. cost / 1K views</dt><dd>{money(cpm)}</dd></div>
                </dl>
                {cpm === lowestCpm && comparisons.length > 1 && <p className="value-badge">Lowest estimated cost per 1K views</p>}
              </article>;
            })}
          </div>
        )}
        <p className="comparison-disclaimer">Cost per 1,000 views is a planning comparison—not a guarantee of performance or sales.</p>
      </section>

      <section className="method wrap" id="method">
        <div className="method-intro"><span>WHAT SHAPES YOUR ESTIMATE</span><h2>A fair offer starts with the full picture.</h2><p>PlateRate looks at the creator&apos;s audience, the work you&apos;re requesting, and how your restaurant plans to use the content.</p></div>
        <div className="method-grid">
          <article><span className="method-icon" aria-hidden="true">◎</span><div><small>THEIR AUDIENCE</small><h3>How many people could they reach?</h3><p>Follower count and engagement help estimate how many viewers may genuinely see and interact with the promotion.</p></div></article>
          <article><span className="method-icon" aria-hidden="true">▶</span><div><small>THE CONTENT</small><h3>What are you asking them to create?</h3><p>A quick mention takes less work than a dedicated video or an on-site restaurant visit. More videos also increase the fee.</p></div></article>
          <article><span className="method-icon" aria-hidden="true">◇</span><div><small>YOUR USE OF THE VIDEO</small><h3>What happens after it&apos;s posted?</h3><p>Paid advertising, long-term reuse, and asking the creator to avoid competitors add business value—and usually cost more.</p></div></article>
        </div>
      </section>
      <footer className="wrap"><a className="brand" href="#top"><span>PR</span> PlateRate</a><p>Built for independent restaurants and hospitality teams.</p></footer>
    </main>
  );
}
