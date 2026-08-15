# Skillpath

Skillpath is a learning platform that presents a catalog of courses with pricing appropriate to a learner's market.

## Language

**Course**:
A learning offering that a learner can evaluate through its name, description, category, type, and applicable price.
_Avoid_: Class, product

**Course Catalog**:
The current collection of **Courses** presented by Skillpath. A catalog can legitimately contain no courses.
_Avoid_: Courses section, course grid

**Pricing Region**:
A market designation that determines which currency-specific course price applies to a learner.
_Avoid_: Country, learner country, location

**Course Category**:
The broad subject area used to help learners understand and scan a course.
_Avoid_: Main category, topic

**Course Type**:
A provider-defined classification for a course whose value is presented without reinterpretation.
_Avoid_: Format

**Featured Order**:
The provider-defined ordering of the **Course Catalog**, preserved when a learner has not selected a price order.
_Avoid_: Default order, API order

## Example Dialogue

> **Designer:** Why is this course not showing a price?
>
> **Developer:** The Pricing Region is unavailable, so Skillpath cannot determine which course price applies.
>
> **Designer:** Should the Course Type say "Format" instead?
>
> **Developer:** No. The provider's values do not all describe a format, so Course Type is the accurate label.
>
> **Designer:** The course grid is empty. Did loading fail?
>
> **Developer:** No. The Course Catalog loaded successfully but currently contains no Courses.
>
> **Designer:** What happens when the learner chooses Featured Order?
>
> **Developer:** The Courses return to the order chosen by the provider.
