import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  Circle,
  Copy,
  Database,
  FileText,
  GitBranch,
  Radar,
  Shield,
  Table2,
  Users,
} from 'lucide-react';
import './Hero.css';

const rotatingPhrases = [
  'Blockchain intelligence for every wallet you investigate.',
  'Trace funding flows before they disappear.',
  'Find sybil clusters across wallets, contracts, and chains.',
  'Bring AI investigation rooms into your team workflow.',
  'Turn on-chain noise into evidence you can act on.',
];

const consoleSteps = [
  { label: 'Resolve labels', detail: 'CEX tags, chain history, first funder', status: 'done' },
  { label: 'Trace funding depth=4', detail: 'Ethereum to Arbitrum bridge route', status: 'done' },
  { label: 'Score counterparties', detail: 'risk 82 / 100 from 6 signals', status: 'active' },
  { label: 'Draft evidence note', detail: 'room pin and export package ready', status: 'queued' },
];

const consoleEntities = [
  ['Binance hot wallet', 'Source', '18 txs', 'confirmed'],
  ['Stargate bridge', 'Bridge', '2 hops', 'matched'],
  ['0xd8dA...6045', 'Wallet', 'risk 82', 'review'],
  ['Arbitrum cluster', 'Cluster', '7 wallets', 'linked'],
];

const consoleFindings = [
  'Shared first funder appears across seed and seven linked wallets.',
  'Bridge route is compressed into a 19 minute transaction window.',
  'Counterparty reuse detected across Ethereum, Base, and Arbitrum.',
  'Evidence package pinned to Treasury Investigation.',
];

const roomStream: Array<{
  from: string;
  body: string;
  kind: 'left' | 'right' | 'ai' | 'system' | 'table';
  rows?: Array<[string, string, string]>;
}> = [
  { from: 'Mira', body: 'Pinned seed wallet and last 30 incoming transfers.', kind: 'left' },
  { from: 'Deji', body: '@ai summarize the funding risk', kind: 'right' },
  { from: 'FundTracer AI', body: 'Elevated. Shared source, tight timing, and one bridge route.', kind: 'ai' },
  {
    from: 'FundTracer AI',
    body: 'Top linked entities',
    kind: 'table',
    rows: [
      ['Binance hot', '18 txs', 'source'],
      ['Stargate', '2 hops', 'bridge'],
      ['0xd8dA...6045', 'risk 82', 'wallet'],
    ],
  },
  { from: 'Kemi', body: 'New scan added: 0xd8dA...6045 on Base.', kind: 'left' },
  { from: 'Deji', body: '@ai compare it with the seed wallet', kind: 'right' },
  { from: 'FundTracer AI', body: 'Match found. Same first funder and contract interaction window.', kind: 'ai' },
  { from: 'Room event', body: 'Evidence note pinned. Route: seed → CEX → bridge → cluster.', kind: 'system' },
  { from: 'Mira', body: 'Bridge hop confirmed from Ethereum to Arbitrum.', kind: 'left' },
  { from: 'Deji', body: '@ai draft the evidence note', kind: 'right' },
  { from: 'FundTracer AI', body: 'Evidence note ready. Funding route has 4 hops and 2 known entities.', kind: 'ai' },
];

