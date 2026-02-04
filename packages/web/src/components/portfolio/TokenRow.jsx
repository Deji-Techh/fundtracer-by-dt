import React, { useMemo } from 'react';

function TokenLogo({ symbol, logoUrl, isNative, chainColor }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        className="w-10 h-10 rounded-full"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
      style={{ backgroundColor: chainColor || '#2a2a2a' }}
    >
      {isNative ? 'Ξ' : symbol?.substring(0, 2) || '??'}
    </div>
  );
}

export function TokenRow({ token, onClick }) {
  const balance = useMemo(() => {
    return parseFloat(token.balance) / Math.pow(10, token.decimals || 18);
  }, [token.balance, token.decimals]);

  const value = useMemo(() => {
    return balance * (token.price || 0);
  }, [balance, token.price]);

  const formatUSD = (val) => {
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(2)}K`;
    return `$${val.toFixed(2)}`;
  };

  const formatBalance = (bal) => {
    if (bal >= 1e6) return `${(bal / 1e6).toFixed(2)}M`;
    if (bal >= 1e3) return `${(bal / 1e3).toFixed(2)}K`;
    return bal.toFixed(bal < 1 ? 6 : 4);
  };

  const explorerUrl = useMemo(() => {
    const chainConfigs = {
      ethereum: 'https://etherscan.io',
      arbitrum: 'https://arbiscan.io',
      linea: 'https://lineascan.build',
      base: 'https://basescan.org',
      optimism: 'https://optimistic.etherscan.io',
      polygon: 'https://polygonscan.com',
      bsc: 'https://bscscan.com',
    };
    const baseUrl = chainConfigs[token.chainId];
    if (!baseUrl) return null;
    return token.address === '0x0000000000000000000000000000000000000000'
      ? `${baseUrl}/address/${token.address}`
      : `${baseUrl}/token/${token.address}`;
  }, [token.chainId, token.address]);

  return (
    <tr
      className="border-b border-[#1a1a1a] hover:bg-[#0f0f0f] cursor-pointer transition-colors"
      onClick={() => onClick?.(token)}
    >
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <TokenLogo
            symbol={token.symbol}
            logoUrl={token.logoUrl}
            isNative={token.isNative}
            chainColor={token.chainColor}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{token.symbol}</span>
              {token.isNative && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                  Native
                </span>
              )}
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-400"
              onClick={(e) => e.stopPropagation()}
            >
              {token.chainName}
            </a>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="text-white">{formatBalance(balance)}</div>
        <div className="text-xs text-gray-500">{token.symbol}</div>
      </td>
      <td className="py-4 px-4 text-right">
        <div className="text-white">{formatUSD(value)}</div>
        {token.change24h !== undefined && (
          <div className={`text-xs ${token.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
          </div>
        )}
      </td>
      <td className="py-4 px-4">
        <div
          className="w-16 h-8 rounded"
          style={{
            backgroundColor: token.chainColor || '#2a2a2a',
            opacity: 0.3,
          }}
        />
      </td>
    </tr>
  );
}

export default TokenRow;
