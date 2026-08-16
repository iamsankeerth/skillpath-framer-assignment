import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

const { useCallback, useEffect, useId, useMemo, useRef, useState } = React

const COURSE_URL = "https://syncsphere-hiv6.onrender.com/assignment/course-data"
const REGION_URL = "https://syncsphere-hiv6.onrender.com/assignment/country-code"
const LOADING = { status: "loading" }
const REQUIRED = ["courseName", "courseCode", "description", "mainCategory", "shortCourse", "courseType"]

function resourceError(kind) {
    const error = new Error(kind)
    error.kind = kind
    return error
}

function validCourse(course) {
    return course && typeof course === "object" && !Array.isArray(course) &&
        REQUIRED.every(key => typeof course[key] === "string" && course[key].trim()) &&
        [course.pricePaise, course.priceUsdCents].every(value => Number.isInteger(value) && value >= 0) &&
        typeof course.refundable === "boolean"
}

function validateCourses(payload) {
    if (!Array.isArray(payload)) throw resourceError("invalid-data")
    if (!payload.length) return []
    const valid = payload.filter(validCourse)
    if (!valid.length) throw resourceError("invalid-data")
    return valid
}

function validateRegion(payload) {
    if (!payload || !["IN", "US"].includes(payload.country_code)) throw resourceError("invalid-data")
    return payload.country_code
}

async function fetchResource(url, validate, signal) {
    const controller = new AbortController()
    let timedOut = false
    const abort = () => controller.abort()
    signal?.addEventListener("abort", abort, { once: true })
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 15000)
    try {
        const response = await fetch(url, { method: "GET", cache: "no-store", signal: controller.signal })
        if (!response.ok) throw resourceError("http")
        let payload
        try { payload = await response.json() } catch { throw resourceError("invalid-data") }
        return validate(payload)
    } catch (error) {
        if (error?.kind) throw error
        if (signal?.aborted) throw resourceError("aborted")
        if (timedOut) throw resourceError("timeout")
        throw resourceError("network")
    } finally {
        window.clearTimeout(timeout)
        signal?.removeEventListener("abort", abort)
    }
}

const normalize = value => value.trim().toLocaleLowerCase()
function filterCourses(courses, query) {
    const needle = normalize(query)
    if (!needle) return courses
    return courses.filter(course => [course.courseName, course.description, course.mainCategory, course.shortCourse, course.courseType]
        .some(value => value.toLocaleLowerCase().includes(needle)))
}

function minorUnits(course, region) { return region === "US" ? course.priceUsdCents : course.pricePaise }
function sortCourses(courses, order, region) {
    if (order === "featured" || !region) return courses
    const direction = order === "price-high" ? -1 : 1
    return courses.map((course, index) => ({ course, index })).sort((a, b) => {
        const difference = minorUnits(a.course, region) - minorUnits(b.course, region)
        return difference ? difference * direction : a.index - b.index
    }).map(item => item.course)
}

function formatPrice(course, region) {
    const value = minorUnits(course, region)
    const us = region === "US"
    return new Intl.NumberFormat(us ? "en-US" : "en-IN", {
        style: "currency", currency: us ? "USD" : "INR",
        minimumFractionDigits: us || value % 100 ? 2 : 0, maximumFractionDigits: 2,
    }).format(value / 100)
}

