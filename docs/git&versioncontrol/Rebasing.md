---
title: "Rebasing and History Management"
sidebar_label: "Rebasing"
sidebar_position: 5
---

# Rebasing and History Management

Rebasing is another way to combine changes from one branch into another.

But unlike merging, **rebasing rewrites history**.

In simple terms:

Rebasing takes your commits and "replays" them on top of another branch.

---

# What Does Rebasing Mean?

Imagine this history:
```
main:      A → B → C  
feature:         D → E  
```
The feature branch was created from commit B.

While you were working on feature:
- The main branch moved forward (commit C was added).

Now your history looks like this:
```
A → B → C        (main)  
     \  
      D → E      (feature)
```
If you rebase feature onto main:

```console
git checkout feature  
git rebase main
```  

Git will:
1. Temporarily remove D and E
2. Move feature to C
3. Replay D and E on top of C

Result:

A → B → C → D' → E'

Notice:
- D and E were recreated (D' and E')
- They have new commit hashes

This is why rebasing rewrites history.

---

# Merge vs Rebase

Both merge and rebase combine changes, but they work differently.

## Merge

- Keeps the original history
- Creates a merge commit (in most cases)
- Preserves the branch structure

Example:

```console
git checkout main  
git merge feature
```  

History may look like:
```
        D → E  
       /       \  
A → B → C        M  
```
You can clearly see where branches split and merged.

### Advantages of Merge
- Safe for shared branches
- Keeps full historical context
- No history rewriting

---

## Rebase

- Creates a linear history
- Makes the timeline look cleaner
- Rewrites commit hashes
- Removes unnecessary merge commits

After rebasing, history looks like:

A → B → C → D' → E'

It looks like feature work happened after C, even though it originally started at B.

### Advantages of Rebase
- Cleaner commit history
- Easier to read logs
- Good for preparing clean pull requests

---

# When to Use Rebase

Rebase is useful when:

- You are working on a local feature branch
- You want a clean history before merging
- You want to update your branch with the latest main changes

Example workflow:

```console
git checkout feature  
git rebase main  
```

This updates your feature branch without creating extra merge commits.

---

# Important Warning

Rebasing changes commit hashes.

Because of this:

You should NOT rebase public branches that other people are using.

If you rewrite shared history:
- Other developers’ history will break
- They may get complex conflicts
- Collaboration becomes difficult

Safe rule:

- Rebase local branches
- Merge shared branches

---

# Conflict During Rebase

Rebase can also produce conflicts.

If a conflict happens:

1. Git stops at the conflicting commit
2. You fix the file manually
3. Stage the fix

```console
git add app.js
```  

4. Continue the rebase

```console
git rebase --continue  
```

If needed, you can cancel the rebase:

```console
git rebase --abort  
````

---

# Summary

Merge:
- Safe
- Keeps branch structure
- Does not rewrite history

Rebase:
- Cleaner history
- Linear timeline
- Rewrites commits
- Do not use on shared public branches

Both are powerful tools.  
Choosing the right one depends on your workflow and team rules.