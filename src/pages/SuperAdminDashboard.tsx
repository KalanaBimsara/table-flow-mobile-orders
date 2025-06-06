
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Shield, Users, Package, TrendingUp, DollarSign, LogOut, RefreshCw } from 'lucide-react';
import { useSuperAdminAuth } from '@/contexts/SuperAdminAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import OrderDetailsTable from '@/components/OrderDetailsTable';

type DailyAnalyticsData = {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  total_revenue: number;
  date: string;
};

type MonthlyAnalyticsData = {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  month: string;
};

type OrderDetail = {
  id: string;
  customer_name: string;
  address: string;
  contact_number: string;
  status: string;
  price: number;
  delivery_fee: number;
  additional_charges: number;
  created_at: string;
  table_size: string;
  quantity: number;
  sales_person_name?: string;
};

type OrderStats = {
  today: {
    total_orders: number;
    completed_orders: number;
    pending_orders: number;
    total_revenue: number;
  };
  week: DailyAnalyticsData[];
  month: MonthlyAnalyticsData[];
  overview: {
    total_users: number;
    total_orders: number;
    total_revenue: number;
    avg_order_value: number;
  };
  recentOrders: OrderDetail[];
};

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

const SuperAdminDashboard = () => {
  const { user, signOut } = useSuperAdminAuth();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/super-admin/login" replace />;
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading analytics data...');
      
      // Get today's stats
      const today = new Date().toISOString().split('T')[0];
      
      console.log('Fetching today\'s orders for date:', today);
      
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', today + 'T00:00:00')
        .lt('created_at', today + 'T23:59:59');

      if (todayError) {
        console.error('Error fetching today\'s orders:', todayError);
      } else {
        console.log('Today\'s orders:', todayOrders);
      }

      const todayStats = {
        total_orders: todayOrders?.length || 0,
        completed_orders: todayOrders?.filter(o => o.status === 'completed').length || 0,
        pending_orders: todayOrders?.filter(o => o.status === 'pending').length || 0,
        total_revenue: todayOrders?.reduce((sum, order) => 
          sum + (order.price || 0) + (order.delivery_fee || 0) + (order.additional_charges || 0), 0) || 0
      };

      // Get recent orders (last 20)
      const { data: recentOrders, error: recentError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentError) {
        console.error('Error fetching recent orders:', recentError);
      } else {
        console.log('Recent orders:', recentOrders);
      }

      // Get week's data (last 7 days)
      const weekData: DailyAnalyticsData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { data: dayOrders, error: dayError } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', dateStr + 'T00:00:00')
          .lt('created_at', dateStr + 'T23:59:59');
        
        if (dayError) {
          console.error(`Error fetching orders for ${dateStr}:`, dayError);
        }
        
        weekData.push({
          date: dateStr,
          total_orders: dayOrders?.length || 0,
          completed_orders: dayOrders?.filter(o => o.status === 'completed').length || 0,
          pending_orders: dayOrders?.filter(o => o.status === 'pending').length || 0,
          total_revenue: dayOrders?.reduce((sum, order) => 
            sum + (order.price || 0) + (order.delivery_fee || 0) + (order.additional_charges || 0), 0) || 0
        });
      }

      console.log('Week data:', weekData);

      // Get monthly data (last 6 months)
      const monthData: MonthlyAnalyticsData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthStr = `${year}-${month}`;
        
        const startDate = `${year}-${month}-01T00:00:00`;
        const nextMonth = new Date(year, date.getMonth() + 1, 1);
        const endDate = nextMonth.toISOString();
        
        console.log(`Fetching orders for month ${monthStr} between ${startDate} and ${endDate}`);
        
        const { data: monthOrders, error: monthError } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', startDate)
          .lt('created_at', endDate);
        
        if (monthError) {
          console.error(`Error fetching month ${monthStr} orders:`, monthError);
        } else {
          console.log(`Month ${monthStr} orders:`, monthOrders);
        }
        
        const totalRevenue = monthOrders?.reduce((sum, order) => 
          sum + (order.price || 0) + (order.delivery_fee || 0) + (order.additional_charges || 0), 0) || 0;
        
        monthData.push({
          month: monthStr,
          total_orders: monthOrders?.length || 0,
          total_revenue: totalRevenue,
          avg_order_value: monthOrders?.length ? totalRevenue / monthOrders.length : 0
        });
      }

      console.log('Month data:', monthData);

      // Get overall stats
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('*');

      if (allOrdersError) {
        console.error('Error fetching all orders:', allOrdersError);
      } else {
        console.log('All orders count:', allOrders?.length);
      }

      const { data: allUsers, error: allUsersError } = await supabase
        .from('profiles')
        .select('id');

      if (allUsersError) {
        console.error('Error fetching all users:', allUsersError);
      } else {
        console.log('All users count:', allUsers?.length);
      }

      const totalRevenue = allOrders?.reduce((sum, order) => 
        sum + (order.price || 0) + (order.delivery_fee || 0) + (order.additional_charges || 0), 0) || 0;

      const finalStats = {
        today: todayStats,
        week: weekData,
        month: monthData,
        overview: {
          total_users: allUsers?.length || 0,
          total_orders: allOrders?.length || 0,
          total_revenue: totalRevenue,
          avg_order_value: allOrders?.length ? totalRevenue / allOrders.length : 0
        },
        recentOrders: recentOrders || []
      };

      console.log('Final stats:', finalStats);
      setStats(finalStats);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const pieData = stats && stats.today.total_orders > 0 ? [
    { name: 'Completed', value: stats.today.completed_orders, color: COLORS[0] },
    { name: 'Pending', value: stats.today.pending_orders, color: COLORS[1] },
  ].filter(item => item.value > 0) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Super Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Welcome, {user.username}
              </span>
              <Button variant="outline" size="sm" onClick={loadAnalytics}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button variant="destructive" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.overview.total_users || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.overview.total_orders || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">LKR {stats?.overview.total_revenue.toLocaleString() || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">LKR {Math.round(stats?.overview.avg_order_value || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Order Details Table */}
        <div className="mb-8">
          <OrderDetailsTable 
            orders={stats?.recentOrders || []} 
            loading={loading}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Orders Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Orders Trend</CardTitle>
              <CardDescription>Orders over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total_orders: { label: "Total Orders", color: "#3b82f6" },
                  completed_orders: { label: "Completed", color: "#10b981" },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.week || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_orders" fill="#3b82f6" />
                    <Bar dataKey="completed_orders" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Today's Order Status */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Order Status</CardTitle>
              <CardDescription>Distribution of order statuses today</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ChartContainer
                  config={{
                    completed: { label: "Completed", color: "#10b981" },
                    pending: { label: "Pending", color: "#f59e0b" },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No orders today
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
            <CardDescription>Revenue performance over the last 6 months (LKR)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total_revenue: { label: "Revenue", color: "#10b981" },
              }}
              className="h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.month || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="total_revenue" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