function Icon({ name, size = 18 }) {
    const paths = {
        search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
        refresh: <><path d="M20 12a8 8 0 1 1-2.34-5.66L20 8"/><path d="M20 3v5h-5"/></>,
        close: <><path d="M18 6 6 18M6 6l12 12"/></>,
        menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
        down: <path d="m6 9 6 6 6-6"/>,
        arrow: <><path d="M12 4v16M6 14l6 6 6-6"/></>,
    }
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const bladeAngles = [0, 90, 180, 270]
const restShape = [42, 10, 87, 1, 98, 22, 84, 49]
const openShape = [35, 16, 82, 1, 101, 20, 87, 47]
const compressedShape = [47, 6, 94, 10, 99, 31, 78, 52]
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const mix = (a, b, t) => a + (b - a) * t

function rotatePoint(x, y, angle) {
    const radians = angle * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians)
    return [60 + (x - 60) * c - (y - 60) * s, 60 + (x - 60) * s + (y - 60) * c]
}
function bladePath(shape, angle) {
    const [sx, sy, ox, oy, c1x, c1y, c2x, c2y] = shape
    const start = rotatePoint(sx, sy, angle), outer = rotatePoint(ox, oy, angle)
    const c1 = rotatePoint(c1x, c1y, angle), c2 = rotatePoint(c2x, c2y, angle)
    return `M60 60 L${start[0]} ${start[1]} L${outer[0]} ${outer[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} 60 60 Z`
}
function morphedShape(amount) {
    const target = amount >= 0 ? openShape : compressedShape
    return restShape.map((value, index) => mix(value, target[index], Math.abs(amount)))
}

const ribbonPaths = [
    "M 78 16 C 130 22 149 53 124 80 C 97 108 55 99 54 67 C 53 39 130 68 137 113 C 143 154 103 182 66 165 C 30 148 42 108 83 108 C 127 109 137 158 100 197",
    "M 88 18 C 133 30 143 62 113 84 C 82 107 47 87 60 58 C 72 33 143 87 132 130 C 122 169 76 182 51 151 C 27 121 65 94 101 115 C 136 136 125 176 89 199",
    "M 72 20 C 119 14 153 44 137 74 C 120 106 69 112 53 81 C 38 51 117 55 139 96 C 160 136 126 171 89 168 C 51 166 37 126 69 106 C 101 86 140 134 112 195",
    "M 84 17 C 137 27 153 55 121 86 C 89 116 52 94 56 62 C 60 30 139 75 139 119 C 138 163 90 184 58 158 C 26 131 54 101 94 110 C 132 119 132 162 96 198",
]
const bridgePaths = [
    "M 62 58 C 91 48 131 76 136 107", "M 69 54 C 95 53 132 86 132 119",
    "M 56 74 C 70 54 121 63 137 94", "M 63 57 C 86 49 130 75 138 110",
]
function interpolatePath(from, to, progress) {
    const numbers = /-?\d*\.?\d+/g, a = from.match(numbers).map(Number), b = to.match(numbers).map(Number)
    let index = 0
    return from.replace(numbers, () => String(mix(a[index], b[index++], progress).toFixed(2)))
}

