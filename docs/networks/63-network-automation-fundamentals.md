---
title: "Network Automation Fundamentals"
sidebar_label: "Automation Fundamentals"
sidebar_position: 63
---

# Network Automation Fundamentals

Network automation replaces manual CLI configuration with programmatic, repeatable, auditable processes. Done well, it eliminates configuration drift, accelerates change velocity, and reduces human error — the leading cause of network outages.

---

## Why Automate

```
The traditional problem:
  100 routers × 50 commands each = 5,000 manual CLI interactions per change
  One typo in 5,000 commands → outage
  Configuration drift: routers slowly diverge from each other and from documentation
  Knowledge silo: only one engineer knows the "tribal knowledge" config patterns

What automation solves:
  Consistency: same code runs against every device — configuration is identical
  Speed: change pushed to 1,000 devices in seconds instead of hours
  Auditability: every change tracked in version control (git diff → what changed, who changed it)
  Rollback: broken change → git revert → push → restored in seconds
  Documentation: the automation code IS the documentation (infrastructure as code)
  Testing: test in a lab environment first; push to production with confidence
```

---

## The Automation Pyramid

```
Level 4 — Closed-loop automation (self-healing)
  Network detects problem → automatically remediates → verifies fix
  Example: IDS detects attack → auto-quarantine the source port → alert NOC

Level 3 — Intent-based networking
  Operator declares intent ("segment A should not reach segment B")
  Controller translates intent to configuration
  Continuously validates compliance
  Example: Cisco DNA Center, Apstra

Level 2 — Configuration management
  Automated configuration deployment from templates + data
  Example: Ansible playbooks, Terraform, Salt

Level 1 — Scripting / task automation
  Python scripts, Bash, automated repetitive CLI tasks
  Most teams start here

Level 0 — Manual CLI
  Where everyone starts; where no one should stay for production at scale
```

---

## Data Formats

### JSON

```json
{
  "interfaces": [
    {
      "name": "GigabitEthernet0/0",
      "ip": "10.0.0.1",
      "prefix_length": 24,
      "enabled": true,
      "description": "Uplink to Core"
    },
    {
      "name": "GigabitEthernet0/1",
      "ip": "192.168.1.1",
      "prefix_length": 24,
      "enabled": true
    }
  ],
  "bgp": {
    "asn": 65001,
    "neighbors": [
      {"ip": "10.0.0.2", "remote_as": 65002, "description": "ISP-A"},
      {"ip": "10.0.0.3", "remote_as": 65003, "description": "ISP-B"}
    ]
  }
}
```

### YAML

```yaml
# YAML — human-readable; preferred for Ansible/Kubernetes/CI configs
interfaces:
  - name: GigabitEthernet0/0
    ip: 10.0.0.1
    prefix_length: 24
    enabled: true
    description: Uplink to Core

  - name: GigabitEthernet0/1
    ip: 192.168.1.1
    prefix_length: 24
    enabled: true

bgp:
  asn: 65001
  neighbors:
    - ip: 10.0.0.2
      remote_as: 65002
      description: ISP-A
    - ip: 10.0.0.3
      remote_as: 65003
      description: ISP-B

# YAML gotchas:
# Indentation matters (spaces ONLY, no tabs)
# Strings with colons need quoting: description: "http://example.com"
# Booleans: true/false/yes/no/on/off are all booleans — quote if you want the string "yes"
# Multiline strings: | (literal, preserves newlines) or > (folded, replaces newlines with spaces)
config: |
  interface GigabitEthernet0/0
   ip address 10.0.0.1 255.255.255.0
   no shutdown
```

### XML

```xml
<!-- XML — verbose but used by NETCONF, YANG, some APIs -->
<interfaces>
  <interface>
    <name>GigabitEthernet0/0</name>
    <ip-address>10.0.0.1</ip-address>
    <prefix-length>24</prefix-length>
    <enabled>true</enabled>
  </interface>
</interfaces>

<!-- Namespace-aware (NETCONF uses namespaces) -->
<rpc xmlns="urn:ietf:params:xml:ns:netconf:base:1.0" message-id="1">
  <get-config>
    <source><running/></source>
  </get-config>
</rpc>
```

### YANG — Data Modeling Language

