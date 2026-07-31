---
title: "Jenkins"
sidebar_label: "Jenkins"
sidebar_position: 15
---

# Jenkins

Jenkins is the original, most widely deployed open-source automation server — self-hosted, plugin-driven, and still the backbone of CI/CD in many established enterprises.

**Docs:** [jenkins.io/doc](https://www.jenkins.io/doc/)

---

## Why Jenkins Still Matters

```
Jenkins predates GitHub Actions and GitLab CI by over a decade (2011 vs 2018).
Still extremely common in:
  Large enterprises with existing Jenkins investment
  On-premises / air-gapped environments (no SaaS CI allowed)
  Highly customized pipelines needing specific plugins
  Organizations using multiple SCM providers (not just GitHub or GitLab)

Trade-offs vs GitHub Actions / GitLab CI:
  Pro:  full control, self-hosted, enormous plugin ecosystem (1800+ plugins),
        works with any SCM
  Con:  you manage the infrastructure, upgrades, and security yourself;
        steeper learning curve; UI feels dated compared to modern SaaS tools
```

---

## Installation

```bash
# Docker (quickest way to try Jenkins)
docker run -d -p 8080:8080 -p 50000:50000 \
    -v jenkins_home:/var/jenkins_home \
    jenkins/jenkins:lts

# Native install (Ubuntu)
sudo apt update
sudo apt install openjdk-17-jre
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list
sudo apt update
sudo apt install jenkins
sudo systemctl start jenkins

# Initial setup at http://localhost:8080
cat /var/jenkins_home/secrets/initialAdminPassword    # unlock key
```

---

## Core Concepts

```
Job/Project:  a single automation task (build, test, deploy)
Pipeline:      a job defined as code (Jenkinsfile) — modern approach
Freestyle job: a job configured entirely through the UI — legacy approach, avoid for new work
Node/Agent:    a machine that executes builds (the "controller" schedules; "agents" execute)
Executor:       a slot on an agent that can run one build at a time
Plugin:         extends Jenkins functionality (SCM integrations, notifications, etc.)
```

---

## Declarative Pipeline (Jenkinsfile)

The modern, recommended syntax — a `Jenkinsfile` committed to your repo, just like `.gitlab-ci.yml` or GitHub Actions workflows.

```groovy
// Jenkinsfile
pipeline {
    agent any                          // run on any available agent

    environment {
        NODE_ENV = 'production'
        DEPLOY_KEY = credentials('deploy-ssh-key')   // pulled from Jenkins Credentials store
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    triggers {
        pollSCM('H/5 * * * *')          // poll for changes every ~5 minutes
        // or use a webhook (preferred — instant, no polling delay)
        cron('H 2 * * *')                // nightly build
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint & Test') {
            parallel {
                stage('Lint') {
                    steps { sh 'npm run lint' }
                }
                stage('Test') {
                    steps { sh 'npm test' }
                    post {
                        always {
                            junit 'test-results/*.xml'
                        }
                    }
                }
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }

        stage('Deploy to Staging') {
            when {
                branch 'main'
            }
            steps {
                sh './deploy.sh staging'
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Deploy to production?', ok: 'Deploy'   // manual approval gate
                sh './deploy.sh production'
            }
        }
    }

    post {
        always {
            cleanWs()                     // clean workspace after every build
        }
        success {
            slackSend(color: 'good', message: "Build #${env.BUILD_NUMBER} succeeded")
        }
        failure {
            slackSend(color: 'danger', message: "Build #${env.BUILD_NUMBER} failed")
            mail to: 'team@example.com', subject: "Build failed: ${env.JOB_NAME}", body: "${env.BUILD_URL}"
        }
    }
}
```

---

## Scripted Pipeline (Legacy, More Flexible)

```groovy
// Full Groovy scripting power — used when Declarative isn't flexible enough
node {
    stage('Checkout') {
        checkout scm
    }

    stage('Build') {
        try {
            sh 'npm ci && npm run build'
        } catch (Exception e) {
            currentBuild.result = 'FAILURE'
            throw e
        }
    }

    stage('Deploy') {
        if (env.BRANCH_NAME == 'main') {
            def environments = ['staging', 'production']
            for (env in environments) {
                sh "./deploy.sh ${env}"
            }
        }
    }
}

// Most teams should prefer Declarative — it's more readable, has better
// validation, and covers 95% of use cases. Scripted is an escape hatch.
```

---

## Agents and Distributed Builds

```groovy
pipeline {
    agent {
        label 'linux && docker'          // run on an agent matching these labels
    }
    // or per-stage agents:
    stages {
        stage('Build on Linux') {
            agent { label 'linux' }
            steps { sh 'make build' }
        }
        stage('Build on Windows') {
            agent { label 'windows' }
            steps { bat 'build.bat' }
        }
        stage('Build in Docker') {
            agent {
                docker { image 'node:20' }
            }
            steps { sh 'npm ci && npm test' }
        }
    }
}
```

```
Setting up agents:
  Permanent agents: SSH into a long-running machine, install Java, connect
  Cloud agents: dynamically provisioned (Kubernetes plugin, EC2 plugin, Docker plugin)
  Agents run the actual build steps; the controller only schedules and tracks state

Kubernetes-based agents (common in modern setups):
  agent {
      kubernetes {
          yaml '''
              apiVersion: v1
              kind: Pod
              spec:
                containers:
                - name: node
                  image: node:20
                  command: [cat]
                  tty: true
          '''
      }
  }
  steps {
      container('node') {
          sh 'npm ci && npm test'
      }
  }
```

---

## Credentials Management

```groovy
// Jenkins Credentials store (Manage Jenkins → Credentials) keeps secrets out of the Jenkinsfile

pipeline {
    agent any
    environment {
        // Secret text
        API_KEY = credentials('api-key-id')

        // Username/password — creates API_KEY_USR and API_KEY_PSW automatically
        DOCKER_CREDS = credentials('docker-hub-creds')
    }
    stages {
        stage('Deploy') {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'deploy-key', keyFileVariable: 'SSH_KEY')]) {
                    sh 'scp -i $SSH_KEY app.tar.gz user@server:/opt/app/'
                }
            }
        }
    }
}
```

---

## Shared Libraries — Reusable Pipeline Code

```groovy
// vars/deployApp.groovy in a shared library repo
def call(String environment) {
    sh "echo Deploying to ${environment}"
    sh "./deploy.sh ${environment}"
}
```

```groovy
// Jenkinsfile — using the shared library
@Library('my-shared-library') _

pipeline {
    agent any
    stages {
        stage('Deploy') {
            steps {
                deployApp('production')     // calls the shared function
            }
        }
    }
}

// Configure the library: Manage Jenkins → System → Global Pipeline Libraries
// Point it at a git repo containing vars/*.groovy files
// This is Jenkins' answer to GitHub's reusable workflows / GitLab's includes
```

---

## Essential Plugins

```
Pipeline:               core plugin for Jenkinsfile support
Git:                     Git SCM integration
GitHub / GitHub Branch Source:  webhook triggers, PR builds, status checks
Credentials Binding:     secure secret injection
Blue Ocean:               modern visual pipeline UI (alternative to classic UI)
Docker Pipeline:          build/run Docker containers from pipelines
Kubernetes:                dynamic agent provisioning on K8s
JUnit:                     test result reporting/visualization
Slack Notification:        Slack integration
Artifactory / Nexus:       artifact repository integration
Ansible:                    run Ansible playbooks
Terraform:                   Terraform plan/apply integration
```

---

## Multibranch Pipelines

```
A Multibranch Pipeline job automatically discovers branches (and PRs) in
a repository and creates a separate pipeline run for each — using the
Jenkinsfile found in that branch.

Setup:
  New Item → Multibranch Pipeline → point at your SCM
  Jenkins scans the repo, finds branches with a Jenkinsfile, builds each

Benefit: no manual job configuration per branch/PR — Jenkins auto-manages
the job list as branches are created and deleted, mirroring GitHub Actions'
built-in per-branch/PR behavior.
```

---

## Jenkins vs GitHub Actions vs GitLab CI

```
                Jenkins            GitHub Actions        GitLab CI
Hosting         Self-hosted        SaaS (or self-hosted)  SaaS (or self-hosted)
Config          Jenkinsfile         YAML workflows          .gitlab-ci.yml
Language        Groovy               YAML + shell            YAML + shell
Plugin ecosystem Enormous (1800+)   Marketplace (growing)   Templates + includes
Setup effort    High (self-managed) Low (built into GitHub) Low (built into GitLab)
Best for        Enterprise/legacy,   GitHub-centric teams    GitLab-centric teams,
                on-prem, complex                              built-in DevOps suite
                custom needs
```

---

## How Jenkins Actually Executes a Pipeline

```
Jenkins' architecture is CONTROLLER/AGENT — deliberately similar in
shape to GitLab's server/runner and GitHub's coordinator/runner split,
because this "central brain, distributed execution" pattern is the
natural solution to the same problem every CI system faces:

  1. The CONTROLLER (the main Jenkins process) is where you configure
     jobs, view pipeline definitions, and where the WEB UI lives —
     it does NOT typically execute your actual build steps directly
     in production setups (running builds on the controller itself
     is possible but discouraged — resource contention, security risk)
  2. When a build is triggered (webhook, poll, manual, schedule), the
     controller reads the Jenkinsfile and determines EXECUTOR
     requirements from `agent { label '...' }` blocks
  3. The controller looks for a connected AGENT with a matching label
     and a free EXECUTOR slot
  4. Work is dispatched to that agent over a persistent connection
     (JNLP/WebSocket for permanent agents, or dynamically provisioned
     for cloud agents — Kubernetes pods, EC2 instances spun up on demand)
  5. The agent executes the `steps` from the Jenkinsfile locally,
     streaming console output back to the controller in real time
  6. Artifacts (`archiveArtifacts`) are copied back to the CONTROLLER's
     storage, not kept only on the agent — this is why archived
     artifacts survive even if the agent that built them is later
     torn down (especially relevant for ephemeral cloud agents)

Groovy execution model (why Jenkinsfiles feel different from YAML-based
CI configs): a Jenkinsfile is ACTUAL CODE executed by a Groovy
interpreter running INSIDE the controller's JVM (in a sandboxed mode
for Declarative Pipeline) — this is why Jenkins pipelines can do
arbitrary programming logic (loops, conditionals, function calls) that
YAML-based systems (GitHub Actions, GitLab CI) can only approximate
through their more limited expression syntax and matrix features.
This power is also Jenkins' biggest operational risk surface — a
poorly sandboxed Scripted Pipeline can do almost anything the
controller's JVM process can do.
```

---

## Troubleshooting Guide

```
"Build stuck in queue, never starts"
  No agent with a matching label is currently connected/idle
  Manage Jenkins → Nodes — check agent online status and current load
  Common cause with cloud agents: the cloud plugin (Kubernetes/EC2)
  failed to provision a new agent — check that plugin's own logs

"Jenkinsfile syntax error / 'No such DSL method'"
  Usually: using a plugin-provided step that isn't installed, or a
  typo in a stage/step keyword
  Use the "Pipeline Syntax" generator in the Jenkins UI (Job → Pipeline
  Syntax) — it builds correct syntax for any installed plugin's steps

"Credentials not available in pipeline / 'ERROR: myapp-token' undefined"
  Credential ID mismatch between what's in Manage Jenkins → Credentials
  and what the Jenkinsfile references — copy the exact ID, don't retype it

"Pipeline works on one agent but fails on another"
  Agents aren't guaranteed identical environments unless you've made
  them so (different installed tool versions, different OS)
  Prefer the `agent { docker { image '...' } }` pattern — pins the
  exact execution environment per-stage regardless of which physical
  agent picks up the job, eliminating this entire class of problem

"Shared Library function not found"
  Library not correctly configured under Manage Jenkins → System →
  Global Pipeline Libraries, or the @Library annotation's name
  doesn't match what's registered there, or missing the trailing
  underscore: @Library('my-lib') _  (the underscore is required syntax,
  easy to accidentally omit)
```

---

## Tips

- Prefer Declarative Pipeline over Scripted for all new work — better validation, more readable, and Scripted's flexibility is rarely needed.
- Use Multibranch Pipelines instead of manually creating a job per branch — it mirrors how GitHub Actions/GitLab CI handle branches automatically.
- Move secrets into the Credentials store immediately — never hardcode them in a Jenkinsfile, which is often visible to anyone with repo read access.
- Shared Libraries are essential once you have more than a handful of Jenkinsfiles with duplicated logic — invest in them early.
- If starting a brand-new project with no existing Jenkins investment, seriously consider GitHub Actions or GitLab CI first — Jenkins' operational overhead (patching, plugin compatibility, agent management) is real and ongoing.

---

## Summary

- Jenkins is a self-hosted, plugin-driven automation server — still dominant in enterprises with existing investment or strict on-prem requirements.
- `Jenkinsfile` (Declarative Pipeline) defines `stages` containing `steps`; `agent` controls where each stage runs.
- `when { branch 'main' }` for conditional stages; `input` for manual approval gates; `post { success/failure }` for notifications.
- Agents can be permanent machines, cloud-provisioned, or Kubernetes pods — the controller schedules, agents execute.
- Credentials store keeps secrets out of Jenkinsfiles; Shared Libraries provide reusable pipeline code across many repos.
- Multibranch Pipeline jobs auto-discover branches/PRs and build each using its own Jenkinsfile.
