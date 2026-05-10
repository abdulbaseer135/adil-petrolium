import client from './axiosClient';
import { getTransactions } from './transactionApi';

export const getDaily = (params) => client.get('/daily-records/by-date', { params });
export const getDailyRecords = (params) => client.get('/daily-records', { params });
export const lockDailyRecord = (id) => client.post(`/daily-records/${id}/lock`);
export const getAuditLogs = (params) => client.get('/audit-logs', { params });

/**
 * Report view APIs
 * These return JSON and should be used by pages that render report data on screen.
 */
export const getMonthlyReport = (year, month) =>
  client.get('/reports/monthly', {
    params: { year, month },
  });

export const getYearlyReport = async (year) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const buckets = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    monthLabel: months[index],
    transactionCount: 0,
    totalFuelSold: 0,
    totalSales: 0,
    totalPayments: 0,
    netChange: 0,
    balance: 0,
  }));

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  let page = 1;
  let totalPages = 1;

  do {
    const res = await getTransactions({
      startDate,
      endDate,
      page,
      limit: 100,
      sort: 'transactionDate',
    });

    const transactions = res.data?.data || [];
    const meta = res.data?.meta || {};

    transactions.forEach((tx) => {
      const monthIndex = new Date(tx.transactionDate).getMonth();
      const bucket = buckets[monthIndex];

      bucket.transactionCount += 1;
      bucket.totalFuelSold += Number(tx.fuelQuantity) || 0;
      bucket.totalSales += Number(tx.totalAmount) || 0;
      bucket.totalPayments += Number(tx.paymentReceived) || 0;
      bucket.netChange += (Number(tx.paymentReceived) || 0) - (Number(tx.totalAmount) || 0);
      bucket.balance = Number(tx.updatedBalance) || bucket.balance;
    });

    totalPages = meta.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  const summary = buckets.reduce(
    (acc, bucket) => {
      acc.totalTransactions += bucket.transactionCount;
      acc.totalFuelSold += bucket.totalFuelSold;
      acc.totalSales += bucket.totalSales;
      acc.totalPayments += bucket.totalPayments;
      acc.netCredit += bucket.netChange;
      return acc;
    },
    {
      totalTransactions: 0,
      totalFuelSold: 0,
      totalSales: 0,
      totalPayments: 0,
      netCredit: 0,
    }
  );

  return {
    data: {
      success: true,
      data: {
        year,
        summary,
        breakdown: buckets,
      },
    },
  };
};

/**
 * Export APIs
 * These return files/blobs and should only be used for download actions.
 */
export const exportDaily = (date) =>
  client.get('/reports/export/daily', {
    params: { date },
    responseType: 'blob',
  });

export const exportMonthly = (year, month) =>
  client.get('/reports/export/monthly', {
    params: { year, month },
    responseType: 'blob',
  });

export const exportYearly = (year) =>
  client.get('/reports/export/yearly', {
    params: { year },
    responseType: 'blob',
  });

export const exportDailyExcel = exportDaily;
export const exportMonthlyExcel = exportMonthly;
export const exportYearlyCSV = exportYearly;