```
YANG (RFC 6020/7950) defines the data model that NETCONF and RESTCONF operate on.
YANG models describe: what data exists, its types, constraints, operations.

Example YANG module snippet:
  module ietf-interfaces {
    namespace "urn:ietf:params:xml:ns:yang:ietf-interfaces";
    prefix if;

    container interfaces {
      list interface {
        key "name";
        leaf name { type string; }
        leaf description { type string; }
        leaf enabled { type boolean; default true; }
        leaf-list higher-layer-if { type if-ref; }
      }
    }
  }

YANG standard models (IETF):
  ietf-interfaces (RFC 8343): interface configuration
  ietf-ip (RFC 8344): IP configuration
  ietf-routing (RFC 8349): routing protocols
  ietf-ospf: OSPF configuration

Vendor-specific YANG:
  Cisco IOS-XE: Cisco-IOS-XE-native.yang, Cisco-IOS-XE-bgp.yang
  Juniper: junos-conf-root.yang
  OpenConfig: vendor-neutral models (openconfig-interfaces, openconfig-bgp, etc.)
```

---

## APIs for Network Devices

### NETCONF (RFC 6241)

```
NETCONF: SSH-based protocol for configuration management
  Transport: SSH (port 830)
  Encoding: XML
  Operations: get, get-config, edit-config, commit, lock, unlock, validate, copy-config, delete-config

NETCONF operations:
  <get-config>: retrieve configuration from datastore (running, startup, candidate)
  <edit-config>: modify configuration (merge, replace, create, delete operations)
  <commit>: commit candidate config to running (for candidate-based devices)
  <validate>: validate config without applying
  <lock>/<unlock>: exclusive access during changes
  <get>: get config + operational state

Datastores:
  running: currently active configuration
  startup: config loaded on boot
  candidate: staging area for changes before commit (not all devices support this)

Example NETCONF session (Python with ncclient):
  from ncclient import manager

  with manager.connect(
      host="10.0.0.1",
      port=830,
      username="admin",
      password="secret",
      hostkey_verify=False
  ) as m:
      # Get running config
      config = m.get_config(source="running")
      print(config.xml)

      # Edit config via XML payload
      config_payload = """
      <config>
        <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
          <interface>
            <name>GigabitEthernet0/0</name>
            <description>Configured by NETCONF</description>
            <enabled>true</enabled>
          </interface>
        </interfaces>
      </config>
      """
      m.edit_config(target="running", config=config_payload)

Enable on Cisco IOS:
  netconf-yang
  netconf-yang feature candidate-datastore  ! if supported
```

### RESTCONF (RFC 8040)

```
RESTCONF: HTTP-based REST API aligned with YANG models
  Transport: HTTPS (typically port 443 or 8443)
  Encoding: JSON or XML
  Methods: GET, POST, PUT, PATCH, DELETE
  Resources: /restconf/data/{module}:{container}/{list}/{key}

Enable on Cisco IOS:
  restconf
  ip http server        ! required (even for HTTPS — yes, you need both)
  ip http secure-server
  ip http authentication local

Python requests example:
  import requests, json
  from requests.auth import HTTPBasicAuth

  BASE = "https://10.0.0.1/restconf/data"
  headers = {
      "Accept": "application/yang-data+json",
      "Content-Type": "application/yang-data+json"
  }
  auth = HTTPBasicAuth("admin", "secret")

  # GET — read interface config
  resp = requests.get(
      f"{BASE}/ietf-interfaces:interfaces/interface=GigabitEthernet0%2F0",
      headers=headers, auth=auth, verify=False
  )
  print(json.dumps(resp.json(), indent=2))

  # PATCH — update description
  payload = {
      "ietf-interfaces:interface": {
          "name": "GigabitEthernet0/0",
          "description": "Updated via RESTCONF"
      }
  }
  resp = requests.patch(
      f"{BASE}/ietf-interfaces:interfaces/interface=GigabitEthernet0%2F0",
      headers=headers, auth=auth, verify=False,
      data=json.dumps(payload)
  )
  print(resp.status_code)  # 204 No Content = success
```

### gNMI / gRPC (Modern Streaming)

