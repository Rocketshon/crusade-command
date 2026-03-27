import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { ArmyProvider } from '../lib/ArmyContext';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <ArmyProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#f5efe6',
              border: '1px solid #d4c5a9',
              color: '#2c2416',
            },
          }}
        />
      </ArmyProvider>
    </ErrorBoundary>
  );
}
