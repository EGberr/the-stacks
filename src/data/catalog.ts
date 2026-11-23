/**
 * The collection. Summaries are original, written for this project: no text is
 * taken from the books. No imports, so the Node resolver script can read it too.
 */

export interface Domain {
  id: string;
  name: string;
  /** One line under the title. */
  line: string;
  /** Spine and accent colour. */
  color: string;
}

export interface Book {
  id: string;
  domain: string;
  title: string;
  author: string;
  year: number;
  kind: 'book' | 'paper';
  /** 1 = start here, 2 = core, 3 = deep. */
  level: 1 | 2 | 3;
  /** Who gets the most from it. */
  who: string;
  /** Five ideas worth keeping. */
  ideas: [string, string, string, string, string];
  before?: string[];
  after?: string[];
  /** A legal free edition, when the author or publisher offers one. */
  free?: string;
}

export interface Path {
  id: string;
  name: string;
  line: string;
  weeks: number;
  books: string[];
}

export const DOMAINS: Domain[] = [
  { id: 'systems', name: 'System Design', line: 'How large systems stay fast, correct and alive.', color: '#e0703a' },
  { id: 'code', name: 'Algorithms & Craft', line: 'Solving the problem, then writing it so others can read it.', color: '#3f8fd6' },
  { id: 'data', name: 'Databases & Data', line: 'Where the bytes live, and how they move.', color: '#2fa58a' },
  { id: 'ai', name: 'AI & Machine Learning', line: 'From gradient descent to systems that ship.', color: '#a05ad8' },
  { id: 'cloud', name: 'Cloud & Operations', line: 'Running software, and the teams that run it.', color: '#d6a531' },
  { id: 'presales', name: 'Pre-sales & Product', line: 'Turning technology into something a customer says yes to.', color: '#d44a63' },
];

