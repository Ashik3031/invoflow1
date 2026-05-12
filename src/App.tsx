/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import BillingPage from './pages/BillingPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import MarketingPage from './pages/MarketingPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchasesPage from './pages/PurchasesPage';
import ExpensesPage from './pages/ExpensesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import EstimatesPage from './pages/EstimatesPage';
import CreditNotesPage from './pages/CreditNotesPage';
import CashBookPage from './pages/CashBookPage';
import BanksPage from './pages/BanksPage';
import OutstandingPage from './pages/OutstandingPage';
import ProfitLossPage from './pages/ProfitLossPage';
import ReportsPage from './pages/ReportsPage';
import DailySalesPage from './pages/reports/DailySalesPage';
import TopProductsPage from './pages/reports/TopProductsPage';
import RevenueTrendPage from './pages/reports/RevenueTrendPage';
import ExpenseSummaryPage from './pages/reports/ExpenseSummaryPage';
import GstSummaryPage from './pages/reports/GstSummaryPage';
import StockLedgerPage from './pages/reports/StockLedgerPage';
import POSPage from './pages/POSPage';
import PublicStorePage from './pages/PublicStorePage';
import SettingsPage from './pages/SettingsPage';
import { useAuthStore } from './store/useAuthStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(state => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/store/:slug" element={<PublicStorePage />} />
        <Route
          path="/pos"
          element={
            <PrivateRoute>
              <POSPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/billing" element={<BillingPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/purchases" element={<PurchasesPage />} />
                  <Route path="/suppliers" element={<SuppliersPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/marketing" element={<MarketingPage />} />
                  <Route path="/estimates" element={<EstimatesPage />} />
                  <Route path="/credit-notes" element={<CreditNotesPage />} />
                  <Route path="/cash" element={<CashBookPage />} />
                  <Route path="/banks" element={<BanksPage />} />
                  <Route path="/outstanding" element={<OutstandingPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/reports/pnl" element={<ProfitLossPage />} />
                  <Route path="/reports/sales-daily" element={<DailySalesPage />} />
                  <Route path="/reports/top-products" element={<TopProductsPage />} />
                  <Route path="/reports/revenue-trend" element={<RevenueTrendPage />} />
                  <Route path="/reports/expense-summary" element={<ExpenseSummaryPage />} />
                  <Route path="/reports/gst-summary" element={<GstSummaryPage />} />
                  <Route path="/reports/stock-ledger" element={<StockLedgerPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
