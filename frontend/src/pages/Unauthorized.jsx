import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50"><section className="text-center"><h1 className="text-3xl font-bold">Access denied</h1><p className="mt-2 text-slate-600">Your role cannot access this page.</p><Link className="mt-6 inline-block text-blue-600" to="/profile">Return to profile</Link></section></main>;
}
