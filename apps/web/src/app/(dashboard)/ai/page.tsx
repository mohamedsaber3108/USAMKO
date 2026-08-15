'use client';

import { useState } from 'react';
import api from '@/lib/api';

export default function AIContentPage() {
  const [activeTab, setActiveTab] = useState<'post' | 'caption' | 'translate' | 'improve' | 'sentiment'>('post');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Post generation
  const [postData, setPostData] = useState({
    topic: '',
    platform: 'linkedin',
    tone: 'professional',
    length: 'medium',
    includeHashtags: true,
  });

  // Caption generation
  const [captionData, setCaptionData] = useState({
    imageDescription: '',
    tone: 'engaging',
    platform: 'instagram',
    includeHashtags: true,
  });

  // Translation
  const [translateData, setTranslateData] = useState({
    text: '',
    targetLanguage: 'es',
  });

  // Improve content
  const [improveData, setImproveData] = useState({
    text: '',
    improvements: ['clarity', 'engagement'],
  });

  // Sentiment
  const [sentimentText, setSentimentText] = useState('');

  const handleGeneratePost = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.generatePost(postData);
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCaption = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.generateCaption(captionData);
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.translateText(translateData);
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.improveContent(improveData);
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSentiment = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.analyzeSentiment(sentimentText);
      setResult(res);
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Content Generator</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Powered by AWS Bedrock (Claude Sonnet 4.5)
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {[
              { id: 'post', label: 'Generate Post' },
              { id: 'caption', label: 'Generate Caption' },
              { id: 'translate', label: 'Translate' },
              { id: 'improve', label: 'Improve Content' },
              { id: 'sentiment', label: 'Sentiment Analysis' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setResult(null); }}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Post Generation */}
          {activeTab === 'post' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Topic
                </label>
                <input
                  type="text"
                  value={postData.topic}
                  onChange={(e) => setPostData({ ...postData, topic: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter topic for post generation"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Platform
                  </label>
                  <select
                    value={postData.platform}
                    onChange={(e) => setPostData({ ...postData, platform: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="twitter">Twitter</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tone
                  </label>
                  <select
                    value={postData.tone}
                    onChange={(e) => setPostData({ ...postData, tone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="friendly">Friendly</option>
                    <option value="enthusiastic">Enthusiastic</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={postData.includeHashtags}
                  onChange={(e) => setPostData({ ...postData, includeHashtags: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">Include hashtags</label>
              </div>
              <button
                onClick={handleGeneratePost}
                disabled={loading || !postData.topic}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Post'}
              </button>
            </div>
          )}

          {/* Caption Generation */}
          {activeTab === 'caption' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image Description
                </label>
                <textarea
                  value={captionData.imageDescription}
                  onChange={(e) => setCaptionData({ ...captionData, imageDescription: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={4}
                  placeholder="Describe the image..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Platform
                  </label>
                  <select
                    value={captionData.platform}
                    onChange={(e) => setCaptionData({ ...captionData, platform: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tone
                  </label>
                  <select
                    value={captionData.tone}
                    onChange={(e) => setCaptionData({ ...captionData, tone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="engaging">Engaging</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleGenerateCaption}
                disabled={loading || !captionData.imageDescription}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Caption'}
              </button>
            </div>
          )}

          {/* Translation */}
          {activeTab === 'translate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Text to Translate
                </label>
                <textarea
                  value={translateData.text}
                  onChange={(e) => setTranslateData({ ...translateData, text: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={4}
                  placeholder="Enter text to translate..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Language
                </label>
                <select
                  value={translateData.targetLanguage}
                  onChange={(e) => setTranslateData({ ...translateData, targetLanguage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ja">Japanese</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <button
                onClick={handleTranslate}
                disabled={loading || !translateData.text}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Translating...' : 'Translate'}
              </button>
            </div>
          )}

          {/* Improve Content */}
          {activeTab === 'improve' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content to Improve
                </label>
                <textarea
                  value={improveData.text}
                  onChange={(e) => setImproveData({ ...improveData, text: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={6}
                  placeholder="Enter content to improve..."
                />
              </div>
              <button
                onClick={handleImprove}
                disabled={loading || !improveData.text}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Improving...' : 'Improve Content'}
              </button>
            </div>
          )}

          {/* Sentiment Analysis */}
          {activeTab === 'sentiment' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Text to Analyze
                </label>
                <textarea
                  value={sentimentText}
                  onChange={(e) => setSentimentText(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={6}
                  placeholder="Enter text for sentiment analysis..."
                />
              </div>
              <button
                onClick={handleSentiment}
                disabled={loading || !sentimentText}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze Sentiment'}
              </button>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Result:</h3>
              {result.error ? (
                <p className="text-red-600">{result.error}</p>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
