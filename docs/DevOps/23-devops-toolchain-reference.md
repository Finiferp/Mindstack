---
title: "DevOps Toolchain Quick Reference"
sidebar_label: "Toolchain Reference"
sidebar_position: 23
---

# DevOps Toolchain Quick Reference

A single-page command lookup across every tool covered in this course. For explanations and context, see each tool's dedicated page.

---

## Docker

```bash
docker run -d -p 8080:80 --name web nginx     # run detached, port-mapped, named
docker ps -a                                    # all containers
docker logs -f <container>                      # follow logs
docker exec -it <container> bash                 # shell in
docker build -t myapp:1.0 .                      # build image
docker push myrepo/myapp:1.0                      # push to registry
docker system prune -a --volumes                  # clean up everything unused
docker compose up -d                               # start multi-container app
docker compose down -v                              # stop + remove volumes
```

---

## Kubernetes (kubectl)

```bash
kubectl get pods -A                              # all pods, all namespaces
kubectl describe pod <name>                        # detailed info + events
kubectl logs -f <pod> -c <container>                # follow container logs
kubectl exec -it <pod> -- bash                        # shell in
kubectl apply -f manifest.yaml                          # create/update
kubectl delete -f manifest.yaml                           # delete
kubectl rollout status deployment/<name>                    # watch rollout
kubectl rollout undo deployment/<name>                         # rollback
kubectl scale deployment/<name> --replicas=5                     # scale
kubectl port-forward svc/<name> 8080:80                            # local access
kubectl top pods                                                     # resource usage
kubectl get events --sort-by='.lastTimestamp'                          # recent events
```

---

## Helm

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-release bitnami/postgresql -f values.yaml
helm upgrade --install my-release ./mychart --atomic
helm rollback my-release 2
helm list -A
helm template ./mychart                            # render locally
helm uninstall my-release
```

---

## Terraform

```bash
terraform init
terraform fmt -check
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
terraform destroy
terraform state list
terraform state show aws_instance.web
terraform workspace select production
terraform import aws_instance.web i-1234567890
```

---

## Ansible

```bash
ansible all -i inventory.ini -m ping
ansible-playbook -i inventory.ini site.yml
ansible-playbook site.yml --check --diff              # dry run
ansible-playbook site.yml --limit web1 --tags nginx
ansible-vault edit secrets.yml
ansible-galaxy install geerlingguy.nginx
```

---

## Git (see dedicated Git course for full coverage)

```bash
git switch -c feature/x                    # create + switch branch
git add -p                                  # interactive stage
git commit -m "feat: ..."
git push -u origin feature/x
git rebase -i main                          # clean up before PR
git log --oneline --graph --all
```

---

## GitHub CLI

```bash
gh pr create --title "..." --body "..." --base main
gh pr checkout 123
gh pr review 123 --approve
gh pr merge 123 --squash --delete-branch
gh workflow run deploy.yml -f environment=staging
gh run watch
gh release create v1.2.0 --generate-notes
```

---

## AWS CLI

```bash
aws sts get-caller-identity                    # who am I
aws s3 sync ./dist s3://my-bucket/ --delete
aws ec2 describe-instances
aws ecs update-service --cluster mycluster --service myservice --force-new-deployment
aws logs tail /aws/lambda/my-function --follow
aws eks update-kubeconfig --name my-cluster
```

---

## Prometheus / PromQL Cheatsheet

```promql
rate(http_requests_total[5m])                          # per-second rate
sum by (endpoint) (rate(http_requests_total[5m]))       # broken down
histogram_quantile(0.95, rate(request_duration_bucket[5m]))  # p95 latency
up == 0                                                    # down targets
increase(errors_total[1h])                                    # total in window
```

---

## jq (JSON processing — essential companion to most CLI tools)

```bash
kubectl get pods -o json | jq -r '.items[].metadata.name'
echo "$RESPONSE" | jq '.data[] | select(.status == "active")'
echo "$RESPONSE" | jq '{name, status}'                    # pick fields
aws ec2 describe-instances | jq -r '.Reservations[].Instances[].InstanceId'
```

---

## CI/CD Pipeline Syntax Quick Compare

```yaml
# GitHub Actions
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

# GitLab CI
build:
  stage: build
  image: node:20
  script:
    - npm test

# Jenkinsfile (Declarative)
pipeline {
  agent any
  stages {
    stage('Build') {
      steps { sh 'npm test' }
    }
  }
}
```

---

## Nginx Config Snippets

```nginx
# Reverse proxy
location / {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# Load balancing
upstream backend {
    least_conn;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
}

# TLS
listen 443 ssl http2;
ssl_certificate /etc/nginx/certs/cert.pem;
ssl_certificate_key /etc/nginx/certs/key.pem;
```

---

## Vault

```bash
vault kv put secret/myapp/db username=admin password=secret
vault kv get -field=password secret/myapp/db
vault read database/creds/readonly
vault policy write myapp-policy myapp-policy.hcl
```

---

## Argo CD

```bash
argocd login localhost:8080
argocd app list
argocd app sync myapp
argocd app history myapp
argocd app rollback myapp <revision>
```

---

## Common Port Reference

| Service | Port |
|---|---|
| HTTP | 80 |
| HTTPS | 443 |
| SSH | 22 |
| PostgreSQL | 5432 |
| MySQL | 3306 |
| Redis | 6379 |
| MongoDB | 27017 |
| Elasticsearch | 9200 |
| Kibana | 5601 |
| Prometheus | 9090 |
| Grafana | 3000 |
| Vault | 8200 |
| Jenkins | 8080 |
| Kubernetes API | 6443 |
| etcd | 2379-2380 |
| Docker daemon | 2375/2376 |

---

## Environment Promotion Checklist

```
Before promoting a build from staging to production:
  [ ] All automated tests passing
  [ ] Security scans clean (SAST, dependency, container)
  [ ] Manual QA sign-off (if required by your process)
  [ ] Database migrations tested and reversible
  [ ] Rollback plan documented and understood
  [ ] Monitoring/alerting in place for the new functionality
  [ ] Feature flags configured (if using progressive rollout)
  [ ] Runbook updated if new failure modes are possible
  [ ] Change communicated to relevant stakeholders
```

---

## Incident Response Quick Reference

```
1. Acknowledge the page
2. Assess severity (SEV1-4)
3. Assign/become Incident Commander if SEV1/SEV2
4. Mitigate first (rollback/failover/flag off), root-cause later
5. Communicate status regularly (internal channel + status page)
6. Resolve the underlying issue
7. Schedule a blameless postmortem within 48 hours
8. Track action items to completion
```

---

## Summary

This page is a lookup reference — for context on any command or concept,
navigate to the dedicated page for that tool. Key cross-cutting habits
worth internalizing across every tool in this course:

- Always dry-run/plan before applying (`terraform plan`, `kubectl apply --dry-run`, `ansible --check`, `helm --dry-run`).
- Version control everything — infrastructure, configuration, and pipeline definitions, not just application code.
- Prefer declarative over imperative wherever the tool supports it — idempotency prevents an entire class of bugs.
- Secrets never belong in code or plain config files — use the platform's secret store or Vault.
- Every production change should be reviewable, automated, and reversible.
