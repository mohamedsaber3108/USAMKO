'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ChevronRight, CheckCircle, Menu, X } from 'lucide-react'

const easing = [0.22, 1, 0.36, 1] as const

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [yearly, setYearly] = useState(false)

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0c0c0c] text-white">
      {/* Grain Filter SVG */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id="c3-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
          <feComposite in2="SourceGraphic" operator="in" result="noise" />
          <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
        </filter>
      </svg>

      {/* Background Video (add your own video) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="w-full h-full bg-gradient-to-br from-[#0c0c0c] via-[#1a1a2e] to-[#0c0c0c]" />
      </div>

      {/* Vertical Guide Lines */}
      <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2 -translate-x-[calc(50%+36rem)] w-px bg-white/10 z-[5]" />
      <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2 translate-x-[calc(-50%+36rem)] w-px bg-white/10 z-[5]" />

      {/* Content */}
      <div className="relative z-10">
        {/* Navbar */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easing }}
          className="max-w-6xl mx-auto px-6 py-6"
        >
          <div className="flex items-center justify-between">
            <LogoMark />

            <div className="hidden md:flex items-center gap-8">
              {['Solutions', 'Pricing', 'Blog', 'Docs', 'Careers'].map((item, i) => (
                <motion.a
                  key={item}
                  href="#"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: easing }}
                  className="text-white/70 text-sm font-medium hover:text-white transition-colors"
                >
                  {item}
                </motion.a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: easing }}
            >
              <PrimaryButton label="Try it now" href="/find" />
            </motion.div>

            <button
              className="md:hidden w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </motion.nav>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-28 pb-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: easing }}
            className="text-4xl md:text-7xl font-semibold tracking-tight leading-[0.9]"
          >
            <div className="text-white">Find anyone.</div>
            <div
              className="animate-shiny"
              style={{
                backgroundImage: 'linear-gradient(to right, #091020 0%, #0B2551 12.5%, #A4F4FD 32.5%, #00d2ff 50%, #0B2551 67.5%, #091020 87.5%, #091020 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                filter: 'url(#c3-noise)',
              }}
            >
              Instantly.
            </div>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: easing }}
            className="mt-8 text-white/60 max-w-md mx-auto text-base leading-[1.5]"
          >
            Linkout is the smartest way to find anyone&rsquo;s work email directly from their LinkedIn profile. Powered by AI enrichment and pattern detection, it turns any profile into a verified contact in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: easing }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <PrimaryButton label="Try it now" href="/find" />
            <p className="text-xs text-white/40">Free to try · No signup required</p>
          </motion.div>
        </section>

        {/* macOS Menu Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9, ease: easing }}
          className="w-full h-10 bg-black/40 backdrop-blur-md border-t border-b border-white/10 flex items-center px-6 text-xs text-white/70"
        >
          <span className="mr-4"></span>
          <span className="font-bold mr-6">Linkout</span>
          <span className="hidden sm:inline mr-4">File</span>
          <span className="hidden sm:inline mr-4">Edit</span>
          <span className="hidden md:inline mr-4">View</span>
          <span className="hidden md:inline mr-4">Go</span>
          <span className="hidden lg:inline mr-4">Window</span>
          <span className="hidden lg:inline">Help</span>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden sm:inline">14:23</span>
          </div>
        </motion.div>

        {/* Product Mockup - Simplified */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.1, ease: easing }}
          className="max-w-6xl mx-auto px-6 mt-12 mb-20"
        >
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0e1014]/90 backdrop-blur-2xl">
            {/* Title Bar */}
            <div className="h-10 bg-[#1c1c1e] border-b border-white/10 flex items-center px-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
                <div className="w-3 h-3 rounded-full bg-[#febc2e]"></div>
                <div className="w-3 h-3 rounded-full bg-[#28c840]"></div>
              </div>
              <span className="ml-auto text-xs text-white/70">Linkout — Contact Finder</span>
              <div className="ml-auto w-12"></div>
            </div>
            {/* Mockup Content */}
            <div className="p-8 min-h-[400px] flex items-center justify-center">
              <div className="text-center text-white/60">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] mx-auto mb-4"></div>
                <p className="text-xl font-semibold text-white mb-2">Email Found — 94% Confidence</p>
                <p className="font-mono text-lg">jane.doe@company.com</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Feature Section */}
        <section className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 md:gap-16 items-start">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              <span className="text-sm text-white/70">Extract</span>
              <span className="px-2 py-0.5 rounded-full border border-white/10 text-white/50 text-xs">AI-powered</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.02] mb-6">
              From profile<br />to inbox.
            </h2>
            <p className="text-white/60 mb-6">
              Turn any LinkedIn profile into a verified contact. Our AI-powered enrichment finds emails that traditional scrapers miss.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Enrichment lookup', 'Pattern detection', 'Bulk extraction', 'One-click copy'].map(tag => (
                <span key={tag} className="text-xs text-white/70 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="liquid-glass rounded-2xl p-5 space-y-3">
            {[
              { label: 'Verified', count: 1247, color: '#16A34A' },
              { label: 'Pattern Match', count: 342, color: '#2563EB' },
              { label: 'Pending', count: 89, color: '#D97706' },
              { label: 'Exported', count: 1589, color: '#6C47FF' },
            ].map(item => (
              <div key={item.label} className="liquid-glass rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-white/90">{item.label}</span>
                </div>
                <span className="text-lg font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="c3-pricing-section">
          <div className="c3-watermark-container">
            <div className="c3-watermark-main">
              <span className="c3-watermark-line-1">Find anyone.</span>
              <span className="c3-watermark-line-2">Instantly.</span>
            </div>
          </div>

          <div className="c3-toggle-wrap">
            <span className="text-sm text-white/70">Monthly</span>
            <button
              className={`c3-toggle ${yearly ? 'active' : ''}`}
              onClick={() => setYearly(!yearly)}
            >
              <div className="c3-toggle-knob"></div>
            </button>
            <span className="text-sm text-white/70">Yearly</span>
          </div>

          <div className="c3-grid">
            {[
              {
                tier: 'Free',
                price: yearly ? '$0' : '$0',
                desc: 'Try it out with 50 lookups',
                features: ['50 lookups/month', 'Basic pattern detection', 'CSV export', 'Email support', 'Hunter.io powered'],
              },
              {
                tier: 'Standard',
                price: yearly ? '$39' : '$49',
                desc: 'For growing teams',
                features: ['500 lookups/month', 'Advanced enrichment', 'Bulk processing', 'Priority support', 'API access'],
              },
              {
                tier: 'Pro',
                price: yearly ? '$99' : '$129',
                desc: 'Unlimited power',
                features: ['Unlimited lookups', 'AI pattern learning', 'White-label export', 'Dedicated support', 'Custom integrations'],
                pro: true,
              },
            ].map((plan, i) => (
              <div key={i} className={`c3-card ${plan.pro ? 'c3-card-pro' : ''}`}>
                <div className="c3-tier-small">{plan.tier}</div>
                <div className="c3-tier-large">{plan.price}<span className="text-2xl text-white/60">/mo</span></div>
                <div className="c3-desc">{plan.desc}</div>
                <ul className="c3-list">
                  {plan.features.map((feature, j) => (
                    <li key={j}>
                      <div className="c3-check">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/find" className="c3-btn">
                  Choose Plan
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="liquid-glass relative overflow-hidden rounded-3xl px-8 py-16 md:py-24 text-center">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: 'radial-gradient(600px circle at 50% 0%, rgba(255,255,255,0.15), transparent 70%)',
              }}
            ></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] mb-6">
                Stop guessing.<br />Start reaching.
              </h2>
              <p className="text-white/60 max-w-lg mx-auto mb-8">
                Join thousands of professionals finding verified contacts every day.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <PrimaryButton label="Try it now" href="/find" />
                <a href="#" className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium hover:bg-white/5 transition-colors">
                  View pricing
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
              <div>
                <LogoMark />
                <p className="text-xs text-white/50 mt-4">Find anyone. Instantly.</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Product</h4>
                <ul className="space-y-2 text-xs text-white/50">
                  <li><a href="#" className="hover:text-white">Features</a></li>
                  <li><a href="#" className="hover:text-white">Pricing</a></li>
                  <li><a href="#" className="hover:text-white">API</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Resources</h4>
                <ul className="space-y-2 text-xs text-white/50">
                  <li><a href="#" className="hover:text-white">Documentation</a></li>
                  <li><a href="#" className="hover:text-white">Blog</a></li>
                  <li><a href="#" className="hover:text-white">Support</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Company</h4>
                <ul className="space-y-2 text-xs text-white/50">
                  <li><a href="#" className="hover:text-white">About</a></li>
                  <li><a href="#" className="hover:text-white">Careers</a></li>
                  <li><a href="#" className="hover:text-white">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-3">Legal</h4>
                <ul className="space-y-2 text-xs text-white/50">
                  <li><a href="#" className="hover:text-white">Privacy</a></li>
                  <li><a href="#" className="hover:text-white">Terms</a></li>
                  <li><a href="#" className="hover:text-white">Security</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs text-white/40">© 2026 Linkout. All rights reserved.</p>
              <div className="flex gap-4 text-white/40">
                <a href="#" className="hover:text-white">Twitter</a>
                <a href="#" className="hover:text-white">LinkedIn</a>
                <a href="#" className="hover:text-white">GitHub</a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#0c0c0c]/85 backdrop-blur-2xl">
          <div className="p-6 flex items-center justify-between">
            <LogoMark />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-6 flex flex-col gap-6">
            {['Solutions', 'Pricing', 'Blog', 'Documentation', 'Careers'].map((item, i) => (
              <motion.a
                key={item}
                href="#"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="text-3xl font-semibold text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item}
              </motion.a>
            ))}
          </nav>
          <div className="p-6 mt-auto">
            <PrimaryButton label="Try it now" href="/find" />
          </div>
        </div>
      )}
    </div>
  )
}

// Components
function LogoMark() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 256 256" fill="currentColor">
      <path d="M 0 128 C 70.692 128 128 185.308 128 256 L 64 256 C 64 220.654 35.346 192 0 192 Z" />
      <path d="M 256 192 C 220.654 192 192 220.654 192 256 L 128 256 C 128 185.308 185.308 128 256 128 Z" />
      <path d="M 128 0 C 128 70.692 70.692 128 0 128 L 0 64 C 35.346 64 64 35.346 64 0 Z" />
      <path d="M 192 0 C 192 35.346 220.654 64 256 64 L 256 128 C 185.308 128 128 70.692 128 0 Z" />
    </svg>
  )
}

function PrimaryButton({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-black font-medium text-sm px-5 py-3 transition-all hover:bg-white/90 active:scale-[0.98]"
    >
      {label}
      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
    </Link>
  )
}
