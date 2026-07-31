---
title: "Ansible"
sidebar_label: "Ansible"
sidebar_position: 10
---

# Ansible

Ansible is a configuration management and automation tool — it configures existing servers (installing packages, managing files, starting services) using simple, agentless YAML playbooks over SSH.

**Docs:** [docs.ansible.com](https://docs.ansible.com)

---

## Terraform vs Ansible

```
Terraform: PROVISIONS infrastructure (creates the VM, the network, the load balancer)
Ansible:   CONFIGURES infrastructure (installs software, manages config files on that VM)

Common pattern: Terraform creates the servers → Ansible configures them
Ansible is agentless — no software needs to be installed on managed hosts,
it just uses SSH (or WinRM for Windows) and Python
```

---

## Installation and Inventory

```bash
pip install ansible
ansible --version

# Inventory — defines which hosts Ansible manages
# inventory.ini
[webservers]
web1.example.com
web2.example.com ansible_host=10.0.1.5

[dbservers]
db1.example.com ansible_user=admin ansible_port=2222

[production:children]     # group of groups
webservers
dbservers

[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

```yaml
# inventory.yml — YAML format (more powerful, supports nested vars)
all:
  children:
    webservers:
      hosts:
        web1.example.com:
        web2.example.com:
          ansible_host: 10.0.1.5
      vars:
        http_port: 80
    dbservers:
      hosts:
        db1.example.com:
          ansible_user: admin
```

```bash
# Test connectivity
ansible all -i inventory.ini -m ping
ansible webservers -i inventory.ini -m ping

# Ad-hoc commands (no playbook needed)
ansible webservers -i inventory.ini -m shell -a "uptime"
ansible webservers -i inventory.ini -m apt -a "name=nginx state=present" --become
ansible all -i inventory.ini -m setup           # gather facts about hosts
```

---

## Playbooks

```yaml
# site.yml
---
- name: Configure web servers
  hosts: webservers
  become: true                    # use sudo
  vars:
    http_port: 80
    app_version: "1.2.3"

  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present
        update_cache: true

    - name: Copy nginx config
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/sites-available/myapp
      notify: restart nginx        # triggers the handler below

    - name: Enable site
      file:
        src: /etc/nginx/sites-available/myapp
        dest: /etc/nginx/sites-enabled/myapp
        state: link

    - name: Ensure nginx is running and enabled
      service:
        name: nginx
        state: started
        enabled: true

  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
```

```bash
ansible-playbook -i inventory.ini site.yml
ansible-playbook -i inventory.ini site.yml --check       # dry run
ansible-playbook -i inventory.ini site.yml --diff        # show file changes
ansible-playbook -i inventory.ini site.yml --limit web1  # run on one host
ansible-playbook -i inventory.ini site.yml --tags "nginx" # run only tagged tasks
ansible-playbook -i inventory.ini site.yml -v            # verbose (-vvv for more)
```

---

## Idempotency

```
The core principle of Ansible: running a playbook twice produces the
SAME end state, and the second run reports "no changes" (not errors, not duplicates).

Ansible modules are built to be idempotent:
  apt: name=nginx state=present
  → Installs nginx if not present; does NOTHING if already installed

  file: path=/etc/myapp state=directory
  → Creates the directory if missing; does nothing if it already exists

  This is why Ansible uses declarative modules ("what should exist")
  rather than imperative shell commands ("run this exact command")
  wherever possible — shell commands are NOT automatically idempotent.

Compare:
  BAD (not idempotent — appends every run):
    shell: echo "export PATH=$PATH:/opt/app/bin" >> ~/.bashrc

  GOOD (idempotent):
    lineinfile:
      path: ~/.bashrc
      line: 'export PATH=$PATH:/opt/app/bin'
```

---

## Common Modules

```yaml
tasks:
  # Package management
  - apt: {name: nginx, state: present}                # Debian/Ubuntu
  - yum: {name: nginx, state: present}                 # RHEL/CentOS
  - package: {name: nginx, state: present}             # OS-agnostic

  # Services
  - service: {name: nginx, state: started, enabled: true}
  - systemd: {name: myapp, state: restarted, daemon_reload: true}

  # Files and directories
  - file: {path: /opt/app, state: directory, mode: '0755', owner: deploy}
  - file: {path: /tmp/old.txt, state: absent}          # delete
  - copy: {src: files/app.conf, dest: /etc/app.conf, mode: '0644'}
  - template: {src: nginx.conf.j2, dest: /etc/nginx/nginx.conf}
  - lineinfile: {path: /etc/hosts, line: '10.0.0.5 db.internal'}
  - blockinfile:
      path: /etc/ssh/sshd_config
      block: |
        PermitRootLogin no
        PasswordAuthentication no

  # Users and permissions
  - user: {name: deploy, groups: sudo, shell: /bin/bash}
  - group: {name: developers, state: present}

  # Commands (use sparingly — prefer dedicated modules)
  - command: /usr/bin/myapp --migrate      # no shell features (pipes, redirects)
  - shell: cat /var/log/app.log | grep ERROR   # full shell features
  - command: /usr/bin/deploy.sh
    args:
      creates: /opt/app/.deployed           # skip if this file already exists (idempotency)

  # Git
  - git: {repo: 'https://github.com/org/repo.git', dest: /opt/app, version: main}

  # Downloads
  - get_url: {url: 'https://example.com/file.tar.gz', dest: /tmp/file.tar.gz}
  - unarchive: {src: /tmp/file.tar.gz, dest: /opt/, remote_src: true}

  # Docker
  - docker_container:
      name: myapp
      image: myapp:1.0
      state: started
      ports: ["8080:8080"]

  # Cloud (requires provider SDK / collection)
  - amazon.aws.ec2_instance: {name: web1, instance_type: t3.micro, image_id: ami-123}
```

---

## Variables

```yaml
# Defined in playbook
vars:
  app_name: myapp
  app_port: 8080

# Defined in inventory
[webservers:vars]
app_port=8080

# host_vars/web1.example.com.yml — per-host
app_env: production

# group_vars/webservers.yml — per-group
http_port: 80

# Command line
ansible-playbook site.yml -e "app_version=1.2.3"
ansible-playbook site.yml -e "@vars/production.yml"

# Register — capture task output as a variable
tasks:
  - name: Check disk space
    shell: df -h /
    register: disk_output

  - name: Show disk space
    debug:
      msg: "{{ disk_output.stdout }}"

# Facts — automatically gathered system information
tasks:
  - debug: msg="OS is {{ ansible_facts['distribution'] }} {{ ansible_facts['distribution_version'] }}"
  - debug: msg="IP is {{ ansible_facts['default_ipv4']['address'] }}"
```

---

## Templates (Jinja2)

```jinja2
{# templates/nginx.conf.j2 #}
server {
    listen {{ http_port }};
    server_name {{ server_name }};

    location / {
        proxy_pass http://127.0.0.1:{{ app_port }};
    }

    {% if enable_ssl %}
    listen 443 ssl;
    ssl_certificate {{ ssl_cert_path }};
    {% endif %}

    {% for header in extra_headers %}
    add_header {{ header.name }} "{{ header.value }}";
    {% endfor %}
}
```

```yaml
- name: Deploy nginx config
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/myapp
  vars:
    http_port: 80
    server_name: myapp.com
    enable_ssl: true
```

---

## Roles — Reusable Playbook Components

```
roles/
└── nginx/
    ├── tasks/main.yml         ← the actual tasks
    ├── handlers/main.yml       ← handlers
    ├── templates/nginx.conf.j2
    ├── files/                   ← static files to copy
    ├── vars/main.yml             ← role-specific variables
    ├── defaults/main.yml         ← default variable values (lowest priority)
    └── meta/main.yml              ← role metadata, dependencies
```

```yaml
# roles/nginx/tasks/main.yml
- name: Install nginx
  apt: {name: nginx, state: present}

- name: Deploy config
  template: {src: nginx.conf.j2, dest: /etc/nginx/nginx.conf}
  notify: restart nginx

# roles/nginx/handlers/main.yml
- name: restart nginx
  service: {name: nginx, state: restarted}

# roles/nginx/defaults/main.yml
http_port: 80
```

```yaml
# site.yml — using roles
---
- name: Configure web servers
  hosts: webservers
  become: true
  roles:
    - common
    - nginx
    - { role: app, app_version: "1.2.3" }

# Ansible Galaxy — community roles repository
ansible-galaxy install geerlingguy.nginx
ansible-galaxy init roles/myrole      # scaffold a new role
```

---

## Ansible Vault — Encrypted Secrets

```bash
# Encrypt a file
ansible-vault create secrets.yml
ansible-vault edit secrets.yml
ansible-vault encrypt vars/production.yml
ansible-vault decrypt vars/production.yml
ansible-vault view secrets.yml

# Use in playbook run
ansible-playbook site.yml --ask-vault-pass
ansible-playbook site.yml --vault-password-file ~/.vault_pass

# secrets.yml (encrypted at rest, plain YAML when decrypted)
db_password: supersecret123
api_key: abc123xyz
```

```yaml
# Reference encrypted vars normally in playbooks
vars_files:
  - secrets.yml

tasks:
  - name: Configure database
    template:
      src: db.conf.j2
      dest: /etc/app/db.conf
    vars:
      password: "{{ db_password }}"
```

---

## How Ansible Actually Works Internally

```
Ansible has no persistent agent and no daemon on managed hosts — this is
what "agentless" really means mechanically, not just marketing:

  1. You run `ansible-playbook site.yml`
  2. For each task, Ansible generates a small Python script tailored to
     that task (e.g. the 'apt' module becomes a self-contained Python
     script that checks/installs a package)
  3. Ansible copies that script over SSH to a temp directory on the
     target host (e.g. ~/.ansible/tmp/...)
  4. Ansible SSHes in and executes the script
  5. The script outputs JSON describing what it did (changed: true/false,
     any facts gathered, error details if it failed)
  6. Ansible parses that JSON, reports the result, deletes the temp script
  7. Repeat for the next task, next host

This is why:
  - No agent installation needed — just SSH + Python on the target
  - Every module run is fundamentally "generate a script → ship it →
    run it → parse JSON → clean up" — the same pattern regardless of
    whether the module manages a file, a package, or a cloud resource
  - Ansible is naturally somewhat SLOWER than agent-based tools (Puppet,
    Chef) because of the per-task SSH connection overhead — mitigated
    by SSH connection pipelining/multiplexing (ControlPersist) and by
    running tasks in parallel across many hosts simultaneously (the
    default 'forks' setting controls how many hosts run at once)
```

### The Idempotency Check Pattern

```
Every well-written Ansible module follows the same internal logic:

  1. CHECK current state (e.g. "is nginx installed? what version?")
  2. COMPARE to desired state (from your task's parameters)
  3. If they MATCH: do nothing, report changed: false
  4. If they DIFFER: make the change, report changed: true

This check-then-act pattern is EXACTLY why running a playbook twice in
a row shows "0 changed" the second time — every module already did its
own diffing internally before touching anything. This is fundamentally
the same idempotent reconciliation concept as Kubernetes controllers
and Terraform's plan/apply — check desired vs actual, act only on the
difference.

Understanding this explains why `shell`/`command` tasks are NOT
automatically idempotent: they just run a command every time, with no
built-in "check first" logic. You have to add that logic yourself
(via `creates:`, `removes:`, `when:`, or a preceding check task) to
get the same idempotent behavior a proper module gives you for free.
```

### Execution Strategy and Parallelism

```
By default, Ansible runs each TASK across ALL hosts before moving to
the next task ("linear" strategy) — this is why a playbook can seem to
"pause" if one host is slow: Ansible waits for the slowest host to
finish the current task before any host starts the next one.

  Task 1: install nginx  → runs on web1, web2, web3 in parallel (up to 'forks')
          (waits for ALL three to finish)
  Task 2: start nginx     → runs on web1, web2, web3 in parallel
          (waits for ALL three to finish)
  ...

strategy: free    — hosts run through ALL tasks independently, not
                     lockstepped — faster overall, but harder to reason
                     about ordering/output
forks: 20          — how many hosts to process simultaneously (ansible.cfg
                     or --forks flag); default is 5, often too low for
                     large fleets

Understanding 'linear' strategy explains a common confusion: "why did
my playbook hang?" — usually one specific host is unreachable/slow on
the CURRENT task, and every other host is just waiting for it.
```

---

## Troubleshooting Guide

```
"UNREACHABLE! => SSH Error"
  Basic connectivity/auth problem — verify with:
  ansible all -i inventory.ini -m ping -vvv    # -vvv shows the actual SSH command
  Common causes: wrong SSH key, host not in known_hosts, firewall blocking port 22

"fatal: FAILED! => Python not found"
  Target host doesn't have Python installed (rare on modern distros, common
  on minimal/container-based images)
  Fix: ansible_python_interpreter=/usr/bin/python3 in inventory,
  or bootstrap Python first with a raw/script module task

Task shows "changed" every single run, never settles to "ok"
  Almost always a shell/command task without idempotency guards, OR
  a template task where the rendered output has non-deterministic
  content (e.g. embeds a timestamp) causing a diff every time
  Fix: add creates:/removes: to command tasks, or fix the template

"Permission denied" on a become (sudo) task
  become: true set, but the SSH user isn't in the sudoers file on
  the target, or requires a password Ansible isn't providing
  ansible-playbook site.yml --ask-become-pass

Playbook is very slow across many hosts
  Check 'forks' setting (default 5) — raise it for larger fleets
  Check strategy — 'linear' waits for the slowest host every task;
  consider 'free' if tasks don't need strict cross-host ordering
  Enable SSH pipelining (reduces the number of SSH operations per task):
  # ansible.cfg
  [ssh_connection]
  pipelining = True
```

---

## Tips

- Prefer dedicated modules (`apt`, `template`, `service`) over `shell`/`command` — modules are idempotent by design; shell commands are not, unless you add `creates:`/`removes:` guards.
- Always run `--check --diff` before applying a playbook to production — it shows exactly what would change without making changes.
- Use roles from the start, even for small projects — the directory structure (`tasks/`, `handlers/`, `templates/`, `defaults/`) forces good organization habits.
- Store secrets in `ansible-vault`-encrypted files, never in plaintext vars committed to git.
- Ansible is agentless (just needs SSH + Python on the target) — this makes it excellent for configuring existing servers without installing anything permanent.

---

## Summary

- Ansible configures existing infrastructure over SSH — agentless, idempotent, YAML-based.
- Inventory defines target hosts; playbooks define tasks; modules do the actual work (`apt`, `service`, `template`, `file`, etc.).
- Idempotency is central — running a playbook twice should produce no changes the second time.
- Roles package reusable configuration (tasks, handlers, templates, defaults) — use Ansible Galaxy for community roles.
- Jinja2 templates (`.j2`) generate config files with variables, conditionals, and loops.
- `ansible-vault` encrypts secrets at rest — never commit plaintext credentials to a playbook repo.
