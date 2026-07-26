---
title: "Data Structures and Algorithms"
sidebar_label: "DSA"
sidebar_position: 18
---

# Data Structures and Algorithms

Python implementations of the key data structures and algorithms covered in W3Schools DSA.

---

## Stacks

LIFO — Last In, First Out.

```python
# Using a list (simplest approach)
stack = []
stack.append(1)    # push
stack.append(2)
stack.append(3)
top = stack[-1]    # peek without removing
item = stack.pop() # pop — removes and returns top
print(stack)       # [1, 2]

# Using deque (thread-safe, O(1) on both ends)
from collections import deque
stack = deque()
stack.append(1)    # push
stack.append(2)
item = stack.pop() # pop from right

# Class-based Stack
class Stack:
    def __init__(self):
        self._data = []

    def push(self, item):
        self._data.append(item)

    def pop(self):
        if self.is_empty():
            raise IndexError("pop from empty stack")
        return self._data.pop()

    def peek(self):
        if self.is_empty():
            raise IndexError("peek at empty stack")
        return self._data[-1]

    def is_empty(self):
        return len(self._data) == 0

    def size(self):
        return len(self._data)

    def __repr__(self):
        return f"Stack({self._data})"

# Applications
def is_balanced(s):
    """Check if brackets are balanced."""
    stack = []
    pairs = {")": "(", "]": "[", "}": "{"}
    for char in s:
        if char in "([{":
            stack.append(char)
        elif char in ")]}":
            if not stack or stack[-1] != pairs[char]:
                return False
            stack.pop()
    return len(stack) == 0

print(is_balanced("({[]})"))   # True
print(is_balanced("({[})"))    # False

def evaluate_rpn(tokens):
    """Evaluate Reverse Polish Notation expression."""
    stack = []
    ops = {"+": lambda a,b: a+b, "-": lambda a,b: a-b,
           "*": lambda a,b: a*b, "/": lambda a,b: a//b}
    for token in tokens:
        if token in ops:
            b, a = stack.pop(), stack.pop()
            stack.append(ops[token](a, b))
        else:
            stack.append(int(token))
    return stack[0]

print(evaluate_rpn(["2","1","+","3","*"]))  # 9
```

---

## Queues

FIFO — First In, First Out.

```python
from collections import deque

# deque as queue (O(1) on both ends)
queue = deque()
queue.append(1)      # enqueue (right)
queue.append(2)
queue.append(3)
item = queue.popleft()  # dequeue (left) — O(1)
print(item)           # 1

# queue module — thread-safe
import queue

q = queue.Queue(maxsize=10)   # blocking queue
q.put(1)
q.put(2)
item = q.get()         # blocks if empty
q.task_done()          # signal that task is done

# Priority queue
pq = queue.PriorityQueue()
pq.put((3, "low priority"))
pq.put((1, "high priority"))
pq.put((2, "medium priority"))
print(pq.get())   # (1, "high priority")

# heapq — min-heap
import heapq

heap = []
heapq.heappush(heap, 3)
heapq.heappush(heap, 1)
heapq.heappush(heap, 2)
print(heapq.heappop(heap))    # 1 (minimum)
print(heapq.nsmallest(2, [3,1,4,1,5]))  # [1,1]
print(heapq.nlargest(2,  [3,1,4,1,5]))  # [5,4]

# heapify — convert list to heap in-place O(n)
data = [5, 3, 1, 4, 2]
heapq.heapify(data)   # data is now a valid min-heap

# Max-heap — negate values
max_heap = []
heapq.heappush(max_heap, -5)
heapq.heappush(max_heap, -1)
heapq.heappush(max_heap, -3)
print(-heapq.heappop(max_heap))  # 5

# Class-based Queue
class Queue:
    def __init__(self):
        self._data = deque()

    def enqueue(self, item):
        self._data.append(item)

    def dequeue(self):
        if self.is_empty():
            raise IndexError("dequeue from empty queue")
        return self._data.popleft()

    def peek(self):
        return self._data[0]

    def is_empty(self):
        return len(self._data) == 0

    def size(self):
        return len(self._data)
```

