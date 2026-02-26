import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Confirmation } from '@/lib/types';

export function useScheduleData() {
  const [confirmations, setConfirmations] = useState<Record<string, Confirmation>>({});

  useEffect(() => {
    const fetchConfirmations = async () => {
      const { data, error } = await supabase.from('confirmations').select('*');
      if (error) {
        console.error('Error loading data:', error);
        return;
      }
      
      const map: Record<string, Confirmation> = {};
      data?.forEach((row: any) => {
        map[row.date_key] = {
          status: row.status,
          cleanedBy: row.cleaned_by,
          holidayName: row.holiday_name,
        };
      });
      setConfirmations(map);
    };

    fetchConfirmations();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'confirmations' },
        () => fetchConfirmations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleConfirmation = async (
    key: string, 
    status: 'cleaned' | 'missed' | 'holiday' | 'subbed' | null, 
    cleanedBy?: string, 
    holidayName?: string
  ) => {
    // Optimistic UI update
    setConfirmations((prev) => {
      const next = { ...prev };
      if (status === null) {
        delete next[key];
      } else {
        next[key] = { 
          status, 
          cleanedBy: (status === 'cleaned' || status === 'subbed') ? cleanedBy : undefined,
          holidayName: status === 'holiday' ? holidayName : undefined
        };
      }
      return next;
    });

    // Database sync
    if (status === null) {
      await supabase.from('confirmations').delete().eq('date_key', key);
    } else {
      await supabase.from('confirmations').upsert({
        date_key: key,
        status: status,
        cleaned_by: (status === 'cleaned' || status === 'subbed') ? cleanedBy : null,
        holiday_name: status === 'holiday' ? holidayName : null,
      });
    }
  };

  return { confirmations, handleConfirmation };
}