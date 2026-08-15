# Skillpath Framer Assignment

Work-in-progress implementation of a Framer course catalog for the Skillpath junior developer assignment.

The component is intended to load courses from live APIs while keeping each pricing request independent. If a price cannot be loaded, the course remains visible with `Price unavailable` and a retry action instead of guessing a currency or hiding the course.

## Project Documents

- [Functional plan](./PLAN.md)
- [Domain glossary](./CONTEXT.md)

## Repository Structure

- `README.md` provides the project overview and current status.
- `PLAN.md` records the agreed functional behavior and acceptance criteria.
- `CONTEXT.md` defines the domain language used throughout the implementation.

## Status

The functional requirements and data behavior are documented. Component implementation and Framer verification are the next milestones.

The original assignment brief is intentionally not included in this public repository.
