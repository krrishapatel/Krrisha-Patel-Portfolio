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
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          }
        `}</style>
      </Head>

      {/* Navigation */}
      <header className="fixed top-0 left-0 w-full bg-white shadow-md">
        <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold">Krrisha Patel</h1>
          <div className="space-x-4">
            <a href="#intro" className="text-blue-500 hover:underline">Intro</a>
            <a href="#extracurriculars" className="text-blue-500 hover:underline">Extracurriculars</a>
            <a href="#projects" className="text-blue-500 hover:underline">Projects</a>
            <a href="#tools" className="text-blue-500 hover:underline">Tools</a>
            <a href="#contact" className="text-blue-500 hover:underline">Contact</a>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-16">
        {/* Introduction Section */}
        <section id="intro" className="mb-16 text-left">
          <h1 className="text-3xl font-bold mb-4">Welcome to My Portfolio!</h1>
          <p className="text-lg mb-4">
            Hello! I’m Krrisha Patel, a dual-degree student in the Jerome Fisher Program in Management & Technology
            at the University of Pennsylvania, pursuing a BSE in Computer Science and a BS in Economics with concentrations in Finance and Management.
          </p>
          <p className="text-lg mb-4">
            I am passionate about developing innovative solutions at the intersection of technology, finance, and healthcare. My work spans algorithm design, AI applications, and community outreach.
          </p>
        </section>

        {/* Extracurriculars Section */}
        <section id="extracurriculars" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Extracurriculars</h2>
          <ExtracurricularCard
            title="Jane Street Capital"
            description="Designed algorithmic solutions in game theory and graph theory. Achieved top performance in trading challenges and developed high-frequency algorithms with significant simulated profits."
          />
          <ExtracurricularCard
            title="IPMD Inc."
            description="Developed telemedicine platforms with facial and emotional AI, leading to a 30% improvement in emotional recognition accuracy and international adoption."
          />
          <ExtracurricularCard
            title="Vimana Capital"
            description="Conducted equity research in India's Data Center industry, improving portfolio ROI by 15% and presenting DCF models for strategic investments."
          />
          <ExtracurricularCard
            title="GoAhead Ventures"
            description="Collaborated with venture capital teams to evaluate startup pitches and explore innovative solutions in AI-driven markets."
          />
        </section>

        {/* Projects Section */}
        <section id="projects" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Projects</h2>
          <ProjectCard
            title="ProsthetiX"
            description="Developed affordable myoelectric prosthetics using Arduino, Pico, and 3D printing, reducing costs by 50% while enhancing mobility."
            link="/projects/prosthetix"
          />
          <ProjectCard
            title="MetaHealth"
            description="Founded a platform addressing metabolic syndrome with 20+ workshops, 5,000+ views, and 60+ active members globally."
            link="/projects/metahealth"
          />
          <ProjectCard
            title="Telemedicine AI"
            description="Created a cloud-based analytics platform with AWS Bedrock and Azure OpenAI to improve healthcare access and efficiency."
            link="/projects/telemedicine"
          />
        </section>

        {/* Tools Section */}
        <section id="tools" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Tools</h2>
          <p className="text-lg mb-6">
            I have experience with the following tools and technologies:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>Programming Languages: Python, Java, OCaml, HTML/CSS</li>
            <li>Platforms: Arduino, AWS Bedrock, Azure OpenAI</li>
            <li>Tools: Git, Microsoft Office, Bloomberg</li>
            <li>Machine Learning Frameworks: Pandas, NumPy, PyTorch</li>
          </ul>
        </section>

        {/* Contact Section */}
        <section id="contact" className="mb-16">
          <h2 className="text-2xl font-semibold mb-6">Contact</h2>
          <p className="text-lg mb-6">
            Feel free to reach out if you’d like to collaborate or learn more about my work!
          </p>
          <div className="space-y-2">
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
          </div>
        </section>
      </main>
    </div>
  );
}

const ExtracurricularCard = ({ title, description }) => (
  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-300 mb-4">
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p>{description}</p>
  </div>
);

const ProjectCard = ({ title, description, link }) => (
  <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-300 mb-4">
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="mb-4">{description}</p>
    <a href={link} className="text-blue-500 hover:underline">Learn More</a>
  </div>
);
