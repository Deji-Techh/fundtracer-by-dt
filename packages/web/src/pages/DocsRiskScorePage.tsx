/**
 * WalletRiskScorePage - Risk score documentation
 * Documentation page for /docs/wallet-risk-score
 */

import React from 'react';
import { AlertTriangle, TrendingUp, Shield, CheckCircle } from 'lucide-react';
import { DocsPage } from './DocsPage';

const sections = [
  { id: 'overview', title: 'Overview' },
  { id: 'methodology', title: 'Methodology' },
  { id: 'risk-factors', title: 'Risk Factors' },
  { id: 'interpretation', title: 'Interpreting Scores' },
];

export function WalletRiskScorePage() {
  return (
    <DocsPage
      title="Wallet Risk Score"
      description="Understand how FundTracer calculates risk scores for wallet addresses."
      sections={sections}
    >
      <h2 id="overview">Overview</h2>
      <p>
        The Wallet Risk Score is a numerical assessment (0-100) that indicates the risk level 
        associated with a wallet address. It helps identify potentially suspicious or 
        high-risk wallets before transactions.
      </p>

      <h2 id="methodology">Methodology</h2>
      <p>
        The risk score is calculated using a multi-factor approach:
      </p>
      <ul>
        <li>Transaction pattern analysis</li>
        <li>Interaction history with known entities</li>
        <li>Funding source analysis</li>
        <li>Behavioral clustering</li>
        <li>Contract interaction patterns</li>
      </ul>

      <h2 id="risk-factors">Risk Factors</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <h4><AlertTriangle size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />High Risk Indicators</h4>
          <p>Interaction with mixers, newly deployed contracts, or known scam addresses.</p>
        </div>
        <div className="feature-card">
          <h4><TrendingUp size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Activity Patterns</h4>
          <p>Unusual transaction timing, same-block transactions, or automated patterns.</p>
        </div>
        <div className="feature-card">
          <h4><Shield size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Positive Indicators</h4>
          <p>Long history, interaction with reputable protocols, CEX deposits.</p>
        </div>
        <div className="feature-card">
          <h4><CheckCircle size={16} style={{marginRight: 8, verticalAlign: 'middle'}} />Verification</h4>
          <p>Verified identities, labeled entities, and known DeFi protocols.</p>
        </div>
      </div>

      <h2 id="interpretation">Interpreting Scores</h2>
      <table>
        <thead>
          <tr>
            <th>Score</th>
            <th>Risk Level</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>80-100</td>
            <td>Critical</td>
            <td>Avoid transactions. Further investigation required.</td>
          </tr>
          <tr>
            <td>60-79</td>
            <td>High</td>
            <td>Exercise caution. Verify source of funds.</td>
          </tr>
          <tr>
            <td>40-59</td>
            <td>Medium</td>
            <td>Standard precautions recommended.</td>
          </tr>
          <tr>
            <td>0-39</td>
            <td>Low</td>
            <td>Standard risk. Generally safe to proceed.</td>
          </tr>
        </tbody>
      </table>
    </DocsPage>
  );
}

export default WalletRiskScorePage;
