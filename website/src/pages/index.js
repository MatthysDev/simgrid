import React from 'react'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import CodeBlock from '@theme/CodeBlock'
import styles from './index.module.css'

const FEATURES = [
  { emoji: '🎛️', title: 'Interactive picker', body: 'Pick one or many simulators, emulators or physical devices. Your last choice is pre-checked.' },
  { emoji: '🚀', title: 'Parallel launch', body: 'Run a project on several devices at once — one Metro per project, reused across all of them.' },
  { emoji: '🔍', title: 'Dev-build aware', body: 'Detects which devices already have your dev build for instant launch; builds the rest, remembering how.' },
  { emoji: '🔌', title: 'No port conflicts', body: 'Allocates a free Metro port per project and deep-links the Expo dev client automatically.' },
  { emoji: '🧭', title: 'Knows who runs what', body: 'A shared, self-healing registry tracks every session and survives crashes and kill -9.' },
  { emoji: '📋', title: 'logs · doctor · profiles', body: 'Stream device logs, check your toolchain, and replay saved device sets in one command.' },
]

const SAMPLE = `$ simgrid status
● Storefront → iPhone 15 (Metro :8081, pid 41201)
● Storefront → iPhone SE (3rd gen) (Metro :8081, pid 41201)
● Dashboard → Pixel 7 (Metro :8082, pid 41588)
● Chat → iPhone 15 — simgrid (Metro :8083, pid 41922)`

function copyInstall() {
  navigator.clipboard.writeText('npm i -g simgrid-cli')
}

export default function Home() {
  return (
    <Layout title="simgrid" description="One grid for all your simulators — run multiple Expo projects on multiple devices, in parallel.">
      <header className={styles.hero}>
        <div className="container">
          <h1 className={styles.title}>simgrid</h1>
          <p className={styles.tagline}>
            One grid for all your simulators. Run multiple Expo projects on multiple devices — in parallel,
            without the alt-tab dance.
          </p>
          <div className={styles.install}>
            <span className="prompt" style={{ color: 'var(--ifm-color-primary)' }}>$</span>
            <span>npm i -g simgrid-cli</span>
            <button onClick={copyInstall}>copy</button>
          </div>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/intro">Get started →</Link>
            <Link className="button button--secondary button--lg" to="/docs/commands">Commands</Link>
            <Link className="button button--secondary button--lg" href="https://github.com/MatthysDev/simgrid">GitHub</Link>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              {FEATURES.map((f) => (
                <div className="col col--4" key={f.title}>
                  <div className={styles.feature}>
                    <div className={styles.emoji}>{f.emoji}</div>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className={styles.terminalWrap}>
          <CodeBlock language="bash" title="One glance at everything running">{SAMPLE}</CodeBlock>
        </div>
      </main>
    </Layout>
  )
}
