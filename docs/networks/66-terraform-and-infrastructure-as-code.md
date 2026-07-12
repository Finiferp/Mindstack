---
title: "Terraform and Infrastructure as Code"
sidebar_label: "Terraform & IaC"
sidebar_position: 66
---

# Terraform and Infrastructure as Code

Infrastructure as Code (IaC) treats infrastructure configuration like software — version-controlled, tested, and deployed through pipelines. Terraform is the dominant multi-cloud IaC tool; it is increasingly used for network automation alongside Ansible.

---

## IaC Principles

```
Key properties of Infrastructure as Code:
  Declarative: describe the desired end state, not the steps to get there
  Idempotent: run it 10 times = same result as running it once
  Version controlled: all changes tracked in git (who changed what, when, why)
  Testable: validate config before applying to production
  Auditable: git log is your change management record

Declarative vs Imperative:
  Imperative (how): "Step 1: create VPC. Step 2: create subnet. Step 3: create route table."
    Problems: order matters; not idempotent; hard to understand desired state
  Declarative (what): "I want a VPC with these subnets and this routing."
    Terraform figures out the steps; order handled automatically; re-runnable

IaC tools:
  Terraform: multi-cloud, declarative; most widely used
  Pulumi: IaC in real programming languages (Python, TypeScript, Go)
  AWS CloudFormation: AWS-specific; YAML/JSON
  Azure Resource Manager (ARM/Bicep): Azure-specific
  Ansible: often used alongside Terraform for configuration management
  Crossplane: Kubernetes-native IaC
```

---

## Terraform Architecture

```
Terraform workflow:
  terraform init    → download providers and modules
  terraform plan    → show what would change (dry run)
  terraform apply   → apply the changes
  terraform destroy → destroy all managed resources

State file (terraform.tfstate):
  Terraform tracks the current state of all managed resources
  Maps your config to real infrastructure IDs
  Critical: if state file is lost, Terraform loses track of what it created
  Remote state: store in S3, Azure Blob, Terraform Cloud (required for teams)

Providers:
  Plugins that implement Terraform resources for specific platforms
  AWS: hashicorp/aws; Azure: hashicorp/azurerm; GCP: hashicorp/google
  Network: cisco/iosxe, cisco/aci, juniper/junos, checkpoint/checkpoint
  DNS: hashicorp/dns; Cloudflare: cloudflare/cloudflare
  Kubernetes: hashicorp/kubernetes

Resource: represents a piece of infrastructure (VPC, subnet, BGP peer)
Data source: reads existing infrastructure without managing it
Variable: parameterize configurations
Output: expose values after apply (IP addresses, resource IDs)
Module: reusable package of resources (like a function)
```

---

## HCL Syntax

```hcl
# Terraform uses HCL (HashiCorp Configuration Language)

# Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
  # Remote state storage
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "network/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"  # for state locking
  }
}

provider "aws" {
  region = var.aws_region
}

# Variables
variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for deployment"
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
}

variable "subnets" {
  type = list(object({
    name   = string
    cidr   = string
    az     = string
    public = bool
  }))
  default = [
    { name = "public-a",  cidr = "10.0.1.0/24", az = "us-east-1a", public = true  },
    { name = "public-b",  cidr = "10.0.2.0/24", az = "us-east-1b", public = true  },
    { name = "private-a", cidr = "10.0.10.0/24", az = "us-east-1a", public = false },
    { name = "private-b", cidr = "10.0.11.0/24", az = "us-east-1b", public = false },
  ]
}

# Resources
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "main-vpc"
    Environment = terraform.workspace  # dev, staging, prod
    ManagedBy   = "terraform"
  }
}

resource "aws_subnet" "subnets" {
  for_each = { for s in var.subnets : s.name => s }

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = each.value.public

  tags = {
    Name = each.key
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "main-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = { Name = "public-rt" }
}

resource "aws_route_table_association" "public" {
  for_each = {
    for name, subnet in aws_subnet.subnets :
    name => subnet if contains(var.subnets[*].name, name) &&
    [for s in var.subnets : s.public if s.name == name][0]
  }
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}

# Data source — read existing infrastructure
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "vpc_id" {
  value       = aws_vpc.main.id
  description = "ID of the created VPC"
}

output "public_subnet_ids" {
  value = [
    for name, subnet in aws_subnet.subnets :
    subnet.id if !endswith(name, "private")
  ]
}
```

---

## Terraform for Network Devices (Cisco)

