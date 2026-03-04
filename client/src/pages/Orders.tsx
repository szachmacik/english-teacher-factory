import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { ArrowLeft, ShoppingBag, DollarSign, CheckCircle2, Clock, XCircle, Package } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function Orders() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const { data: orders, isLoading } = trpc.stripe.myOrders.useQuery(undefined, { enabled: isAuthenticated });
  const { data: stats } = trpc.stripe.orderStats.useQuery(undefined, { enabled: isAuthenticated });

  if (loading || isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Card className="bg-gray-900 border-gray-700 max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <ShoppingBag className="w-12 h-12 text-violet-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Sign in to view orders</h2>
            <Button onClick={() => window.location.href = getLoginUrl()} className="bg-violet-600 hover:bg-violet-700">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    if (status === "paid") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (status === "failed") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const statusBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-green-600 text-white">Paid</Badge>;
    if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
    if (status === "refunded") return <Badge className="bg-gray-600 text-white">Refunded</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div className="w-px h-5 bg-gray-700" />
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-violet-400" />
            <h1 className="text-lg font-bold text-white">Orders & Revenue</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-4 text-center">
                <DollarSign className="w-6 h-6 text-green-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">${((stats.revenue || 0) / 100).toFixed(2)}</p>
                <p className="text-xs text-gray-400">Total Revenue</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-6 h-6 text-violet-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{stats.paid || 0}</p>
                <p className="text-xs text-gray-400">Paid Orders</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-4 text-center">
                <Package className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
                <p className="text-xs text-gray-400">Total Orders</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test card info */}
        <Card className="bg-blue-900/20 border-blue-700/50 mb-6">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="text-blue-400 text-xl">💳</div>
            <div>
              <p className="text-sm font-semibold text-blue-300">Test Mode Active</p>
              <p className="text-xs text-blue-400">Use card <code className="bg-blue-900/50 px-1 rounded">4242 4242 4242 4242</code> with any expiry and CVC to test payments. Claim your Stripe sandbox at <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com</a></p>
            </div>
          </CardContent>
        </Card>

        {/* Orders list */}
        {!orders || orders.length === 0 ? (
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No orders yet</h3>
              <p className="text-gray-500 text-sm mb-6">Generate a project and create a Marketplace Kit to start selling</p>
              <Button onClick={() => navigate("/create")} className="bg-violet-600 hover:bg-violet-700">
                Create First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Card key={order.id} className="bg-gray-900 border-gray-700">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(order.status)}
                    <div>
                      <p className="font-medium text-white text-sm">{order.productTitle || "Teaching Resource Bundle"}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        {order.customerEmail && ` • ${order.customerEmail}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">${(order.amount / 100).toFixed(2)}</span>
                    {statusBadge(order.status)}
                    {order.projectId && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/project/${order.projectId}`)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs">
                        View
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
