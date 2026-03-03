'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, Link as LinkIcon, Check, AlertCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/use-auth';
import { useSourceUpload } from '@/hooks/use-source-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface SourcesPageProps {
  params: Promise<{ themeId: string }>;
}

export default function SourcesPage({ params }: SourcesPageProps) {
  const { themeId } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { sources, isUploading, error, uploadText, uploadUrl, uploadFile } =
    useSourceUpload(themeId);

  const [textContent, setTextContent] = useState('');
  const [textName, setTextName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlType, setUrlType] = useState<'url' | 'youtube'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      setLocalError('Please enter some text content');
      return;
    }

    try {
      setLocalError(null);
      await uploadText(textContent, textName || 'Pasted Text');
      toast.success('Text uploaded successfully!');
      setTextContent('');
      setTextName('');
    } catch (err) {
      toast.error('Failed to upload text');
      setLocalError(err instanceof Error ? err.message : 'Error uploading text');
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setLocalError('Please enter a URL');
      return;
    }

    try {
      setLocalError(null);
      const name = `${urlType === 'youtube' ? 'YouTube' : 'Web'} Source`;
      await uploadUrl(urlInput, name);
      toast.success('URL source added successfully!');
      setUrlInput('');
    } catch (err) {
      toast.error('Failed to add URL source');
      setLocalError(err instanceof Error ? err.message : 'Error adding URL');
    }
  };

  const handleFileSubmit = async () => {
    if (!selectedFile) {
      setLocalError('Please select a file');
      return;
    }

    try {
      setLocalError(null);
      await uploadFile(selectedFile);
      toast.success('File uploaded successfully!');
      setSelectedFile(null);
    } catch (err) {
      toast.error('Failed to upload file');
      setLocalError(err instanceof Error ? err.message : 'Error uploading file');
    }
  };

  if (authLoading) {
    return <div className="px-4 py-10">Loading...</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-bold">Load Data Sources</h1>
        <p className="mt-2 text-gray-600">Add source material to generate meaningful flashcards</p>
      </div>

      {(error || localError) && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error || localError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload Sources</CardTitle>
              <CardDescription>
                Choose how you want to add content for card generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text" className="flex gap-2">
                    <FileText className="h-4 w-4" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="url" className="flex gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Link
                  </TabsTrigger>
                  <TabsTrigger value="file" className="flex gap-2">
                    <Upload className="h-4 w-4" />
                    File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="textName">Source name (optional)</Label>
                    <Input
                      id="textName"
                      placeholder="e.g., My Study Notes"
                      value={textName}
                      onChange={(e) => setTextName(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="textContent">Paste your text *</Label>
                    <Textarea
                      id="textContent"
                      placeholder="Paste any text, articles, or notes here…"
                      rows={8}
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>
                  <Button
                    onClick={handleTextSubmit}
                    disabled={isUploading || !textContent.trim()}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Upload Text'
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="url" className="space-y-4">
                  <div>
                    <Label>Source type</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={urlType === 'url'}
                          onChange={() => setUrlType('url')}
                          disabled={isUploading}
                        />
                        <span className="text-sm">Web Page</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={urlType === 'youtube'}
                          onChange={() => setUrlType('youtube')}
                          disabled={isUploading}
                        />
                        <span className="text-sm">YouTube Video</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="urlInput">
                      {urlType === 'youtube' ? 'YouTube URL' : 'Web URL'} *
                    </Label>
                    <Input
                      id="urlInput"
                      placeholder={
                        urlType === 'youtube'
                          ? 'https://youtube.com/watch?v=...'
                          : 'https://example.com/article'
                      }
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={isUploading}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      {urlType === 'youtube'
                        ? 'Transcripts will be extracted from the video'
                        : 'Content will be extracted from the webpage'}
                    </p>
                  </div>
                  <Button
                    onClick={handleUrlSubmit}
                    disabled={isUploading || !urlInput.trim()}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Add Link'
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="file" className="space-y-4">
                  <div>
                    <Label htmlFor="file">Select File *</Label>
                    <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition">
                      <input
                        id="file"
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <label htmlFor="file" className="cursor-pointer block">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="font-medium text-gray-900">
                          {selectedFile ? selectedFile.name : 'Click to upload or drag & drop'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">PDF or DOCX files up to 10MB</p>
                      </label>
                    </div>
                  </div>
                  <Button
                    onClick={handleFileSubmit}
                    disabled={isUploading || !selectedFile}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Upload File'
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-3">
              Or generate cards based on the theme name only
            </p>
            <Link href={`/study/${themeId}`}>
              <Button variant="outline">Continue to Study →</Button>
            </Link>
          </div>
        </div>

        {/* Sources list */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sources ({sources.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {sources.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No sources uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-start justify-between gap-2 p-2 rounded border border-gray-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{source.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(source.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(source.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
