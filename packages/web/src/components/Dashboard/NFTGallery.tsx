import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

interface NFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  imageUrl?: string;
  collectionName?: string;
}

interface NFTGalleryProps {
  nfts: NFT[];
  loading?: boolean;
}

export const NFTGallery: React.FC<NFTGalleryProps> = ({ nfts, loading }) => {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '24px' 
      }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ 
            backgroundColor: 'var(--color-text-primary)', 
            borderRadius: '8px', 
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}>
            <div className="skeleton" style={{ width: '100%', height: '200px' }} />
            <div style={{ padding: '16px' }}>
              <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '14px', width: '60%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div style={{ 
        padding: '48px 24px', 
        textAlign: 'center', 
        color: 'var(--color-text-secondary)',
        backgroundColor: 'var(--color-text-primary)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
      }}>
        No NFTs found in this wallet
      </div>
    );
  }

  return (
    <>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: isMobile ? '12px' : '24px' 
      }}>
        {nfts.map((nft, index) => (
          <div 
            key={`${nft.contractAddress}-${nft.tokenId}`}
            style={{ 
              backgroundColor: 'var(--color-text-primary)', 
              borderRadius: '8px', 
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onClick={() => setSelectedNFT(nft)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* NFT Image */}
            <div style={{ 
              width: '100%', 
              height: '200px', 
              backgroundColor: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {nft.imageUrl ? (
                <img 
                  src={nft.imageUrl} 
                  alt={nft.name}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                  }}
                  loading="lazy"
                />
              ) : (
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                }}>
                  🖼️
                </div>
              )}
            </div>

            {/* NFT Info */}
            <div style={{ padding: '16px' }}>
              <div style={{ 
                fontWeight: 600, 
                color: '#111827',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {nft.name || `NFT #${nft.tokenId}`}
              </div>
              <div style={{ 
                fontSize: '0.875rem', 
                color: 'var(--color-text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {nft.collectionName || 'Unknown Collection'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for selected NFT */}
      {selectedNFT && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: isMobile ? 0 : '24px',
          }}
          onClick={() => setSelectedNFT(null)}
        >
          <div 
            style={{
              backgroundColor: 'var(--color-text-primary)',
              borderRadius: isMobile ? '16px 16px 0 0' : '16px',
              maxWidth: isMobile ? '100%' : '600px',
              width: '100%',
              maxHeight: isMobile ? '85vh' : '90vh',
              overflow: 'auto',
              padding: isMobile ? '20px' : '32px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '100%',
              height: isMobile ? '250px' : '400px',
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: isMobile ? '16px' : '24px',
            }}>
              {selectedNFT.imageUrl ? (
                <img 
                  src={selectedNFT.imageUrl} 
                  alt={selectedNFT.name}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    borderRadius: '12px',
                  }}
                />
              ) : (
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                }}>
                  🖼️
                </div>
              )}
            </div>

            <h2 style={{ margin: '0 0 8px 0', color: '#111827' }}>
              {selectedNFT.name || `NFT #${selectedNFT.tokenId}`}
            </h2>
            <p style={{ margin: '0 0 16px 0', color: 'var(--color-text-muted)' }}>
              {selectedNFT.collectionName || 'Unknown Collection'}
            </p>

            <div style={{
              padding: isMobile ? '12px' : '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              color: 'var(--color-text-muted)',
              wordBreak: 'break-all',
            }}>
              <div>Contract: {selectedNFT.contractAddress}</div>
              <div>Token ID: {selectedNFT.tokenId}</div>
            </div>

            <button
              onClick={() => setSelectedNFT(null)}
              style={{
                marginTop: isMobile ? '16px' : '24px',
                width: '100%',
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                minHeight: 44,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default NFTGallery;
