---
title: "Ansible for Network Automation"
sidebar_label: "Ansible"
sidebar_position: 64
---

# Ansible for Network Automation

Ansible is the most widely used network automation tool — agentless, Python-based, and with a rich ecosystem of network modules for Cisco, Juniper, Arista, and many others.

---

## Ansible Architecture

```
Control Node: where Ansible runs (your laptop, jump host, CI/CD runner)
  No agent required on managed devices — Ansible connects via SSH or APIs
  Requires: Python 3.8+, pip install ansible ansible-lint

Managed Nodes: network devices being automated
  Network devices: SSH connection; Ansible translates playbook to CLI commands
  Some devices: NETCONF or HTTPS API (no SSH needed)
  Linux servers: standard SSH + Python required on target

Key concepts:
  Inventory: list of devices to manage
  Playbook: YAML file defining what to do and where
  Task: a single action (configure an interface, run a command)
  Module: Python code that implements a task (cisco.ios.ios_interfaces, etc.)
  Role: reusable package of tasks, templates, variables
  Collection: package of modules, roles, plugins (galaxy.ansible.com)
```

---

## Inventory

```yaml
# inventory.yaml — defines the devices Ansible manages

all:
  children:
    routers:
      hosts:
        core-rtr-01:
          ansible_host: 10.0.0.1
          ansible_network_os: cisco.ios.ios
          ospf_area: 0
          bgp_asn: 65001
        core-rtr-02:
          ansible_host: 10.0.0.2
          ansible_network_os: cisco.ios.ios
          ospf_area: 0
          bgp_asn: 65001

    switches:
      hosts:
        access-sw-01:
          ansible_host: 10.0.1.1
          ansible_network_os: cisco.ios.ios
        access-sw-02:
          ansible_host: 10.0.1.2
          ansible_network_os: cisco.ios.ios

    juniper:
      hosts:
        pe-rtr-01:
          ansible_host: 10.0.2.1
          ansible_network_os: junipernetworks.junos.junos

  vars:
    ansible_user: admin
    ansible_ssh_pass: "{{ vault_ssh_password }}"   # from Ansible Vault
    ansible_connection: network_cli
    ansible_become: yes
    ansible_become_method: enable
    ansible_become_password: "{{ vault_enable_password }}"
```

```ini
# inventory.ini — alternative flat format
[routers]
core-rtr-01 ansible_host=10.0.0.1 bgp_asn=65001
core-rtr-02 ansible_host=10.0.0.2 bgp_asn=65001

[switches]
access-sw-01 ansible_host=10.0.1.1
access-sw-02 ansible_host=10.0.1.2

[routers:vars]
ansible_network_os=cisco.ios.ios
ansible_connection=network_cli
ansible_user=admin

[all:vars]
ansible_ssh_pass="{{ vault_ssh_password }}"
```

```yaml
# group_vars/routers.yaml — variables for all routers group
ansible_network_os: cisco.ios.ios
ansible_connection: network_cli
ntp_servers:
  - 10.0.0.100
  - 10.0.0.101
dns_servers:
  - 8.8.8.8
  - 8.8.4.4

# host_vars/core-rtr-01.yaml — variables for specific host
bgp_neighbors:
  - ip: 203.0.113.1
    asn: 65002
    description: ISP-A
  - ip: 203.0.113.5
    asn: 65003
    description: ISP-B
```

---

## Playbooks

```yaml
# configure_interfaces.yaml
---
- name: Configure Router Interfaces
  hosts: routers              # target from inventory
  gather_facts: false         # skip fact gathering for network devices (no Python on device)

  tasks:
    - name: Configure loopback interface
      cisco.ios.ios_interfaces:
        config:
          - name: Loopback0
            description: "Management loopback"
            enabled: true
        state: merged        # merge with existing config (also: replaced, overridden, deleted)

    - name: Configure IP addresses
      cisco.ios.ios_l3_interfaces:
        config:
          - name: GigabitEthernet0/0
            ipv4:
              - address: "10.0.0.1/30"
        state: merged

    - name: Configure OSPF
      cisco.ios.ios_ospfv2:
        config:
          processes:
            - process_id: 1
              router_id: "{{ hostvars[inventory_hostname].ansible_host }}"
              areas:
                - area_id: "0"
              network:
                - address: "10.0.0.0"
                  wildcard_bits: "0.0.0.255"
                  area: "0"
        state: merged

    - name: Save configuration
      cisco.ios.ios_command:
        commands:
          - write memory

---
- name: Run show commands and collect facts
  hosts: all
  gather_facts: false

  tasks:
    - name: Gather IOS facts
      cisco.ios.ios_facts:
        gather_subset:
          - interfaces
          - neighbors
          - config

    - name: Show interface status
      cisco.ios.ios_command:
        commands:
          - show ip interface brief
      register: interface_output

    - name: Print interface output
      debug:
        msg: "{{ interface_output.stdout[0] }}"

    - name: Save output to file
      copy:
        content: "{{ interface_output.stdout[0] }}"
        dest: "outputs/{{ inventory_hostname }}_interfaces.txt"
      delegate_to: localhost
```

