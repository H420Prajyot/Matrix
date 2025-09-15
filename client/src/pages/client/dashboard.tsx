import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Project, VulnerabilityWithDetails, Report, Notification, VulnerabilityTotals } from "@shared/schema";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import VulnerabilityChart from "@/components/charts/vulnerability-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Building, 
  AlertTriangle,
  Download,
  TrendingUp,
  Calendar,
  Target,
  Clock,
  CheckCircle,
  FileText,
  Bell,
  Play,
  Skull
} from "lucide-react";

export default function ClientDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        // Use dev-login in development for easier testing
        const isDev = import.meta.env.DEV;
        window.location.href = isDev ? "/api/dev-login?userId=client-user-123&role=client" : "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Projects query
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    retry: false,
  });

  // Get the main project (assuming client has one primary project)
  const mainProject = projects?.[0];

  // Vulnerabilities query for the main project
  const { data: vulnerabilities, isLoading: vulnerabilitiesLoading } = useQuery<VulnerabilityWithDetails[]>({
    queryKey: [`/api/vulnerabilities?projectId=${mainProject?.id}`],
    enabled: !!mainProject?.id,
    retry: false,
  });

  // Reports query for the main project
  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports', mainProject?.id],
    enabled: !!mainProject?.id,
    retry: false,
  });

  // Notifications query
  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    retry: false,
  });

  // Vulnerability totals query for the main project
  const { data: vulnerabilityTotals, isLoading: vulnerabilityTotalsLoading } = useQuery<VulnerabilityTotals[]>({
    queryKey: [`/api/vulnerability-totals?projectId=${mainProject?.id}`],
    enabled: !!mainProject?.id,
    retry: false,
  });

  // Download latest report mutation
  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      if (!reports || reports.length === 0) {
        throw new Error('No reports available');
      }
      // Get the latest report (reports should be sorted by creation date)
      const latestReport = reports.find(r => r.isLatest) || reports[0];
      
      const response = await fetch(`/api/reports/download/${latestReport.id}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = latestReport.originalName || latestReport.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report downloaded successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          // Use dev-login in development for easier testing
          const isDev = import.meta.env.DEV;
          window.location.href = isDev ? "/api/dev-login?userId=client-user-123&role=client" : "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Download Failed",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
              <p className="text-muted-foreground">You need client privileges to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: 'tachometer-alt', active: activeSection === 'overview' },
    { id: 'projects', label: 'My Projects', icon: 'project-diagram', active: activeSection === 'projects' },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: 'exclamation-triangle', active: activeSection === 'vulnerabilities' },
    { id: 'reports', label: 'Reports', icon: 'file-download', active: activeSection === 'reports' },
    { id: 'timeline', label: 'Timeline', icon: 'history', active: activeSection === 'timeline' },
  ];

  // Calculate vulnerability stats from vulnerability totals
  const latestTotals = vulnerabilityTotals?.[0]; // Get the latest totals entry
  const totalVulns = latestTotals?.totalVulnerabilities || 0;
  const highVulns = latestTotals?.totalHigh || 0;
  const mediumVulns = latestTotals?.totalMedium || 0;
  const lowVulns = latestTotals?.totalLow || 0;
  
  // Calculate critical from individual vulnerabilities (since totals doesn't have critical)
  const vulnStats = vulnerabilities ? vulnerabilities.reduce((acc: any, vuln: any) => {
    acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
    return acc;
  }, {}) : {};
  const criticalVulns = vulnStats.critical || 0;

  const progress = mainProject?.progress || 0;
  const unreadNotifications = notifications?.filter((n: any) => !n.isRead).length || 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <Header 
        title="SecureVAPT Client Portal"
        subtitle="Security Assessment Dashboard"
        user={user}
        bgColor="bg-slate-600"
        iconColor="text-white"
        icon={Building}
        showNotifications={true}
        notificationCount={unreadNotifications}
      />
      
      <div className="flex">
        <Sidebar 
          items={sidebarItems}
          onItemClick={setActiveSection}
          activeColor="bg-slate-600 text-white"
        />

        <main className="flex-1 p-6">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Security Assessment Overview</h2>
                <Button 
                  variant="outline" 
                  data-testid="button-download-latest"
                  onClick={() => downloadReportMutation.mutate()}
                  disabled={downloadReportMutation.isPending || !reports || reports.length === 0}
                >
                  {downloadReportMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download Latest Report
                    </>
                  )}
                </Button>
              </div>

              {/* Project Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">High Severity</p>
                        <p className="text-3xl font-bold text-orange-600" data-testid="text-high-vulnerabilities">
                          {vulnerabilityTotalsLoading ? '...' : highVulns}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                        <AlertTriangle className="text-orange-600 dark:text-orange-400 h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Requires attention
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Medium Severity</p>
                        <p className="text-3xl font-bold text-yellow-600" data-testid="text-medium-vulnerabilities">
                          {vulnerabilityTotalsLoading ? '...' : mediumVulns}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                        <AlertTriangle className="text-yellow-600 dark:text-yellow-400 h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Monitor closely
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Low Severity</p>
                        <p className="text-3xl font-bold text-blue-600" data-testid="text-low-vulnerabilities">
                          {vulnerabilityTotalsLoading ? '...' : lowVulns}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <AlertTriangle className="text-blue-600 dark:text-blue-400 h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Low priority
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Vulnerabilities</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-total-vulnerabilities">
                          {vulnerabilityTotalsLoading ? '...' : totalVulns}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <Target className="text-red-600 dark:text-red-400 h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      {latestTotals?.createdAt ? `Reported ${new Date(latestTotals.createdAt).toLocaleDateString()}` : 'Not reported yet'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vulnerability Distribution Chart */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Vulnerability Distribution</CardTitle>
                      <Button size="sm" variant="ghost">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center">
                      <VulnerabilityChart 
                        data={{
                          critical: criticalVulns,
                          high: highVulns,
                          medium: mediumVulns,
                          low: lowVulns,
                        }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          <span className="text-sm text-muted-foreground">Critical</span>
                        </div>
                        <span className="text-xl font-bold text-foreground" data-testid="text-critical-count">{criticalVulns}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                          <span className="text-sm text-muted-foreground">High</span>
                        </div>
                        <span className="text-xl font-bold text-foreground" data-testid="text-high-count">{highVulns}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                          <span className="text-sm text-muted-foreground">Medium</span>
                        </div>
                        <span className="text-xl font-bold text-foreground" data-testid="text-medium-count">{mediumVulns}</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                          <span className="text-sm text-muted-foreground">Low/Info</span>
                        </div>
                        <span className="text-xl font-bold text-foreground" data-testid="text-low-count">{lowVulns}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notificationsLoading ? (
                      <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-16 bg-muted rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    ) : notifications && notifications.length > 0 ? (
                      <div className="space-y-4">
                        {notifications.slice(0, 4).map((notification: any) => {
                          const getIcon = (type: string) => {
                            switch (type) {
                              case 'vulnerability_found': return <AlertTriangle className="text-red-600 h-4 w-4" />;
                              case 'report_uploaded': return <FileText className="text-blue-600 h-4 w-4" />;
                              case 'project_update': return <CheckCircle className="text-green-600 h-4 w-4" />;
                              default: return <Bell className="text-purple-600 h-4 w-4" />;
                            }
                          };

                          return (
                            <div key={notification.id} className="flex items-start space-x-3" data-testid={`notification-${notification.id}`}>
                              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                                {getIcon(notification.type)}
                              </div>
                              <div className="flex-1">
                                <p className="text-foreground font-medium" data-testid={`text-notification-title-${notification.id}`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-muted-foreground" data-testid={`text-notification-message-${notification.id}`}>
                                  {notification.message}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {notification.createdAt ? new Date(notification.createdAt).toLocaleString() : 'Recently'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No recent activity</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Critical Vulnerabilities Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Critical Vulnerabilities</CardTitle>
                    <Button variant="ghost" className="text-primary hover:text-primary/80 text-sm font-medium">
                      View All <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {vulnerabilitiesLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-muted rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : vulnerabilities && vulnerabilities.filter((v: any) => v.severity === 'critical').length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vulnerability</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>CVSS Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Discovered</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vulnerabilities.filter((v: any) => v.severity === 'critical').map((vulnerability: any) => (
                          <TableRow key={vulnerability.id} data-testid={`row-vulnerability-${vulnerability.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground" data-testid={`text-vulnerability-title-${vulnerability.id}`}>
                                  {vulnerability.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {vulnerability.description?.substring(0, 100)}...
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="destructive" data-testid={`badge-vulnerability-severity-${vulnerability.id}`}>
                                {vulnerability.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-foreground">
                                {vulnerability.cvssScore || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={vulnerability.status === 'resolved' ? 'secondary' : vulnerability.status === 'in_progress' ? 'default' : 'outline'}
                                data-testid={`badge-vulnerability-status-${vulnerability.id}`}
                              >
                                {vulnerability.status?.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-foreground">
                                {vulnerability.discoveredAt ? new Date(vulnerability.discoveredAt).toLocaleDateString() : 'Unknown'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <p className="text-muted-foreground">No critical vulnerabilities found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Other sections can be added here */}
          {activeSection !== 'overview' && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Section
              </h2>
              <p className="text-muted-foreground">This section is under development.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
