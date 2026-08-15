'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function MediaLibraryPage() {
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      const data = await api.getMediaFiles();
      setMediaFiles(Array.isArray(data) ? data : data.files || []);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.uploadMedia(formData);
      alert('File uploaded successfully!');
      loadMedia();
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Delete this file?')) return;
    try {
      await api.deleteMediaFile(fileId);
      alert('File deleted');
      loadMedia();
      setSelectedFile(null);
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const handleCopyUrl = async (fileId: string) => {
    try {
      const url = await api.getMediaUrl(fileId);
      navigator.clipboard.writeText(url);
      alert('URL copied to clipboard!');
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const filteredFiles = mediaFiles.filter(file => {
    const matchesType = filterType === 'all' || file.mimeType?.startsWith(filterType);
    const matchesSearch = !searchQuery || file.filename?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Media Library
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your images, videos, and documents
          </p>
        </div>
        <div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg cursor-pointer ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? 'Uploading...' : '+ Upload File'}
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterType === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Images
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterType === 'video'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Videos
            </button>
            <button
              onClick={() => setFilterType('application')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filterType === 'application'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Documents
            </button>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <p className="text-gray-500 mb-4">No media files yet</p>
            <label
              htmlFor="file-upload"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg cursor-pointer inline-block"
            >
              Upload Your First File
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className="relative group cursor-pointer bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-600"
              >
                <div className="aspect-square flex items-center justify-center">
                  {file.mimeType?.startsWith('image/') ? (
                    <img
                      src={file.url || file.path}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : file.mimeType?.startsWith('video/') ? (
                    <div className="text-4xl">🎥</div>
                  ) : (
                    <div className="text-4xl">📄</div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs truncate">{file.filename}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  File Details
                </h3>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Preview */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                {selectedFile.mimeType?.startsWith('image/') ? (
                  <img
                    src={selectedFile.url || selectedFile.path}
                    alt={selectedFile.filename}
                    className="max-w-full h-auto max-h-[400px] rounded"
                  />
                ) : selectedFile.mimeType?.startsWith('video/') ? (
                  <video
                    src={selectedFile.url || selectedFile.path}
                    controls
                    className="max-w-full h-auto max-h-[400px] rounded"
                  />
                ) : (
                  <div className="text-6xl">📄</div>
                )}
              </div>

              {/* Info */}
              <div className="space-y-2">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Filename</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedFile.filename}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Type</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedFile.mimeType || 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Size</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedFile.size ? `${(selectedFile.size / 1024).toFixed(2)} KB` : 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Uploaded</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedFile.createdAt ? new Date(selectedFile.createdAt).toLocaleString() : 'Unknown'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">URL</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={selectedFile.url || selectedFile.path || ''}
                      readOnly
                      className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
                    />
                    <button
                      onClick={() => handleCopyUrl(selectedFile.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => handleDeleteFile(selectedFile.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
