import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Layout from './components/Layout';
import PDFList from './components/PDFList';
import PDFReader from './components/PDFReader';
import AdminDashboard from './components/AdminDashboard';
import DatabaseManager from './components/DatabaseManager';
import CourseList from './components/CourseList';

import SubjectList from './components/SubjectList';
import SemesterList from './components/SemesterList';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<Layout />}>
        <Route path="/" element={
          <PrivateRoute>
            <PDFList />
          </PrivateRoute>
        } />
        <Route path="/courses" element={
          <PrivateRoute>
            <CourseList />
          </PrivateRoute>
        } />
        <Route path="/subjects" element={
          <PrivateRoute>
            <SubjectList />
          </PrivateRoute>
        } />
        <Route path="/semesters" element={
          <PrivateRoute>
            <SemesterList />
          </PrivateRoute>
        } />
        <Route path="/read/:id" element={
          <PrivateRoute>
            <PDFReader />
          </PrivateRoute>
        } />
        <Route path="/upload" element={
          <PrivateRoute adminOnly>
            <AdminDashboard tab="upload" />
          </PrivateRoute>
        } />
        <Route path="/analytics" element={
          <PrivateRoute adminOnly>
            <AdminDashboard tab="analytics" />
          </PrivateRoute>
        } />
        <Route path="/database" element={
          <PrivateRoute adminOnly>
            <DatabaseManager />
          </PrivateRoute>
        } />
      </Route>
    </Routes>
  );
}

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
