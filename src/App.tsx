import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage';
import BrandsListPage from './pages/BrandsListPage';
import AddBrandPage from './pages/AddBrandPage';
import CategoriesListPage from './pages/CategoriesListPage';
import AddCategoryPage from './pages/AddCategoryPage';
import SuperAdminUsersPage from './superadmin/SuperAdminUsersPage';
import AddUserPage from './superadmin/AddUserPage';
import EditUserPage from './superadmin/EditUserPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/superadmin" element={<SuperAdminUsersPage />} />
        <Route path="/superadmin/add-user" element={<AddUserPage />} />
        <Route path="/superadmin/edit-user/:userId" element={<EditUserPage />} />
        <Route path="/brands" element={<BrandsListPage />} />
        <Route path="/categories" element={<CategoriesListPage />} />
        <Route path="/add-brand" element={<AddBrandPage />} />
        <Route path="/add-category" element={<AddCategoryPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
