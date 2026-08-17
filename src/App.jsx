import Hero from "./Hero"
import CourseCatalog from "./CourseCatalog"

export default function App() {
  return (
    <div className="site-shell" id="home">
      <Hero />

      <main>
        <CourseCatalog />

        <section className="about-band" id="about" aria-labelledby="about-title">
          <p className="section-kicker" aria-hidden="true">
            {"{"} Why Skillpath {"}"}
          </p>
          <h2 id="about-title">Learning that keeps pace with where you are going.</h2>
          <p>
            Clear course information, transparent regional pricing, and practical subjects
            make it easier to choose the right next step.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#home" aria-label="Skillpath home">
          Skillpath
        </a>
        <nav aria-label="Footer navigation">
          <a href="#home">Home</a>
          <a href="#courses">Courses</a>
          <a
            href="https://github.com/iamsankeerth/skillpath-framer-assignment"
            target="_blank"
            rel="noreferrer"
          >
            Repository
          </a>
        </nav>
        <p>© 2026 Skillpath. Built for the Webveda assignment.</p>
      </footer>
    </div>
  )
}
