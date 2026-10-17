"""Original statements for common interview patterns; offline reference oracles.

No company-frequency ranking is claimed. Oracles deliberately favor clarity over
optimal complexity on the small fixtures. They are never sent to the student API.
Each entry has two manually checked sample answers and six distinct hidden inputs.
"""
from collections import Counter, defaultdict, deque
from functools import lru_cache
from itertools import combinations, permutations
import heapq
import math


def render(value):
    if isinstance(value, (list, tuple)):
        return ' '.join(map(str, value)) if value else 'EMPTY'
    return str(value)


def windows(a):
    return [a[i:j] for i in range(len(a)) for j in range(i + 1, len(a) + 1)]


def runs(a):
    best = run = 0
    for x in a:
        run = run + 1 if x else 0
        best = max(best, run)
    return best


def lis(a):
    dp = []
    for i, x in enumerate(a):
        dp.append(1 + max([dp[j] for j in range(i) if a[j] < x] or [0]))
    return max(dp or [0])


def median(a):
    a = sorted(a)
    return a[(len(a)-1)//2]  # lower median, including even lengths


def min_jumps(a):
    dp = [0] + [10**9] * (len(a)-1)
    for i in range(len(a)):
        for j in range(i + 1, min(len(a), i + a[i] + 1)):
            dp[j] = min(dp[j], dp[i] + 1)
    return -1 if not dp or dp[-1] == 10**9 else dp[-1]


def max_rect(matrix):
    best = 0
    for top in range(len(matrix)):
        for bottom in range(top, len(matrix)):
            row = [all(matrix[r][c] for r in range(top, bottom+1)) for c in range(len(matrix[0]))]
            best = max(best, runs(row) * (bottom-top+1))
    return best


def first_pair(a, target):
    return next(([i, j] for i in range(len(a)) for j in range(i+1, len(a)) if a[i]+a[j] == target), [])


def anagram_groups(words):
    groups = defaultdict(list)
    for w in words:
        groups[''.join(sorted(w))].append(w)
    return '|'.join(sorted(','.join(sorted(g)) for g in groups.values())) if groups else 'EMPTY'


def isomorphic(a, b):
    return int(len(a) == len(b) and len(set(zip(a,b))) == len(set(a)) == len(set(b)))


def prefix_common(a, b):
    return [len(set(a[:i]) & set(b[:i])) for i in range(1, len(a)+1)]


def min_cover(a, b):
    return min([len(w) for w in windows(a) if not (Counter(b)-Counter(w))] or [-1]) if b else 0


def alien_order(words):
    chars = sorted(set(''.join(words)))
    edges = set()
    for a, b in zip(words, words[1:]):
        if len(a) > len(b) and a.startswith(b):
            return 'NONE'
        for x, y in zip(a,b):
            if x != y:
                edges.add((x,y)); break
    for order in permutations(chars):
        pos = {c:i for i,c in enumerate(order)}
        if all(pos[a] < pos[b] for a,b in edges):
            return ''.join(order) or 'EMPTY'
    return 'NONE'


def word_ladder(start, end, words):
    words = set(words)
    if end not in words:
        return 0
    queue = deque([(start,1)])
    seen = {start}
    while queue:
        w,n = queue.popleft()
        if w == end:
            return n
        for v in sorted(words-seen):
            if sum(a != b for a,b in zip(w,v)) == 1:
                seen.add(v); queue.append((v,n+1))
    return 0


def ladder_count(start, end, words):
    words = set(words)
    if end not in words:
        return 0
    dist, counts = {start:0}, {start:1}
    q = deque([start])
    while q:
        w=q.popleft()
        for v in words:
            if sum(a != b for a,b in zip(w,v)) != 1:
                continue
            if v not in dist:
                dist[v]=dist[w]+1; counts[v]=0; q.append(v)
            if dist[v] == dist[w]+1:
                counts[v]+=counts[w]
    return counts.get(end,0)


def palindrome_pairs(words):
    return sum(i != j and a+b == (a+b)[::-1] for i,a in enumerate(words) for j,b in enumerate(words))


def concatenations(s, words):
    size=len(words[0]); length=size*len(words)
    return [i for i in range(len(s)-length+1) if Counter(s[j:j+size] for j in range(i,i+length,size)) == Counter(words)]


def lru(capacity, ops, lfu=False):
    cache={}; freq=Counter(); clock={}; out=[]
    for t,op in enumerate(ops):
        kind,key,*rest=op
        if kind == 'get':
            out.append(cache.get(key,-1))
            if key in cache:
                freq[key]+=1; clock[key]=t
        elif capacity:
            if key not in cache and len(cache) == capacity:
                victim=min(cache, key=lambda k:(freq[k] if lfu else 0,clock[k]))
                del cache[victim]; del freq[victim]; del clock[victim]
            if key not in cache: freq[key]=0
            cache[key]=rest[0]; freq[key]+=1; clock[key]=t
    return out


def all_one(ops):
    counts=Counter(); out=[]
    for op in ops:
        kind=op[0]
        if kind == 'inc': counts[op[1]]+=1
        elif kind == 'dec':
            counts[op[1]]-=1
            if not counts[op[1]]: del counts[op[1]]
        elif not counts: out.append('EMPTY')
        elif kind == 'min': out.append(min(counts, key=lambda k:(counts[k],k)))
        else: out.append(min(counts, key=lambda k:(-counts[k],k)))
    return out


def tree_distinct(edges, n):
    graph=[[] for _ in range(n)]
    for a,b in edges: graph[a].append(b); graph[b].append(a)
    def visit(v,parent):
        return 1+sum(visit(w,v) for w in graph[v] if w != parent)
    return visit(0,-1)


def reverse_between(a,l,r):
    return a[:l-1]+a[l-1:r][::-1]+a[r:]


def reorder(a):
    out=[]
    for i in range((len(a)+1)//2):
        out.append(a[i])
        if len(a)-1-i != i: out.append(a[-1-i])
    return out


def remove_zero(a):
    # Repeatedly remove the leftmost zero-sum segment, preferring its longest end.
    while True:
        found=False
        for i in range(len(a)):
            ends=[j for j in range(i+1,len(a)+1) if sum(a[i:j]) == 0]
            if ends:
                a=a[:i]+a[max(ends):]; found=True; break
        if not found: return a


def flatten(nested):
    out=[]
    for item in nested:
        if isinstance(item,list): out.extend(flatten(item))
        else: out.append(item)
    return out


def next_greater(a):
    return [next((v for v in a[i+1:] if v>x),0) for i,x in enumerate(a)]


def merge_k(lists):
    return sorted(x for a in lists for x in a)


def sort_by_absolute(a):
    return sorted(a)


# Shared edge fixtures. Each family contains six different inputs; the first two
# public samples are specified separately for every question below.
ARRAYS = [[], [0], [-3,-1,-2], [2,2,2], [1,-1,0,1], list(range(12,0,-1))]
POSITIVE = [[1], [0], [2,2,2], [1,2,3,4], [4,3,2,1], [0,1,0,2,0,3]]
STRINGS = ['', 'a', 'aaaa', 'abba', 'abcabc', 'aAbBcCa']
VALUES = [[], [0], [-3,-1,-2], [2,2,2], [1,-1,0,1], list(range(12))]
PAIRS = [([],[]), ([1],[]), ([],[1]), ([1,1],[1]), ([-2,0,2],[2,-2]), ([1,2,3],[4,5])]


def additions(make_problem):
    result=defaultdict(list)

    def add(topic, level, title, statement, contract, oracle, samples, hidden):
        assert len(samples)==2 and len(hidden)==6, title
        fixtures=[]
        for data, expected in samples:
            actual=render(oracle(data))
            assert actual == expected, (title, data, expected, actual)
            fixtures.append((data,expected))
        fixtures.extend((d,render(oracle(d))) for d in hidden)
        assert len({str(d) for d in hidden})==6, title
        p=make_problem(title,level,statement,contract,fixtures)
        result[topic].append(p)

    def arr(level,title,statement,oracle,samples,hidden=ARRAYS,contract='nums: 0..100000 integers in [-10^9,10^9].'):
        add('Arrays',level,title,statement,contract,lambda d:oracle(d['nums']),[({'nums':a},b) for a,b in samples],[{'nums':a} for a in hidden])

    # ARRAYS — fourteen additions at each level; the original three are retained.
    arr('EASY','Best Time to Buy and Sell Stock','Return the maximum profit from one buy followed by one later sell. Return 0 if no profitable trade exists. Target O(n).',lambda a:max([a[j]-a[i] for i in range(len(a)) for j in range(i+1,len(a))]+[0]),[([7,1,5,3,6,4],'5'),([7,6,4,3,1],'0')],POSITIVE,'nums: 0..100000 daily prices in [0,10^9]. Output integer profit.')
    arr('EASY','Move Zeroes','Move all zero values to the end while keeping nonzero values in their original order. Modify the input in place. Output the entire resulting array.',lambda a:[x for x in a if x]+[0]*a.count(0),[([0,1,0,3,12],'1 3 12 0 0'),([0,0],'0 0')])
    arr('EASY','Remove Duplicates from Sorted Array','For sorted nums, compact duplicates in place and return only the distinct prefix as a list. Target O(n) time, O(1) auxiliary space.',lambda a:sorted(set(a)),[([1,1,2],'1 2'),([], 'EMPTY')],[sorted(a) for a in ARRAYS],'nums: sorted array of 0..100000 integers. Output distinct values, not the prefix length.')
    arr('EASY','Missing Number','nums contains distinct values from 0 through n with one missing, where n=len(nums). Return the missing value. Target O(n), O(1) space.',lambda a:len(a)*(len(a)+1)//2-sum(a),[([3,0,1],'2'),([0],'1')],[[],[1],[0,1],[2,0],[0,1,2,3],[4,3,2,1]],'nums: 0..100000 distinct integers from [0,n], exactly one missing.')
    arr('EASY','Single Number','Every value occurs twice except one value occurring once. Return that value using XOR and constant auxiliary space.',lambda a:next(x for x,c in Counter(a).items() if c==1),[([2,2,1],'1'),([4,1,2,1,2],'4')],[[0],[-1],[3,3,0],[-2,-2,-3],[9,8,9],[1,2,3,2,1]],'nums: 1..100001 integers; exactly one occurs once, all others twice.')
    arr('EASY','Majority Element','Return the value occurring more than floor(n/2) times. A majority is guaranteed. Target O(n) time and O(1) space with voting.',lambda a:Counter(a).most_common(1)[0][0],[([3,2,3],'3'),([2,2,1,1,1,2,2],'2')],[[0],[-1,-1],[2,2,3],[1,2,1,3,1],[8]*20,[-3,-3,-3,0,1]],'nums: 1..100000 integers; strict majority exists.')
    arr('EASY','Maximum Consecutive Ones','Return the longest contiguous run of ones. Target O(n) time and O(1) space.',runs,[([1,1,0,1,1,1],'3'),([1,0,1,1,0,1],'2')],[[],[0],[1],[1]*20,[0]*20,[0,1,1,0,1]],'nums: 0..100000 values, each 0 or 1.')
    arr('EASY','Squares of a Sorted Array','Square each value and return the squares in nondecreasing order. Target O(n) using two pointers.',lambda a:sorted(x*x for x in a),[([-4,-1,0,3,10],'0 1 9 16 100'),([-7,-3,2,3,11],'4 9 9 49 121')],[sorted(a) for a in ARRAYS],'nums: sorted array of 0..100000 integers in [-10^9,10^9].')
    arr('EASY','Check Sorted and Rotated Array','Return 1 if nums is a rotation (including zero rotations) of a nondecreasing array, otherwise 0. Empty input returns 1.',lambda a:int(sum(a[i]>a[(i+1)%len(a)] for i in range(len(a)))<=1),[([3,4,5,1,2],'1'),([2,1,3,4],'0')])
    arr('EASY','Leaders in an Array','Return values strictly greater than every value to their right, preserving input order. The final value is always a leader. Target O(n).',lambda a:[x for i,x in enumerate(a) if all(x>y for y in a[i+1:])],[([16,17,4,3,5,2],'17 5 2'),([5,5,5],'5')])
    arr('EASY','Second Largest Distinct Value','Return the second largest distinct value, or NONE if fewer than two distinct values exist. Do not sort; target O(n), O(1) space.',lambda a:sorted(set(a))[-2] if len(set(a))>=2 else 'NONE',[([12,35,1,10,34,1],'34'),([7,7],'NONE')])
    arr('EASY','Plus One','digits is a nonempty most-significant-first decimal integer with no leading zeros except [0]. Return digits after adding one.',lambda a:list(map(int,str(int(''.join(map(str,a)))+1))),[([1,2,3],'1 2 4'),([9,9],'1 0 0')],[[0],[9],[1],[1,0,0],[8,9,9],[9]*20],'nums: 1..1000 decimal digits, no leading zeros. nums represents digits. Output digit list.')
    arr('EASY','Pivot Index','Return the smallest index whose left sum equals its right sum, excluding the pivot value. Return -1 if absent. Target O(n).',lambda a:next((i for i in range(len(a)) if sum(a[:i])==sum(a[i+1:])),-1),[([1,7,3,6,5,6],'3'),([1,2,3],'-1')])
    add('Arrays','EASY','Merge Sorted Arrays','Return all values from sorted arrays a and b in nondecreasing order. Use a linear two-pointer merge.','a,b: sorted integer arrays of length 0..100000.',lambda d:sorted(d['a']+d['b']),[({'a':[1,2,3],'b':[2,5,6]},'1 2 2 3 5 6'),({'a':[],'b':[1]},'1')],[{'a':sorted(a),'b':sorted(b)} for a,b in PAIRS])

    arr('MEDIUM','Maximum Subarray','Return the maximum sum of a nonempty contiguous subarray. Use Kadane\'s algorithm, O(n) time.',lambda a:max(map(sum,windows(a))),[([-2,1,-3,4,-1,2,1,-5,4],'6'),([-3,-1,-2],'-1')],[[0],[1],[-5,-2],[2,2,2],[1,-1,0,1],list(range(-10,10))],'nums: 1..100000 integers in [-10^9,10^9].')
    add('Arrays','MEDIUM','Rotate Array','Rotate nums right by k positions. k may exceed length. Empty input stays empty. Target O(n) time and O(1) auxiliary space.','nums: 0..100000 integers; k: 0..10^9.',lambda d:(d['nums'][-(d['k']%len(d['nums'])):]+d['nums'][:-(d['k']%len(d['nums']))]) if d['nums'] and d['k']%len(d['nums']) else d['nums'],[({'nums':[1,2,3,4,5,6,7],'k':3},'5 6 7 1 2 3 4'),({'nums':[1,2],'k':0},'1 2')],[{'nums':a,'k':k} for a,k in zip(ARRAYS,[5,0,3,10,1,1000000000])])
    arr('MEDIUM','Sort Colors','Sort an array containing only 0,1,2 in place without a sorting library. Use a single pass and constant auxiliary space.',sorted,[([2,0,2,1,1,0],'0 0 1 1 2 2'),([2,0,1],'0 1 2')],[[],[0],[2],[1]*10,[2,2,0,0],[0,1,2]*10],'nums: 0..100000 values in {0,1,2}.')
    add('Arrays','MEDIUM','Container With Most Water','Return maximum water area between two vertical bars, distance times the smaller height. Fewer than two bars gives 0. Target O(n).','heights: 0..100000 nonnegative integers.',lambda d:max([min(a,b)*(j-i) for i,a in enumerate(d['heights']) for j,b in enumerate(d['heights']) if j>i]+[0]),[({'heights':[1,8,6,2,5,4,8,3,7]},'49'),({'heights':[1,1]},'1')],[{'heights':a} for a in POSITIVE])
    arr('MEDIUM','Three Sum','Return the number of distinct value triplets summing to zero. Triplets ignore index order and duplicate values. Target O(n^2) with sorting and two pointers.',lambda a:len({tuple(sorted(c)) for c in combinations(a,3) if sum(c)==0}),[([-1,0,1,2,-1,-4],'2'),([0,0,0,0],'1')],contract='nums: 0..3000 integers in [-10^9,10^9]. Output distinct triplet count, not triplets.')
    add('Arrays','MEDIUM','Merge Intervals','Merge overlapping closed intervals; touching endpoints overlap. Output flattened start end pairs in ascending start order.','intervals: 0..100000 [start,end] pairs; start<=end.',lambda d:merge_intervals(d['intervals']),[({'intervals':[[1,3],[2,6],[8,10],[15,18]]},'1 6 8 10 15 18'),({'intervals':[[1,4],[4,5]]},'1 5')],[{'intervals':a} for a in [[],[[1,1]],[[1,10],[2,3]],[[5,6],[1,2]],[[0,0],[0,0]],[[-5,-1],[-2,3],[7,8]]]])
    arr('MEDIUM','Next Permutation','Rearrange nums into its next lexicographic permutation. If it is the last, return the smallest permutation. Empty stays empty. Target O(n), in place.',next_permutation,[([1,2,3],'1 3 2'),([3,2,1],'1 2 3')])
    add('Arrays','MEDIUM','Search in Rotated Sorted Array','Return the index of target in a rotated strictly increasing array, or -1. Target O(log n).','nums: 0..100000 distinct rotated sorted integers; target integer.',lambda d:d['nums'].index(d['target']) if d['target'] in d['nums'] else -1,[({'nums':[4,5,6,7,0,1,2],'target':0},'4'),({'nums':[4,5,6,7,0,1,2],'target':3},'-1')],[{'nums':a,'target':t} for a,t in [([],1),([1],1),([1],0),([3,1,2],3),([-1,0,2],2),([5,6,1,2,3,4],4)]])
    arr('MEDIUM','Find Minimum in Rotated Sorted Array','Return the minimum of a nonempty rotated strictly increasing array. Target O(log n).',min,[([3,4,5,1,2],'1'),([4,5,6,7,0,1,2],'0')],[[1],[2,1],[-3,-2,-1],[0,1,2],[9,1,3,5],[5,6,7,8,1,2]],'nums: 1..100000 distinct integers, a rotation of a sorted array.')
    arr('MEDIUM','Jump Game','Starting at index 0, nums[i] is the maximum forward jump length. Return 1 if the final index can be reached, else 0. Target O(n).',lambda a:int(min_jumps(a)>=0),[([2,3,1,1,4],'1'),([3,2,1,0,4],'0')],POSITIVE,'nums: 1..100000 nonnegative integers.')
    arr('MEDIUM','Jump Game II','Return the minimum jumps needed to reach the last index from index 0; nums[i] is the maximum jump. Return -1 if unreachable. Target O(n) greedy.',min_jumps,[([2,3,1,1,4],'2'),([0,1],'-1')],POSITIVE,'nums: 1..100000 nonnegative integers.')
    arr('MEDIUM','Longest Increasing Subsequence','Return the length of the longest strictly increasing subsequence, not necessarily contiguous. Target O(n log n).',lis,[([10,9,2,5,3,7,101,18],'4'),([0,1,0,3,2,3],'4')])
    add('Arrays','MEDIUM','Set Matrix Zeroes','If a matrix cell is zero, set its entire original row and column to zero. Return the resulting matrix in row-major flattened order. Target O(rows*cols), O(1) auxiliary space.','matrix: rectangular integer matrix, 1..200 rows and columns.',lambda d:[0 if 0 in d['matrix'][r] or any(row[c]==0 for row in d['matrix']) else x for r,row in enumerate(d['matrix']) for c,x in enumerate(row)],[({'matrix':[[1,1,1],[1,0,1],[1,1,1]]},'1 0 1 0 0 0 1 0 1'),({'matrix':[[0,1],[2,3]]},'0 0 0 3')],[{'matrix':m} for m in [[[0]],[[1]],[[1,0,3]],[[1],[0],[3]],[[1,2],[3,4]],[[0,1,2],[3,4,5],[6,7,0]]]])
    add('Arrays','MEDIUM','Spiral Matrix','Return all matrix values in clockwise spiral order, starting at the top left.','matrix: rectangular integer matrix with 1..200 rows and columns.',lambda d:spiral(d['matrix']),[({'matrix':[[1,2,3],[4,5,6],[7,8,9]]},'1 2 3 6 9 8 7 4 5'),({'matrix':[[1,2,3,4]]},'1 2 3 4')],[{'matrix':m} for m in [[[0]],[[1],[2],[3]],[[1,2],[3,4]],[[1,2,3],[4,5,6]],[[1,2],[3,4],[5,6]],[[-1,0],[0,-1]]]])

    add('Arrays','HARD','Median of Two Sorted Arrays','Return twice the median of sorted arrays a and b, avoiding floating-point formatting. For odd total length output twice the middle value; for even length output the sum of the two middle values. Target O(log(min(n,m))).','a,b: sorted integer arrays, combined length 1..200000.',lambda d:twice_median(d['a']+d['b']),[({'a':[1,3],'b':[2]},'4'),({'a':[1,2],'b':[3,4]},'5')],[{'a':a,'b':b} for a,b in [([],[1]),([0],[]),([-3,-1],[-2]),([1,1],[1,1]),([1,2,3],[100]),([-10**9],[10**9])]])
    add('Arrays','HARD','Largest Rectangle in Histogram','Return maximum rectangle area under contiguous unit-width bars. Target O(n) using a monotonic stack.','heights: 0..100000 nonnegative integers.',lambda d:max([min(w)*len(w) for w in windows(d['heights'])]+[0]),[({'heights':[2,1,5,6,2,3]},'10'),({'heights':[2,4]},'4')],[{'heights':a} for a in [[],[0],[7],[2,2,2],[1,2,3,4],[4,3,2,1]]])
    add('Arrays','HARD','Sliding Window Maximum','Return the maximum in each contiguous window of k values. Target O(n) time with a deque.','nums: 1..100000 integers; 1<=k<=len(nums).',lambda d:[max(d['nums'][i:i+d['k']]) for i in range(len(d['nums'])-d['k']+1)],[({'nums':[1,3,-1,-3,5,3,6,7],'k':3},'3 3 5 5 6 7'),({'nums':[1],'k':1},'1')],[{'nums':a,'k':k} for a,k in [([0],1),([-3,-1,-2],2),([2,2,2],3),([1,2,3,4],1),([4,3,2,1],2),([-10**9,10**9],2)]])
    add('Arrays','HARD','Count Inversions','Return the number of index pairs i<j with nums[i]>nums[j]. Equal values do not count. Target O(n log n) merge counting.','nums: 0..100000 integers; output 64-bit count.',lambda d:sum(a>b for i,a in enumerate(d['nums']) for b in d['nums'][i+1:]),[({'nums':[2,4,1,3,5]},'3'),({'nums':[5,4,3,2,1]},'10')],[{'nums':a} for a in ARRAYS])
    add('Arrays','HARD','Reverse Pairs','Count pairs i<j with nums[i]>2*nums[j]. Target O(n log n); use wide arithmetic for doubling.','nums: 0..100000 signed 32-bit integers.',lambda d:sum(a>2*b for i,a in enumerate(d['nums']) for b in d['nums'][i+1:]),[({'nums':[1,3,2,3,1]},'2'),({'nums':[2,4,3,5,1]},'3')],[{'nums':a} for a in ARRAYS])
    add('Arrays','HARD','Count Smaller Numbers After Self','For each position return how many later values are strictly smaller. Target O(n log n) with merge sort or a Fenwick tree.','nums: 0..100000 integers.',lambda d:[sum(y<x for y in d['nums'][i+1:]) for i,x in enumerate(d['nums'])],[({'nums':[5,2,6,1]},'2 1 1 0'),({'nums':[-1,-1]},'0 0')],[{'nums':a} for a in ARRAYS])
    add('Arrays','HARD','Maximum Product Subarray','Return the largest product of a nonempty contiguous subarray, tracking both minimum and maximum products. Target O(n).','nums: 1..20000 integers in [-10,10]; every contiguous product fits signed 64-bit. Difficulty is the advanced array-track placement.',lambda d:max(math.prod(w) for w in windows(d['nums'])),[({'nums':[2,3,-2,4]},'6'),({'nums':[-2,0,-1]},'0')],[{'nums':a} for a in [[0],[-2],[-2,-3],[2,2,2],[1,-1,0,1],[-1]*20]])
    add('Arrays','HARD','Split Array Largest Sum','Split nums into exactly k nonempty contiguous parts, minimizing the largest part sum. Target O(n log(sum(nums))) using binary search.','nums: 1..100000 nonnegative integers; 1<=k<=len(nums).',lambda d:min(max(sum(d['nums'][a:b]) for a,b in zip((0,)+cuts,cuts+(len(d['nums']),))) for cuts in combinations(range(1,len(d['nums'])),d['k']-1)),[({'nums':[7,2,5,10,8],'k':2},'18'),({'nums':[1,2,3,4,5],'k':2},'9')],[{'nums':a,'k':k} for a,k in [([0],1),([5],1),([1,1,1],3),([0,0,0],2),([9,1,1,1],2),([1,2,3,4,5],1)]])
    add('Arrays','HARD','Shortest Subarray With Sum at Least K','Return the minimum length of a nonempty contiguous subarray with sum>=k, or -1. Negative numbers are allowed. Target O(n) with prefix sums and a monotonic deque.','nums: 0..100000 integers; k: positive integer.',lambda d:min([len(w) for w in windows(d['nums']) if sum(w)>=d['k']] or [-1]),[({'nums':[2,-1,2],'k':3},'3'),({'nums':[1,2],'k':4},'-1')],[{'nums':a,'k':k} for a,k in [([],1),([5],5),([-1],1),([0,0],1),([1,-1,5],5),([84,-37,32,40,95],167)]])
    add('Arrays','HARD','Maximal Rectangle','Return the largest all-ones rectangular area in a binary matrix. Target O(rows*cols) by reducing rows to histograms.','matrix: rectangular 1..200 by 1..200 binary matrix.',lambda d:max_rect(d['matrix']),[({'matrix':[[1,0,1,0,0],[1,0,1,1,1],[1,1,1,1,1],[1,0,0,1,0]]},'6'),({'matrix':[[0]]},'0')],[{'matrix':m} for m in [[[1]],[[0,0]],[[1,1,1]],[[1],[1],[0]],[[1,1],[1,1]],[[1,0],[0,1]]]])
    add('Arrays','HARD','Burst Balloons','Burst all balloons to maximize coins. Bursting a value earns left*value*right using its current neighbors; outside neighbors are 1. Return maximum coins. Use interval DP O(n^3).','nums: 0..300 integers in [0,100].',lambda d:burst(tuple(d['nums'])),[({'nums':[3,1,5,8]},'167'),({'nums':[1,5]},'10')],[{'nums':a} for a in [[],[0],[7],[1,1,1],[0,2,0],[2,3,4,1]]])
    add('Arrays','HARD','Candy Distribution','Give each child at least one candy. A child with a higher rating than an adjacent child must get more candies. Return minimum total. Target O(n).','ratings: 0..100000 integers.',lambda d:candy(d['ratings']),[({'ratings':[1,0,2]},'5'),({'ratings':[1,2,2]},'4')],[{'ratings':a} for a in ARRAYS])
    add('Arrays','HARD','Maximum Sum of Three Nonoverlapping Subarrays','Return the lexicographically smallest starting indices of three nonoverlapping length-k subarrays with maximum total sum. Target O(n) using left/right best windows.','nums: 3..20000 nonnegative integers; 1<=k<=len(nums)//3.',lambda d:three_windows(d['nums'],d['k']),[({'nums':[1,2,1,2,6,7,5,1],'k':2},'0 3 5'),({'nums':[1,1,1],'k':1},'0 1 2')],[{'nums':a,'k':k} for a,k in [([0,0,0],1),([3,2,1],1),([1]*6,2),([9,1,1,1,1,9],1),([1,2,3,4,5,6],2),([5,1,5,1,5,1,5],1)]])
    add('Arrays','HARD','Count Range Sums','Count nonempty contiguous subarrays whose sum lies in the inclusive interval [lower,upper]. Target O(n log n) using merge counting.','nums: 0..100000 integers; lower<=upper; use 64-bit sums/counts.',lambda d:sum(d['lower']<=sum(w)<=d['upper'] for w in windows(d['nums'])),[({'nums':[-2,5,-1],'lower':-2,'upper':2},'3'),({'nums':[0],'lower':0,'upper':0},'1')],[{'nums':a,'lower':l,'upper':u} for a,l,u in [([],0,0),([1],2,3),([-3,-1,-2],-5,-1),([2,2,2],2,4),([1,-1,0,1],0,0),([10**9,-10**9],-10**9,10**9)]])

    # HASH MAPS
    def hm(level,title,statement,contract,oracle,samples,hidden):
        add('Hash Maps',level,title,statement,contract,oracle,samples,hidden)

    hm('EASY','Two Sum','Return the lexicographically smallest pair of indices i<j whose values sum to target, or EMPTY. Use a hash map, target O(n).','nums: 0..100000 integers; target integer.',lambda d:first_pair(d['nums'],d['target']),[({'nums':[2,7,11,15],'target':9},'0 1'),({'nums':[3,3],'target':6},'0 1')],[{'nums':a,'target':t} for a,t in [([],0),([1],2),([0,0],0),([-2,0,2],0),([1,2,3,2],4),([1,2],8)]])
    hm('EASY','Valid Anagram','Return 1 if s and t contain exactly the same characters with the same frequencies, otherwise 0.','s,t: lowercase strings of length 0..100000.',lambda d:int(Counter(d['s'])==Counter(d['t'])),[({'s':'anagram','t':'nagaram'},'1'),({'s':'rat','t':'car'},'0')],[{'s':s,'t':t} for s,t in [('', ''),('a',''),('a','a'),('aa','ab'),('abc','cba'),('aabb','abbb')]])
    hm('EASY','Ransom Note','Return 1 if note can be constructed from magazine, using each magazine character at most once.','note,magazine: lowercase strings, length 0..100000.',lambda d:int(not(Counter(d['note'])-Counter(d['magazine']))),[({'note':'aa','magazine':'aab'},'1'),({'note':'aa','magazine':'ab'},'0')],[{'note':s,'magazine':t} for s,t in [('', ''),('a',''),('a','a'),('ab','ba'),('abc','ab'),('aaa','aaaa')]])
    hm('EASY','Isomorphic Strings','Return 1 if a bijection maps each s character to the corresponding t character, else 0.','s,t: lowercase strings, length 0..100000.',lambda d:isomorphic(d['s'],d['t']),[({'s':'egg','t':'add'},'1'),({'s':'foo','t':'bar'},'0')],[{'s':s,'t':t} for s,t in [('', ''),('a','a'),('aa','ab'),('ab','aa'),('paper','title'),('ab','a')]])
    hm('EASY','Word Pattern','Return 1 if pattern characters bijectively correspond to words in a space-separated sentence. Split on whitespace; return 0 on length mismatch.','pattern: lowercase string; sentence: lowercase words separated by spaces; at most 100000 characters.',lambda d:isomorphic(d['pattern'],d['sentence'].split()),[({'pattern':'abba','sentence':'dog cat cat dog'},'1'),({'pattern':'abba','sentence':'dog cat cat fish'},'0')],[{'pattern':p,'sentence':s} for p,s in [('', ''),('a','dog'),('aa','dog dog'),('ab','dog dog'),('a','dog cat'),('abc','a b c')]])
    hm('EASY','First Unique Character','Return the index of the first character occurring once, or -1. Indices are zero based. Target O(n).','s: lowercase string, length 0..100000.',lambda d:next((i for i,x in enumerate(d['s']) if d['s'].count(x)==1),-1),[({'s':'leetcode'},'0'),({'s':'loveleetcode'},'2')],[{'s':s.lower()} for s in STRINGS])
    hm('EASY','Majority Element Frequency','Return the strict majority value using a frequency map, or NONE if none occurs more than n/2 times.','nums: 0..100000 integers.',lambda d:next((x for x,c in Counter(d['nums']).items() if c>len(d['nums'])//2),'NONE'),[({'nums':[3,2,3]},'3'),({'nums':[1,2]},'NONE')],[{'nums':a} for a in ARRAYS])
    hm('EASY','Intersection With Multiplicity','Return the sorted intersection of a and b, retaining each value min(count_a,count_b) times.','a,b: integer arrays, length 0..100000.',lambda d:sorted((Counter(d['a']) & Counter(d['b'])).elements()),[({'a':[1,2,2,1],'b':[2,2]},'2 2'),({'a':[4,9,5],'b':[9,4,9,8,4]},'4 9')],[{'a':a,'b':b} for a,b in PAIRS])
    hm('EASY','Count Equal Pairs','Count index pairs i<j with nums[i]==nums[j]. Target O(n) using frequencies.','nums: 0..100000 integers. Output 64-bit count.',lambda d:sum(c*(c-1)//2 for c in Counter(d['nums']).values()),[({'nums':[1,2,3,1,1,3]},'4'),({'nums':[1,1,1,1]},'6')],[{'nums':a} for a in ARRAYS])
    hm('EASY','Unique Number of Occurrences','Return 1 if all distinct values have different occurrence counts; empty input returns 1.','nums: 0..100000 integers.',lambda d:int(len(set(Counter(d['nums']).values()))==len(Counter(d['nums']))),[({'nums':[1,2,2,1,1,3]},'1'),({'nums':[1,2]},'0')],[{'nums':a} for a in ARRAYS])
    hm('EASY','Longest Constructible Palindrome','Return the maximum palindrome length obtainable by rearranging some or all characters of s. Case sensitive.','s: ASCII letters, length 0..100000.',lambda d:sum(c//2*2 for c in Counter(d['s']).values())+int(any(c%2 for c in Counter(d['s']).values())),[({'s':'abccccdd'},'7'),({'s':'a'},'1')],[{'s':s} for s in STRINGS])
    hm('EASY','Find the Added Character','t is a permutation of s plus one extra character. Return that character.','s,t: lowercase strings; len(t)=len(s)+1.',lambda d:next(iter((Counter(d['t'])-Counter(d['s'])).elements())),[({'s':'abcd','t':'abcde'},'e'),({'s':'','t':'y'},'y')],[{'s':s,'t':s[::-1]+x} for s,x in [('', 'a'),('a','a'),('ab','z'),('aaaa','b'),('abc','c'),('zzzz','z')]])
    hm('EASY','Count Consistent Words','Count words whose characters all occur in allowed. Duplicate words count separately; an empty word is consistent.','allowed: lowercase string; words: 0..100000 lowercase strings; total length<=100000.',lambda d:sum(set(w)<=set(d['allowed']) for w in d['words']),[({'allowed':'ab','words':['ad','bd','aaab','baa','badab']},'2'),({'allowed':'abc','words':['a','b','c','ab']},'4')],[{'allowed':a,'words':w} for a,w in [('',[]),('', ['']),('', ['a']),('a',['a','aa','b']),('abc',['cab','d']),('aa',['a','a',''])]])
    hm('EASY','Most Common Non-Banned Word','Return the most frequent word not in banned, with lexicographically smallest tie. Words are whitespace-separated lowercase tokens. Return NONE if absent.','text: lowercase words separated by whitespace; banned: list of lowercase words; total size<=100000.',lambda d:common_word(d['text'],d['banned']),[({'text':'bob hit a ball the hit ball flew far','banned':['hit']},'ball'),({'text':'a a b b','banned':[]},'a')],[{'text':s,'banned':b} for s,b in [('',[]),('a',['a']),('a',[]),('b a',[]),('a a b',['a']),('x y y z z',['y'])]])

    hm('MEDIUM','Group Anagrams','Group words by identical character frequencies. Sort words within groups, join with commas; sort these group strings, join with |. Return EMPTY if no words.','words: 0..10000 nonempty lowercase words; total length<=100000. Output one canonical string.',lambda d:anagram_groups(d['words']),[({'words':['eat','tea','tan','ate','nat','bat']},'ate,eat,tea|bat|nat,tan'),({'words':['a']},'a')],[{'words':w} for w in [[],['z'],['a','a'],['ab','ba','c'],['abc','bca','cab'],['x','y','z']]])
    hm('MEDIUM','Top K Frequent Elements','Return k most frequent distinct values, ordered by descending frequency then ascending value. Target O(n log k).','nums: 1..100000 integers; 1<=k<=number of distinct values.',lambda d:sorted(Counter(d['nums']),key=lambda x:(-d['nums'].count(x),x))[:d['k']],[({'nums':[1,1,1,2,2,3],'k':2},'1 2'),({'nums':[4,3,4,3],'k':1},'3')],[{'nums':a,'k':k} for a,k in [([0],1),([-1,-1,2],2),([1,2,3],3),([2,2,2],1),([3,1,3,1,2],2),([-5,0,5],2)]])
    hm('MEDIUM','Longest Substring Without Repeating Characters','Return the longest contiguous substring length with no repeated character. Target O(n) sliding window.','s: ASCII letters, length 0..100000.',lambda d:max([len(w) for w in windows(d['s']) if len(set(w))==len(w)]+[0]),[({'s':'abcabcbb'},'3'),({'s':'bbbbb'},'1')],[{'s':s} for s in STRINGS])
    hm('MEDIUM','Longest Repeating Character Replacement','Return maximum substring length that can become one repeated character after replacing at most k characters. Target O(n).','s: uppercase ASCII letters, length 0..100000; k: 0..len(s).',lambda d:max([len(w) for w in windows(d['s']) if len(w)-max(Counter(w).values())<=d['k']]+[0]),[({'s':'ABAB','k':2},'4'),({'s':'AABABBA','k':1},'4')],[{'s':s,'k':k} for s,k in [('',0),('A',0),('AAAA',0),('ABBA',1),('ABCABC',2),('ABCDE',5)]])
    hm('MEDIUM','Find All Anagrams in a String','Return starting indices of substrings of s that are anagrams of nonempty p. Target O(len(s)+len(p)).','s,p: lowercase strings, s length 0..100000, p length 1..100000.',lambda d:[i for i in range(len(d['s'])-len(d['p'])+1) if Counter(d['s'][i:i+len(d['p'])])==Counter(d['p'])],[({'s':'cbaebabacd','p':'abc'},'0 6'),({'s':'abab','p':'ab'},'0 1 2')],[{'s':s,'p':p} for s,p in [('', 'a'),('a','a'),('aaa','aa'),('ab','abc'),('abcd','z'),('bbaa','ab')]])
    hm('MEDIUM','Subarrays Divisible by K','Count nonempty contiguous subarrays whose sum is divisible by positive k. Target O(n) using remainder frequencies.','nums: 0..100000 integers; k: 1..10^9.',lambda d:sum(sum(w)%d['k']==0 for w in windows(d['nums'])),[({'nums':[4,5,0,-2,-3,1],'k':5},'7'),({'nums':[5],'k':9},'0')],[{'nums':a,'k':k} for a,k in zip(ARRAYS,[1,2,3,2,1,5])])
    hm('MEDIUM','Longest Zero Sum Subarray','Return longest nonempty contiguous subarray length with sum 0, or 0. Target O(n) using earliest prefix indices.','nums: 0..100000 integers.',lambda d:max([len(w) for w in windows(d['nums']) if sum(w)==0]+[0]),[({'nums':[15,-2,2,-8,1,7,10,23]},'5'),({'nums':[1,2,3]},'0')],[{'nums':a} for a in ARRAYS])
    hm('MEDIUM','Contiguous Array','Return longest contiguous subarray length with equal numbers of 0 and 1. Target O(n) using prefix balance.','nums: 0..100000 binary values.',lambda d:max([len(w) for w in windows(d['nums']) if sum(w)*2==len(w)]+[0]),[({'nums':[0,1]},'2'),({'nums':[0,1,0]},'2')],[{'nums':a} for a in [[],[0],[1],[0,0,0],[1,0,1,0],[1,1,0,0,0,1]]])
    hm('MEDIUM','Subarrays With Exactly K Odd Numbers','Count nonempty contiguous subarrays containing exactly k odd numbers. Target O(n) using prefix odd counts.','nums: 0..100000 integers; k: 0..100000.',lambda d:sum(sum(x%2 for x in w)==d['k'] for w in windows(d['nums'])),[({'nums':[1,1,2,1,1],'k':3},'2'),({'nums':[2,4,6],'k':1},'0')],[{'nums':a,'k':k} for a,k in zip(ARRAYS,[0,0,2,0,2,3])])
    hm('MEDIUM','Four Sum II','Count index tuples (i,j,k,l) with a[i]+b[j]+c[k]+d[l]==0. Arrays need not have equal lengths. Target O(n^2) for equal-sized arrays.','a,b,c,d: integer arrays of length 0..200.',lambda d:sum(x+y+z+w==0 for x in d['a'] for y in d['b'] for z in d['c'] for w in d['d']),[({'a':[1,2],'b':[-2,-1],'c':[-1,2],'d':[0,2]},'2'),({'a':[0],'b':[0],'c':[0],'d':[0]},'1')],[dict(zip(['a','b','c','d'],parts)) for parts in [([],[],[],[]),([1],[1],[1],[1]),([0,0],[0],[0],[0]),([-1],[1],[2],[-2]),([1,2],[-1,-2],[0],[0]),([10**9],[-10**9],[0],[0])]])
    hm('MEDIUM','Longest Substring With At Most K Distinct Characters','Return the maximum length of a substring containing at most k distinct characters. Target O(n).','s: ASCII letters, length 0..100000; k: 0..52.',lambda d:max([len(w) for w in windows(d['s']) if len(set(w))<=d['k']]+[0]),[({'s':'eceba','k':2},'3'),({'s':'aa','k':1},'2')],[{'s':s,'k':k} for s,k in zip(STRINGS,[0,0,1,2,3,2])])
    hm('MEDIUM','Pairs of Songs Divisible by 60','Count index pairs i<j whose durations sum to a multiple of 60. Target O(n) using remainder frequencies.','times: 0..100000 nonnegative integers.',lambda d:sum((a+b)%60==0 for i,a in enumerate(d['times']) for b in d['times'][i+1:]),[({'times':[30,20,150,100,40]},'3'),({'times':[60,60,60]},'3')],[{'times':a} for a in [[],[0],[0,0],[1,59,61],[20,40,20,40],[60,120,180,240]]])
    hm('MEDIUM','Brick Wall','A row lists positive brick widths; all rows have the same total width. Draw a vertical line strictly inside the wall. Return the minimum bricks crossed. Brick-edge positions cross no brick. Target O(total bricks).','wall: 1..10000 nonempty rows; all widths positive; total bricks<=100000.',lambda d:brick_wall(d['wall']),[({'wall':[[1,2,2,1],[3,1,2],[1,3,2],[2,4],[3,1,2],[1,3,1,1]]},'2'),({'wall':[[1],[1],[1]]},'3')],[{'wall':w} for w in [[[1]],[[1,1]],[[2],[1,1]],[[1,2],[2,1]],[[1,1],[1,1]],[[3],[3],[1,1,1]]]])
    hm('MEDIUM','Find Duplicate Files by Content','files is a list of [path,content] pairs with unique paths. Return the number of unordered file pairs having identical content. Target O(total input size) using hashing.','files: 0..100000 [string,string] pairs.',lambda d:sum(c*(c-1)//2 for c in Counter(content for path,content in d['files']).values()),[({'files':[['a','x'],['b','x'],['c','y']]},'1'),({'files':[['a','z'],['b','z'],['c','z']]},'3')],[{'files':f} for f in [[],[['a','']], [['a','x']], [['a',''],['b','']], [['a','x'],['b','y']], [['a','x'],['b','y'],['c','x'],['d','y']]]])

    hm('HARD','Substring With Concatenation of All Words','Return all starting indices where a substring is a concatenation of every word exactly once in any order. Duplicate words count repeatedly. Target O(len(s)*wordLength).','s: lowercase string length 0..100000; words: 1..5000 nonempty equal-length words.',lambda d:concatenations(d['s'],d['words']),[({'s':'barfoothefoobarman','words':['foo','bar']},'0 9'),({'s':'wordgoodgoodgoodbestword','words':['word','good','best','word']},'EMPTY')],[{'s':s,'words':w} for s,w in [('', ['a']),('a',['a']),('aaaa',['a','a']),('abab',['ab']),('foobar',['bar','foo']),('abc',['abcd'])]])
    hm('HARD','Subarrays With K Different Integers','Count nonempty contiguous subarrays with exactly k distinct values. Target O(n) by subtracting at-most counts.','nums: 0..100000 integers; k: 1..100000.',lambda d:sum(len(set(w))==d['k'] for w in windows(d['nums'])),[({'nums':[1,2,1,2,3],'k':2},'7'),({'nums':[1,2,1,3,4],'k':3},'3')],[{'nums':a,'k':k} for a,k in zip(ARRAYS,[1,1,2,1,3,4])])
    hm('HARD','Longest Valid Parentheses','Return length of longest contiguous well-formed parentheses substring. Use prefix-state indexing or a stack, target O(n).','s: string of ( and ), length 0..100000.',lambda d:max([len(w) for w in windows(d['s']) if valid_parentheses(w)]+[0]),[({'s':'(()'},'2'),({'s':')()())'},'4')],[{'s':s} for s in ['', '(', ')', '()()', '((()))', '())(()']])
    hm('HARD','Palindrome Pairs','Count ordered pairs of distinct indices (i,j) for which words[i]+words[j] is a palindrome. Duplicate words are allowed. Target O(total squared word lengths) using a word map.','words: 0..5000 lowercase strings; length per word<=300.',lambda d:palindrome_pairs(d['words']),[({'words':['abcd','dcba','lls','s','sssll']},'4'),({'words':['bat','tab','cat']},'2')],[{'words':w} for w in [[],[''],['a',''],['a','a'],['ab','ba',''],['abc','def']]])
    hm('HARD','Distinct Subsequences Count','Count ways to delete characters from s to obtain t, preserving order. Empty t has one way. Use indexed DP; output the exact integer.','s,t: lowercase strings, length 0..1000.',lambda d:distinct_subseq(d['s'],d['t']),[({'s':'rabbbit','t':'rabbit'},'3'),({'s':'babgbag','t':'bag'},'5')],[{'s':s,'t':t} for s,t in [('', ''),('','a'),('a',''),('aaa','aa'),('abc','d'),('abcabc','abc')]])
    hm('HARD','Count Arithmetic Subsequences','Count subsequences of length at least three with constant adjacent difference. Subsequences are identified by indices. Target O(n^2) with per-index difference maps.','nums: 0..1000 signed 32-bit integers.',lambda d:arithmetic_count(d['nums']),[({'nums':[2,4,6,8,10]},'7'),({'nums':[7,7,7,7,7]},'16')],[{'nums':a} for a in ARRAYS])
    hm('HARD','Maximum Points on a Line','Return maximum number of points on one line. Points are distinct. Normalize slopes with gcd and hash by anchor, target O(n^2).','points: 0..300 distinct integer [x,y] pairs.',lambda d:max_points(d['points']),[({'points':[[1,1],[2,2],[3,3]]},'3'),({'points':[[1,1],[3,2],[5,3],[4,1],[2,3],[1,4]]},'4')],[{'points':p} for p in [[],[[0,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[1,1],[1,0]],[[0,0],[-1,-1],[2,2],[3,0]]]])
    hm('HARD','Count Submatrices With Target Sum','Count nonempty axis-aligned submatrices whose sum equals target. Target O(min(rows,cols)^2*max(rows,cols)) with prefix-frequency maps.','matrix: 1..100 by 1..100 integers; target integer.',lambda d:submatrix_count(d['matrix'],d['target']),[({'matrix':[[0,1,0],[1,1,1],[0,1,0]],'target':0},'4'),({'matrix':[[1,-1],[-1,1]],'target':0},'5')],[{'matrix':m,'target':t} for m,t in [([[0]],0),([[1]],0),([[1]],1),([[0,0]],0),([[1,2],[3,4]],3),([[-1,1,-1]],-1)]])
    hm('HARD','Minimum Window Subsequence','Return the shortest substring of s containing t as a subsequence, not necessarily contiguous. Break ties by earliest start. Empty t or no solution returns NONE. Target O(len(s)*len(t)) DP.','s,t: ASCII letters, length 0..1000.',lambda d:min_window_subsequence(d['s'],d['t']),[({'s':'abcdebdde','t':'bde'},'bcde'),({'s':'abc','t':'ac'},'abc')],[{'s':s,'t':t} for s,t in [('', 'a'),('a',''),('a','a'),('aaa','aa'),('abc','d'),('abxba','ab')]])
    hm('HARD','Find All People With Secret','Person 0 tells firstPerson at time 0. meetings are [a,b,time]. At each time the secret propagates through the entire connected meeting component instantly. Return all informed people sorted. Target O(m log m).','n: 2..100000; 1<=firstPerson<n; meetings: 0..100000 valid distinct-person triples.',lambda d:secret_people(d['n'],d['firstPerson'],d['meetings']),[({'n':6,'firstPerson':1,'meetings':[[1,2,5],[2,3,8],[1,5,10]]},'0 1 2 3 5'),({'n':4,'firstPerson':3,'meetings':[[1,2,2],[2,3,2]]},'0 1 2 3')],[{'n':n,'firstPerson':f,'meetings':m} for n,f,m in [(2,1,[]),(3,1,[[1,2,1]]),(4,1,[[2,3,1]]),(4,1,[[2,3,1],[1,2,2]]),(4,1,[[2,3,2],[1,2,2]]),(3,2,[[0,1,9]])]])
    hm('HARD','Frequency Stack','Process [push,value] and [pop] operations. Pop the most frequent value, breaking ties by most recently pushed still-present occurrence. Return popped values. Target O(1) per operation using frequency stacks.','ops: 0..100000 operations; pops only when nonempty.',lambda d:frequency_stack(d['ops']),[({'ops':[['push',5],['push',7],['push',5],['push',7],['push',4],['push',5],['pop'],['pop'],['pop'],['pop']]},'5 7 5 4'),({'ops':[['push',1],['pop']]},'1')],[{'ops':o} for o in [[],[['push',0]], [['push',-1],['pop']], [['push',1],['push',2],['pop']], [['push',2],['push',2],['pop'],['pop']], [['push',1],['push',2],['push',1],['pop'],['pop']]]])
    hm('HARD','All O One Counter','Process [inc,key], [dec,key], [min], [max]. dec is only used on present keys; remove zero counts. Queries return lexicographically smallest key among tied counts, or EMPTY. Return query results separated by spaces. Target O(1) count-bucket operations; tie selection may use ordered keys.','ops: 0..100000 operations; keys nonempty lowercase words.',lambda d:all_one(d['ops']),[({'ops':[['inc','hello'],['inc','hello'],['inc','leet'],['max'],['min']]},'hello leet'),({'ops':[['min'],['max']]},'EMPTY EMPTY')],[{'ops':o} for o in [[],[['inc','a'],['min']], [['inc','a'],['dec','a'],['max']], [['inc','b'],['inc','a'],['max']], [['inc','a'],['inc','a'],['inc','b'],['min']], [['inc','z'],['max'],['dec','z'],['min']]]])
    hm('HARD','Longest Duplicate Substring','Return the longest substring appearing at least twice, allowing overlaps. Choose lexicographically smallest among ties; NONE if absent. Target O(n log n) with verified rolling hashes or a suffix array.','s: lowercase string, length 0..100000.',lambda d:longest_duplicate(d['s']),[({'s':'banana'},'ana'),({'s':'abcd'},'NONE')],[{'s':s.lower()} for s in STRINGS])
    hm('HARD','Count Pairs With XOR in a Range','Count pairs i<j whose bitwise XOR lies in inclusive [low,high]. Target O(n log M) with a binary trie (hash-map children are allowed).','nums: 0..100000 nonnegative integers <=2^20-1; 0<=low<=high<=2^20-1.',lambda d:sum(d['low']<=(a^b)<=d['high'] for i,a in enumerate(d['nums']) for b in d['nums'][i+1:]),[({'nums':[1,4,2,7],'low':2,'high':6},'6'),({'nums':[0,0],'low':0,'high':0},'1')],[{'nums':a,'low':l,'high':h} for a,l,h in [([],0,0),([1],0,2),([1,1,1],0,0),([0,1,2],1,2),([7,8,15],0,15),([0,1048575],1048575,1048575)]])

    # SETS: set membership, distinctness, graph frontiers, and state-space search.
    def st(level,title,statement,contract,oracle,samples,hidden):
        add('Sets',level,title,statement,contract,oracle,samples,hidden)

    st('EASY','Contains Duplicate','Return 1 if any number occurs at least twice, otherwise 0. Target O(n) expected time with a set.','nums: 0..100000 integers.',lambda d:int(len(set(d['nums']))<len(d['nums'])),[({'nums':[1,2,3,1]},'1'),({'nums':[1,2,3,4]},'0')],[{'nums':a} for a in ARRAYS])
    st('EASY','Set Union','Return the sorted distinct union of a and b.','a,b: 0..100000 integers each.',lambda d:sorted(set(d['a'])|set(d['b'])),[({'a':[1,2,2],'b':[2,3]},'1 2 3'),({'a':[],'b':[]},'EMPTY')],[{'a':a,'b':b} for a,b in PAIRS])
    st('EASY','Set Difference','Return sorted distinct values in a but not in b.','a,b: 0..100000 integers each.',lambda d:sorted(set(d['a'])-set(d['b'])),[({'a':[1,2,3],'b':[2,4]},'1 3'),({'a':[1],'b':[1]},'EMPTY')],[{'a':a,'b':b} for a,b in PAIRS])
    st('EASY','Symmetric Difference','Return sorted values present in exactly one of a,b, ignoring multiplicity.','a,b: 0..100000 integers each.',lambda d:sorted(set(d['a'])^set(d['b'])),[({'a':[1,2,3],'b':[2,4]},'1 3 4'),({'a':[1,1],'b':[1]},'EMPTY')],[{'a':a,'b':b} for a,b in PAIRS])
    st('EASY','Subset Check','Return 1 if every distinct value in b is present in a, else 0. Multiplicity does not matter.','a,b: 0..100000 integers each.',lambda d:int(set(d['b'])<=set(d['a'])),[({'a':[1,2,3],'b':[2,2]},'1'),({'a':[1,2],'b':[3]},'0')],[{'a':a,'b':b} for a,b in PAIRS])
    st('EASY','Disjoint Sets','Return 1 if a and b share no value, otherwise 0.','a,b: 0..100000 integers each.',lambda d:int(set(d['a']).isdisjoint(d['b'])),[({'a':[1,2],'b':[3,4]},'1'),({'a':[1,2],'b':[2,3]},'0')],[{'a':a,'b':b} for a,b in PAIRS])
    st('EASY','Happy Number','Repeatedly replace positive n by the sum of its squared decimal digits. Return 1 if it reaches 1, otherwise 0. Detect repeated states using a set.','n: 1..2^31-1.',lambda d:happy(d['n']),[({'n':19},'1'),({'n':2},'0')],[{'n':n} for n in [1,7,4,10,100,2147483647]])
    st('EASY','Pangram Check','Return 1 if s contains every lowercase English letter at least once. Ignore spaces and uppercase letters are not counted.','s: lowercase letters and spaces, length 0..100000.',lambda d:int(set('abcdefghijklmnopqrstuvwxyz')<=set(d['s'])),[({'s':'thequickbrownfoxjumpsoverthelazydog'},'1'),({'s':'leetcode'},'0')],[{'s':s} for s in ['', 'a', 'abcdefghijklmnopqrstuvwxyz', 'abcdefghijklmnopqrstuvwxy', 'a'*20, 'abcdefghijklmnopqrstuvwxyz z']])
    st('EASY','Jewels and Stones','Count stone characters that occur in jewels. Each stone position counts; repeated jewel symbols do not add weight. Case sensitive.','jewels,stones: ASCII letters, length 0..100000.',lambda d:sum(c in set(d['jewels']) for c in d['stones']),[({'jewels':'aA','stones':'aAAbbbb'},'3'),({'jewels':'z','stones':'ZZ'},'0')],[{'jewels':j,'stones':s} for j,s in [('', ''),('', 'abc'),('a',''),('aa','aaa'),('ab','baba'),('A','aAa')]])
    st('EASY','Distinct Email Addresses','Normalize each email: in its local part remove dots and ignore characters starting at +; keep domain unchanged. Return distinct normalized email count.','emails: 0..100000 valid local@domain strings; lowercase letters, dots, plus signs in local; nonempty domain.',lambda d:len({e.split('@')[0].split('+')[0].replace('.','')+'@'+e.split('@')[1] for e in d['emails']}),[({'emails':['test.email+alex@leetcode.com','test.e.mail+bob@leetcode.com','testemail@lee.tcode.com']},'2'),({'emails':['a@x.com','a@y.com']},'2')],[{'emails':e} for e in [[],['a@x'],['a@x','a@x'],['a.b@x','ab@x'],['a+x@d','a+y@d'],['a@x','b@x','a@y']]])
    st('EASY','Destination City','paths contains directed edges forming one simple chain. Return its destination, the city never used as an origin.','paths: 1..10000 distinct [origin,destination] city-name pairs forming one chain.',lambda d:next(iter({b for a,b in d['paths']}-{a for a,b in d['paths']})),[({'paths':[['London','NewYork'],['NewYork','Lima'],['Lima','SaoPaulo']]},'SaoPaulo'),({'paths':[['A','Z']]},'Z')],[{'paths':p} for p in [[['a','b']],[['b','a']],[['a','b'],['b','c']],[['y','z'],['x','y']],[['one','two']],[['b','c'],['a','b'],['c','d']]]])
    st('EASY','Maximum Distinct Candies','You may choose len(types)/2 candies. Return the maximum number of distinct types you can choose.','types: even length 0..100000 integer array.',lambda d:min(len(set(d['types'])),len(d['types'])//2),[({'types':[1,1,2,2,3,3]},'3'),({'types':[1,1,2,3]},'2')],[{'types':a} for a in [[],[1,1],[1,2],[0,0,0,0],[1,2,3,4],[-1,-1,0,0,1,2]]])
    st('EASY','Check Double Exists','Return 1 if distinct indices i,j satisfy nums[i]==2*nums[j], else 0. Two zero entries qualify; one zero does not.','nums: 0..100000 integers.',lambda d:int(any(i!=j and a==2*b for i,a in enumerate(d['nums']) for j,b in enumerate(d['nums']))),[({'nums':[10,2,5,3]},'1'),({'nums':[3,1,7,11]},'0')],[{'nums':a} for a in [[],[0],[0,0],[-2,-4],[1,3,7],[2,1,2]]])
    st('EASY','Count Distinct Integers in Text','Return the number of distinct integer values in maximal digit runs of text. Ignore leading zeros when comparing.','text: lowercase ASCII letters and digits, length 0..100000.',lambda d:distinct_in_text(d['text']),[({'text':'a123bc34d8ef34'},'3'),({'text':'a1b01c001'},'1')],[{'text':s} for s in ['', 'abc', '0', '000a0', 'a10b20c10', '12345678901234567890a1']])

    st('MEDIUM','Contains Nearby Duplicate','Return 1 if equal values appear at distinct indices within distance k, otherwise 0. Target O(n) with a sliding set.','nums: 0..100000 integers; k: 0..100000.',lambda d:int(any(a==b and j-i<=d['k'] for i,a in enumerate(d['nums']) for j,b in enumerate(d['nums']) if j>i)),[({'nums':[1,2,3,1],'k':3},'1'),({'nums':[1,2,3,1,2,3],'k':2},'0')],[{'nums':a,'k':k} for a,k in zip(ARRAYS,[0,1,2,0,3,10])])
    st('MEDIUM','Longest Distinct Subarray','Return the maximum length of a contiguous subarray with all different values. Target O(n) using a sliding set.','nums: 0..100000 integers.',lambda d:max([len(w) for w in windows(d['nums']) if len(set(w))==len(w)]+[0]),[({'nums':[1,2,1,3,4]},'4'),({'nums':[2,2,2]},'1')],[{'nums':a} for a in ARRAYS])
    st('MEDIUM','Valid Sudoku','Return 1 if a 9x9 board has no repeated digit in any row, column, or 3x3 box. A dot denotes empty. Do not require solvability.','board: nine strings of nine characters, digits 1..9 or dot.',lambda d:valid_sudoku(d['board']),[({'board':['53..7....','6..195...','.98....6.','8...6...3','4..8.3..1','7...2...6','.6....28.','...419..5','....8..79']},'1'),({'board':['55.......']+['.........']*8},'0')],[{'board':b} for b in [['.........']*9,['1........']+['.........']*8,['1........','1........']+['.........']*7,['1........','.1.......']+['.........']*7,['123456789']+['.........']*8,['1........']+['.........']*7+['........1']]])
    st('MEDIUM','Repeated DNA Sequences','Return all length-10 substrings occurring more than once, sorted lexicographically and space separated. Return EMPTY if none.','s: A,C,G,T only, length 0..100000.',lambda d:sorted(w for w,c in Counter(d['s'][i:i+10] for i in range(len(d['s'])-9)).items() if c>1),[({'s':'AAAAACCCCCAAAAACCCCCCAAAAAGGGTTT'},'AAAAACCCCC CCCCCAAAAA'),({'s':'AAAAAAAAAAAAA'},'AAAAAAAAAA')],[{'s':s} for s in ['', 'A', 'ACGTACGTAC', 'A'*10, 'C'*11, 'ACGT'*8]])
    st('MEDIUM','Minimum Genetic Mutation','Return minimum single-character mutations from start to end, with every new string in bank. Return -1 if impossible; start==end needs zero.','start,end: 8-character ACGT strings; bank: 0..10000 strings of length 8.',lambda d:mutation(d['start'],d['end'],d['bank']),[({'start':'AACCGGTT','end':'AACCGGTA','bank':['AACCGGTA']},'1'),({'start':'AACCGGTT','end':'AAACGGTA','bank':['AACCGGTA','AACCGCTA','AAACGGTA']},'2')],[{'start':s,'end':e,'bank':b} for s,e,b in [('AAAAAAAA','AAAAAAAA',[]),('AAAAAAAA','AAAAAAAC',[]),('AAAAAAAA','AAAAAAAC',['AAAAAAAC']),('AAAAAAAA','AAAAAACC',['AAAAAACC']),('AAAAAAAA','AAAAAACC',['AAAAAAAC','AAAAAACC']),('CCCCCCCC','CCCCCCCA',['CCCCCCCA','CCCCCCCA'])]])
    st('MEDIUM','Number of Islands','Count orthogonally connected components of 1 cells. Use a set of visited cells or mutate a copy. Target O(rows*cols).','grid: 1..200 by 1..200 rectangular binary matrix.',lambda d:islands(d['grid']),[({'grid':[[1,1,0],[0,1,0],[1,0,1]]},'3'),({'grid':[[1,1],[1,1]]},'1')],[{'grid':g} for g in [[[0]],[[1]],[[1,0,1]],[[1],[0],[1]],[[1,0],[0,1]],[[0,0],[0,0]]]])
    st('MEDIUM','Distinct Subsequences of Length Three','Count distinct length-three palindromic subsequence strings (first and last characters equal). Different index choices producing the same string count once. Target O(26*n).','s: lowercase string length 0..100000.',lambda d:len({d['s'][i]+d['s'][j]+d['s'][k] for i,j,k in combinations(range(len(d['s'])),3) if d['s'][i]==d['s'][k]}),[({'s':'aabca'},'3'),({'s':'adc'},'0')],[{'s':s.lower()} for s in STRINGS])
    st('MEDIUM','Maximum Unique Subarray Sum','Return the largest sum of a contiguous subarray with all distinct values. Empty input returns 0. Target O(n) sliding set.','nums: 0..100000 positive integers.',lambda d:max([sum(w) for w in windows(d['nums']) if len(set(w))==len(w)]+[0]),[({'nums':[4,2,4,5,6]},'17'),({'nums':[5,2,1,2,5,2,1,2,5]},'8')],[{'nums':a} for a in [[],[1],[2,2,2],[1,2,3],[3,2,1,3],[10**9,1,10**9]]])
    st('MEDIUM','Distinct Values in Every Window','Return number of distinct values in each length-k window. Target O(n) using a frequency map and active set.','nums: 1..100000 integers; 1<=k<=len(nums).',lambda d:[len(set(d['nums'][i:i+d['k']])) for i in range(len(d['nums'])-d['k']+1)],[({'nums':[1,2,1,3,4,2,3],'k':4},'3 4 4 3'),({'nums':[1,1],'k':1},'1 1')],[{'nums':a,'k':k} for a,k in [([0],1),([-1,0,-1],2),([2,2,2],3),([1,2,3],1),([1,2,3],3),([1,2,1,2,3],2)]])
    st('MEDIUM','Find Missing and Repeating Number','nums has length n, values 1..n, exactly one value repeated twice and one absent. Return repeated then missing. Target O(n); compare a set-based and constant-space solution.','nums: 2..100000 integers with exactly one duplicate and one missing.',lambda d:[next(x for x,c in Counter(d['nums']).items() if c==2),next(x for x in range(1,len(d['nums'])+1) if x not in d['nums'])],[({'nums':[3,1,2,5,3]},'3 4'),({'nums':[1,1]},'1 2')],[{'nums':a} for a in [[2,2],[1,2,2],[3,3,1],[4,2,3,4],[1,2,3,4,4],[6,2,3,4,5,6]]])
    st('MEDIUM','Find All Duplicates in an Array','Return sorted values appearing twice. Values lie in 1..n, each once or twice. Target O(n); challenge: avoid an auxiliary set by marking indices.','nums: 0..100000 integers in 1..n, each at most twice.',lambda d:sorted(x for x,c in Counter(d['nums']).items() if c==2),[({'nums':[4,3,2,7,8,2,3,1]},'2 3'),({'nums':[1,1,2]},'1')],[{'nums':a} for a in [[],[1],[1,2],[2,2],[1,1,2,2],[3,1,3,4,2,2]]])
    st('MEDIUM','Find All Disappeared Numbers','Return sorted values from 1..n absent from nums. Target O(n); challenge: in-place index marking instead of a set.','nums: 0..100000 values in 1..n.',lambda d:sorted(set(range(1,len(d['nums'])+1))-set(d['nums'])),[({'nums':[4,3,2,7,8,2,3,1]},'5 6'),({'nums':[1,1]},'2')],[{'nums':a} for a in [[],[1],[2,2],[1,2,3],[3,3,3],[1,1,1,1]]])
    st('MEDIUM','Find Common Characters','Return sorted characters common to every word, including minimum multiplicities. Print characters space-separated. No words returns EMPTY.','words: 0..10000 nonempty lowercase strings; total length<=100000.',lambda d:common_chars(d['words']),[({'words':['bella','label','roller']},'e l l'),({'words':['cool','lock','cook']},'c o')],[{'words':w} for w in [[],['a'],['a','b'],['aaa','aa'],['abc','bca','cab'],['zz','zz','zz']]])
    st('MEDIUM','Prefix Common Array','For every prefix ending at i return the number of distinct values common to a[:i+1] and b[:i+1]. Duplicates do not add weight. Target O(n).','a,b: equal-length integer arrays of length 0..100000.',lambda d:prefix_common(d['a'],d['b']),[({'a':[1,3,2,4],'b':[3,1,2,4]},'0 2 3 4'),({'a':[1,1],'b':[1,1]},'1 1')],[{'a':a,'b':b} for a,b in [([],[]),([0],[0]),([1],[2]),([1,2],[2,1]),([1,1,2],[2,2,1]),([-1,0,1],[1,0,-1])]])

    st('HARD','Word Ladder','Return the number of words in the shortest transformation from begin to end, changing one letter each step and using words from dictionary after begin. Return 0 if end is absent or unreachable. Target bidirectional BFS.','begin,end: distinct equal-length lowercase words; words: 0..5000 same-length words.',lambda d:word_ladder(d['begin'],d['end'],d['words']),[({'begin':'hit','end':'cog','words':['hot','dot','dog','lot','log','cog']},'5'),({'begin':'hit','end':'cog','words':['hot','dot','dog']},'0')],ladder_fixtures())
    st('HARD','Word Ladder II Path Count','Count distinct shortest word-ladder sequences from begin to end. Each step changes one letter; all words after begin must be in dictionary. Count paths, not words. Return 0 if unreachable. Use BFS layers then DAG counting.','begin,end: distinct equal-length lowercase words; words: 0..5000 same-length words.',lambda d:ladder_count(d['begin'],d['end'],d['words']),[({'begin':'hit','end':'cog','words':['hot','dot','dog','lot','log','cog']},'2'),({'begin':'a','end':'c','words':['a','b','c']},'1')],ladder_fixtures())
    st('HARD','Alien Dictionary','Infer a character order from words sorted in an unknown alphabet. Return lexicographically smallest valid order, NONE on inconsistency, EMPTY when no characters. Use sets to deduplicate edges and topological sorting.','words: 0..10000 nonempty lowercase strings; total characters<=100000.',lambda d:alien_order(d['words']),[({'words':['wrt','wrf','er','ett','rftt']},'wertf'),({'words':['z','x','z']},'NONE')],[{'words':w} for w in [[],['abc'],['abc','ab'],['a','b'],['za','zb','ca','cb'],['a','a']]])
    st('HARD','Minimum Reverse Operations','Positions 0..n-1 contain one token at p. A move reverses any length-k segment containing the token, moving it to its mirrored index. The token must never land on banned indices. Return minimum moves to every position, -1 if unreachable. Use parity-partitioned ordered sets and BFS.','n: 1..100000; 0<=p<n; 1<=k<=n; banned: distinct valid indices excluding p.',lambda d:reverse_operations(d['n'],d['p'],d['banned'],d['k']),[({'n':4,'p':0,'banned':[1,2],'k':4},'0 -1 -1 1'),({'n':3,'p':1,'banned':[],'k':1},'-1 0 -1')],[{'n':n,'p':p,'banned':b,'k':k} for n,p,b,k in [(1,0,[],1),(2,0,[],2),(5,0,[],2),(5,2,[],3),(4,1,[2],2),(6,3,[0,5],4)]])
    st('HARD','Minimum Visited Cells in a Grid','From (r,c), move right by 1..grid[r][c] cells or down by that many. Return minimum visited cells from top-left to bottom-right, including endpoints, or -1. Target O(rows*cols log(rows*cols)) using unvisited row/column sets.','grid: rectangular nonnegative matrix, total cells 1..100000.',lambda d:visited_cells(d['grid']),[({'grid':[[2,1],[1,0]]},'3'),({'grid':[[0,1],[1,0]]},'-1')],[{'grid':g} for g in [[[0]],[[5]],[[1,1,0]],[[2,0,0]],[[1],[0],[1]],[[2,0,1],[0,0,1],[1,1,0]]]])
    st('HARD','Smallest Range Covering K Lists','Return inclusive endpoints [left,right] of the narrowest range containing a value from every sorted list. Break width ties by smaller left. Use an ordered frontier or heap.','lists: 1..3500 nonempty sorted integer lists; total length<=100000.',lambda d:smallest_range(d['lists']),[({'lists':[[4,10,15,24,26],[0,9,12,20],[5,18,22,30]]},'20 24'),({'lists':[[1,2,3],[1,2,3],[1,2,3]]},'1 1')],[{'lists':a} for a in [[[1]],[[1],[2]],[[0,5],[2,7]],[[-5,-1],[-3,0]],[[1,1],[1]],[[1,4,10],[2,5,9],[3,6,8]]]])
    st('HARD','Sliding Window Median','Return twice the median for every length-k window, avoiding decimals. Even windows use the sum of the middle values. Target O(n log k) with two balanced multisets or heaps.','nums: 1..100000 integers; 1<=k<=len(nums).',lambda d:[twice_median(d['nums'][i:i+d['k']]) for i in range(len(d['nums'])-d['k']+1)],[({'nums':[1,3,-1,-3,5,3,6,7],'k':3},'2 -2 -2 6 10 12'),({'nums':[1,2,3,4],'k':2},'3 5 7')],[{'nums':a,'k':k} for a,k in [([0],1),([-3,-1,-2],2),([2,2,2],3),([1,2,3],1),([4,3,2,1],4),([-10**9,10**9],2)]])
    st('HARD','Contains Nearby Almost Duplicate','Return 1 if distinct indices have distance<=indexDiff and absolute value difference<=valueDiff, else 0. Target O(n log k) ordered set or O(n) expected bucket hashing.','nums: 0..100000 integers; indexDiff,valueDiff: 0..10^9.',lambda d:int(any(j-i<=d['indexDiff'] and abs(a-b)<=d['valueDiff'] for i,a in enumerate(d['nums']) for j,b in enumerate(d['nums']) if j>i)),[({'nums':[1,2,3,1],'indexDiff':3,'valueDiff':0},'1'),({'nums':[1,5,9,1,5,9],'indexDiff':2,'valueDiff':3},'0')],[{'nums':a,'indexDiff':k,'valueDiff':v} for a,k,v in [([],1,1),([0],1,0),([0,0],0,0),([-3,-1],1,2),([1,10,2],1,1),([-10**9,10**9],1,10**9)]])
    st('HARD','Longest Consecutive Sequence Online','Insert values one by one. After each insertion output longest consecutive run among all values seen. Duplicates have no effect. Target O(n) expected using boundary-length maps and a set.','nums: 0..100000 integers.',lambda d:[consecutive(d['nums'][:i]) for i in range(1,len(d['nums'])+1)],[({'nums':[100,4,200,1,3,2]},'1 1 1 1 2 4'),({'nums':[1,1,2]},'1 1 2')],[{'nums':a} for a in ARRAYS])
    st('HARD','Count Distinct Subarrays With Limited Divisibility','Count distinct nonempty contiguous value sequences with at most k elements divisible by p. Equal sequences at different indices count once. Use a trie or collision-verified hashing plus a set.','nums: 0..200 positive integers; k: 0..200; p: positive integer.',lambda d:len({tuple(w) for w in windows(d['nums']) if sum(x%d['p']==0 for x in w)<=d['k']}),[({'nums':[2,3,3,2,2],'k':2,'p':2},'11'),({'nums':[1,2,3,4],'k':4,'p':1},'10')],[{'nums':a,'k':k,'p':p} for a,k,p in [([],0,1),([1],0,2),([2],0,2),([1,1,1],0,2),([2,4,6],1,2),([1,2,1,2],1,2)]])
    st('HARD','Maximum XOR of Two Numbers','Return the maximum XOR between two distinct positions, or 0 if fewer than two values. Target O(n log M) with prefix sets or a binary trie.','nums: 0..100000 integers in [0,2^31-1].',lambda d:max([a^b for i,a in enumerate(d['nums']) for b in d['nums'][i+1:]]+[0]),[({'nums':[3,10,5,25,2,8]},'28'),({'nums':[0]},'0')],[{'nums':a} for a in [[],[1],[0,0],[1,2,3],[8,16,32],[0,2147483647]]])
    st('HARD','Word Break II Sentence Count','Count distinct sentences formed by segmenting s into dictionary words. Duplicate dictionary entries count once. Empty s has one empty segmentation. Use a dictionary set and memoization; return exact count.','s: lowercase string length 0..300; words: 0..10000 nonempty lowercase words.',lambda d:word_break_count(d['s'],d['words']),[({'s':'catsanddog','words':['cat','cats','and','sand','dog']},'2'),({'s':'pineapplepenapple','words':['apple','pen','applepen','pine','pineapple']},'3')],[{'s':s,'words':w} for s,w in [('',[]),('a',[]),('a',['a']),('aaaa',['a','aa']),('ab',['a','a','b']),('abc',['ab','bc'])]])
    st('HARD','Remove Invalid Parentheses','Remove the fewest parentheses to make s valid. Other letters must remain. Return all distinct valid strings sorted and joined with |. Represent an empty valid result as EMPTY. Use BFS with a visited set.','s: letters and parentheses, length 0..25.',lambda d:remove_invalid(d['s']),[({'s':'()())()'},'(())()|()()()'),({'s':'(a)())()'},'(a())()|(a)()()')],[{'s':s} for s in ['', ')(', 'abc', '(((', '()', '(()']])
    st('HARD','N Queens Count','Count placements of n queens on an n*n board with no shared row, column, or diagonal. Use sets for occupied columns and diagonals.','n: 1..12.',lambda d:nqueens(d['n']),[({'n':4},'2'),({'n':1},'1')],[{'n':n} for n in [2,3,5,6,7,8]])

    # LINKED LISTS — serialized inputs are explicit, including cycle/shared-node metadata.
    pointer_note=' Build actual nodes and manipulate links, not array rearrangements. Stdout grading verifies values but cannot enforce pointer use.'
    def ll(level,title,statement,contract,oracle,samples,hidden):
        add('Linked Lists',level,title,statement+pointer_note,contract,oracle,samples,hidden)
    def lv(level,title,statement,oracle,samples,hidden=VALUES,contract='values: 0..100000 integers; output values in head-to-tail order.'):
        ll(level,title,statement,contract,lambda d:oracle(d['values']),[({'values':a},b) for a,b in samples],[{'values':a} for a in hidden])

    ll('EASY','Merge Two Sorted Linked Lists','Merge two sorted singly linked lists and return the merged values. Reuse nodes, O(n+m) time, O(1) extra space.','a,b: sorted integer arrays encoding disjoint lists, length 0..100000 each.',lambda d:sorted(d['a']+d['b']),[({'a':[1,2,4],'b':[1,3,4]},'1 1 2 3 4 4'),({'a':[],'b':[0]},'0')],[{'a':sorted(a),'b':sorted(b)} for a,b in PAIRS])
    lv('EASY','Middle of a Linked List','Return the value of the middle node, using the second middle for even lengths. Empty input returns NONE. Use slow/fast pointers.',lambda a:a[len(a)//2] if a else 'NONE',[([1,2,3,4,5],'3'),([1,2,3,4,5,6],'4')])
    ll('EASY','Linked List Cycle','values serializes nodes; the final node points to node at zero-based pos, or null when pos=-1. Return 1 if cyclic, else 0. Use Floyd pointers, O(1) space.','values: 0..100000 integers; pos=-1 or valid node index; empty requires -1.',lambda d:int(d['pos']>=0),[({'values':[3,2,0,-4],'pos':1},'1'),({'values':[1],'pos':-1},'0')],cycle_fixtures())
    lv('EASY','Remove Duplicates from Sorted Linked List','Keep one node for each value in a sorted list. Return the remaining values. Target O(n), O(1) auxiliary space.',lambda a:sorted(set(a)),[([1,1,2],'1 2'),([1,1,2,3,3],'1 2 3')],[sorted(a) for a in VALUES],'values: sorted array encoding 0..100000 nodes.')
    ll('EASY','Remove Linked List Elements','Remove every node whose value equals target and return remaining values. Use a dummy head.','values: 0..100000 integers; target integer.',lambda d:[x for x in d['values'] if x!=d['target']],[({'values':[1,2,6,3,4,5,6],'target':6},'1 2 3 4 5'),({'values':[7,7],'target':7},'EMPTY')],[{'values':a,'target':t} for a,t in zip(VALUES,[0,0,-1,2,1,11])])
    lv('EASY','Palindrome Linked List','Return 1 if list values read the same forward and backward. Reverse the second half and compare, then restore original links. Target O(n), O(1) space.',lambda a:int(a==a[::-1]),[([1,2,2,1],'1'),([1,2],'0')])
    ll('EASY','Intersection of Two Linked Lists','a and b are disjoint prefixes; shared is a single suffix whose node objects are shared by both lists. Return the intersection node value, or NONE. Equal prefix values do not imply intersection. Use two pointers.','a,b,shared: arrays encoding lists A=a+shared and B=b+shared, each length 0..100000.',lambda d:d['shared'][0] if d['shared'] else 'NONE',[({'a':[4,1],'b':[5,6,1],'shared':[8,4,5]},'8'),({'a':[2],'b':[2],'shared':[]},'NONE')],[{'a':a,'b':b,'shared':s} for a,b,s in [([],[],[]),([],[],[0]),([1],[],[2]),([],[3],[4,5]),([1],[1],[]),([9,8],[7],[6])]])
    lv('EASY','Binary Linked List to Integer','Each node is a binary digit, most significant first. Return the represented integer, with empty input equal to 0.',lambda a:int(''.join(map(str,a)) or '0',2),[([1,0,1],'5'),([0],'0')],[[],[1],[0,0],[1,1],[1,0,0,0],[1]*30],'values: 0..63 binary digits; output integer.')
    lv('EASY','Delete Middle Node','Delete the node at zero-based floor(length/2); this is the second middle for even length. Empty input stays empty. Use slow/fast pointers.',lambda a:a[:len(a)//2]+a[len(a)//2+1:],[([1,3,4,7,1,2,6],'1 3 4 1 2 6'),([1],'EMPTY')])
    ll('EASY','Delete Given Node Without Head','Delete node at index using only that node, not the head or predecessor. It is never the tail. Copy its successor value and bypass the successor. Return resulting values.','values: 2..100000 integers; 0<=index<len(values)-1.',lambda d:d['values'][:d['index']]+d['values'][d['index']+1:],[({'values':[4,5,1,9],'index':1},'4 1 9'),({'values':[4,5,1,9],'index':2},'4 5 9')],[{'values':a,'index':i} for a,i in [([1,2],0),([0,0],0),([-2,-1,0],0),([1,2,3],1),([7,7,7],1),([1,2,3,4,5],3)]])
    ll('EASY','Kth Node From End','Return the kth node value counted from the tail, k=1 for tail; return NONE when k exceeds length. Use a pointer gap.','values: 0..100000 integers; k: 1..100000.',lambda d:d['values'][-d['k']] if d['k']<=len(d['values']) else 'NONE',[({'values':[1,2,3,4,5],'k':2},'4'),({'values':[1],'k':2},'NONE')],[{'values':a,'k':k} for a,k in zip(VALUES,[1,1,3,4,2,12])])
    lv('EASY','Remove Adjacent Duplicates in Unsorted List','Remove consecutive repeated nodes, retaining the first in each run. Nonadjacent duplicates remain. Return values.',lambda a:[x for i,x in enumerate(a) if i==0 or x!=a[i-1]],[([1,1,2,1,1],'1 2 1'),([3,3,3],'3')])
    ll('EASY','Insert Into Sorted Linked List','Insert one node of value x into the sorted list and return the resulting values. Target O(n).','values: sorted array encoding 0..100000 nodes; x integer.',lambda d:sorted(d['values']+[d['x']]),[({'values':[1,3,5],'x':4},'1 3 4 5'),({'values':[],'x':2},'2')],[{'values':sorted(a),'x':x} for a,x in zip(VALUES,[0,0,-5,2,3,20])])
    lv('EASY','Pairwise Swap Node Values','Swap values of each adjacent pair of nodes. An unpaired final node remains. This introductory variant allows value swaps; the Medium variant requires rewiring.',lambda a:[a[i+1] if i%2==0 and i+1<len(a) else a[i-1] if i%2 else a[i] for i in range(len(a))],[([1,2,3,4],'2 1 4 3'),([1,2,3],'2 1 3')])

    ll('MEDIUM','Add Two Numbers','a and b encode nonnegative integers as reverse-order decimal digit linked lists. Add using carry and return reverse-order digits. Do not convert the full inputs to integers.','a,b: 1..100000 digits, no redundant most-significant zeros except [0].',lambda d:number_digits(d['a'],d['b'],False),[({'a':[2,4,3],'b':[5,6,4]},'7 0 8'),({'a':[0],'b':[0]},'0')],digit_fixtures())
    ll('MEDIUM','Add Two Numbers II','a and b encode integers as forward-order decimal digit lists. Add using stacks or list reversal, not whole-number conversion. Return forward-order digits.','a,b: 1..100000 digits, no leading zeros except [0].',lambda d:number_digits(d['a'],d['b'],True),[({'a':[7,2,4,3],'b':[5,6,4]},'7 8 0 7'),({'a':[0],'b':[0]},'0')],digit_fixtures())
    ll('MEDIUM','Reverse Linked List II','Reverse links from 1-based left through right inclusive, leaving other nodes unchanged.','values: 1..100000 integers; 1<=left<=right<=length.',lambda d:reverse_between(d['values'],d['left'],d['right']),[({'values':[1,2,3,4,5],'left':2,'right':4},'1 4 3 2 5'),({'values':[5],'left':1,'right':1},'5')],[{'values':a,'left':l,'right':r} for a,l,r in [([0],1,1),([1,2],1,2),([1,2,3],1,2),([1,2,3],2,3),([7,7,7],1,3),([-1,0,1,2],2,4)]])
    lv('MEDIUM','Swap Nodes in Pairs','Swap every adjacent pair by rewiring next pointers, never by swapping values. An unpaired final node stays unchanged. Target O(n), O(1) space.',lambda a:sum([a[i:i+2][::-1] for i in range(0,len(a),2)],[]),[([1,2,3,4],'2 1 4 3'),([1,2,3],'2 1 3')])
    ll('MEDIUM','Rotate Linked List','Rotate the list right by k nodes. k may exceed length. Target O(n) time and O(1) auxiliary space.','values: 0..100000 integers; k: 0..10^9.',lambda d:rotate(d['values'],d['k']),[({'values':[1,2,3,4,5],'k':2},'4 5 1 2 3'),({'values':[0,1,2],'k':4},'2 0 1')],[{'values':a,'k':k} for a,k in zip(VALUES,[1,0,3,4,1,10**9])])
    lv('MEDIUM','Reorder List','Reorder L0,L1,...,Ln into L0,Ln,L1,Ln-1,... by splitting, reversing the second half, then weaving links. Target O(n), O(1) space.',reorder,[([1,2,3,4],'1 4 2 3'),([1,2,3,4,5],'1 5 2 4 3')])
    lv('MEDIUM','Odd Even Linked List','Group nodes in odd 1-based positions before nodes in even positions, preserving relative order within each group. Position parity, not value parity. O(n), O(1) space.',lambda a:a[::2]+a[1::2],[([1,2,3,4,5],'1 3 5 2 4'),([2,1,3,5,6,4,7],'2 3 6 7 1 5 4')])
    ll('MEDIUM','Partition List','Stably partition nodes into values<x followed by values>=x. Preserve relative order in both groups. Rewire nodes, O(n).','values: 0..100000 integers; x integer.',lambda d:[v for v in d['values'] if v<d['x']]+[v for v in d['values'] if v>=d['x']],[({'values':[1,4,3,2,5,2],'x':3},'1 2 2 4 3 5'),({'values':[2,1],'x':2},'1 2')],[{'values':a,'x':x} for a,x in zip(VALUES,[0,0,-2,2,0,6])])
    lv('MEDIUM','Sort Linked List','Sort list values ascending with bottom-up linked-list merge sort. Target O(n log n) time and O(1) auxiliary space excluding output.',sorted,[([4,2,1,3],'1 2 3 4'),([-1,5,3,4,0],'-1 0 3 4 5')])
    lv('MEDIUM','Insertion Sort Linked List','Sort by removing each node and inserting it into its correct position in a growing sorted list. Rewire links; target O(n^2), O(1) extra space.',sorted,[([4,2,1,3],'1 2 3 4'),([3,3,1],'1 3 3')],contract='values: 0..5000 integers.')
    lv('MEDIUM','Remove All Duplicate Values from Sorted List','Remove every node whose value occurs more than once in the sorted list. Only originally unique values remain.',lambda a:[x for x in a if a.count(x)==1],[([1,2,3,3,4,4,5],'1 2 5'),([1,1,1,2,3],'2 3')],[sorted(a) for a in VALUES],'values: sorted array encoding 0..100000 nodes.')
    ll('MEDIUM','Linked List Cycle Entry','The tail points to zero-based pos or null for -1. Return the index of the cycle entry, or -1. Build the cycle and use Floyd pointers without an auxiliary visited set.','values: 0..100000 integers; pos=-1 or valid index; empty requires -1.',lambda d:d['pos'],[({'values':[3,2,0,-4],'pos':1},'1'),({'values':[1,2],'pos':0},'0')],cycle_fixtures())
    ll('MEDIUM','Copy List With Random Pointer','random[i] is the index targeted by node i, or -1. Deep-copy next and random pointers. Return flattened value randomIndex pairs of the copied list, preserving order. Do not reuse original nodes.','values and random: equal-length arrays, 0..100000 nodes; each random index valid or -1. Identity is instructional, not enforceable via stdout.',lambda d:[x for pair in zip(d['values'],d['random']) for x in pair],[({'values':[7,13,11],'random':[-1,0,1]},'7 -1 13 0 11 1'),({'values':[1],'random':[0]},'1 0')],[{'values':a,'random':r} for a,r in [([],[]),([0],[-1]),([1,2],[1,0]),([7,7],[0,1]),([-1,0,1],[-1,-1,-1]),([1,2,3],[2,2,0])]])
    lv('MEDIUM','Remove Zero Sum Consecutive Nodes','Repeatedly delete consecutive nodes summing to zero. Scan starts from the head; for the first start admitting deletion choose the longest zero-sum segment, then restart. Return final values. Use prefix-last-occurrence mapping, O(n).',remove_zero,[([1,2,-3,3,1],'3 1'),([1,2,3,-3,4],'1 2 4')])

    ll('HARD','Merge K Sorted Linked Lists','Merge k sorted linked lists into one by relinking nodes. Return sorted values. Target O(N log k) using a heap or divide and conquer.','lists: 0..10000 sorted integer arrays; total nodes<=100000.',lambda d:merge_k(d['lists']),[({'lists':[[1,4,5],[1,3,4],[2,6]]},'1 1 2 3 4 4 5 6'),({'lists':[]},'EMPTY')],[{'lists':a} for a in [[[]],[[0]],[[],[1],[]],[[-3,-1],[-2,0]],[[2,2],[2]],[[1,3,5],[2,4,6],[0,7]]]])
    ll('HARD','LRU Cache','Implement get and put with a hash map and doubly linked list. get returns value or -1; put inserts or updates and evicts least recently used when full. Successful get and put refresh recency. Return get results. Target O(1) per operation.','capacity: 0..100000; ops: [get,key] or [put,key,value], at most 100000.',lambda d:lru(d['capacity'],d['ops']),[({'capacity':2,'ops':[['put',1,1],['put',2,2],['get',1],['put',3,3],['get',2],['get',3]]},'1 -1 3'),({'capacity':0,'ops':[['put',1,1],['get',1]]},'-1')],cache_fixtures())
    ll('HARD','LFU Cache','Implement get/put with frequency-bucket linked lists. Evict least frequently used, breaking ties by least recently used. A new key starts at frequency 1; successful get and existing-key put increment frequency. Return get results. Target O(1) per operation.','capacity: 0..100000; ops: [get,key] or [put,key,value], at most 100000.',lambda d:lru(d['capacity'],d['ops'],True),[({'capacity':2,'ops':[['put',1,1],['put',2,2],['get',1],['put',3,3],['get',2],['get',3]]},'1 -1 3'),({'capacity':1,'ops':[['put',1,1],['put',2,2],['get',1],['get',2]]},'-1 2')],cache_fixtures())
    ll('HARD','Flatten Multilevel Doubly Linked List','A nested list serializes a level: an integer is a node value; a nested list immediately following an integer is that node\'s child chain. Flatten depth first, visiting children before the next sibling. Restore prev links and clear child pointers. Return values.','nested: valid nested representation; 0..100000 integer nodes; each child list follows an integer; depth<=1000.',lambda d:flatten(d['nested']),[({'nested':[1,2,[7,8,[11,12],9],3]},'1 2 7 8 11 12 9 3'),({'nested':[1,[2],3]},'1 2 3')],[{'nested':n} for n in [[],[0],[1,2,3],[1,[2,[3]]],[1,[],2],[1,[2,3],4,[5]]]])
    lv('HARD','Reverse Nodes in Even Length Groups','Partition nodes into consecutive groups with intended sizes 1,2,3,...; the last may be shorter. Reverse a group only if its actual size is even. Target O(n), O(1) space.',even_groups,[([5,2,6,3,9,1,7,3,8,4],'5 6 2 3 9 1 4 8 3 7'),([1,1,0,6],'1 0 1 6')])
    lv('HARD','Sort a List Ordered by Absolute Value','Input is sorted by nondecreasing absolute value. Sort signed values ascending in O(n) time and O(1) auxiliary space by moving negative nodes to the front.',sort_by_absolute,[([1,-2,-3,4,-5],'-5 -3 -2 1 4'),([0,-1,2,-3],'-3 -1 0 2')],[sorted(a,key=abs) for a in VALUES],'values: 0..100000 integers sorted by nondecreasing absolute value.')
    ll('HARD','Flatten Sorted Vertical Linked Lists','Each array is a sorted bottom-linked chain; chain heads are connected by next links in the given order. Flatten all nodes into one sorted bottom chain, clearing next links. Return values. Target O(N log k).','lists: 0..10000 sorted integer chains; total nodes<=100000.',lambda d:merge_k(d['lists']),[({'lists':[[5,7,8,30],[10,20],[19,22,50],[28,35,40,45]]},'5 7 8 10 19 20 22 28 30 35 40 45 50'),({'lists':[[1],[0]]},'0 1')],[{'lists':a} for a in [[],[[]],[[0]],[[-2,0],[-1]],[[1,1],[1]],[[3,6],[1,4],[2,5]]]])
    ll('HARD','Multiply Two Linked List Numbers','a and b are forward-order decimal digit lists. Return their product as forward-order digits, with no leading zeros. Implement digit-wise multiplication, not whole-number conversion. Target O(n*m).','a,b: 1..1000 digits, no leading zeros except [0].',lambda d:list(map(int,str(int(''.join(map(str,d['a'])))*int(''.join(map(str,d['b'])))))),[({'a':[1,2],'b':[3,4]},'4 0 8'),({'a':[0],'b':[9,9]},'0')],digit_fixtures())
    ll('HARD','Subtract Two Linked List Numbers','a and b are forward-order digit lists with a>=b. Subtract using borrow, not whole-number conversion. Return normalized forward-order digits.','a,b: 1..100000 digits, no leading zeros except [0]; a>=b.',lambda d:list(map(int,str(int(''.join(map(str,d['a'])))-int(''.join(map(str,d['b'])))))),[({'a':[1,0,0,0],'b':[1]},'9 9 9'),({'a':[1,2,3],'b':[1,2,3]},'0')],[{'a':a,'b':b} for a,b in [([0],[0]),([1],[0]),([1,0],[9]),([9,9],[1]),([1,0,0],[9,9]),([5,0,0],[2,5,1])]])
    ll('HARD','Reverse Alternating K Node Groups','Partition into complete size-k groups. Reverse the first, keep the second, reverse the third, alternating. Leave any final incomplete group unchanged. Rewire in O(n) time, O(1) space.','values: 0..100000 integers; k: 1..100000.',lambda d:alternating(d['values'],d['k']),[({'values':[1,2,3,4,5,6,7,8],'k':2},'2 1 3 4 6 5 7 8'),({'values':[1,2,3,4,5],'k':3},'3 2 1 4 5')],[{'values':a,'k':k} for a,k in zip(VALUES,[1,1,5,2,2,3])])
    lv('HARD','Remove Nodes With Greater Value to Right','Delete every node having a strictly greater value anywhere to its right. Equal values are retained. Target O(n) time, O(1) space by reversing twice.',lambda a:[x for i,x in enumerate(a) if not any(v>x for v in a[i+1:])],[([5,2,13,3,8],'13 8'),([1,1,1],'1 1 1')])
    ll('HARD','Josephus Circular Linked List','Build a circular list of nodes labeled 1..n. Starting at 1, count k nodes (current counts as 1), delete the kth, and resume at its successor. Return the full elimination order including survivor.','n: 1..5000; k: 1..10000. Target O(n*k) pointer traversal; advanced circular-list exercise.',lambda d:josephus(d['n'],d['k']),[({'n':5,'k':2},'2 4 1 5 3'),({'n':1,'k':5},'1')],[{'n':n,'k':k} for n,k in [(1,1),(2,1),(2,2),(5,1),(6,3),(7,10)]])
    ll('HARD','Design Skip List','Process [add,x], [erase,x], [search,x] using a multiset skip list. Duplicates allowed. erase removes one copy and returns 1 if found, else 0. search returns 1/0. Return erase/search results. Target expected O(log n) per operation with layered linked nodes.','ops: 0..100000 operations; values integers. Random levels must not affect results.',lambda d:skiplist(d['ops']),[({'ops':[['add',1],['add',2],['search',1],['erase',1],['search',1]]},'1 1 0'),({'ops':[['add',3],['add',3],['erase',3],['search',3]]},'1 1')],[{'ops':o} for o in [[],[['search',0]],[['erase',1]],[['add',-1],['search',-1]],[['add',0],['erase',0],['erase',0]],[['add',2],['add',1],['add',2],['erase',2],['search',2]]]])
    ll('HARD','Merge K Sorted Circular Linked Lists','Each input array is a nondecreasing traversal from a circular list\'s minimum head, and the tail links back to that head. Empty arrays are null. Merge into one sorted circular list, return one traversal from its minimum. Reuse nodes; O(N log k).','lists: 0..10000 sorted arrays; total nodes<=100000. Break/rebuild cycles safely.',lambda d:merge_k(d['lists']),[({'lists':[[1,4],[2,3],[0,5]]},'0 1 2 3 4 5'),({'lists':[[],[1,1]]},'1 1')],[{'lists':a} for a in [[],[[]],[[0]],[[1],[2]],[[-3,-1],[-2]],[[7,7],[7],[6,8]]]])
    return result


# Compact, auditable reference implementations for advanced fixtures.
def merge_intervals(intervals):
    out=[]
    for l,r in sorted(intervals):
        if out and l<=out[-1][1]: out[-1][1]=max(out[-1][1],r)
        else: out.append([l,r])
    return [v for pair in out for v in pair]


def next_permutation(a):
    a=a[:]; i=len(a)-2
    while i>=0 and a[i]>=a[i+1]: i-=1
    if i<0: return a[::-1]
    j=len(a)-1
    while a[j]<=a[i]: j-=1
    a[i],a[j]=a[j],a[i]
    return a[:i+1]+a[i+1:][::-1]


def spiral(m):
    m=[r[:] for r in m]; out=[]
    while m:
        out+=m.pop(0)
        m=[list(r) for r in zip(*m)][::-1] if m else []
    return out


def twice_median(a):
    a=sorted(a); n=len(a)
    return a[(n-1)//2]+a[n//2]


@lru_cache(None)
def burst(a):
    return max([(a[i-1] if i else 1)*x*(a[i+1] if i+1<len(a) else 1)+burst(a[:i]+a[i+1:]) for i,x in enumerate(a)] or [0])


def candy(a):
    c=[1]*len(a)
    for i in range(1,len(a)):
        if a[i]>a[i-1]: c[i]=c[i-1]+1
    for i in range(len(a)-2,-1,-1):
        if a[i]>a[i+1]: c[i]=max(c[i],c[i+1]+1)
    return sum(c)


def three_windows(a,k):
    choices=[(sum(a[i:i+k])+sum(a[j:j+k])+sum(a[l:l+k]),[i,j,l]) for i in range(len(a)-3*k+1) for j in range(i+k,len(a)-2*k+1) for l in range(j+k,len(a)-k+1)]
    return min(choices,key=lambda x:(-x[0],x[1]))[1]


def common_word(text,banned):
    c=Counter(w for w in text.split() if w not in set(banned))
    return min(c,key=lambda w:(-c[w],w)) if c else 'NONE'


def brick_wall(wall):
    edges=Counter()
    for row in wall:
        x=0
        for w in row[:-1]: x+=w; edges[x]+=1
    return len(wall)-max(edges.values(),default=0)


def valid_parentheses(s):
    balance=0
    for c in s:
        if c not in '()': continue
        balance+=1 if c=='(' else -1
        if balance<0: return False
    return balance==0


def distinct_subseq(s,t):
    dp=[1]+[0]*len(t)
    for c in s:
        for j in range(len(t)-1,-1,-1):
            if t[j]==c: dp[j+1]+=dp[j]
    return dp[-1]


def arithmetic_count(a):
    dp=[Counter() for _ in a]; count=0
    for j,b in enumerate(a):
        for i,x in enumerate(a[:j]):
            diff=b-x; count+=dp[i][diff]; dp[j][diff]+=1+dp[i][diff]
    return count


def max_points(p):
    if len(p)<3: return len(p)
    return max(sum((y-a[1])*(b[0]-a[0])==(b[1]-a[1])*(x-a[0]) for x,y in p) for a,b in combinations(p,2))


def submatrix_count(m,target):
    return sum(sum(m[r][c] for r in range(top,bottom+1) for c in range(left,right+1))==target for top in range(len(m)) for bottom in range(top,len(m)) for left in range(len(m[0])) for right in range(left,len(m[0])))


def min_window_subsequence(s,t):
    if not t: return 'NONE'
    candidates=[]
    for i in range(len(s)):
        j=0
        for end in range(i,len(s)):
            if s[end]==t[j]: j+=1
            if j==len(t): candidates.append((end-i+1,i,s[i:end+1])); break
    return min(candidates)[2] if candidates else 'NONE'


def secret_people(n,first,meetings):
    known={0,first}; grouped=defaultdict(list)
    for a,b,t in meetings: grouped[t].append((a,b))
    for t,edges in sorted(grouped.items()):
        changed=True
        while changed:
            changed=False
            for a,b in edges:
                if (a in known)!=(b in known): known.update((a,b)); changed=True
    return sorted(known)


def frequency_stack(ops):
    stack=[]; out=[]
    for op in ops:
        if op[0]=='push': stack.append(op[1])
        else:
            c=Counter(stack); best=max(c.values())
            i=next(i for i in range(len(stack)-1,-1,-1) if c[stack[i]]==best)
            out.append(stack.pop(i))
    return out


def longest_duplicate(s):
    for size in range(len(s)-1,0,-1):
        c=Counter(s[i:i+size] for i in range(len(s)-size+1))
        duplicates=sorted(w for w,n in c.items() if n>1)
        if duplicates: return duplicates[0]
    return 'NONE'


def happy(n):
    seen=set()
    while n!=1 and n not in seen:
        seen.add(n); n=sum(int(c)**2 for c in str(n))
    return int(n==1)


def distinct_in_text(s):
    import re
    return len({int(x) for x in re.findall('[0-9]+',s)})


def valid_sudoku(board):
    groups=[list(r) for r in board]+[list(c) for c in zip(*board)]+[[board[r+i][c+j] for i in range(3) for j in range(3)] for r in range(0,9,3) for c in range(0,9,3)]
    return int(all(len([x for x in g if x!='.'])==len(set(g)-{'.'}) for g in groups))


def mutation(s,e,bank):
    if s==e: return 0
    distance=word_ladder(s,e,bank)
    return distance-1 if distance else -1


def islands(g):
    todo={(r,c) for r,row in enumerate(g) for c,x in enumerate(row) if x}; count=0
    while todo:
        stack=[todo.pop()]; count+=1
        while stack:
            r,c=stack.pop()
            for cell in [(r+1,c),(r-1,c),(r,c+1),(r,c-1)]:
                if cell in todo: todo.remove(cell); stack.append(cell)
    return count


def common_chars(words):
    if not words: return []
    c=Counter(words[0])
    for w in words[1:]: c &= Counter(w)
    return sorted(c.elements())


def ladder_fixtures():
    return [{'begin':s,'end':e,'words':w} for s,e,w in [('a','b',[]),('a','b',['b']),('aa','bb',['ab','bb']),('aa','bb',['ab','ba','bb']),('aaa','bbb',['bbb']),('aa','bb',['ab','ab','bb'])]]


def reverse_operations(n,p,banned,k):
    dist=[-1]*n; dist[p]=0; q=deque([p]); banned=set(banned)
    while q:
        i=q.popleft()
        for left in range(max(0,i-k+1),min(i,n-k)+1):
            j=2*left+k-1-i
            if j not in banned and dist[j]<0: dist[j]=dist[i]+1; q.append(j)
    return dist


def visited_cells(g):
    rows,cols=len(g),len(g[0]); q=deque([(0,0,1)]); seen={(0,0)}
    while q:
        r,c,n=q.popleft()
        if (r,c)==(rows-1,cols-1): return n
        for rr,cc in [(r,j) for j in range(c+1,min(cols,c+g[r][c]+1))]+[(i,c) for i in range(r+1,min(rows,r+g[r][c]+1))]:
            if (rr,cc) not in seen: seen.add((rr,cc)); q.append((rr,cc,n+1))
    return -1


def smallest_range(lists):
    vals=sorted(set(x for a in lists for x in a))
    return min(([l,r] for l in vals for r in vals if l<=r and all(any(l<=x<=r for x in a) for a in lists)),key=lambda p:(p[1]-p[0],p[0]))


def consecutive(a):
    a=sorted(set(a)); best=run=0; last=None
    for x in a:
        run=run+1 if last is not None and x==last+1 else 1
        best=max(best,run); last=x
    return best


def word_break_count(s,words):
    words=set(words)
    @lru_cache(None)
    def solve(i):
        if i==len(s): return 1
        return sum(solve(j) for j in range(i+1,len(s)+1) if s[i:j] in words)
    return solve(0)


def remove_invalid(s):
    layer={s}
    while True:
        valid=sorted(x for x in layer if valid_parentheses(x))
        if valid: return '|'.join(x or 'EMPTY' for x in valid)
        layer={s[:i]+s[i+1:] for s in layer for i,c in enumerate(s) if c in '()'}


def nqueens(n):
    def place(row,cols,down,up):
        if row==n: return 1
        return sum(place(row+1,cols|{c},down|{row-c},up|{row+c}) for c in range(n) if c not in cols and row-c not in down and row+c not in up)
    return place(0,set(),set(),set())


def cycle_fixtures():
    return [{'values':a,'pos':p} for a,p in [([],-1),([0],0),([1,2],-1),([2,2],1),([-1,0,1],0),(list(range(12)),10)]]


def digit_fixtures():
    return [{'a':a,'b':b} for a,b in [([0],[0]),([1],[9]),([9,9],[1]),([1,0,1],[9]),([9]*10,[9]*10),([5],[5])]]


def number_digits(a,b,forward):
    value=lambda a:int(''.join(map(str,a if forward else a[::-1])))
    digits=list(map(int,str(value(a)+value(b))))
    return digits if forward else digits[::-1]


def rotate(a,k):
    if not a or k%len(a)==0: return a[:]
    k%=len(a); return a[-k:]+a[:-k]


def cache_fixtures():
    return [{'capacity':c,'ops':o} for c,o in [(0,[['get',1]]),(1,[]),(1,[['put',1,2],['put',1,3],['get',1]]),(2,[['put',1,1],['put',2,2],['get',1],['get',1],['put',3,3],['get',2]]),(2,[['put',1,1],['put',2,2],['put',3,3],['get',1],['get',2]]),(1,[['put',0,-1],['get',0],['put',2,4],['get',0],['get',2]])]]


def even_groups(a):
    out=[]; i=0; size=1
    while i<len(a):
        group=a[i:i+size]; out+=group[::-1] if len(group)%2==0 else group
        i+=size; size+=1
    return out


def alternating(a,k):
    out=[]
    for i in range(0,len(a),k):
        group=a[i:i+k]; out+=group[::-1] if (i//k)%2==0 and len(group)==k else group
    return out


def josephus(n,k):
    a=list(range(1,n+1)); i=0; out=[]
    while a:
        i=(i+k-1)%len(a); out.append(a.pop(i))
    return out


def skiplist(ops):
    c=Counter(); out=[]
    for kind,x in ops:
        if kind=='add': c[x]+=1
        elif kind=='search': out.append(int(c[x]>0))
        else:
            out.append(int(c[x]>0))
            if c[x]: c[x]-=1
    return out