---

## Cisco IOS Modules Reference

```yaml
# ── Interfaces ──────────────────────────────────────────────────────────────
- name: Configure interfaces (L1/L2)
  cisco.ios.ios_interfaces:
    config:
      - name: GigabitEthernet0/1
        description: "LAN interface"
        enabled: true
        speed: "1000"
        duplex: full
    state: merged

- name: Configure IP addresses (L3)
  cisco.ios.ios_l3_interfaces:
    config:
      - name: GigabitEthernet0/1
        ipv4:
          - address: "192.168.1.1/24"
    state: merged

- name: Configure VLANs
  cisco.ios.ios_vlans:
    config:
      - vlan_id: 10
        name: CORPORATE
      - vlan_id: 20
        name: GUEST
    state: merged

- name: Configure switchport
  cisco.ios.ios_l2_interfaces:
    config:
      - name: GigabitEthernet1/0/1
        mode: access
        access:
          vlan: 10
    state: merged

# ── Routing ──────────────────────────────────────────────────────────────────
- name: Configure static routes
  cisco.ios.ios_static_routes:
    config:
      - address_families:
          - afi: ipv4
            routes:
              - dest: "0.0.0.0/0"
                next_hops:
                  - forward_router_address: "203.0.113.1"
                    name: "Default via ISP"
    state: merged

- name: Configure OSPF
  cisco.ios.ios_ospfv2:
    config:
      processes:
        - process_id: 1
          router_id: "1.1.1.1"
    state: merged

- name: Configure BGP
  cisco.ios.ios_bgp_global:
    config:
      as_number: "65001"
      router_id: "1.1.1.1"
      neighbors:
        - neighbor_address: "203.0.113.2"
          remote_as: "65002"
          description: "ISP-A peer"
    state: merged

# ── Security ─────────────────────────────────────────────────────────────────
- name: Configure ACL
  cisco.ios.ios_acls:
    config:
      - afi: ipv4
        acls:
          - name: MGMT-ONLY
            acl_type: standard
            aces:
              - sequence: 10
                grant: permit
                source:
                  address: "10.0.0.0"
                  wildcard_bits: "0.0.0.255"
              - sequence: 20
                grant: deny
                source:
                  any: true
                log: true
    state: merged

# ── Run arbitrary commands ────────────────────────────────────────────────────
- name: Run show command
  cisco.ios.ios_command:
    commands:
      - show ip route
      - show ip bgp summary
      - show version
  register: show_output

- name: Send config commands (raw)
  cisco.ios.ios_config:
    lines:
      - ip route 10.99.0.0 255.255.0.0 10.0.0.2
    save_when: changed   # save config if any change made
```

---

## Roles — Reusable Automation Packages

```
Role directory structure:
  roles/
  └── cisco_base_hardening/
      ├── tasks/
      │   └── main.yaml       # tasks to run
      ├── templates/
      │   └── banner.j2       # Jinja2 templates
      ├── vars/
      │   └── main.yaml       # role variables (overridden by playbook)
      ├── defaults/
      │   └── main.yaml       # default variable values
      ├── handlers/
      │   └── main.yaml       # handlers (triggered by notify)
      └── README.md
```

```yaml
# roles/cisco_base_hardening/tasks/main.yaml
---
- name: Set hostname
  cisco.ios.ios_hostname:
    config:
      hostname: "{{ inventory_hostname }}"
    state: merged

- name: Set management ACL
  cisco.ios.ios_acls:
    config:
      - afi: ipv4
        acls:
          - name: "{{ mgmt_acl_name }}"
            acl_type: standard
            aces: "{{ mgmt_acl_entries }}"
    state: replaced

- name: Configure SSH
  cisco.ios.ios_config:
    lines:
      - ip ssh version 2
      - crypto key generate rsa modulus 4096
    save_when: changed

- name: Apply banner from template
  cisco.ios.ios_banner:
    banner: motd
    text: "{{ lookup('template', 'banner.j2') }}"
    state: present

- name: Configure NTP servers
  cisco.ios.ios_ntp_global:
    config:
      servers:
        - server: "{{ item }}"
          prefer: "{{ loop.first }}"
    state: merged
  loop: "{{ ntp_servers }}"

# roles/cisco_base_hardening/defaults/main.yaml
---
mgmt_acl_name: MGMT-ACCESS
ntp_servers:
  - 0.pool.ntp.org
  - 1.pool.ntp.org

# roles/cisco_base_hardening/templates/banner.j2
WARNING: Unauthorized access to {{ inventory_hostname }} is prohibited.
All activity is monitored and logged.
Authorized users only. Disconnect immediately if not authorized.

# Playbook using the role:
---
- name: Harden all routers
  hosts: routers
  roles:
    - cisco_base_hardening
```

---

## Handlers