export function Hero() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [consoleIndex, setConsoleIndex] = useState(1);
  const [roomCursor, setRoomCursor] = useState(3);

  useEffect(() => {
    const phraseTimer = window.setInterval(() => {
      setPhraseIndex(current => (current + 1) % rotatingPhrases.length);
    }, 5000);
    const consoleTimer = window.setInterval(() => {
      setConsoleIndex(current => (current >= consoleSteps.length ? 1 : current + 1));
    }, 1500);
    const roomTimer = window.setInterval(() => {
      setRoomCursor(current => (current >= roomStream.length ? 3 : current + 1));
    }, 1700);
    return () => {
      window.clearInterval(phraseTimer);
      window.clearInterval(consoleTimer);
      window.clearInterval(roomTimer);
    };
  }, []);

  const activeConsoleSteps = useMemo(() => consoleSteps.slice(0, consoleIndex), [consoleIndex]);
  const currentFinding = consoleFindings[(consoleIndex - 1 + consoleFindings.length) % consoleFindings.length];
  const visibleRoomMessages = useMemo(() => roomStream.slice(Math.max(0, roomCursor - 5), roomCursor), [roomCursor]);

  return (
    <section className="ft-hero">
      <div className="ft-hero__eyebrow">
        <span>New</span>
        Rooms, MCP, API, and wallet forensics in one investigation layer
        <ArrowRight size={14} />
      </div>

      <h1 key={phraseIndex} className="ft-hero__title">
        {rotatingPhrases[phraseIndex]}
      </h1>

      <p className="ft-hero__copy">
        Trace funding sources, detect sybil clusters, inspect contracts, and collaborate in AI-powered
        investigation rooms without leaving your workflow.
      </p>

      <div className="ft-hero__actions">
        <a href="/auth?mode=signup" className="ft-button ft-button--primary">
          Try for free <ArrowRight size={16} />
        </a>
        <a href="/api-docs" className="ft-button ft-button--secondary">
          View API
        </a>
      </div>

      <div className="ft-product-board" aria-label="FundTracer product previews">
        <article className="ft-preview-card ft-preview-card--room">
          <div className="ft-preview-card__header">
            <span><Users size={15} /> Investigation room</span>
            <small>live</small>
          </div>
          <div className="ft-room-meta">
            <span>case: Seed funding review</span>
            <span>members: 4</span>
          </div>
          <div className="ft-room-stream">
            {visibleRoomMessages.map((message, index) => (
              <div
                key={`${roomCursor}-${index}-${message.body}`}
                className={`ft-room-event is-animated is-${message.kind}`}
              >
                {message.kind === 'table' ? (
                  <div className="ft-room-table">
                    <div className="ft-room-table__title">
                      <Table2 size={14} />
                      <span>{message.body}</span>
                    </div>
                    {message.rows?.map(row => (
                      <div className="ft-room-table__row" key={row.join('-')}>
                        <strong>{row[0]}</strong>
                        <span>{row[1]}</span>
                        <em>{row[2]}</em>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {message.kind === 'ai' && <Bot size={14} />}
                    {message.kind === 'system' && <FileText size={14} />}
                    <span>{message.body}</span>
                  </>
                )}
              </div>
            ))}
            <div className="ft-room-typing" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="ft-room-footer">
            <span><Circle size={8} fill="currentColor" /> {roomStream[(roomCursor + 1) % roomStream.length].from} typing</span>
            <span>3 pins</span>
          </div>
        </article>

        <article className="ft-preview-card ft-preview-card--terminal ft-investigation-console">
          <div className="ft-terminal__chrome">
            <span />
            <span />
            <span />
            <small>fundtracer/main</small>
            <button aria-label="Copy terminal command"><Copy size={14} /></button>
          </div>
          <div className="ft-console__body" aria-live="polite">
            <div className="ft-console__command">
              <code>$ fundtracer analyze 0x742d...5b2a --chain ethereum</code>
              <span className="ft-terminal__cursor" />
            </div>

            <div className="ft-console__grid">
              <div className="ft-console__steps">
                <div className="ft-console__section-title">
                  <Radar size={14} />
                  <span>Trace run</span>
                  <small>{Math.round((consoleIndex / consoleSteps.length) * 100)}%</small>
                </div>
                {consoleSteps.map((step, index) => {
                  const state = index < consoleIndex ? step.status : 'queued';
                  return (
                    <div className={`ft-console-step is-${state}`} key={step.label}>
                      <i>{String(index + 1).padStart(2, '0')}</i>
                      <div>
                        <strong>{step.label}</strong>
                        <span>{step.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ft-console__summary">
                <div>
                  <span>Risk</span>
                  <strong>82</strong>
                  <em>high</em>
                </div>
                <div>
                  <span>Route</span>
                  <strong>4</strong>
                  <em>hops</em>
                </div>
                <div>
                  <span>Cluster</span>
                  <strong>7</strong>
                  <em>wallets</em>
                </div>
              </div>
            </div>

            <div className="ft-console__route" aria-label="Funding route preview">
              {['Seed', 'Binance hot', 'Stargate', 'Arbitrum cluster'].map((hop, index) => (
                <React.Fragment key={hop}>
                  <span className={index < consoleIndex ? 'is-lit' : undefined}>
                    <GitBranch size={13} />
                    {hop}
                  </span>
                  {index < 3 && <i />}
                </React.Fragment>
              ))}
            </div>

            <div className="ft-console__table">
              <div className="ft-console__section-title">
                <Database size={14} />
                <span>Entities</span>
                <small>live labels</small>
              </div>
              {consoleEntities.map((row, index) => (
                <div className={index < consoleIndex ? 'is-visible' : undefined} key={row.join('-')}>
                  <strong>{row[0]}</strong>
                  <span>{row[1]}</span>
                  <span>{row[2]}</span>
                  <em>{row[3]}</em>
                </div>
              ))}
            </div>

            <div className="ft-console__finding" key={currentFinding}>
              <FileText size={15} />
              <span>{currentFinding}</span>
            </div>

            <div className="ft-console__footer">
              <span>{activeConsoleSteps.length} checks complete</span>
              <strong>Pinned to Treasury Investigation</strong>
            </div>
          </div>
        </article>

        <article className="ft-preview-card ft-preview-card--evidence">
          <div className="ft-preview-card__header">
            <span><FileText size={15} /> Evidence package</span>
            <small>confidence 94%</small>
          </div>
          <div className="ft-evidence">
            <div className="ft-evidence__summary">
              <div>
                <span>case</span>
                <strong>Seed funding review</strong>
              </div>
              <div>
                <span>risk</span>
                <strong>82 / 100</strong>
              </div>
              <div>
                <span>route</span>
                <strong>4 hops</strong>
              </div>
            </div>
            <div className="ft-evidence__route">
              {['Seed wallet', 'Binance hot', 'Stargate', 'Arbitrum cluster'].map((item, index) => (
                <span key={item} style={{ ['--delay' as string]: `${index * 180}ms` }}>
                  <em>{String(index + 1).padStart(2, '0')}</em>
                  {item}
                </span>
              ))}
            </div>
            <div className="ft-evidence__table">
              <div><span>Shared source</span><strong>Binance hot wallet</strong><small>18 txs</small></div>
              <div><span>Bridge hop</span><strong>Stargate to Arbitrum</strong><small>2 hops</small></div>
              <div><span>Cluster match</span><strong>7 linked wallets</strong><small>94%</small></div>
            </div>
          </div>
          <div className="ft-signal-list">
            <span><Check size={14} /> Shared first funder</span>
            <span><Shield size={14} /> High-risk source path</span>
            <span><FileText size={14} /> Evidence note ready</span>
          </div>
        </article>
      </div>
    </section>
  );
}

export default Hero;
