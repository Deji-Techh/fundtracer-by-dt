import React from 'react';
import { Chip, SxProps, Theme } from '@mui/material';

type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showScore?: boolean;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
}

const riskConfig: Record<RiskLevel, { label: string; color: string; bgColor: string }> = {
  safe: {
    label: 'Safe',
    color: '#16a34a',
    bgColor: '#dcfce7',
  },
  low: {
    label: 'Low Risk',
    color: '#22c55e',
    bgColor: '#f0fdf4',
  },
  medium: {
    label: 'Medium Risk',
    color: '#d97706',
    bgColor: '#fef3c7',
  },
  high: {
    label: 'High Risk',
    color: '#dc2626',
    bgColor: '#fee2e2',
  },
  critical: {
    label: 'Critical',
    color: '#991b1b',
    bgColor: '#fecaca',
  },
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  showScore = false,
  size = 'small',
  sx,
}) => {
  const config = riskConfig[level];
  const label = showScore && score !== undefined
    ? `${config.label} (${score})`
    : config.label;

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        backgroundColor: config.bgColor,
        color: config.color,
        fontWeight: 500,
        borderRadius: '4px',
        ...sx,
      }}
    />
  );
};

export default RiskBadge;