export const BOOKS: Book[] = [
  // ── System Design ─────────────────────────────────────────────────────────
  {
    id: 'ddia', domain: 'systems', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', year: 2017, kind: 'book', level: 2,
    who: 'Anyone who has to choose or defend a data architecture.',
    ideas: [
      'Reliability, scalability and maintainability are the three questions behind every design.',
      'Replication buys availability and costs you consistency; know which lag you can tolerate.',
      'Partitioning spreads load, and makes every cross-partition query a design problem.',
      'Transactions are a spectrum of isolation levels, each allowing specific anomalies.',
      'Logs and streams let you derive every other view of the data from one source of truth.',
    ],
    before: ['sdi'], after: ['dynamo', 'raft', 'dbint'],
  },
  {
    id: 'sdi', domain: 'systems', title: 'System Design Interview', author: 'Alex Xu', year: 2020, kind: 'book', level: 1,
    who: 'Candidates preparing a system design round.',
    ideas: [
      'Clarify requirements and scale before drawing a single box.',
      'Back-of-envelope estimates decide the architecture more than taste does.',
      'Most designs reuse a small kit: load balancer, cache, queue, database, CDN.',
      'Consistent hashing, rate limiting and ID generation come up again and again.',
      'Name the bottleneck and the trade-off out loud; that is what is being graded.',
    ],
    after: ['ddia'],
  },
  {
    id: 'sre', domain: 'systems', title: 'Site Reliability Engineering', author: 'Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Richard Murphy', year: 2016, kind: 'book', level: 2,
    who: 'Engineers who carry a pager, and those who design for them.',
    ideas: [
      'An error budget turns reliability from an argument into a number.',
      'Pick service level objectives users feel, not metrics that are easy to collect.',
      'Toil is work that scales with traffic; cap it and automate the rest.',
      'Blameless postmortems fix systems instead of punishing people.',
      'Cascading failures are prevented by load shedding, backoff and graceful degradation.',
    ],
    before: ['ddia'], after: ['releaseit'],
    free: 'https://sre.google/sre-book/table-of-contents/',
  },
  {
    id: 'microservices', domain: 'systems', title: 'Building Microservices', author: 'Sam Newman', year: 2015, kind: 'book', level: 2,
    who: 'Teams splitting a monolith, or wondering whether they should.',
    ideas: [
      'A service boundary should follow a business capability, not a technical layer.',
      'Independent deployability is the property that matters; without it you have a distributed monolith.',
      'Each service owns its data; sharing a database couples everything again.',
      'Prefer asynchronous events where a caller does not need the answer now.',
      'Microservices trade code complexity for operational complexity. Pay only if it buys something.',
    ],
    before: ['fsa'], after: ['releaseit'],
  },
  {
    id: 'releaseit', domain: 'systems', title: 'Release It!', author: 'Michael T. Nygard', year: 2007, kind: 'book', level: 2,
    who: 'Developers whose code has to survive production.',
    ideas: [
      'Every integration point will fail; design each call as if it already has.',
      'Timeouts, circuit breakers and bulkheads stop one failure from spreading.',
      'Slow responses are worse than errors, because they hold resources.',
      'Unbounded result sets and queues are outages waiting for enough data.',
      'Production is the only environment that tells the truth, so build for observability.',
    ],
    before: ['sre'],
  },
  {
    id: 'fsa', domain: 'systems', title: 'Fundamentals of Software Architecture', author: 'Mark Richards, Neal Ford', year: 2020, kind: 'book', level: 1,
    who: 'Developers moving toward architecture decisions.',
    ideas: [
      'Everything in architecture is a trade-off; an answer without one is incomplete.',
      'Architecture characteristics such as scalability or deployability are the real requirements.',
      'Each style, from layered to event-driven, rates differently on those characteristics.',
      'Measure coupling and cohesion at the component level, not only in code.',
      'An architect documents why a decision was made, not only what was decided.',
    ],
    after: ['microservices', 'ddia'],
  },
  {
    id: 'dynamo', domain: 'systems', title: 'Dynamo: Amazon’s Highly Available Key-value Store', author: 'DeCandia et al.', year: 2007, kind: 'paper', level: 3,
    who: 'Readers who want to see availability chosen over consistency, in detail.',
    ideas: [
      'Always accept writes, and reconcile conflicts later.',
      'Consistent hashing with virtual nodes spreads keys and eases rebalancing.',
      'Tunable quorums (N, R, W) let each use case pick its own trade-off.',
      'Vector clocks record causality so divergent versions can be detected.',
      'Gossip and hinted handoff keep the ring working while nodes come and go.',
    ],
    before: ['ddia'], after: ['raft'],
    free: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
  },
  {
    id: 'raft', domain: 'systems', title: 'In Search of an Understandable Consensus Algorithm', author: 'Diego Ongaro, John Ousterhout', year: 2014, kind: 'paper', level: 3,
    who: 'Anyone who uses etcd, Consul or Kafka and wants to know what holds them together.',
    ideas: [
      'Consensus is easier to reason about when split into election, replication and safety.',
      'One leader per term orders every write; followers only copy its log.',
      'An entry is committed once a majority has stored it.',
      'Randomised election timeouts break ties without extra machinery.',
      'A candidate with a stale log cannot win, which keeps committed entries safe.',
    ],
    before: ['ddia', 'dynamo'],
    free: 'https://raft.github.io/raft.pdf',
  },

  // ── Algorithms & Craft ────────────────────────────────────────────────────
  {
    id: 'ctci', domain: 'code', title: 'Cracking the Coding Interview', author: 'Gayle Laakmann McDowell', year: 2008, kind: 'book', level: 1,
    who: 'Candidates preparing coding rounds.',
    ideas: [
      'Talk through a brute-force answer first, then improve it.',
      'Most problems reduce to a handful of patterns over arrays, trees, graphs and hash maps.',
      'State time and space complexity before you are asked.',
      'Test your code by hand with a small case and an edge case.',
      'Interviewers grade how you think and communicate, not only the final code.',
    ],
    after: ['skiena'],
  },
  {
    id: 'skiena', domain: 'code', title: 'The Algorithm Design Manual', author: 'Steven S. Skiena', year: 1997, kind: 'book', level: 2,
    who: 'Programmers who want to recognise which algorithm a real problem needs.',
    ideas: [
      'Modelling the problem correctly is most of the work.',
      'Sorting is the first tool to reach for; many problems fall once data is ordered.',
      'Graphs describe far more situations than they first appear to.',
      'Dynamic programming is recursion plus remembering what you already solved.',
      'When a problem is NP-complete, switch to approximation or heuristics instead of hoping.',
    ],
    before: ['ctci'], after: ['clrs'],
  },
  {
    id: 'clrs', domain: 'code', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', year: 1990, kind: 'book', level: 3,
    who: 'Readers who want the proofs, not just the recipes.',
    ideas: [
      'Asymptotic notation is a precise language for growth, not a vague label.',
      'Loop invariants are how you prove an algorithm correct.',
      'Divide and conquer costs are solved with recurrences.',
      'Amortised analysis explains why occasional expensive operations can still be cheap.',
      'Greedy works only when the problem has the right structure; prove it before trusting it.',
    ],
    before: ['skiena'],
  },
  {
    id: 'pragmatic', domain: 'code', title: 'The Pragmatic Programmer', author: 'Andrew Hunt, David Thomas', year: 1999, kind: 'book', level: 1,
    who: 'Every working programmer, early in their career.',
    ideas: [
      'Do not repeat yourself: every piece of knowledge needs one authoritative home.',
      'Fix broken windows early, before neglect becomes the norm.',
      'Build a thin end-to-end slice first, a tracer bullet, then thicken it.',
      'Keep components orthogonal so a change stays local.',
      'Own your tools and automate anything you do twice.',
    ],
    after: ['cleancode', 'refactoring'],
  },
  {
    id: 'cleancode', domain: 'code', title: 'Clean Code', author: 'Robert C. Martin', year: 2008, kind: 'book', level: 1,
    who: 'Developers whose code is read by other people.',
    ideas: [
      'Code is read far more often than it is written; optimise for the reader.',
      'A good name removes the need for a comment.',
      'Functions should be small and do one thing.',
      'Tests are what make it safe to keep the code clean.',
      'Leave every file a little better than you found it.',
    ],
    before: ['pragmatic'], after: ['refactoring', 'aposd'],
  },
  {
    id: 'refactoring', domain: 'code', title: 'Refactoring', author: 'Martin Fowler', year: 1999, kind: 'book', level: 2,
    who: 'Developers improving code that already works.',
    ideas: [
      'Refactoring changes structure without changing behaviour, in small verified steps.',
      'A solid test suite is the precondition, not an afterthought.',
      'Code smells are a shared vocabulary for what feels wrong.',
      'Refactor before adding a feature, so the feature becomes easy to add.',
      'Many tiny safe steps are faster than one large risky rewrite.',
    ],
    before: ['cleancode'],
  },
  {
    id: 'aposd', domain: 'code', title: 'A Philosophy of Software Design', author: 'John Ousterhout', year: 2018, kind: 'book', level: 2,
    who: 'Engineers designing modules and APIs.',
    ideas: [
      'Complexity is the enemy; it shows up as change amplification and cognitive load.',
      'Deep modules hide a lot of behaviour behind a small interface.',
      'Working code is not enough: invest a little in design on every change.',
      'Pull complexity downward so callers do not have to deal with it.',
      'Define errors out of existence where the API allows it.',
    ],
    before: ['cleancode'],
  },
  {
    id: 'sicp', domain: 'code', title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson, Gerald Jay Sussman', year: 1985, kind: 'book', level: 3,
    who: 'Programmers who want to understand what a program really is.',
    ideas: [
      'Abstraction is the main tool for controlling complexity.',
      'Procedures are data, and data can be built from procedures.',
      'State and assignment make programs harder to reason about; use them deliberately.',
      'An interpreter is just another program, and writing one demystifies languages.',
      'Good design builds a language suited to the problem, then solves the problem in it.',
    ],
    free: 'https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/index.html',
  },

  // ── Databases & Data ──────────────────────────────────────────────────────
  {
    id: 'dbint', domain: 'data', title: 'Database Internals', author: 'Alex Petrov', year: 2019, kind: 'book', level: 3,
    who: 'Engineers who want to know what the database does with their query.',
    ideas: [
      'B-trees favour reads and in-place updates; LSM-trees favour writes.',
      'The write-ahead log is what makes a crash survivable.',
      'Page layout and the buffer pool decide most real-world performance.',
      'Failure detection in a cluster is always a guess with a timeout.',
      'Distributed transactions need a coordination protocol, and each one has a failure mode.',
    ],
    before: ['ddia'],
  },
  {
    id: 'fde', domain: 'data', title: 'Fundamentals of Data Engineering', author: 'Joe Reis, Matt Housley', year: 2022, kind: 'book', level: 1,
    who: 'People entering data engineering, or working beside it.',
    ideas: [
      'The data lifecycle runs generation, ingestion, storage, transformation, serving.',
      'Choose technology by the stage it serves, not by its popularity.',
      'Security, governance and orchestration cut across every stage.',
      'Batch is a special case of streaming; pick latency by business need.',
      'The job is delivering reliable data to people who decide with it.',
    ],
    after: ['ddia', 'kimball'],
  },
  {
    id: 'kimball', domain: 'data', title: 'The Data Warehouse Toolkit', author: 'Ralph Kimball, Margy Ross', year: 1996, kind: 'book', level: 2,
    who: 'Analysts and engineers modelling data for reporting.',
    ideas: [
      'Model around business processes: facts are measurements, dimensions are context.',
      'A star schema keeps queries simple and fast for analysts.',
      'Declare the grain of a fact table before anything else.',
      'Conformed dimensions let separate subject areas be compared.',
      'Slowly changing dimensions preserve history when attributes change.',
    ],
    before: ['fde'],
  },
  {
    id: 'hpmysql', domain: 'data', title: 'High Performance MySQL', author: 'Baron Schwartz, Peter Zaitsev, Vadim Tkachenko', year: 2004, kind: 'book', level: 2,
    who: 'Developers and operators running a relational database under load.',
    ideas: [
      'Measure where time goes before changing anything.',
      'Schema and data type choices set the ceiling for performance.',
      'An index helps only if its column order matches the query.',
      'Read the execution plan; the optimiser tells you what it will do.',
      'Replication scales reads and adds lag you must design around.',
    ],
    after: ['dbint'],
  },
  {
    id: 'streaming', domain: 'data', title: 'Streaming Systems', author: 'Tyler Akidau, Slava Chernyak, Reuven Lax', year: 2018, kind: 'book', level: 3,
    who: 'Engineers building pipelines over data that never stops arriving.',
    ideas: [
      'Event time and processing time are different clocks; correct results need the first.',
      'Windows cut an unbounded stream into pieces you can aggregate.',
      'Watermarks estimate how complete the data is so far.',
      'Triggers decide when to emit a result, and when to revise it.',
      'A stream and a table are two views of the same thing.',
    ],
    before: ['ddia', 'mapreduce'],
  },
  {
    id: 'gfs', domain: 'data', title: 'The Google File System', author: 'Sanjay Ghemawat, Howard Gobioff, Shun-Tak Leung', year: 2003, kind: 'paper', level: 3,
    who: 'Readers tracing where modern data infrastructure started.',
    ideas: [
      'Treat hardware failure as the normal case, not the exception.',
      'Optimise for huge files and appends rather than small random writes.',
      'A single master holds metadata; chunk servers hold the data.',
      'Large chunks, replicated three times, keep the master small and the data safe.',
      'Relaxed consistency was accepted in exchange for simplicity and throughput.',
    ],
    after: ['mapreduce', 'bigtable'],
    free: 'https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf',
  },
  {
    id: 'mapreduce', domain: 'data', title: 'MapReduce: Simplified Data Processing on Large Clusters', author: 'Jeffrey Dean, Sanjay Ghemawat', year: 2004, kind: 'paper', level: 2,
    who: 'Anyone who wants to understand batch processing at its origin.',
    ideas: [
      'Two functions, map and reduce, are enough to express many large computations.',
      'The framework, not the programmer, handles parallelism and failure.',
      'A failed task is simply run again, because tasks are deterministic.',
      'Moving the computation to the data avoids moving the data.',
      'Slow machines are handled by running backup copies of straggling tasks.',
    ],
    before: ['gfs'], after: ['bigtable', 'streaming'],
    free: 'https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf',
  },
  {
    id: 'bigtable', domain: 'data', title: 'Bigtable: A Distributed Storage System for Structured Data', author: 'Fay Chang, Jeffrey Dean, Sanjay Ghemawat et al.', year: 2006, kind: 'paper', level: 3,
    who: 'Readers who want the design behind HBase, Cassandra and their descendants.',
    ideas: [
      'The data model is a sparse, sorted map keyed by row, column and timestamp.',
      'Rows are kept in sorted order, so key design controls locality.',
      'Tables split into tablets that move between servers as they grow.',
      'Writes go to a log and an in-memory table, then flush to immutable files.',
      'Compactions merge those files and bound the cost of reads.',
    ],
    before: ['gfs', 'mapreduce'], after: ['dbint'],
    free: 'https://static.googleusercontent.com/media/research.google.com/en//archive/bigtable-osdi06.pdf',
  },

  // ── AI & Machine Learning ─────────────────────────────────────────────────
  {
    id: 'homl', domain: 'ai', title: 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow', author: 'Aurélien Géron', year: 2017, kind: 'book', level: 1,
    who: 'Programmers who learn by building.',
    ideas: [
      'Work through one project end to end before studying any single model deeply.',
      'Hold out a test set first and never look at it while tuning.',
      'Most gains come from data preparation and features, not from the model.',
      'Overfitting is the default failure; regularise and validate.',
      'Neural networks are layers trained by gradient descent, and you can build them in a few lines.',
    ],
    after: ['d2l', 'dmls'],
  },
  {
    id: 'd2l', domain: 'ai', title: 'Dive into Deep Learning', author: 'Aston Zhang, Zachary C. Lipton, Mu Li, Alexander J. Smola', year: 2020, kind: 'book', level: 2,
    who: 'Learners who want the maths and the code side by side.',
    ideas: [
      'Every concept comes with code you can run and change.',
      'Automatic differentiation is what makes deep learning practical.',
      'Convolutions exploit structure in images; attention exploits structure in sequences.',
      'Optimisation details such as learning rate and initialisation decide whether training works.',
      'Modern architectures are combinations of a few reusable blocks.',
    ],
    before: ['homl'], after: ['dl', 'attention'],
    free: 'https://d2l.ai/',
  },
  {
    id: 'dl', domain: 'ai', title: 'Deep Learning', author: 'Ian Goodfellow, Yoshua Bengio, Aaron Courville', year: 2016, kind: 'book', level: 3,
    who: 'Readers who want the theory under the frameworks.',
    ideas: [
      'Deep learning is representation learning: each layer builds features from the last.',
      'Linear algebra, probability and optimisation are the working vocabulary.',
      'Backpropagation is the chain rule applied efficiently over a graph.',
      'Regularisation is any change that helps on new data, even at a cost on training data.',
      'Depth lets a network reuse features, which is why it generalises better than width alone.',
    ],
    before: ['d2l'],
    free: 'https://www.deeplearningbook.org/',
  },
  {
    id: 'prml', domain: 'ai', title: 'Pattern Recognition and Machine Learning', author: 'Christopher M. Bishop', year: 2006, kind: 'book', level: 3,
    who: 'Readers who want machine learning grounded in probability.',
    ideas: [
      'Treat learning as inference: state your uncertainty and update it with data.',
      'A prior is an assumption made explicit, and it acts as regularisation.',
      'Many models are the same idea with a different likelihood.',
      'Latent variables explain structure you cannot observe directly.',
      'Graphical models make the dependencies between variables visible.',
    ],
    before: ['homl'],
  },
  {
    id: 'aima', domain: 'ai', title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell, Peter Norvig', year: 1995, kind: 'book', level: 2,
    who: 'Readers who want the whole map of AI, not only neural networks.',
    ideas: [
      'An agent perceives, decides and acts to maximise expected outcome.',
      'Search and planning solve problems by exploring possible futures.',
      'Logic represents knowledge you can reason over explicitly.',
      'Probability is how an agent acts sensibly under uncertainty.',
      'Learning is one tool among several; the right one depends on the environment.',
    ],
  },
  {
    id: 'attention', domain: 'ai', title: 'Attention Is All You Need', author: 'Ashish Vaswani et al.', year: 2017, kind: 'paper', level: 2,
    who: 'Anyone who wants to read the paper behind modern language models.',
    ideas: [
      'Self-attention lets every token look at every other token directly.',
      'Removing recurrence makes training parallel, and far faster.',
      'Multiple attention heads capture different relationships at once.',
      'Positional encodings put word order back into a model that has none.',
      'The same block, stacked, scales to very large models.',
    ],
    before: ['d2l'], after: ['aieng'],
    free: 'https://arxiv.org/abs/1706.03762',
  },
  {
    id: 'dmls', domain: 'ai', title: 'Designing Machine Learning Systems', author: 'Chip Huyen', year: 2022, kind: 'book', level: 2,
    who: 'Engineers taking a model from notebook to production.',
    ideas: [
      'Start from the business objective, then decide whether ML is even needed.',
      'Training data is a product: its quality, labels and sampling shape everything.',
      'Models decay as the world shifts; monitor for drift and retrain.',
      'Offline metrics can disagree with real impact, so test in production carefully.',
      'The system around the model is most of the work.',
    ],
    before: ['homl'], after: ['aieng'],
  },
  {
    id: 'aieng', domain: 'ai', title: 'AI Engineering', author: 'Chip Huyen', year: 2025, kind: 'book', level: 2,
    who: 'Builders of applications on top of foundation models.',
    ideas: [
      'Evaluation is the hardest part; define it before you build.',
      'Try prompting, then retrieval, and fine-tune only when those fall short.',
      'Retrieval gives a model facts it was never trained on.',
      'Agents add tools and planning, and new ways to fail.',
      'Latency, cost and quality trade against each other on every request.',
    ],
    before: ['dmls', 'attention'],
  },

  // ── Cloud & Operations ────────────────────────────────────────────────────
  {
    id: 'phoenix', domain: 'cloud', title: 'The Phoenix Project', author: 'Gene Kim, Kevin Behr, George Spafford', year: 2013, kind: 'book', level: 1,
    who: 'Anyone new to DevOps who prefers a story to a manual.',
    ideas: [
      'Work in progress is the silent killer; make all work visible.',
      'Find the constraint, and improve nothing else until it moves.',
      'Unplanned work steals capacity from everything that was planned.',
      'Fast feedback from operations to development prevents repeat failures.',
      'Improvement of daily work matters as much as the daily work.',
    ],
    after: ['accelerate'],
  },
  {
    id: 'accelerate', domain: 'cloud', title: 'Accelerate', author: 'Nicole Forsgren, Jez Humble, Gene Kim', year: 2018, kind: 'book', level: 2,
    who: 'Leaders who want evidence for how software teams perform.',
    ideas: [
      'Four metrics describe delivery: deployment frequency, lead time, change failure rate, time to restore.',
      'Speed and stability rise together; they are not a trade-off.',
      'Continuous delivery practices predict better outcomes.',
      'Loosely coupled architecture lets teams ship independently.',
      'Culture can be measured, and it predicts performance.',
    ],
    before: ['phoenix'], after: ['teamtopo'],
  },
  {
    id: 'teamtopo', domain: 'cloud', title: 'Team Topologies', author: 'Matthew Skelton, Manuel Pais', year: 2019, kind: 'book', level: 2,
    who: 'People designing how engineering teams are shaped.',
    ideas: [
      'Systems mirror the communication structure of the teams that build them.',
      'Four team types cover most needs: stream-aligned, platform, enabling, complicated-subsystem.',
      'Limit each team’s cognitive load, or quality drops.',
      'Teams interact in three modes: collaboration, service, facilitation.',
      'A platform is a product whose customers are internal teams.',
    ],
    before: ['accelerate'],
  },
  {
    id: 'k8s', domain: 'cloud', title: 'Kubernetes: Up and Running', author: 'Brendan Burns, Joe Beda, Kelsey Hightower', year: 2017, kind: 'book', level: 1,
    who: 'Developers deploying to Kubernetes for the first time.',
    ideas: [
      'You declare the desired state; controllers work to make it true.',
      'A pod is the unit that is scheduled, not a container.',
      'Services give changing pods one stable address.',
      'Deployments roll out new versions gradually and can roll back.',
      'Labels are how everything finds everything else.',
    ],
    after: ['iac'],
  },
  {
    id: 'iac', domain: 'cloud', title: 'Infrastructure as Code', author: 'Kief Morris', year: 2016, kind: 'book', level: 2,
    who: 'Engineers managing cloud infrastructure at any scale.',
    ideas: [
      'Define everything as code, so it can be reviewed, tested and repeated.',
      'Servers should be disposable and rebuilt, not repaired by hand.',
      'Small, frequent changes are safer than rare, large ones.',
      'Test infrastructure code in a pipeline, like application code.',
      'Configuration drift is prevented by never changing systems manually.',
    ],
    before: ['k8s'],
  },
  {
    id: 'ostep', domain: 'cloud', title: 'Operating Systems: Three Easy Pieces', author: 'Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau', year: 2018, kind: 'book', level: 2,
    who: 'Anyone who wants to know what the machine does beneath their code.',
    ideas: [
      'Virtualisation gives each process the illusion of its own CPU and memory.',
      'Concurrency is hard because interleavings are many and bugs are rare.',
      'Persistence is about surviving a crash at the worst moment.',
      'Mechanism and policy are separate: how to switch, and what to switch to.',
      'Most performance questions come down to caching and locality.',
    ],
    free: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
  },
  {
    id: 'kurose', domain: 'cloud', title: 'Computer Networking: A Top-Down Approach', author: 'James F. Kurose, Keith W. Ross', year: 2000, kind: 'book', level: 2,
    who: 'Engineers who want to follow a request from browser to server.',
    ideas: [
      'Start from applications such as HTTP and DNS, then go down the stack.',
      'Each layer offers a service to the one above and hides how.',
      'TCP builds a reliable stream on top of an unreliable network.',
      'Congestion control is how millions of senders share one network fairly.',
      'Routing is a distributed algorithm with no one in charge.',
    ],
  },
  {
    id: 'tlcl', domain: 'cloud', title: 'The Linux Command Line', author: 'William Shotts', year: 2012, kind: 'book', level: 1,
    who: 'Anyone who opens a terminal and wants to feel at home.',
    ideas: [
      'Small tools that do one thing combine through pipes into powerful ones.',
      'Everything is a file, which is why the same tools work everywhere.',
      'Permissions and processes are the two models you need first.',
      'Redirection and expansion are what make the shell a language.',
      'A script is just the commands you already type, saved.',
    ],
    after: ['ostep', 'k8s'],
    free: 'https://linuxcommand.org/tlcl.php',
  },

  // ── Pre-sales & Product ───────────────────────────────────────────────────
  {
    id: 'sixhabits', domain: 'presales', title: 'The Six Habits of Highly Effective Sales Engineers', author: 'Chris White', year: 2019, kind: 'book', level: 1,
    who: 'New and aspiring sales engineers.',
    ideas: [
      'The sales engineer and the account executive win as partners, with clear roles.',
      'Discovery comes before any demo: learn the problem first.',
      'Show only what solves that customer’s problem, in their words.',
      'Handle objections by understanding the concern behind them.',
      'Lead the technical evaluation with a plan instead of reacting to it.',
    ],
    after: ['mts', 'greatdemo'],
  },
  {
    id: 'mts', domain: 'presales', title: 'Mastering Technical Sales', author: 'John Care', year: 2002, kind: 'book', level: 2,
    who: 'Sales engineers who want the full playbook of the role.',
    ideas: [
      'The role is to earn technical trust and secure the technical win.',
      'Qualify needs before investing in a demo or a proof of concept.',
      'A proof of concept needs agreed success criteria before it starts.',
      'Answering an RFP well means shaping it, not just filling it in.',
      'Speak to business value for executives and to detail for engineers.',
    ],
    before: ['sixhabits'], after: ['challenger'],
  },
  {
    id: 'greatdemo', domain: 'presales', title: 'Great Demo!', author: 'Peter E. Cohan', year: 2003, kind: 'book', level: 1,
    who: 'Anyone who shows software to a customer.',
    ideas: [
      'Do the last thing first: show the result before the steps.',
      'A demo answers a specific critical business issue, nothing more.',
      'Use the fewest clicks that prove the point.',
      'Summarise after every segment so the value lands.',
      'Peel back detail only when the audience asks for it.',
    ],
    before: ['sixhabits'],
  },
  {
    id: 'spin', domain: 'presales', title: 'SPIN Selling', author: 'Neil Rackham', year: 1988, kind: 'book', level: 2,
    who: 'Anyone running discovery conversations on large deals.',
    ideas: [
      'Large sales are won by questions, not by pitches.',
      'Situation questions gather facts; use few of them.',
      'Problem questions uncover difficulties the customer already feels.',
      'Implication questions make the cost of the problem clear.',
      'Need-payoff questions let the customer state the value themselves.',
    ],
    after: ['challenger'],
  },
  {
    id: 'challenger', domain: 'presales', title: 'The Challenger Sale', author: 'Matthew Dixon, Brent Adamson', year: 2011, kind: 'book', level: 2,
    who: 'Sellers and sales engineers in complex B2B deals.',
    ideas: [
      'The best sellers teach customers something new about their own business.',
      'Lead with insight, and only then with the product.',
      'Tailor the message to what each stakeholder cares about.',
      'Take control of the sale, including the conversation about money.',
      'A good relationship follows from value delivered; it does not replace it.',
    ],
    before: ['spin'],
  },
  {
    id: 'chasm', domain: 'presales', title: 'Crossing the Chasm', author: 'Geoffrey A. Moore', year: 1991, kind: 'book', level: 2,
    who: 'People selling or marketing a new technology.',
    ideas: [
      'Early adopters and the mainstream buy for different reasons.',
      'Between them is a gap where many products stall.',
      'Cross it by dominating one narrow segment first.',
      'Mainstream buyers want a whole solution and references, not a breakthrough.',
      'Positioning means being the obvious choice for one specific problem.',
    ],
    after: ['inspired'],
  },
  {
    id: 'inspired', domain: 'presales', title: 'Inspired', author: 'Marty Cagan', year: 2008, kind: 'book', level: 2,
    who: 'Anyone who works with or inside a product team.',
    ideas: [
      'Strong teams are given problems to solve, not features to build.',
      'Discovery tests value, usability, feasibility and viability before building.',
      'Product, design and engineering decide together.',
      'Prototypes are cheap ways to be wrong early.',
      'Outcomes matter; shipped output on its own proves nothing.',
    ],
    before: ['chasm'],
  },
  {
    id: 'voss', domain: 'presales', title: 'Never Split the Difference', author: 'Chris Voss', year: 2016, kind: 'book', level: 1,
    who: 'Anyone who negotiates, which is everyone.',
    ideas: [
      'Listen first: people need to feel understood before they move.',
      'Repeat their last words back; it keeps them talking.',
      'Name the emotion you observe to lower its temperature.',
      'Ask open "how" and "what" questions so the other side solves your problem.',
      'A "no" is the start of the conversation and makes people feel safe.',
    ],
  },
];

