import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, Eye, Printer, Download, ChevronLeft, ChevronRight, Trash2, Edit, Lock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import InvoiceBillTemplate from '@/components/invoicing/InvoiceBillTemplate';
import { useToast } from '@/hooks/use-toast';

interface BillRow {
  quantity: number;
  item: string;
  orderNumber: string;
  deliveryCity: string;
  rate: number;
  amount: number;
  isExtraFee?: boolean;
}

interface Bill {
  id: string;
  bill_number: string;
  bill_to: string;
  driver_name: string | null;
  vehicle_number: string | null;
  order_numbers: string[];
  total_amount: number;
  total_quantity: number;
  bill_date: string;
  created_at: string;
  bill_rows?: BillRow[] | null;
}

const ITEMS_PER_PAGE = 15;

const BillHistory = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editedBillRows, setEditedBillRows] = useState<BillRow[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Password for editing bills (you can change this)
  const EDIT_PASSWORD = 'kalana123@'; // TODO: Move to environment variable or secure storage

  useEffect(() => {
    fetchBills();
  }, [currentPage, dateFilter]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('bills')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply date filter if set
      if (dateFilter) {
        const dateStr = format(dateFilter, 'yyyy-MM-dd');
        query = query.eq('bill_date', dateStr);
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setBills(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching bills:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bill history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter bills by search term (client-side for immediate feedback)
  const filteredBills = bills.filter((bill) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      bill.bill_number.toLowerCase().includes(term) ||
      bill.bill_to.toLowerCase().includes(term) ||
      bill.order_numbers.some((orderNum) => orderNum.toLowerCase().includes(term)) ||
      bill.driver_name?.toLowerCase().includes(term) ||
      bill.vehicle_number?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowBillDialog(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const clearDateFilter = () => {
    setDateFilter(undefined);
    setCurrentPage(1);
  };

  const handleDeleteClick = (bill: Bill) => {
    setBillToDelete(bill);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!billToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', billToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Bill ${billToDelete.bill_number} has been deleted successfully`,
      });

      // Refresh the bills list
      await fetchBills();
      setShowDeleteDialog(false);
      setBillToDelete(null);
    } catch (error) {
      console.error('Error deleting bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete bill. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditClick = (bill: Bill) => {
    setEditingBill(bill);
    setShowPasswordDialog(true);
    setPassword('');
    setPasswordError('');
  };

  const handlePasswordSubmit = () => {
    if (password === EDIT_PASSWORD) {
      setPasswordError('');
      setShowPasswordDialog(false);
      // Load bill rows for editing
      const billRows = editingBill?.bill_rows || [];
      setEditedBillRows(JSON.parse(JSON.stringify(billRows))); // Deep copy
      setShowEditDialog(true);
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBill) return;

    setSaving(true);
    try {
      // Calculate new totals
      let totalAmount = 0;
      let totalQuantity = 0;

      editedBillRows.forEach(row => {
        totalAmount += row.amount;
        if (!row.isExtraFee) {
          totalQuantity += row.quantity;
        }
      });

      const { error } = await supabase
        .from('bills')
        .update({
          bill_rows: editedBillRows,
          total_amount: totalAmount,
          total_quantity: totalQuantity
        })
        .eq('id', editingBill.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Bill ${editingBill.bill_number} has been updated successfully`,
      });

      // Refresh the bills list
      await fetchBills();
      setShowEditDialog(false);
      setEditingBill(null);
      setEditedBillRows([]);
    } catch (error) {
      console.error('Error updating bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bill. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRowChange = (index: number, field: keyof BillRow, value: string | number) => {
    const updatedRows = [...editedBillRows];
    const row = { ...updatedRows[index] };
    
    if (field === 'item') {
      row.item = value as string;
    } else if (field === 'rate') {
      row.rate = Number(value);
      row.amount = row.rate * row.quantity;
    } else if (field === 'quantity') {
      row.quantity = Number(value);
      row.amount = row.rate * row.quantity;
    } else if (field === 'amount') {
      row.amount = Number(value);
      if (row.quantity > 0) {
        row.rate = row.amount / row.quantity;
      }
    }

    updatedRows[index] = row;
    setEditedBillRows(updatedRows);
  };

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bill History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Section */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by bill number, dealer, order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal min-w-[180px]',
                      !dateFilter && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, 'PPP') : 'Filter by date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={dateFilter}
                    onSelect={(date) => {
                      setDateFilter(date);
                      setCurrentPage(1);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {dateFilter && (
                <Button variant="ghost" onClick={clearDateFilter}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Bills Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bills...</div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || dateFilter ? 'No bills match your search criteria' : 'No bills found'}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill No.</TableHead>
                      <TableHead>Bill To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount (Rs.)</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.bill_number}</TableCell>
                        <TableCell>{bill.bill_to}</TableCell>
                        <TableCell>{format(parseISO(bill.bill_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {bill.order_numbers.slice(0, 3).map((orderNum, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {orderNum}
                              </Badge>
                            ))}
                            {bill.order_numbers.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{bill.order_numbers.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{bill.total_quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          {bill.total_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{bill.driver_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewBill(bill)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(bill)}
                              className="gap-1"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(bill)}
                              className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} bills
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bill View/Print Dialog */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
          <DialogHeader className="print:hidden">
            <DialogTitle>Bill #{selectedBill?.bill_number}</DialogTitle>
          </DialogHeader>
          
          {selectedBill && (
            <>
              <div className="print:hidden flex gap-2 mb-4">
                <Button onClick={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
              
              <div className="bill-preview-content">
                <InvoiceBillTemplate
                  billNumber={selectedBill.bill_number}
                  orderNumbers={selectedBill.order_numbers}
                  billTo={selectedBill.bill_to}
                  driverName={selectedBill.driver_name || ''}
                  vehicleNumber={selectedBill.vehicle_number || ''}
                  invoiceDate={format(parseISO(selectedBill.bill_date), 'dd/MM/yyyy')}
                  rows={selectedBill.bill_rows || []}
                  totalAmount={selectedBill.total_amount}
                  totalQuantity={selectedBill.total_quantity}
                />
                <p className="text-center text-muted-foreground mt-4 print:hidden text-sm">
                  {selectedBill.bill_rows && selectedBill.bill_rows.length > 0 
                    ? 'Bill details loaded from database.'
                    : 'Note: This is a summary view. Original order details may not be available.'}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete bill <strong>{billToDelete?.bill_number}</strong>.
              This action cannot be undone. All associated data will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Bill'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Enter Password to Edit Bill
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
                placeholder="Enter password"
                className={passwordError ? 'border-destructive' : ''}
              />
              {passwordError && (
                <p className="text-sm text-destructive mt-1">{passwordError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword('');
                  setPasswordError('');
                  setEditingBill(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handlePasswordSubmit}>
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bill #{editingBill?.bill_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              You can edit the size (item) and prices (rate) for each row. Changes will automatically update the amount and totals.
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Qty</TableHead>
                    <TableHead>Item/Size</TableHead>
                    <TableHead className="w-24">Order No</TableHead>
                    <TableHead className="w-32">Delivery City</TableHead>
                    <TableHead className="w-32 text-right">Rate</TableHead>
                    <TableHead className="w-32 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedBillRows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {row.isExtraFee ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <Input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleRowChange(index, 'quantity', e.target.value)}
                            className="w-16"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {row.isExtraFee ? (
                          <span className="text-muted-foreground pl-4">{row.item}</span>
                        ) : (
                          <Input
                            value={row.item}
                            onChange={(e) => handleRowChange(index, 'item', e.target.value)}
                            placeholder="Table size"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.isExtraFee ? '-' : row.orderNumber}
                      </TableCell>
                      <TableCell>
                        {row.isExtraFee ? '-' : row.deliveryCity}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.rate}
                          onChange={(e) => handleRowChange(index, 'rate', e.target.value)}
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => handleRowChange(index, 'amount', e.target.value)}
                          className="text-right font-medium"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Total Quantity: {editedBillRows.filter(r => !r.isExtraFee).reduce((sum, r) => sum + r.quantity, 0)}
              </div>
              <div className="text-lg font-bold">
                Total Amount: LKR {editedBillRows.reduce((sum, r) => sum + r.amount, 0).toLocaleString()}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingBill(null);
                  setEditedBillRows([]);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillHistory;
