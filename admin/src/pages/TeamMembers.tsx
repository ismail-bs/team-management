import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, Mail, Phone, MapPin, Calendar, Loader2, Users, Briefcase } from "lucide-react";
import { InviteMemberDialog } from "@/components/dialogs/InviteMemberDialog";
import { toast } from "@/hooks/use-toast";
import { apiClient, User } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function TeamMembers() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Array<{_id: string; name: string; employeeCount: number}>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  
  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getUsers({ limit: 100 });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive"
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Handle invite member
  const handleInviteMember = async (memberData: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    department?: string;
  }) => {
    try {
      await apiClient.inviteUser(memberData);
      
      toast({
        title: "Success",
        description: `Invitation sent to ${memberData.email}`,
      });
      
      setInviteMemberOpen(false);
      await loadUsers(); // Refresh data
      
    } catch (error) {
      console.error('Failed to invite member:', error);
      
      // Extract actual error message from backend
      let errorMessage = "Failed to send invitation";
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Load departments
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await apiClient.getDepartments();
      setDepartments(response);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  // Filter members
  const filteredMembers = users.filter(user => {
    const matchesSearch = 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Handle both populated object and ID string
    const userDeptId = typeof user.department === 'object' 
      ? user.department?._id 
      : user.department;
    
    const matchesDepartment = 
      selectedDepartment === 'all' || 
      userDeptId === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading team members...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Team Members</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Manage your team and track member contributions
            </p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => setInviteMemberOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>

        {/* Department Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4">
          {departments.map((dept) => (
            <Card 
              key={dept._id} 
              className="cursor-pointer transition-all hover:shadow-md hover:scale-105"
              onClick={() => setSelectedDepartment(selectedDepartment === dept._id ? 'all' : dept._id)}
            >
              <CardContent className="p-4 text-center">
                <Briefcase className={`h-6 w-6 mx-auto mb-2 ${
                  selectedDepartment === dept._id ? 'text-blue-600' : 'text-muted-foreground'
                }`} />
                <p className="text-xs font-medium truncate">{dept.name}</p>
                <p className="text-lg font-bold">{dept.employeeCount}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search team members..." 
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept._id} value={dept._id}>
                      {dept.name} ({dept.employeeCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredMembers.length > 0 ? (
            filteredMembers.map(member => {
              const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
              const statusColor = member.status === 'active' ? 'bg-green-500' : 'bg-gray-400';
              
              return (
                <Card key={member._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center pb-3">
                    <div className="relative mx-auto mb-3">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={member.avatar} alt={`${member.firstName} ${member.lastName}`} />
                        <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background ${statusColor}`} />
                    </div>
                    <CardTitle className="text-base md:text-lg">
                      {member.firstName} {member.lastName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{member.role.replace('_', ' ')}</p>
                    {member.department && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        {typeof member.department === 'object' ? member.department.name : member.department}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{member.phone}</span>
                        </div>
                      )}
                      {member.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{member.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>Joined {new Date(member.joinDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {member.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 pt-2 border-t">
                        {member.bio}
                      </p>
                    )}

                    <div className="flex justify-end items-center pt-3 border-t">
                      {/* TODO: Temporarily hidden - Tasks Done section */}
                      {/* <div className="text-center">
                        <div className="text-lg font-semibold">{member.tasksCompleted || 0}</div>
                        <div className="text-xs text-muted-foreground">Tasks Done</div>
                      </div> */}
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {member.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full">
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No team members found</p>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || selectedDepartment !== 'all' 
                      ? 'Try adjusting your filters' 
                      : 'Invite your first team member to get started'}
                  </p>
                  {!searchTerm && selectedDepartment === 'all' && (
                    <Button onClick={() => setInviteMemberOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Invite Member Dialog */}
        <InviteMemberDialog 
          open={inviteMemberOpen} 
          onOpenChange={setInviteMemberOpen} 
          onSubmit={handleInviteMember} 
        />
      </div>
    </DashboardLayout>
  );
}
