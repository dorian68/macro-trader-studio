import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Edit, Building2, DollarSign } from "lucide-react";
import { useBrokerActions } from "@/hooks/useBrokerActions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";

interface Broker {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  contact_email?: string;
  logo_url?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  user_count?: number;
  estimated_revenue?: number;
}

export function BrokersManagement() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'active' as 'active' | 'inactive',
    contact_email: '',
    logo_url: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(10);

  const { fetchBrokers, createBroker, updateBroker, loading: actionLoading } = useBrokerActions();
  const { toast } = useToast();
  const { isSuperUser } = useProfile();

  const loadBrokers = async () => {
    setLoading(true);
    const brokersData = await fetchBrokers();
    
    // Si super user, enrichir avec les données de revenus
    if (isSuperUser) {
      console.log(`📊 [BrokersManagement] Enriching ${brokersData.length} brokers with revenue data...`);
      
      const enrichedBrokers = await Promise.all(
        brokersData.map(async (broker) => {
          console.log(`📊 [BrokersManagement] Processing broker: ${broker.name} (${broker.id})`);
          
          try {
            // Récupérer les users du broker
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('user_id, user_plan')
              .eq('broker_id', broker.id);

            console.log(`📊 [BrokersManagement] Broker ${broker.name}: found ${profiles?.length || 0} profiles`, profiles);

            if (profilesError) {
              console.error(`❌ [BrokersManagement] Error fetching profiles for ${broker.name}:`, profilesError);
              throw profilesError;
            }

            // Récupérer les paramètres de plans pour calculer les revenus
            const { data: planParams, error: planError } = await supabase
              .from('plan_parameters')
              .select('plan_type, monthly_price_usd');

            console.log(`📊 [BrokersManagement] Plan parameters fetched:`, planParams);

            if (planError) {
              console.error(`❌ [BrokersManagement] Error fetching plan params:`, planError);
              throw planError;
            }

            // Créer un map des prix par plan avec conversion Number()
            const planPrices = planParams?.reduce((acc, plan) => {
              const price = Number(plan.monthly_price_usd) || 0;
              console.log(`📊 [BrokersManagement] Mapping plan ${plan.plan_type} → $${price} (raw: ${plan.monthly_price_usd}, type: ${typeof plan.monthly_price_usd})`);
              acc[plan.plan_type] = price;
              return acc;
            }, {} as Record<string, number>) || {};

            console.log(`📊 [BrokersManagement] Plan prices map:`, planPrices);

            // Calculer le revenu estimé
            let totalRevenue = 0;
            profiles?.forEach((profile) => {
              const planType = profile.user_plan || 'free_trial';
              let price = 0;
              
              if (planType === 'free_trial') {
                price = 3;
              } else {
                price = planPrices[planType] || 0;
              }
              
              console.log(`📊 [BrokersManagement] Profile ${profile.user_id}: plan=${planType}, price=$${price}`);
              totalRevenue += price;
            });

            console.log(`✅ [BrokersManagement] Broker ${broker.name}: ${profiles?.length || 0} users, total revenue = $${totalRevenue}`);

            return {
              ...broker,
              user_count: profiles?.length || 0,
              estimated_revenue: totalRevenue
            };
          } catch (error) {
            console.error(`❌ [BrokersManagement] Error loading revenue for ${broker.name}:`, error);
            return {
              ...broker,
              user_count: 0,
              estimated_revenue: 0
            };
          }
        })
      );
      
      console.log(`✅ [BrokersManagement] All brokers enriched:`, enrichedBrokers.map(b => ({
        name: b.name,
        users: b.user_count,
        revenue: b.estimated_revenue
      })));
      
      setBrokers(enrichedBrokers);
    } else {
      setBrokers(brokersData);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadBrokers();
  }, []);

  const handleOpenDialog = (broker?: Broker) => {
    if (broker) {
      setEditingBroker(broker);
      setFormData({
        name: broker.name,
        code: broker.code || '',
        status: broker.status,
        contact_email: broker.contact_email || '',
        logo_url: broker.logo_url || ''
      });
    } else {
      setEditingBroker(null);
      setFormData({
        name: '',
        code: '',
        status: 'active',
        contact_email: '',
        logo_url: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Broker name is required",
        variant: "destructive"
      });
      return;
    }

    const brokerData = {
      name: formData.name.trim(),
      code: formData.code.trim() || null,
      status: formData.status,
      contact_email: formData.contact_email.trim() || null,
      logo_url: formData.logo_url.trim() || null
    };

    let result;
    if (editingBroker) {
      result = await updateBroker(editingBroker.id, brokerData);
    } else {
      result = await createBroker(brokerData);
    }

    if (result.success) {
      setDialogOpen(false);
      await loadBrokers();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination logic
  const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(brokers.length / itemsPerPage);
  const paginatedBrokers = itemsPerPage === 'all' 
    ? brokers 
    : brokers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm border">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardHeader className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Brokers Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage broker organizations and their settings
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Broker
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingBroker ? 'Edit Broker' : 'Add New Broker'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Broker name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Optional broker code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contact@broker.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={actionLoading}
                    className="flex-1"
                  >
                    {editingBroker ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {brokers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No brokers found</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[500px]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      {isSuperUser && <TableHead className="text-center">Users</TableHead>}
                      {isSuperUser && <TableHead className="text-center">Est. Revenue</TableHead>}
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBrokers.map((broker) => (
                      <TableRow key={broker.id}>
                        <TableCell className="font-medium">{broker.name}</TableCell>
                        <TableCell>
                          {broker.code ? (
                            <Badge variant="outline">{broker.code}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={broker.status === 'active' ? 'default' : 'secondary'}>
                            {broker.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {broker.contact_email || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        {isSuperUser && (
                          <TableCell className="text-center">
                            <Badge variant="outline">{broker.user_count || 0}</Badge>
                          </TableCell>
                        )}
                        {isSuperUser && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <DollarSign className="h-3 w-3 text-green-600" />
                              <span className="font-semibold text-green-600">
                                {(broker.estimated_revenue || 0).toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(broker.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(broker)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
            
            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setItemsPerPage(value === 'all' ? 'all' : parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="all">Show All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {itemsPerPage === 'all' 
                    ? `Showing all ${brokers.length} brokers`
                    : `Showing ${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, brokers.length)} of ${brokers.length}`
                  }
                </span>
              </div>

              {itemsPerPage !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}