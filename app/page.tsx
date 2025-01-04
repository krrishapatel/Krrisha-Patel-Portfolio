import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-white text-black py-12">
      <Head>
        <title>Krrisha Patel | Portfolio</title>
        <meta name="description" content="Portfolio website of Krrisha Patel" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full bg-white shadow-md">
        <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">Krrisha Patel</h1>
          <div className="space-x-4">
            <a href="#intro" className="text-blue-500 hover:underline">Intro</a>
            <a href="#work" className="text-blue-500 hover:underline">Work</a>
            <a href="#leadership" className="text-blue-500 hover:underline">Leadership</a>
            <a href="#projects" className="text-blue-500 hover:underline">Projects</a>
            <a href="#showcase-impact" className="text-blue-500 hover:underline">Showcase Impact</a>
            <a href="#fun-facts" className="text-blue-500 hover:underline">Fun Facts</a>
            <a href="#contact" className="text-blue-500 hover:underline">Contact</a>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-16">
        {/* Introduction Section */}
        <section id="intro" className="mb-16 text-left">
          <h1 className="text-3xl font-bold mb-4">Hey! I'm Krrisha, a dreamer, doer, and innovator.</h1>
          <p className="text-lg mb-4">
            Computer science and finance student at UPenn M&T with an interest in AI/ML applications, healthcare innovation, venture capital, and entrepreneurship.
          </p>
        </section>

        {/* Work Section */}
        <section id="work" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Work Experience</h2>
          <WorkCard
            company="Jane Street Capital"
            title="Research Intern"
            description="Designed algorithmic solutions in game theory and graph theory using Python, enhancing decision-making. Achieved top 10 PnL in a 6-hour ETC, generating $9M+ in simulated profits. Collaborated with Math Olympians and traders to apply probabilistic theory to trading strategies." />
          {/* Add other WorkCard components */}
        </section>

        {/* Leadership & Entrepreneurship Section */}
        <section id="leadership" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Leadership & Entrepreneurship</h2>
          <WorkCard
            company="Passion4Med"
            title="Founder & CEO"
            description="Founded a global platform with 4,000+ future healthcare leaders. Organized 50 mentorships and led events for 2,500+ attendees across 5 continents, and shared 100+ free resources. Produced social media content with 50,000+ views." />
          {/* Add other WorkCard components */}
        </section>

        {/* Showcase Impact Section */}
        <section id="showcase-impact" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Showcase Impact</h2>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="grid grid-cols-2 gap-8">
            <div className="flex flex-col items-center p-4 border border-gray-200 rounded-lg">
              <img src="/path/to/impact-image1.jpg" alt="Impact 1" className="w-32 h-32 rounded-full mb-4" />
              <h3 className="font-semibold">Healthcare Innovation</h3>
              <p className="text-center">Contributed to the design of innovative healthcare solutions that impacted 3+ countries by improving patient care systems.</p>
            </div>
            <div className="flex flex-col items-center p-4 border border-gray-200 rounded-lg">
              <img src="/path/to/impact-image2.jpg" alt="Impact 2" className="w-32 h-32 rounded-full mb-4" />
              <h3 className="font-semibold">Global Outreach</h3>
              <p className="text-center">Led initiatives that reached over 10,000+ students worldwide, creating positive change in education and policy reform.</p>
            </div>
            {/* Add more impact cards as needed */}
          </motion.div>
        </section>

        {/* Fun Facts Section */}
        <section id="fun-facts" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Fun Facts</h2>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2">Did You Know?</h3>
              <ul className="list-disc pl-4">
                <li>I once built a prosthetic limb for a neighbor using a 3D printer.</li>
                <li>I love solving problems through algorithms and have developed several bots for fun!</li>
                <li>My work in healthcare innovation has reached over 5,000+ people worldwide.</li>
              </ul>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2">Random Facts</h3>
              <ul className="list-disc pl-4">
                <li>I can solve a Rubik's Cube in under 3 minutes.</li>
                <li>I'm a huge fan of the game Wordle and have developed an automated solver for it.</li>
                <li>In my spare time, I love creating 3D-printed art and mini dioramas.</li>
              </ul>
            </div>
          </motion.div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Projects</h2>
          <ProjectCard
            title="Algorithmic Trading Bot"
            description="Developed predictive models for market forecasting using Python and SSH, achieving $150 PnL/min simulation."
            tools="Python, Linux, SSH" />
          {/* Add other ProjectCard components */}
        </section>

        {/* Contact Section */}
        <section id="contact" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Contact</h2>
          <p>
            <a href="mailto:krrishapatel26@gmail.com" className="text-blue-500 hover:underline">
              Email: krrishapatel26@gmail.com
            </a>
          </p>
          <p>
            <Link href="https://linkedin.com/in/krrishapatel" className="text-blue-500 hover:underline">
              LinkedIn
            </Link>
          </p>
          <p>
            <Link href="https://github.com/krrishapatel" className="text-blue-500 hover:underline">
              GitHub
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}

const WorkCard = ({ company, title, description }) => (
  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-300 mb-4">
    <h3 className="text-xl font-semibold mb-2">{company}</h3>
    {title && <p className="text-sm text-gray-600 mb-2">{title}</p>}
    <p>{description}</p>
  </div>
);

const ProjectCard = ({ title, description, tools }) => (
  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-300 mb-4">
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="mb-2">{description}</p>
    <p className="text-sm text-gray-500"><strong>Tools:</strong> {tools}</p>
  </div>
);
