'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  MessageSquare, 
  Share2, 
  TrendingUp, 
  Activity, 
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';

// Types
interface OverviewStats {
  totalPosts: number;
  totalEngagement: number;
  totalFollowers: number;
  totalCampaigns: number;
  activeWorkflows: number;
  platformCount: number;
}

interface PlatformStat {
  platform: string;
  posts: number;
  engagement: number;
  followers: number;
  growth: number;
}

interface GrowthData {
  labels: string[];
  followers: number[];
  posts: number[];
  engagement: number[];
}

interface ContentPerformance {
  contentType: string;
  posts: number;
  engagement: number;
  avgEngagementRate: number;
}

// Mock data
const PLATFORM_COLORS = ['#1877F2', '#E1306C', '#0077B5', '#1DA1F2', '#25D366'];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [contentPerformance, setContentPerformance] = useState<ContentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const response = await fetch(`/api/analytics/overview?startDate=${startDate}&endDate=${endDate}`);
      
      // Mock data
      setOverviewStats({
        totalPosts: 1247,
        totalEngagement: 45230,
        totalFollowers: 12500,
        totalCampaigns: 24,
        activeWorkflows: 8,
        platformCount: 5,
      });

      setPlatformStats([
        { platform: 'Facebook', posts: 450, engagement: 15000, followers: 5000, growth: 5.2 },
        { platform: 'Instagram', posts: 380, engagement: 18000, followers: 4500, growth: 8.5 },
        { platform: 'LinkedIn', posts: 200, engagement: 8000, followers: 2000, growth: 3.1 },
        { platform: 'Twitter', posts: 150, engagement: 3000, followers: 500, growth: 1.2 },
        { platform: 'WhatsApp', posts: 67, engagement: 1230, followers: 500, growth: 2.8 },
      ]);

      setGrowthData({
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        followers: [100, 120, 140, 160, 180, 200, 220],
        posts: [5, 8, 6, 10, 7, 4, 3],
        engagement: [150, 200, 180, 250, 220, 120, 90],
      });

      setContentPerformance([
        { contentType: 'Facebook', posts: 450, engagement: 15000, avgEngagementRate: 3.3 },
        { contentType: 'Instagram', posts: 380, engagement: 18000, avgEngagementRate: 4.7 },
        { contentType: 'LinkedIn', posts: 200, engagement: 8000, avgEngagementRate: 4.0 },
        { contentType: 'Twitter', posts: 150, engagement: 3000, avgEngagementRate: 2.0 },
        { contentType: 'WhatsApp', posts: 67, engagement: 1230, avgEngagementRate: 1.8 },
      ]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and on date range change
  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDateRange = () => {
    switch (dateRange) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      default: return 'Last 30 days';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time performance metrics and insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchAnalytics}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Date Range:</span>
            <Select 
              value={dateRange} 
              onValueChange={(value) => setDateRange(value as any)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {formatDateRange()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats?.totalPosts}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Engagement</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats?.totalEngagement.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +8.5% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats?.totalFollowers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +5.2% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats?.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              4 active campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats?.activeWorkflows}</div>
            <p className="text-xs text-muted-foreground">
              8 workflows configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platforms</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats?.platformCount}</div>
            <p className="text-xs text-muted-foreground">
              5 platforms connected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Growth Overview</CardTitle>
            <CardDescription>Followers, posts, and engagement over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData ? growthData.labels.map((label, i) => ({
                  name: label,
                  followers: growthData.followers[i],
                  posts: growthData.posts[i],
                  engagement: growthData.engagement[i],
                })) : []}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="followers" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorFollowers)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="posts" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorPosts)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#f59e0b" 
                    fillOpacity={1} 
                    fill="url(#colorEngagement)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>Posts and engagement by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformStats}>
                  <XAxis dataKey="platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="posts" fill="#8884d8" name="Posts" />
                  <Bar dataKey="engagement" fill="#82ca9d" name="Engagement" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Content Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Content Performance</CardTitle>
            <CardDescription>Average engagement rate by platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contentPerformance}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="engagement"
                  >
                    {contentPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PLATFORM_COLORS[index % PLATFORM_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {contentPerformance.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: PLATFORM_COLORS[index % PLATFORM_COLORS.length] }}
                    />
                    <span>{item.contentType}</span>
                  </div>
                  <div className="font-medium">{item.avgEngagementRate.toFixed(1)}% ER</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Posts</CardTitle>
          <CardDescription>Your best performing content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Content</th>
                  <th className="text-left p-4">Platform</th>
                  <th className="text-right p-4">Likes</th>
                  <th className="text-right p-4">Comments</th>
                  <th className="text-right p-4">Shares</th>
                  <th className="text-right p-4">Engagement Rate</th>
                </tr>
              </thead>
              <tbody>
                {platformStats.slice(0, 5).map((platform, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="font-medium">Sample post content {index + 1}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 capitalize">{platform.platform.toLowerCase()}</td>
                    <td className="text-right p-4">{Math.floor(platform.engagement * 0.5).toLocaleString()}</td>
                    <td className="text-right p-4">{Math.floor(platform.engagement * 0.2).toLocaleString()}</td>
                    <td className="text-right p-4">{Math.floor(platform.engagement * 0.1).toLocaleString()}</td>
                    <td className="text-right p-4">{platform.engagement / platform.posts / 10}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}