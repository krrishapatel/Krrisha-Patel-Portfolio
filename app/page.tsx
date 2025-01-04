import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-gray-50 text-black py-24">
      <Head>
        <title>Krrisha Patel | Portfolio</title>
        <meta name="description" content="Portfolio website of Krrisha Patel" />
        <link rel="icon" href="/favicon.ico" />
        <style>{`
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          }
        `}</style>
      </Head>

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full bg-white shadow-md">
        <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-indigo-600">Krrisha Patel</h1>
          <div className="space-x-4">
            <a href="#intro" className="text-indigo-500 hover:underline">Intro</a>
            <a href="#work" className="text-indigo-500 hover:underline">Work</a>
            <a href="#leadership" className="text-indigo-500 hover:underline">Leadership</a>
            <a href="#projects" className="text-indigo-500 hover:underline">Projects</a>
            <a href="#contact" className="text-indigo-500 hover:underline">Contact</a>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-16">
        {/* Introduction Section */}
        <section id="intro" className="mb-16 text-left">
          <h1 className="text-4xl font-bold mb-4 text-indigo-600">Hey, I'm Krrisha!</h1>
          <p className="text-lg mb-4">
            Engineering and finance student at UPenn M&T with an interest in AI/ML applications, healthcare innovation, venture capital, and entrepreneurship.
          </p>
        </section>

        {/* Work Section */}
        <section id="work" className="mb-16">
          <h2 className="text-3xl font-semibold mb-6 text-indigo-600">Work Experience</h2>
          <WorkCard
            title="Jane Street Capital"
            description="Designed algorithmic solutions in game theory and graph theory using Python. Achieved top 10 scores in ETC and developed high-frequency algorithms for significant simulated profits."
            tags={['Finance', 'Tech']}
          />
          <WorkCard
            title="GoAhead Ventures"
            description="Sourced and evaluated over 50 startups for investment. Conducted due diligence and presented analysis to partners, aiding in early-stage funding decisions."
            tags={['Finance']}
          />
          <WorkCard
            title="IPMD Inc."
            description="Developed telemedicine platforms with facial and emotional AI, achieving a 30% improvement in emotional recognition accuracy and securing adoption by 3 international centers."
            tags={['Tech', 'Healthcare']}
          />
        </section>

        {/* Leadership Section */}
        <section id="leadership" className="mb-16">
          <h2 className="text-3xl font-semibold mb-6 text-indigo-600">Leadership & Entrepreneurship</h2>
          <WorkCard
            title="Passion4Med"
            description="Founded a global platform with 4,000+ members. Organized 50 mentorships and led events for 2,500+ attendees across 5 continents."
            tags={['Leadership']}
          />
        </section>

        {/* Projects Section */}
        <section id="projects" className="mb-16">
          <h2 className="text-3xl font-semibold mb-6 text-indigo-600">Projects</h2>
          <ProjectCard
            title="Algorithmic Trading Bot"
            description="Developed predictive models for market forecasting using Python and SSH, achieving $150 PnL/min simulation."
            tools="Python, Linux, SSH"
          />
        </section>

        {/* Contact Section */}
        <section id="contact" className="mb-16">
          <h2 className="text-3xl font-semibold mb-6 text-indigo-600">Contact</h2>
          <p className="text-lg mb-4">
            Want to make something great together? I'm always up for a chat.
          </p>
          <p>
            <a href="mailto:krrisha@wharton.upenn.edu" className="text-indigo-500 hover:underline">
              Email: krrisha@wharton.upenn.edu
            </a>
          </p>
          <p>
            <Link href="https://linkedin.com/in/krrishapatel" className="text-indigo-500 hover:underline">
              LinkedIn
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

const WorkCard = ({ title, description, tags }) => (
  <div className="border border-indigo-200 rounded-lg p-6 hover:shadow-md transition duration-300 mb-4">
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p>{description}</p>
    <div className="mt-2 space-x-2">
      {tags.map(tag => (
        <button
          key={tag}
          className="text-sm bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md"
        >
          {tag}
        </button>
      ))}
    </div>
  </div>
);

const ProjectCard = ({ title, description, tools }) => (
  <div className="border border-indigo-200 rounded-lg p-6 hover:shadow-md transition duration-300 mb-4">
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="mb-2">{description}</p>
    <p className="text-sm text-gray-500"><strong>Tools:</strong> {tools}</p>
  </div>
);
