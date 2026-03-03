import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export function useStreak() {
  const { data: session } = useSession();
  const [streak, setStreak] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    async function fetchStreak() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = (await res.json()) as { streak_count: number };
          setStreak(data.streak_count || 0);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    void fetchStreak();
  }, [session?.user?.id]);

  return { streak, loading };
}
