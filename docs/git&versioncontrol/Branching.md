---
title: "Branching and Merging"
sidebar_label: "Branching"
sidebar_position: 4
---

# Branching and Merging

In Git, a **branch** is simply a pointer to a commit.

When you create a branch, Git does NOT copy your files.  
It only creates a new label (pointer) to an existing commit.

Because of this design, branching in Git is:
- Very fast
- Very lightweight
- Very efficient

---

# Understanding Branches

Imagine your commit history looks like this:

A → B → C

The `main` branch points to commit C.

If you create a new branch:
```console
git branch feature-login
```

Now both `main` and `feature-login` point to commit C.

Nothing was copied.

When you switch to the new branch:
```console
git checkout feature-login
```

And create a new commit:
```console
git commit -m "Add login page"
````
Your history now looks like this:

A → B → C → D  
             ↑  
     feature-login  

While:

main → C

The branches have now separated.

---

# Why Branching Is Powerful

Branches allow you to work safely without affecting the main project.

You can use branches for:

- Parallel development  
- Feature isolation  
- Bug fixes  
- Experiments  
- Preparing releases  

### Example: Feature Development

Instead of adding a login feature directly to `main`, you:

1. Create a branch  
2. Work on the feature  
3. Test it  
4. Merge it back when ready  

This keeps the `main` branch stable.

---

# Merging

Merging means combining changes from one branch into another.

For example:

- You finished `feature-login`
- Now you want to add it to `main`

You switch to main:

```console
git checkout main
```

Then merge:

```console
git merge feature-login
```

Git now integrates the changes.

---

# Types of Merges

## 1. Fast-Forward Merge

This happens when the target branch has no new commits.

Example:

main → A → B  
feature → A → B → C → D  

If you merge feature into main:

Git simply moves the main pointer forward to D.

No extra commit is created.

Result:

main → A → B → C → D  

This is called a **fast-forward** merge.

---

## 2. Three-Way Merge

This happens when both branches have new commits.

Example:

        C  
       /  
A → B  
       \  
        D  

Here:
- C is on feature branch
- D is on main branch
- B is the common ancestor

Git uses:
- The common ancestor (B)
- The current branch (main → D)
- The branch being merged (feature → C)

It combines all three versions to create a new merge commit.

Result:

        C  
       /   \  
A → B       M  
       \   /  
        D  

M is a new **merge commit**.

---

# Merge Conflicts

Sometimes Git cannot automatically combine changes.

This happens when:
- Two branches modify the same lines
- One branch deletes a file while another modifies it

Example:
- main changes line 10 to "Hello World"
- feature changes line 10 to "Hello User"

Git does not know which version is correct.

This is called a **merge conflict**.

When this happens:
1. Git stops the merge
2. You manually fix the file
3. You add the fixed file
4. You complete the commit

Example:

```console
git add app.js  
git commit
```  

After that, the merge is complete.

---

# Why Git Branching Is So Fast

Because Git uses a snapshot-based object model:

- Branches are just pointers
- No file duplication happens
- Switching branches is quick
- Merging is efficient

This is one of the main reasons Git became the industry standard.