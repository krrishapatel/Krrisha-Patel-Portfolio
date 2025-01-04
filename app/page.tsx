import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-white text-black py-24">
      <Head>
        <title>Krrisha Patel | Portfolio</title>
        <meta name="description" content="Portfolio website of Krrisha Patel" />
        <link rel="icon" href="/favicon.ico" />
        <style>{
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          }
        }</style>
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
            <a href="#contact" className="text-blue-500 hover:underline">Contact</a>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-16">
        {/* Introduction Section */}
        <section id="intro" className="mb-16 text-left">
          <h1 className="text-3xl font-bold mb-4">Hey, I'm Krrisha!</h1>
          <p className="text-lg mb-4">
            Engineering and finance student at UPenn M&T with an interest in AI/ML applications, healthcare innovation, venture capital, and entrepreneurship.
          </p>
        </section>

        {/* Work Section */}
        <section id="work" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Work Experience</h2>
          <WorkCard
            title="Jane Street Capital"
            description="Designed algorithmic solutions in game theory and graph theory using Python. Achieved top 10 scores in Electronic Trading Challenge (ETC) and developed high-frequency algorithms for significant simulated profits."
          />
          <WorkCard
            title="GoAhead Ventures"
            description="Sourced and evaluated over 50 startups for investment. Conducted due diligence and presented analysis to partners, aiding in early-stage funding decisions."
          />
          <WorkCard
            title="IPMD Inc."
            description="Developed telemedicine platforms with facial and emotional AI, achieving a 30% improvement in emotional recognition accuracy and securing adoption by 3 international centers."
          />
          <WorkCard
            title="Infosys"
            description="Accelerated client timelines by 30% via RPA integrations and developed a cloud-based analytics platform with AWS Bedrock and Azure OpenAI, increasing market reach by 40%."
          />
          <WorkCard
            title="Stanford University Interventional Radiology Lab (Healthcare and Tech)"
            description="Designed microfluidic drug delivery systems with 90% in vitro accuracy and researched compatibility for minimally invasive interventions."
          />
          <WorkCard
            title="Icahn School of Medicine"
            description="Conducted research on gene expression profiles to identify biomarkers for chronic diseases. Published findings in peer-reviewed journals, advancing knowledge in personalized medicine."
          />
        </section>

        {/* Leadership & Entrepreneurship Section */}
        <section id="leadership" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Leadership & Entrepreneurship</h2>
          <WorkCard
            title="Passion4Med"
            description="Founded a global platform with 4,000+ members. Organized 50 mentorships and led events for 2,500+ attendees across 5 continents."
          />
          <WorkCard
            title="MetaHealth"
            description="Launched workshops addressing metabolic syndrome. Developed social media campaigns with 5,000+ views and expanded globally to 60+ members."
          />
          <WorkCard
            title="Harvard STRIPED Initiative"
            description="Advocated for and successfully passed policy banning harmful supplement sales to minors in NJ and NY."
          />
        </section>

        {/* Projects Section */}
        <section id="projects" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Projects</h2>
          <ProjectCard
            title="Algorithmic Trading Bot"
            description="Developed predictive models for market forecasting using Python and SSH, achieving $150 PnL/min simulation."
            tools="Python, Linux, SSH"
          />
          <ProjectCard
            title="Mushroom of Doom"
            description="Created a fully playable game with real-time action and simple controls, where players avoid poisonous mushrooms and chase the golden snitch to win."
            tools="Python"
          />
          <ProjectCard
            title="Wordle"
            description="Developed a terminal-based Wordle game with a 95% success solver bot and efficiency tools for data analysis."
            tools="Python"
          />
          <ProjectCard
            title="Anagame"
            description="Designed an anagram-solving game with performance analytics, a leaderboard, and hint systems."
            tools="Python"
          />
          <ProjectCard
            title="Word Ladder"
            description="Built a BFS-based game to find shortest paths in word ladders with performance tracking."
            tools="Python"
          />
          <ProjectCard
            title="Camel Up Game"
            description="Simulated camel races with probabilistic analysis and strategic insights in a detailed terminal interface."
            tools="Python"
          />
          <ProjectCard
            title="MineSweeper"
            description="Developed a Minesweeper game with a terminal interface, featuring visual feedback and challenging gameplay."
            tools="Python"
          />
        </section>

        {/* Contact Section */}
        <section id="contact" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Contact</h2>
          <p>
            <a href="mailto:krrisha@wharton.upenn.edu" className="text-blue-500 hover:underline">
              Email: krrisha@wharton.upenn.edu
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

const WorkCard = ({ title, description }) => (
  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-300 mb-4">
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
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
