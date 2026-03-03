'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { useThemes } from '@/hooks/use-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { themes, isLoading, error, deleteTheme } = useThemes();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleDelete = async (themeId: string) => {
    if (!confirm('Are you sure you want to delete this theme?')) return;

    try {
      await deleteTheme(themeId);
      toast.success('Theme deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete theme');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-lg bg-red-50 p-4 text-red-600">
          Failed to load themes. Please try again.
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Themes</h1>
          <p className="mt-1 text-gray-600">
            {themes?.length || 0} {themes?.length === 1 ? 'theme' : 'themes'}
          </p>
        </div>
        <Link href="/themes/new">
          <Button>+ New Theme</Button>
        </Link>
      </div>

      {!themes?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">No themes yet</h3>
            <p className="mt-2 text-gray-600">Create your first theme to start learning</p>
            <Link href="/themes/new" className="mt-4">
              <Button>Create First Theme</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <Card key={theme.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="line-clamp-2">{theme.name}</CardTitle>
                {theme.description && (
                  <CardDescription className="line-clamp-2">{theme.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex gap-2">
                  <Link href={`/study/${theme.id}`} className="flex-1">
                    <Button className="w-full" variant="default" size="sm">
                      Study
                    </Button>
                  </Link>
                  <Link href={`/themes/${theme.id}/sources`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Load Data
                    </Button>
                  </Link>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(theme.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
