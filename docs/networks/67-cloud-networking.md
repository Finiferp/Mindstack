---
title: "Cloud Networking"
sidebar_label: "Cloud Networking"
sidebar_position: 67
---

# Cloud Networking

Cloud providers (AWS, Azure, GCP) offer virtual networking constructs that map to physical networking concepts but with API-driven provisioning, software-defined behavior, and global scale. This page covers the key concepts across all major providers.

---

## Virtual Private Cloud (VPC)

A VPC is an isolated virtual network within a cloud provider's region — your private address space.

### AWS VPC

```
VPC: 10.0.0.0/16 (your private CIDR; RFC 1918)
  └── Subnets (per Availability Zone):
        Public subnet:  10.0.1.0/24 (us-east-1a) — has IGW route
        Public subnet:  10.0.2.0/24 (us-east-1b)
        Private subnet: 10.0.10.0/24 (us-east-1a) — no IGW route
        Private subnet: 10.0.11.0/24 (us-east-1b)

Internet Gateway (IGW): enables internet access for public subnets
  Attach IGW to VPC → add 0.0.0.0/0 → igw route in public subnet route table

NAT Gateway: enables private subnet instances to initiate outbound internet
  Deployed in public subnet; private subnet routes 0.0.0.0/0 → NAT GW
  Stateful: return traffic automatically allowed (like PAT)
  Charges: $0.045/hr + $0.045/GB processed

Route Tables:
  Each subnet is associated with one route table
  Main route table: default for all subnets not explicitly associated
  Custom route table: associate specific subnets to override

Security Groups (Stateful firewall per instance):
  Ingress + Egress rules; instances can be in multiple SGs
  Stateful: if inbound allowed, return traffic automatically allowed
  Default: all inbound denied, all outbound allowed
  Can reference other security groups: "allow SG-web to talk to SG-db on 5432"

Network ACLs (Stateless firewall per subnet):
  Applied at subnet boundary; stateless (must allow both directions)
  Numbered rules evaluated in order; explicit deny available
  Default NACL: allow all in both directions
  Used for: subnet-level guardrails (e.g., block specific IP ranges from subnets)

VPC Flow Logs:
  Capture IP traffic metadata (src/dst IP, port, protocol, action, bytes)
  Sent to: CloudWatch Logs, S3, Kinesis Firehose
  Per-VPC, per-subnet, or per-ENI
  Essential for security investigation and compliance

AWS VPC Terraform:
  resource "aws_vpc" "main" {
    cidr_block = "10.0.0.0/16"
    enable_dns_hostnames = true
  }
  resource "aws_internet_gateway" "igw" {
    vpc_id = aws_vpc.main.id
  }
```

### VPC Peering

```
VPC Peering: private routing between two VPCs (same or different accounts/regions)
  Non-transitive: A↔B and B↔C does NOT mean A can reach C
  For A→C: must add explicit peering A↔C
  No overlapping CIDRs (can't peer 10.0.0.0/16 ↔ 10.0.0.0/16)
  Required: update route tables on BOTH sides after peering accepted

resource "aws_vpc_peering_connection" "peer" {
  vpc_id      = aws_vpc.vpc_a.id
  peer_vpc_id = aws_vpc.vpc_b.id
  auto_accept = true  # if same account
}
resource "aws_route" "a_to_b" {
  route_table_id            = aws_route_table.vpc_a_rt.id
  destination_cidr_block    = "10.1.0.0/16"  # VPC B CIDR
  vpc_peering_connection_id = aws_vpc_peering_connection.peer.id
}
```

### AWS Transit Gateway

```
Transit Gateway (TGW): hub for connecting VPCs, on-prem VPNs, and Direct Connect
  Transitive routing: A→TGW→B→TGW→C (TGW routes between all attachments)
  Up to 5,000 VPC attachments per TGW
  Route tables: per-TGW; can isolate groups of VPCs
  Cross-region: TGW peering across regions
  Replaces VPC mesh peering (n(n-1)/2 problem)

Architecture:
  VPC A ──┐
  VPC B ──┼── Transit Gateway ──── VPN to on-prem
  VPC C ──┘                    └── Direct Connect
```

---

## Hybrid Connectivity

### AWS Site-to-Site VPN

