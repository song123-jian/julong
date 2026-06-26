import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import LaunchScreen from '@/components/LaunchScreen';
import '@/lib/theme';

const Home = lazy(() => import('@/pages/Home'));
const Parser = lazy(() => import('@/pages/Parser'));
const Generator = lazy(() => import('@/pages/Generator'));
const Special = lazy(() => import('@/pages/Special'));
const Batch = lazy(() => import('@/pages/Batch'));
const Reference = lazy(() => import('@/pages/Reference'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const Travel = lazy(() => import('@/pages/Travel'));
const ShippingRecords = lazy(() => import('@/pages/ShippingRecords'));
const Quotation = lazy(() => import('@/pages/Quotation'));
const SyncSettings = lazy(() => import('@/pages/SyncSettings'));
const Logistics = lazy(() => import('@/pages/Logistics'));
const LogisticsExceptions = lazy(() => import('@/pages/LogisticsExceptions'));
const LogisticsStats = lazy(() => import('@/pages/LogisticsStats'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 text-6xl font-bold text-[#D97706]">404</div>
      <p className="mb-6 text-lg text-[#6C757B]">页面未找到</p>
      <Link to="/" className="rounded-lg bg-[#D97706] px-6 py-2.5 text-white transition-colors hover:bg-[#B45309]">
        返回首页
      </Link>
    </div>
  );
}

export default function App() {
  const [launchStage, setLaunchStage] = useState<'boot' | 'ready'>('boot');
  const [launchVisible, setLaunchVisible] = useState(true);

  useEffect(() => {
    const readyTimer = window.setTimeout(() => setLaunchStage('ready'), 650);
    const hideTimer = window.setTimeout(() => setLaunchVisible(false), 1550);

    return () => {
      window.clearTimeout(readyTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <ToastProvider>
          <>
            {launchVisible && <LaunchScreen stage={launchStage} />}
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/parser" element={<Parser />} />
                  <Route path="/generator" element={<Generator />} />
                  <Route path="/special" element={<Special />} />
                  <Route path="/batch" element={<Batch />} />
                  <Route path="/reference" element={<Reference />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/travel" element={<Travel />} />
                  <Route path="/shipping" element={<ShippingRecords />} />
                  <Route path="/quotation" element={<Quotation />} />
                  <Route path="/sync" element={<SyncSettings />} />
                  <Route path="/logistics" element={<Logistics />} />
                  <Route path="/logistics/exceptions" element={<LogisticsExceptions />} />
                  <Route path="/logistics/stats" element={<LogisticsStats />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Layout>
          </>
        </ToastProvider>
      </ErrorBoundary>
    </Router>
  );
}
