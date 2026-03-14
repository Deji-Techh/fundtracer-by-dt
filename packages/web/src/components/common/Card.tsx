import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

interface CardProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
  elevation?: 'low' | 'medium' | 'high';
}

const elevationStyles = {
  low: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)',
  medium: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
  high: '0 10px 25px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.1)',
};

export const Card: React.FC<CardProps> = ({ children, sx, className, elevation = 'low' }) => {
  return (
    <Box
      className={className}
      sx={{
        backgroundColor: 'var(--color-bg-elevated, #ffffff)',
        borderRadius: '12px',
        border: '1px solid var(--color-border, #e5e5e5)',
        padding: '24px',
        boxShadow: elevationStyles[elevation],
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        '&:hover': elevation !== 'low' ? {
          boxShadow: elevationStyles[elevation === 'high' ? 'high' : 'medium'],
        } : {},
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default Card;
