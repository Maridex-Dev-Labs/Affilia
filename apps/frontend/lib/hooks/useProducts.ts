'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './useAuth';

export function useProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('products')
      .select('*')
      .eq('merchant_id', user.id)
      .then(({ data }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, [user]);

  return { products, loading };
}
