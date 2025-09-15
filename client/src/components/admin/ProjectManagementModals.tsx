import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Project, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ProjectFormData {
  name: string;
  type: string;
  description: string;
  clientId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface ProjectManagementModalsProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isEditModalOpen: boolean;
  setIsEditModalOpen: (open: boolean) => void;
  isDeleteModalOpen: boolean;
  setIsDeleteModalOpen: (open: boolean) => void;
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  projectData: ProjectFormData;
  setProjectData: (data: ProjectFormData) => void;
  assignedPentesters: string[];
  setAssignedPentesters: (pentesters: string[]) => void;
}

const PROJECT_TYPES = [
  "Web Application",
  "Network Security",
  "Mobile Application", 
  "Active Directory",
  "Cloud Infrastructure",
  "API Security",
  "Social Engineering",
  "Physical Security",
  "Wireless Security",
  "IoT Security"
];

export default function ProjectManagementModals({
  isCreateModalOpen,
  setIsCreateModalOpen,
  isEditModalOpen,
  setIsEditModalOpen,
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  selectedProject,
  setSelectedProject,
  projectData,
  setProjectData,
  assignedPentesters,
  setAssignedPentesters
}: ProjectManagementModalsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for UI elements
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const [pentestersOpen, setPentestersOpen] = useState(false);

  // Fetch clients and pentesters
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  const clients = users?.filter((user: User) => user.role === 'client') || [];
  const pentesters = users?.filter((user: User) => user.role === 'pentester') || [];

  // Create project mutation
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
      setIsCreateModalOpen(false);
      resetForm();
      toast({ title: "Success", description: "Project created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update project mutation
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
      setIsEditModalOpen(false);
      setSelectedProject(null);
      toast({ title: "Success", description: "Project updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete project mutation
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
      setIsDeleteModalOpen(false);
      setSelectedProject(null);
      toast({ title: "Success", description: "Project deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setProjectData({
      name: '',
      type: '',
      description: '',
      clientId: '',
      startDate: undefined,
      endDate: undefined,
    });
    setAssignedPentesters([]);
  };

  const handleCreateProject = () => {
    if (!projectData.name || !projectData.type || !projectData.clientId || !projectData.description || !projectData.startDate) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields (Name, Type, Description, Client, Start Date)", 
        variant: "destructive" 
      });
      return;
    }

    createProjectMutation.mutate({
      name: projectData.name,
      type: projectData.type,
      description: projectData.description,
      clientId: projectData.clientId,
      startDate: projectData.startDate ? projectData.startDate.toISOString() : null,
      endDate: projectData.endDate ? projectData.endDate.toISOString() : null,
      status: 'planned',
      progress: 0,
    });
  };

  const handleUpdateProject = () => {
    if (!selectedProject || !projectData.name || !projectData.type || !projectData.clientId || !projectData.description || !projectData.startDate) {
      toast({ 
        title: "Validation Error", 
        description: "Please fill in all required fields (Name, Type, Description, Client, Start Date)", 
        variant: "destructive" 
      });
      return;
    }

    updateProjectMutation.mutate({
      id: selectedProject.id,
      data: {
        name: projectData.name,
        type: projectData.type,
        description: projectData.description,
        clientId: projectData.clientId,
        startDate: projectData.startDate ? projectData.startDate.toISOString() : null,
        endDate: projectData.endDate ? projectData.endDate.toISOString() : null,
      }
    });
  };

  const handleDeleteProject = () => {
    if (!selectedProject) return;
    deleteProjectMutation.mutate(selectedProject.id);
  };

  return (
    <>
      {/* Create Project Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Project Name */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Project Name *</Label>
              <Input
                id="name"
                value={projectData.name}
                onChange={(e) => setProjectData({...projectData, name: e.target.value})}
                className="col-span-3"
                placeholder="Enter project name"
              />
            </div>

            {/* Project Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type *</Label>
              <Select value={projectData.type} onValueChange={(value) => setProjectData({...projectData, type: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right mt-2">Description</Label>
              <Textarea
                id="description"
                value={projectData.description}
                onChange={(e) => setProjectData({...projectData, description: e.target.value})}
                className="col-span-3 min-h-[80px]"
                placeholder="Enter project description"
              />
            </div>

            {/* Client Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Client *</Label>
              <Popover open={clientOpen} onOpenChange={setClientOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientOpen}
                    className="col-span-3 justify-between"
                  >
                    {projectData.clientId
                      ? clients.find((client: User) => client.id === projectData.clientId)?.firstName + ' ' + 
                        clients.find((client: User) => client.id === projectData.clientId)?.lastName
                      : "Select client..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search clients..." />
                    <CommandEmpty>No clients found.</CommandEmpty>
                    <CommandGroup>
                      {clients.map((client: User) => (
                        <CommandItem
                          key={client.id}
                          onSelect={() => {
                            setProjectData({...projectData, clientId: client.id});
                            setClientOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              projectData.clientId === client.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {client.firstName} {client.lastName} ({client.email})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Assigned Pentesters */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-2">Pentesters</Label>
              <div className="col-span-3 space-y-2">
                <Popover open={pentestersOpen} onOpenChange={setPentestersOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {assignedPentesters.length > 0
                        ? `${assignedPentesters.length} pentester(s) selected`
                        : "Select pentesters..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search pentesters..." />
                      <CommandEmpty>No pentesters found.</CommandEmpty>
                      <CommandGroup>
                        {pentesters.map((pentester: User) => (
                          <CommandItem
                            key={pentester.id}
                            onSelect={() => {
                              const isSelected = assignedPentesters.includes(pentester.id);
                              if (isSelected) {
                                setAssignedPentesters(assignedPentesters.filter(id => id !== pentester.id));
                              } else {
                                setAssignedPentesters([...assignedPentesters, pentester.id]);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                assignedPentesters.includes(pentester.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {pentester.firstName} {pentester.lastName} ({pentester.email})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {/* Selected Pentesters Display */}
                {assignedPentesters.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {assignedPentesters.map((pentesterId) => {
                      const pentester = pentesters.find((p: User) => p.id === pentesterId);
                      return (
                        <div key={pentesterId} className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">
                          {pentester?.firstName} {pentester?.lastName}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Start Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Start Date</Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !projectData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {projectData.startDate ? format(projectData.startDate, "PPP") : "Pick a start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={projectData.startDate}
                    onSelect={(date) => {
                      setProjectData({...projectData, startDate: date});
                      setStartDateOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">End Date</Label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !projectData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {projectData.endDate ? format(projectData.endDate, "PPP") : "Pick an end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={projectData.endDate}
                    onSelect={(date) => {
                      setProjectData({...projectData, endDate: date});
                      setEndDateOpen(false);
                    }}
                    disabled={(date) => 
                      projectData.startDate ? date < projectData.startDate : false
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {setIsCreateModalOpen(false); resetForm();}}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Same form fields as create modal */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editName" className="text-right">Project Name *</Label>
              <Input
                id="editName"
                value={projectData.name}
                onChange={(e) => setProjectData({...projectData, name: e.target.value})}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editType" className="text-right">Type *</Label>
              <Select value={projectData.type} onValueChange={(value) => setProjectData({...projectData, type: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="editDescription" className="text-right mt-2">Description</Label>
              <Textarea
                id="editDescription"
                value={projectData.description}
                onChange={(e) => setProjectData({...projectData, description: e.target.value})}
                className="col-span-3 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Client *</Label>
              <Select value={projectData.clientId} onValueChange={(value) => setProjectData({...projectData, clientId: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: User) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProject} disabled={updateProjectMutation.isPending}>
              {updateProjectMutation.isPending ? 'Updating...' : 'Update Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProject?.name}"? This action cannot be undone and will also delete all associated vulnerabilities and reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteProject}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}