export const formatNumber = (num: number, decimals: number = 2): string => {
  if (num === 0) return '0';
  if (num < 0.01) return num.toExponential(2);
  if (num < 1) return num.toFixed(decimals);
  if (num < 1000) return num.toFixed(decimals);
  if (num < 1000000) return (num / 1000).toFixed(decimals) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(decimals) + 'M';
  return (num / 1000000000).toFixed(decimals) + 'B';
};

export const formatAddress = (address: string, chars: number = 6): string => {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

export const formatDate = (timestamp: number | string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTime = (timestamp: number | string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
