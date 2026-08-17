export const API_BASE_URL = "https://syncsphere-hiv6.onrender.com"
export const COURSE_DATA_URL = `${API_BASE_URL}/assignment/course-data`
export const PRICING_REGION_URL = `${API_BASE_URL}/assignment/country-code`

const REQUIRED_COURSE_STRINGS = [
  "courseName",
  "courseCode",
  "description",
  "mainCategory",
  "shortCourse",
  "courseType",
]

function createResourceError(kind) {
  const error = new Error(kind)
  error.kind = kind
  return error
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function isValidCourse(course) {
  if (!isRecord(course)) return false

  const hasStrings = REQUIRED_COURSE_STRINGS.every(
    (key) => typeof course[key] === "string" && course[key].trim().length > 0,
  )
  const hasPrices = [course.pricePaise, course.priceUsdCents].every(
    (price) => Number.isInteger(price) && price >= 0,
  )

  return hasStrings && hasPrices && typeof course.refundable === "boolean"
}

export function validateCourses(payload) {
  if (!Array.isArray(payload)) throw createResourceError("invalid-data")
  if (payload.length === 0) return []

  const validCourses = payload.filter(isValidCourse)
  if (validCourses.length === 0) throw createResourceError("invalid-data")
  return validCourses
}

export function validatePricingRegion(payload) {
  if (!isRecord(payload) || !["IN", "US"].includes(payload.country_code)) {
    throw createResourceError("invalid-data")
  }
  return payload.country_code
}

export async function fetchResource(url, validate, { signal, timeoutMs = 15000 } = {}) {
  const controller = new AbortController()
  let timedOut = false

  const abortFromParent = () => controller.abort()
  signal?.addEventListener("abort", abortFromParent, { once: true })

  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })

    if (!response.ok) throw createResourceError("http")

    let payload
    try {
      payload = await response.json()
    } catch {
      throw createResourceError("invalid-data")
    }

    return validate(payload)
  } catch (error) {
    if (error?.kind) throw error
    if (signal?.aborted) throw createResourceError("aborted")
    if (timedOut) throw createResourceError("timeout")
    throw createResourceError("network")
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener("abort", abortFromParent)
  }
}

export function fetchCourses(options) {
  return fetchResource(COURSE_DATA_URL, validateCourses, options)
}

export function fetchPricingRegion(options) {
  return fetchResource(PRICING_REGION_URL, validatePricingRegion, options)
}

export function filterCourses(courses, query) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return courses

  return courses.filter((course) =>
    [
      course.courseName,
      course.description,
      course.mainCategory,
      course.shortCourse,
      course.courseType,
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
  )
}

export function getPriceMinorUnits(course, pricingRegion) {
  return pricingRegion === "US" ? course.priceUsdCents : course.pricePaise
}

export function sortCourses(courses, sortOrder, pricingRegion) {
  if (sortOrder === "featured" || !pricingRegion) return courses

  const direction = sortOrder === "price-high" ? -1 : 1
  return courses
    .map((course, index) => ({ course, index }))
    .sort((left, right) => {
      const difference =
        getPriceMinorUnits(left.course, pricingRegion) -
        getPriceMinorUnits(right.course, pricingRegion)
      return difference === 0 ? left.index - right.index : difference * direction
    })
    .map(({ course }) => course)
}

export function formatPrice(course, pricingRegion) {
  const minorUnits = getPriceMinorUnits(course, pricingRegion)
  const currency = pricingRegion === "US" ? "USD" : "INR"
  const locale = pricingRegion === "US" ? "en-US" : "en-IN"
  const hasFraction = minorUnits % 100 !== 0

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: pricingRegion === "US" || hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100)
}
