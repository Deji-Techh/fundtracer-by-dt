import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

interface CardProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, sx, className }) => {
  return (
    <Box
      className={className}
      sx={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e5e5',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

export default Card;
