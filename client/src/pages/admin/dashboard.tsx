import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import type { ProjectWithDetails, User, Project } from "@shared/schema";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import UserManagementModals from "@/components/admin/UserManagementModals";
import ProjectManagementModals from "@/components/admin/ProjectManagementModals";
import CreateUserForm from "@/components/admin/CreateUserForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Users, 
  ChartGantt, 
  AlertTriangle, 
  Star,
  Plus,
  UserPlus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Check,
  FileText,
  History,
  Settings
} from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'client' as 'admin' | 'pentester' | 'client',
    organization: ''
  });

  // Project management state
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectData, setProjectData] = useState({
    name: '',
    type: '',
    description: '',
    clientId: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });
  const [assignedPentesters, setAssignedPentesters] = useState<string[]>([]);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all');
  const queryClient = useQueryClient();

  // User management mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddUserDialogOpen(false);
      setNewUserData({ firstName: '', lastName: '', email: '', role: 'client', organization: '' });
      toast({ title: "Success", description: "User created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: any }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
      toast({ title: "Success", description: "User updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Success", description: "User deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Project management mutations
  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create project');
      }
      return response.json();
    },
    onSuccess: async (project) => {
      // Assign pentesters to the project
      if (assignedPentesters.length > 0) {
        for (const pentesterId of assignedPentesters) {
          try {
            await fetch(`/api/projects/${project.id}/assign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pentesterId }),
            });
          } catch (error) {
            console.error('Error assigning pentester:', error);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateProjectModalOpen(false);
      setProjectData({
        name: '',
        type: '',
        description: '',
        clientId: '',
        startDate: undefined,
        endDate: undefined,
      });
      setAssignedPentesters([]);
      toast({ title: "Success", description: "Project created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update project');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditProjectModalOpen(false);
      setSelectedProject(null);
      toast({ title: "Success", description: "Project updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete project');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsDeleteProjectModalOpen(false);
      setSelectedProject(null);
      toast({ title: "Success", description: "Project deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Event handlers
  const handleAddUser = () => {
    setIsAddUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserDialogOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
  };

  const handleCreateUser = () => {
    createUserMutation.mutate(newUserData);
  };

  const handleUpdateUser = () => {
    if (selectedUser) {
      updateUserMutation.mutate({ 
        id: selectedUser.id, 
        userData: {
          firstName: selectedUser.firstName,
          lastName: selectedUser.lastName,
          email: selectedUser.email,
          role: selectedUser.role,
          organization: selectedUser.organization
        }
      });
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Dashboard stats query
  const { data: stats, isLoading: statsLoading } = useQuery<{
    activeProjects: number;
    totalVulnerabilities: number;
    activeTesters: number;
    totalClients: number;
  }>({
    queryKey: ['/api/dashboard/stats'],
    retry: false,
  });

  // Vulnerability stats query
  const { data: vulnStats, isLoading: vulnStatsLoading } = useQuery<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  }>({
    queryKey: ['/api/dashboard/vulnerability-stats'],
    retry: false,
  });

  // Projects query
  const { data: projects, isLoading: projectsLoading } = useQuery<ProjectWithDetails[]>({
    queryKey: ['/api/projects'],
    retry: false,
  });

  // Users query
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
              <p className="text-muted-foreground">You need administrator privileges to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: 'tachometer-alt', active: activeSection === 'overview' },
    { id: 'users', label: 'User Management', icon: 'users', active: activeSection === 'users' },
    { id: 'projects', label: 'Project Management', icon: 'project-diagram', active: activeSection === 'projects' },
    { id: 'reports', label: 'Reports', icon: 'file-alt', active: activeSection === 'reports' },
    { id: 'audit', label: 'Audit Logs', icon: 'history', active: activeSection === 'audit' },
    { id: 'settings', label: 'Settings', icon: 'cog', active: activeSection === 'settings' },
  ];

  const totalVulns = vulnStats ? 
    vulnStats.critical + vulnStats.high + vulnStats.medium + vulnStats.low + vulnStats.informational : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <Header 
        title="SecureVAPT Admin"
        subtitle="Administrator Dashboard"
        user={user}
        bgColor="bg-primary"
        iconColor="text-primary-foreground"
      />
      
      <div className="flex">
        <Sidebar 
          items={sidebarItems}
          onItemClick={setActiveSection}
          activeColor="bg-primary text-primary-foreground"
        />

        <main className="flex-1 p-6">
          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
                <Button className="bg-primary text-primary-foreground" data-testid="button-new-project">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Active Projects</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-active-projects">
                          {statsLoading ? '...' : stats?.activeProjects || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <ChartGantt className="text-blue-600 dark:text-blue-400 h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-green-600 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +2
                      </span>
                      <span className="text-muted-foreground ml-2">from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Vulnerabilities</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-total-vulnerabilities">
                          {vulnStatsLoading ? '...' : totalVulns}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                        <AlertTriangle className="text-red-600 dark:text-red-400 h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-red-600 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +15
                      </span>
                      <span className="text-muted-foreground ml-2">this week</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Active Pentesters</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-active-testers">
                          {statsLoading ? '...' : stats?.activeTesters || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Users className="text-green-600 dark:text-green-400 h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-green-600 flex items-center">
                        <Check className="w-3 h-3 mr-1" />
                        All available
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Clients</p>
                        <p className="text-3xl font-bold text-foreground" data-testid="text-total-clients">
                          {statsLoading ? '...' : stats?.totalClients || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                        <Star className="text-yellow-600 dark:text-yellow-400 h-6 w-6" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-green-600 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        +2
                      </span>
                      <span className="text-muted-foreground ml-2">from last quarter</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Projects */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  {projectsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-muted rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : projects && projects.length > 0 ? (
                    <div className="space-y-4">
                      {projects.slice(0, 5).map((project: any) => (
                        <div key={project.id} className="flex items-center justify-between p-3 border border-border rounded-lg" data-testid={`card-project-${project.id}`}>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <ChartGantt className="text-primary h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground" data-testid={`text-project-name-${project.id}`}>{project.name}</p>
                              <p className="text-sm text-muted-foreground">Client: {project.client?.firstName} {project.client?.lastName}</p>
                            </div>
                          </div>
                          <Badge 
                            variant={project.status === 'active' ? 'default' : project.status === 'completed' ? 'secondary' : 'outline'}
                            data-testid={`badge-project-status-${project.id}`}
                          >
                            {project.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ChartGantt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No projects found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* User Management Section */}
          {activeSection === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">User Management</h2>
                <div className="flex space-x-3">
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                    onClick={() => setActiveSection('create-user')}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create User (Username/Password)
                  </Button>
                  <Button 
                    className="bg-primary text-primary-foreground" 
                    data-testid="button-add-user"
                    onClick={handleAddUser}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User (OIDC)
                  </Button>
                </div>
              </div>

              {/* User Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Pentesters</p>
                        <p className="text-2xl font-bold text-foreground">
                          {usersLoading ? '...' : users?.filter((u: any) => u.role === 'pentester').length || 0}
                        </p>
                      </div>
                      <Users className="text-emerald-600 h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Active Clients</p>
                        <p className="text-2xl font-bold text-foreground">
                          {usersLoading ? '...' : users?.filter((u: any) => u.role === 'client').length || 0}
                        </p>
                      </div>
                      <Users className="text-blue-600 h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Administrators</p>
                        <p className="text-2xl font-bold text-foreground">
                          {usersLoading ? '...' : users?.filter((u: any) => u.role === 'admin').length || 0}
                        </p>
                      </div>
                      <Users className="text-purple-600 h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* User Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Users</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Input placeholder="Search users..." className="w-64" data-testid="input-search-users" />
                      <Select>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="pentester">Pentester</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-muted rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : users && users.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: any) => (
                          <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  <span className="text-primary font-medium">
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-foreground" data-testid={`text-user-name-${user.id}`}>
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={user.role === 'admin' ? 'destructive' : user.role === 'pentester' ? 'default' : 'secondary'}
                                data-testid={`badge-user-role-${user.id}`}
                              >
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-foreground">{user.organization || 'N/A'}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  data-testid={`button-edit-user-${user.id}`}
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-destructive" 
                                      data-testid={`button-delete-user-${user.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {user.firstName} {user.lastName}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        className="bg-destructive text-destructive-foreground"
                                        onClick={() => handleDeleteUser(user.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Project Management Section */}
          {activeSection === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Project Management</h2>
                <Button 
                  className="bg-primary text-primary-foreground" 
                  data-testid="button-create-project"
                  onClick={() => {
                    setProjectData({
                      name: '',
                      type: '',
                      description: '',
                      clientId: '',
                      startDate: undefined,
                      endDate: undefined,
                    });
                    setAssignedPentesters([]);
                    setIsCreateProjectModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              </div>

              {/* Project Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Active Projects</p>
                        <p className="text-2xl font-bold text-foreground">
                          {projectsLoading ? '...' : projects?.filter((p: any) => p.status === 'active').length || 0}
                        </p>
                      </div>
                      <ChartGantt className="text-blue-600 h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Planned Projects</p>
                        <p className="text-2xl font-bold text-foreground">
                          {projectsLoading ? '...' : projects?.filter((p: any) => p.status === 'planned').length || 0}
                        </p>
                      </div>
                      <History className="text-yellow-600 h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Completed Projects</p>
                        <p className="text-2xl font-bold text-foreground">
                          {projectsLoading ? '...' : projects?.filter((p: any) => p.status === 'completed').length || 0}
                        </p>
                      </div>
                      <Check className="text-green-600 h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-muted-foreground text-sm">Total Projects</p>
                        <p className="text-2xl font-bold text-foreground">
                          {projectsLoading ? '...' : projects?.length || 0}
                        </p>
                      </div>
                      <FileText className="text-purple-600 h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Project Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Projects</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Input 
                        placeholder="Search projects..." 
                        className="w-64" 
                        data-testid="input-search-projects"
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                      />
                      <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="planned">Planned</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {projectsLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-muted rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : projects && projects.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects
                          .filter((project: any) => {
                            const matchesSearch = projectSearchTerm === '' || 
                              project.name.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                              project.type.toLowerCase().includes(projectSearchTerm.toLowerCase()) ||
                              (project.client?.firstName + ' ' + project.client?.lastName).toLowerCase().includes(projectSearchTerm.toLowerCase());
                            
                            const matchesStatus = projectStatusFilter === 'all' || project.status === projectStatusFilter;
                            
                            return matchesSearch && matchesStatus;
                          })
                          .map((project: any) => (
                          <TableRow key={project.id} data-testid={`row-project-${project.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground" data-testid={`text-project-name-${project.id}`}>
                                  {project.name}
                                </p>
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {project.description || 'No description'}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" data-testid={`badge-project-type-${project.id}`}>
                                {project.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">
                                  {project.client?.firstName} {project.client?.lastName}
                                </p>
                                <p className="text-muted-foreground">{project.client?.organization}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  project.status === 'active' ? 'default' : 
                                  project.status === 'completed' ? 'secondary' : 
                                  project.status === 'on-hold' ? 'destructive' :
                                  'outline'
                                }
                                data-testid={`badge-project-status-${project.id}`}
                              >
                                {project.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="w-16">
                                <div className="text-xs text-muted-foreground mb-1">
                                  {project.progress || 0}%
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all" 
                                    style={{ width: `${project.progress || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Not set'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  data-testid={`button-edit-project-${project.id}`}
                                  onClick={() => {
                                    setSelectedProject(project);
                                    setProjectData({
                                      name: project.name,
                                      type: project.type,
                                      description: project.description || '',
                                      clientId: project.clientId,
                                      startDate: project.startDate ? new Date(project.startDate) : undefined,
                                      endDate: project.endDate ? new Date(project.endDate) : undefined,
                                    });
                                    setIsEditProjectModalOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      className="text-destructive" 
                                      size="sm"
                                      data-testid={`button-delete-project-${project.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{project.name}"? This action cannot be undone and will remove all associated data.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        className="bg-destructive text-destructive-foreground"
                                        onClick={() => {
                                          setSelectedProject(project);
                                          setIsDeleteProjectModalOpen(true);
                                        }}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <ChartGantt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No projects found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Create User Section */}
          {activeSection === 'create-user' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-foreground">Create Username/Password User</h2>
                <Button 
                  variant="outline"
                  onClick={() => setActiveSection('users')}
                >
                  Back to User Management
                </Button>
              </div>
              <div className="max-w-2xl">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-6">
                      Create new pentester or client accounts with username and password credentials. 
                      These accounts will use local authentication instead of SSO.
                    </p>
                    <CreateUserForm />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Other sections can be added here */}
          {activeSection !== 'overview' && activeSection !== 'users' && activeSection !== 'projects' && activeSection !== 'create-user' && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Section
              </h2>
              <p className="text-muted-foreground">This section is under development.</p>
            </div>
          )}
        </main>
        
        {/* User Management Modals */}
        <UserManagementModals 
          isAddUserDialogOpen={isAddUserDialogOpen}
          setIsAddUserDialogOpen={setIsAddUserDialogOpen}
          isEditUserDialogOpen={isEditUserDialogOpen}
          setIsEditUserDialogOpen={setIsEditUserDialogOpen}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          newUserData={newUserData}
          setNewUserData={setNewUserData}
        />

        {/* Project Management Modals */}
        <ProjectManagementModals
          isCreateModalOpen={isCreateProjectModalOpen}
          setIsCreateModalOpen={setIsCreateProjectModalOpen}
          isEditModalOpen={isEditProjectModalOpen}
          setIsEditModalOpen={setIsEditProjectModalOpen}
          isDeleteModalOpen={isDeleteProjectModalOpen}
          setIsDeleteModalOpen={setIsDeleteProjectModalOpen}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          projectData={projectData}
          setProjectData={setProjectData}
          assignedPentesters={assignedPentesters}
          setAssignedPentesters={setAssignedPentesters}
        />
      </div>
    </div>
  );
}