function HeroArt({ idPrefix }) {
    const stageRef = useRef(null), windmillRef = useRef(null), bladeRefs = useRef([]), ribbonRef = useRef(null)
    const bodyRefs = useRef([]), bridgeRefs = useRef([])
    useEffect(() => {
        const stage = stageRef.current
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        const fine = window.matchMedia("(pointer: fine)").matches
        if (!stage || reduced) return
        const current = { x: 0, y: 0, morph: 0, rotation: 0, skew: 0 }
        const target = { ...current }, velocity = { ...current }
        const ribbon = { x: 0, y: 0, tx: 0, ty: 0 }
        let frame, last = performance.now(), idleAt = 0
        const onMove = event => {
            if (!fine) return
            const box = stage.getBoundingClientRect()
            target.x = clamp((event.clientX - box.left) / box.width * 2 - 1, -1, 1)
            target.y = clamp((event.clientY - box.top) / box.height * 2 - 1, -1, 1)
            target.morph = .25 + Math.min(1, Math.hypot(target.x, target.y)) * .75
            target.rotation = clamp(target.x * 14 - target.y * 5, -18, 18)
            target.skew = clamp(target.y * -3, -4, 4)
            ribbon.tx = target.x * -16; ribbon.ty = target.y * -9; idleAt = performance.now() + 180
        }
        const onLeave = () => { Object.keys(target).forEach(key => target[key] = 0); ribbon.tx = ribbon.ty = 0 }
        const step = now => {
            const dt = Math.min(.033, Math.max(.001, (now - last) / 1000)); last = now
            if (now > idleAt) { Object.keys(target).forEach(key => target[key] *= .96); ribbon.tx *= .96; ribbon.ty *= .96 }
            Object.keys(current).forEach(key => {
                velocity[key] += (target[key] - current[key]) * 95 * dt
                velocity[key] *= Math.exp(-16 * dt); current[key] += velocity[key] * dt
            })
            ribbon.x += (ribbon.tx - ribbon.x) * .055; ribbon.y += (ribbon.ty - ribbon.y) * .055
            windmillRef.current.style.transform = `translate3d(${current.x * 4}px,${current.y * 3}px,0) rotate(${current.rotation}deg) skew(${current.skew}deg,${current.x * 2}deg)`
            const direction = Math.atan2(current.y, current.x), magnitude = Math.min(1, Math.hypot(current.x, current.y))
            bladeRefs.current.forEach((blade, index) => {
                const angle = (bladeAngles[index] - 90) * Math.PI / 180
                const tangent = -current.x * Math.sin(angle) + current.y * Math.cos(angle)
                const amount = clamp(current.morph * (.62 + Math.cos(direction - angle) * magnitude * .28) * (tangent >= 0 ? 1 : -.72), -1, 1)
                blade.setAttribute("d", bladePath(morphedShape(amount), bladeAngles[index] + clamp(tangent * current.morph * 6, -6, 6)))
            })
            const cycle = 4200, phase = (now % (cycle * 4)) / cycle, from = Math.floor(phase) % 4, to = (from + 1) % 4
            const t = (1 - Math.cos((phase % 1) * Math.PI)) / 2
            bodyRefs.current.forEach(path => path?.setAttribute("d", interpolatePath(ribbonPaths[from], ribbonPaths[to], t)))
            bridgeRefs.current.forEach(path => path?.setAttribute("d", interpolatePath(bridgePaths[from], bridgePaths[to], t)))
            ribbonRef.current.style.transform = `translate3d(${ribbon.x}px,${ribbon.y + Math.sin(now / 1800) * 3}px,0) rotate(${Math.sin(now / 2300) * 3 - 7}deg)`
            frame = requestAnimationFrame(step)
        }
        stage.addEventListener("pointermove", onMove); stage.addEventListener("pointerleave", onLeave)
        frame = requestAnimationFrame(step)
        return () => { cancelAnimationFrame(frame); stage.removeEventListener("pointermove", onMove); stage.removeEventListener("pointerleave", onLeave) }
    }, [])

    const gradient = `${idPrefix}-pinwheel`, ribbonGradient = `${idPrefix}-ribbon`, sheen = `${idPrefix}-sheen`, glow = `${idPrefix}-glow`
    return <div className="sp-art-stage" ref={stageRef} aria-hidden="true">
        <svg className="sp-pinwheel" ref={windmillRef} viewBox="0 0 120 120">
            <defs><linearGradient id={gradient} x1="60" y1="0" x2="60" y2="120" gradientUnits="userSpaceOnUse"><stop stopColor="#ff8a0a"/><stop offset=".38" stopColor="#ffad8e"/><stop offset=".68" stopColor="#f2a3c8"/><stop offset="1" stopColor="#dda1ff"/></linearGradient></defs>
            <g fill={`url(#${gradient})`}>{bladeAngles.map((angle, index) => <path key={angle} ref={node => bladeRefs.current[index] = node} d={bladePath(restShape, angle)}/>)}</g>
        </svg>
        <svg className="sp-ribbon" ref={ribbonRef} viewBox="0 0 180 220">
            <defs>
                <linearGradient id={ribbonGradient} x1="36" y1="18" x2="144" y2="198" gradientUnits="userSpaceOnUse"><stop stopColor="#54dcff"/><stop offset=".34" stopColor="#7288ff"/><stop offset=".68" stopColor="#ad7cff"/><stop offset="1" stopColor="#ff8fc7"/></linearGradient>
                <linearGradient id={sheen} x1="38" y1="12" x2="137" y2="202" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" stopOpacity="0"/><stop offset=".5" stopColor="#fff" stopOpacity=".65"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
                <filter id={glow} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
            </defs>
            <path ref={node => bodyRefs.current[0] = node} d={ribbonPaths[0]} fill="none" stroke="#8f7cff" strokeWidth="34" strokeLinecap="round" opacity=".1" filter={`url(#${glow})`}/>
            <path ref={node => bodyRefs.current[1] = node} d={ribbonPaths[0]} fill="none" stroke={`url(#${ribbonGradient})`} strokeWidth="23" strokeLinecap="round"/>
            <path ref={node => bodyRefs.current[2] = node} d={ribbonPaths[0]} fill="none" stroke={`url(#${sheen})`} strokeWidth="4" strokeLinecap="round" strokeDasharray="46 240" opacity=".46"/>
            <path ref={node => bridgeRefs.current[0] = node} d={bridgePaths[0]} fill="none" stroke="var(--sp-bg)" strokeWidth="29" strokeLinecap="round"/>
            <path ref={node => bridgeRefs.current[1] = node} d={bridgePaths[0]} fill="none" stroke={`url(#${ribbonGradient})`} strokeWidth="23" strokeLinecap="round"/>
        </svg>
    </div>
}

