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

const pinwheelBladeAngles = [0, 90, 180, 270]
const pinwheelRestShape = [42, 10, 87, 1, 98, 22, 84, 49]
const pinwheelOpenShape = [35, 16, 82, 1, 101, 20, 87, 47]
const pinwheelCompressedShape = [47, 6, 94, 10, 99, 31, 78, 52]

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))
const mix = (start, end, amount) => start + (end - start) * amount

const getPinwheelShape = (amount) => {
  const target = amount >= 0 ? pinwheelOpenShape : pinwheelCompressedShape
  const progress = Math.abs(amount)
  return pinwheelRestShape.map((value, index) => mix(value, target[index], progress))
}

const rotatePinwheelPoint = (x, y, angle) => {
  const radians = angle * (Math.PI / 180)
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const offsetX = x - 60
  const offsetY = y - 60

  return [
    60 + offsetX * cosine - offsetY * sine,
    60 + offsetX * sine + offsetY * cosine,
  ]
}

const getPinwheelPath = (shape = pinwheelRestShape, angle = 0) => {
  const [startX, startY, outerX, outerY, curveX1, curveY1, curveX2, curveY2] = shape
  const start = rotatePinwheelPoint(startX, startY, angle)
  const outer = rotatePinwheelPoint(outerX, outerY, angle)
  const curve1 = rotatePinwheelPoint(curveX1, curveY1, angle)
  const curve2 = rotatePinwheelPoint(curveX2, curveY2, angle)
  return [
    "M60 60",
    `L${start[0].toFixed(2)} ${start[1].toFixed(2)}`,
    `L${outer[0].toFixed(2)} ${outer[1].toFixed(2)}`,
    `C${curve1[0].toFixed(2)} ${curve1[1].toFixed(2)} ${curve2[0].toFixed(2)} ${curve2[1].toFixed(2)} 60 60`,
    "Z",
  ].join(" ")
}

