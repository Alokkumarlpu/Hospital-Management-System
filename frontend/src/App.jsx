import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <Activity className="mb-4 h-12 w-12 text-blue-600" aria-hidden="true" />
        <h1 className="text-4xl font-bold tracking-tight">Hospital Management System</h1>
        <p className="mt-4 max-w-xl text-slate-600">
          The application foundation is ready. Clinical and administrative modules will be added
          in the next phase.
        </p>
        <Link
          to="/"
          className="mt-8 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          Continue
        </Link>
      </div>
    </main>
  );
}

export default App;
