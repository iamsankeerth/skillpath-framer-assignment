import { useLayoutEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ArrowDown, Menu, X } from "lucide-react"

const ribbonPaths = [
  "M 78 16 C 130 22 149 53 124 80 C 97 108 55 99 54 67 C 53 39 130 68 137 113 C 143 154 103 182 66 165 C 30 148 42 108 83 108 C 127 109 137 158 100 197",
  "M 88 18 C 133 30 143 62 113 84 C 82 107 47 87 60 58 C 72 33 143 87 132 130 C 122 169 76 182 51 151 C 27 121 65 94 101 115 C 136 136 125 176 89 199",
  "M 72 20 C 119 14 153 44 137 74 C 120 106 69 112 53 81 C 38 51 117 55 139 96 C 160 136 126 171 89 168 C 51 166 37 126 69 106 C 101 86 140 134 112 195",
  "M 84 17 C 137 27 153 55 121 86 C 89 116 52 94 56 62 C 60 30 139 75 139 119 C 138 163 90 184 58 158 C 26 131 54 101 94 110 C 132 119 132 162 96 198",
]

const ribbonBridgePaths = [
  "M 62 58 C 91 48 131 76 136 107",
  "M 69 54 C 95 53 132 86 132 119",
  "M 56 74 C 70 54 121 63 137 94",
  "M 63 57 C 86 49 130 75 138 110",
]

const morphDurations = [4.1, 4.8, 3.7, 4.5]

