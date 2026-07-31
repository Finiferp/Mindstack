---
title: "Terraform"
sidebar_label: "Terraform"
sidebar_position: 9
---

# Terraform

Terraform is the leading Infrastructure as Code (IaC) tool — define cloud resources declaratively in HCL, and Terraform figures out how to create, update, or destroy them to match.

**Docs:** [developer.hashicorp.com/terraform](https://developer.hashicorp.com/terraform)

---

## Why Infrastructure as Code

```
Without IaC: click through AWS console → undocumented, unrepeatable, error-prone
With IaC: infrastructure defined in version-controlled files

Benefits:
  Reproducible    — spin up identical dev/staging/prod environments
  Reviewable       — infrastructure changes go through pull requests like code
  Auditable        — git history shows exactly what changed, when, and why
  Disaster recovery — rebuild an entire environment from scratch in minutes

Terraform vs alternatives:
  Terraform: multi-cloud, huge provider ecosystem, HCL (declarative)
  CloudFormation: AWS-only, native AWS integration, JSON/YAML
  Pulumi: multi-cloud, uses real programming languages (Python, TS, Go)
  CDK: AWS-only (also CDK for Terraform), generates CloudFormation/Terraform
```

---

## Installation and Workflow

```bash
brew install terraform
terraform version

# The core workflow — memorize this
terraform init      # download providers, initialize backend
terraform plan       # preview changes (dry run)
terraform apply      # create/update infrastructure
terraform destroy    # tear down everything Terraform manages
```

---

## Basic Configuration

```hcl
# main.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name        = "web-server"
    Environment = "production"
  }
}
```

```bash
terraform init
terraform plan
terraform apply
# Type "yes" to confirm, or: terraform apply -auto-approve
```

---

## Resources, Data Sources, and Providers

```hcl
# Provider — which cloud/service Terraform talks to
provider "aws" {
  region  = "us-east-1"
  profile = "production"      # AWS CLI profile
}

# Resource — something Terraform creates and manages
resource "aws_s3_bucket" "data" {
  bucket = "my-app-data-bucket"
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Allow HTTP/HTTPS"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Data source — reads EXISTING infrastructure (doesn't create anything)
data "aws_vpc" "default" {
  default = true
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]   # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id     # reference a data source
  instance_type = "t3.micro"
  subnet_id     = data.aws_vpc.default.id
}
```

---

## Variables and Outputs

```hcl
# variables.tf
variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "instance_count" {
  type    = number
  default = 2
}

variable "instance_type" {
  type = string
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "allowed_cidrs" {
  type = list(string)
}

# Using variables
resource "aws_instance" "web" {
  count         = var.instance_count
  instance_type = var.instance_type
  tags          = merge(var.tags, { Environment = var.environment })
}

# outputs.tf
output "instance_ips" {
  description = "Public IPs of web servers"
  value       = aws_instance.web[*].public_ip
}

output "instance_id" {
  value     = aws_instance.web[0].id
  sensitive = false
}
```

```bash
# Providing variable values
terraform apply -var="instance_type=t3.small"
terraform apply -var-file="production.tfvars"

# terraform.tfvars (auto-loaded)
environment    = "production"
instance_type  = "t3.medium"
instance_count = 5

# Or environment variables
export TF_VAR_instance_type=t3.medium
```

---

## State

```
Terraform State is the source of truth for what Terraform thinks exists.
Stored in terraform.tfstate (JSON) — maps your config to real resource IDs.

CRITICAL: never edit terraform.tfstate manually.
CRITICAL: never commit terraform.tfstate to git (contains sensitive data + is huge)
CRITICAL: use a REMOTE backend for any team/production use (local state = disaster waiting)
```

```hcl
# Remote backend — S3 + DynamoDB (locking) for AWS
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"   # prevents concurrent modifications
    encrypt        = true
  }
}

# Terraform Cloud (HashiCorp's managed backend)
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "production"
    }
  }
}
```

```bash
terraform state list                    # list all resources in state
terraform state show aws_instance.web  # detailed info about one resource
terraform state mv aws_instance.old aws_instance.new  # rename in state
terraform state rm aws_instance.web    # remove from state (doesn't destroy!)
terraform import aws_instance.web i-1234567890  # bring existing resource under management

terraform refresh                       # sync state with real infrastructure (deprecated; use plan -refresh-only)
terraform plan -refresh-only
```

---

## Modules

Modules are reusable, parametrized groups of resources — Terraform's equivalent of functions.

```hcl
# modules/webserver/main.tf
variable "instance_type" { type = string }
variable "environment"   { type = string }

resource "aws_instance" "this" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  tags          = { Environment = var.environment }
}

output "instance_id" {
  value = aws_instance.this.id
}
output "public_ip" {
  value = aws_instance.this.public_ip
}
```

```hcl
# Using the module — root main.tf
module "web_prod" {
  source        = "./modules/webserver"
  instance_type = "t3.medium"
  environment   = "production"
}

module "web_staging" {
  source        = "./modules/webserver"
  instance_type = "t3.micro"
  environment   = "staging"
}

output "prod_ip" {
  value = module.web_prod.public_ip
}
```

```hcl
# Modules from the public Terraform Registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
}
```

```bash
terraform get                # download referenced modules
terraform init                 # also downloads modules
```

---

## Workspaces — Multiple Environments

```bash
# Workspaces let you use the SAME configuration for multiple environments
# (each workspace has its own state file)

terraform workspace new staging
terraform workspace new production
terraform workspace list
terraform workspace select production
terraform workspace show

# Reference in config
resource "aws_instance" "web" {
  instance_type = terraform.workspace == "production" ? "t3.large" : "t3.micro"
  tags = { Environment = terraform.workspace }
}
```

```
Workspaces vs separate directories/modules:
  Workspaces: quick, same config, different state — good for simple env differences
  Separate .tfvars files: more common in practice — explicit, reviewable in PRs
  Separate root modules per environment: most control, most duplication

Most teams prefer: one root module + environment-specific .tfvars files
  terraform apply -var-file=environments/production.tfvars
```

---

## Language Features

```hcl
# Expressions and functions
locals {
  full_name    = "${var.project}-${var.environment}"
  is_production = var.environment == "production"
  common_tags = {
    Project     = var.project
    ManagedBy   = "terraform"
    Environment = var.environment
  }
}

# String interpolation
resource "aws_s3_bucket" "logs" {
  bucket = "${var.project}-logs-${var.environment}"
}

# Conditionals
resource "aws_instance" "web" {
  instance_type = var.environment == "production" ? "t3.large" : "t3.micro"
}

# Count — create multiple instances
resource "aws_instance" "web" {
  count         = 3
  instance_type = "t3.micro"
  tags          = { Name = "web-${count.index}" }
}

# for_each — create resources from a map/set (better than count for named resources)
variable "buckets" {
  type    = set(string)
  default = ["logs", "backups", "assets"]
}

resource "aws_s3_bucket" "this" {
  for_each = var.buckets
  bucket   = "myapp-${each.value}"
}

# Dynamic blocks
resource "aws_security_group" "web" {
  name = "web-sg"

  dynamic "ingress" {
    for_each = var.allowed_ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}

# Common functions
length(var.list)
join(",", var.list)
split(",", var.string)
lookup(var.map, "key", "default")
merge(var.map1, var.map2)
coalesce(var.a, var.b, "default")
file("${path.module}/script.sh")
templatefile("${path.module}/user-data.tftpl", { name = var.name })
jsonencode({ key = "value" })
```

---

## CI/CD for Terraform

```bash
# Typical pipeline steps
terraform fmt -check           # verify formatting
terraform validate             # syntax/logic check (no cloud calls)
terraform plan -out=tfplan     # generate a plan file
terraform show -json tfplan | jq  # inspect the plan programmatically
terraform apply tfplan          # apply the EXACT plan reviewed (no drift between plan and apply)

# tflint — additional linting
tflint

# tfsec / checkov — security scanning
tfsec .
checkov -d .

# Cost estimation
infracost breakdown --path .
```

```yaml
# .github/workflows/terraform.yml (see github-actions.md for full syntax)
- run: terraform fmt -check
- run: terraform init
- run: terraform validate
- run: terraform plan -out=tfplan
- run: terraform apply tfplan   # only on merge to main, with approval gate
```

---

## How Terraform Actually Works Internally

### The Plan/Apply Execution Model

```
Terraform's core algorithm, every single time you run it:

1. READ configuration (.tf files) → build the DESIRED state (a graph of resources)
2. READ current state (terraform.tfstate) → what Terraform believes EXISTS
3. REFRESH (optional/implicit) → query real infrastructure via provider APIs
   to detect drift (has anything changed outside Terraform since last run?)
4. DIFF desired vs current → compute the exact set of create/update/destroy
   actions needed (this diff IS the "plan")
5. Build a DEPENDENCY GRAPH of all these actions (see below)
6. APPLY: execute the actions in dependency order, updating state after
   each successful action

This is conceptually the SAME reconciliation pattern as Kubernetes
controllers (desired state vs actual state, compute the diff, act) —
just run ON DEMAND by a human (`terraform apply`) instead of continuously
by a controller. This is precisely the gap that Terraform Cloud's "drift
detection" and GitOps-for-infra approaches (Atlantis, Terraform Cloud
auto-apply) try to close — turning Terraform's periodic reconciliation
into something closer to continuous reconciliation.
```

### The Dependency Graph

```
Terraform builds a Directed Acyclic Graph (DAG) of every resource,
based on REFERENCES between them — not the order they appear in your files.

resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }

resource "aws_subnet" "web" {
  vpc_id     = aws_vpc.main.id          # ← this reference creates an edge
  cidr_block = "10.0.1.0/24"
}

resource "aws_instance" "web" {
  subnet_id = aws_subnet.web.id          # ← another edge
}

Graph:  aws_vpc.main → aws_subnet.web → aws_instance.web

Terraform automatically knows: create the VPC FIRST, then the subnet,
then the instance — because the subnet's config literally references
a value (the VPC's generated ID) that doesn't exist until the VPC is created.

Resources with NO dependency relationship between them are created IN
PARALLEL — this is why Terraform applies are often much faster than
you'd expect for large configurations; independent resource creation
happens concurrently, not one at a time top-to-bottom.

View the graph:
  terraform graph | dot -Tsvg > graph.svg    # requires Graphviz's 'dot'

Explicit dependencies (when there's no data reference, but ordering
still matters — rare, use sparingly):
  resource "aws_instance" "web" {
    depends_on = [aws_iam_role_policy.web]
  }
```

### State — What It Actually Contains and Why It's Fragile

```
terraform.tfstate is a JSON file mapping:
  Your configuration's resource addresses (aws_instance.web)
      ↓ to ↓
  Real-world resource IDs (i-0a1b2c3d4e5f6789)
      ↓ plus ↓
  A cached copy of ALL that resource's current attributes

This cached copy is WHY `terraform plan` can run fast without querying
every single API for every single resource on every single run (though
it does refresh by default) — and it's also WHY state can drift out of
sync with reality if someone changes something outside Terraform.

The state file is Terraform's ONLY way of knowing "this resource,
which I don't see in my current .tf files, used to exist and I created
it" — this is precisely how `terraform destroy` and resource removal
work: if a resource block is deleted from your .tf files but still
exists in state, Terraform knows to destroy it on the next apply.

If state doesn't match reality (someone manually deleted a resource,
or manually created one outside Terraform):
  terraform plan will show a very confusing diff (trying to "fix"
  things that don't need fixing, or missing things it doesn't know about)
  terraform apply -refresh-only    — sync state with reality without
                                     changing any actual infrastructure
  terraform import                  — bring an existing, unmanaged
                                     resource under Terraform's management

This fragility is exactly why remote state with locking (S3+DynamoDB,
Terraform Cloud) is non-negotiable for team use — two people running
`terraform apply` against the same LOCAL state file simultaneously
will corrupt it, because there's no locking mechanism protecting a
plain local file.
```

### Providers — How Terraform Talks to the Real World

```
A provider is a plugin (a separate compiled binary) that Terraform's
core downloads and runs as a subprocess. Terraform core itself knows
NOTHING about AWS, GCP, Kubernetes, or any specific API — it only
knows the generic plan/state/graph/apply engine described above.

  terraform core (generic engine)
       │ RPC (gRPC) calls
       ▼
  aws provider binary  ── knows how to CRUD EC2 instances, S3 buckets, etc.
  kubernetes provider   ── knows how to CRUD K8s resources
  vault provider          ── knows how to CRUD Vault secrets/policies

This plugin architecture is WHY Terraform supports 1000+ providers
covering almost any API-driven system, and why anyone can write a
custom provider for an internal/niche system — it just needs to
implement the standard CRUD interface the Terraform core expects.

terraform init downloads the specific provider binaries your
configuration requires (into .terraform/providers/) — this is why
init must be re-run whenever you add a new provider or change a
version constraint.
```

---

## Troubleshooting Guide

```
"Error: resource already exists" on apply
  Someone/something created this resource OUTSIDE Terraform, or the
  state file lost track of it
  Fix: terraform import <resource_address> <real_resource_id>

"Plan shows changes I didn't make" (unexpected diff)
  Usually: drift — something changed the real resource outside Terraform
  (manual console edit, another automation tool, the provider's own
  default value behavior changing between versions)
  terraform plan -refresh-only  — see exactly what drifted, without
                                  proposing to "fix" it yet

"Error acquiring the state lock"
  Another terraform apply/plan is currently running (DynamoDB lock held),
  OR a previous run crashed without releasing the lock
  terraform force-unlock <lock-id>   — use ONLY if you're certain no
                                       other process is actually running

"Cycle: resource A depends on resource B depends on resource A"
  A genuine circular dependency in your configuration — restructure,
  often by extracting a shared value into a variable/data source both
  can reference instead of referencing each other directly

State file grew huge / plan is slow
  Very large configurations benefit from splitting into multiple state
  files (one per logical component: networking, database, application)
  using separate root modules — reduces blast radius of any single
  apply and speeds up plan/apply for each piece independently
```

---

## Tips

- Always use a remote backend with locking (S3+DynamoDB, Terraform Cloud) for any shared/production infrastructure — local state guarantees eventual disaster.
- Run `terraform plan` and review it carefully before every `apply` — never blindly `-auto-approve` in production.
- Use `for_each` instead of `count` when creating multiple similarly-configured resources with distinct identities — it avoids the "everything shifts by one index" problem when you remove an item from the middle of a list.
- Pin provider versions with `~>` (e.g. `~> 5.0` allows 5.x but not 6.0) — unpinned providers can introduce breaking changes silently.
- `terraform state rm` removes something from Terraform's management WITHOUT destroying the real resource — useful when splitting state or fixing mistakes.

---

## Summary

- Core workflow: `terraform init` → `plan` → `apply` → `destroy`.
- Resources are things Terraform creates; data sources read existing infrastructure without managing it.
- State is the source of truth — always use a remote, locked backend for team/production work.
- Modules make configuration reusable — use the public registry (`terraform-aws-modules/*`) before writing your own for common patterns.
- Variables + `.tfvars` files parametrize configuration per environment; outputs expose values for use elsewhere.
- `for_each` over `count` for named resource sets; `terraform plan -out=tfplan` + `apply tfplan` guarantees what you review is exactly what gets applied.
