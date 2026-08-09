'use client';

import { useState, useEffect, useRef } from 'react';

export default function Portfolio() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('about');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [activeWorkTab, setActiveWorkTab] = useState('tech');
  const [selectedBlog, setSelectedBlog] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  // The cursor ring is moved by writing to the DOM node directly. Holding its
  // position in state re-rendered this whole component on every mousemove.
  const cursorRef = useRef<HTMLDivElement>(null);
  const [geometricRotationX, setGeometricRotationX] = useState(15);
  const [geometricRotationY, setGeometricRotationY] = useState(15);
  const [geometricRotationZ, setGeometricRotationZ] = useState(0);
  const [isGeometricSpinning, setIsGeometricSpinning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Drag origin is only ever read inside event handlers, never rendered, so it
  // lives in refs. As state it forced a re-render per mousemove.
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastDragRef = useRef({ x: 0, y: 0 });
  const [selectedArtwork, setSelectedArtwork] = useState<string | null>(null);


  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleGeometricInteraction = () => {
    setIsGeometricSpinning(true);
    setGeometricRotationX(prev => prev + 360);
    setGeometricRotationY(prev => prev + 360);
    setGeometricRotationZ(prev => prev + 360);
    setTimeout(() => setIsGeometricSpinning(false), 3000);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastDragRef.current = { x: e.clientX, y: e.clientY };
  };

  // Dragging is driven by the document-level listener below, which is active
  // for the whole drag even when the pointer leaves the cube. This element-level
  // handler would double-apply every delta, so it deliberately does nothing.
  const handleMouseMove = (_e: React.MouseEvent) => {};

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };



  // Calculate distance from user to Krrisha (Philadelphia coordinates)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const krrishaLat = 39.9526; // Philadelphia
        const krrishaLng = -75.1652;
        
        const R = 3959; // Earth's radius in miles
        const dLat = (krrishaLat - userLat) * Math.PI / 180;
        const dLng = (krrishaLng - userLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(userLat * Math.PI / 180) * Math.cos(krrishaLat * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanceInMiles = R * c;
        
        setUserLocation({lat: userLat, lng: userLng});
        setDistance(Math.round(distanceInMiles));
      });
    }
  }, []);

  // Custom cursor tracking.
  //
  // Two rules keep this from feeling laggy:
  //   1. Never route pointer position through React state -- that re-rendered
  //      a 2000-line component on every pixel of movement.
  //   2. Write transform once per frame in rAF, not once per mousemove event.
  //      A mouse can fire faster than the display refreshes, so the extra
  //      writes are work the browser throws away.
  // The position is written with no CSS transition on transform; the ring
  // lands exactly where the pointer is, on the same frame.
  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Respect the OS-level reduce-motion setting: no trailing element at all.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // A coarse pointer (touch) has nothing to trail.
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let x = 0;
    let y = 0;
    let frame = 0;
    let visible = false;

    const draw = () => {
      frame = 0;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const handleMouseMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        // Opacity is set inline, not via a class: React owns `className` on
        // this element (it carries the `hover` flag), so any class added
        // imperatively is wiped out on the next render.
        cursor.style.opacity = '0.9';
      }
      // Coalesce: at most one DOM write per animation frame.
      if (!frame) frame = requestAnimationFrame(draw);
    };

    // `hover` reflects whether the pointer is over something clickable, which
    // is what the accent colour is meant to signal. The previous version keyed
    // it off document enter/leave, so it was true almost all the time.
    const handleOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      setIsHovering(Boolean(target?.closest?.('a, button, [role="button"], .interactive-card, .sticker')));
    };

    const handleLeave = () => {
      visible = false;
      cursor.style.opacity = '0';
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseover', handleOver, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleOver);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  // Global mouse event listeners for cube dragging.
  //
  // `lastDrag` is read from a ref rather than state, so this effect subscribes
  // once per drag instead of tearing down and re-adding both listeners on every
  // single mousemove -- which is what `[isDragging, lastDrag]` used to do.
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastDragRef.current.x;
      const deltaY = e.clientY - lastDragRef.current.y;

      setGeometricRotationY(prev => prev + deltaX * 0.5);
      setGeometricRotationX(prev => prev + deltaY * 0.5);

      lastDragRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Background pattern */}
      <div className="bg-pattern"></div>
      
      {/* City background at bottom */}
      <div className="city-bg"></div>
      
                  {/* Creative floating elements */}
            <div className="sticker" onClick={() => alert('✨ you found a secret!')}>✨</div>
            <div className="sticker" onClick={() => alert('💫 another secret!')}>💫</div>
            <div className="sticker" onClick={() => alert('🚀 rocket power!')}>🚀</div>
            <div className="sticker" onClick={() => alert('💡 lightbulb moment!')}>💡</div>
      
      {/* Custom cursor */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className={`custom-cursor ${isHovering ? 'hover' : ''}`}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-700">
        <div className="flex justify-between items-center px-8 py-2">
          <div className="fancy-k">
            K
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            <button 
              onClick={() => setActiveSection('about')}
              className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
            >
              ABOUT
            </button>
            <button 
              onClick={() => setActiveSection('work')}
              className={`nav-link ${activeSection === 'work' ? 'active' : ''}`}
            >
              WORK
            </button>
            <button 
              onClick={() => setActiveSection('projects')}
              className={`nav-link ${activeSection === 'projects' ? 'active' : ''}`}
            >
              PROJECTS
            </button>
            <button 
              onClick={() => setActiveSection('blog')}
              className={`nav-link ${activeSection === 'blog' ? 'active' : ''}`}
            >
              BLOG
            </button>
            <button 
              onClick={() => setActiveSection('faq')}
              className={`nav-link ${activeSection === 'faq' ? 'active' : ''}`}
            >
              FAQ
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={toggleMenu}
            className="md:hidden nav-link text-xl"
          >
            MENU
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-700">
            <div className="px-8 py-6 space-y-4">
              <button 
                onClick={() => { setActiveSection('about'); closeMenu(); }}
                className="block w-full text-left text-lg hover:text-blue-400 nav-link"
              >
                ABOUT
              </button>
              <button 
                onClick={() => { setActiveSection('work'); closeMenu(); }}
                className="block w-full text-left text-lg hover:text-blue-400 nav-link"
              >
                WORK
              </button>
              <button 
                onClick={() => { setActiveSection('projects'); closeMenu(); }}
                className="block w-full text-left text-lg hover:text-blue-400 nav-link"
              >
                PROJECTS
              </button>
              <button 
                onClick={() => { setActiveSection('blog'); closeMenu(); }}
                className="block w-full text-left text-lg hover:text-blue-400 nav-link"
              >
                BLOG
              </button>
              <button 
                onClick={() => { setActiveSection('faq'); closeMenu(); }}
                className="block w-full text-left text-lg hover:text-blue-400 nav-link"
              >
                FAQ
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Distance Widget - Only on FAQ page */}
      {distance && activeSection === 'faq' && (
        <div className="distance-widget" style={{ background: 'rgb(30 41 59 / 0.3)', border: '1px solid rgb(71 85 105)', borderRadius: '12px' }}>
          <button 
            onClick={() => setDistance(null)}
            className="absolute top-2 right-2 text-slate-400 hover:text-white transition-colors text-lg font-bold"
          >
            ✕
          </button>
          <div className="text-center">
            <div className="text-2xl mb-2">📍</div>
            <p className="text-sm text-slate-300">
              you're <span className="font-bold text-blue-400">{distance}</span> miles away from Krrisha!
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
              <main className="pt-40 px-8 pb-24">
        {/* About Section */}
        {activeSection === 'about' && (
          <div className="max-w-5xl">
            <div className="flex items-start gap-8 mb-12">
              <div className="headshot">
                <img src="/headshot.jpeg" alt="Krrisha Patel" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="main-name text-6xl md:text-7xl lg:text-8xl tracking-tighter leading-none mb-12 flex items-center gap-10">
                  Krrisha Patel
                  <span className="text-2xl md:text-3xl font-medium">
                    <span className="rotating-word" data-words="dreamer,doer,innovator"></span>
                  </span>
                </div>
                <div className="body-text text-xl md:text-2xl leading-relaxed max-w-4xl">
                  cs, finance & stats @ upenn m&t, focused on ai, ml, and healthcare tech. building tools 
                  to solve real-world problems. outside of coding, i'm into origami engineering, oil painting, 
                  tennis, swimming, exploring philly's coffee spots, and always looking for creative side projects.
                </div>
              </div>
            </div>
            
            {/* Current focus section */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">currently obsessed with</h3>
                <p className="body-text">
                  building AI that can actually understand context and create meaningful conversations. 
                  exploring edge computing and low-latency optimization for transformer models.
                  obsessed with making technology feel more human and intuitive.
                </p>
              </div>
              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">what i'm up to</h3>
                <p className="body-text">
                  working on innovative AI solutions at Very Good Ventures, exploring the intersection of 
                  healthcare and technology, and building products that actually make a difference in people's lives.
                  always learning, always building, always curious.
                </p>
              </div>
            </div>
            


                {/* Your Latest Works */}
                <div className="mt-16">
                  <h3 className="section-heading text-2xl mb-8 text-center">some of my latest artworks</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div 
                      className={`group cursor-pointer overflow-hidden rounded-lg border border-slate-700 hover:border-slate-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 h-48 ${
                        selectedArtwork === 'drawing1' ? 'col-span-2 row-span-2 artwork-expanded' : ''
                      }`}
                      onClick={() => setSelectedArtwork(selectedArtwork === 'drawing1' ? null : 'drawing1')}
                    >
                      <img 
                        src="/drawing1.jpg" 
                        alt="Latest work" 
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                    </div>
                    
                    <div 
                      className={`group cursor-pointer overflow-hidden rounded-lg border border-slate-700 hover:border-slate-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 h-48 ${
                        selectedArtwork === 'drawing2' ? 'col-span-2 row-span-2 artwork-expanded' : ''
                      }`}
                      onClick={() => setSelectedArtwork(selectedArtwork === 'drawing2' ? null : 'drawing2')}
                    >
                      <img 
                        src="/drawing2.jpg" 
                        alt="Latest work" 
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                    </div>
                    
                    <div 
                      className={`group cursor-pointer overflow-hidden rounded-lg border border-slate-700 hover:border-slate-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 h-48 ${
                        selectedArtwork === 'painting1' ? 'col-span-2 row-span-2 artwork-expanded' : ''
                      }`}
                      onClick={() => setSelectedArtwork(selectedArtwork === 'painting1' ? null : 'painting1')}
                    >
                      <img 
                        src="/painting1.jpg" 
                        alt="Latest work" 
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                    </div>
                    
                    <div 
                      className={`group cursor-pointer overflow-hidden rounded-lg border border-slate-500 hover:border-slate-400 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 h-48 ${
                        selectedArtwork === 'painting2' ? 'col-span-2 row-span-2 artwork-expanded' : ''
                      }`}
                      onClick={() => setSelectedArtwork(selectedArtwork === 'painting2' ? null : 'painting2')}
                    >
                      <img 
                        src="/painting2.jpg" 
                        alt="Latest work" 
                        className="w-full h-full object-cover transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>


          </div>
        )}

        {/* Work Section */}
        {activeSection === 'work' && (
          <div className="max-w-5xl">
            <h2 className="section-heading text-5xl mb-12">WORK</h2>
            <p className="body-text text-lg mb-12">professional experience & leadership</p>
            
            {/* Work Tabs */}
            <div className="work-tabs">
              <button 
                onClick={() => setActiveWorkTab('tech')}
                className={`work-tab ${activeWorkTab === 'tech' ? 'active' : ''}`}
              >
                Tech
              </button>
              <button 
                onClick={() => setActiveWorkTab('finance')}
                className={`work-tab ${activeWorkTab === 'finance' ? 'active' : ''}`}
              >
                Finance
              </button>
              <button 
                onClick={() => setActiveWorkTab('leadership')}
                className={`work-tab ${activeWorkTab === 'leadership' ? 'active' : ''}`}
              >
                Leadership
              </button>
              <button 
                onClick={() => setActiveWorkTab('school')}
                className={`work-tab ${activeWorkTab === 'school' ? 'active' : ''}`}
              >
                School
              </button>
            </div>

            {/* Tech Tab */}
            {activeWorkTab === 'tech' && (
              <div className="space-y-8">
                <div className="interactive-card p-6" onClick={() => setSelectedWork('aws')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Amazon Web Services</h3>
                    <span className="text-sm text-slate-400 bg-orange-900/50 px-3 py-1 rounded-full">Summer 2026</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Software Development Engineer Intern, Infrastructure Supply Chain Management</p>
                  <p className="body-text text-sm mb-3">
                    Architected Java/TypeScript malware scanner securing data center procurement across 12 global regions.
                    Cut deployment artifact size 45% (287MB → 159MB) with serverless Lambda/Fargate pipelines.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-orange-900/50 text-orange-300 text-xs rounded">Java</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">TypeScript</span>
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">AWS CDK</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Lambda</span>
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">Fargate</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>

                <div className="interactive-card p-6" onClick={() => setSelectedWork('very-good-ventures')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Very Good Ventures</h3>
                    <span className="text-sm text-slate-400 bg-blue-900/50 px-3 py-1 rounded-full">Dec 2024 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Software Engineering Intern</p>
                  <p className="body-text text-sm mb-3">
                    Spearheaded AI-powered race strategy assistant using LLMs, improving decision-making speed by 30% for NASCAR analysis. 
                    Reduced mobile sync latency by 35% with Flutter modules.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">LLMs</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Flutter</span>
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">AWS</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>

                <div className="interactive-card p-6" onClick={() => setSelectedWork('aha')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Advanced Health Academy (AHA)</h3>
                    <span className="text-sm text-slate-400 bg-purple-900/50 px-3 py-1 rounded-full">Nov 2024 - Dec 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Software Engineering Intern</p>
                  <p className="body-text text-sm mb-3">
                    Increased system scalability by 40% by deploying REST API with Node.js, AWS Lambdas. 
                    Developed blood report interpretation LLM with 98.4% accuracy.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">Node.js</span>
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">LLMs</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">AWS Lambda</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>

                <div className="interactive-card p-6" onClick={() => setSelectedWork('ipmd')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">IPMD Inc.</h3>
                    <span className="text-sm text-slate-400 bg-pink-900/50 px-3 py-1 rounded-full">Jun 2021 - Jul 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">AI and Machine Learning Developer Intern</p>
                  <p className="body-text text-sm mb-3">
                    Led integration of facial and emotional AI for telemedicine platform, improving emotional recognition by 30%. 
                    Enhanced ML pipeline efficiency with PyTorch and TensorFlow, reducing model training time by 20%.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">AI/ML</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Computer Vision</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">PyTorch</span>
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">Telemedicine</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>

                <div className="interactive-card p-6" onClick={() => setSelectedWork('infosys')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Infosys</h3>
                    <span className="text-sm text-slate-400 bg-orange-900/50 px-3 py-1 rounded-full">Sep 2024 - Dec 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Software Engineering Intern</p>
                  <p className="body-text text-sm mb-3">
                    Engineered cloud-based analytics platform with AWS Bedrock, Azure OpenAI, improving segmentation by 25% and 
                    uncovering $5M+ in revenue opportunities. Integrated RPA solutions, boosting client implementation by 30%.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-orange-900/50 text-orange-300 text-xs rounded">Cloud Computing</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">AWS</span>
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">RPA</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Analytics</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>

                <div className="interactive-card p-6" onClick={() => setSelectedWork('jane-street')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Jane Street Capital</h3>
                    <span className="text-sm text-slate-400 bg-blue-900/50 px-3 py-1 rounded-full">Jun 2024 - Aug 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Academy of Math and Programming Intern</p>
                  <p className="body-text text-sm mb-3">
                    Designed algorithmic solutions in game theory and graph theory, enhancing decision-making for quantitative trading. 
                    Achieved top 10 PnL scores in trading challenges, contributing over $9M in profit.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Algorithm Design</span>
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">Game Theory</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Quantitative Trading</span>
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">High-Frequency Trading</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>

                <div className="interactive-card p-6" onClick={() => setSelectedWork('prosthetix')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">ProsthetiX</h3>
                    <span className="text-sm text-slate-400 bg-amber-900/50 px-3 py-1 rounded-full">Feb 2023 - Jun 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Lead Researcher, Design and Developer</p>
                  <p className="body-text text-sm mb-3">
                    Constructed affordable myoelectric prosthetics using Arduino, Raspberry Pi Pico, and MATLAB. 
                    Cut production costs by 50% and improved mobility by 20% in clinical simulations.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-amber-900/50 text-amber-300 text-xs rounded">Arduino</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Raspberry Pi</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">MATLAB</span>
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">3D Printing</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>
              </div>
            )}

            {/* Finance Tab */}
            {activeWorkTab === 'finance' && (
              <div className="space-y-8">
                <div className="interactive-card p-6" onClick={() => setSelectedWork('goahead-ventures')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">GoAhead Ventures</h3>
                    <span className="text-sm text-slate-400 bg-green-900/50 px-3 py-1 rounded-full">Sep 2024 - Dec 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Venture Capital Analyst</p>
                  <p className="body-text text-sm mb-3">
                    Sourced and evaluated 50+ startups for a $180M AUM fund; engaged with 300+ CEOs, increasing founder applications by 20%. 
                    Managed a $175M portfolio and conducted due diligence on 15+ startups.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Due Diligence</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Investment Analysis</span>
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">Portfolio Management</span>
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">Financial Modeling</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>

                <div className="interactive-card p-6" onClick={() => setSelectedWork('phelps-forward')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Phelps Forward</h3>
                    <span className="text-sm text-slate-400 bg-teal-900/50 px-3 py-1 rounded-full">Jan 2025 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Program Scholar and Summer Investing Program Participant</p>
                  <p className="body-text text-sm mb-3">
                    Chosen for selective 3-year financial services career development program for first-gen women with leadership potential. 
                    Participate in 9-week immersive program on financial modeling and analysis.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-teal-900/50 text-teal-300 text-xs rounded">Financial Modeling</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">DCF Analysis</span>
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">LBO Models</span>
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">Merger Analysis</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>
              </div>
            )}

            {/* Leadership Tab */}
            {activeWorkTab === 'leadership' && (
              <div className="space-y-8">
                <div className="interactive-card p-6" onClick={() => setSelectedWork('passion4med')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Passion4Med</h3>
                    <span className="text-sm text-slate-400 bg-pink-900/50 px-3 py-1 rounded-full">Jun 2019 - Dec 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Founder & CEO</p>
                  <p className="body-text text-sm mb-3">
                    Built global platform of 4,500+ members; designed 200+ educational resources for aspiring healthcare professionals. 
                    Partnered with 15+ organizations, hosting 100+ events with 50,000+ views.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">Leadership</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Healthcare</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Education</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>

                <div className="interactive-card p-6" onClick={() => setSelectedWork('metahealth')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">MetaHealth</h3>
                    <span className="text-sm text-slate-400 bg-indigo-900/50 px-3 py-1 rounded-full">Jun 2022 - Aug 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Founder & CEO</p>
                  <p className="body-text text-sm mb-3">
                    Developed app prototype for 60+ users, offering personalized health tracking and metabolic syndrome management. 
                    Conducted 20+ workshops, raising awareness across 5,000+ social media followers.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded">Health Tech</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">App Development</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Workshops</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>

                <div className="interactive-card p-6" onClick={() => setSelectedWork('microsoft')}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Microsoft</h3>
                    <span className="text-sm text-slate-400 bg-blue-900/50 px-3 py-1 rounded-full">Jul 2025 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Excel Student Ambassador</p>
                  <p className="body-text text-sm mb-3">
                    Promoted Excel adoption via workshops and digital content; collaborated with student orgs to drive product usage growth. 
                    Encouraged adoption and gathered user feedback for product improvement recommendations.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Product Advocacy</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Workshops</span>
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">Student Engagement</span>
                  </div>
                  <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
                </div>
              </div>
            )}

            {/* School Tab */}
            {activeWorkTab === 'school' && (
              <div className="space-y-8">
                <div className="interactive-card p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Girls Into VC Penn Chapter</h3>
                    <span className="text-sm text-slate-400 bg-purple-900/50 px-3 py-1 rounded-full">Sep 2024 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Co-Founder</p>
                  <p className="body-text text-sm mb-3">
                    Co-founded Penn's first chapter dedicated to empowering women in venture capital. 
                    Organizing networking events, mentorship programs, and educational workshops.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">Venture Capital</span>
                    <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">Women in Tech</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Leadership</span>
                  </div>
                </div>

                <div className="interactive-card p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Wharton Undergraduate Healthcare Club</h3>
                    <span className="text-sm text-slate-400 bg-green-900/50 px-3 py-1 rounded-full">Sep 2024 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Incubator Team</p>
                  <p className="body-text text-sm mb-3">
                    Part of the incubator team helping students develop healthcare startups. 
                    Mentoring early-stage ideas and connecting founders with industry experts.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Healthcare</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Startups</span>
                    <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">Incubator</span>
                  </div>
                </div>

                <div className="interactive-card p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Wharton Undergraduate Entrepreneurship Club</h3>
                    <span className="text-sm text-slate-400 bg-yellow-900/50 px-3 py-1 rounded-full">Sep 2024 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Pitch Team</p>
                  <p className="body-text text-sm mb-3">
                    Part of the pitch team helping students develop and present startup ideas. 
                    Mentoring early-stage entrepreneurs and organizing pitch competitions.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-yellow-900/50 text-yellow-300 text-xs rounded">Entrepreneurship</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Pitch Competitions</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Mentoring</span>
                  </div>
                </div>

                <div className="interactive-card p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-xl">Product Space @ Penn</h3>
                    <span className="text-sm text-slate-400 bg-orange-900/50 px-3 py-1 rounded-full">Sep 2024 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Product Team</p>
                  <p className="body-text text-sm mb-3">
                    Working on product development and user experience design. 
                    Collaborating with cross-functional teams to build innovative solutions.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-orange-900/50 text-orange-300 text-xs rounded">Product Design</span>
                    <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">UX/UI</span>
                    <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Innovation</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Projects Section */}
        {activeSection === 'projects' && (
          <div className="max-w-5xl">
            <h2 id="projects-heading" className="section-heading text-5xl mb-12">PROJECTS</h2>
            <p className="body-text text-lg mb-12">technical projects & innovations</p>
            
            {/* Side Menu */}
            <div className="flex gap-4">
              <div className="w-48 flex-shrink-0">
                <div className="fixed top-80 left-8 space-y-3">
                  <button 
                    onClick={() => {
                      const element = document.getElementById('projects-heading');
                      if (element) {
                        const offset = 100;
                        const elementPosition = element.offsetTop - offset;
                        window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                      }
                    }}
                    className="block w-full text-left text-sm text-slate-400 hover:text-blue-400 transition-colors py-2 px-3 rounded hover:bg-slate-800/30"
                  >
                    📁 Projects
                  </button>
                  <button 
                    onClick={() => {
                      const element = document.getElementById('awards-heading');
                      if (element) {
                        const offset = 100;
                        const elementPosition = element.offsetTop - offset;
                        window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                      }
                    }}
                    className="block w-full text-left text-sm text-slate-400 hover:text-blue-400 transition-colors py-2 px-3 rounded hover:bg-slate-800/30"
                  >
                    🏆 Awards
                  </button>
                  <button 
                    onClick={() => {
                      const element = document.getElementById('skills-heading');
                      if (element) {
                        const offset = 100;
                        const elementPosition = element.offsetTop - offset;
                        window.scrollTo({ top: elementPosition, behavior: 'smooth' });
                      }
                    }}
                    className="block w-full text-left text-sm text-slate-400 hover:text-blue-400 transition-colors py-2 px-3 rounded hover:bg-slate-800/30"
                  >
                    💻 Skills
                  </button>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="space-y-8">
              <div className="interactive-card p-6" onClick={() => setSelectedProject('pgx-record')}>
                <div className="flex justify-between items-start mb-3 gap-3">
                  <h3 className="section-heading text-xl">Pharmacogenomic Record</h3>
                  <a
                    href="https://github.com/krrishapatel/Pharmacogenomic-Record"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-300 hover:text-blue-200 whitespace-nowrap border border-blue-800 rounded px-2 py-1"
                  >
                    source ↗
                  </a>
                </div>
                <p className="body-text text-sm mb-3">
                  A drug-gene interaction checker built on CPIC guidelines that refuses to guess. Its core rule: never let
                  &ldquo;no known interaction&rdquo; and &ldquo;cannot assess this gene&rdquo; collapse into the same answer,
                  because absence of data is not absence of risk. 452 tests.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">SQLite</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">PharmCAT</span>
                  <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">Bioinformatics</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedProject('exchange-simulator')}>
                <div className="flex justify-between items-start mb-3 gap-3">
                  <h3 className="section-heading text-xl">Exchange Simulator</h3>
                  <a
                    href="https://github.com/krrishapatel/exchange-simulator"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-300 hover:text-blue-200 whitespace-nowrap border border-blue-800 rounded px-2 py-1"
                  >
                    source ↗
                  </a>
                </div>
                <p className="body-text text-sm mb-3">
                  A simulated exchange with a C++ matching engine on a zero-allocation hot path: ~61ns order adds,
                  ~118ns limit matches, 8.5M matches/sec. Wrapped with pybind11 so RL agents can train against it
                  through a Gymnasium env, with a live React dashboard over WebSocket.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">C++</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">pybind11</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Gymnasium</span>
                  <span className="px-2 py-1 bg-orange-900/50 text-orange-300 text-xs rounded">React</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedProject('excel-diff')}>
                <div className="flex justify-between items-start mb-3 gap-3">
                  <h3 className="section-heading text-xl">Excel Workbook Diff & Tie-Out</h3>
                  <a
                    href="https://github.com/krrishapatel/excel-diff-tool"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-300 hover:text-blue-200 whitespace-nowrap border border-blue-800 rounded px-2 py-1"
                  >
                    source ↗
                  </a>
                </div>
                <p className="body-text text-sm mb-3">
                  Built for tax preparers doing year-over-year workpaper review: diffs two workbooks cell by cell with a
                  materiality threshold, then reconciles the filed PDF return against the workbook that produced it,
                  handling the sign flips that accounting actually uses.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">React</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">TypeScript</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">SpreadJS</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedProject('doctoapi')}>
                <div className="flex justify-between items-start mb-3 gap-3">
                  <h3 className="section-heading text-xl">doctoapi</h3>
                  <a
                    href="https://github.com/krrishapatel/doctoapi"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-300 hover:text-blue-200 whitespace-nowrap border border-blue-800 rounded px-2 py-1"
                  >
                    source ↗
                  </a>
                </div>
                <p className="body-text text-sm mb-3">
                  Upload any document, get a typed REST API. Infers a schema from the PDF itself instead of making you
                  configure templates or regexes up front, so it keeps working when the document format shifts.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">FastAPI</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">LLMs</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedProject('open-source')}>
                <div className="flex justify-between items-start mb-3 gap-3">
                  <h3 className="section-heading text-xl">Open Source Contributions</h3>
                  <a
                    href="https://github.com/krrishapatel"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-300 hover:text-blue-200 whitespace-nowrap border border-blue-800 rounded px-2 py-1"
                  >
                    github ↗
                  </a>
                </div>
                <p className="body-text text-sm mb-3">
                  Open pull requests under review on Starlette, OpenTelemetry Python, and Supervisor &mdash; an IPv6 host
                  header parsing bug, a multi-byte decode crash, and missing real-time signals. Mostly an exercise in
                  reading large unfamiliar codebases well enough to fix something narrow without breaking anything.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">Starlette</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">OpenTelemetry</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

                                                             <div className="interactive-card p-6" onClick={() => setSelectedProject('llm-optimizer')}>
                <h3 className="section-heading text-xl mb-3">LLM-Aware Runtime Optimizer</h3>
                <p className="body-text text-sm mb-3">
                  Built MLIR-based runtime optimizer for quantized transformer LLMs, targeting low-latency edge deployment. 
                  Reduced latency by 48% on NVIDIA GPUs using TensorRT + ONNX rewriting.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">CUDA</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">MLIR</span>
                  <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">TensorRT</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

                                                             <div className="interactive-card p-6" onClick={() => setSelectedProject('trading-simulator')}>
                <h3 className="section-heading text-xl mb-3">Real-Time AI Trading Simulator</h3>
                <p className="body-text text-sm mb-3">
                  Created multithreaded trading engine processing 1,000+ datapoints/sec using real-time APIs and event loops. 
                  Implemented VWAP logic and limit orders; benchmarked PnL performance against S&P and sector indices.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">WebSockets</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">SQL</span>
                  <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">Multithreading</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

                              <div className="interactive-card p-6" onClick={() => setSelectedProject('medical-llm')}>
                <h3 className="section-heading text-xl mb-3">Distributed Inference Pipeline for Medical LLMs</h3>
                <p className="body-text text-sm mb-3">
                  Built async LLM inference system with caching + cold-start mitigation; deployed using serverless AWS Lambda. 
                  Reached 98.4% interpretation accuracy; reduced response time by 30% with streaming and rate-limiting layers.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">FastAPI</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">AWS Lambda</span>
                  <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">MongoDB</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

                              <div className="interactive-card p-6" onClick={() => setSelectedProject('equity-forecaster')}>
                <h3 className="section-heading text-xl mb-3">Equity Price Forecaster</h3>
                <p className="body-text text-sm mb-3">
                  Built predictive model using macro, firm-level data to forecast S&P 500 movements with ~92% accuracy over 30-day windows. 
                  Deployed pipeline with Snowflake, Airflow for daily ETL; visualized forecasts in Tableau for decision-ready insights.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">SQL</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">Tableau</span>
                  <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">Scikit-learn</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

                              <div className="interactive-card p-6" onClick={() => setSelectedProject('trading-bot')}>
                <h3 className="section-heading text-xl mb-3">Algorithmic Trading Bot</h3>
                <p className="body-text text-sm mb-3">
                  Developed predictive models for market forecasting, projected ~$150 PnL/min, with 95% accuracy. 
                  Implemented real-time data pipelines and APIs for market data analysis and forecasting.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">TensorFlow</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">APIs</span>
                  <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">Scikit-learn</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>

                              <div className="interactive-card p-6" onClick={() => setSelectedProject('healthcare-analytics')}>
                <h3 className="section-heading text-xl mb-3">Healthcare Analytics Platform</h3>
                <p className="body-text text-sm mb-3">
                  Built comprehensive healthcare analytics platform integrating multiple data sources for patient insights. 
                  Implemented real-time dashboards and predictive analytics for early disease detection.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs rounded">Python</span>
                  <span className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded">React</span>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs rounded">PostgreSQL</span>
                  <span className="px-2 py-1 bg-pink-900/50 text-pink-300 text-xs rounded">D3.js</span>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">Click for more details →</div>
              </div>
            </div>

            {/* Awards Section */}
            <div className="mt-16">
              <h3 id="awards-heading" className="section-heading text-2xl mb-6 text-center">Awards & Recognition</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="interactive-card p-6">
                  <h4 className="font-semibold text-lg mb-3 text-slate-200">Academic Excellence</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">🏆</span>
                      <p>FS-ISAC Women in Cybersecurity Scholarship ($10,000)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">🏆</span>
                      <p>National Videogame Museum Women in Tech Scholarship ($5,000)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">🏆</span>
                      <p>Association for the Advancement of Medical Instrumentation Foundation Michael J Miller Scholarship ($3,000)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">🥇</span>
                      <p>1st Place - KISS Institute for Practical Robotics National Robotics Competition</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">🥈</span>
                      <p>Silver Medal - RWJBarnabas STEM Showcase</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">🥉</span>
                      <p>3rd Place - National Science League Biology</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">🥉</span>
                      <p>3rd Place - National Science League Physics</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">🥈</span>
                      <p>2nd Place - Andrushkiw Math Competition</p>
                    </div>
                  </div>
                </div>
                
                <div className="interactive-card p-6">
                  <h4 className="font-semibold text-lg mb-3 text-slate-200">Research & Publications</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">📚</span>
                      <p>Co-authored "A Systematic Review of Implementing the Race Glomerular Filtration Rate"</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">🎯</span>
                      <p>Accepted in Inaugural Anti-Racism in MedEd Symposium</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">📖</span>
                      <p>Co-authored "The Future Is STEM" Book (#1 Release)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">🏥</span>
                      <p>American Academy of Pediatrics Youth Achievement Award</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Skills */}
            <div className="mt-16">
              <h3 id="skills-heading" className="section-heading text-2xl mb-6 text-center">Technical Skills</h3>
              <div className="interactive-card p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-slate-200">Languages</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm rounded-full">Python</span>
                      <span className="px-3 py-1 bg-purple-900/50 text-purple-300 text-sm rounded-full">Java</span>
                      <span className="px-3 py-1 bg-green-900/50 text-green-300 text-sm rounded-full">C/C++</span>
                      <span className="px-3 py-1 bg-pink-900/50 text-pink-300 text-sm rounded-full">JavaScript</span>
                      <span className="px-3 py-1 bg-orange-900/50 text-orange-300 text-sm rounded-full">TypeScript</span>
                      <span className="px-3 py-1 bg-indigo-900/50 text-indigo-300 text-sm rounded-full">SQL</span>
                      <span className="px-3 py-1 bg-red-900/50 text-red-300 text-sm rounded-full">Go</span>
                      <span className="px-3 py-1 bg-teal-900/50 text-teal-300 text-sm rounded-full">Kotlin</span>
                      <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 text-sm rounded-full">HTML</span>
                      <span className="px-3 py-1 bg-cyan-900/50 text-cyan-300 text-sm rounded-full">CSS</span>
                      <span className="px-3 py-1 bg-lime-900/50 text-lime-300 text-sm rounded-full">Rust</span>
                      <span className="px-3 py-1 bg-rose-900/50 text-rose-300 text-sm rounded-full">Swift</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-slate-200">Frameworks & Tools</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm rounded-full">React</span>
                      <span className="px-3 py-1 bg-purple-900/50 text-purple-300 text-sm rounded-full">Node.js</span>
                      <span className="px-3 py-1 bg-green-900/50 text-green-300 text-sm rounded-full">Docker</span>
                      <span className="px-3 py-1 bg-pink-900/50 text-pink-300 text-sm rounded-full">Kubernetes</span>
                      <span className="px-3 py-1 bg-orange-900/50 text-orange-300 text-sm rounded-full">Terraform</span>
                      <span className="px-3 py-1 bg-indigo-900/50 text-indigo-300 text-sm rounded-full">Angular</span>
                      <span className="px-3 py-1 bg-teal-900/50 text-teal-300 text-sm rounded-full">Vue</span>
                      <span className="px-3 py-1 bg-red-900/50 text-red-300 text-sm rounded-full">Flask</span>
                      <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 text-sm rounded-full">Django</span>
                      <span className="px-3 py-1 bg-cyan-900/50 text-cyan-300 text-sm rounded-full">Express.js</span>
                      <span className="px-3 py-1 bg-lime-900/50 text-lime-300 text-sm rounded-full">Spring Boot</span>
                      <span className="px-3 py-1 bg-rose-900/50 text-rose-300 text-sm rounded-full">FastAPI</span>
                      <span className="px-3 py-1 bg-emerald-900/50 text-emerald-300 text-sm rounded-full">Laravel</span>
                      <span className="px-3 py-1 bg-violet-900/50 text-violet-300 text-sm rounded-full">Next.js</span>
                      <span className="px-3 py-1 bg-amber-900/50 text-amber-300 text-sm rounded-full">Nuxt.js</span>
                      <span className="px-3 py-1 bg-sky-900/50 text-sky-300 text-sm rounded-full">Flutter</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-slate-200">Databases & Storage</h4>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm rounded-full">MongoDB</span>
                      <span className="px-3 py-1 bg-purple-900/50 text-purple-300 text-sm rounded-full">PostgreSQL</span>
                      <span className="px-3 py-1 bg-green-900/50 text-green-300 text-sm rounded-full">MySQL</span>
                      <span className="px-3 py-1 bg-pink-900/50 text-pink-300 text-sm rounded-full">Redis</span>
                      <span className="px-3 py-1 bg-orange-900/50 text-orange-300 text-sm rounded-full">DynamoDB</span>
                      <span className="px-3 py-1 bg-indigo-900/50 text-indigo-300 text-sm rounded-full">Firebase</span>
                      <span className="px-3 py-1 bg-teal-900/50 text-teal-300 text-sm rounded-full">Elasticsearch</span>
                      <span className="px-3 py-1 bg-red-900/50 text-red-300 text-sm rounded-full">Cassandra</span>
                      <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 text-sm rounded-full">InfluxDB</span>
                      <span className="px-3 py-1 bg-cyan-900/50 text-cyan-300 text-sm rounded-full">Snowflake</span>
                      <span className="px-3 py-1 bg-lime-900/50 text-lime-300 text-sm rounded-full">BigQuery</span>
                      <span className="px-3 py-1 bg-rose-900/50 text-rose-300 text-sm rounded-full">S3</span>
                    </div>
                  </div>
                  <div className="lg:col-span-3 lg:flex lg:justify-center">
                    <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:w-auto">
                      <div>
                        <h4 className="font-semibold text-lg mb-3 text-slate-200">Data Science & ML</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm rounded-full">NumPy</span>
                          <span className="px-3 py-1 bg-purple-900/50 text-purple-300 text-sm rounded-full">Pandas</span>
                          <span className="px-3 py-1 bg-green-900/50 text-green-300 text-sm rounded-full">Hugging Face</span>
                          <span className="px-3 py-1 bg-pink-900/50 text-pink-300 text-sm rounded-full">PyTorch</span>
                          <span className="px-3 py-1 bg-orange-900/50 text-orange-300 text-sm rounded-full">TensorFlow</span>
                          <span className="px-3 py-1 bg-indigo-900/50 text-indigo-300 text-sm rounded-full">Scikit-learn</span>
                          <span className="px-3 py-1 bg-teal-900/50 text-teal-300 text-sm rounded-full">Matplotlib</span>
                          <span className="px-3 py-1 bg-red-900/50 text-red-300 text-sm rounded-full">Seaborn</span>
                          <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 text-sm rounded-full">Plotly</span>
                          <span className="px-3 py-1 bg-cyan-900/50 text-cyan-300 text-sm rounded-full">Jupyter</span>
                          <span className="px-3 py-1 bg-lime-900/50 text-lime-300 text-sm rounded-full">OpenAI API</span>
                          <span className="px-3 py-1 bg-rose-900/50 text-rose-300 text-sm rounded-full">LangChain</span>
                          <span className="px-3 py-1 bg-emerald-900/50 text-emerald-300 text-sm rounded-full">Streamlit</span>
                          <span className="px-3 py-1 bg-violet-900/50 text-violet-300 text-sm rounded-full">Gradio</span>
                          <span className="px-3 py-1 bg-amber-900/50 text-amber-300 text-sm rounded-full">MLflow</span>
                          <span className="px-3 py-1 bg-sky-900/50 text-sky-300 text-sm rounded-full">Weights & Biases</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg mb-3 text-slate-200">Cloud & Concepts</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-blue-900/50 text-blue-300 text-sm rounded-full">AWS</span>
                          <span className="px-3 py-1 bg-purple-900/50 text-purple-300 text-sm rounded-full">Azure</span>
                          <span className="px-3 py-1 bg-green-900/50 text-green-300 text-sm rounded-full">GCP</span>
                          <span className="px-3 py-1 bg-pink-900/50 text-pink-300 text-sm rounded-full">Microservices</span>
                          <span className="px-3 py-1 bg-orange-900/50 text-orange-300 text-sm rounded-full">DevOps</span>
                          <span className="px-3 py-1 bg-indigo-900/50 text-indigo-300 text-sm rounded-full">CI/CD</span>
                          <span className="px-3 py-1 bg-teal-900/50 text-teal-300 text-sm rounded-full">WebSockets</span>
                          <span className="px-3 py-1 bg-red-900/50 text-red-300 text-sm rounded-full">Jenkins</span>
                          <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 text-sm rounded-full">GitLab</span>
                          <span className="px-3 py-1 bg-cyan-900/50 text-cyan-300 text-sm rounded-full">GitHub Actions</span>
                          <span className="px-3 py-1 bg-lime-900/50 text-lime-300 text-sm rounded-full">Serverless</span>
                          <span className="px-3 py-1 bg-rose-900/50 text-rose-300 text-sm rounded-full">Kubernetes</span>
                          <span className="px-3 py-1 bg-emerald-900/50 text-emerald-300 text-sm rounded-full">Docker Compose</span>
                          <span className="px-3 py-1 bg-violet-900/50 text-violet-300 text-sm rounded-full">Helm Charts</span>
                          <span className="px-3 py-1 bg-amber-900/50 text-amber-300 text-sm rounded-full">Terraform</span>
                          <span className="px-3 py-1 bg-sky-900/50 text-sky-300 text-sm rounded-full">Ansible</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blog Section */}
        {activeSection === 'blog' && (
          <div className="max-w-5xl">
            <h2 className="section-heading text-5xl mb-12">BLOG</h2>
            <p className="body-text text-lg mb-12">random thoughts & insights</p>
            
            {/* Blog Modal */}
            {selectedBlog && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                <div 
                  className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative border border-slate-700 cursor-pointer"
                  onClick={() => setSelectedBlog(null)}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBlog(null);
                    }}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl font-bold hover:scale-110 transition-transform"
                  >
                    ✕
                  </button>
                  
                  
                  
                  {selectedBlog === 'startup-lessons' && (
                    <div>
                      <h2 className="section-heading text-3xl mb-4">what i learned from building 3 failed startups before 20</h2>
                      <div className="text-sm text-slate-400 mb-6">July 1, 2025 • 6 min read</div>
                      <div className="body-text leading-relaxed space-y-4">
                        <p>started my first company at 16, convinced i was going to revolutionize the world. it failed spectacularly. so did the second one. and the third. but each failure taught me something crucial: the first startup failed because i built something i thought was cool, not something people actually needed.</p>
                        <p>the second failed because i focused on the wrong metrics. the third failed because i tried to scale too fast. now i'm building my fourth, and this time i'm obsessed with understanding the problem before writing a single line of code.</p>
                        <p>my first startup was a social media app for high school students. i spent months building features i thought were cool. custom filters, anonymous posting, group challenges. but when i launched it, hardly anyone used it. turns out high school students already have social media, and they don't need another one.</p>
                        <p>the lesson? build for a real problem, not for what you think is cool. i should have spent time talking to potential users, understanding their pain points, figuring out what they actually needed. instead, i built what i wanted to build.</p>
                        <p>my second startup was an AI-powered study app. this time i did talk to users, but i focused on the wrong metrics. i was obsessed with user acquisition, getting as many people as possible to download the app. but i wasn't paying attention to retention. how many people actually kept using it.</p>
                        <p>turns out, getting people to try something is easy. getting them to keep using it is hard. i had thousands of downloads but only a few dozen active users. the lesson? focus on retention, not acquisition. it's better to have 100 people who love your product than 10,000 who try it once.</p>
                        <p>my third startup was a marketplace for freelance developers. this time i had users and retention, but i tried to scale too fast. i started expanding to new markets, adding new features, hiring people. all before the core product was solid. it was like trying to build a skyscraper on a foundation of sand.</p>
                        <p>the lesson? get the core product right before you try to scale. make sure you have product-market fit, that people actually want what you're building, before you start adding bells and whistles.</p>
                        <p>now i'm working on my fourth startup, and this time i'm doing things differently. i'm spending weeks just talking to potential users, understanding their problems, making sure i'm building something they actually need. i'm starting small, with a minimal viable product, and i'm focusing on getting that right before i add anything else.</p>
                        <p>the funny thing is, all these failures have made me a much better entrepreneur. i know what not to do, which is almost as valuable as knowing what to do. and i've learned that failure isn't the end. it's just part of the learning process.</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedBlog === 'coffee-philosophy' && (
                    <div>
                      <h2 className="section-heading text-3xl mb-4">the philosophy of coffee shop conversations</h2>
                      <div className="text-sm text-slate-400 mb-6">June 25, 2025 • 4 min read</div>
                      <div className="body-text leading-relaxed space-y-4">
                        <p>philadelphia has this incredible coffee culture that i've become obsessed with. not because the coffee is particularly amazing, but because of the conversations that happen in these spaces. there's something about the combination of caffeine, comfortable seating, and the right lighting that makes people open up.</p>
                        <p>i've had conversations about quantum physics, startup ideas, and life philosophy with complete strangers. the best part? these conversations never happen in the same way twice. each coffee shop has its own personality, its own rhythm. it's like each one is a different stage for human connection.</p>
                        <p>my favorite spot is this tiny place in old city called "the gathering." it's not fancy. just a few tables, some comfortable chairs, and really good coffee. but there's something about the atmosphere that encourages conversation. maybe it's the warm lighting, or the way the tables are arranged, or the fact that there's no wifi, so people actually talk to each other.</p>
                        <p>i've met some of the most interesting people there. there's this retired physics professor who comes in every morning and always has fascinating stories about his research. there's a startup founder who's building something in the healthcare space. there's even a local artist who creates these incredible sculptures out of found objects.</p>
                        <p>the conversations i've had there have changed how i think about everything from technology to art to human nature. there's something about the informal setting that makes people more willing to share their ideas, to challenge conventional thinking, to explore new possibilities.</p>
                        <p>i think it's because coffee shops exist in this liminal space between work and home, between public and private. they're not as formal as a business meeting, but not as casual as hanging out with friends. they're perfect for the kind of conversations that don't fit anywhere else.</p>
                        <p>and philadelphia has so many different types of coffee shops, each with its own character. there are the hipster spots in fishtown, the academic ones near the universities, the touristy ones in center city. each attracts different types of people, which means different types of conversations.</p>
                        <p>i've started making it a habit to visit a new coffee shop every week, just to see what kinds of conversations happen there. it's like urban anthropology. studying how different environments shape human interaction. and the more i do it, the more i realize that coffee shops are some of the most important social spaces in our cities.</p>
                        <p>they're where ideas are born, where connections are made, where the boundaries between different worlds are crossed. in a city as diverse as philadelphia, that's incredibly valuable. coffee shops are the great equalizers, where a penn student can have a conversation with a retired factory worker, where a tech entrepreneur can share ideas with an artist.</p>
                      </div>
                    </div>
                  )}
                  
                  
                </div>
              </div>
            )}
            
            <div className="space-y-8">




              <div className="interactive-card p-8" onClick={() => setSelectedBlog('startup-lessons')}>
                <div className="flex items-center justify-between mb-4">
                                            <h3 className="section-heading text-xl">what i learned from building 3 failed startups before 20</h3>
                  <span className="text-sm text-slate-400 bg-green-900/50 px-3 py-1 rounded-full">July 1, 2025</span>
                </div>
                <p className="body-text leading-relaxed mb-4">
                  started my first company at 16, convinced i was going to revolutionize the world. it failed 
                  spectacularly. so did the second one. and the third. but each failure taught me something 
                  crucial: the first startup failed because i built something i thought was cool, not something 
                  people actually needed. the second failed because i focused on the wrong metrics. the third 
                  failed because i tried to scale too fast. now i'm building my fourth, and this time i'm 
                  obsessed with understanding the problem before writing a single line of code...
                </p>
                <div className="flex items-center text-sm text-slate-400">
                  <span className="mr-4">🚀 Entrepreneurship</span>
                  <span className="mr-4">💡 Lessons Learned</span>
                  <span>6 min read</span>
                </div>
              </div>

              <div className="interactive-card p-8" onClick={() => setSelectedBlog('coffee-philosophy')}>
                <div className="flex items-center justify-between mb-4">
                                            <h3 className="section-heading text-xl">the philosophy of coffee shop conversations</h3>
                  <span className="text-sm text-slate-400 bg-pink-900/50 px-3 py-1 rounded-full">June 25, 2025</span>
                </div>
                <p className="body-text leading-relaxed mb-4">
                  philadelphia has this incredible coffee culture that i've become obsessed with. not because 
                  the coffee is particularly amazing, but because of the conversations that happen in these 
                  spaces. there's something about the combination of caffeine, comfortable seating, and 
                  the right lighting that makes people open up. i've had conversations about quantum physics, 
                  startup ideas, and life philosophy with complete strangers. the best part? these conversations 
                  never happen in the same way twice. each coffee shop has its own personality, its own 
                  rhythm. it's like each one is a different stage for human connection...
                </p>
                <div className="flex items-center text-sm text-slate-400">
                  <span className="mr-4">☕ Coffee Culture</span>
                  <span className="mr-4">🗣️ Human Connection</span>
                  <span>4 min read</span>
                </div>
              </div>



            </div>
          </div>
        )}

        {/* FAQ Section */}
        {activeSection === 'faq' && (
          <div className="max-w-5xl">
            <h2 className="section-heading text-5xl mb-12">FAQ</h2>
            <p className="body-text text-lg mb-12">infrequently asked questions</p>
            
            {/* Subtle Interactive Element */}
            <div className="relative mb-16">
              <div className="subtle-interaction" onClick={() => alert('🎯 You found the subtle interactive element!')}>
                <div className="interaction-dot"></div>
              </div>
            </div>
            
            <div className="space-y-16">
              <div className="interactive-card p-8">
                <h3 className="section-heading text-xl mb-6">what's the most challenging project you've ever built?</h3>
                <p className="body-text leading-relaxed">
                  definitely the LLM-aware runtime optimizer. trying to squeeze every last millisecond out of transformer models 
                  while maintaining accuracy was like solving a 1000-piece puzzle blindfolded. but when we finally got that 48% 
                  latency reduction, it felt like discovering fire all over again.
                </p>
                <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700">
                  <p className="body-text text-sm italic">
                    "the best code is the kind that makes you question why you ever wrote it any other way"
                  </p>
                </div>
              </div>

              <div className="interactive-card p-8">
                <h3 className="section-heading text-xl mb-6">how do you stay creative in such a technical field?</h3>
                <p className="body-text leading-relaxed mb-6">
                  i think the best engineers are secretly artists. every algorithm is a composition, every system architecture 
                  is a sculpture. i stay creative by constantly asking "what if?" and "why not?" sometimes the most innovative 
                  solutions come from combining completely unrelated ideas. like using game theory for trading algorithms or 
                  applying medical AI concepts to financial modeling.
                </p>
                <div className="mt-4 p-4 bg-purple-900/20 rounded-lg border border-purple-700">
                  <p className="body-text text-sm italic">
                    "creativity is just connecting dots that no one else thought to connect"
                  </p>
                </div>
              </div>

              <div className="interactive-card p-8">
                <h3 className="section-heading text-xl mb-6">what's your approach to learning new technologies?</h3>
                <p className="body-text leading-relaxed">
                  i'm a firm believer in the "build first, understand later" approach. i'll dive into a new framework or 
                  language by immediately trying to build something with it, even if it's terrible. you learn more from 
                  making mistakes than from reading perfect examples. plus, there's nothing like the satisfaction of 
                  getting something working, even if it's held together with duct tape and prayers.
                </p>
                <div className="mt-4 p-4 bg-green-900/20 rounded-lg border border-green-700">
                  <p className="body-text text-sm italic">
                    "the best teacher is experience, and the best experience is failure"
                  </p>
                </div>
              </div>

              <div className="interactive-card p-8">
                <h3 className="section-heading text-xl mb-6">what's something you're passionate about that might surprise people?</h3>
                <p className="body-text leading-relaxed">
                  i'm absolutely obsessed with escape room design. there's something fascinating about creating puzzles that 
                  challenge both logic and creativity. i've designed several escape rooms for friends, and the best part is 
                  watching people's faces when they finally solve a particularly tricky puzzle. it's like watching someone 
                  discover a new superpower.
                </p>
                <div className="mt-4 p-4 bg-orange-900/20 rounded-lg border border-orange-700">
                  <p className="body-text text-sm italic">
                    "puzzles are just problems waiting to be solved with the right perspective"
                  </p>
                </div>
              </div>

              <div className="interactive-card p-8">
                <h3 className="section-heading text-xl mb-6">what books have shaped your thinking?</h3>
                <p className="body-text leading-relaxed mb-6">
                  i'm a voracious reader who believes in the power of diverse perspectives. some recent favorites that have 
                  completely changed how i think about the world:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-2">Academic & Professional</h4>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>• "The Psychology of Money" - Morgan Housel</li>
                      <li>• "Zero to One" - Peter Thiel</li>
                      <li>• "Poor Charlie's Almanack" - Charlie Munger</li>
                      <li>• "The Unpublished David Ogilvy" - David Ogilvy</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200 mb-2">Creative & Personal</h4>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>• "Let My People Go Surfing" - Yvon Chouinard</li>
                      <li>• "The Fish That Ate the Whale" - Rich Cohen</li>
                      <li>• "Stranger in a Strange Land" - Robert Heinlein</li>
                      <li>• "Foundation Series" - Isaac Asimov</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-indigo-900/20 rounded-lg border border-indigo-700">
                  <p className="body-text text-sm italic">
                    "books are the quietest and most constant of friends"
                  </p>
                </div>
              </div>

              <div className="interactive-card p-8">
                <h3 className="section-heading text-xl mb-6">what color combinations do you absolutely hate?</h3>
                <p className="body-text leading-relaxed">
                  mustard yellow and brown together makes me physically uncomfortable. it's like someone tried to create 
                  the most depressing color palette possible. also, bright orange with hot pink feels like my eyes are being 
                  assaulted by a neon sign. but weirdly, i love both colors separately. it's just something about them together 
                  that triggers my fight or flight response.
                </p>
                <div className="mt-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-700">
                  <p className="body-text text-sm italic">
                    "color theory is just psychology disguised as art"
                  </p>
                </div>
              </div>

              <div className="interactive-card p-8">
                <h3 className="section-heading text-xl mb-6">what's something you think is weird but actually makes perfect sense?</h3>
                <p className="body-text leading-relaxed">
                  the fact that we spend 8 hours a day staring at screens, then come home and immediately grab our phones 
                  to scroll through more screens. it's like we're training ourselves to be digital creatures. but then i realize 
                  that's exactly what's happening - we're evolving to process information differently. our brains are literally 
                  rewiring to handle the digital world. so maybe it's not weird at all, just evolution in real-time.
                </p>
                <div className="mt-4 p-4 bg-green-900/20 rounded-lg border border-green-700">
                  <p className="body-text text-sm italic">
                    "weird is just normal that hasn't caught up yet"
                  </p>
                </div>
              </div>

              <div className="interactive-card p-8">
                <h3 className="section-heading text-xl mb-6">what's a useless skill you have that's actually kind of impressive?</h3>
                <p className="body-text leading-relaxed">
                  i can remember song lyrics from years ago but forget what i ate for breakfast. it's like my brain has 
                  a separate hard drive just for music. also, i can spot typos from a mile away and predict what song 
                  will play next on shuffle with scary accuracy. my brain is just weird about patterns and letters.
                </p>
                <div className="mt-4 p-4 bg-pink-900/20 rounded-lg border border-pink-700">
                  <p className="body-text text-sm italic">
                    "useless skills are the best conversation starters"
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Statement */}
            <div className="text-center mt-16 p-8">
              <p className="body-text text-lg text-slate-300">
                have unanswered questions? feel free to reach out at{' '}
                <a href="mailto:krrishapatel26@gmail.com" className="text-blue-400 hover:text-blue-300 transition-colors">
                  krrishapatel26@gmail.com
                </a>
              </p>
            </div>

            {/* Interactive 3D Cube */}
            <div className="mt-20 flex justify-center">
              <div className="cube-container">
                <div
                  className="rotating-cube"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onClick={handleGeometricInteraction}
                  style={{
                    transform: `rotateX(${geometricRotationX}deg) rotateY(${geometricRotationY}deg) rotateZ(${geometricRotationZ}deg)`,
                    transition: isGeometricSpinning ? 'transform 3s ease-in-out' : 'transform 0.1s ease-out',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                >
                  <div className="cube-face front"></div>
                  <div className="cube-face back"></div>
                  <div className="cube-face right"></div>
                  <div className="cube-face left"></div>
                  <div className="cube-face top"></div>
                  <div className="cube-face bottom"></div>
                </div>
                <p className="text-center text-slate-400 mt-4 text-sm">drag to rotate • click to spin • hover to glow</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Blog Modal */}
      {selectedBlog && (
        <div className="blog-modal" onClick={() => setSelectedBlog(null)}>
          <div 
            className="blog-content cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBlog(null);
            }}
          >
            <button 
              className="close-btn" 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBlog(null);
              }}
            >
              ×
            </button>
            {selectedBlog === 'ai-context' && (
              <div>
                <h2 className="section-heading text-3xl mb-6">the art of building ai that actually understands context</h2>
                <div className="body-text space-y-4">
                  <p>
                    after spending months building LLM pipelines that sounded great in theory but failed spectacularly in practice, 
                    i've learned that the key isn't just throwing more compute at the problem. it's about understanding that AI is 
                    fundamentally a human problem, not a technical one.
                  </p>
                  <p>
                    the breakthrough came when i stopped thinking about AI as a black box that processes text and started thinking 
                    about it as a conversation partner. real conversations have context, memory, and understanding. they build on 
                    previous exchanges and adapt to the person you're talking to.
                  </p>
                  <p>
                    so i redesigned the entire pipeline around conversation flow rather than isolated prompts. instead of sending 
                    each query as a standalone request, i built a context window that maintains conversation history, user preferences, 
                    and even emotional state. suddenly, the AI started responding like it actually remembered what we talked about 
                    five minutes ago.
                  </p>
                  <p>
                    the funny thing is, this approach actually uses less compute than the brute-force method. by being smarter about 
                    context, we can be more efficient with resources. it's like the difference between having a meaningful conversation 
                    with someone who's actually listening versus talking to someone who's just waiting for their turn to speak.
                  </p>
                  <p>
                    the lesson? sometimes the most elegant solution isn't the most complex one. it's the one that understands 
                    the fundamental nature of what you're trying to build.
                  </p>
                </div>
              </div>
            )}
            {selectedBlog === 'edge-computing' && (
              <div>
                <h2 className="section-heading text-3xl mb-6">why i'm obsessed with edge computing</h2>
                <div className="body-text space-y-4">
                  <p>
                    there's something magical about running complex ML models on devices that fit in your pocket. 
                    it's like having a supercomputer in your backpack. but the real beauty isn't the technology—it's 
                    the democratization of AI.
                  </p>
                  <p>
                    suddenly, anyone can build intelligent applications without needing a massive cloud budget. 
                    a student in their dorm room can create an AI-powered photo editor that runs entirely on their phone. 
                    a small business can deploy computer vision for quality control without worrying about internet connectivity.
                  </p>
                  <p>
                    i've been experimenting with edge deployment for medical AI applications, and the results are mind-blowing. 
                    we can now run sophisticated diagnostic models on devices that cost less than $100, making healthcare 
                    technology accessible to communities that previously couldn't afford it.
                  </p>
                  <p>
                    the challenges are fascinating too. how do you compress a model that's 10GB down to 50MB without losing accuracy? 
                    how do you handle the limited memory and processing power of edge devices? it's like solving a puzzle where 
                    every constraint makes the solution more elegant.
                  </p>
                  <p>
                    edge computing isn't just about making things faster or cheaper. it's about making AI truly ubiquitous, 
                    embedded in every device around us, working seamlessly in the background to make our lives better.
                  </p>
                </div>
              </div>
            )}
            {selectedBlog === 'financial-modeling' && (
              <div>
                <h2 className="section-heading text-3xl mb-6">The Hidden Beauty of Financial Modeling</h2>
                <div className="body-text space-y-4">
                  <p>
                    most people think financial modeling is just about spreadsheets and numbers. but when you really dive deep, 
                    you realize it's actually a form of storytelling. every assumption, every projection, every scenario analysis 
                    is a narrative about how the future might unfold.
                  </p>
                  <p>
                    and like any good story, the best models reveal hidden truths about human behavior and market psychology. 
                    why do people buy certain stocks? how do they react to market volatility? what drives their investment decisions? 
                    these aren't just mathematical problems—they're windows into human nature.
                  </p>
                  <p>
                    i've been building models that incorporate behavioral economics, trying to predict not just what will happen 
                    in the market, but how people will react to it. it's fascinating to see how fear, greed, and herd mentality 
                    can completely change market dynamics.
                  </p>
                  <p>
                    the most beautiful models are the ones that capture the complexity of human behavior while remaining elegant 
                    and understandable. it's like writing a novel where every character has their own motivations, but the plot 
                    still makes perfect sense.
                  </p>
                  <p>
                    financial modeling taught me that the best predictions come from understanding people, not just numbers. 
                    the models are just the tools we use to tell the story.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Work Modal */}
      {selectedWork && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div 
            className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative border border-slate-700 cursor-pointer"
            onClick={() => setSelectedWork(null)}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedWork(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl font-bold hover:scale-110 transition-transform"
            >
              ✕
            </button>
            
            {selectedWork === 'aws' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Amazon Web Services - Software Development Engineer Intern</h2>
                <div className="text-sm text-slate-400 mb-6">Infrastructure Supply Chain Management • Summer 2026</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Architected Java/TypeScript malware scanner for data center procurement</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Secured supplier document intake across 12 global AWS regions</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Engineered serverless Lambda and Fargate document scanning pipelines</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Automated supplier scanning workflows across enterprise procurement</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Provisioned infrastructure as code with AWS CDK for repeatable deploys</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Optimized JVM artifacts, cutting package size 45% from 287MB to 159MB</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Eliminated 90-minute delays by redesigning asynchronous SQS workflows</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Restored CloudWatch monitoring and alarms across the scanning service</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedWork === 'very-good-ventures' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Very Good Ventures - Software Engineering Intern</h2>
                <div className="text-sm text-slate-400 mb-6">Dec 2024 - Present</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built end-to-end AI pipeline processing 10,000+ race data points per second using Python and TensorFlow</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented real-time decision engine reducing strategy calculation time from 45 seconds to 12 seconds</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Developed Flutter mobile app with offline-first architecture, reducing sync latency by 35%</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Created automated testing suite covering 90% of codebase, reducing bug reports by 60%</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Led cross-functional team of 5 developers, managing sprint planning and code reviews</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Integrated with NASCAR API for real-time race data and historical performance analytics</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built cloud-native backend using AWS Lambda and DynamoDB for scalable data processing</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Automated financial reporting using Python and AWS, saving $100K+ annually</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Acted as technical program manager for cross-functional AI race analytics tool</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'aha' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Advanced Health Academy (AHA) - Software Engineering Intern</h2>
                <div className="text-sm text-slate-400 mb-6">Nov 2024 - Dec 2024</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <p>Designed and implemented RESTful API architecture handling 50,000+ requests per minute</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <p>Built serverless backend using AWS Lambda and API Gateway, reducing infrastructure costs by 40%</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <p>Developed custom LLM fine-tuned on 100,000+ medical reports achieving 98.4% accuracy</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <p>Implemented real-time data processing pipeline reducing report analysis time from 2 hours to 15 minutes</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <p>Created comprehensive testing framework with 95% code coverage and automated CI/CD pipeline</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <p>Integrated with hospital EMR systems for seamless data flow and patient record access</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <p>Built real-time alerting system for critical medical findings with 99.9% uptime</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'ipmd' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">IPMD Inc. - AI and Machine Learning Developer Intern</h2>
                <div className="text-sm text-slate-400 mb-6">Jun 2021 - Jul 2024</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Led integration of facial and emotional AI for telemedicine platform</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Improved emotional recognition accuracy by 30% using computer vision</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Enhanced ML pipeline efficiency with PyTorch and TensorFlow</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Reduced model training time by 20% through optimization techniques</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Developed user-centric product features for international healthcare providers</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Increased adoption rates among healthcare professionals globally</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'infosys' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Infosys - Software Engineering Intern</h2>
                <div className="text-sm text-slate-400 mb-6">Sep 2024 - Dec 2024</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Engineered cloud-based analytics platform with AWS Bedrock and Azure OpenAI</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Improved customer segmentation by 25% and uncovered $5M+ in revenue opportunities</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Expanded IPA solutions across 3 continents, boosting market reach by 40%</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Integrated RPA solutions, boosting client implementation by 30% and retention by 15%</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Evaluated RPA acquisitions projected to generate $20M+ annually</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-orange-400 mt-1">•</span>
                      <p>Scaled Intelligent Process Automation solutions across multiple client portfolios</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'jane-street' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Jane Street Capital - Academy of Math and Programming Intern</h2>
                <div className="text-sm text-slate-400 mb-6">Jun 2024 - Aug 2024</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Designed algorithmic solutions in game theory and graph theory for quantitative trading</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Achieved top 10 PnL scores in a 6-hour trading challenge, contributing over $9M in profit</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Developed high-frequency algorithms processing 1,000+ data points/sec for market prediction</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented real-time market data analysis and pattern recognition algorithms</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built backtesting frameworks for trading strategy validation and optimization</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Collaborated with senior traders on risk management and portfolio optimization</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'prosthetix' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">ProsthetiX - Lead Researcher, Design and Developer</h2>
                <div className="text-sm text-slate-400 mb-6">Feb 2023 - Jun 2024</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <p>Constructed affordable myoelectric prosthetics using Arduino and Raspberry Pi Pico</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <p>Cut production costs by 50% through innovative design and material selection</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <p>Improved mobility by 20% in clinical simulations and testing</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <p>Spearheaded usability testing and promoted designs to rehabilitation centers</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <p>Resulted in adoption by 3 international rehabilitation centers</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 mt-1">•</span>
                      <p>Developed comprehensive testing protocols for clinical validation</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'goahead-ventures' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">GoAhead Ventures - Venture Capital Analyst</h2>
                <div className="text-sm text-slate-400 mb-6">Sep 2024 - Dec 2024</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <p>Sourced and evaluated 50+ startups for a $180M AUM fund</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <p>Engaged with 300+ CEOs, increasing founder applications by 20%</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <p>Managed a $175M portfolio and conducted due diligence on 15+ startups</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <p>Presented analyses to influence funding decisions and investment strategies</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <p>Leveraged financial modeling and market research to assess growth potential</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <p>Strengthened deal pipeline by qualifying 10% more leads</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'phelps-forward' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Phelps Forward - Program Scholar and Summer Investing Program Participant</h2>
                <div className="text-sm text-slate-400 mb-6">Jan 2025 - Present</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-teal-400 mt-1">•</span>
                      <p>Chosen for selective 3-year financial services career development program</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-teal-400 mt-1">•</span>
                      <p>Participate in 9-week immersive program on financial modeling and analysis</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-teal-400 mt-1">•</span>
                      <p>Analyzing DCF, LBO, and merger models through hands-on projects</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-teal-400 mt-1">•</span>
                      <p>Researched top financial companies and functional areas</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-teal-400 mt-1">•</span>
                      <p>Building relationships with executives and older PF Grads</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-teal-400 mt-1">•</span>
                      <p>Developing leadership skills for financial services industry</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'passion4med' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Passion4Med - Founder & CEO</h2>
                <div className="text-sm text-slate-400 mb-6">Jun 2019 - Dec 2024</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Built global platform of 4,500+ members across multiple countries</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Designed 200+ educational resources for aspiring healthcare professionals</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Partnered with 15+ organizations to expand reach and impact</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Hosted 100+ events with 50,000+ views and engagement</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Managed cross-functional teams of 85+ interns and volunteers</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-pink-400 mt-1">•</span>
                      <p>Organized year-long mentorship programs for 50 high school students</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'metahealth' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">MetaHealth - Founder & CEO</h2>
                <div className="text-sm text-slate-400 mb-6">Jun 2022 - Aug 2024</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <p>Developed app prototype for 60+ users with personalized health tracking</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <p>Offered metabolic syndrome management and monitoring features</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <p>Conducted 20+ workshops on health awareness and prevention</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <p>Raised awareness across 5,000+ social media followers</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <p>Expanded user engagement by 25% through targeted campaigns</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">•</span>
                      <p>Built community of health-conscious individuals and professionals</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedWork === 'microsoft' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Microsoft - Excel Student Ambassador</h2>
                <div className="text-sm text-slate-400 mb-6">Jul 2025 - Present</div>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Promoted Excel adoption via workshops and digital content creation</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Collaborated with student organizations to drive product usage growth</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Encouraged adoption and gathered user feedback for product improvements</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Increased peer engagement through interactive Excel training sessions</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Provided product improvement recommendations based on user feedback</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built community of Excel power users across campus</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div 
            className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative border border-slate-700 cursor-pointer"
            onClick={() => setSelectedProject(null)}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProject(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl font-bold hover:scale-110 transition-transform"
            >
              ✕
            </button>
            
            {selectedProject === 'pgx-record' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Pharmacogenomic Record</h2>
                <div className="text-sm text-slate-400 mb-6">Python • SQLite • PharmCAT • 452 tests</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Your genes change how you metabolize certain drugs. CPIC publishes clinical guidelines for specific
                    drug-gene pairs, and consumer DNA kits technically contain some of the relevant markers. This tool
                    connects the two &mdash; but the interesting engineering is in everything it refuses to say.
                  </p>
                  <p>
                    The central rule is that three answers must never collapse into each other: &ldquo;there is published
                    guidance for this pair,&rdquo; &ldquo;there is no guidance for this pair,&rdquo; and &ldquo;this gene
                    could not be assessed.&rdquo; That third one is the dangerous case. A 23andMe export covers only a
                    fraction of the positions a gene needs, and the calling software assumes reference at every position it
                    can&apos;t see &mdash; so a gene with 1 of 40 positions measured still yields a confident
                    &ldquo;normal metabolizer.&rdquo; That is the most harmful output the software could produce, so
                    partial coverage is reported as indeterminate rather than as a result.
                  </p>
                  <p>
                    Measured against the real reference: of 1,226 positions, 208 carry no rsID and can never be joined from
                    an array at all. A typical export leaves most genes fully uncovered. CYP2D6 &mdash; one of the most
                    clinically important &mdash; is unresolvable from consumer data entirely, because it needs copy-number
                    and structural variation an rsID join cannot detect.
                  </p>
                  <p>
                    A late review found a real defect worth mentioning: coverage was decided by omission, so a gene in none
                    of the coverage sets silently reached &ldquo;called&rdquo; with zero evidence behind it. About twenty
                    test call sites had encoded the same wrong assumption, which is exactly why they didn&apos;t catch it.
                    The fix was requiring full coverage to be proven explicitly rather than inferred from absence.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/Pharmacogenomic-Record"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/Pharmacogenomic-Record ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {selectedProject === 'exchange-simulator' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Exchange Simulator</h2>
                <div className="text-sm text-slate-400 mb-6">C++ • pybind11 • Gymnasium • React</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    A full simulated exchange, built so trading agents have something realistic to learn against. The
                    matching engine is C++ with price-time priority and a zero-allocation hot path, which is what keeps the
                    latency numbers where they are: ~61ns to add an order, ~34ns to cancel, ~118ns for a limit match,
                    8.5M matches/sec. Everything stays under the 1μs target.
                  </p>
                  <p>
                    It supports the order types that make market microstructure interesting rather than just the easy ones
                    &mdash; IOC, FOK, iceberg, stop, pegged &mdash; plus opening and closing auctions.
                  </p>
                  <p>
                    Above the engine: pybind11 bindings expose the full API to Python, a Gymnasium-compliant environment
                    lets you train agents with PPO or SAC, and synthetic order flow is generated with Hawkes processes so
                    you can replay calm, volatile, and flash-crash scenarios. A React dashboard streams the book, trades,
                    and agent PnL live over WebSocket.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/exchange-simulator"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/exchange-simulator ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {selectedProject === 'excel-diff' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Excel Workbook Diff &amp; Tie-Out</h2>
                <div className="text-sm text-slate-400 mb-6">React • TypeScript • SpreadJS ExcelIO</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Two of the most tedious tasks in tax preparation are comparing this year&apos;s workpapers against last
                    year&apos;s, and verifying that the numbers on the filed return actually match the workbook that
                    produced them. Both are done by hand, on deadline, by people who bill by the hour.
                  </p>
                  <p>
                    The diff engine matches sheets by name, normalizes values so formatting noise doesn&apos;t register as a
                    change, and filters by a materiality threshold in dollars &mdash; because a $3 rounding difference is
                    not what anyone is looking for. The interface borrows from code review: side-by-side panes, linked
                    scrolling, keyboard navigation between changes.
                  </p>
                  <p>
                    The reconciliation half checks the PDF return against workbook cells, and handles sign flips, since
                    debits and credits legitimately reverse between the workpaper and the form. Everything parses
                    client-side, so no tax document ever leaves the machine.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/excel-diff-tool"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/excel-diff-tool ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {selectedProject === 'doctoapi' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">doctoapi</h2>
                <div className="text-sm text-slate-400 mb-6">Python • FastAPI • LLMs</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Upload a document, get a typed REST API over the data inside it. The alternatives are all worse in a
                    specific way: manual entry is slow and error-prone, enterprise document AI is heavy to set up, and
                    hand-written regex parsers break the moment a vendor changes their invoice layout.
                  </p>
                  <p>
                    Instead of asking you to define a template up front, it infers the schema from the document, then
                    extracts against it. That ordering is the whole point &mdash; it&apos;s what lets the same endpoint
                    handle invoices, contracts, resumes, and medical forms without per-format configuration.
                  </p>
                  <p>Also shipped with ragchat, a companion project for asking questions across uploaded PDFs and getting answers with citations, running entirely on a local LLM via Ollama and ChromaDB.</p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/doctoapi"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/doctoapi ↗
                    </a>
                    <span className="text-slate-500 text-sm"> · </span>
                    <a
                      href="https://github.com/krrishapatel/ragchat"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      ragchat ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {selectedProject === 'open-source' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Open Source Contributions</h2>
                <div className="text-sm text-slate-400 mb-6">Pull requests currently under review</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Fixing narrow bugs in large codebases I didn&apos;t write. The work is mostly reading &mdash; finding
                    where a project&apos;s own conventions say the fix belongs, then making the smallest change that closes
                    the gap without disturbing anything around it.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p><strong>Starlette</strong> &mdash; TrustedHostMiddleware mis-parsed IPv6 host headers, since splitting on &ldquo;:&rdquo; to strip a port also splits an IPv6 address.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p><strong>Supervisor</strong> &mdash; a multi-byte character split across a buffer boundary crashed decoding; also added the real-time signals (SIGRTMIN..SIGRTMAX) missing from the signal table.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p><strong>OpenTelemetry Python</strong> &mdash; documentation named an environment variable that didn&apos;t match the one the code actually reads.</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">
                    All open and awaiting maintainer review. Upstream review queues move on their own schedule, which is
                    its own lesson in working with other people&apos;s projects.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {selectedProject === 'medical-llm' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Distributed Inference Pipeline for Medical LLMs</h2>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built async LLM inference system with caching and cold-start mitigation</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Deployed using serverless AWS Lambda for scalable processing</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Reached 98.4% interpretation accuracy for medical reports</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Reduced response time by 30% with streaming and rate-limiting layers</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented intelligent caching system for frequently accessed data</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built comprehensive monitoring and alerting for system health</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Integrated with hospital EMR systems for seamless data flow</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Created automated testing pipeline with 95% code coverage</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'equity-forecaster' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Equity Price Forecaster</h2>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built predictive model using macro and firm-level data for S&P 500 forecasting</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Achieved ~92% accuracy over 30-day prediction windows</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Deployed pipeline with Snowflake and Airflow for daily ETL processes</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Visualized forecasts in Tableau for decision-ready insights</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Integrated real-time market data feeds and economic indicators</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built automated model retraining pipeline for continuous improvement</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented risk management and confidence scoring for predictions</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'trading-bot' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Algorithmic Trading Bot</h2>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Developed predictive models for market forecasting with 95% accuracy</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Projected ~$150 PnL/min through optimized trading strategies</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented real-time data pipelines for market data analysis</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built APIs for market data access and strategy execution</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Created comprehensive backtesting framework for strategy validation</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Integrated with multiple exchanges for diversified trading opportunities</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented risk management and position sizing algorithms</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'healthcare-analytics' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Healthcare Analytics Platform</h2>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built comprehensive healthcare analytics platform integrating multiple data sources</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented real-time dashboards for patient insights and monitoring</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Created predictive analytics for early disease detection and prevention</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Integrated with hospital EMR systems and wearable device data</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built machine learning models for patient outcome prediction</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented data visualization using D3.js for intuitive insights</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Created automated reporting system for healthcare providers</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'llm-optimizer' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">LLM-Aware Runtime Optimizer</h2>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Developed custom MLIR passes for transformer model optimization targeting edge devices</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented quantization-aware training pipeline reducing model size by 75%</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built ONNX model rewriting engine for TensorRT compatibility</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Deployed via AWS SageMaker endpoints with auto-scaling</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Created comprehensive benchmarking suite for performance validation</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Integrated with HuggingFace transformers library for model compatibility</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'trading-simulator' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Real-Time AI Trading Simulator</h2>
                <div className="body-text leading-relaxed space-y-4">
                  <h3 className="section-heading text-xl mb-4">Full Project Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Created multithreaded trading engine processing 1,000+ datapoints/sec</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented VWAP logic and limit orders for advanced trading strategies</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Benchmarked PnL performance against S&P and sector indices</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Built real-time data processing pipeline with WebSocket integration</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Implemented event-driven architecture for high-frequency trading</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p>Created comprehensive backtesting framework for strategy validation</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
                  <footer className="fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-700 px-8 py-2">
        <div className="flex justify-between items-center">
          <div className="fancy-k text-xl">
            K
          </div>
          
          <div className="text-sm text-slate-400">
            <div className="flex space-x-8 mb-2">
              <a href="mailto:krrishapatel26@gmail.com" className="nav-link hover:text-blue-400 transition-colors">email</a>
              <a href="https://linkedin.com/in/krrishapatel" target="_blank" rel="noopener noreferrer" className="nav-link hover:text-blue-400 transition-colors">linkedin</a>
              <a href="https://github.com/krrishapatel" target="_blank" rel="noopener noreferrer" className="nav-link hover:text-blue-400 transition-colors">github</a>
            </div>
            <div className="body-text text-xs text-slate-500">
              thanks for stopping by! last updated: august 2026
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