---

## Linked Lists

```python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def append(self, data):
        """Add to end."""
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return
        current = self.head
        while current.next:
            current = current.next
        current.next = new_node

    def prepend(self, data):
        """Add to front — O(1)."""
        new_node = Node(data)
        new_node.next = self.head
        self.head = new_node

    def delete(self, data):
        if not self.head:
            return
        if self.head.data == data:
            self.head = self.head.next
            return
        current = self.head
        while current.next:
            if current.next.data == data:
                current.next = current.next.next
                return
            current = current.next

    def search(self, data):
        current = self.head
        while current:
            if current.data == data:
                return True
            current = current.next
        return False

    def to_list(self):
        result = []
        current = self.head
        while current:
            result.append(current.data)
            current = current.next
        return result

    def __repr__(self):
        return " -> ".join(str(x) for x in self.to_list())

    def reverse(self):
        prev = None
        current = self.head
        while current:
            next_node = current.next
            current.next = prev
            prev = current
            current = next_node
        self.head = prev

ll = LinkedList()
ll.append(1)
ll.append(2)
ll.append(3)
ll.prepend(0)
print(ll)        # 0 -> 1 -> 2 -> 3
ll.reverse()
print(ll)        # 3 -> 2 -> 1 -> 0

# Detect cycle (Floyd's algorithm)
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False
```

---

## Hash Tables

Python's `dict` IS a hash table. Here's the concept and custom implementation.

```python
# dict IS a hash table — O(1) average get/set/delete
d = {}
d["key"] = "value"
d.get("key", "default")
del d["key"]

# Custom hash table (educational)
class HashTable:
    def __init__(self, size=16):
        self.size = size
        self.buckets = [[] for _ in range(size)]

    def _hash(self, key):
        return hash(key) % self.size

    def set(self, key, value):
        idx = self._hash(key)
        bucket = self.buckets[idx]
        for i, (k, v) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)  # update
                return
        bucket.append((key, value))        # insert

    def get(self, key, default=None):
        idx = self._hash(key)
        for k, v in self.buckets[idx]:
            if k == key:
                return v
        return default

    def delete(self, key):
        idx = self._hash(key)
        bucket = self.buckets[idx]
        self.buckets[idx] = [(k,v) for k,v in bucket if k != key]

# Counter — hash table for counting
from collections import Counter
c = Counter("abracadabra")     # {'a':5,'b':2,'r':2,'c':1,'d':1}
c.most_common(3)               # [('a',5),('b',2),('r',2)]
c["a"]                          # 5
c["z"]                          # 0 (not KeyError)
c + Counter("aaa")             # combine counters
```

---

## Binary Trees

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

    def __repr__(self):
        return f"TreeNode({self.val})"

# Build a tree
#        1
#       / \
#      2   3
#     / \
#    4   5
root = TreeNode(1,
    TreeNode(2, TreeNode(4), TreeNode(5)),
    TreeNode(3)
)

# Traversals (recursive)
def inorder(node):    # left → root → right (sorted for BST)
    if node:
        inorder(node.left)
        print(node.val, end=" ")
        inorder(node.right)

def preorder(node):   # root → left → right
    if node:
        print(node.val, end=" ")
        preorder(node.left)
        preorder(node.right)

def postorder(node):  # left → right → root
    if node:
        postorder(node.left)
        postorder(node.right)
        print(node.val, end=" ")

inorder(root)    # 4 2 5 1 3
preorder(root)   # 1 2 4 5 3
postorder(root)  # 4 5 2 3 1

# Level-order (BFS)
from collections import deque

def level_order(root):
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:  queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result

print(level_order(root))   # [[1],[2,3],[4,5]]

# Tree height
def height(node):
    if not node:
        return 0
    return 1 + max(height(node.left), height(node.right))

# Binary Search Tree
class BST:
    def __init__(self):
        self.root = None

    def insert(self, val):
        self.root = self._insert(self.root, val)

    def _insert(self, node, val):
        if not node:
            return TreeNode(val)
        if val < node.val:
            node.left = self._insert(node.left, val)
        elif val > node.val:
            node.right = self._insert(node.right, val)
        return node

    def search(self, val):
        return self._search(self.root, val)

    def _search(self, node, val):
        if not node or node.val == val:
            return node
        if val < node.val:
            return self._search(node.left, val)
        return self._search(node.right, val)