```yaml
# Handlers run when notified — typically for actions that should happen
# once even if multiple tasks trigger them

# tasks/main.yaml
- name: Update OSPF config
  cisco.ios.ios_ospfv2:
    config: ...
  notify: save configuration    # triggers handler if task made a change

- name: Update BGP config
  cisco.ios.ios_bgp_global:
    config: ...
  notify: save configuration    # same handler; only runs once

# handlers/main.yaml
- name: save configuration
  cisco.ios.ios_command:
    commands:
      - write memory
```

---

## Ansible Vault — Secrets Management

```bash
# Encrypt a file
ansible-vault encrypt group_vars/all/vault.yaml

# Create encrypted file
ansible-vault create host_vars/core-rtr-01/vault.yaml

# Edit encrypted file
ansible-vault edit group_vars/all/vault.yaml

# Content of vault.yaml (before encryption):
vault_ssh_password: MySecretSSHPassword
vault_enable_password: MyEnablePassword
vault_bgp_password: BGPmd5Secret

# Reference in other var files:
ansible_ssh_pass: "{{ vault_ssh_password }}"

# Run playbook with vault:
ansible-playbook playbook.yaml --ask-vault-pass
ansible-playbook playbook.yaml --vault-password-file ~/.vault_pass.txt
# Recommended: store vault password in .vault_pass.txt; add to .gitignore
```

---

## Check Mode and Diff Mode

```bash
# Check mode (dry run) — show what would change without applying
ansible-playbook playbook.yaml --check

# Diff mode — show config diffs (what changed)
ansible-playbook playbook.yaml --diff

# Both together — safest way to validate before applying
ansible-playbook playbook.yaml --check --diff

# Limit to specific hosts or groups
ansible-playbook playbook.yaml --limit core-rtr-01
ansible-playbook playbook.yaml --limit routers

# Tags — run only specific tagged tasks
ansible-playbook playbook.yaml --tags "interfaces,ospf"
ansible-playbook playbook.yaml --skip-tags "bgp"

# Verbose output
ansible-playbook playbook.yaml -v    # verbose
ansible-playbook playbook.yaml -vvv  # very verbose (connection details)
```

---

## Full Example — Multi-Tier Network Config Playbook

```yaml
---
# site.yaml — top-level playbook
- import_playbook: playbooks/configure_routers.yaml
- import_playbook: playbooks/configure_switches.yaml
- import_playbook: playbooks/verify_connectivity.yaml

# playbooks/verify_connectivity.yaml
---
- name: Verify network connectivity
  hosts: routers
  gather_facts: false

  tasks:
    - name: Ping default gateway from each router
      cisco.ios.ios_command:
        commands:
          - ping {{ item }} repeat 5
      register: ping_results
      loop: "{{ ping_targets }}"
      vars:
        ping_targets:
          - 8.8.8.8
          - 1.1.1.1

    - name: Verify BGP neighbors are established
      cisco.ios.ios_command:
        commands:
          - show ip bgp summary
      register: bgp_summary

    - name: Assert BGP neighbors are up
      assert:
        that:
          - "'Established' in bgp_summary.stdout[0]"
        fail_msg: "BGP neighbor not established on {{ inventory_hostname }}"
        success_msg: "BGP neighbors established on {{ inventory_hostname }}"

    - name: Collect show run for audit
      cisco.ios.ios_command:
        commands:
          - show running-config
      register: running_config

    - name: Save running config to audit directory
      copy:
        content: "{{ running_config.stdout[0] }}"
        dest: "audits/{{ inventory_hostname }}_{{ ansible_date_time.date }}.cfg"
      delegate_to: localhost
```

---

## Tips

- Always run `--check --diff` before applying changes in production — it shows exactly what would change without touching the devices.
- Use `state: replaced` (not `merged`) when you want Ansible to be the authoritative source for a section — `merged` only adds, never removes; `replaced` removes anything not in your config.
- Store sensitive variables in Ansible Vault and add the vault password file to `.gitignore` — never commit unencrypted credentials to git.
- Use `delegate_to: localhost` when a task needs to run on the Ansible controller (saving files, API calls) rather than the managed device.
- Install network collections from Ansible Galaxy: `ansible-galaxy collection install cisco.ios juniperneworks.junos arista.eos`.

---

## Summary

- Ansible is agentless — connects via SSH (or API) from the control node; no Python required on network devices.
- Inventory defines hosts and groups; group_vars and host_vars provide variables per group or device.
- Modules (cisco.ios.ios_interfaces, cisco.ios.ios_bgp_global, etc.) are idempotent — running them twice produces the same result.
- `state: merged` adds config; `state: replaced` replaces the section; `state: deleted` removes it; `state: overridden` replaces all config of that type.
- Roles package reusable automation (tasks + templates + variables) — use them for patterns like "base hardening," "OSPF config," "VLAN provisioning."
- Ansible Vault encrypts secrets — always encrypt passwords, keys, and certificates; never store them in plaintext in git.
