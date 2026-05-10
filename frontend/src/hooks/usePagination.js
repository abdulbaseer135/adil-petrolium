import { useState } from 'react';

export const usePagination = (defaultLimit = 20) => {
  const [page,  setPage]  = useState(1);
  const [limit, setLimit] = useState(defaultLimit);

  const goTo = (p) => setPage(p);
  const reset = () => setPage(1);

  return { page, limit, goTo, reset, setLimit };
};