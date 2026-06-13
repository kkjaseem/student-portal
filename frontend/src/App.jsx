import { Routes, Route, Navigate } from 'react-router-dom'
import ApplicationPage from './pages/ApplicationPage.jsx'
import DocumentsPage from './pages/DocumentsPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import Layout from './components/Layout.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/apply" replace />} />
        <Route path="/apply" element={<ApplicationPage />} />
        <Route path="/apply/documents" element={<DocumentsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}

export default App
