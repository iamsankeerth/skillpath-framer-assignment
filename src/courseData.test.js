import { describe, expect, it } from "vitest"
import {
  filterCourses,
  formatPrice,
  sortCourses,
  validateCourses,
  validatePricingRegion,
} from "./courseData"

const course = {
  courseName: "Product Strategy",
  courseCode: "PS-101",
  description: "Learn practical product strategy.",
  mainCategory: "Business",
  shortCourse: "Strategy",
  courseType: "Self-paced",
  pricePaise: 199900,
  priceUsdCents: 3999,
  refundable: true,
}

describe("course validation", () => {
  it("accepts valid courses and omits invalid items", () => {
    expect(validateCourses([course, { ...course, courseCode: "" }])).toEqual([course])
  })

  it("distinguishes an empty catalog from wholly invalid data", () => {
    expect(validateCourses([])).toEqual([])
    expect(() => validateCourses([{ courseName: "Incomplete" }])).toThrow("invalid-data")
  })

  it("accepts only supported pricing regions", () => {
    expect(validatePricingRegion({ country_code: "IN" })).toBe("IN")
    expect(validatePricingRegion({ country_code: "US" })).toBe("US")
    expect(() => validatePricingRegion({ country_code: "GB" })).toThrow("invalid-data")
  })
})

describe("catalog helpers", () => {
  it("formats INR and USD from minor units", () => {
    expect(formatPrice(course, "IN")).toBe("₹1,999")
    expect(formatPrice(course, "US")).toBe("$39.99")
  })

  it("searches Course Type and category without searching course codes", () => {
    expect(filterCourses([course], "self-paced")).toEqual([course])
    expect(filterCourses([course], "business")).toEqual([course])
    expect(filterCourses([course], "PS-101")).toEqual([])
  })

  it("sorts prices stably and preserves Featured Order", () => {
    const samePrice = { ...course, courseName: "Leadership", courseCode: "LD-102" }
    const lowerPrice = {
      ...course,
      courseName: "Writing",
      courseCode: "WR-103",
      pricePaise: 99900,
    }
    const courses = [course, samePrice, lowerPrice]

    expect(sortCourses(courses, "featured", "IN")).toBe(courses)
    expect(sortCourses(courses, "price-low", "IN").map((item) => item.courseCode)).toEqual([
      "WR-103",
      "PS-101",
      "LD-102",
    ])
  })
})
