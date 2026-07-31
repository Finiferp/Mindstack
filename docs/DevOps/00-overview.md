---
title: "DevOps Overview"
sidebar_label: "Overview"
sidebar_position: 0
---

# DevOps Overview

DevOps is the practice of unifying software development (Dev) and IT operations (Ops) to deliver software faster, more reliably, and with tighter feedback loops. This course covers the tools and practices that make that possible — containers, orchestration, CI/CD, infrastructure as code, cloud platforms, and observability.

---


## The DevOps Toolchain Map

```
PLAN        CODE         BUILD        TEST         RELEASE       DEPLOY        OPERATE       MONITOR
──────      ──────       ──────       ──────       ──────        ──────        ──────        ──────
Jira        Git          Docker       pytest       GitHub        Kubernetes    Ansible       Prometheus
Linear      GitHub       Maven/npm    Jest         Actions       Argo CD       Terraform     Grafana
Confluence  GitLab       Terraform    Selenium     GitLab CI     Helm          Vault         ELK Stack
                                      SonarQube    Jenkins       Docker        Chef/Puppet   Datadog
                                                                 Compose                     Jaeger
```

## Official Resources

| Resource | Link |
|---|---|
| Docker Docs | [docs.docker.com](https://docs.docker.com) |
| Kubernetes Docs | [kubernetes.io/docs](https://kubernetes.io/docs) |
| Terraform Docs | [developer.hashicorp.com/terraform](https://developer.hashicorp.com/terraform) |
| Ansible Docs | [docs.ansible.com](https://docs.ansible.com) |
| GitHub Actions Docs | [docs.github.com/actions](https://docs.github.com/en/actions) |
| GitLab CI Docs | [docs.gitlab.com/ee/ci](https://docs.gitlab.com/ee/ci/) |
| AWS Docs | [docs.aws.amazon.com](https://docs.aws.amazon.com) |
| Prometheus Docs | [prometheus.io/docs](https://prometheus.io/docs) |
| CNCF Landscape | [landscape.cncf.io](https://landscape.cncf.io) — map of the entire cloud-native ecosystem |

---

## What "DevOps" Actually Means

```
Not a tool. Not a job title (even though "DevOps Engineer" exists everywhere).
A DevOps culture combines:

  Development practices:        Operations practices:
    Version control                Infrastructure as Code
    Continuous Integration         Configuration management
    Automated testing              Monitoring and alerting
    Code review                    Incident response
                                    Capacity planning

The goal: shrink the time between "code is written" and
"code is running safely in production" — and make that path repeatable,
automated, and observable at every step.

Key shift in thinking:
  Old: "Ops throws it over the wall after Dev finishes"
  New: "Dev and Ops share responsibility for the whole lifecycle"
```

## Tips

- Don't try to master every tool in this course — pick the stack relevant to your job (e.g. AWS + Terraform + GitHub Actions + Kubernetes is a common combination) and go deep there first.
- The CNCF Landscape (landscape.cncf.io) is overwhelming at first glance — this course covers the tools that appear in the vast majority of real job postings and production stacks.
- Hands-on practice matters more than reading for DevOps tools — spin up a local Kubernetes cluster (`kind` or `minikube`) and actually break things.
- Most DevOps tools share philosophy even when syntax differs: declarative configuration, idempotency, version control everything, automate the repeatable, observe everything.
