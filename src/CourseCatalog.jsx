import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { RefreshCw, Search, X } from "lucide-react"
import {
  fetchCourses,
  fetchPricingRegion,
  filterCourses,
  formatPrice,
  sortCourses,
} from "./courseData"

const LOADING_STATE = { status: "loading" }

function RetryButton({ children, loading, onClick, buttonRef }) {
  return (
    <button
      className="retry-button"
      type="button"
      onClick={onClick}
      disabled={loading}
      ref={buttonRef}
    >
      <RefreshCw size={17} aria-hidden="true" className={loading ? "is-spinning" : ""} />
      {loading ? "Retrying..." : children}
    </button>
  )
}

function CourseSkeletons() {
  return (
    <div className="course-grid" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <article className="course-card course-card--skeleton" key={index}>
          <span className="skeleton-line skeleton-line--small" />
          <span className="skeleton-line skeleton-line--title" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line--short" />
          <span className="skeleton-line skeleton-line--price" />
        </article>
      ))}
    </div>
  )
}

function CourseCard({ course, pricingState }) {
  let price = "Finding local price..."
  if (pricingState.status === "error") price = "Price unavailable"
  if (pricingState.status === "success") price = formatPrice(course, pricingState.data)

  return (
    <article className="course-card">
      <div className="course-card__meta">
        <p className="course-category">{course.mainCategory}</p>
        {course.refundable ? <span className="refundable-badge">Refundable</span> : null}
      </div>
      <h3>{course.courseName}</h3>
      <p className="course-description">{course.description}</p>
      <div className="course-card__footer">
        <p className="course-type">
          <span>Course Type</span>
          {course.courseType}
        </p>
        <p className="course-price" data-unavailable={pricingState.status === "error"}>
          {price}
        </p>
      </div>
    </article>
  )
}