```
gNMI (gRPC Network Management Interface): modern, high-performance telemetry and config API
  Transport: gRPC (HTTP/2 + Protocol Buffers)
  Operations: Get, Set, Subscribe (streaming telemetry!)
  Models: OpenConfig or vendor YANG

Subscribe operation:
  SAMPLE: periodic snapshots (every 30 seconds)
  ON_CHANGE: push only when value changes (event-driven)
  TARGET_DEFINED: device decides best method per path

Python with pygnmi:
  from pygnmi.client import gNMIclient

  with gNMIclient(target=("10.0.0.1", 6030), username="admin",
                  password="secret", insecure=True) as gc:
      # Get interface counters
      result = gc.get(path=["/interfaces/interface[name=GigabitEthernet0/0]/state"])
      print(result)

      # Subscribe to interface state changes
      for update in gc.subscribe([{
          "path": "/interfaces/interface/state",
          "mode": "on_change"
      }]):
          print(update)

gRPC/gNMI advantages:
  Bidirectional streaming (subscribe → device pushes updates)
  Binary encoding (protobuf) → much more efficient than XML/JSON
  Replaces SNMP polling for real-time telemetry
  Used by: Cisco IOS-XR, IOS-XE (17.x+), Junos, Arista EOS
```

---

## Python for Network Automation

### Netmiko — SSH Automation

```python
# Netmiko: SSH to network devices; handles prompts, pagination, enable mode
from netmiko import ConnectHandler

# Connect to a single device
device = {
    "device_type": "cisco_ios",  # or: juniper_junos, arista_eos, cisco_nxos, etc.
    "host": "10.0.0.1",
    "username": "admin",
    "password": "secret",
    "secret": "enable_password",  # for enable mode
}

with ConnectHandler(**device) as conn:
    # Enter enable mode
    conn.enable()

    # Send command, get output
    output = conn.send_command("show ip interface brief")
    print(output)

    # Send command and parse with TextFSM
    output = conn.send_command("show ip bgp summary", use_textfsm=True)
    # Returns list of dicts (parsed!)
    for neighbor in output:
        print(f"{neighbor['bgp_neigh']}: {neighbor['state_pfxrcd']}")

    # Send configuration commands
    config_commands = [
        "interface GigabitEthernet0/1",
        "description Automated config",
        "ip address 192.168.2.1 255.255.255.0",
        "no shutdown"
    ]
    output = conn.send_config_set(config_commands)
    print(output)

    # Save config
    conn.save_config()

# Connect to multiple devices
import concurrent.futures

devices = [
    {"device_type": "cisco_ios", "host": "10.0.0.1", "username": "admin", "password": "s"},
    {"device_type": "cisco_ios", "host": "10.0.0.2", "username": "admin", "password": "s"},
    {"device_type": "cisco_ios", "host": "10.0.0.3", "username": "admin", "password": "s"},
]

def backup_device(device):
    with ConnectHandler(**device) as conn:
        conn.enable()
        config = conn.send_command("show running-config")
        filename = f"backup_{device['host']}.txt"
        with open(filename, "w") as f:
            f.write(config)
        return f"Backed up {device['host']}"

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    results = executor.map(backup_device, devices)
    for result in results:
        print(result)
```

### NAPALM — Multi-Vendor Abstraction

```python
# NAPALM (Network Automation and Programmability Abstraction Layer with Multivendor support)
# Same code works across Cisco, Juniper, Arista, etc.
from napalm import get_network_driver

driver = get_network_driver("ios")  # or: junos, eos, nxos, iosxr
device = driver(
    hostname="10.0.0.1",
    username="admin",
    password="secret",
    optional_args={"secret": "enable_password"}
)

device.open()

# Get structured facts (vendor-independent)
facts = device.get_facts()
print(facts)
# {'vendor': 'Cisco', 'model': 'CSR1000V', 'hostname': 'ROUTER1',
#  'fqdn': 'router1.example.com', 'os_version': '16.09.01', ...}

# Get interfaces (structured)
interfaces = device.get_interfaces()
for name, data in interfaces.items():
    print(f"{name}: {'UP' if data['is_up'] else 'DOWN'}, {data['speed']} Mbps")

# Get BGP neighbors
bgp = device.get_bgp_neighbors()
print(bgp)

# Get route table
routes = device.get_route_to("8.8.8.8/32")
print(routes)

# Compliance checking — compare running vs intended config
device.load_merge_candidate(filename="intended.cfg")  # load intended config
diff = device.compare_config()  # see what would change
print(diff)
if diff:
    device.commit_config()  # apply changes
else:
    print("No changes needed")

device.close()
```

### Jinja2 — Configuration Templating

