'use client';

import { useState, useEffect, useRef } from 'react';

// Update these coordinates when you move. The distance widget reads from here,
// so this is the only place that needs to change.
const KRRISHA_LOCATION = {
  lat: 39.9526,
  lng: -75.1652,
};

// The boot line typed out before the page renders.
const INTRO_TEXT = '<hello world... :) />';

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
  // Intro overlay: starts hidden so a returning visitor never sees a flash of
  // it before sessionStorage is read. The effect below decides whether to play.
  const [introState, setIntroState] = useState<'pending' | 'typing' | 'leaving' | 'done'>('pending');
  const [typedCount, setTypedCount] = useState(0);


  // Decide once per browser session whether the intro plays.
  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem('introSeen') === '1';
    } catch {
      // Private mode / storage blocked: fall through and just play it.
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (alreadySeen || reduceMotion) {
      setIntroState('done');
      return;
    }
    setIntroState('typing');
  }, []);

  // Type the line one character at a time, then hold and fade out.
  useEffect(() => {
    if (introState !== 'typing') return;

    if (typedCount < INTRO_TEXT.length) {
      const timer = setTimeout(() => setTypedCount((n) => n + 1), 55);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem('introSeen', '1');
      } catch {
        // Nothing to do; the intro just plays again next load.
      }
      setIntroState('leaving');
    }, 700);
    return () => clearTimeout(timer);
  }, [introState, typedCount]);

  // Unmount the overlay once its fade-out has run.
  useEffect(() => {
    if (introState !== 'leaving') return;
    const timer = setTimeout(() => setIntroState('done'), 400);
    return () => clearTimeout(timer);
  }, [introState]);

  // Let anyone skip it with a click or a key.
  useEffect(() => {
    if (introState !== 'typing') return;
    const skip = () => {
      try {
        sessionStorage.setItem('introSeen', '1');
      } catch {
        // Same as above: harmless if storage is unavailable.
      }
      setIntroState('leaving');
    };
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [introState]);

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



  // Calculate distance from the visitor to KRRISHA_LOCATION (defined at the top of this file).
  // Skipped on phones: the browser's location permission prompt covers the boot intro,
  // and the widget itself is hidden below 768px anyway.
  useEffect(() => {
    const isPhone = window.matchMedia('(max-width: 767px)').matches;
    if (!isPhone && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const krrishaLat = KRRISHA_LOCATION.lat;
        const krrishaLng = KRRISHA_LOCATION.lng;
        
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
      setIsHovering(Boolean(target?.closest?.('a, button, [role="button"], .interactive-card')));
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
            <div className="sticker">✨</div>
            <div className="sticker">💫</div>
            <div className="sticker">🚀</div>
            <div className="sticker">💡</div>
      
      {/* Boot intro: types one line, then hands off to the page */}
      {introState !== 'done' && (
        <div
          className={`intro-overlay ${introState === 'leaving' ? 'intro-leaving' : ''}`}
          role="presentation"
        >
          {introState !== 'pending' && (
            <div className="intro-line">
              <span>{INTRO_TEXT.slice(0, typedCount)}</span>
              <span className="intro-caret" aria-hidden="true" />
            </div>
          )}
        </div>
      )}

      {/* Custom cursor */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className={`custom-cursor ${isHovering ? 'hover' : ''}`}
      />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-700">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-5 md:px-8 py-2">
          <div className="fancy-k">
            K
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-5 lg:space-x-8">
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
              onClick={() => setActiveSection('ventures')}
              className={`nav-link ${activeSection === 'ventures' ? 'active' : ''}`}
            >
              VENTURES
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
            className="md:hidden nav-link text-xl px-3 py-2 -mr-3"
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
                onClick={() => { setActiveSection('ventures'); closeMenu(); }}
                className="block w-full text-left text-lg hover:text-blue-400 nav-link"
              >
                VENTURES
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
              you're <span className="font-bold text-blue-400">{distance}</span> miles from Krrisha!
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
              <main className="pt-28 md:pt-40 pb-32 md:pb-24">
        {/* About Section */}
        {activeSection === 'about' && (
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8 mb-12">
              <div className="headshot shrink-0">
                <img src="/headshot.jpeg" alt="Krrisha Patel" className="w-full h-full rounded-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="main-name text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tighter leading-none mb-8 md:mb-12 flex flex-col md:flex-row md:items-center gap-0 md:gap-10">
                  Krrisha Patel
                  <span className="text-2xl md:text-3xl font-medium">
                    <span className="rotating-word" data-words="dreamer,doer,innovator"></span>
                  </span>
                </div>
                <div className="body-text text-xl md:text-2xl leading-relaxed max-w-4xl">
                  cs, finance & stats @ upenn m&t, focused on ai, ml, and healthcare tech. building tools 
                  to solve real-world problems. outside of coding, i'm into origami engineering, oil painting, 
                  tennis, swimming, exploring new dessert spots &amp; always looking for creative side projects.
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
                  building tooling for AWS data center procurement, exploring the intersection of 
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
          <div className="max-w-6xl mx-auto px-5 md:px-8">
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
                    <h3 className="section-heading text-2xl">Amazon Web Services</h3>
                    <span className="text-sm text-slate-400 bg-orange-900/50 px-3 py-1 rounded-full">Jun 2026 - Aug 2026</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Software Development Engineer Intern</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">Very Good Ventures</h3>
                    <span className="text-sm text-slate-400 bg-blue-900/50 px-3 py-1 rounded-full">Jun 2025 - Aug 2025</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Software Engineering Intern</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">Advanced Health Academy (AHA)</h3>
                    <span className="text-sm text-slate-400 bg-purple-900/50 px-3 py-1 rounded-full">Nov 2024 - Dec 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Software Engineering Intern</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">IPMD Inc.</h3>
                    <span className="text-sm text-slate-400 bg-pink-900/50 px-3 py-1 rounded-full">Jun 2021 - Jul 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">AI and Machine Learning Developer Intern</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">Infosys</h3>
                    <span className="text-sm text-slate-400 bg-orange-900/50 px-3 py-1 rounded-full">Sep 2024 - Dec 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Software Engineering Intern</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">Jane Street Capital</h3>
                    <span className="text-sm text-slate-400 bg-blue-900/50 px-3 py-1 rounded-full">Jun 2024 - Aug 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Academy of Math and Programming Intern</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">ProsthetiX</h3>
                    <span className="text-sm text-slate-400 bg-amber-900/50 px-3 py-1 rounded-full">Feb 2023 - Jun 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Lead Researcher, Design and Developer</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">GoAhead Ventures</h3>
                    <span className="text-sm text-slate-400 bg-green-900/50 px-3 py-1 rounded-full">Sep 2024 - Dec 2024</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Venture Capital Analyst</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">Phelps Forward</h3>
                    <span className="text-sm text-slate-400 bg-teal-900/50 px-3 py-1 rounded-full">Jan 2025 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Program Scholar and Summer Investing Program</p>
                  <p className="body-text mb-3">
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

            {/* School Tab */}
            {activeWorkTab === 'school' && (
              <div className="space-y-8">
                <div className="interactive-card p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="section-heading text-2xl">Girls Into VC Penn Chapter</h3>
                    <span className="text-sm text-slate-400 bg-purple-900/50 px-3 py-1 rounded-full">Sep 2024 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Co-Founder</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">Wharton Undergraduate Healthcare Club</h3>
                    <span className="text-sm text-slate-400 bg-green-900/50 px-3 py-1 rounded-full">Sep 2024 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Incubator Team</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">Wharton Undergraduate Entrepreneurship Club</h3>
                    <span className="text-sm text-slate-400 bg-yellow-900/50 px-3 py-1 rounded-full">Sep 2024 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Pitch Team</p>
                  <p className="body-text mb-3">
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
                    <h3 className="section-heading text-2xl">Product Space @ Penn</h3>
                    <span className="text-sm text-slate-400 bg-orange-900/50 px-3 py-1 rounded-full">Sep 2024 - Present</span>
                  </div>
                  <p className="body-text text-slate-300 mb-2">Product Team</p>
                  <p className="body-text mb-3">
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

        {/* Ventures Section */}
        {activeSection === 'ventures' && (
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <h2 className="section-heading text-5xl mb-12">VENTURES</h2>
            <p className="body-text text-lg mb-12">orgs i founded &amp; ran</p>

            <div className="space-y-8">
              {/* Passion4Med */}
              <article className="venture-card">
                <header className="venture-head">
                  <div className="venture-head-main">
                    <h3 className="section-heading text-2xl">Passion4Med</h3>
                    <p className="body-text text-slate-300 mt-2">Founder &amp; CEO</p>
                  </div>
                  <span className="text-sm text-slate-400 bg-pink-900/50 px-3 py-1 rounded-full whitespace-nowrap">5.5 years</span>
                </header>

                <p className="body-text text-lg venture-lede">
                  A global community connecting students interested in healthcare with the
                  professionals, resources, and mentorship most of them have no way to reach.
                </p>

                <div className="venture-grid">
                  <aside className="venture-rail">
  <div className="venture-stats">
                    <div className="venture-stat">
                      <div className="venture-stat-num">4,500+</div>
                      <div className="venture-stat-label">members</div>
                    </div>
                    <div className="venture-stat">
                      <div className="venture-stat-num">300+</div>
                      <div className="venture-stat-label">resources</div>
                    </div>
                    <div className="venture-stat">
                      <div className="venture-stat-num">50+</div>
                      <div className="venture-stat-label">events</div>
                    </div>
                    <div className="venture-stat">
                      <div className="venture-stat-num">50,000+</div>
                      <div className="venture-stat-label">reached</div>
                    </div>
                  </div>
                  </aside>

                  <div className="venture-col">
  <div className="body-text venture-body">
                    <p>
                      It started during COVID as a Discord server, because my high school was small and
                      almost nobody there was interested in medicine. Within weeks hundreds of strangers
                      across several continents had joined, all asking the same question: how do you
                      actually get into healthcare? The information exists, but it moves through people.
                      If you know a doctor, you know what a competitive application looks like and how to
                      ask for a shadowing placement. If you don&apos;t, you are guessing.
                    </p>
                    <p>
                      So I built what I had needed. I ran the calendar, asked students what they were
                      stuck on, and turned the answers into workshops on the unglamorous mechanics:
                      how to email a doctor asking to shadow, how to fit a hospital volunteer CV on one
                      page, how to read a lab report. One of our first mock interview sessions ran out of
                      my bedroom at midnight while I was still sending reminders and finishing slides.
                    </p>
                    <p>
                      It grew into eight student-run departments: Research, Content, Podcast,
                      Blogging, Project Management, Resource Creation, Engagement, and HR. The
                      students running them decided what Passion4Med became. The Research team
                      published papers bimonthly. Engagement ran virtual shadowing sessions. We built
                      300+ resources spanning medical school, nursing, biotech, and biomedical
                      engineering, partnered with 15+ healthcare organizations, and paired students
                      one-on-one with professionals by shared interest.
                    </p>
                    <p>
                      Running it turned out to be the actual job. At its peak I was managing 85+ interns
                      and volunteers across time zones, which meant writing role descriptions, building
                      onboarding, and learning that a volunteer team falls apart quietly when nobody
                      feels ownership of anything.
                    </p>
                    <p>
                      A student in rural Montana had nearly given up on healthcare because the only path
                      she knew about was becoming a doctor. Through mentorship she ended up connected
                      to a biomedical engineer working on prosthetics. A first-generation student learned
                      her background wasn&apos;t a liability but a perspective the field was short on.
                      The message I keep coming back to was from a high schooler who said a template we
                      shared was what finally made her confident enough to email a doctor.
                    </p>
                  </div>
                  </div>
                </div>

                <footer className="venture-lesson">
                  <div className="venture-lesson-label">what I took from it</div>
                  <p>
                    Reach is the easiest metric to grow and the easiest one to overvalue. Nothing
                    we shipped worked unless a student asked for it first, and the fifty in
                    one-on-one mentorship got more out of it than the other 4,450 combined.
                  </p>
                </footer>
              </article>

              {/* MetaHealth */}
              <article className="venture-card">
                <header className="venture-head">
                  <div className="venture-head-main">
                    <h3 className="section-heading text-2xl">MetaHealth</h3>
                    <p className="body-text text-slate-300 mt-2">Founder &amp; CEO</p>
                  </div>
                  <span className="text-sm text-slate-400 bg-indigo-900/50 px-3 py-1 rounded-full whitespace-nowrap">2 years</span>
                </header>

                <p className="body-text text-lg venture-lede">
                  Cooking and nutrition workshops built to rebuild people&apos;s relationship with
                  food, without restriction or calorie counting.
                </p>

                <div className="venture-grid">
                  <aside className="venture-rail">
  <div className="venture-stats">
                    <div className="venture-stat">
                      <div className="venture-stat-num">60+</div>
                      <div className="venture-stat-label">participants</div>
                    </div>
                    <div className="venture-stat">
                      <div className="venture-stat-num">20+</div>
                      <div className="venture-stat-label">workshops</div>
                    </div>
                    <div className="venture-stat">
                      <div className="venture-stat-num">2,000+</div>
                      <div className="venture-stat-label">followers</div>
                    </div>
                    <div className="venture-stat">
                      <div className="venture-stat-num">25%</div>
                      <div className="venture-stat-label">engagement lift</div>
                    </div>
                  </div>
                  </aside>

                  <div className="venture-col">
  <div className="body-text venture-body">
                    <p>
                      &ldquo;Did you see how lean her muscles are?&rdquo; a teammate whispered once,
                      watching another girl on our tennis team stretch before a match. Underneath the
                      trophies, I had been noticing for a while how constant self-comparison was wearing
                      down people I cared about. One of my closest teammates was dealing with anorexia
                      and I didn&apos;t know how to help beyond being there.
                    </p>
                    <p>
                      Around the same time I joined Harvard&apos;s STRIPED Initiative, working with
                      researchers, lawyers, and activists studying how diet pills and supplements get
                      marketed to teenagers. Seeing how directly that marketing connects to eating
                      disorders and body image, while watching my teammate live it, is what pushed me
                      to start MetaHealth.
                    </p>
                    <p>
                      I built it around workshops that had nothing to do with restriction: balanced
                      eating, cooking, and the psychology behind body image. 60+ people came through the
                      program across 20+ sessions, and the group was more varied than I expected:
                      aspiring chefs, psychology students, and people who mostly wanted somewhere to
                      talk. A debate about how much seasoning is too much turned into an hour on culture
                      and family food traditions, and that kept happening. Food was the entry point.
                      The conversation underneath it was the real work.
                    </p>
                    <p>
                      I wound MetaHealth down in 2024.
                    </p>
                  </div>
                  </div>
                </div>

                <footer className="venture-lesson">
                  <div className="venture-lesson-label">what I took from it</div>
                  <p>
                    Information alone changes nothing. People came back because the room felt safe,
                    not because the content was good. Health tech is a trust problem before it is
                    ever a data problem.
                  </p>
                </footer>
              </article>
            </div>
          </div>
        )}

        {/* Projects Section */}
        {activeSection === 'projects' && (
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <h2 id="projects-heading" className="section-heading text-5xl mb-12">PROJECTS</h2>
            <p className="body-text text-lg mb-12">technical projects & innovations</p>
            
            {/* Side Menu */}
            <div className="flex gap-4">
              <div className="project-rail-col">
                <div className="project-rail space-y-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Pharmacogenomic Record</h3>
                </div>
                <p className="body-text mb-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Exchange Simulator</h3>
                </div>
                <p className="body-text mb-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Excel Workbook Diff</h3>
                </div>
                <p className="body-text mb-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Doc To Api</h3>
                </div>
                <p className="body-text mb-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Open Source Contributions</h3>
                  <a
                    href="https://github.com/krrishapatel"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-300 hover:text-blue-200 whitespace-nowrap border border-blue-800 rounded px-2 py-2 md:py-1"
                  >
                    github ↗
                  </a>
                </div>
                <p className="body-text mb-3">
                  Open pull requests under review on Starlette, OpenTelemetry Python, and Supervisor: an IPv6 host
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">LLM-Aware Runtime Optimizer</h3>
                </div>
                <p className="body-text mb-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Real-Time AI Trading Simulator</h3>
                </div>
                <p className="body-text mb-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Distributed Inference Pipeline for Medical LLMs</h3>
                </div>
                <p className="body-text mb-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Equity Price Forecaster</h3>
                </div>
                <p className="body-text mb-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Algorithmic Trading Bot</h3>
                </div>
                <p className="body-text mb-3">
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
                <div className="flex justify-between items-start mb-3">
                  <h3 className="section-heading text-2xl">Healthcare Analytics Platform</h3>
                </div>
                <p className="body-text mb-3">
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
              <div className="interactive-card p-6">
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
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <h2 className="section-heading text-5xl mb-12">BLOG</h2>
            <p className="body-text text-lg mb-12">random thoughts & insights</p>
            
            {/* Blog Modal */}
            {selectedBlog && (
              <div
                className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
                onClick={() => setSelectedBlog(null)}
              >
                <div
                  className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 md:p-8 relative border border-slate-700"
                  onClick={(e) => e.stopPropagation()}
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
                  
                  
                  
                  {selectedBlog === 'origami-obsession' && (
                    <div>
                      <h2 className="section-heading text-3xl mb-4">the origami obsession that started with a paper tractor</h2>
                      <div className="text-sm text-slate-400 mb-6">July 20, 2025 • 4 min read</div>
                      <div className="body-text leading-relaxed space-y-4">
                        <p>second grade, show and tell. my classmate pulls out a piece of paper, folds it maybe fifteen times, and suddenly there&apos;s a tractor sitting on his desk. an actual tractor, with wheels and everything, made from one flat square of paper. i remember staring at it like he&apos;d just performed a magic trick.</p>
                        <p>i asked him right there if he could teach me. he showed me a few basic folds during recess, and that was it, i was completely hooked. spent the next few weeks folding everything i could get my hands on. napkins, homework pages i wasn&apos;t supposed to touch, gift wrap. my parents started buying me actual origami paper because i was destroying every piece of paper in the house.</p>
                        <p>what got me wasn&apos;t just that it looked cool. it was the math hiding inside it. every fold had to be precise or the whole structure fell apart. i didn&apos;t have language for it back then, but i was basically doing geometry for fun, angles and symmetry and structural integrity, except it felt like play instead of a worksheet.</p>
                        <p>years later i found an article about how NASA uses origami folding patterns to fit massive structures into tiny rocket compartments, unfolding them perfectly once in space. my brain kind of short circuited. the same folds i&apos;d learned to make a paper tractor were the same principles behind spacecraft engineering. that&apos;s when origami stopped being a hobby and started feeling like an actual gateway into how i think about problems, taking something complex and finding the fold, the exact right sequence of steps that makes it collapse into something simple and functional.</p>
                        <p>i still fold when i&apos;m stuck on a hard problem. something about the repetitive, precise motion helps me think.</p>
                      </div>
                    </div>
                  )}

                  {selectedBlog === 'three-businesses' && (
                    <div>
                      <h2 className="section-heading text-3xl mb-4">what i learned from building 3 businesses before 18</h2>
                      <div className="text-sm text-slate-400 mb-6">July 8, 2025 • 6 min read</div>
                      <div className="body-text leading-relaxed space-y-4">
                        <p>started my first &quot;business&quot; in elementary school selling mini origami school supplies. tiny paper pencil holders, folded boxes, little origami bookmarks shaped like animals, eventually even small folded organizers with compartments for pens. classmates would request custom designs, a pencil holder shaped like their favorite animal, and i&apos;d spend weekends prototyping folds that could actually hold weight without collapsing, which turned out to be way harder than making something that just looked nice sitting still. sold everything for five dollars a piece to kids who thought i was some kind of paper wizard. it wasn&apos;t really a business, i just liked folding things and my classmates liked buying weird stuff, but it taught me something i didn&apos;t appreciate until later: people will pay for things that feel handmade and specific, not just useful.</p>
                        <p>the second thing was in middle school. i built a platform trying to connect high schoolers with university professors for research opportunities. i was convinced this was genius, students needed mentors, professors had knowledge, i&apos;d just connect them. except i completely underestimated how busy professors actually are and how intimidating it feels for a fourteen year old to cold email a phd asking for their time. maybe three professors responded out of five hundred emails. the platform mostly just sat there.</p>
                        <p>the third one actually made real money, weirdly. i used to build elaborate escape rooms in my backyard out of cardboard boxes, yarn, and whatever toys i could sacrifice for the cause, hiding clues under flowerpots and inside shoeboxes. what started as something i did for fun with neighborhood kids eventually turned into an actual thing people paid for. i started charging a couple dollars admission per kid, redesigning the puzzles every few weeks so repeat customers had something new to solve. i had to think constantly about difficulty balance, too easy and kids blew through it and lost interest, too hard and they gave up and wandered off looking for snacks instead. i kept redesigning based on watching real people struggle in real time, which is a skill i didn&apos;t realize i was practicing until years later, debugging actual software and noticing the same instinct kick in: watch where people get stuck, then fix that exact spot, not the spot you assumed would be hard.</p>
                        <p>three completely different scales of building things, but the same lesson kept showing up every time: understand what actually makes something valuable to someone else, not just what feels cool to you.</p>
                      </div>
                    </div>
                  )}

                  {selectedBlog === 'moms-coo' && (
                    <div>
                      <h2 className="section-heading text-3xl mb-4">the summer i became my mom&apos;s unofficial coo</h2>
                      <div className="text-sm text-slate-400 mb-6">June 30, 2025 • 5 min read</div>
                      <div className="body-text leading-relaxed space-y-4">
                        <p>in middle school i noticed my mom&apos;s salon losing regular customers to competitors with slick websites. she kept every appointment in a paper notebook, split between gujarati and english, along with all her inventory counts and expenses scribbled in the margins, because building anything digital had never felt like an option for her.</p>
                        <p>so i appointed myself unofficial coo of a one woman salon, despite not knowing a single line of code or having any real business background.</p>
                        <p>the tech side started first. i spent weeks on youtube tutorials, breaking my laptop&apos;s browser more times than i&apos;d like to admit, until i had something resembling a booking system. but once i was actually looking at her business up close, i couldn&apos;t unsee the other problems.</p>
                        <p>she was reordering hair products whenever she ran out instead of tracking usage, which meant she&apos;d either overbuy and waste money or run out mid appointment and have to reschedule a client. i built a simple inventory tracker so she could see what was actually moving fast versus sitting on a shelf for months.</p>
                        <p>i also sat in when her landlord tried to raise her rent, going through her actual monthly numbers with her beforehand so she&apos;d walk in prepared instead of just accepting whatever he threw out. we ended up negotiating it down.</p>
                        <p>showed her the booking system first, expecting applause. instead she squinted at the screen and asked how her clients, half of whom barely typed in english, were supposed to use it. i&apos;d built the entire thing assuming everyone would book like i did.</p>
                        <p>so i ripped out the forms and rebuilt them bilingual, and did the same thing with the inventory tracker once i realized she needed to log things by product name in her own language, not some generic english label i&apos;d assumed made sense.</p>
                        <p>watching her first online appointment come through, no phone call, no confusion, just a name appearing on the screen, felt disproportionately exciting for something so small. but honestly the inventory system and the rent negotiation taught me just as much. building something isn&apos;t only about writing code. sometimes it&apos;s just sitting with someone&apos;s actual numbers long enough to help them see what they&apos;re already dealing with more clearly.</p>
                      </div>
                    </div>
                  )}

                  {selectedBlog === 'figure-drawing' && (
                    <div>
                      <h2 className="section-heading text-3xl mb-4">the figure drawing workshop that taught me more than any cs class</h2>
                      <div className="text-sm text-slate-400 mb-6">June 18, 2025 • 4 min read</div>
                      <div className="body-text leading-relaxed space-y-4">
                        <p>went to an art studio i&apos;d been attending for five years, but this particular workshop felt different. my art teacher had picked me to join a session with experienced artists from around the state, most of them way older, way more skilled, easels already covered in intricate sketches before i&apos;d even set up mine.</p>
                        <p>the instructor, an artist named mog, came around giving feedback. when he got to me, i&apos;d barely started, hesitant lines, unsure of myself. he studied it for a minute and said &quot;you have the foundation, but there&apos;s hesitancy in your strokes. art is about boldness, trusting your instincts.&quot; i felt even more insecure hearing that.</p>
                        <p>he must&apos;ve seen it on my face because he told me about his own struggles, feeling unsure surrounded by talented artists early on. &quot;there&apos;s only one you,&quot; he said. that stuck with me more than any technical advice could have.</p>
                        <p>i spent the rest of the workshop talking to other artists, asking how they got into it, experimenting with techniques i&apos;d never tried, pushing past feeling like i needed to draw like everyone else in the room. by the end i&apos;d captured the human form with actual confidence instead of copying someone else&apos;s style.</p>
                        <p>what i took from that day wasn&apos;t really about art. it was about asking for help instead of quietly struggling, and understanding that the goal was never to be as good as the person next to me, it was to get better at being specifically myself. i think about that constantly now, especially in engineering, where it&apos;s so easy to compare your messy in-progress work to someone else&apos;s polished final product.</p>
                      </div>
                    </div>
                  )}

                  {selectedBlog === 'head-vs-feet' && (
                    <div>
                      <h2 className="section-heading text-3xl mb-4">the four hour debate about whether our head grows faster than our feet</h2>
                      <div className="text-sm text-slate-400 mb-6">June 5, 2025 • 3 min read</div>
                      <div className="body-text leading-relaxed space-y-4">
                        <p>my brother and i have this ongoing tradition where we debate completely absurd questions until one of us gives up or my grandmother yells at us to go to sleep. last week&apos;s topic: does your head grow faster than your feet.</p>
                        <p>i took the biology angle, citing how bone and muscle development rates change throughout childhood. my brother went full physics, something about center of gravity and relativity that honestly still doesn&apos;t fully make sense to me. we pulled up actual studies. we brought our parents in as judges. nobody won, technically, but we both walked away slightly more informed and significantly more stubborn.</p>
                        <p>this happens constantly in my house. we&apos;ve debated whether cereal is a soup, whether a hot dog is a sandwich, whether time moves differently when you&apos;re bored versus having fun. every single one starts as a joke and somehow turns into an actual research session.</p>
                        <p>i think what i love about it isn&apos;t winning, it&apos;s watching two completely different approaches to the same problem collide. i default to data and studies. my brother defaults to first principles and theory. neither of us is more right, we&apos;re just built to solve problems differently, and honestly some of my favorite ideas have come from these ridiculous late night arguments about nothing that matters at all.</p>
                      </div>
                    </div>
                  )}

                  {selectedBlog === 'bead-collection' && (
                    <div>
                      <h2 className="section-heading text-3xl mb-4">why i collect beads off the floor at every cultural event</h2>
                      <div className="text-sm text-slate-400 mb-6">May 22, 2025 • 3 min read</div>
                      <div className="body-text leading-relaxed space-y-4">
                        <p>i have this habit that confuses literally everyone who knows me. at big cultural gatherings, weddings, festivals, dance performances, i&apos;m the person crouched down scanning the floor for loose beads and crystals that fall off people&apos;s outfits while they&apos;re dancing.</p>
                        <p>it started when i was five, mesmerized by how they caught the light under the party lighting. i started collecting them, just tiny handfuls at a time, and stashing them in an old phone pouch my mom gave me. i have hundreds now, sorted loosely by color, no real system beyond &quot;this one is pretty.&quot;</p>
                        <p>i use them for everything. i&apos;ve glued them onto homemade circuit bracelets, added them to a 3d printed coral reef project, scattered them across a mini wind powered car i built for a physics assignment just because plain metal looked boring. every random engineering project i make somehow ends up slightly more sparkly than it needs to be.</p>
                        <p>my family thinks it&apos;s a little strange that i still do this in college. honestly, i think it&apos;s less about the beads themselves and more about refusing to let any project be purely functional. if i&apos;m going to build something, it might as well also be a little bit beautiful, even if nobody else notices the tiny crystal glued to the corner of a breadboard.</p>
                      </div>
                    </div>
                  )}

                  {selectedBlog === 'linear-b' && (
                    <div>
                      <h2 className="section-heading text-3xl mb-4">the summer i tried to decode a language nobody speaks anymore</h2>
                      <div className="text-sm text-slate-400 mb-6">May 9, 2025 • 3 min read</div>
                      <div className="body-text leading-relaxed space-y-4">
                        <p>got weirdly obsessed with linear b for a few weeks last year, which is this ancient script used in bronze age greece that took decades for actual linguists to decipher. i have no formal training in linguistics whatsoever, i just found it fascinating that people used to communicate in symbols we forgot how to read for thousands of years.</p>
                        <p>spent way too many nights trying to understand the syllabic structure, comparing it to how modern languages encode meaning, basically treating it like a puzzle instead of an academic subject. i wasn&apos;t trying to become an expert, i just liked the process of pattern matching against something genuinely ancient and mysterious.</p>
                        <p>what got me hooked was realizing decipherment is essentially reverse engineering with zero documentation. no api reference, no comments in the code, just thousands of symbols and the assumption that whoever wrote them was trying to communicate something logical. michael ventris, the guy who actually cracked linear b in the 1950s, wasn&apos;t even a professional linguist, he was an architect who treated it like a hobby.</p>
                        <p>i never got anywhere close to actually reading it fluently, but the process taught me something i didn&apos;t expect: sometimes the most interesting problems are the ones with absolutely no practical application, and you solve them purely because not knowing bothers you more than anything else could.</p>
                      </div>
                    </div>
                  )}
                  
                  
                </div>
              </div>
            )}
            
            <div className="space-y-8">




              <div className="interactive-card p-6" onClick={() => setSelectedBlog('origami-obsession')}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-heading text-2xl">the origami obsession that started with a paper tractor</h3>
                  <span className="text-sm text-slate-400 bg-green-900/50 px-3 py-1 rounded-full">July 20, 2025</span>
                </div>
                <p className="body-text leading-relaxed mb-4">
                  second grade, show and tell. my classmate pulls out a piece of paper, folds it maybe fifteen times, and suddenly there&apos;s a tractor sitting on his desk. an actual tractor, with wheels and everything, made from one flat square of paper. i remember staring at it like he&apos;d just performed a magic trick.
                </p>
                <div className="flex items-center text-sm text-slate-400">
                  <span>4 min read</span>
                </div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedBlog('three-businesses')}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-heading text-2xl">what i learned from building 3 businesses before 18</h3>
                  <span className="text-sm text-slate-400 bg-pink-900/50 px-3 py-1 rounded-full">July 8, 2025</span>
                </div>
                <p className="body-text leading-relaxed mb-4">
                  started my first &quot;business&quot; in elementary school selling mini origami school supplies. tiny paper pencil holders, folded boxes, little origami bookmarks shaped like animals, eventually even small folded organizers with compartments for pens. classmates would request custom designs, a pencil holder shaped like their favorite animal, and i&apos;d spend weekends prototyping folds that could actually hold weight without...
                </p>
                <div className="flex items-center text-sm text-slate-400">
                  <span>6 min read</span>
                </div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedBlog('moms-coo')}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-heading text-2xl">the summer i became my mom&apos;s unofficial coo</h3>
                  <span className="text-sm text-slate-400 bg-blue-900/50 px-3 py-1 rounded-full">June 30, 2025</span>
                </div>
                <p className="body-text leading-relaxed mb-4">
                  in middle school i noticed my mom&apos;s salon losing regular customers to competitors with slick websites. she kept every appointment in a paper notebook, split between gujarati and english, along with all her inventory counts and expenses scribbled in the margins, because building anything digital had never felt like an option for her.
                </p>
                <div className="flex items-center text-sm text-slate-400">
                  <span>5 min read</span>
                </div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedBlog('figure-drawing')}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-heading text-2xl">the figure drawing workshop that taught me more than any cs class</h3>
                  <span className="text-sm text-slate-400 bg-purple-900/50 px-3 py-1 rounded-full">June 18, 2025</span>
                </div>
                <p className="body-text leading-relaxed mb-4">
                  went to an art studio i&apos;d been attending for five years, but this particular workshop felt different. my art teacher had picked me to join a session with experienced artists from around the state, most of them way older, way more skilled, easels already covered in intricate sketches before i&apos;d even set up mine.
                </p>
                <div className="flex items-center text-sm text-slate-400">
                  <span>4 min read</span>
                </div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedBlog('head-vs-feet')}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-heading text-2xl">the four hour debate about whether our head grows faster than our feet</h3>
                  <span className="text-sm text-slate-400 bg-amber-900/50 px-3 py-1 rounded-full">June 5, 2025</span>
                </div>
                <p className="body-text leading-relaxed mb-4">
                  my brother and i have this ongoing tradition where we debate completely absurd questions until one of us gives up or my grandmother yells at us to go to sleep. last week&apos;s topic: does your head grow faster than your feet.
                </p>
                <div className="flex items-center text-sm text-slate-400">
                  <span>3 min read</span>
                </div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedBlog('bead-collection')}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-heading text-2xl">why i collect beads off the floor at every cultural event</h3>
                  <span className="text-sm text-slate-400 bg-teal-900/50 px-3 py-1 rounded-full">May 22, 2025</span>
                </div>
                <p className="body-text leading-relaxed mb-4">
                  i have this habit that confuses literally everyone who knows me. at big cultural gatherings, weddings, festivals, dance performances, i&apos;m the person crouched down scanning the floor for loose beads and crystals that fall off people&apos;s outfits while they&apos;re dancing.
                </p>
                <div className="flex items-center text-sm text-slate-400">
                  <span>3 min read</span>
                </div>
              </div>

              <div className="interactive-card p-6" onClick={() => setSelectedBlog('linear-b')}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-heading text-2xl">the summer i tried to decode a language nobody speaks anymore</h3>
                  <span className="text-sm text-slate-400 bg-indigo-900/50 px-3 py-1 rounded-full">May 9, 2025</span>
                </div>
                <p className="body-text leading-relaxed mb-4">
                  got weirdly obsessed with linear b for a few weeks last year, which is this ancient script used in bronze age greece that took decades for actual linguists to decipher. i have no formal training in linguistics whatsoever, i just found it fascinating that people used to communicate in symbols we forgot how to read for thousands of years.
                </p>
                <div className="flex items-center text-sm text-slate-400">
                  <span>3 min read</span>
                </div>
              </div>



            </div>
          </div>
        )}

        {/* FAQ Section */}
        {activeSection === 'faq' && (
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <h2 className="section-heading text-5xl mb-12">FAQ</h2>
            <p className="body-text text-lg mb-12">infrequently asked questions</p>
            
            {/* Subtle Interactive Element */}
            <div className="relative mb-16">
              <div className="subtle-interaction">
                <div className="interaction-dot"></div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">what's the most challenging project you've ever built?</h3>
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

              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">how do you stay creative in such a technical field?</h3>
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

              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">what's your approach to learning new technologies?</h3>
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

              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">what's something you're passionate about that might surprise people?</h3>
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

              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">what books have shaped your thinking?</h3>
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

              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">what color combinations do you absolutely hate?</h3>
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

              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">what's something you think is weird but actually makes perfect sense?</h3>
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

              <div className="interactive-card p-6">
                <h3 className="section-heading text-2xl mb-4">what's a useless skill you have that's actually kind of impressive?</h3>
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


      {/* Work Modal */}
      {selectedWork && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setSelectedWork(null)}
        >
          <div
            className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 md:p-8 relative border border-slate-700"
            onClick={(e) => e.stopPropagation()}
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
                <div className="text-sm text-slate-400 mb-6">Jun 2026 - Aug 2026</div>
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
                <div className="text-sm text-slate-400 mb-6">Jun 2025 - Aug 2025</div>
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
                <h2 className="section-heading text-3xl mb-4">Phelps Forward - Program Scholar and Summer Investing Program</h2>
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
          </div>
        </div>
      )}

      {/* Project Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 md:p-8 relative border border-slate-700"
            onClick={(e) => e.stopPropagation()}
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
                    connects the two, but the interesting engineering is in everything it refuses to say.
                  </p>
                  <p>
                    The central rule is that three answers must never collapse into each other: &ldquo;there is published
                    guidance for this pair,&rdquo; &ldquo;there is no guidance for this pair,&rdquo; and &ldquo;this gene
                    could not be assessed.&rdquo; That third one is the dangerous case. A 23andMe export covers only a
                    fraction of the positions a gene needs, and the calling software assumes reference at every position it
                    can&apos;t see, so a gene with 1 of 40 positions measured still yields a confident
                    &ldquo;normal metabolizer.&rdquo; That is the most harmful output the software could produce, so
                    partial coverage is reported as indeterminate rather than as a result.
                  </p>
                  <p>
                    Measured against the real reference: of 1,226 positions, 208 carry no rsID and can never be joined from
                    an array at all. A typical export leaves most genes fully uncovered. CYP2D6, one of the most
                    clinically important, is unresolvable from consumer data entirely, because it needs copy-number
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
                    (IOC, FOK, iceberg, stop, pegged) plus opening and closing auctions.
                  </p>
                  <p>
                    Above the engine: pybind11 bindings expose the full API to Python, a Gymnasium-compliant environment
                    lets you train agents with PPO or SAC, and synthetic order flow is generated with Hawkes processes so
                    you can replay calm, volatile, and flash-crash scenarios. A React dashboard streams the book, trades,
                    and agent PnL live over WebSocket.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/Exchange-Simulator"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/Exchange-Simulator ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {selectedProject === 'excel-diff' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Excel Workbook Diff</h2>
                <div className="text-sm text-slate-400 mb-6">React • TypeScript • SpreadJS ExcelIO</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Two of the most tedious tasks in tax preparation are comparing this year&apos;s workpapers against last
                    year&apos;s, and verifying that the numbers on the filed return actually match the workbook that
                    produced them. Both are done by hand, on deadline, by people who bill by the hour.
                  </p>
                  <p>
                    The diff engine matches sheets by name, normalizes values so formatting noise doesn&apos;t register as a
                    change, and filters by a materiality threshold in dollars, because a $3 rounding difference is
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
                      href="https://github.com/krrishapatel/Excel-Diff-Tool"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/Excel-Diff-Tool ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {selectedProject === 'doctoapi' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Doc To Api</h2>
                <div className="text-sm text-slate-400 mb-6">Python • FastAPI • LLMs</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Upload a document, get a typed REST API over the data inside it. The alternatives are all worse in a
                    specific way: manual entry is slow and error-prone, enterprise document AI is heavy to set up, and
                    hand-written regex parsers break the moment a vendor changes their invoice layout.
                  </p>
                  <p>
                    Instead of asking you to define a template up front, it infers the schema from the document, then
                    extracts against it. That ordering is the whole point: it&apos;s what lets the same endpoint
                    handle invoices, contracts, resumes, and medical forms without per-format configuration.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/Doc-To-API"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/Doc-To-API ↗
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
                    Fixing narrow bugs in large codebases I didn&apos;t write. The work is mostly reading: finding
                    where a project&apos;s own conventions say the fix belongs, then making the smallest change that closes
                    the gap without disturbing anything around it.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p><strong>Starlette</strong>: TrustedHostMiddleware mis-parsed IPv6 host headers, since splitting on &ldquo;:&rdquo; to strip a port also splits an IPv6 address.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p><strong>Supervisor</strong>: a multi-byte character split across a buffer boundary crashed decoding; also added the real-time signals (SIGRTMIN..SIGRTMAX) missing from the signal table.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <p><strong>OpenTelemetry Python</strong>: documentation named an environment variable that didn&apos;t match the one the code actually reads.</p>
                    </div>
                  </div>
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
                <div className="text-sm text-slate-400 mb-6">Python • FastAPI • AWS Lambda • MongoDB</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Medical report interpretation is bursty. Nothing happens for hours, then a batch arrives and every request is urgent. Provisioning for the peak wastes money and provisioning for the average means the peak times out.
                  </p>
                  <p>
                    Serverless fits that shape, so the pipeline runs async inference on AWS Lambda, with a caching layer for repeated queries and explicit cold-start mitigation, because the first request after a quiet period is exactly the one a clinician is waiting on. Streaming responses and a rate-limiting layer brought response time down 30%.
                  </p>
                  <p>
                    It reached 98.4% interpretation accuracy on the report set, integrates with hospital EMR systems so data does not have to be moved by hand, and ships with monitoring, alerting, and a test pipeline at 95% coverage. In this domain the tests are not about code quality, they are about being able to prove what the system did.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/Ragchat"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/Ragchat ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'equity-forecaster' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Equity Price Forecaster</h2>
                <div className="text-sm text-slate-400 mb-6">Python • SQL • Tableau • Scikit-learn</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Most equity models pick a lane: either macro indicators or company fundamentals. Using both is harder because the data arrives on completely different schedules, monthly releases against quarterly filings against daily prices.
                  </p>
                  <p>
                    The model combines macro and firm-level features to forecast S&P 500 movement over 30-day windows, reaching roughly 92% directional accuracy in testing. Snowflake and Airflow handle the daily ETL, and an automated retraining pipeline keeps the model from slowly decaying as market conditions drift away from whatever it was fit on.
                  </p>
                  <p>
                    Every forecast carries a confidence score, which is the part I care about most. A prediction with no stated uncertainty invites people to act on the ones the model was least sure about. Output goes to Tableau so the result is something a person can read and decide from, rather than a number in a log file.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/Blockhouse-Analysis"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/Blockhouse-Analysis ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'trading-bot' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Algorithmic Trading Bot</h2>
                <div className="text-sm text-slate-400 mb-6">Python • TensorFlow • APIs • Scikit-learn</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    This started as a question about whether short-horizon market movement has any learnable structure at all, and turned into a bot that trades on the answer.
                  </p>
                  <p>
                    The predictive models hit 95% accuracy on the forecasting task and projected around $150 PnL per minute in testing. Real-time data pipelines feed market data in, and a small API layer sits between the models and execution so a strategy can be swapped without touching the plumbing. It connects to multiple exchanges, partly for diversification and partly because pricing disagreements between venues are their own opportunity.
                  </p>
                  <p>
                    The backtesting framework and the position sizing rules are the parts that keep it honest. Accuracy on direction says nothing about whether you survive the trades you get wrong, so risk management and sizing came before any attempt to make the returns bigger.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/IMC-Prosperity2026"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/IMC-Prosperity2026 ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'healthcare-analytics' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Healthcare Analytics Platform</h2>
                <div className="text-sm text-slate-400 mb-6">Python • React • PostgreSQL • D3.js</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Patient data is scattered across EMR systems, lab results, and now wearables, each with its own format and update cadence. The signal that would flag a problem early is usually present, just split across three places nobody looks at together.
                  </p>
                  <p>
                    The platform consolidates those sources and puts real-time dashboards on top, with machine learning models for patient outcome prediction and early disease detection. Visualization is built with D3 rather than a chart library because clinical data needs views that off-the-shelf charts do not have.
                  </p>
                  <p>
                    Automated reporting closes the loop for providers who are not going to log into a dashboard between appointments. The whole design assumption is that an insight nobody sees is not an insight, so getting the result in front of the right person on time mattered more than adding another model.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/Heart-Disease-AI-Platform"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/Heart-Disease-AI-Platform ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'llm-optimizer' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">LLM-Aware Runtime Optimizer</h2>
                <div className="text-sm text-slate-400 mb-6">Python • CUDA • MLIR • TensorRT</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Transformer models are trained in the cloud and then asked to run somewhere much smaller. The gap between those two environments is where most of the latency lives, and generic compiler passes do not know enough about attention to close it.
                  </p>
                  <p>
                    So the optimizer works at the MLIR level with custom passes written specifically for transformer structure, paired with a quantization-aware training pipeline that cuts model size by 75% without pushing the accuracy loss into the range where it matters. An ONNX rewriting engine reshapes the graph into something TensorRT will actually accept, which turned out to be most of the real work.
                  </p>
                  <p>
                    Net effect was 48% lower latency on NVIDIA GPUs. It deploys through SageMaker endpoints with auto-scaling and reads standard HuggingFace checkpoints, so a model does not need to be special to go through it. The benchmarking suite exists because a 48% claim is worthless if you cannot reproduce it on demand.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/LLM-Aware-Runtime-Optimizer"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/LLM-Aware-Runtime-Optimizer ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
            {selectedProject === 'trading-simulator' && (
              <div>
                <h2 className="section-heading text-3xl mb-4">Real-Time AI Trading Simulator</h2>
                <div className="text-sm text-slate-400 mb-6">Python • WebSockets • SQL • Multithreading</div>
                <div className="body-text leading-relaxed space-y-4">
                  <p>
                    Backtesting on daily bars tells you almost nothing about whether a strategy survives contact with a live market. The interesting failures happen at the resolution of individual ticks, in the gap between deciding to trade and the order actually resting.
                  </p>
                  <p>
                    This is a multithreaded engine that handles 1,000+ datapoints per second off live WebSocket feeds, with an event-driven core so the strategy logic reacts to market events rather than polling on a timer. It supports VWAP execution and limit orders, which is the minimum needed before any result is believable.
                  </p>
                  <p>
                    Every run is benchmarked against the S&P and the relevant sector index, because a strategy that made money in a month when everything made money has not proven anything. The backtesting framework runs the same code path as live trading, so there is no separate simulation logic to quietly disagree with reality.
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700">
                    <a
                      href="https://github.com/krrishapatel/Algorithmic-Trading-Simulator"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-300 hover:text-blue-200 text-sm"
                    >
                      github.com/krrishapatel/Algorithmic-Trading-Simulator ↗
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
                  <footer className="fixed bottom-0 left-0 w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-700 py-2">
        <div className="max-w-6xl mx-auto flex justify-end items-center px-5 md:px-8">
          <div className="text-sm text-slate-400">
            <div className="flex space-x-6 md:space-x-8 mb-2">
              <a href="mailto:krrishapatel26@gmail.com" className="nav-link hover:text-blue-400 transition-colors inline-block py-2 md:py-0">email</a>
              <a href="https://linkedin.com/in/krrishapatel" target="_blank" rel="noopener noreferrer" className="nav-link hover:text-blue-400 transition-colors inline-block py-2 md:py-0">linkedin</a>
              <a href="https://github.com/krrishapatel" target="_blank" rel="noopener noreferrer" className="nav-link hover:text-blue-400 transition-colors inline-block py-2 md:py-0">github</a>
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
