import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import AppLayout from '../layouts/AppLayout';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [{ path: '*', element: <App /> }],
  },
]);
