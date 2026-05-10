import React from 'react';
import { formatCurrencyPK } from '../../utils/pkFormat';

export const BalanceCard = ({ balance = 0, customerCode, name }) => {
  const isDebt = balance > 0;
  const isCleared = balance === 0;

  return (
    <div className="customer-balance-card">
      <div className="cbc-top">
        <div className="cbc-meta">
          <div className="cbc-code">{customerCode}</div>
          {name ? <div className="cbc-name">{name}</div> : null}
        </div>
        <div className="cbc-status" aria-hidden>
          {isCleared ? '✓' : isDebt ? '●' : '●'}
        </div>
      </div>

      <div className="cbc-value" data-testid="balance-amount">{formatCurrencyPK(Math.abs(balance))}</div>

      <div className={`cbc-note ${isCleared ? 'cleared' : isDebt ? 'debt' : 'credit'}`}>
        {isCleared ? 'Account cleared' : isDebt ? 'Amount due' : 'Credit balance'}
      </div>
    </div>
  );
};