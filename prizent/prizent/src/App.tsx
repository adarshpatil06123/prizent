import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import Logout from './components/Logout';
import BrandsListPage from './components/BrandsListPage';
import AddBrandPage from './components/AddBrandPage';
import CategoriesListPage from './components/CategoriesListPage';
import AddCategoryPage from './components/AddCategoryPage';
import SuperAdminUsersPage from './components/SuperAdminUsersPage';
import AddUserPage from './components/AddUserPage';
import EditUserPage from './components/EditUserPage';
import MarketplacesListPage from './components/marketplaces/MarketplacesListPage';
import AddMarketplacePage from './components/marketplaces/AddMarketplacePage';
import ProductsListPage from './components/ProductsListPage';
import CustomFieldsPage from './components/CustomFieldsPage';
import CommonLayout from './components/CommonLayout';
import PricingPage from './components/PricingPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/logout" element={<Logout />} />

        {/* Routes that show the common sidebar/layout */}
        <Route element={<CommonLayout />}>
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/superadmin" element={<SuperAdminUsersPage />} />
          <Route path="/superadmin/add-user" element={<AddUserPage />} />
          <Route path="/superadmin/edit-user/:userId" element={<EditUserPage />} />

          <Route path="/brands" element={<BrandsListPage />} />
          <Route path="/categories" element={<CategoriesListPage />} />
          <Route path="/products" element={<ProductsListPage />} />
          <Route path="/marketplaces" element={<MarketplacesListPage />} />
          <Route path="/marketplaces/add" element={<AddMarketplacePage />} />
          <Route path="/custom-fields" element={<CustomFieldsPage />} />
          <Route path="/add-brand" element={<AddBrandPage />} />
          <Route path="/add-category" element={<AddCategoryPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
