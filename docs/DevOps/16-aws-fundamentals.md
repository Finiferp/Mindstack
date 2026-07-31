---
title: "AWS Fundamentals"
sidebar_label: "AWS Fundamentals"
sidebar_position: 16
---

# AWS Fundamentals

The core AWS services that appear in almost every real-world deployment: compute, storage, networking, databases, and identity. This is not exhaustive AWS coverage — it's the 20% of services used in 80% of DevOps work.

**Docs:** [docs.aws.amazon.com](https://docs.aws.amazon.com)

---

## IAM — Identity and Access Management

The foundation of AWS security — controls WHO can do WHAT to WHICH resources.

```
Core concepts:
  User:      an identity for a person or application (long-lived credentials)
  Role:      a set of permissions assumed temporarily (no long-lived credentials)
  Group:     a collection of users sharing the same permissions
  Policy:    a JSON document defining permissions (attached to users/roles/groups)

Best practice: use Roles wherever possible, not Users with access keys
  EC2 instances, Lambda functions, ECS tasks should ASSUME a role
  Humans should authenticate via SSO/Identity Center, not long-lived access keys
```

```json
// Example IAM policy — allows read-only access to a specific S3 bucket
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::my-app-bucket",
        "arn:aws:s3:::my-app-bucket/*"
      ]
    }
  ]
}
```

```bash
# AWS CLI basics
aws configure                          # set up credentials
aws sts get-caller-identity            # verify who you're authenticated as

aws iam create-role --role-name my-role --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name my-role --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
aws iam list-users
aws iam list-roles

# Principle of least privilege — grant only what's needed, nothing more
# Use IAM Access Analyzer to identify overly permissive policies
```

---

## EC2 — Virtual Machines

```bash
# Launch an instance
aws ec2 run-instances \
    --image-id ami-0abcdef1234567890 \
    --instance-type t3.micro \
    --key-name my-key \
    --security-group-ids sg-0123456789 \
    --subnet-id subnet-0123456789 \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=web-server}]'

aws ec2 describe-instances
aws ec2 start-instances --instance-ids i-0123456789
aws ec2 stop-instances --instance-ids i-0123456789
aws ec2 terminate-instances --instance-ids i-0123456789

# SSH into an instance
ssh -i my-key.pem ec2-user@<public-ip>
```

```
Instance types (naming: family + generation + size):
  t3.micro    — burstable, general purpose, cheap (dev/test)
  m6i.large    — balanced compute/memory, general purpose (production apps)
  c6i.xlarge   — compute-optimized (CPU-heavy workloads)
  r6i.xlarge    — memory-optimized (databases, caches)
  g5.xlarge     — GPU instances (ML/rendering)

Pricing models:
  On-Demand:      pay per hour/second, no commitment — most expensive
  Reserved:        1-3 year commitment, up to 72% cheaper
  Savings Plans:    flexible commitment across instance families
  Spot:              bid on unused capacity, up to 90% cheaper, can be reclaimed
                     with 2 min notice — use for fault-tolerant/batch workloads

Auto Scaling Groups (ASG):
  Automatically add/remove EC2 instances based on demand (CPU, custom metrics)
  Works with Launch Templates to define instance configuration
```

---

## S3 — Object Storage

```bash
# Buckets and objects
aws s3 mb s3://my-app-bucket                      # create bucket
aws s3 cp file.txt s3://my-app-bucket/             # upload
aws s3 cp s3://my-app-bucket/file.txt ./           # download
aws s3 sync ./local-dir s3://my-app-bucket/prefix/ # sync a directory
aws s3 ls s3://my-app-bucket/
aws s3 rm s3://my-app-bucket/file.txt
aws s3 rb s3://my-app-bucket --force               # remove bucket + all contents

# Or the newer s3api for more control
aws s3api put-object --bucket my-app-bucket --key file.txt --body ./file.txt
aws s3api list-objects-v2 --bucket my-app-bucket
```

```
S3 storage classes (cost vs retrieval speed tradeoff):
  Standard:            frequently accessed data
  Intelligent-Tiering:  auto-moves data between tiers based on access patterns
  Standard-IA:          infrequent access, cheaper storage, retrieval fee
  Glacier Instant/Flexible/Deep Archive:  archival, very cheap, slow/costly retrieval

Common patterns:
  Static website hosting        — S3 + CloudFront CDN
  Application data/uploads       — S3 with lifecycle policies
  Terraform remote state          — S3 + DynamoDB for locking
  Backups                          — S3 with versioning + lifecycle to Glacier
  Data lake                        — S3 + Athena/Glue for querying

Lifecycle policy example — auto-transition and expire old objects:
  Move to Standard-IA after 30 days
  Move to Glacier after 90 days
  Delete after 365 days

Bucket security:
  Block Public Access should be ON by default for almost all buckets
  Use bucket policies + IAM for access control, never rely on "public" ACLs
  Enable versioning for anything important (protects against accidental deletion)
```

---

## VPC — Virtual Private Cloud

```
VPC: an isolated network within AWS — your own private slice of the cloud

  ┌──────────────────────────────────────────── VPC (10.0.0.0/16) ───────┐
  │                                                                      │
  │  ┌─────────────────────┐        ┌─────────────────────┐              │
  │  │  Public Subnet      │        │  Private Subnet     │              │
  │  │  10.0.1.0/24        │        │  10.0.2.0/24        │              │
  │  │  ┌────────┐         │        │  ┌────────┐         │              │
  │  │  │  ALB   │         │        │  │  EC2   │         │              │
  │  │  └────────┘         │        │  │  (app) │         │              │
  │  │                     │        │  └────────┘         │              │
  │  │  Internet Gateway ──┼────────┼── NAT Gateway       │              │
  │  └─────────────────────┘        └─────────────────────┘              │
  └──────────────────────────────────────────────────────────────────────┘
                     │
                Internet

Public subnet:  has a route to an Internet Gateway — reachable from internet
Private subnet:  no direct internet route — outbound only via NAT Gateway
                 (for downloading packages, calling external APIs; nothing
                  can initiate a connection FROM the internet TO this subnet)

Security Groups: stateful firewall at the INSTANCE level (allow rules only)
Network ACLs:     stateless firewall at the SUBNET level (allow AND deny rules)
```

```bash
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-0123 --cidr-block 10.0.1.0/24
aws ec2 create-security-group --group-name web-sg --description "Web servers" --vpc-id vpc-0123
aws ec2 authorize-security-group-ingress --group-id sg-0123 \
    --protocol tcp --port 443 --cidr 0.0.0.0/0

# Most teams provision VPCs via Terraform, not manual CLI/console —
# see the terraform-aws-modules/vpc/aws module referenced in the Terraform page
```

---

## RDS — Managed Relational Databases

```bash
aws rds create-db-instance \
    --db-instance-identifier mydb \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username admin \
    --master-user-password ChangeMe123 \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-0123

aws rds describe-db-instances
aws rds create-db-snapshot --db-instance-identifier mydb --db-snapshot-identifier mydb-snapshot-1
```

```
What RDS manages for you (vs self-hosting a database on EC2):
  Automated backups and point-in-time recovery
  Automated OS and database engine patching
  Multi-AZ failover (synchronous standby in another Availability Zone)
  Read replicas for scaling read traffic
  Automated storage scaling

Supported engines: PostgreSQL, MySQL, MariaDB, Oracle, SQL Server, Aurora
  Aurora: AWS's own MySQL/PostgreSQL-compatible engine — better performance,
          storage auto-scales, faster failover, but AWS-specific (less portable)
```

---

## Lambda — Serverless Compute

```python
# lambda_function.py
import json

def handler(event, context):
    name = event.get("queryStringParameters", {}).get("name", "World")
    return {
        "statusCode": 200,
        "body": json.dumps({"message": f"Hello, {name}!"})
    }
```

```bash
# Package and deploy
zip function.zip lambda_function.py
aws lambda create-function \
    --function-name my-function \
    --runtime python3.12 \
    --role arn:aws:iam::123456789:role/lambda-execution-role \
    --handler lambda_function.handler \
    --zip-file fileb://function.zip

aws lambda invoke --function-name my-function output.json
aws lambda update-function-code --function-name my-function --zip-file fileb://function.zip
```

```
When to use Lambda:
  Event-driven, short-lived tasks (API endpoints, S3 triggers, scheduled jobs)
  Unpredictable/spiky traffic — pay only for actual invocations, scales to zero
  Not ideal for: long-running processes (15 min max), heavy compute,
                 apps needing persistent connections/state

Common triggers:
  API Gateway (HTTP requests) → Lambda → response
  S3 (object created) → Lambda → process the file
  EventBridge (scheduled cron) → Lambda → periodic task
  SQS (message arrives) → Lambda → process message

Cold starts: first invocation after idle period has extra latency
  Mitigated by: Provisioned Concurrency, smaller deployment packages,
                choosing faster-starting runtimes
```

---

## ECS and EKS — Container Orchestration on AWS

```
ECS (Elastic Container Service): AWS's own container orchestrator
  Simpler than Kubernetes, tightly integrated with AWS services
  Fargate launch type: fully serverless — no EC2 instances to manage
  EC2 launch type: you manage the underlying EC2 instances yourself

EKS (Elastic Kubernetes Service): managed Kubernetes control plane
  Use when you need standard Kubernetes (portability, existing K8s expertise,
  multi-cloud strategy) — see the Kubernetes pages of this course for the
  Kubernetes concepts themselves; EKS just manages the control plane for you

Choosing between them:
  ECS + Fargate: simpler, AWS-native, less operational overhead, good default
  EKS:            when you need Kubernetes specifically (portability,
                  existing manifests/Helm charts, multi-cloud)
```

```bash
# ECS example (Fargate)
aws ecs create-cluster --cluster-name my-cluster
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs create-service \
    --cluster my-cluster \
    --service-name my-service \
    --task-definition my-task \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-0123],securityGroups=[sg-0123]}"

# EKS
eksctl create cluster --name my-cluster --region us-east-1 --nodes 3
aws eks update-kubeconfig --name my-cluster        # configure kubectl to use it
kubectl get nodes                                    # now use standard kubectl
```

---

## CloudWatch — Monitoring and Logs

```bash
# Logs
aws logs describe-log-groups
aws logs tail /aws/lambda/my-function --follow

# Metrics and alarms
aws cloudwatch put-metric-alarm \
    --alarm-name high-cpu \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions arn:aws:sns:us-east-1:123456789:my-topic

# Dashboards — visualize metrics across services in one place
# CloudWatch Logs Insights — query logs with a SQL-like syntax
```

---

## Route 53 and CloudFront

```
Route 53 — DNS service:
  Hosted zones for your domains
  Health checks + failover routing
  Alias records — point directly at AWS resources (ALB, CloudFront, S3)
    without an extra DNS lookup hop (unlike a CNAME)

CloudFront — CDN (Content Delivery Network):
  Caches content at edge locations worldwide, closer to users
  Origins: S3 buckets, ALB/EC2, or any HTTP origin
  Common pattern: S3 (static assets) + CloudFront (CDN) + Route 53 (DNS)
  Also used in front of API Gateway/ALB for caching + DDoS protection (with WAF)
```

---

## Cost Management

```bash
aws ce get-cost-and-usage \
    --time-period Start=2024-01-01,End=2024-01-31 \
    --granularity MONTHLY \
    --metrics BlendedCost

# AWS Budgets — set alerts before costs spiral
# Cost Explorer — visualize spending trends by service
# Savings Plans / Reserved Instances — commit for predictable workloads
# Rightsizing — regularly check for over-provisioned instances
# Spot Instances for fault-tolerant/batch workloads — up to 90% savings

# Infracost — estimate Terraform cost changes in PRs before applying
infracost breakdown --path .
```

---

## How IAM Actually Decides Allow or Deny

```
Every single AWS API call goes through the SAME evaluation logic,
regardless of which service — understanding this once explains
"why was I denied" for literally any AWS permission issue:

  1. By default, EVERYTHING is implicitly denied — an identity with
     zero attached policies can do nothing
  2. AWS collects EVERY policy that could apply to this request:
     identity-based policies (attached to the User/Role making the call)
     resource-based policies (e.g. an S3 bucket policy, attached to
     the RESOURCE being accessed, not the caller)
     permission boundaries, SCPs (Service Control Policies, at the
     AWS Organization level), session policies (for temporary
     credentials), and VPC endpoint policies, if relevant
  3. If ANY applicable policy contains an EXPLICIT DENY matching this
     request → the request is denied, full stop, no exceptions
     (explicit deny ALWAYS wins, regardless of how many other
     policies say Allow)
  4. Otherwise, if AT LEAST ONE applicable policy contains an ALLOW
     matching this request → the request is allowed
  5. Otherwise (no explicit deny, no explicit allow found) → implicit
     deny (the default from step 1 still applies)

This is why "I attached an Allow policy but it's still denied" is
almost always either: (a) a DIFFERENT policy somewhere has an explicit
Deny that's overriding it, or (b) for cross-account/resource-based
scenarios, BOTH the identity-based policy AND the resource-based
policy need to allow it — a bucket policy alone isn't enough if the
calling identity's own policy doesn't ALSO grant s3:GetObject.

AWS's own IAM Policy Simulator and `aws iam simulate-principal-policy`
exist specifically because this multi-source evaluation can get
genuinely complex to reason about by hand once SCPs and permission
boundaries are layered on top of identity policies.
```

## How VPC Networking Actually Routes Traffic

```
Every subnet has an associated ROUTE TABLE — this is the actual
mechanism that makes a subnet "public" or "private," not some
inherent subnet property:

  Public subnet's route table:
    10.0.0.0/16 → local                    (traffic within the VPC)
    0.0.0.0/0   → igw-xxxxx (Internet Gateway)   ← THIS line is what
                                                    makes it "public"

  Private subnet's route table:
    10.0.0.0/16 → local
    0.0.0.0/0   → nat-xxxxx (NAT Gateway)    ← outbound-only path

A subnet is "public" simply because its route table sends
internet-bound traffic to an Internet Gateway (which allows two-way
traffic) instead of a NAT Gateway (which only allows the SUBNET to
initiate outbound connections — nothing from the internet can
initiate an inbound connection to a private-subnet resource via NAT).

Security Groups vs Network ACLs — the two-layer firewall model:
  Security Group: STATEFUL, attached to individual ENIs/instances —
                  if you allow inbound traffic, the RETURN traffic is
                  automatically allowed, you don't need a matching
                  outbound rule for responses
  Network ACL:     STATELESS, attached to the SUBNET — you must
                  explicitly allow BOTH the inbound request AND the
                  outbound response, evaluated as numbered rules in
                  order (first match wins, unlike Security Groups
                  which evaluate ALL rules and allow if ANY matches)

This explains a classic AWS networking bug: someone adds an inbound-only
Security Group rule and it "just works" for a normal request/response
service (because Security Groups are stateful), but the SAME mental
model applied to a Network ACL breaks things, because NACLs need
explicit rules in both directions.
```

---

## Troubleshooting Guide

```
"AccessDenied even though my IAM policy clearly allows this action"
  aws iam simulate-principal-policy --policy-source-arn <your-role-arn>
  --action-names s3:GetObject --resource-arns <bucket-arn>
  Check for: an SCP at the Organization level, a permission boundary,
  or (for S3 specifically) Block Public Access settings that override
  bucket policies regardless of what the policy itself says

"EC2 instance can't reach the internet"
  Check route table: does the subnet actually route 0.0.0.0/0 to an
  IGW (public) or NAT Gateway (private, outbound-only)?
  Check Security Group: outbound rules (often left wide-open by
  default, but worth verifying if customized)
  Check Network ACL: both inbound AND outbound rules, remembering
  it's stateless (see explanation above)
  Check: does the instance actually have a Public IP assigned, if
  it's meant to be directly internet-reachable (not just outbound)?

"RDS connection times out from an application in the same VPC"
  Security Group on the RDS instance must explicitly allow inbound
  from the application's Security Group (or CIDR) on the DB port —
  being in the "same VPC" grants NO implicit network access; every
  connection path must be explicitly allowed via Security Groups

"Terraform apply is slow / times out on AWS resources"
  Some AWS resources (RDS instances, EKS clusters) genuinely take
  many minutes to provision at the API level — this isn't a
  Terraform problem, check the AWS Console for the resource's own
  status/events during a long-running apply before assuming
  something's actually broken
```

---

## Tips

- Use IAM Roles (not long-lived access keys) for anything running inside AWS — EC2, Lambda, ECS should all assume roles.
- Enable "Block Public Access" on S3 buckets by default — only disable it explicitly and deliberately for buckets that genuinely need public content.
- Fargate (serverless containers) is usually the right default for new container workloads — reach for EC2-backed ECS or EKS only when you have a specific reason.
- Set up billing alerts (AWS Budgets) before your first real deployment — surprise bills are one of the most common early-career AWS mistakes.
- Multi-AZ RDS is worth the extra cost for any production database — the automatic failover during an AZ outage is not optional in practice.

---

## Summary

- IAM: Roles over Users, least privilege, policies define permissions — the foundation of all AWS security.
- EC2: virtual machines; choose instance family by workload type; Spot for fault-tolerant, Reserved for predictable, On-Demand for flexible.
- S3: object storage; storage classes trade cost for retrieval speed; Block Public Access on by default.
- VPC: your private network; public subnets (internet-facing) vs private subnets (NAT Gateway for outbound only).
- RDS: managed relational databases with automated backups, patching, and Multi-AZ failover.
- Lambda: event-driven serverless compute, scales to zero, 15-minute max execution.
- ECS/Fargate is the simpler AWS-native container option; EKS when you specifically need Kubernetes.
- CloudWatch for logs/metrics/alarms; Route 53 for DNS; CloudFront for CDN — the standard observability and delivery stack.