```
IPsec VPN from on-prem to AWS:
  Customer Gateway: your on-prem router (Cisco, Fortinet, Palo Alto, etc.)
  Virtual Private Gateway (VGW): AWS-side VPN endpoint (attached to VPC)
  Two tunnels for redundancy (two public IPs on AWS side)

Setup:
  resource "aws_customer_gateway" "cgw" {
    bgp_asn    = 65001                # your BGP ASN
    ip_address = "203.0.113.10"       # your public IP
    type       = "ipsec.1"
  }
  resource "aws_vpn_gateway" "vgw" {
    vpc_id = aws_vpc.main.id
  }
  resource "aws_vpn_connection" "vpn" {
    vpn_gateway_id      = aws_vpn_gateway.vgw.id
    customer_gateway_id = aws_customer_gateway.cgw.id
    type                = "ipsec.1"
    static_routes_only  = false  # use BGP
  }

BGP over VPN:
  AWS advertises VPC CIDR via BGP
  Your router advertises on-prem prefix via BGP
  Dynamic routing; automatic failover between two tunnels

Limitations:
  Speed: up to 1.25 Gbps per tunnel (2.5 Gbps with ECMP across both)
  Latency: internet-variable (IPsec over internet)
  For higher bandwidth/lower latency: AWS Direct Connect
```

### AWS Direct Connect

```
Direct Connect: dedicated private fiber from your data center to AWS
  AWS Direct Connect location (colocation facility)
  Your router + AWS router in same colocation cage
  Physical connection: 1 Gbps, 10 Gbps, 100 Gbps

Virtual Interfaces (VIFs):
  Private VIF: connect to a single VPC (via VGW or TGW)
  Public VIF: access AWS public services (S3, DynamoDB) over private connection
  Transit VIF: connect to Transit Gateway (access many VPCs)

Hosted vs Dedicated:
  Dedicated: AWS provides the physical port (1G, 10G, 100G)
  Hosted: Direct Connect Partner provides port (1G, 2.5G, 5G, 10G)
    Smaller bandwidth options; shared physical connection at partner

Benefits vs VPN:
  Consistent latency (not internet-variable)
  Higher bandwidth (up to 100 Gbps vs 2.5 Gbps VPN)
  Lower data transfer costs (egress from AWS)
  Private connectivity (traffic never on public internet)

Cost: ~$0.02–0.30/hr for port + $0.02–0.15/GB for data transfer
```

---

## AWS Networking Services

```
Elastic Load Balancer (ELB):
  ALB (Application LB): Layer 7; path-based routing; SSL termination; HTTP/HTTPS
  NLB (Network LB): Layer 4; TCP/UDP; ultra-low latency; static IPs; TLS passthrough
  CLB (Classic LB): legacy; avoid for new deployments

Route 53 (DNS):
  Public hosted zone: DNS for your public domains
  Private hosted zone: internal DNS for VPCs (e.g., db.internal → 10.0.10.5)
  Health checks: route traffic away from unhealthy endpoints
  Routing policies: simple, weighted, latency-based, failover, geolocation, geoproximity

CloudFront (CDN):
  130+ edge PoPs globally; caches content near users
  Integrates with ALB, S3, EC2; SSL termination at edge
  AWS Shield (DDoS protection) included for basic; Shield Advanced for serious protection

Global Accelerator:
  Anycast IPs at AWS edge; routes to nearest AWS region
  TCP/UDP (vs CloudFront HTTP-only); good for non-HTTP (gaming, IoT, VoIP)
  Static IPs that don't change (useful for IP whitelisting)

PrivateLink:
  Expose service from your VPC to other VPCs privately (no internet, no peering)
  "Endpoint service" in provider VPC; "Interface endpoint" in consumer VPC
  Used for: SaaS services, internal microservices, AWS service endpoints (S3, DynamoDB via VPC)

VPC Endpoints:
  Interface endpoint (PrivateLink): for most AWS services (EC2, SNS, SQS, etc.)
  Gateway endpoint: for S3 and DynamoDB (free; route table entry; not a NIC)
  Benefit: access AWS services without internet gateway; traffic stays in AWS backbone
```

---

## Azure Networking

```
Virtual Network (VNet): equivalent to AWS VPC
  Address space: CIDR blocks (multiple allowed: 10.0.0.0/16 + 192.168.0.0/24)
  Subnets: subdivide the VNet CIDR
  No implicit internet access: requires explicit public IP or NAT Gateway
  Free: VNets are free; pay for gateways, NAT GW, etc.

Azure Load Balancer: Layer 4 (TCP/UDP); internal or public
Azure Application Gateway: Layer 7; WAF integration; SSL termination
Azure Front Door: global CDN + L7 LB + WAF; anycast entry points worldwide

VNet Peering:
  Same as AWS VPC peering; non-transitive
  Can peer across subscriptions and regions

Azure Virtual WAN (vWAN):
  Microsoft's managed Transit Gateway equivalent
  Hub-spoke topology; manages routing between spokes automatically
  Integrates SD-WAN partners (Barracuda, Check Point, etc.)

ExpressRoute (equivalent to Direct Connect):
  Private fiber connection to Azure; through Exchange Provider or Direct Port
  10 Gbps or 100 Gbps
  Global Reach: connect two on-prem sites via ExpressRoute (through Microsoft backbone)

Azure Firewall:
  Managed, stateful L4/L7 firewall
  FQDN filtering (block by domain name); threat intelligence
  Premium SKU: TLS inspection, URL filtering, IDPS

Azure Private Link:
  Same as AWS PrivateLink — private access to services from VNets
  Available for: Azure PaaS services, custom services
```

