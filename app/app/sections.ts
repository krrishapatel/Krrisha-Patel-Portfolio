// Shared by the routes and the nav. Its own module rather than an export from
// Portfolio.tsx: that file is a client component, and a server component's
// generateStaticParams can't read a plain value across that boundary — the
// client module exposes only components to the server graph.
export const SECTIONS = ['about', 'work', 'ventures', 'projects', 'blog', 'faq'] as const;
