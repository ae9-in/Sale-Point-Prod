import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRouter from './routes/AppRouter';
import Background from './components/layout/Background';

function App() {
  return (
    <BrowserRouter>
      <Background />
      <AppRouter />
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'rgb(var(--color-surface))',
          color: 'rgb(var(--color-content-primary))',
          border: '1px solid rgb(var(--color-border))',
        }
      }} />
    </BrowserRouter>
  );
}

export default App;
