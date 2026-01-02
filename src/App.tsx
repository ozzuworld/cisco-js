import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SnackbarProvider } from 'notistack'
import { theme } from './theme'
import { ErrorBoundary } from './components'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Jobs from './pages/Jobs'
import JobDetails from './pages/JobDetails'
import Health from './pages/Health'
import Profiles from './pages/Profiles'
import Settings from './pages/Settings'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            autoHideDuration={5000}
          >
            <CssBaseline />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="jobs" element={<Jobs />} />
                  <Route path="jobs/:jobId" element={<JobDetails />} />
                  <Route path="health" element={<Health />} />
                  <Route path="profiles" element={<Profiles />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </SnackbarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