export default function Hero() {
  const rootRef = useRef(null)
  const pinwheelRef = useRef(null)
  const ribbonRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (!root || reducedMotion) return undefined

    const finePointer = window.matchMedia("(pointer: fine)").matches
    let movePinwheelX
    let movePinwheelY
    let moveRibbonX
    let moveRibbonY
    let tiltRibbonX
    let tiltRibbonY
    let settleTimer

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } })

      timeline
        .from(".announcement__inner", { y: -14, opacity: 0, duration: 0.35 }, 0)
        .from(".site-header", { y: -14, opacity: 0, duration: 0.45 }, 0)
        .from(".hero-word__inner", { yPercent: 112, duration: 0.72, stagger: 0.08 }, 0.08)
        .from(".hero-art", { scale: 0.7, rotate: -24, opacity: 0, duration: 0.58 }, 0.3)
        .from(".hero-support", { y: 14, opacity: 0, duration: 0.42 }, 0.48)
        .from(".hero-cta", { y: 14, opacity: 0, duration: 0.42 }, 0.56)

      gsap.to(pinwheelRef.current, {
        rotation: 360,
        duration: 18,
        repeat: -1,
        ease: "none",
      })

      const bodyPaths = gsap.utils.toArray(".hero-ribbon__body-path")
      const bridgePaths = gsap.utils.toArray(".hero-ribbon__bridge-path")
      const morphTimeline = gsap.timeline({ repeat: -1 })

      ribbonPaths.slice(1).forEach((path, index) => {
        const duration = morphDurations[index]

        morphTimeline
          .to(bodyPaths, { attr: { d: path }, duration, ease: "sine.inOut" })
          .to(
            bridgePaths,
            { attr: { d: ribbonBridgePaths[index + 1] }, duration, ease: "sine.inOut" },
            "<",
          )
      })

      morphTimeline
        .to(bodyPaths, {
          attr: { d: ribbonPaths[0] },
          duration: morphDurations[3],
          ease: "sine.inOut",
        })
        .to(
          bridgePaths,
          {
            attr: { d: ribbonBridgePaths[0] },
            duration: morphDurations[3],
            ease: "sine.inOut",
          },
          "<",
        )

      gsap
        .timeline({ repeat: -1 })
        .to(".hero-ribbon__float", { rotation: -4, x: 3, y: -4, duration: 4.7, ease: "sine.inOut" })
        .to(".hero-ribbon__float", { rotation: -11, x: -2, y: 2, duration: 5.4, ease: "sine.inOut" })
        .to(".hero-ribbon__float", { rotation: -7, x: 0, y: 0, duration: 4.3, ease: "sine.inOut" })

      gsap
        .timeline({ repeat: -1, yoyo: true })
        .to(".hero-ribbon__gradient", {
          attr: { x1: 68, y1: 6, x2: 116, y2: 214 },
          duration: 6.7,
          ease: "sine.inOut",
        })
        .to(".hero-ribbon__gradient", {
          attr: { x1: 26, y1: 36, x2: 154, y2: 176 },
          duration: 5.9,
          ease: "sine.inOut",
        })

      gsap.to(".hero-ribbon__sheen", {
        strokeDashoffset: -286,
        duration: 8.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })

      if (finePointer) {
        movePinwheelX = gsap.quickTo(pinwheelRef.current, "x", { duration: 0.8, ease: "power3" })
        movePinwheelY = gsap.quickTo(pinwheelRef.current, "y", { duration: 0.8, ease: "power3" })
        moveRibbonX = gsap.quickTo(ribbonRef.current, "x", { duration: 0.95, ease: "power3" })
        moveRibbonY = gsap.quickTo(ribbonRef.current, "y", { duration: 0.95, ease: "power3" })
        tiltRibbonX = gsap.quickTo(ribbonRef.current, "rotationX", { duration: 1.1, ease: "power3" })
        tiltRibbonY = gsap.quickTo(ribbonRef.current, "rotationY", { duration: 1.1, ease: "power3" })
      }
    }, root)

    const settleRibbon = () => {
      moveRibbonX(0)
      moveRibbonY(0)
      tiltRibbonX(0)
      tiltRibbonY(0)
    }

    const handlePointerMove = (event) => {
      if (!finePointer) return
      const bounds = root.getBoundingClientRect()
      const x = (event.clientX - bounds.left) / bounds.width - 0.5
      const y = (event.clientY - bounds.top) / bounds.height - 0.5
      movePinwheelX(x * 24)
      movePinwheelY(y * 18)
      moveRibbonX(x * -18)
      moveRibbonY(y * -10)
      tiltRibbonX(y * -8)
      tiltRibbonY(x * 10)

      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(settleRibbon, 220)
    }

    root.addEventListener("pointermove", handlePointerMove)

    return () => {
      window.clearTimeout(settleTimer)
      root.removeEventListener("pointermove", handlePointerMove)
      context.revert()
    }
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="hero-stage" ref={rootRef}>
      <aside className="announcement" aria-label="Announcement">
        <div className="announcement__inner">
          <span className="announcement__mark" aria-hidden="true">✦</span>
          Learn without limits. Build what comes next.
        </div>
      </aside>

      <header className="site-header">
        <a className="site-brand" href="#home" aria-label="Skillpath home">
          Skillpath
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#courses">Courses</a>
          <a href="#about">Why Skillpath</a>
          <a
            href="https://github.com/iamsankeerth/skillpath-framer-assignment"
            target="_blank"
            rel="noreferrer"
          >
            Repository
          </a>
        </nav>

        <a className="header-action" href="#courses">
          Explore courses
        </a>

        <button
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          title={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>

        <nav
          className="mobile-nav"
          id="mobile-navigation"
          aria-label="Mobile navigation"
          data-open={menuOpen}
        >
          <a href="#courses" onClick={closeMenu}>Courses</a>
          <a href="#about" onClick={closeMenu}>Why Skillpath</a>
          <a
            href="https://github.com/iamsankeerth/skillpath-framer-assignment"
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
          >
            Repository
          </a>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero-title">
          <span className="hero-word hero-word--first">
            <span className="hero-word__inner">Learn</span>
          </span>
          {" "}
          <span className="hero-word hero-word--second">
            <span className="hero-word__inner">Everything</span>
          </span>
        </h1>

        <div className="hero-art hero-pinwheel" ref={pinwheelRef} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="hero-art hero-ribbon" ref={ribbonRef} aria-hidden="true">
          <div className="hero-ribbon__float">
            <svg viewBox="0 0 180 220" role="presentation">
              <defs>
                <linearGradient
                  className="hero-ribbon__gradient"
                  id="sculpture-gradient"
                  gradientUnits="userSpaceOnUse"
                  x1="36"
                  y1="18"
                  x2="144"
                  y2="198"
                >
                  <stop offset="0" stopColor="#54dcff" />
                  <stop offset="0.34" stopColor="#7288ff" />
                  <stop offset="0.68" stopColor="#ad7cff" />
                  <stop offset="1" stopColor="#ff8fc7" />
                </linearGradient>
                <linearGradient
                  id="sculpture-sheen"
                  gradientUnits="userSpaceOnUse"
                  x1="38"
                  y1="12"
                  x2="137"
                  y2="202"
                >
                  <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                  <stop offset="0.48" stopColor="#f5dcff" stopOpacity="0.72" />
                  <stop offset="0.72" stopColor="#ff9dd0" stopOpacity="0.38" />
                  <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <filter id="sculpture-glow" x="-40%" y="-30%" width="180%" height="170%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
                <filter id="sculpture-soften" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.5" />
                </filter>
              </defs>

              <path
                className="hero-ribbon__body-path hero-ribbon__aura"
                d={ribbonPaths[0]}
                fill="none"
                stroke="#8f7cff"
                strokeWidth="34"
                strokeLinecap="round"
                opacity="0.11"
                filter="url(#sculpture-glow)"
              />
              <path
                className="hero-ribbon__body-path hero-ribbon__depth"
                d={ribbonPaths[0]}
                fill="none"
                stroke="#453f9f"
                strokeWidth="28"
                strokeLinecap="round"
                opacity="0.32"
                filter="url(#sculpture-soften)"
                transform="translate(3 6)"
              />
              <path
                className="hero-ribbon__body-path hero-ribbon__body"
                d={ribbonPaths[0]}
                fill="none"
                stroke="url(#sculpture-gradient)"
                strokeWidth="23"
                strokeLinecap="round"
              />
              <path
                className="hero-ribbon__body-path hero-ribbon__sheen"
                d={ribbonPaths[0]}
                fill="none"
                stroke="url(#sculpture-sheen)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="46 240"
                opacity="0.48"
              />

              <path
                className="hero-ribbon__bridge-path hero-ribbon__bridge-separator"
                d={ribbonBridgePaths[0]}
                fill="none"
                stroke="var(--color-canvas)"
                strokeWidth="29"
                strokeLinecap="round"
                opacity="0.92"
              />
              <path
                className="hero-ribbon__bridge-path hero-ribbon__bridge"
                d={ribbonBridgePaths[0]}
                fill="none"
                stroke="url(#sculpture-gradient)"
                strokeWidth="23"
                strokeLinecap="round"
              />
              <path
                className="hero-ribbon__bridge-path hero-ribbon__bridge-sheen hero-ribbon__sheen"
                d={ribbonBridgePaths[0]}
                fill="none"
                stroke="url(#sculpture-sheen)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="34 120"
                opacity="0.44"
              />
            </svg>
          </div>
        </div>

        <p className="hero-support">
          <span aria-hidden="true">{"{"}</span>
          <span>Practical courses for every skill you want to build next.</span>
          <span aria-hidden="true">{"}"}</span>
        </p>

        <a className="hero-cta" href="#courses">
          Explore courses
          <ArrowDown size={21} strokeWidth={1.8} aria-hidden="true" />
        </a>
      </section>
    </div>
  )
}