function RetryButton({ children, busy, onClick, buttonRef }) {
    return <button className="sp-retry" type="button" onClick={onClick} disabled={busy} ref={buttonRef}><span className={busy ? "sp-spin" : ""}><Icon name="refresh" size={17}/></span>{busy ? "Retrying..." : children}</button>
}

function Catalog() {
    const [coursesState, setCoursesState] = useState(LOADING), [regionState, setRegionState] = useState(LOADING)
    const [courseBusy, setCourseBusy] = useState(false), [regionBusy, setRegionBusy] = useState(false)
    const [query, setQuery] = useState(""), [order, setOrder] = useState("featured")
    const courseController = useRef(), regionController = useRef(), summaryRef = useRef(), courseRetryRef = useRef(), regionRetryRef = useRef(), searchRef = useRef()
    const focusSummary = () => requestAnimationFrame(() => summaryRef.current?.focus())
    const loadCourses = useCallback(async (retry = false) => {
        courseController.current?.abort(); const controller = new AbortController(); courseController.current = controller
        retry ? setCourseBusy(true) : setCoursesState(LOADING)
        try { const data = await fetchResource(COURSE_URL, validateCourses, controller.signal); if (!controller.signal.aborted) { setCoursesState({ status: "success", data }); if (retry) focusSummary() } }
        catch (error) { if (error.kind !== "aborted") { setCoursesState({ status: "error", kind: error.kind }); if (retry) requestAnimationFrame(() => courseRetryRef.current?.focus()) } }
        finally { if (courseController.current === controller) courseController.current = null; if (retry) setCourseBusy(false) }
    }, [])
    const loadRegion = useCallback(async (retry = false) => {
        regionController.current?.abort(); const controller = new AbortController(); regionController.current = controller
        retry ? setRegionBusy(true) : setRegionState(LOADING)
        try { const data = await fetchResource(REGION_URL, validateRegion, controller.signal); if (!controller.signal.aborted) { setRegionState({ status: "success", data }); if (retry) focusSummary() } }
        catch (error) { if (error.kind !== "aborted") { setRegionState({ status: "error", kind: error.kind }); if (retry) requestAnimationFrame(() => regionRetryRef.current?.focus()) } }
        finally { if (regionController.current === controller) regionController.current = null; if (retry) setRegionBusy(false) }
    }, [])
    useEffect(() => { loadCourses(); loadRegion(); return () => { courseController.current?.abort(); regionController.current?.abort() } }, [loadCourses, loadRegion])
    useEffect(() => { if (regionState.status !== "success" && order !== "featured") setOrder("featured") }, [regionState.status, order])
    const courses = coursesState.status === "success" ? coursesState.data : []
    const visible = useMemo(() => sortCourses(filterCourses(courses, query), order, regionState.status === "success" ? regionState.data : null), [courses, query, order, regionState])
    const count = query.trim() ? `${visible.length} of ${courses.length} courses` : `${courses.length} ${courses.length === 1 ? "course" : "courses"}`
    return <section className="sp-catalog" id="courses" aria-labelledby="sp-catalog-title" aria-busy={coursesState.status === "loading"}>
        <div className="sp-inner">
            <header className="sp-section-heading"><p className="sp-kicker">{"{"} Course Catalog {"}"}</p><div><h2 id="sp-catalog-title">Choose what you learn next.</h2><p>Explore the complete catalog and find the course that fits your next move.</p></div></header>
            {coursesState.status !== "error" && <div className="sp-toolbar" role="group" aria-label="Course Catalog controls">
                <label className="sp-field"><span>Search courses</span><span className="sp-control"><Icon name="search"/><input ref={searchRef} type="search" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Escape") { setQuery(""); searchRef.current?.focus() } }} placeholder="Name, category, or Course Type" disabled={coursesState.status === "loading"}/>{query && <button type="button" className="sp-clear" aria-label="Clear search" onClick={() => { setQuery(""); searchRef.current?.focus() }}><Icon name="close"/></button>}</span></label>
                <label className="sp-field sp-sort"><span>Sort courses</span><span className="sp-control"><select value={order} onChange={e => setOrder(e.target.value)} disabled={coursesState.status === "loading"}><option value="featured">Featured</option><option value="price-low" disabled={regionState.status !== "success"}>Price: Low to High</option><option value="price-high" disabled={regionState.status !== "success"}>Price: High to Low</option></select><span className="sp-select-icon"><Icon name="down"/></span></span></label>
            </div>}
            {coursesState.status === "error" && <div className="sp-state" role="alert"><p>Courses couldn&apos;t be loaded.</p><RetryButton busy={courseBusy} onClick={() => loadCourses(true)} buttonRef={courseRetryRef}>Retry courses</RetryButton></div>}
            {coursesState.status === "loading" && <><p className="sp-summary">Loading courses...</p><div className="sp-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <article className="sp-card sp-skeleton" key={i}><i/><i/><i/><i/></article>)}</div></>}
            {coursesState.status === "success" && <>
                {regionState.status === "error" && <div className="sp-notice" role="status"><p>Local prices couldn&apos;t be loaded. Every course is still available to browse.</p><RetryButton busy={regionBusy} onClick={() => loadRegion(true)} buttonRef={regionRetryRef}>Retry pricing</RetryButton></div>}
                <p className="sp-summary" ref={summaryRef} tabIndex={-1}>{count}</p><span className="sp-sr" aria-live="polite">{count}</span>
                {!courses.length && <div className="sp-state"><p>No courses are available right now.</p><RetryButton busy={courseBusy} onClick={() => loadCourses(true)}>Check again</RetryButton></div>}
                {!!courses.length && !visible.length && <div className="sp-state"><p>No courses match your search.</p><button className="sp-retry" type="button" onClick={() => { setQuery(""); searchRef.current?.focus() }}><Icon name="close" size={17}/>Clear search</button></div>}
                {!!visible.length && <div className="sp-grid">{visible.map(course => <article className="sp-card" key={course.courseCode}><div className="sp-card-meta"><p>{course.mainCategory}</p>{course.refundable && <span>Refundable</span>}</div><h3>{course.courseName}</h3><p className="sp-description">{course.description}</p><div className="sp-card-footer"><p className="sp-type"><span>Course Type</span>{course.courseType}</p><p className="sp-price">{regionState.status === "loading" ? "Finding local price..." : regionState.status === "error" ? "Price unavailable" : formatPrice(course, regionState.data)}</p></div></article>)}</div>}
            </>}
        </div>
    </section>
}

const styles = `
.sp-page{--sp-bg:#0e100f;--sp-paper:#fffce1;--sp-muted:#b8b5a2;--sp-line:#3b3e3c;box-sizing:border-box;width:100%;min-width:0;height:auto;background:var(--sp-bg);color:var(--sp-paper);font-family:var(--sp-font);font-style:var(--sp-font-style);font-weight:var(--sp-weight);container-type:inline-size;overflow:hidden}.sp-page *{box-sizing:border-box;letter-spacing:0}.sp-page a{color:inherit;text-decoration:none}.sp-page button,.sp-page input,.sp-page select{font:inherit}.sp-announcement{min-height:38px;background:var(--sp-brand);color:#07110a;display:grid;place-items:center;padding:8px 20px;font-size:13px;font-weight:700}.sp-header{height:90px;max-width:1600px;margin:auto;padding:0 clamp(20px,7vw,84px);display:flex;align-items:center;border-bottom:1px solid var(--sp-line);position:relative}.sp-brand{text-transform:uppercase;font-size:30px;font-weight:900;font-style:italic}.sp-nav{display:flex;gap:38px;margin-left:48px;color:var(--sp-muted)}.sp-nav a:hover,.sp-nav a:focus-visible{color:var(--sp-paper)}.sp-header-action,.sp-cta,.sp-retry{min-height:46px;border:1px solid currentColor;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:0 24px;font-weight:700;background:transparent;color:inherit;cursor:pointer}.sp-header-action{margin-left:auto}.sp-menu{display:none;margin-left:auto;width:46px;height:46px;border:1px solid var(--sp-line);border-radius:50%;background:none;color:inherit;place-items:center}.sp-mobile-nav{display:none}.sp-hero{min-height:730px;position:relative;max-width:1600px;margin:auto;padding:70px clamp(20px,7vw,84px) 70px}.sp-title{font-size:clamp(78px,12vw,210px);line-height:.82;margin:25px 0 0;font-weight:600;letter-spacing:0}.sp-title span{display:block}.sp-title span:last-child{text-align:right}.sp-art-stage{position:absolute;inset:0;pointer-events:auto}.sp-pinwheel{position:absolute;width:clamp(110px,10vw,170px);left:22%;top:25px;transform-origin:center;will-change:transform}.sp-ribbon{position:absolute;width:clamp(95px,9vw,150px);right:20%;top:53%;will-change:transform}.sp-support{position:absolute;left:clamp(20px,9vw,140px);bottom:82px;display:flex;gap:18px;max-width:630px;font-size:clamp(20px,2vw,31px);line-height:1.2;margin:0}.sp-cta{position:absolute;right:clamp(20px,8vw,120px);bottom:72px;border-color:var(--sp-brand);background:var(--sp-brand);color:#07110a;min-width:190px}.sp-catalog{background:#f3f1e8;color:#151715;padding:105px clamp(20px,6vw,84px);container-type:inline-size}.sp-inner{max-width:1200px;margin:auto}.sp-section-heading{display:grid;grid-template-columns:1fr 2fr;gap:40px;margin-bottom:58px}.sp-kicker{font-family:ui-monospace,monospace;color:#48604e;margin:7px 0}.sp-section-heading h2,.sp-about h2{font-size:clamp(40px,5vw,76px);line-height:1;margin:0;letter-spacing:0}.sp-section-heading>div>p{color:#565a55;font-size:18px}.sp-toolbar{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,.38fr);gap:22px;margin-bottom:26px}.sp-field{display:grid;gap:9px;color:#555b55;font-size:14px}.sp-control{position:relative;display:flex;align-items:center}.sp-control>svg{position:absolute;left:16px;pointer-events:none}.sp-control input,.sp-control select{width:100%;height:62px;background:#fff;border:1px solid #c5c8c1;border-radius:7px;color:#151715;padding:0 50px;outline:none}.sp-control select{appearance:none;padding-left:18px;padding-right:48px}.sp-control input:focus,.sp-control select:focus{border-color:var(--sp-brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--sp-brand) 25%,transparent)}.sp-clear{position:absolute;right:10px;width:42px;height:42px;border:0;background:none;display:grid;place-items:center;cursor:pointer}.sp-select-icon{position:absolute;right:16px;display:grid;place-items:center;pointer-events:none}.sp-summary{min-height:24px;color:#5f645f;margin:0 0 20px}.sp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.sp-card{min-height:305px;background:#fff;border:1px solid #d2d4ce;border-radius:7px;padding:25px;display:flex;flex-direction:column}.sp-card-meta{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;color:#626761;font-size:13px;text-transform:uppercase}.sp-card-meta p{margin:0}.sp-card-meta span{background:color-mix(in srgb,var(--sp-brand) 28%,white);padding:4px 8px;border-radius:3px;color:#17361e;font-weight:700}.sp-card h3{font-size:24px;line-height:1.1;margin:34px 0 12px}.sp-description{color:#5c615c;line-height:1.5;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.sp-card-footer{margin-top:auto;padding-top:24px;border-top:1px solid #e0e1dc;display:flex;align-items:end;justify-content:space-between;gap:16px}.sp-type{margin:0;font-weight:700}.sp-type span{display:block;color:#6e736e;font-weight:400;font-size:12px;margin-bottom:4px}.sp-price{margin:0;text-align:right;font-size:18px;font-weight:800}.sp-notice,.sp-state{border:1px solid #bfc4bc;background:#fff;padding:20px;margin:0 0 24px;display:flex;align-items:center;justify-content:space-between;gap:20px}.sp-state{min-height:170px;justify-content:center;flex-direction:column;text-align:center}.sp-retry{border-radius:5px;min-height:44px;padding:0 18px;color:#151715}.sp-retry:disabled{opacity:.55;cursor:wait}.sp-spin{display:flex;animation:sp-spin 1s linear infinite}.sp-skeleton{gap:20px}.sp-skeleton i{height:16px;background:#e8e9e4;border-radius:3px}.sp-skeleton i:nth-child(2){height:30px;width:80%;margin-top:24px}.sp-skeleton i:nth-child(3){width:95%}.sp-skeleton i:nth-child(4){width:45%;margin-top:auto}.sp-about{padding:120px clamp(20px,8vw,120px);display:grid;grid-template-columns:1fr 2fr;gap:40px;background:#222522}.sp-about>div>p{font-size:20px;color:var(--sp-muted);max-width:660px;line-height:1.5;margin:32px 0 0}.sp-footer{padding:55px clamp(20px,7vw,84px);display:grid;grid-template-columns:1fr auto;gap:35px;border-top:1px solid var(--sp-line);align-items:center}.sp-footer nav{display:flex;gap:28px}.sp-footer>p{grid-column:1/-1;color:var(--sp-muted);margin:0}.sp-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@keyframes sp-spin{to{transform:rotate(360deg)}}
@container (max-width:899px){.sp-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sp-title{font-size:clamp(72px,15vw,130px)}.sp-hero{min-height:650px}.sp-pinwheel{left:19%}.sp-ribbon{right:14%}}
@container (max-width:599px){.sp-header{height:72px}.sp-nav,.sp-header-action{display:none}.sp-menu{display:grid}.sp-mobile-nav{display:flex;position:absolute;z-index:10;top:72px;left:20px;right:20px;background:#171a18;border:1px solid var(--sp-line);padding:18px;flex-direction:column;gap:4px;transform:translateY(-10px);opacity:0;pointer-events:none}.sp-mobile-nav[data-open=true]{transform:none;opacity:1;pointer-events:auto}.sp-mobile-nav a{padding:12px}.sp-hero{min-height:590px;padding-top:75px}.sp-title{font-size:clamp(58px,19vw,104px)}.sp-title span:last-child{text-align:left;margin-top:20px}.sp-pinwheel{width:88px;left:12%;top:8px}.sp-ribbon{width:75px;right:10%;top:42%}.sp-support{font-size:18px;bottom:126px;right:20px}.sp-cta{left:20px;right:auto;bottom:54px}.sp-catalog{padding-top:75px;padding-bottom:75px}.sp-section-heading,.sp-about{grid-template-columns:1fr;gap:18px}.sp-toolbar{grid-template-columns:1fr}.sp-grid{grid-template-columns:1fr}.sp-card{min-height:285px}.sp-notice{align-items:flex-start;flex-direction:column}.sp-footer{grid-template-columns:1fr}.sp-footer nav{flex-wrap:wrap}.sp-footer>p{grid-column:auto}}
@media(prefers-reduced-motion:reduce){.sp-page *{animation-duration:.001ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important}}
`

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1200
 */
export default function SkillpathPage({ brandColor = "#0ae448", typography, style }) {
    const [menuOpen, setMenuOpen] = useState(false)
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "") || "skillpath"
    const font = typography?.fontFamily || "'DM Sans', 'Segoe UI', sans-serif"
    const rootStyle = { ...style, "--sp-brand": brandColor, "--sp-font": font, "--sp-weight": typography?.fontWeight || 400, "--sp-font-style": typography?.fontStyle || "normal" }
    return <div className="sp-page" id="home" style={rootStyle} data-framer-component="SkillpathPage">
        <style>{styles}</style>
        <aside className="sp-announcement" aria-label="Announcement">Learn without limits. Build what comes next.</aside>
        <header className="sp-header"><a className="sp-brand" href="#home" aria-label="Skillpath home">Skillpath</a><nav className="sp-nav" aria-label="Primary navigation"><a href="#courses">Courses</a><a href="#about">Why Skillpath</a><a href="https://github.com/iamsankeerth/skillpath-framer-assignment" target="_blank" rel="noreferrer">Repository</a></nav><a className="sp-header-action" href="#courses">Explore courses</a><button className="sp-menu" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen(value => !value)}><Icon name={menuOpen ? "close" : "menu"} size={22}/></button><nav className="sp-mobile-nav" data-open={menuOpen} aria-label="Mobile navigation"><a href="#courses" onClick={() => setMenuOpen(false)}>Courses</a><a href="#about" onClick={() => setMenuOpen(false)}>Why Skillpath</a><a href="https://github.com/iamsankeerth/skillpath-framer-assignment" target="_blank" rel="noreferrer">Repository</a></nav></header>
        <section className="sp-hero" aria-labelledby="sp-title"><h1 className="sp-title" id="sp-title"><span>Learn</span><span>Everything</span></h1><HeroArt idPrefix={uid}/><p className="sp-support"><span aria-hidden="true">{"{"}</span><span>Practical courses for every skill you want to build next.</span><span aria-hidden="true">{"}"}</span></p><a className="sp-cta" href="#courses">Explore courses <Icon name="arrow" size={21}/></a></section>
        <main><Catalog/><section className="sp-about" id="about" aria-labelledby="sp-about-title"><p className="sp-kicker">{"{"} Why Skillpath {"}"}</p><div><h2 id="sp-about-title">Learning that keeps pace with where you are going.</h2><p>Clear course information, transparent regional pricing, and practical subjects make it easier to choose the right next step.</p></div></section></main>
        <footer className="sp-footer"><a className="sp-brand" href="#home">Skillpath</a><nav aria-label="Footer navigation"><a href="#home">Home</a><a href="#courses">Courses</a><a href="https://github.com/iamsankeerth/skillpath-framer-assignment" target="_blank" rel="noreferrer">Repository</a></nav><p>© 2026 Skillpath. Built for the Webveda assignment.</p></footer>
    </div>
}

SkillpathPage.defaultProps = { brandColor: "#0ae448", typography: { fontFamily: "DM Sans", fontWeight: 400, fontStyle: "normal" } }

addPropertyControls(SkillpathPage, {
    brandColor: { type: ControlType.Color, title: "Brand Colour", defaultValue: "#0ae448" },
    typography: { type: ControlType.Font, title: "Typography", controls: "basic", displayFontSize: false, displayTextAlignment: false },
})