export const PATHS: Path[] = [
  {
    id: 'sd-interview', name: 'System design interview', line: 'From the interview kit to the papers behind it.', weeks: 4,
    books: ['sdi', 'ddia', 'dynamo', 'raft', 'sre', 'releaseit'],
  },
  {
    id: 'solutions-engineer', name: 'Become a Solutions Engineer', line: 'Discovery, demo, and enough architecture to be trusted.', weeks: 6,
    books: ['sixhabits', 'greatdemo', 'mts', 'spin', 'challenger', 'sdi', 'ddia', 'chasm'],
  },
  {
    id: 'coding-interview', name: 'Coding interview', line: 'Patterns first, depth second, craft throughout.', weeks: 5,
    books: ['ctci', 'skiena', 'clrs', 'pragmatic', 'cleancode'],
  },
  {
    id: 'ai-engineer', name: 'Zero to AI engineer', line: 'Build, understand, then ship.', weeks: 8,
    books: ['homl', 'd2l', 'attention', 'dl', 'dmls', 'aieng'],
  },
  {
    id: 'data-foundations', name: 'Data engineering foundations', line: 'The lifecycle, then the three papers that started it all.', weeks: 6,
    books: ['fde', 'ddia', 'gfs', 'mapreduce', 'bigtable', 'streaming', 'kimball'],
  },
];
