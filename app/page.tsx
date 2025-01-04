import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-black">
      <Head>
        <title>Krrisha Patel | Portfolio</title>
        <meta name="description" content="Portfolio website of Krrisha Patel" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full bg-white shadow-md z-10">
        <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">Krrisha Patel</h1>
          <div className="space-x-4">
            <a href="#intro" className="text-blue-500 hover:underline">Intro</a>
            <a href="#work" className="text-blue-500 hover:underline">Work</a>
            <a href="#leadership" className="text-blue-500 hover:underline">Leadership</a>
            <a href="#projects" className="text-blue-500 hover:underline">Projects</a>
            <a href="#contact" className="text-blue-500 hover:underline">Contact</a>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-20">
        {/* Introduction Section */}
        <section id="intro" className="mb-16 text-center">
          <h1 className="text-4xl font-extrabold mb-4 text-gray-800">Hey, I'm Krrisha!</h1>
          <p className="text-lg text-gray-600">
            Engineering and finance student at UPenn M&T with an interest in AI/ML applications, healthcare innovation, venture capital, and entrepreneurship.
          </p>
        </section>

        {/* Work Section */}
        <section id="work" className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Work Experience</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <WorkCard
              title="Jane Street Capital"
              description="Designed algorithmic solutions in game theory and graph theory using Python. Achieved top 10 scores in Electronic Trading Challenge."
              roles={['Finance', 'Tech']}
            />
            <WorkCard
              title="GoAhead Ventures"
              description="Sourced and evaluated over 50 startups for investment, aiding in early-stage funding decisions."
              roles={['Finance']}
            />
            <WorkCard
              title="IPMD Inc."
              description="Developed telemedicine platforms with facial and emotional AI, securing adoption by 3 international centers."
              roles={['Tech']}
            />
            {/* Add more cards as necessary */}
          </div>
        </section>

        {/* Leadership & Entrepreneurship Section */}
        <section id="leadership" className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Leadership & Entrepreneurship</h2>
          {/* Add leadership cards */}
        </section>

        {/* Projects Section */}
        <section id="projects" className="mb-16">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Projects</h2>
          {/* Add project cards */}
        </section>

        {/* Contact Section */}
        <section id="contact" className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Contact</h2>
          <p className="text-gray-600 mb-4">
            Want to make something great together? I'm always up for a chat.
          </p>
          <p>
            <a href="mailto:krrisha@wharton.upenn.edu" className="text-blue-500 hover:underline">
              Email: krrisha@wharton.upenn.edu
            </a>
          </p>
          <p>
            <Link href="https://linkedin.com/in/krrishapatel">
              <a className="text-blue-500 hover:underline">LinkedIn</a>
            </Link>
          </p>
          <p>
            <Link href="https://github.com/krrishapatel">
              <a className="text-blue-500 hover:underline">GitHub</a>
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

const WorkCard = ({ title, description, roles }) => (
  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition duration-300 bg-white">
    <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
    <p className="mb-4 text-gray-600">{description}</p>
    <div className="flex gap-2">
      {roles.map((role) => (
        <button
          key={role}
          className="px-3 py-1 bg-blue-100 text-blue-600 text-sm rounded-full hover:bg-blue-200 transition duration-200"
        >
          {role}
        </button>
      ))}
    </div>
  </div>
);
