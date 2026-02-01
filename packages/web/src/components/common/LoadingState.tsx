import React from 'react';

interface LoadingStateProps {
  type?: 'card' | 'table' | 'chart' | 'text';
  count?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  type = 'card', 
  count = 1 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            padding: '24px',
            marginBottom: '16px',
          }}>
            <div className="skeleton" style={{ height: '24px', width: '40%', marginBottom: '16px' }} />
            <div className="skeleton" style={{ height: '16px', width: '100%', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '16px', width: '80%' }} />
          </div>
        );
      
      case 'table':
        return (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            overflow: 'hidden',
          }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                padding: '16px', 
                borderBottom: '1px solid #f3f4f6',
                gap: '16px',
              }}>
                <div className="skeleton" style={{ height: '16px', width: '25%' }} />
                <div className="skeleton" style={{ height: '16px', width: '25%' }} />
                <div className="skeleton" style={{ height: '16px', width: '25%' }} />
                <div className="skeleton" style={{ height: '16px', width: '25%' }} />
              </div>
            ))}
          </div>
        );
      
      case 'chart':
        return (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            padding: '24px',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div className="skeleton" style={{ height: '80%', width: '90%' }} />
          </div>
        );
      
      case 'text':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton" style={{ height: '16px', width: '100%' }} />
            <div className="skeleton" style={{ height: '16px', width: '80%' }} />
            <div className="skeleton" style={{ height: '16px', width: '60%' }} />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </>
  );
};

export default LoadingState;
