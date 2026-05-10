import client from './axiosClient';

export const getTransactions   = (params)    => client.get('/transactions', { params });
export const createTransaction = (data)      => client.post('/transactions', data);
export const voidTransaction   = (id, reason) => client.put('/transactions/' + id + '/void', { reason });