'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Database,
  Shield,
  Zap,
  CheckCircle,
  FileText,
  Star,
  ChevronRight,
  Play,
  Menu,
  X,
  GitCompare,
  Layers,
  Mic,
  FileSearch,
  SlidersHorizontal,
  ScanSearch,
  Quote,
} from 'lucide-react';
import Button from './ui/Button';

/* ------------------------------------------------------------------ */
/*  Static content — kept out of JSX so the markup stays readable      */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#workflow', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#reviews', label: 'Reviews' },
];

const FEATURES = [
  {
    icon: Database,
    title: 'Private Local Embeddings',
    body: 'Chunks your files into custom dimensions using nomic models locally. High-fidelity JSON database fallback when Chroma is offline.',
  },
  {
    icon: ScanSearch,
    title: 'Pre-Execution Debug Mode',
    body: 'Verify retrieved chunks before they ever reach the model. Re-rank, exclude, or override vector matches manually, then re-run generation.',
  },
  {
    icon: Shield,
    title: 'Zero Leakage Guarantee',
    body: 'Local documents are parsed and queried entirely on your machine. No external server ever receives your proprietary files.',
  },
  {
    icon: GitCompare,
    title: 'Cloud vs. Local Comparison',
    body: 'Run the same prompt through both assistants side by side, so you can see exactly where cloud convenience and local privacy diverge.',
  },
  {
    icon: Layers,
    title: 'Cross-Collection Search',
    body: 'Query multiple document collections at once — results are merged and de-duplicated by similarity score before they reach the model.',
  },
  {
    icon: Mic,
    title: 'Full Voice Loop',
    body: 'Whisper transcription on the way in, natural speech on the way out — dictate a question and hear the answer back.',
  },
];

const PIPELINE_STEPS = [
  { step: '01', title: 'Ingest', body: 'Upload a PDF, DOCX, or Markdown file — it lands in a named collection instantly.' },
  { step: '02', title: 'Chunk & Embed', body: 'Text is split with configurable overlap and embedded locally via nomic-embed-text.' },
  { step: '03', title: 'Retrieve', body: 'A query vector runs a similarity or MMR search across your selected collections.' },
  { step: '04', title: 'Answer, Cited', body: 'Llama 3.2 generates a response with every source chunk and score shown inline.' },
];

const TESTIMONIALS = [
  {
    quote:
      'القدرة على مراجعة نتائج البحث قبل إرسالها للنموذج غيّرت طريقة عملنا بالكامل. أصبحنا نثق في كل إجابة لأننا نرى مصدرها مباشرة.',
    name: 'Ahmed Farouk',
    role: 'AI Research Lead, Cairo',
  },
  {
    quote:
      'أفضل ما يميز إنتليكسيا هو أنني أستطيع تشغيل نفس السؤال محليًا وعبر السحابة في نفس الشاشة، ومقارنة الإجابتين لحظيًا دون أي إعداد إضافي.',
    name: 'Mohamed Nabil',
    role: 'Backend Engineer',
  },
  {
    quote:
      'وضع البحث المحلي بالكامل مناسب تمامًا لعملنا مع بيانات حساسة. لا حاجة لإرسال أي ملف خارج الجهاز، والنتائج لا تقل دقة عن النماذج السحابية.',
    name: 'Youssef Adel',
    role: 'Data Privacy Consultant',
  },
];