```python
# Jinja2 renders config templates with device-specific variables
from jinja2 import Environment, FileSystemLoader

# Template file: interface_config.j2
"""
{% for interface in interfaces %}
interface {{ interface.name }}
 description {{ interface.description }}
 ip address {{ interface.ip }} {{ interface.mask }}
{% if interface.shutdown %}
 shutdown
{% else %}
 no shutdown
{% endif %}
!
{% endfor %}

router bgp {{ bgp.asn }}
{% for neighbor in bgp.neighbors %}
 neighbor {{ neighbor.ip }} remote-as {{ neighbor.asn }}
 neighbor {{ neighbor.ip }} description {{ neighbor.description }}
{% endfor %}
"""

# Variables (from YAML/JSON inventory)
variables = {
    "interfaces": [
        {"name": "GigabitEthernet0/0", "description": "WAN", "ip": "10.0.0.1", "mask": "255.255.255.252", "shutdown": False},
        {"name": "GigabitEthernet0/1", "description": "LAN", "ip": "192.168.1.1", "mask": "255.255.255.0", "shutdown": False},
    ],
    "bgp": {
        "asn": 65001,
        "neighbors": [
            {"ip": "10.0.0.2", "asn": 65002, "description": "ISP-A"},
        ]
    }
}

env = Environment(loader=FileSystemLoader("."))
template = env.get_template("interface_config.j2")
rendered = template.render(**variables)
print(rendered)

# Result:
# interface GigabitEthernet0/0
#  description WAN
#  ip address 10.0.0.1 255.255.255.252
#  no shutdown
# ...
```

---

## Parsing Unstructured CLI Output

```python
# TextFSM — parse CLI output with templates
import textfsm, io

# Template defines what to extract
template_str = """
Value INTERFACE (\S+)
Value IP_ADDRESS (\d+\.\d+\.\d+\.\d+)
Value STATUS (up|down|administratively down)
Value PROTOCOL (up|down)

Start
  ^${INTERFACE}\s+${IP_ADDRESS}\s+${STATUS}\s+${PROTOCOL} -> Record
  ^${INTERFACE}\s+unassigned\s+${STATUS}\s+${PROTOCOL} -> Record
"""

output = """
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0    10.0.0.1        YES NVRAM  up                    up
GigabitEthernet0/1    192.168.1.1     YES NVRAM  up                    up
GigabitEthernet0/2    unassigned      YES NVRAM  administratively down  down
"""

fsm = textfsm.TextFSM(io.StringIO(template_str))
results = fsm.ParseText(output)
headers = fsm.header
for row in results:
    print(dict(zip(headers, row)))

# NTC-Templates (library of TextFSM templates for common Cisco/Juniper commands)
# pip install ntc-templates
# Netmiko integrates NTC-Templates with use_textfsm=True parameter

# TTP (Template Text Parser) — alternative to TextFSM
from ttp import ttp
template = """
<group name="interfaces">
interface {{ name }}
 ip address {{ ip }} {{ mask }}
 description {{ description | ORPHRASE }}
</group>
"""
parser = ttp(data=raw_config, template=template)
parser.parse()
print(parser.result(format="json")[0][0])
```

---

## Tips

- Start automation with read-only operations (show commands, config backups) before writing to production devices — build confidence in the tooling first.
- Version control every automation script AND every generated configuration in git — `git log` becomes your change management system.
- Test in a lab (GNS3, EVE-NG, Cisco VIRL/CML) before running against production — an automation script with a bug can misconfigure 1,000 devices in seconds.
- Use dry-run modes (Ansible `--check`, NAPALM `compare_config()`) before applying changes — always verify the diff looks correct first.
- Device-type-specific Netmiko drivers handle quirks (pagination, enable mode, timing) that raw Paramiko SSH doesn't — always use Netmiko for SSH automation, not raw Paramiko.

---

## Summary

- Network automation shifts from manual CLI to programmatic, version-controlled, tested deployments — eliminating configuration drift and human error.
- Key data formats: JSON (APIs), YAML (human-readable configs, Ansible), XML (NETCONF), YANG (data models).
- Modern device APIs: NETCONF (SSH+XML, RFC 6241), RESTCONF (HTTPS+JSON, RFC 8040), gNMI (gRPC streaming telemetry).
- Python ecosystem: Netmiko (SSH automation), NAPALM (multi-vendor abstraction), Jinja2 (config templating), TextFSM/NTC-Templates (output parsing).
- Always test automation with dry-run/check mode before applying; version-control all scripts and generated configs in git.
- The automation pyramid: scripting → config management → intent-based → closed-loop self-healing — most teams are between levels 1 and 2.
