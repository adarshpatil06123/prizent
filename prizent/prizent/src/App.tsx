import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import Logout from './components/Logout';
import BrandsListPage from './components/BrandsListPage';
import AddBrandPage from './components/AddBrandPage';
import EditBrandPage from './components/EditBrandPage';
import CategoriesListPage from './components/CategoriesListPage';
import AddCategoryPage from './components/AddCategoryPage';
import EditCategoryPage from './components/EditCategoryPage';
import ImportCategoriesPage from './components/ImportCategoriesPage';
import SuperAdminUsersPage from './components/SuperAdminUsersPage';
import AddUserPage from './components/AddUserPage';
import EditUserPage from './components/EditUserPage';
import MarketplacesListPage from './components/marketplaces/MarketplacesListPage';
import AddMarketplacePage from './components/marketplaces/AddMarketplacePage';
import EditMarketplacePage from './components/marketplaces/EditMarketplacePage';
import ProductsListPage from './components/ProductsListPage';
import AddProductPage from './components/AddProductPage';
import EditProductPage from './components/EditProductPage';
import CustomFieldsPage from './components/CustomFieldsPage';
import CommonLayout from './components/CommonLayout';
import PricingPage from './components/PricingPage';
import PriceCalculationPage from './components/PriceCalculationPage';
import ProductDetailsPage from './components/ProductDetailsPage';
import { CategoryProvider } from './contexts/CategoryContext';

const App: React.FC = () => {
  return (
    <CategoryProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<Logout />} />

          {/* Routes that show the common sidebar/layout */}
          <Route element={<CommonLayout />}>
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/price-calculator" element={<PriceCalculationPage />} />
            <Route path="/product-details" element={<ProductDetailsPage />} />
            <Route path="/superadmin" element={<SuperAdminUsersPage />} />
            <Route path="/superadmin/add-user" element={<AddUserPage />} />
            <Route path="/superadmin/edit-user/:userId" element={<EditUserPage />} />

            <Route path="/brands" element={<BrandsListPage />} />
          <Route path="/add-brand" element={<AddBrandPage />} />
          <Route path="/edit-brand/:id" element={<EditBrandPage />} />
          <Route path="/categories" element={<CategoriesListPage />} />
          <Route path="/add-category" element={<AddCategoryPage />} />
          <Route path="/edit-category/:id" element={<EditCategoryPage />} />
          <Route path="/import-categories" element={<ImportCategoriesPage />} />
          <Route path="/products" element={<ProductsListPage />} />
          <Route path="/products/add" element={<AddProductPage />} />
          <Route path="/add-product" element={<AddProductPage />} />
          <Route path="/edit-product/:id" element={<EditProductPage />} />
          <Route path="/marketplaces" element={<MarketplacesListPage />} />
          <Route path="/marketplaces/add" element={<AddMarketplacePage />} />
          <Route path="/marketplaces/edit/:id" element={<EditMarketplacePage />} />
          <Route path="/custom-fields" element={<CustomFieldsPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </CategoryProvider>
  );
};

export default App;