/* ------------------------------------------------------------------ */
/*  Motion variants — shared vocabulary, see design-system SKILL.md    */
/* ------------------------------------------------------------------ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
} as const;

const revealVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
} as const;

/** Two soft blurred orbs drifting slowly — used only on non-data hero/CTA zones. */
function FloatingOrbs({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-accent-violet/20 blur-3xl"
        animate={reduceMotion ? {} : { x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-accent-cyan/15 blur-3xl"
        animate={reduceMotion ? {} : { x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
      />
    </div>
  );
}

/** Custom vector-node illustration standing in for hero photography — brand-native, no stock imagery. */
function RetrievalGraphic() {
  return (
    <svg viewBox="0 0 340 260" className="w-full h-auto" role="img" aria-label="Document retrieval graph">
      <defs>
        <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6E5BFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#33D6C0" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <g stroke="url(#edge)" strokeWidth="1.5" fill="none">
        <path d="M60 190 L170 90" />
        <path d="M170 90 L280 60" />
        <path d="M170 90 L250 170" />
        <path d="M60 190 L140 210" />
        <path d="M140 210 L250 170" />
        <path d="M280 60 L250 170" />
      </g>
      <g>
        <circle cx="170" cy="90" r="10" fill="#6E5BFF" />
        <circle cx="60" cy="190" r="7" fill="#8E97AC" />
        <circle cx="280" cy="60" r="7" fill="#33D6C0" />
        <circle cx="250" cy="170" r="8" fill="#6E5BFF" fillOpacity="0.7" />
        <circle cx="140" cy="210" r="6" fill="#8E97AC" />
      </g>
      <g fontFamily="ui-monospace, monospace" fontSize="9" fill="#8E97AC">
        <text x="176" y="86">0.92</text>
        <text x="66" y="184">0.71</text>
        <text x="256" y="164">0.85</text>
      </g>
    </svg>
  );
}

export default function LandingView() {
  const router = useRouter();
  const theme = useSelector((state: RootState) => state.ui.theme);
  const reduceMotion = useReducedMotion() ?? false;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [activeReview, setActiveReview] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setActiveReview((i) => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const go = (view: string) => {
    setIsMobileMenuOpen(false);
    router.push('/dashboard');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-surface-0 scrollbar-thin text-text-primary transition-colors duration-300">
      {/* 1. NAVIGATION HEADER */}
      <header className="border-b border-border-hairline bg-surface-1/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="h-8.5 w-8.5 rounded-xl bg-accent-violet flex items-center justify-center text-white font-sans font-extrabold text-base shadow-sm">
              I
            </div>
            <span className="text-sm font-extrabold tracking-tight text-text-primary font-sans">Intellexa</span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-text-muted">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-text-primary transition-colors">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => go('dashboard')}
              className="hidden sm:flex items-center gap-1.5 font-bold"
            >
              Launch Workbench <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <button
              className="md:hidden h-9 w-9 rounded-lg border border-border-hairline flex items-center justify-center text-text-primary"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-border-hairline bg-surface-1"
            >
              <div className="px-6 py-4 flex flex-col gap-4 text-xs font-semibold text-text-muted">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <Button variant="primary" size="sm" onClick={() => go('dashboard')} className="w-full justify-center">
                  Launch Workbench
                </Button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* 2. HERO SECTION — floating ambient orbs allowed here (no dense data on this screen) */}
      <section className="relative py-16 lg:py-24 max-w-7xl mx-auto px-6 overflow-hidden">
        <FloatingOrbs reduceMotion={reduceMotion} />
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="lg:col-span-7 space-y-6 text-left">
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-violet/10 border border-accent-violet/20 text-[10px] font-bold text-accent-violet uppercase tracking-wide"
            >
              Hybrid Local-First RAG
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-text-primary">
              One Workbench. <br />
              <span className="text-accent-violet">Cloud Speed or Local Privacy.</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-xl font-normal">
              A clean, high-contrast workspace for researchers and developers. Store vectors locally with a file-based
              fallback, generate embeddings offline, or run inference against hosted cloud models — switch per task,
              never per tool.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 pt-2">
              <Button variant="primary" size="md" onClick={() => go('dashboard')} className="flex items-center gap-2 font-bold">
                Launch Workspace <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                onClick={() => go('local')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-hairline bg-surface-1 text-xs font-bold text-text-primary hover:bg-surface-2 transition-all"
              >
                <Play className="h-3.5 w-3.5 text-accent-violet" /> Watch Demo
              </button>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full bg-accent-violet flex items-center justify-center text-[10px] text-white font-bold border-2 border-surface-1">A</div>
                <div className="h-7 w-7 rounded-full bg-text-muted flex items-center justify-center text-[10px] text-white font-bold border-2 border-surface-1">M</div>
                <div className="h-7 w-7 rounded-full bg-surface-3 flex items-center justify-center text-[10px] text-white font-bold border-2 border-surface-1">Y</div>
              </div>
              <span className="text-[11px] text-text-muted font-medium">
                Trusted by <strong className="text-text-primary">1,000+ researchers and developers</strong> for speed and absolute privacy.
              </span>
            </motion.div>
          </motion.div>

          {/* Right visual: telemetry card + custom SVG illustration + floating badge */}
          <div className="lg:col-span-5 relative flex justify-center">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              whileHover={reduceMotion ? undefined : { y: -4 }}
              className="relative w-full max-w-[380px] bg-surface-1 border border-border-hairline rounded-2xl p-6 shadow-md flex flex-col gap-5"
            >
              <div className="flex justify-between items-center pb-3.5 border-b border-border-hairline">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest font-bold">Workspace Core</span>
                <span className="text-[9px] font-mono text-accent-violet font-bold bg-accent-violet/10 border border-accent-violet/20 px-2.5 py-0.5 rounded-full">
                  Secure Engine
                </span>
              </div>

              <RetrievalGraphic />

              <div className="space-y-3">
                <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border-hairline bg-surface-2/40">
                  <FileText className="h-5 w-5 text-accent-violet shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-text-primary block truncate">local_dataset_evaluation.pdf</span>
                    <span className="text-[9px] font-mono text-text-muted block mt-0.5">124 chunks parsed · 100% indexed</span>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-accent-violet animate-pulse shrink-0" />
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border-hairline bg-surface-2/40">
                  <Database className="h-5 w-5 text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-text-primary block">Similarity Search Result</span>
                    <span className="text-[9px] font-mono text-text-muted block mt-0.5">MMR strategy · cosine distance metric</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-text-primary shrink-0">0.82</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-hairline">
                <div className="p-3 rounded-xl bg-surface-2/30 border border-border-hairline/60">
                  <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider font-mono">Retrieval</span>
                  <span className="text-sm font-extrabold text-text-primary block font-mono mt-1">12 ms</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-2/30 border border-border-hairline/60">
                  <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider font-mono">Inference</span>
                  <span className="text-sm font-extrabold text-text-primary block font-mono mt-1">Llama 3.2</span>
                </div>
              </div>
            </motion.div>

            {/* floating badge, E-Studio style */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              className="hidden md:flex absolute -bottom-5 -left-6 items-center gap-2 bg-surface-1 border border-border-hairline rounded-xl px-4 py-2.5 shadow-lg"
            >
              <CheckCircle className="h-4 w-4 text-accent-cyan" />
              <div className="leading-tight">
                <span className="text-[11px] font-bold text-text-primary block">Zero data leaves this device</span>
                <span className="text-[9px] text-text-muted font-mono">Local mode active</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. PARTNERS / COMPATIBILITY BAR */}
      <section className="border-y border-border-hairline bg-surface-1/40 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono block mb-5">
            Compatible Local &amp; Cloud Engines
          </span>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-40 font-mono text-xs font-bold text-text-muted">
            <span>OLLAMA</span>
            <span>HUGGING FACE</span>
            <span>CHROMADB</span>
            <span>NEXT.JS</span>
            <span>NESTJS</span>
          </div>
        </div>
      </section>

      {/* 4. FEATURES GRID — scroll-triggered stagger reveal */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6 space-y-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={revealVariants}
          className="text-center max-w-xl mx-auto space-y-2"
        >
          <span className="text-[10px] font-bold text-accent-violet uppercase tracking-widest font-mono">Engine Overview</span>
          <h2 className="text-2xl font-bold text-text-primary leading-tight">Get Complete Control Over Your Knowledge Base</h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Intellexa runs in a dual mode, letting you swap between an offline vector database and hosted cloud endpoints
            without changing how you work.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              variants={itemVariants}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              className="p-6 rounded-xl border border-border-hairline bg-surface-1 hover:border-accent-violet/30 transition-all duration-300 space-y-4"
            >
              <div className="h-9 w-9 rounded-lg bg-accent-violet/10 border border-accent-violet/20 flex items-center justify-center text-accent-violet">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-xs font-bold text-text-primary block">{title}</span>
              <p className="text-xs text-text-muted leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* 5. RAG PIPELINE — a real ordered sequence, so numbered steps encode true information */}
      <section className="py-16 border-t border-border-hairline bg-surface-1/20">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={revealVariants}
            className="text-center max-w-xl mx-auto space-y-2"
          >
            <span className="text-[10px] font-bold text-accent-violet uppercase tracking-widest font-mono">The Pipeline</span>
            <h2 className="text-2xl font-bold text-text-primary leading-tight">From Upload to Cited Answer</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {PIPELINE_STEPS.map((s, i) => (
              <motion.div key={s.step} variants={itemVariants} className="relative space-y-3">
                <span className="text-3xl font-extrabold text-accent-violet/25 font-mono">{s.step}</span>
                <h3 className="text-sm font-bold text-text-primary">{s.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{s.body}</p>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-4 -right-3 w-6 h-px bg-border-hairline" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 6. WORKFLOW / TRACE ANALYTICS DEEP DIVE — signature retrieval-trace moment */}
      <section id="workflow" className="py-16 border-t border-border-hairline">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 relative flex justify-center"
          >
            <div className="relative w-full max-w-[340px] bg-surface-1 border border-border-hairline rounded-2xl p-5 shadow-xs flex flex-col gap-4">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">Trace Analytics</span>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-text-muted">MMR Relevance</span>
                  <span className="text-accent-violet font-bold">92%</span>
                </div>
                <div className="w-full h-1 bg-surface-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent-violet rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '92%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-text-muted">Similarity Score</span>
                  <span className="text-text-primary font-bold">87%</span>
                </div>
                <div className="w-full h-1 bg-surface-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-text-primary rounded-full opacity-80"
                    initial={{ width: 0 }}
                    whileInView={{ width: '87%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border-hairline">
                {[0, 1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    className="h-2 w-2 rounded-full bg-accent-violet"
                    style={{ opacity: 0.4 + i * 0.2 }}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.08, type: 'spring', stiffness: 300, damping: 20 }}
                  />
                ))}
                <span className="text-[9px] font-mono text-text-muted ml-1">4 chunks retrieved</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={revealVariants}
            className="lg:col-span-7 space-y-6 text-left"
          >
            <span className="text-[10px] font-bold text-accent-violet uppercase tracking-widest font-mono">Interactive Telemetry</span>
            <h3 className="text-2xl font-bold text-text-primary leading-tight">Trace Every Vector Match with Precision</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Hover any dot in the retrieval trace strip above a Local Assistant answer to see the source excerpt,
              similarity score, and a direct jump to the document it came from.
            </p>
            <ul className="space-y-2 text-xs font-semibold text-text-primary">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-accent-violet shrink-0" /> Determinate progress rings during indexing
              </li>
              <li className="flex items-center gap-2">
                <SlidersHorizontal className="h-4.5 w-4.5 text-accent-violet shrink-0" /> Fast MMR re-ranking, tunable per query
              </li>
              <li className="flex items-center gap-2">
                <FileSearch className="h-4.5 w-4.5 text-accent-violet shrink-0" /> Full speech-to-text integration via Whisper
              </li>
            </ul>
            <Button variant="secondary" onClick={() => go('dashboard')}>
              Explore Workbench
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 7. PRICING */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-6 space-y-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={revealVariants}
          className="text-center max-w-xl mx-auto space-y-2"
        >
          <span className="text-[10px] font-bold text-accent-violet uppercase tracking-widest font-mono">Flexible Plans</span>
          <h2 className="text-2xl font-bold text-text-primary">Pricing Plans</h2>
          <p className="text-xs text-text-muted">Choose the configuration that matches your development requirements.</p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto items-stretch"
        >
          <motion.div variants={itemVariants} className="p-6 rounded-xl border border-border-hairline bg-surface-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">Local Core</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-text-primary">$0</span>
                <span className="text-[10px] text-text-muted font-mono uppercase">/ permanent</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">Connect your offline Ollama and parse files locally. Perfect for absolute security.</p>
              <ul className="space-y-2 text-[11px] text-text-muted font-medium pt-2 border-t border-border-hairline">
                <li>✔ Local database index</li>
                <li>✔ ChromaDB support</li>
                <li>✔ MMR search logic</li>
              </ul>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => go('dashboard')}>
              Get Started
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            className="p-6 rounded-xl bg-accent-violet text-white flex flex-col justify-between space-y-6 relative shadow-lg"
          >
            <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-white text-[9px] font-bold text-accent-violet uppercase tracking-wider font-mono">
              Recommended
            </div>
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest font-mono">Standard Pro</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white">$49</span>
                <span className="text-[10px] text-white/70 font-mono uppercase">/ month</span>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                Scale your RAG workflow using HuggingFace cloud completion endpoints and voice transcription.
              </p>
              <ul className="space-y-2 text-[11px] text-white/80 font-medium pt-2 border-t border-white/20">
                <li>✔ Includes Local Core features</li>
                <li>✔ Whisper dictation support</li>
                <li>✔ FLUX image generation</li>
                <li>✔ Pre-execution evaluation</li>
              </ul>
            </div>
            <button
              onClick={() => go('dashboard')}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-white text-accent-violet hover:bg-slate-50 transition-all shadow-sm"
            >
              Choose Plan
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="p-6 rounded-xl border border-border-hairline bg-surface-1 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono">Enterprise</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-text-primary">$159</span>
                <span className="text-[10px] text-text-muted font-mono uppercase">/ month</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Fully managed private endpoints, dedicated cloud servers, and advanced custom chunking setups.
              </p>
              <ul className="space-y-2 text-[11px] text-text-muted font-medium pt-2 border-t border-border-hairline">
                <li>✔ Custom endpoint support</li>
                <li>✔ Active Directory integration</li>
                <li>✔ Premium SLA support</li>
              </ul>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => go('dashboard')}>
              Contact Us
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* 8. REVIEWS — quotes in Arabic, names/roles in English, auto-rotating carousel */}
      <section id="reviews" className="py-16 border-t border-border-hairline bg-surface-1/40">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={revealVariants}
            className="lg:col-span-5 space-y-3 text-left"
          >
            <span className="text-[10px] font-bold text-accent-violet uppercase tracking-widest font-mono">Researcher Voices</span>
            <h3 className="text-2xl font-bold text-text-primary">Trusted by Researchers and Developers</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Intellexa helps technical teams review retrieval settings and adjust document context with complete flexibility.
            </p>
            <div className="flex items-center gap-1.5 pt-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveReview(i)}
                  className={`h-1.5 rounded-full transition-all ${i === activeReview ? 'w-6 bg-accent-violet' : 'w-1.5 bg-border-hairline'}`}
                  aria-label={`Show review ${i + 1}`}
                />
              ))}
            </div>
          </motion.div>

          <div className="lg:col-span-7 relative min-h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeReview}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="p-6 rounded-xl border border-border-hairline bg-surface-1 shadow-xs space-y-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-accent-amber">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <Quote className="h-5 w-5 text-accent-violet/30" />
                </div>
                <p dir="rtl" className="text-sm text-text-primary leading-relaxed font-medium text-right">
                  {TESTIMONIALS[activeReview].quote}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-8.5 w-8.5 rounded-full bg-accent-violet flex items-center justify-center text-xs text-white font-bold font-mono">
                    {TESTIMONIALS[activeReview].name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text-primary block">{TESTIMONIALS[activeReview].name}</span>
                    <span className="text-[9px] text-text-muted block">{TESTIMONIALS[activeReview].role}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 9. CLOSING CTA — floating orbs allowed again, no data density here */}
      <section className="relative py-20 border-t border-border-hairline overflow-hidden">
        <FloatingOrbs reduceMotion={reduceMotion} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={revealVariants}
          className="relative max-w-2xl mx-auto px-6 text-center space-y-6"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary leading-tight">
            Bring Your Own Documents. Choose Your Own Trust Model.
          </h2>
          <p className="text-xs text-text-muted leading-relaxed max-w-lg mx-auto">
            Start free with the fully local core, or scale up to cloud completion whenever a task calls for it.
          </p>
          <Button variant="primary" size="md" onClick={() => go('dashboard')} className="inline-flex items-center gap-2 font-bold">
            Launch Workspace <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </section>

      {/* 10. FOOTER */}
      <footer className="border-t border-border-hairline bg-surface-2 py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-left">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-accent-violet flex items-center justify-center text-white font-sans font-extrabold text-sm shadow">
                I
              </div>
              <span className="text-sm font-extrabold tracking-tight text-text-primary">Intellexa</span>
            </div>
            <p className="text-text-muted leading-normal max-w-[200px]">
              Hybrid local-first workspace for cognitive document retrieval and RAG engineering.
            </p>
          </div>

          <div className="space-y-2.5">
            <span className="font-bold text-text-primary block font-mono text-[10px] uppercase">Workbench</span>
            <ul className="space-y-1.5 text-text-muted">
              <li><button onClick={() => go('dashboard')} className="hover:underline">Dashboard</button></li>
              <li><button onClick={() => go('local')} className="hover:underline">Local Assistant</button></li>
              <li><button onClick={() => go('cloud')} className="hover:underline">Cloud Assistant</button></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <span className="font-bold text-text-primary block font-mono text-[10px] uppercase">Resources</span>
            <ul className="space-y-1.5 text-text-muted">
              <li><button onClick={() => go('documents')} className="hover:underline">Documents Hub</button></li>
              <li><button onClick={() => go('collections')} className="hover:underline">Collections</button></li>
              <li><button onClick={() => go('settings')} className="hover:underline">Settings</button></li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <span className="font-bold text-text-primary block font-mono text-[10px] uppercase">Legal</span>
            <ul className="space-y-1.5 text-text-muted">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Security Guidelines</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 mt-8 border-t border-border-hairline/65 flex justify-between items-center text-[10px] text-text-muted font-mono">
          <span>© 2026 Intellexa Inc. All rights reserved.</span>
          <span>Local-first Workspace</span>
        </div>
      </footer>
    </div>
  );
}