```hcl
# Cisco IOS-XE Terraform provider
terraform {
  required_providers {
    iosxe = {
      source  = "CiscoDevNet/iosxe"
      version = "0.5.0"
    }
  }
}

provider "iosxe" {
  host     = "https://10.0.0.1"
  username = var.router_username
  password = var.router_password
  insecure = true  # skip TLS verify for lab
}

resource "iosxe_interface_loopback" "loopback0" {
  name            = 0
  description     = "Managed by Terraform"
  ipv4_address    = "10.255.255.1"
  ipv4_address_mask = "255.255.255.255"
}

resource "iosxe_ospf" "ospf_process" {
  process_id = 1
  router_id  = "10.255.255.1"
}

resource "iosxe_ospf_area_network" "ospf_network" {
  process_id = iosxe_ospf.ospf_process.process_id
  area_id    = "0"
  ip         = "10.0.0.0"
  mask       = "0.0.255.255"
}

resource "iosxe_bgp" "bgp" {
  asn = "65001"
}

resource "iosxe_bgp_neighbor" "isp_a" {
  asn              = iosxe_bgp.bgp.asn
  ip               = "203.0.113.1"
  remote_as        = "65002"
  description      = "ISP-A peer"
  password         = var.bgp_password
  send_community   = "both"
}
```

```hcl
# Cloudflare DNS management
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = aws_instance.web.public_ip
  type    = "A"
  ttl     = 300
  proxied = true
}

resource "cloudflare_record" "mx" {
  zone_id  = var.cloudflare_zone_id
  name     = "@"
  value    = "mail.example.com"
  type     = "MX"
  priority = 10
}

resource "cloudflare_record" "spf" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = "v=spf1 include:sendgrid.net -all"
  type    = "TXT"
}
```

---

## Modules

```hcl
# Reusable module: modules/vpc/main.tf
variable "cidr" { type = string }
variable "name" { type = string }
variable "subnets" { type = list(any) }

resource "aws_vpc" "this" {
  cidr_block = var.cidr
  tags = { Name = var.name }
}
# ... subnet resources ...

output "vpc_id" { value = aws_vpc.this.id }
output "subnet_ids" { value = values(aws_subnet.subnets)[*].id }

# Using the module:
module "production_vpc" {
  source = "./modules/vpc"   # local module
  # source = "terraform-aws-modules/vpc/aws"  # Terraform Registry module

  cidr    = "10.0.0.0/16"
  name    = "production"
  subnets = local.prod_subnets
}

# Reference module output
resource "aws_security_group" "web" {
  vpc_id = module.production_vpc.vpc_id
}
```

---

## Workspaces — Multi-Environment Management

```bash
# Workspaces isolate state per environment
terraform workspace list      # show workspaces (default is "default")
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod
terraform workspace select dev

# In configuration: use terraform.workspace to differentiate
resource "aws_instance" "web" {
  instance_type = terraform.workspace == "prod" ? "t3.large" : "t3.micro"
  count         = terraform.workspace == "prod" ? 3 : 1
}
```

---

## Terraform Workflow in CI/CD

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Terraform Init
        run: terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Terraform Format Check
        run: terraform fmt -check

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        run: terraform plan -out=tfplan
        if: github.event_name == 'pull_request'

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: tfplan
        if: github.event_name == 'pull_request'

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
```

---

## Terraform vs Ansible

| Aspect | Terraform | Ansible |
|---|---|---|
| Primary use | Infrastructure provisioning (create/destroy) | Configuration management (configure) |
| Model | Declarative | Procedural (with idempotent modules) |
| State | Maintains state file | Stateless (queries device each run) |
| Strength | Cloud resources, infra lifecycle | Device config, software, orchestration |
| Network use | Provision cloud networking, DNS, load balancers | Configure routers, switches |
| Idempotent | Natively (plan = diff) | Per-module (varies) |
| Best pattern | Use together: Terraform provisions infra; Ansible configures it |

---

## Tips

- Always store state remotely (S3 + DynamoDB for AWS, or Terraform Cloud) — a lost local state file means Terraform no longer knows what it created.
- Use `terraform plan` before every `apply` and review the diff carefully — Terraform destroying and recreating a resource (vs updating in-place) can cause downtime.
- Terraform `for_each` is better than `count` for anything with a key — resources created with `count` are indexed (index shifts when you remove one); `for_each` is keyed by the map key.
- Use `terraform workspace` or separate state files per environment — never share state between dev and prod.
- Lock provider versions with `~> 5.0` (allows 5.x but not 6.x) — unversioned providers can auto-upgrade and break your config.

---

## Summary

- IaC is declarative, idempotent, version-controlled infrastructure management — Terraform is the dominant multi-cloud tool.
- Terraform workflow: `init` (download providers) → `plan` (show diff) → `apply` (make changes) → `destroy` (remove everything).
- State file tracks all managed resources — store remotely (S3 + DynamoDB locking) for team use; never commit state to git.
- Modules package reusable resource groups — use them for VPCs, security groups, DNS records, network device templates.
- Terraform + Ansible complement each other — Terraform provisions the infrastructure; Ansible configures it.
- CI/CD pipeline: PR → `terraform plan` (comment on PR) → merge → `terraform apply` — gates changes through code review.
