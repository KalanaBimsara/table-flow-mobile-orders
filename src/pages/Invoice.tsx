import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Download, Printer } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Order, colourOptions, tableSizeOptions } from '@/types/order';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Invoice: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { orders } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (orderId) {
      const foundOrder = orders.find(o => o.id === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
        // Auto-generate invoice number
        setInvoiceNumber(`INV-${foundOrder.id.slice(0, 8).toUpperCase()}`);
      } else {
        toast.error('Order not found');
        navigate('/history');
      }
    }
  }, [orderId, orders, navigate]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getTableSizeLabel = (value: string) => {
    const option = tableSizeOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const getColourLabel = (value: string) => {
    const option = colourOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const invoiceContent = document.getElementById('invoice-content');
      if (invoiceContent) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice - ${invoiceNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .logo { max-width: 150px; max-height: 100px; }
                .invoice-details { margin-bottom: 30px; }
                .customer-details { margin-bottom: 30px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .items-table th { background-color: #f5f5f5; }
                .total-section { text-align: right; }
                .total-amount { font-size: 18px; font-weight: bold; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${invoiceContent.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 no-print">
        <Button onClick={() => navigate('/history')} variant="outline" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Order History
        </Button>
        
        <div className="flex gap-4 mb-6">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader className="no-print">
          <CardTitle>Invoice Generator</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Business Information Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 no-print">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
              />
            </div>
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="businessPhone">Business Phone</Label>
              <Input
                id="businessPhone"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="Enter business phone"
              />
            </div>
            <div>
              <Label htmlFor="invoiceDate">Invoice Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="businessEmail">Business Email</Label>
              <Input
                id="businessEmail"
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                placeholder="Enter business email"
              />
            </div>
            <div>
              <Label htmlFor="logo">Business Logo</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('logo')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </Button>
                {logoUrl && <span className="text-sm text-green-600">Logo uploaded</span>}
              </div>
            </div>
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              <Textarea
                id="businessAddress"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Enter your business address"
                rows={3}
              />
            </div>
          </div>

          {/* Invoice Content */}
          <div id="invoice-content" className="bg-white p-8 print:p-0">
            {/* Invoice Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  {logoUrl && (
                    <img src={logoUrl} alt="Business Logo" className="w-16 h-16 object-contain" />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">{businessName || 'Your Business Name'}</h1>
                    <p className="text-sm text-gray-600">CRAFTING COMPANY</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">INVOICE</h2>
                <p className="text-gray-600 text-sm"># {invoiceNumber}</p>
              </div>
            </div>

            {/* Date and Balance Due */}
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
              <div></div>
              <div className="text-right space-y-1">
                <div className="flex justify-between gap-8">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{format(new Date(invoiceDate), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-gray-600">Balance Due:</span>
                  <span className="font-bold">{formatPrice(order.totalPrice)}</span>
                </div>
              </div>
            </div>

            {/* Bill To and Ship To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Bill To:</h3>
                <div className="text-gray-800">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{order.address}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Ship To:</h3>
                <div className="text-gray-800">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-sm text-gray-600">{order.contactNumber}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{order.address}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left py-3 px-4 font-medium">Item</th>
                    <th className="text-center py-3 px-4 font-medium">Quantity</th>
                    <th className="text-right py-3 px-4 font-medium">Rate</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.tables?.map((table, index) => (
                    <tr key={table.id || index} className="border-b border-gray-200">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{getTableSizeLabel(table.size)} table</p>
                          <p className="text-sm text-gray-600">
                            Top: {getColourLabel(table.topColour)}, Frame: {getColourLabel(table.frameColour)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">{table.quantity}</td>
                      <td className="py-3 px-4 text-right">{formatPrice(table.price / table.quantity)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatPrice(table.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end">
              <div className="w-full md:w-80">
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatPrice(order.totalPrice - (order.deliveryFee || 0) - (order.additionalCharges || 0))}</span>
                  </div>
                  {order.deliveryFee && order.deliveryFee > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Shipping:</span>
                      <span className="font-medium">{formatPrice(order.deliveryFee)}</span>
                    </div>
                  )}
                  {order.additionalCharges && order.additionalCharges !== 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">{order.additionalCharges > 0 ? 'Additional:' : 'Discount:'}</span>
                      <span className="font-medium">{formatPrice(Math.abs(order.additionalCharges))}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2">
                    <div className="flex justify-between py-2">
                      <span className="font-semibold text-lg">Total:</span>
                      <span className="font-bold text-lg">{formatPrice(order.totalPrice)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between py-2 bg-gray-50 px-3 rounded">
                    <span className="font-semibold">Amount Paid:</span>
                    <span className="font-bold">{formatPrice(order.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.note && (
              <div className="mt-8 pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Notes:</h4>
                <p className="text-gray-600 text-sm">{order.note}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoice;