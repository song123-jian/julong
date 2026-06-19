﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/Toast';
import '@/lib/theme';

// 路由级懒加载 - 按需加载页面组件，加速首屏渲染
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
      <div className="w-6 h-6 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="text-6xl font-bold text-[#D97706] mb-4">404</div>
      <p className="text-[#6C757B] text-lg mb-6">页面未找到</p>
      <Link to="/" className="px-6 py-2.5 bg-[#D97706] text-white rounded-lg hover:bg-[#B45309] transition-colors">
        返回首页
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <ToastProvider>
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
        </ToastProvider>
      </ErrorBoundary>
    </Router>
  );
}
