// Shared by the routes and the nav. Its own module rather than an export from
// Portfolio.tsx: that file is a client component, and a server component's
// generateStaticParams can't read a plain value across that boundary — the
// client module exposes only components to the server graph.
export const SECTIONS = ['about', 'work', 'ventures', 'projects', 'blog', 'faq'] as const;

// The site's real address. It lives here rather than being repeated in
// layout.tsx and [section]/page.tsx because those two disagreeing is exactly the
// bug this replaces: the metadata claimed krrishapatel.com, which isn't a
// registered domain, while the site actually served from vercel.app. One
// constant, one place to change if a custom domain ever gets pointed here.
export const SITE_URL = 'https://krrishapatel.vercel.app';

// The preview card, shared by every route. It has to be restated in each
// route's generateMetadata rather than inherited from the layout: Next merges
// metadata one field at a time, so declaring `openGraph` in a route replaces the
// layout's whole openGraph object — images included. Leaving it out silently
// dropped og:image from all five section routes while / kept it.
export const OG_IMAGE = { url: '/og.png', width: 1200, height: 630, alt: 'Krrisha Patel' };

// Per-section titles and descriptions. Every section used to serve the layout's
// single title, which was correct while they were all one page at /#ventures —
// but they're real routes now, so a search result for /ventures said nothing
// about ventures. Titles are what shows in a browser tab and as a result's
// headline; descriptions are the grey text underneath it.
export const META: Record<(typeof SECTIONS)[number], { title: string; description: string }> = {
  about: {
    title: 'Krrisha Patel',
    description:
      'cs, finance & stats @ upenn m&t, focused on ai, ml and healthcare tech. building tools to solve real-world problems, plus origami engineering and oil painting.',
  },
  work: {
    title: 'Work — Krrisha Patel',
    description:
      'Experience and roles: engineering and quantitative work across AI/ML, healthcare technology and cloud infrastructure.',
  },
  ventures: {
    title: 'Ventures — Krrisha Patel',
    description:
      'Companies and initiatives Krrisha Patel has founded or helped build, and what came of them.',
  },
  projects: {
    title: 'Projects — Krrisha Patel',
    description:
      'Things built: AI/ML tools, full-stack applications, and origami engineering rendered in the browser.',
  },
  blog: {
    title: 'Blog — Krrisha Patel',
    description: 'Writing on machine learning, building software, and whatever is currently interesting.',
  },
  faq: {
    title: 'FAQ — Krrisha Patel',
    description:
      'Questions worth answering about studying cs, finance and stats at once — and three origami figures you can spin.',
  },
};
