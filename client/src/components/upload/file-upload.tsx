import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Project } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CloudUpload, FileText, AlertCircle, CheckCircle } from "lucide-react";

export default function FileUpload() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Projects query
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    retry: false,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, projectId }: { file: File; projectId: string }) => {
      const formData = new FormData();
      formData.append('report', file);
      formData.append('projectId', projectId);

      const response = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Report uploaded successfully.",
      });
      setSelectedFile(null);
      setSelectedProjectId("");
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Upload Failed",
        description: "Failed to upload report. Please try again.",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Only PDF, DOCX, and JSON files are allowed.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 50MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedProjectId) {
      toast({
        title: "Missing Information",
        description: "Please select both a file and a project.",
        variant: "destructive",
      });
      return;
    }

    // Simulate upload progress
    setUploadProgress(10);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await uploadMutation.mutateAsync({ file: selectedFile, projectId: selectedProjectId });
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      clearInterval(progressInterval);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-600" />;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return <FileText className="w-8 h-8 text-blue-600" />;
    } else if (file.type === 'application/json') {
      return <FileText className="w-8 h-8 text-green-600" />;
    }
    return <FileText className="w-8 h-8 text-gray-600" />;
  };

  return (
    <div className="space-y-4" data-testid="file-upload">
      {/* Project Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Select Project</label>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger data-testid="select-project-upload">
            <SelectValue placeholder="Choose a project..." />
          </SelectTrigger>
          <SelectContent>
            {projectsLoading ? (
              <SelectItem value="loading" disabled>Loading projects...</SelectItem>
            ) : projects && projects.length > 0 ? (
              projects.map((project: any) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-projects" disabled>No projects available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* File Upload Area */}
      <div className="border-2 border-dashed border-muted rounded-lg p-6">
        {!selectedFile ? (
          <div className="text-center">
            <CloudUpload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">Upload Report</p>
            <p className="text-sm text-muted-foreground mb-4">PDF, DOCX, or JSON files (max 50MB)</p>
            <input
              type="file"
              accept=".pdf,.docx,.json"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              data-testid="input-file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>Choose File</span>
              </Button>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected File Display */}
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              {getFileIcon(selectedFile)}
              <div className="flex-1">
                <p className="font-medium text-foreground" data-testid="text-selected-filename">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedFile(null)}
                data-testid="button-remove-file"
              >
                ×
              </Button>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Upload Button */}
            <Button 
              onClick={handleUpload}
              disabled={!selectedProjectId || uploadMutation.isPending}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              data-testid="button-upload-file"
            >
              {uploadMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4 mr-2" />
                  Upload Report
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* File Requirements */}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-3 h-3 text-green-600" />
          <span>Supported formats: PDF, DOCX, JSON</span>
        </div>
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-3 h-3 text-yellow-600" />
          <span>Maximum file size: 50MB</span>
        </div>
      </div>
    </div>
  );
}
