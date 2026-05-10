'use strict';

const { Document, Table, TableRow, TableCell, Paragraph, AlignmentType, VerticalAlign, BorderStyle } = require('docx');
const Transaction = require('../models/Transaction');
const CustomerProfile = require('../models/CustomerProfile');

const PK_TIMEZONE = 'Asia/Karachi';

// ─── FORMATTING UTILITIES ──────────────────────────────────────────────────

const fmtDate = (value) => new Date(value).toLocaleDateString('en-PK', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: PK_TIMEZONE,
});

const fmtDateTime = (value) =>
  new Date(value).toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: PK_TIMEZONE,
  });

const money = (value) => `Rs ${Number(value || 0).toLocaleString('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const amountText = (value) => Number(value || 0).toLocaleString('en-PK', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const rateText = (value) => Number(value || 0).toLocaleString('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qty = (value) => Number(value || 0).toLocaleString('en-PK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qtyInt = (value) => Number(value || 0).toLocaleString('en-PK', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ─── COLOR SCHEME ──────────────────────────────────────────────────────────
const colors = {
  primary: 'E8312B',      // Professional Red
  secondary: '2C3E50',    // Dark Blue-Gray
  accent: '27AE60',       // Professional Green
  lightGray: 'ECF0F1',    // Light Gray
  darkText: '2C3E50',     // Dark Text
  lightText: '7F8C8D',    // Light Gray Text
  tableHeader: 'E8312B',  // Red Header
  border: 'BDC3C7',       // Light Border
  success: '27AE60',      // Green
  warning: 'E67E22',      // Orange
  danger: 'C0392B',       // Dark Red
};

// ─── BORDER UTILITIES ──────────────────────────────────────────────────────

const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 6, color: colors.border },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: colors.border },
  left: { style: BorderStyle.SINGLE, size: 6, color: colors.border },
  right: { style: BorderStyle.SINGLE, size: 6, color: colors.border },
};

const noBorder = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
};

// ─── CELL UTILITIES ────────────────────────────────────────────────────────

const headerCell = (text, alignment = AlignmentType.CENTER) => new TableCell({
  children: [new Paragraph({
    text,
    bold: true,
    size: 20,
    color: 'FFFFFF',
    alignment,
  })],
  shading: { fill: colors.tableHeader, type: 'clear' },
  margins: { top: 100, bottom: 100, left: 80, right: 80 },
  borders: thinBorder,
  verticalAlign: VerticalAlign.CENTER,
});

const dataCell = (text, options = {}) => {
  const {
    alignment = AlignmentType.LEFT,
    bold = false,
    numeric = false,
    color = colors.darkText,
    backgroundColor = undefined,
    rightAlign = false,
  } = options;

  return new TableCell({
    children: [new Paragraph({
      text: text || '—',
      bold,
      size: 20,
      color,
      alignment: rightAlign ? AlignmentType.RIGHT : alignment,
    })],
    shading: backgroundColor ? { fill: backgroundColor, type: 'clear' } : undefined,
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    borders: thinBorder,
    verticalAlign: VerticalAlign.CENTER,
  });
};

const labelCell = (label, value, options = {}) => new TableCell({
  children: [
    new Paragraph({
      text: label,
      bold: true,
      size: 18,
      color: colors.lightText,
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({
      text: value || '—',
      bold: options.bold || false,
      size: 22,
      color: options.color || colors.darkText,
      alignment: AlignmentType.LEFT,
    }),
  ],
  margins: { top: 100, bottom: 100, left: 100, right: 100 },
  borders: noBorder,
});

// ─── LOAD DATA ──────────────────────────────────────────────────────────────

const loadTransactions = async ({ startDate, endDate, customerId = null }) => {
  const query = {
    transactionDate: { $gte: startDate, $lte: endDate },
    isVoided: { $ne: true },
  };

  if (customerId) {
    query.customerId = customerId;
  }

  return Transaction.find(query)
    .populate('customerId', 'userId customerCode phone address')
    .populate('customerId.userId', 'name')
    .sort({ transactionDate: -1 })
    .lean();
};

const getCustomerProfile = async (customerId) => {
  return CustomerProfile.findOne({ userId: customerId })
    .populate('userId', 'name email')
    .lean();
};

// ─── SUMMARY CALCULATION ───────────────────────────────────────────────────

const summarizeTransactions = (transactions) => {
  const summary = {
    totalDebit: 0,
    totalCredit: 0,
    debitCount: 0,
    creditCount: 0,
    closingBalance: 0,
    productTotals: { pmg: 0, hsd: 0, nr: 0 },
    transactionsByType: {},
  };

  transactions.forEach((tx) => {
    const debit = Number(tx.totalAmount || 0);
    const credit = Number(tx.paymentReceived || 0);

    if (debit > 0) {
      summary.totalDebit += debit;
      summary.debitCount += 1;
    }

    if (credit > 0) {
      summary.totalCredit += credit;
      summary.creditCount += 1;
    }

    summary.closingBalance = Number(tx.updatedBalance || 0);

    // Product totals
    if (tx.fuelType === 'pmg') summary.productTotals.pmg += Number(tx.fuelQuantity || 0);
    if (tx.fuelType === 'hsd') summary.productTotals.hsd += Number(tx.fuelQuantity || 0);
    if (tx.fuelType === 'nr') summary.productTotals.nr += Number(tx.fuelQuantity || 0);

    // Type counts
    const type = tx.transactionType || 'unknown';
    summary.transactionsByType[type] = (summary.transactionsByType[type] || 0) + 1;
  });

  return summary;
};

// ─── DOCUMENT GENERATION ───────────────────────────────────────────────────

const generateProfessionalStatement = async ({ customerId, startDate, endDate }) => {
  const transactions = await loadTransactions({ startDate, endDate, customerId });
  const profile = customerId ? await getCustomerProfile(customerId) : null;

  const firstTx = transactions[0];
  const customerName = profile?.userId?.name || firstTx?.customerId?.userId?.name || 'Customer';
  const customerCode = profile?.customerCode || firstTx?.customerId?.customerCode || '—';
  const address = profile?.address || firstTx?.customerId?.address || '—';
  const phoneNo = profile?.phone || firstTx?.customerId?.phone || '—';
  const email = profile?.userId?.email || '—';
  const openingBalance = transactions[0]?.previousBalance || 0;
  const summary = summarizeTransactions(transactions);
  const statementPeriodText = `Beginning - ${fmtDate(endDate || new Date())}`;
  const totalQty = summary.productTotals.pmg + summary.productTotals.hsd + summary.productTotals.nr;

  const sections = [
    {
      children: buildCoverPage({
        customerName,
        customerCode,
        address,
        phoneNo,
        email,
        currentBalance: summary.closingBalance,
        totalQty,
        totalSales: summary.totalDebit,
        totalPayments: summary.totalCredit,
        statementPeriodText,
      }),
      pageBreakBefore: false,
    },
    {
      children: buildStatementPage(
        customerName,
        customerCode,
        address,
        phoneNo,
        email,
        startDate,
        endDate,
        openingBalance,
        transactions,
        summary,
        statementPeriodText,
      ),
      pageBreakBefore: true,
    },
  ];

  const doc = new Document({
    sections,
  });

  return doc;
};

// ─── COVER PAGE ─────────────────────────────────────────────────────────────

const buildCoverPage = ({ customerName, customerCode, address, phoneNo, email, currentBalance, totalQty, totalSales, totalPayments, statementPeriodText }) => [
  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),
  
  // Company Logo/Header
  new Paragraph({
    text: 'ADIL PETROLEUM',
    bold: true,
    size: 80,
    color: colors.primary,
    alignment: AlignmentType.CENTER,
  }),
  
  new Paragraph({
    text: 'MANAGEMENT SYSTEM',
    size: 28,
    color: colors.secondary,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }),

  // Decorative line
  new Table({
    width: { size: 100, type: 'pct' },
    rows: [
      new TableRow({
        cells: [
          new TableCell({
            children: [new Paragraph('')],
            borders: {
              bottom: { style: BorderStyle.DOUBLE, size: 12, color: colors.primary },
              top: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
            },
          }),
        ],
      }),
    ],
  }),

  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),

  // Main title
  new Paragraph({
    text: 'ACCOUNT STATEMENT',
    bold: true,
    size: 48,
    color: colors.primary,
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  }),

  new Paragraph({
    text: 'Full customer account statement with transaction details and closing balance.',
    size: 20,
    color: colors.darkText,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }),

  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),

  // Customer info box
  new Table({
    width: { size: 100, type: 'pct' },
    rows: [
      new TableRow({
        cells: [
          new TableCell({
            children: [
              new Paragraph({
                text: 'CUSTOMER DETAILS',
                bold: true,
                size: 24,
                color: 'FFFFFF',
                alignment: AlignmentType.CENTER,
              }),
            ],
            shading: { fill: colors.primary, type: 'clear' },
            margins: { top: 150, bottom: 150 },
            borders: noBorder,
          }),
        ],
      }),
      new TableRow({
        cells: [
          new TableCell({
            children: [
              new Paragraph({
                text: `Customer: ${customerName}`,
                size: 24,
                spacing: { after: 100 },
              }),
              new Paragraph({
                text: 'Account: Customer Account',
                size: 24,
                spacing: { after: 100 },
              }),
              new Paragraph({
                text: `Phone: ${phoneNo}`,
                size: 24,
                spacing: { after: 100 },
              }),
              new Paragraph({
                text: `Email: ${email}`,
                size: 24,
                spacing: { after: 100 },
              }),
              new Paragraph({
                text: `Address: ${address}`,
                size: 24,
                spacing: { after: 100 },
              }),
              new Paragraph({
                text: `Current Balance: ${amountText(currentBalance)}`,
                size: 24,
              }),
            ],
            shading: { fill: colors.lightGray, type: 'clear' },
            margins: { top: 200, bottom: 200, left: 200, right: 200 },
            borders: noBorder,
          }),
        ],
      }),
    ],
  }),

  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),
  new Paragraph({ text: '' }),

  new Paragraph({
    text: `Statement Period: ${statementPeriodText}`,
    size: 22,
    bold: true,
    color: colors.secondary,
    alignment: AlignmentType.CENTER,
  }),

  new Paragraph({
    text: 'Account: Customer Account',
    size: 22,
    bold: true,
    color: colors.secondary,
    alignment: AlignmentType.CENTER,
  }),

  new Paragraph({
    text: customerName,
    size: 22,
    bold: true,
    color: colors.darkText,
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),

  new Paragraph({
    text: `Qty ${qtyInt(totalQty)} L · Sale ${amountText(totalSales)} · Payment ${amountText(totalPayments)} · Remaining ${amountText(currentBalance)}`,
    size: 20,
    color: colors.darkText,
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }),

  // Footer info
  new Paragraph({
    text: 'Prepared for customer sharing · Pakistan datetime format applied',
    size: 20,
    color: colors.lightText,
    alignment: AlignmentType.CENTER,
    italics: true,
  }),

  new Paragraph({
    text: `Generated on ${fmtDateTime(new Date())}`,
    size: 18,
    color: colors.lightText,
    alignment: AlignmentType.CENTER,
  }),
];

// ─── STATEMENT PAGE ─────────────────────────────────────────────────────────

const buildStatementPage = (customerName, customerCode, address, phoneNo, email, startDate, endDate, openingBalance, transactions, summary, statementPeriodText) => {
  const children = [];

  // Header
  children.push(
    new Paragraph({
      text: 'ACCOUNT STATEMENT',
      bold: true,
      size: 36,
      color: colors.primary,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  children.push(
    new Paragraph({
      text: 'Full customer account statement with transaction details and closing balance.',
      size: 18,
      color: colors.lightText,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Customer Info Header
  children.push(
    new Table({
      width: { size: 100, type: 'pct' },
      rows: [
        new TableRow({
          cells: [
            labelCell('Customer', customerName, { bold: true }),
            labelCell('Type', 'Customer Account', { bold: true }),
          ],
        }),
        new TableRow({
          cells: [
            labelCell('Phone', phoneNo),
            labelCell('Email', email),
          ],
        }),
        new TableRow({
          cells: [
            labelCell('Address', address),
            labelCell('Statement Period', statementPeriodText),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ text: '' }));

  children.push(
    new Paragraph({
      text: 'Account: Customer Account',
      bold: true,
      size: 20,
      color: colors.secondary,
      alignment: AlignmentType.CENTER,
    })
  );

  children.push(
    new Paragraph({
      text: customerName,
      bold: true,
      size: 20,
      color: colors.darkText,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  children.push(
    new Paragraph({
      text: `Qty ${qtyInt(summary.productTotals.pmg + summary.productTotals.hsd + summary.productTotals.nr)} L · Sale ${amountText(summary.totalDebit)} · Payment ${amountText(summary.totalCredit)} · Remaining ${amountText(summary.closingBalance)}`,
      size: 18,
      color: colors.darkText,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Summary boxes
  children.push(
    new Table({
      width: { size: 100, type: 'pct' },
      rows: [
        new TableRow({
          cells: [
            new TableCell({
              children: [
                new Paragraph({
                  text: 'OPENING BALANCE',
                  bold: true,
                  size: 18,
                  color: colors.lightText,
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  text: amountText(openingBalance),
                  bold: true,
                  size: 28,
                  color: openingBalance > 0 ? colors.danger : colors.success,
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: colors.lightGray, type: 'clear' },
              margins: { top: 150, bottom: 150 },
              borders: thinBorder,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: 'TOTAL SALES',
                  bold: true,
                  size: 18,
                  color: colors.lightText,
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  text: amountText(summary.totalDebit),
                  bold: true,
                  size: 28,
                  color: colors.primary,
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: colors.lightGray, type: 'clear' },
              margins: { top: 150, bottom: 150 },
              borders: thinBorder,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: 'PAYMENT RECEIVED',
                  bold: true,
                  size: 18,
                  color: colors.lightText,
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  text: amountText(summary.totalCredit),
                  bold: true,
                  size: 28,
                  color: colors.success,
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: colors.lightGray, type: 'clear' },
              margins: { top: 150, bottom: 150 },
              borders: thinBorder,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: 'CLOSING BALANCE',
                  bold: true,
                  size: 18,
                  color: colors.lightText,
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  text: amountText(summary.closingBalance),
                  bold: true,
                  size: 28,
                  color: summary.closingBalance > 0 ? colors.danger : colors.success,
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: colors.lightGray, type: 'clear' },
              margins: { top: 150, bottom: 150 },
              borders: thinBorder,
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ text: '' }));

  children.push(
    new Paragraph({
      text: `Qty ${qtyInt(summary.productTotals.pmg + summary.productTotals.hsd + summary.productTotals.nr)} L · Sale ${amountText(summary.totalDebit)} · Payment ${amountText(summary.totalCredit)} · Remaining ${amountText(summary.closingBalance)}`,
      size: 20,
      bold: true,
      color: colors.darkText,
      alignment: AlignmentType.CENTER,
      spacing: { after: 250 },
    })
  );

  // Transactions table
  children.push(
    new Paragraph({
      text: 'TRANSACTION DETAILS',
      bold: true,
      size: 24,
      color: colors.secondary,
      spacing: { before: 200, after: 200 },
    })
  );

  if (transactions.length > 0) {
    const rows = [
      new TableRow({
        cells: [
          headerCell('Date', AlignmentType.CENTER),
          headerCell('Type', AlignmentType.CENTER),
          headerCell('Product', AlignmentType.CENTER),
          headerCell('Vehicle', AlignmentType.CENTER),
          headerCell('Qty', AlignmentType.RIGHT),
          headerCell('Rate', AlignmentType.RIGHT),
          headerCell('Debit', AlignmentType.RIGHT),
          headerCell('Credit', AlignmentType.RIGHT),
          headerCell('Balance', AlignmentType.RIGHT),
        ],
      }),
    ];

    transactions.forEach((tx) => {
      const debit = Number(tx.totalAmount || 0);
      const credit = Number(tx.paymentReceived || 0);
      const balance = Number(tx.updatedBalance || 0);
      const fuelQty = Number(tx.fuelQuantity || 0);

      rows.push(
        new TableRow({
          cells: [
            dataCell(fmtDate(tx.transactionDate), { alignment: AlignmentType.CENTER }),
            dataCell(
              tx.transactionType === 'payment'
                ? 'Payment'
                : tx.transactionType === 'fuel_sale'
                  ? 'Sale'
                  : tx.transactionType === 'opening_balance'
                    ? 'Opening Balance'
                    : 'Sale',
              { alignment: AlignmentType.CENTER }
            ),
            dataCell((tx.fuelType || '').toUpperCase() || '—', { alignment: AlignmentType.CENTER }),
            dataCell(
              tx.transactionType === 'payment' || tx.transactionType === 'opening_balance'
                ? '—'
                : tx.vehicleNo || '—',
              { alignment: AlignmentType.CENTER }
            ),
            dataCell(fuelQty ? qtyInt(fuelQty) : '—', { rightAlign: true }),
            dataCell(tx.rate ? rateText(tx.rate) : '—', { rightAlign: true }),
            dataCell(debit > 0 ? amountText(debit) : '—', { rightAlign: true, color: colors.primary, bold: debit > 0 }),
            dataCell(credit > 0 ? amountText(credit) : '—', { rightAlign: true, color: colors.success, bold: credit > 0 }),
            dataCell(amountText(balance), { rightAlign: true, bold: true, color: balance > 0 ? colors.danger : colors.success }),
          ],
        })
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: 'pct' },
        rows,
      })
    );
  } else {
    children.push(
      new Paragraph({
        text: 'No transactions found for the selected period.',
        italics: true,
        color: colors.lightText,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 400 },
      })
    );
  }

  children.push(new Paragraph({ text: '' }));

  // Summary section
  children.push(
    new Paragraph({
      text: 'SUMMARY',
      bold: true,
      size: 24,
      color: colors.secondary,
      spacing: { before: 200, after: 200 },
    })
  );

  const balanceRemark = summary.closingBalance > 0 ? 'Amount receivable' : 'Advance credit balance';

  children.push(
    new Table({
      width: { size: 100, type: 'pct' },
      rows: [
        new TableRow({
          cells: [
            new TableCell({
              children: [
                new Paragraph({
                  text: 'SALES DETAIL',
                  bold: true,
                  size: 20,
                  color: colors.primary,
                }),
                new Paragraph({
                  text: `PMG ${qtyInt(summary.productTotals.pmg)} L`,
                  size: 20,
                  spacing: { before: 100 },
                }),
                new Paragraph({
                  text: `HSD ${qtyInt(summary.productTotals.hsd)} L`,
                  size: 20,
                }),
                new Paragraph({
                  text: `NR ${qtyInt(summary.productTotals.nr)} L`,
                  size: 20,
                  spacing: { after: 100 },
                }),
                new Paragraph({
                  text: `Total Dr. Transactions ${summary.debitCount}`,
                  bold: true,
                  size: 20,
                  color: colors.primary,
                }),
              ],
              shading: { fill: colors.lightGray, type: 'clear' },
              margins: { top: 150, bottom: 150, left: 150, right: 150 },
              borders: thinBorder,
              verticalAlign: VerticalAlign.TOP,
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: 'BALANCE SUMMARY',
                  bold: true,
                  size: 20,
                  color: colors.primary,
                }),
                new Paragraph({
                  text: `Opening Balance: ${amountText(openingBalance)}`,
                  size: 20,
                  spacing: { before: 100 },
                }),
                new Paragraph({
                  text: `Total Sales: ${amountText(summary.totalDebit)}`,
                  size: 20,
                }),
                new Paragraph({
                  text: `Total Payments: ${amountText(summary.totalCredit)}`,
                  size: 20,
                  spacing: { before: 100 },
                }),
                new Paragraph({
                  text: `Closing Balance: ${amountText(summary.closingBalance)}`,
                  bold: true,
                  size: 20,
                  color: summary.closingBalance > 0 ? colors.danger : colors.success,
                  spacing: { after: 100 },
                }),
                new Paragraph({
                  text: `Balance Remarks: ${balanceRemark}`,
                  size: 20,
                  italic: true,
                  color: colors.secondary,
                }),
              ],
              shading: { fill: colors.lightGray, type: 'clear' },
              margins: { top: 150, bottom: 150, left: 150, right: 150 },
              borders: thinBorder,
              verticalAlign: VerticalAlign.TOP,
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ text: '' }));

  // Footer
  children.push(new Paragraph({ text: '' }));
  children.push(
    new Table({
      width: { size: 100, type: 'pct' },
      rows: [
        new TableRow({
          cells: [
            new TableCell({
              children: [
                new Paragraph({
                  text: 'Balance Remarks',
                  bold: true,
                  size: 18,
                  color: colors.darkText,
                }),
                new Paragraph({
                  text: summary.closingBalance > 0 ? 'Amount receivable' : 'Amount payable',
                  size: 20,
                  color: summary.closingBalance > 0 ? colors.danger : colors.success,
                }),
              ],
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              borders: thinBorder,
            }),
          ],
        }),
      ],
    })
  );

  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ text: '' }));

  // Disclaimer
  children.push(
    new Paragraph({
      text: 'Prepared for customer sharing · Pakistan datetime format applied',
      size: 18,
      color: colors.lightText,
      italics: true,
      alignment: AlignmentType.CENTER,
    })
  );

  return children;
};

module.exports = {
  generateProfessionalStatement,
};