---

## GCP Networking

```
VPC: global (not per-region like AWS/Azure)
  One VPC spans all regions; subnets are regional
  No VPC peering issue for multi-region (same VPC)
  Dynamic routing: all subnets share routes automatically

Shared VPC:
  Host project: owns the VPC
  Service projects: share the VPC (can deploy resources into host VPC subnets)
  Centralized networking; security team manages shared VPC

Cloud Interconnect (equivalent to Direct Connect):
  Dedicated Interconnect: 10G or 100G ports at Google colocation
  Partner Interconnect: via GCP network partners; smaller bandwidth options

Cloud VPN:
  HA VPN: two tunnel pairs (four tunnels total); 99.99% SLA
  Classic VPN: single tunnel; lower SLA

Cloud Load Balancing:
  Global: anycast single IP; nearest region serves traffic (HTTP(S) Global LB)
  Regional: within one region (Internal LB, Network LB)
  Premium tier: Google backbone routing (better performance)
  Standard tier: internet routing (lower cost)

GCP Firewall Rules:
  Applied at VPC level (not subnet); stateful
  Can target: all instances, specific tags, specific service accounts
  Priority: 0–65534 (lower = higher priority); default deny is 65535

Cloud Armor (DDoS + WAF):
  Integrates with Global Load Balancer
  Pre-configured rules: OWASP Top 10; custom rules
  Adaptive Protection: ML-based DDoS detection
```

---

## Cloud Networking Comparison

| Feature | AWS | Azure | GCP |
|---|---|---|---|
| VPC/VNet scope | Regional | Regional | Global |
| Subnet scope | AZ | Regional | Regional |
| Peering | Non-transitive | Non-transitive | Non-transitive |
| Transit hub | Transit Gateway | Virtual WAN | Cloud Router (via VPN/Interconnect) |
| Private fiber | Direct Connect | ExpressRoute | Cloud Interconnect |
| CDN | CloudFront | Front Door / CDN | Cloud CDN |
| DNS | Route 53 | Azure DNS | Cloud DNS |
| Firewall | Security Groups (SG) + NACL | NSG + Azure Firewall | Firewall Rules + Cloud Armor |
| Private service access | PrivateLink | Private Link | Private Service Connect |

---

## Tips

- AWS Security Groups are stateful (return traffic automatic) and scoped to instances; NACLs are stateless and scoped to subnets — always use SGs as the primary control, NACLs only for subnet-level guardrails.
- Never expose resources to `0.0.0.0/0` on administrative ports (22, 3389) — restrict SSH/RDP to your VPN or specific management IPs.
- VPC Flow Logs are essential for security forensics — enable them on all VPCs and send to S3 or CloudWatch with appropriate retention.
- Transit Gateway eliminates VPC peering mesh complexity — for more than 3–4 VPCs, TGW is almost always the better choice.
- Use VPC endpoints for AWS services (S3, DynamoDB, SSM) — traffic stays within AWS, avoids NAT Gateway charges, and doesn't traverse the internet.

---

## Summary

- VPC (AWS), VNet (Azure), VPC (GCP) are isolated virtual networks — subnets, route tables, security groups, and gateways provide traffic control.
- Security Groups (AWS/GCP) are stateful per-instance firewalls; NACLs are stateless per-subnet — both needed for defense in depth.
- Transit Gateway (AWS) / Virtual WAN (Azure) enable hub-spoke topologies — transitive routing without VPC mesh peering (n(n-1)/2 sessions).
- Direct Connect / ExpressRoute / Cloud Interconnect provide dedicated private fiber — consistent latency, higher bandwidth, lower egress cost vs internet VPN.
- PrivateLink / Private Link / Private Service Connect let services be consumed privately across VPC boundaries without internet or VPC peering.
- VPC Flow Logs capture all connection metadata — essential for security forensics, compliance auditing, and troubleshooting.