```

---

## Sorting Algorithms

```python
# Python's built-in sort (Timsort) — always use this in practice
lst = [3, 1, 4, 1, 5, 9, 2, 6]
lst.sort()                                  # in-place
sorted_lst = sorted(lst)                    # new list
sorted_lst = sorted(lst, reverse=True)      # descending
sorted_lst = sorted(lst, key=lambda x: -x) # custom key

# ── Bubble Sort — O(n²) ─────────────────────────────────────────────────────
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        swapped = False
        for j in range(n - i - 1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
                swapped = True
        if not swapped:
            break   # already sorted
    return arr

# ── Selection Sort — O(n²) ──────────────────────────────────────────────────
def selection_sort(arr):
    for i in range(len(arr)):
        min_idx = i
        for j in range(i+1, len(arr)):
            if arr[j] < arr[min_idx]:
                min_idx = j
        arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr

# ── Insertion Sort — O(n²) best O(n) ────────────────────────────────────────
def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j+1] = arr[j]
            j -= 1
        arr[j+1] = key
    return arr

# ── Merge Sort — O(n log n) ─────────────────────────────────────────────────
def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left  = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

# ── Quick Sort — O(n log n) average, O(n²) worst ────────────────────────────
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left   = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right  = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)
```

---

## Searching Algorithms

```python
# Linear search — O(n)
def linear_search(arr, target):
    for i, item in enumerate(arr):
        if item == target:
            return i
    return -1

# Binary search — O(log n) — array MUST be sorted
def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Built-in bisect module (binary search)
import bisect
arr = [1, 3, 4, 7, 9, 11]
bisect.bisect_left(arr, 7)   # 3 — index where 7 is
bisect.bisect_right(arr, 7)  # 4 — index after 7
bisect.insort(arr, 5)        # insert maintaining sorted order

# Graph search — BFS and DFS
graph = {
    "A": ["B", "C"],
    "B": ["D", "E"],
    "C": ["F"],
    "D": [], "E": [], "F": []
}

def bfs(graph, start):
    visited = set()
    queue = deque([start])
    order = []
    while queue:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            order.append(node)
            queue.extend(graph[node])
    return order

def dfs(graph, start, visited=None):
    if visited is None:
        visited = set()
    visited.add(start)
    order = [start]
    for neighbor in graph[start]:
        if neighbor not in visited:
            order.extend(dfs(graph, neighbor, visited))
    return order

print(bfs(graph, "A"))   # A B C D E F
print(dfs(graph, "A"))   # A B D E C F
```

---

## Big-O Reference

| Algorithm | Best | Average | Worst | Space |
|---|---|---|---|---|
| Bubble Sort | O(n) | O(n²) | O(n²) | O(1) |
| Selection Sort | O(n²) | O(n²) | O(n²) | O(1) |
| Insertion Sort | O(n) | O(n²) | O(n²) | O(1) |
| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) |
| Quick Sort | O(n log n) | O(n log n) | O(n²) | O(log n) |
| Binary Search | O(1) | O(log n) | O(log n) | O(1) |
| Hash table get | O(1) | O(1) | O(n) | O(n) |
| BFS / DFS | — | O(V+E) | O(V+E) | O(V) |

---

## Summary

- Stack: LIFO — use `list.append()`/`list.pop()` or `collections.deque`.
- Queue: FIFO — use `collections.deque.appendleft()`/`popleft()` or `queue.Queue`.
- Heap: min-heap via `heapq` — negate values for max-heap.
- Linked list: nodes with `next` pointer — O(1) prepend, O(n) search.
- Binary tree: recursive structure; traversals: inorder/preorder/postorder/BFS.
- Sort: always use Python's built-in `sorted()` or `.sort()` (Timsort, O(n log n)).
- Binary search: O(log n) on sorted arrays — use `bisect` module.
