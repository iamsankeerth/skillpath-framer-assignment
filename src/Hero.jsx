import { useLayoutEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ArrowDown, Menu, X } from "lucide-react"

export default function Hero() {
  const rootRef = useRef(null)
  const pinwheelRef = useRef(null)
  const ribbonRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (!root || reducedMotion) return undefined

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

      gsap.to(ribbonRef.current, {
        y: -12,
        rotation: 8,
        duration: 2.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      })
    }, root)

    const finePointer = window.matchMedia("(pointer: fine)").matches
    let movePinwheelX
    let movePinwheelY
    let moveRibbonX
    let moveRibbonY

    if (finePointer) {
      movePinwheelX = gsap.quickTo(pinwheelRef.current, "x", { duration: 0.8, ease: "power3" })
      movePinwheelY = gsap.quickTo(pinwheelRef.current, "y", { duration: 0.8, ease: "power3" })
      moveRibbonX = gsap.quickTo(ribbonRef.current, "x", { duration: 1, ease: "power3" })
      moveRibbonY = gsap.quickTo(ribbonRef.current, "y", { duration: 1, ease: "power3" })
    }

    const handlePointerMove = (event) => {
      if (!finePointer) return
      const bounds = root.getBoundingClientRect()
      const x = (event.clientX - bounds.left) / bounds.width - 0.5
      const y = (event.clientY - bounds.top) / bounds.height - 0.5
      movePinwheelX(x * 24)
      movePinwheelY(y * 18)
      moveRibbonX(x * -28)
      moveRibbonY(y * -16)
    }

    root.addEventListener("pointermove", handlePointerMove)

    return () => {
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
          <span />
          <span />
          <span />
          <span />
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