export default function Hero() {
  const rootRef = useRef(null)
  const pinwheelRef = useRef(null)
  const windmillRef = useRef(null)
  const bladeRefs = useRef([])
  const ribbonRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useLayoutEffect(() => {
    const root = rootRef.current

    if (!root) return undefined

    const media = gsap.matchMedia()

    media.add({
      reduceMotion: "(prefers-reduced-motion: reduce)",
      allowMotion: "(prefers-reduced-motion: no-preference)",
    }, (mediaContext) => {
      const { reduceMotion } = mediaContext.conditions

      const finePointer = window.matchMedia("(pointer: fine)").matches
      let moveRibbonX
      let moveRibbonY
      let tiltRibbonX
      let tiltRibbonY
      let ribbonSettleTimer
      let pinwheelSettleTimer
      let pinwheelFrame
      let previousFrameTime

      const pinwheelCurrent = {
        x: 0,
        y: 0,
        morph: 0,
        rotation: 0,
        skew: 0,
      }
      const pinwheelVelocity = {
        x: 0,
        y: 0,
        morph: 0,
        rotation: 0,
        skew: 0,
      }
      const pinwheelTarget = {
        x: 0,
        y: 0,
        morph: 0,
        rotation: 0,
        skew: 0,
      }

      const resetPinwheelTargets = () => {
        Object.keys(pinwheelTarget).forEach((key) => {
          pinwheelTarget[key] = 0
        })
      }

      const resetPinwheelVisual = () => {
        if (windmillRef.current) windmillRef.current.style.transform = ""
        bladeRefs.current.forEach((blade, index) => {
          if (!blade) return
          blade.setAttribute("d", getPinwheelPath(pinwheelRestShape, pinwheelBladeAngles[index]))
          blade.removeAttribute("transform")
        })
      }

      const stepSpring = (key, deltaTime, stiffness, damping) => {
        const displacement = pinwheelTarget[key] - pinwheelCurrent[key]
        pinwheelVelocity[key] += displacement * stiffness * deltaTime
        pinwheelVelocity[key] *= Math.exp(-damping * deltaTime)
        pinwheelCurrent[key] += pinwheelVelocity[key] * deltaTime

        return Math.abs(displacement) < 0.001 && Math.abs(pinwheelVelocity[key]) < 0.001
      }

      const renderPinwheel = () => {
        const { x, y, morph, rotation, skew } = pinwheelCurrent
        const direction = Math.atan2(y, x)
        const pointerMagnitude = Math.min(1, Math.hypot(x, y))
        const scaleX = 1 + x * 0.015 + morph * 0.01
        const scaleY = 1 - y * 0.015 + morph * 0.006

        windmillRef.current.style.transform = [
          `translate3d(${(x * 4).toFixed(2)}px, ${(y * 3).toFixed(2)}px, 0)`,
          `rotate(${rotation.toFixed(2)}deg)`,
          `skew(${skew.toFixed(2)}deg, ${(x * 2).toFixed(2)}deg)`,
          `scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`,
        ].join(" ")

        bladeRefs.current.forEach((blade, index) => {
          if (!blade) return

          const bladeAngle = (pinwheelBladeAngles[index] - 90) * (Math.PI / 180)
          const alignment = Math.cos(direction - bladeAngle) * pointerMagnitude
          const tangent = -x * Math.sin(bladeAngle) + y * Math.cos(bladeAngle)
          const directionSign = tangent >= 0 ? 1 : -0.72
          const bladeMorph = clamp(
            morph * (0.62 + alignment * 0.28) * directionSign,
            -1,
            1,
          )
          const localRotation = clamp(tangent * morph * 6, -6, 6)

          blade.setAttribute(
            "d",
            getPinwheelPath(
              getPinwheelShape(bladeMorph),
              pinwheelBladeAngles[index] + localRotation,
            ),
          )
        })
      }

      const animatePinwheel = (time) => {
        const deltaTime = Math.min(0.033, Math.max(0.001, ((time - (previousFrameTime || time)) / 1000)))
        previousFrameTime = time

        const xSettled = stepSpring("x", deltaTime, 95, 16)
        const ySettled = stepSpring("y", deltaTime, 95, 16)
        const positionSettled = xSettled && ySettled
        const morphSettled = stepSpring("morph", deltaTime, 120, 18)
        const rotationSettled = stepSpring("rotation", deltaTime, 82, 15)
        const skewSettled = stepSpring("skew", deltaTime, 76, 16)

        renderPinwheel()

        if (positionSettled && morphSettled && rotationSettled && skewSettled) {
          pinwheelFrame = undefined
          previousFrameTime = undefined
          if (pinwheelTarget.morph === 0) resetPinwheelVisual()
          return
        }

        pinwheelFrame = window.requestAnimationFrame(animatePinwheel)
      }

      const startPinwheel = () => {
        if (!pinwheelFrame) pinwheelFrame = window.requestAnimationFrame(animatePinwheel)
      }

      const settlePinwheel = () => {
        resetPinwheelTargets()
        startPinwheel()
      }

      const context = gsap.context(() => {
        if (reduceMotion) return

        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } })

        timeline
          .from(".announcement__inner", { y: -14, opacity: 0, duration: 0.35 }, 0)
          .from(".site-header", { y: -14, opacity: 0, duration: 0.45 }, 0)
          .from(".hero-word__inner", { yPercent: 112, duration: 0.72, stagger: 0.08 }, 0.08)
          .from(".hero-pinwheel", { scale: 0.7, opacity: 0, duration: 0.58 }, 0.3)
          .from(".hero-ribbon", { scale: 0.7, rotate: -24, opacity: 0, duration: 0.58 }, 0.3)
          .from(".hero-support", { y: 14, opacity: 0, duration: 0.42 }, 0.48)
          .from(".hero-cta", { y: 14, opacity: 0, duration: 0.42 }, 0.56)

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
          moveRibbonX = gsap.quickTo(ribbonRef.current, "x", { duration: 0.95, ease: "power3" })
          moveRibbonY = gsap.quickTo(ribbonRef.current, "y", { duration: 0.95, ease: "power3" })
          tiltRibbonX = gsap.quickTo(ribbonRef.current, "rotationX", { duration: 1.1, ease: "power3" })
          tiltRibbonY = gsap.quickTo(ribbonRef.current, "rotationY", { duration: 1.1, ease: "power3" })
        }
      }, root)

      if (reduceMotion) return () => context.revert()

      const settleRibbon = () => {
        moveRibbonX(0)
        moveRibbonY(0)
        tiltRibbonX(0)
        tiltRibbonY(0)
      }

      const handlePointerMove = (event) => {
        if (!finePointer) return
        const bounds = root.getBoundingClientRect()
        const x = clamp((((event.clientX - bounds.left) / bounds.width) * 2) - 1, -1, 1)
        const y = clamp((((event.clientY - bounds.top) / bounds.height) * 2) - 1, -1, 1)
        const magnitude = Math.min(1, Math.hypot(x, y))

        pinwheelTarget.x = x
        pinwheelTarget.y = y
        pinwheelTarget.morph = Math.min(1, 0.24 + magnitude * 0.76)
        pinwheelTarget.rotation = clamp(x * 14 - y * 5, -18, 18)
        pinwheelTarget.skew = clamp(y * -3, -4, 4)
        startPinwheel()

        moveRibbonX(x * -18)
        moveRibbonY(y * -10)
        tiltRibbonX(y * -8)
        tiltRibbonY(x * 10)

        window.clearTimeout(pinwheelSettleTimer)
        window.clearTimeout(ribbonSettleTimer)
        pinwheelSettleTimer = window.setTimeout(settlePinwheel, 160)
        ribbonSettleTimer = window.setTimeout(settleRibbon, 220)
      }

      const handlePointerLeave = () => {
        if (!finePointer) return
        window.clearTimeout(pinwheelSettleTimer)
        window.clearTimeout(ribbonSettleTimer)
        settlePinwheel()
        settleRibbon()
      }

      root.addEventListener("pointermove", handlePointerMove)
      root.addEventListener("pointerleave", handlePointerLeave)

      return () => {
        window.clearTimeout(pinwheelSettleTimer)
        window.clearTimeout(ribbonSettleTimer)
        if (pinwheelFrame) window.cancelAnimationFrame(pinwheelFrame)
        root.removeEventListener("pointermove", handlePointerMove)
        root.removeEventListener("pointerleave", handlePointerLeave)
        resetPinwheelVisual()
        context.revert()
      }
    })

    return () => media.revert()
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
          <svg className="windmill" ref={windmillRef} viewBox="0 0 120 120" role="presentation">
            <defs>
              <linearGradient id="windmill-gradient" x1="60" y1="0" x2="60" y2="120" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#ff8a0a" />
                <stop offset="0.38" stopColor="#ffad8e" />
                <stop offset="0.68" stopColor="#f2a3c8" />
                <stop offset="1" stopColor="#dda1ff" />
              </linearGradient>
            </defs>
            <g fill="url(#windmill-gradient)">
              {pinwheelBladeAngles.map((angle, index) => (
                <path
                  key={angle}
                  ref={(node) => { bladeRefs.current[index] = node }}
                  data-pinwheel-blade={index + 1}
                  d={getPinwheelPath(pinwheelRestShape, angle)}
                />
              ))}
            </g>
          </svg>
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
