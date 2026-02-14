import clsx from 'clsx';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        {/* MindStaack Logo */}
        <img
          src="/Mindstack/img/logo.svg"
          alt="MindStack Logo"
          style={{maxWidth: '200px', marginBottom: '1.5rem'}}
        />
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
      </div>
    </header>
  );
}

export default function Home() {
  return (
    <Layout
      title="Welcome to MindStaack"
      description="My personal IT knowledge hub">
      <HomepageHeader />
      <main style={{padding: '2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6'}}>
        <p>
          Welcome to MindStack, my personal IT knowledge hub. If you stumbled here by accident, this is my space to document everything I learn about IT — from tips and tricks to configurations, scripts, and best practices.
        </p>
        <p>
          If you notice errors or have suggestions to improve the content, feel free to reach out through any contact method you prefer. I appreciate your feedback, but I cannot guarantee all suggestions will be implemented.
        </p>
      </main>
    </Layout>
  );
}
