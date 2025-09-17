import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity,
  Users, 
  Clock, 
  TrendingUp,
  FileText,
  Brain,
  BarChart3,
  Calendar,
  Search,
  Eye,
  RefreshCw,
  Filter
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";

interface JobStats {
  totalRequests: number;
  aiTradeSetupRequests: number;
  reportRequests: number;
  macroCommentaryRequests: number;
  avgDuration: number;
  requestsPerDay: number;
}

interface UserStats {
  userId: string;
  email: string;
  totalJobs: number;
  lastRequest: string;
  avgDuration: number;
  aiTradeCount: number;
  reportCount: number;
  macroCount: number;
}

interface JobDetail {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  email: string;
  feature: string;
  status: string;
  duration: number;
  promptSummary: string;
  request_payload: any;
  response_payload: any;
}

export function JobsMonitoring() {
  const [stats, setStats] = useState<JobStats>({
    totalRequests: 0,
    aiTradeSetupRequests: 0,
    reportRequests: 0,
    macroCommentaryRequests: 0,
    avgDuration: 0,
    requestsPerDay: 0
  });
  
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [jobDetails, setJobDetails] = useState<JobDetail[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('7'); // Last 7 days
  const [featureFilter, setFeatureFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Feature mapping for harmonized labels
  const mapFeatureToLabel = (feature: string): string => {
    switch (feature) {
      case 'ai_trade_setup':
      case 'AI Trade Setup':
        return 'AI Trade Setup';
      case 'macro_commentary':
      case 'Macro Commentary':
        return 'Macro Commentary';
      case 'report':
      case 'Report':
        return 'Report';
      default:
        return feature;
    }
  };

  const mapFeatureToKey = (feature: string): string => {
    const mapped = mapFeatureToLabel(feature);
    switch (mapped) {
      case 'AI Trade Setup':
        return 'ai_trade_setup';
      case 'Macro Commentary':
        return 'macro_commentary';
      case 'Report':
        return 'report';
      default:
        return feature;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const daysAgo = parseInt(dateFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Fetch jobs with user emails using edge function (authorized) and build map
      const { data: { session } } = await supabase.auth.getSession();
      const { data: usersResp, error: usersError } = await supabase.functions.invoke('fetch-users-with-emails', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const usersWithEmails = usersError
        ? []
        : (Array.isArray(usersResp) ? usersResp : (usersResp?.users ?? []));
      console.log('📧 Fetched users with emails:', Array.isArray(usersWithEmails) ? usersWithEmails.length : 0);
      
      const userEmailMap = (usersWithEmails as any[]).reduce((acc: any, u: any) => {
        if (u?.user_id && u?.email) acc[u.user_id] = u.email;
        return acc;
      }, {});
      // Always ensure current user's email is available
      if (user?.id && user?.email && !userEmailMap[user.id]) {
        userEmailMap[user.id] = user.email;
      }

      // Check current user role for super_user permissions
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isSuperUser = profile?.role === 'super_user';
      console.log('Current user role:', profile?.role, 'isSuperUser:', isSuperUser);

      // Build base jobs query without profile join (avoid join issues)
      let query = supabase
        .from('jobs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Add user filter for non-super users
      if (!isSuperUser) {
        query = query.eq('user_id', user.id);
        console.log('Filtering jobs for user:', user.id);
      } else {
        console.log('Loading all jobs for super_user');
      }

      if (featureFilter !== 'all') {
        const mappedFeature = mapFeatureToKey(featureFilter);
        query = query.eq('feature', mappedFeature);
      }

      if (userFilter) {
        query = query.eq('user_id', userFilter);
      }

      const { data: jobs, error } = await query;

      if (error) {
        console.error('Error fetching jobs:', error);
        throw error;
      }

      console.log('Fetched jobs count:', jobs?.length || 0);

      // Add email to jobs and calculate durations
      const jobsWithDetails: JobDetail[] = (jobs || []).map((job: any) => {
        const duration = job.updated_at 
          ? Math.round((new Date(job.updated_at).getTime() - new Date(job.created_at).getTime()) / 1000)
          : 0;
        
        const promptSummary = extractPromptSummary(job.request_payload);
        
        return {
          ...job,
          email: userEmailMap[job.user_id] || 'Unknown',
          duration,
          promptSummary
        };
      });

      setJobDetails(jobsWithDetails);

      // Calculate overall stats with harmonized feature mapping
      const completedJobs = jobsWithDetails.filter(job => job.status === 'completed' || job.status === 'error');
      const totalDuration = completedJobs.reduce((sum, job) => sum + job.duration, 0);
      
      // Count jobs by harmonized feature labels
      const featureCounts = {
        'AI Trade Setup': 0,
        'Macro Commentary': 0,
        'Report': 0
      };

      jobsWithDetails.forEach(job => {
        const harmonizedFeature = mapFeatureToLabel(job.feature);
        if (featureCounts.hasOwnProperty(harmonizedFeature)) {
          featureCounts[harmonizedFeature as keyof typeof featureCounts]++;
        }
      });

      const newStats: JobStats = {
        totalRequests: jobsWithDetails.length,
        aiTradeSetupRequests: featureCounts['AI Trade Setup'],
        reportRequests: featureCounts['Report'],
        macroCommentaryRequests: featureCounts['Macro Commentary'],
        avgDuration: completedJobs.length > 0 ? Math.round(totalDuration / completedJobs.length) : 0,
        requestsPerDay: Math.round(jobsWithDetails.length / daysAgo)
      };

      setStats(newStats);

      // Calculate user stats
      const userStatsMap = new Map<string, UserStats>();
      
      jobsWithDetails.forEach(job => {
        if (!userStatsMap.has(job.user_id)) {
          userStatsMap.set(job.user_id, {
            userId: job.user_id,
            email: job.email,
            totalJobs: 0,
            lastRequest: job.created_at,
            avgDuration: 0,
            aiTradeCount: 0,
            reportCount: 0,
            macroCount: 0
          });
        }

        const userStat = userStatsMap.get(job.user_id)!;
        userStat.totalJobs++;
        
        if (new Date(job.created_at) > new Date(userStat.lastRequest)) {
          userStat.lastRequest = job.created_at;
        }

        const harmonizedFeature = mapFeatureToLabel(job.feature);
        if (harmonizedFeature === 'AI Trade Setup') userStat.aiTradeCount++;
        else if (harmonizedFeature === 'Report') userStat.reportCount++;
        else if (harmonizedFeature === 'Macro Commentary') userStat.macroCount++;
      });

      // Calculate average durations per user
      userStatsMap.forEach((userStat, userId) => {
        const userJobs = jobsWithDetails.filter(job => job.user_id === userId && job.duration > 0);
        const totalDuration = userJobs.reduce((sum, job) => sum + job.duration, 0);
        userStat.avgDuration = userJobs.length > 0 ? Math.round(totalDuration / userJobs.length) : 0;
      });

      setUserStats(Array.from(userStatsMap.values()));

    } catch (error) {
      console.error('Error loading jobs data:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractPromptSummary = (payload: any): string => {
    if (!payload) return 'No prompt';
    
    if (payload.question) {
      return payload.question.slice(0, 50) + (payload.question.length > 50 ? '...' : '');
    }
    
    if (payload.query) {
      return payload.query.slice(0, 50) + (payload.query.length > 50 ? '...' : '');
    }
    
    if (payload.instrument) {
      return `Analysis for ${payload.instrument}`;
    }
    
    return 'Custom request';
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFeatureBadgeColor = (feature: string) => {
    const harmonizedFeature = mapFeatureToLabel(feature);
    switch (harmonizedFeature) {
      case 'AI Trade Setup': return 'bg-blue-500';
      case 'Report': return 'bg-green-500';
      case 'Macro Commentary': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'error': return 'destructive';
      case 'running': return 'secondary';
      default: return 'outline';
    }
  };

  // Filter jobs based on search term
  const filteredJobs = jobDetails.filter(job => 
    (job.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.promptSummary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.feature || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadData();
  }, [dateFilter, featureFilter, userFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading monitoring data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={featureFilter} onValueChange={setFeatureFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Features</SelectItem>
              <SelectItem value="AI Trade Setup">AI Trade Setup</SelectItem>
              <SelectItem value="Report">Report</SelectItem>
              <SelectItem value="Macro Commentary">Macro Commentary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Requests</p>
                <p className="text-lg font-bold">{stats.totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">AI Trade Setup</p>
                <p className="text-lg font-bold">{stats.aiTradeSetupRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Reports</p>
                <p className="text-lg font-bold">{stats.reportRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Macro Commentary</p>
                <p className="text-lg font-bold">{stats.macroCommentaryRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Duration</p>
                <p className="text-lg font-bold">{formatDuration(stats.avgDuration)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-500" />
              <div>
                <p className="text-xs text-muted-foreground">Requests/Day</p>
                <p className="text-lg font-bold">{stats.requestsPerDay}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            By User
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Job Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Statistics</CardTitle>
              <CardDescription>Usage breakdown by user</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Last Request</TableHead>
                    <TableHead>Avg Duration</TableHead>
                    <TableHead>AI Trade</TableHead>
                    <TableHead>Report</TableHead>
                    <TableHead>Macro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userStats.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.totalJobs}</TableCell>
                      <TableCell>{formatDate(user.lastRequest)}</TableCell>
                      <TableCell>{formatDuration(user.avgDuration)}</TableCell>
                      <TableCell>{user.aiTradeCount}</TableCell>
                      <TableCell>{user.reportCount}</TableCell>
                      <TableCell>{user.macroCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>Detailed job execution history</CardDescription>
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Prompt Summary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{formatDate(job.created_at)}</TableCell>
                      <TableCell className="font-medium">{job.email}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-white", getFeatureBadgeColor(job.feature))}>
                          {mapFeatureToLabel(job.feature)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDuration(job.duration)}</TableCell>
                      <TableCell className="max-w-xs truncate">{job.promptSummary}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(job.status)}>
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Job Details - {job.id}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Request Payload:</h4>
                                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                                  {JSON.stringify(job.request_payload, null, 2)}
                                </pre>
                              </div>
                              {job.response_payload && (
                                <div>
                                  <h4 className="font-medium mb-2">Response Payload:</h4>
                                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                                    {JSON.stringify(job.response_payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}