export default function CourseCatalog({
  brandColor = "#0ae448",
  fontFamily = "'DM Sans', 'Segoe UI', sans-serif",
  style,
}) {
  const [coursesState, setCoursesState] = useState(LOADING_STATE)
  const [pricingState, setPricingState] = useState(LOADING_STATE)
  const [courseRetrying, setCourseRetrying] = useState(false)
  const [pricingRetrying, setPricingRetrying] = useState(false)
  const [query, setQuery] = useState("")
  const [sortOrder, setSortOrder] = useState("featured")

  const coursesController = useRef(null)
  const pricingController = useRef(null)
  const resultSummaryRef = useRef(null)
  const courseRetryRef = useRef(null)
  const pricingRetryRef = useRef(null)
  const searchRef = useRef(null)

  const focusResultSummary = () => {
    window.requestAnimationFrame(() => resultSummaryRef.current?.focus())
  }

  const loadCourses = useCallback(async ({ retry = false } = {}) => {
    coursesController.current?.abort()
    const controller = new AbortController()
    coursesController.current = controller

    if (retry) setCourseRetrying(true)
    else setCoursesState(LOADING_STATE)

    try {
      const courses = await fetchCourses({ signal: controller.signal })
      if (controller.signal.aborted) return
      setCoursesState({ status: "success", data: courses })
      if (retry) focusResultSummary()
    } catch (error) {
      if (error.kind === "aborted") return
      setCoursesState({ status: "error", kind: error.kind })
      if (retry) window.requestAnimationFrame(() => courseRetryRef.current?.focus())
    } finally {
      if (coursesController.current === controller) coursesController.current = null
      if (retry) setCourseRetrying(false)
    }
  }, [])

  const loadPricing = useCallback(async ({ retry = false } = {}) => {
    pricingController.current?.abort()
    const controller = new AbortController()
    pricingController.current = controller

    if (retry) setPricingRetrying(true)
    else setPricingState(LOADING_STATE)

    try {
      const pricingRegion = await fetchPricingRegion({ signal: controller.signal })
      if (controller.signal.aborted) return
      setPricingState({ status: "success", data: pricingRegion })
      if (retry) focusResultSummary()
    } catch (error) {
      if (error.kind === "aborted") return
      setPricingState({ status: "error", kind: error.kind })
      if (retry) window.requestAnimationFrame(() => pricingRetryRef.current?.focus())
    } finally {
      if (pricingController.current === controller) pricingController.current = null
      if (retry) setPricingRetrying(false)
    }
  }, [])

  useEffect(() => {
    loadCourses()
    loadPricing()

    return () => {
      coursesController.current?.abort()
      pricingController.current?.abort()
    }
  }, [loadCourses, loadPricing])

  useEffect(() => {
    if (pricingState.status !== "success" && sortOrder !== "featured") {
      setSortOrder("featured")
    }
  }, [pricingState.status, sortOrder])

  const courses = coursesState.status === "success" ? coursesState.data : []
  const filteredCourses = useMemo(() => filterCourses(courses, query), [courses, query])
  const visibleCourses = useMemo(
    () =>
      sortCourses(
        filteredCourses,
        sortOrder,
        pricingState.status === "success" ? pricingState.data : null,
      ),
    [filteredCourses, pricingState, sortOrder],
  )

  const countLabel = query.trim()
    ? `${visibleCourses.length} of ${courses.length} courses`
    : `${courses.length} ${courses.length === 1 ? "course" : "courses"}`

  const handleSearchKeyDown = (event) => {
    if (event.key === "Escape" && query) {
      event.preventDefault()
      setQuery("")
      searchRef.current?.focus()
    }
  }

  const rootStyle = {
    "--catalog-brand": brandColor,
    "--catalog-font": fontFamily,
    ...style,
  }

  return (
    <section
      className="catalog"
      id="courses"
      aria-labelledby="catalog-title"
      aria-busy={coursesState.status === "loading"}
      style={rootStyle}
    >
      <div className="catalog__inner">
        <header className="catalog-heading">
          <p className="section-kicker" aria-hidden="true">
            {"{"} Course Catalog {"}"}
          </p>
          <div>
            <h2 id="catalog-title">Choose what you learn next.</h2>
            <p>Explore the complete catalog and find the course that fits your next move.</p>
          </div>
        </header>

        {coursesState.status !== "error" ? (
          <div className="catalog-toolbar" role="group" aria-label="Course Catalog controls">
            <label className="catalog-field catalog-search">
              <span>Search courses</span>
              <span className="catalog-control">
                <Search size={18} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Name, category, or Course Type"
                  disabled={coursesState.status === "loading"}
                />
                {query ? (
                  <button
                    className="clear-search"
                    type="button"
                    aria-label="Clear search"
                    title="Clear search"
                    onClick={() => {
                      setQuery("")
                      searchRef.current?.focus()
                    }}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                ) : null}
              </span>
            </label>

            <label className="catalog-field catalog-sort">
              <span>Sort courses</span>
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                disabled={coursesState.status === "loading"}
              >
                <option value="featured">Featured</option>
                <option value="price-low" disabled={pricingState.status !== "success"}>
                  Price: Low to High
                </option>
                <option value="price-high" disabled={pricingState.status !== "success"}>
                  Price: High to Low
                </option>
              </select>
            </label>
          </div>
        ) : null}

        {coursesState.status === "error" ? (
          <div className="catalog-state" role="alert">
            <p>Courses couldn&apos;t be loaded.</p>
            <RetryButton
              loading={courseRetrying}
              onClick={() => loadCourses({ retry: true })}
              buttonRef={courseRetryRef}
            >
              Retry courses
            </RetryButton>
          </div>
        ) : null}

        {coursesState.status === "loading" ? (
          <>
            <p className="result-summary result-summary--loading">Loading courses...</p>
            <CourseSkeletons />
          </>
        ) : null}

        {coursesState.status === "success" ? (
          <>
            {pricingState.status === "error" ? (
              <div className="pricing-notice" role="status">
                <p>Local prices couldn&apos;t be loaded. Every course is still available to browse.</p>
                <RetryButton
                  loading={pricingRetrying}
                  onClick={() => loadPricing({ retry: true })}
                  buttonRef={pricingRetryRef}
                >
                  Retry pricing
                </RetryButton>
              </div>
            ) : null}

            <p className="result-summary" ref={resultSummaryRef} tabIndex={-1}>
              {countLabel}
            </p>
            <span className="sr-only" aria-live="polite">
              {countLabel}
            </span>

            {courses.length === 0 ? (
              <div className="catalog-state">
                <p>No courses are available right now.</p>
                <RetryButton onClick={() => loadCourses({ retry: true })} loading={courseRetrying}>
                  Check again
                </RetryButton>
              </div>
            ) : null}

            {courses.length > 0 && visibleCourses.length === 0 ? (
              <div className="catalog-state">
                <p>No courses match your search.</p>
                <button
                  className="retry-button"
                  type="button"
                  onClick={() => {
                    setQuery("")
                    searchRef.current?.focus()
                  }}
                >
                  <X size={17} aria-hidden="true" />
                  Clear search
                </button>
              </div>
            ) : null}

            {visibleCourses.length > 0 ? (
              <div className="course-grid">
                {visibleCourses.map((course) => (
                  <CourseCard course={course} pricingState={pricingState} key={course.courseCode} />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  )
}
