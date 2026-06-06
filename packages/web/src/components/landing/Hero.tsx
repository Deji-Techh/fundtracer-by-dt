import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bot, Check, Circle, Copy, FileText, Shield, Table2, Users } from 'lucide-react';
import './Hero.css';

const rotatingPhrases = [
  'Blockchain intelligence for every wallet you investigate.',
  'Trace funding flows before they disappear.',
  'Find sybil clusters across wallets, contracts, and chains.',
  'Bring AI investigation rooms into your team workflow.',
  'Turn on-chain noise into evidence you can act on.',
];

const terminalLines = [
  { text: '$ fundtracer analyze 0x742d...5b2a --chain ethereum', tone: 'command' },
  { text: '▸ read labels, balances, counterparties', tone: 'muted' },
  { text: '▸ trace funding tree depth=4', tone: 'muted' },
  { text: '◆ risk score 82/100', tone: 'warning' },
  { text: '✓ source cluster: Binance hot wallet → bridge → 7 wallets', tone: 'ok' },
  { text: '✓ pinned summary to room "Treasury Investigation"', tone: 'ok' },
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
  const [lineIndex, setLineIndex] = useState(1);
  const [roomCursor, setRoomCursor] = useState(3);

  useEffect(() => {
    const phraseTimer = window.setInterval(() => {
      setPhraseIndex(current => (current + 1) % rotatingPhrases.length);
    }, 5000);
    const terminalTimer = window.setInterval(() => {
      setLineIndex(current => (current >= terminalLines.length ? 1 : current + 1));
    }, 1400);
    const roomTimer = window.setInterval(() => {
      setRoomCursor(current => (current >= roomStream.length ? 3 : current + 1));
    }, 1700);
    return () => {
      window.clearInterval(phraseTimer);
      window.clearInterval(terminalTimer);
      window.clearInterval(roomTimer);
    };
  }, []);

  const visibleTerminalLines = useMemo(() => terminalLines.slice(0, lineIndex), [lineIndex]);
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

        <article className="ft-preview-card ft-preview-card--terminal">
          <div className="ft-terminal__chrome">
            <span />
            <span />
            <span />
            <small>fundtracer/main</small>
            <button aria-label="Copy terminal command"><Copy size={14} /></button>
          </div>
          <div className="ft-terminal__body" aria-live="polite">
            {visibleTerminalLines.map(line => (
              <code key={line.text} className={`is-${line.tone}`}>{line.text}</code>
            ))}
            <span className="ft-terminal__cursor" />
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
