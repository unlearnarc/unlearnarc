"""Curated four-level curricula. Reading estimates exclude independent project work."""
from html import escape
from catalog_names import skill_name

LEVELS = ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT')
# Each row: course focus | four ordered modules | assessable project | official reference.
CURRICULA = {
'Computer & Programming Foundations': [
('Your First Computer Programs', 'Files, folders and safe downloads;Terminal navigation and commands;Python variables, input and decisions;Loops, functions and debugging', 'Build a command-line expense tracker that validates amounts and calculates totals; demonstrate empty input and invalid-number handling.', 'https://docs.python.org/3/tutorial/'),
('Writing Maintainable Programs', 'Lists, dictionaries and sets;Modules, packages and virtual environments;Git commits, branches and pull requests;Unit tests, exceptions and file storage', 'Refactor the tracker into modules with JSON persistence, a README and tests for malformed files.', 'https://docs.python.org/3/tutorial/'),
('Reliable Software Workflows', 'Type hints and interface contracts;Logging and reproducible debugging;Profiling CPU and memory;CI checks and code review', 'Deliver a typed CLI package with structured logs, a CI test job and a measured performance improvement.', 'https://docs.python.org/3/library/'),
('Engineering a Production CLI', 'API compatibility and semantic versioning;Packaging and release automation;Dependency security and configuration;Architecture decisions and maintenance', 'Release a versioned CLI with upgrade instructions, dependency review and a documented backward-compatibility test.', 'https://packaging.python.org/en/latest/tutorials/packaging-projects/')],
'Data Structures & Algorithms': [
('Problem Solving and Core Collections', 'Tracing programs and counting operations;Arrays and strings;Hash maps and sets;Linear search, binary search and basic sorting', 'Solve and explain eight array, string and lookup problems with tests for empty inputs, duplicates and boundaries.', 'https://opendsa-server.cs.vt.edu/ODSA/Books/Everything/html/'),
('Core Interview Patterns', 'Linked lists, stacks and queues;Two pointers and sliding windows;Recursion and backtracking;Trees, heaps and traversal', 'Implement a tested collection library and compare iterative and recursive tree traversals.', 'https://opendsa-server.cs.vt.edu/ODSA/Books/Everything/html/'),
('Graphs and Dynamic Programming', 'BFS, DFS and topological ordering;Shortest paths and union-find;Greedy proofs and interval problems;Dynamic programming states and transitions', 'Build a route planner; compare BFS with weighted shortest paths and test unreachable destinations.', 'https://cp-algorithms.com/'),
('Algorithm Design and Proof', 'Amortized analysis and invariants;Segment trees and range queries;Advanced dynamic programming and bitmasks;Randomization, lower bounds and trade-offs', 'Implement and benchmark a range-query engine against a naive oracle using randomized differential tests.', 'https://cp-algorithms.com/')],
'Frontend Development': [
('Accessible Web Foundations', 'Semantic HTML and forms;CSS box model and responsive layouts;JavaScript values, functions and events;DOM updates and browser debugging', 'Build a responsive, keyboard-accessible personal site with a validated contact form and no console errors.', 'https://developer.mozilla.org/en-US/docs/Learn_web_development'),
('React and TypeScript Applications', 'TypeScript types and narrowing;React components, state and composition;Routing, forms and HTTP requests;Component tests and accessibility checks', 'Build a typed task manager with routes, accessible forms and tested loading, empty and error states.', 'https://react.dev/learn'),
('Frontend Performance and Reliability', 'Server state and cache invalidation;Rendering profiles and bundle analysis;Design systems and reusable interactions;End-to-end tests and frontend security', 'Optimize a dashboard using measured render and network budgets; test keyboard navigation and failed requests.', 'https://web.dev/learn/'),
('Frontend Platform Architecture', 'SSR, hydration and delivery trade-offs;Microfrontend boundaries and dependency governance;Observability and release safety;Accessibility and performance governance', 'Write and prototype a frontend platform plan with an SSR decision, rollback procedure and measurable quality budgets.', 'https://web.dev/learn/')],
'Backend Development': [
('Server and HTTP Basics', 'Java fundamentals and object modeling;HTTP methods, status codes and JSON;Spring Boot routing and validation;SQL persistence and CRUD tests', 'Build a small catalog API with validated requests, correct HTTP status codes and persistence tests.', 'https://spring.io/guides'),
('Secure Service Development', 'Service boundaries and dependency injection;Authentication, authorization and password safety;Transactions, pagination and API contracts;Unit and integration testing', 'Implement a role-protected booking API; test ownership checks, invalid requests and transaction rollback.', 'https://docs.spring.io/spring-boot/reference/'),
('Resilient Backend Services', 'Caching and consistency;Messaging, retries and idempotency;Concurrency and database contention;Tracing, metrics and load testing', 'Add idempotent booking requests and asynchronous notifications; prove retries cannot create duplicate bookings.', 'https://docs.spring.io/spring-boot/reference/'),
('Distributed Backend Architecture', 'Service decomposition and API evolution;Outbox, sagas and distributed failure;Capacity planning and SLOs;Security reviews and disaster recovery', 'Design an order platform with an outbox, recovery drill, compatibility policy and evidence-based capacity estimate.', 'https://microservices.io/patterns/')],
'Full Stack Development': [
('Build Your First Web Application', 'HTML, CSS and JavaScript essentials;Node.js and Express routes;SQL tables and CRUD;Connecting forms to an API', 'Build a reading-list app that persists books and shows useful validation and network-error messages.', 'https://developer.mozilla.org/en-US/docs/Learn_web_development'),
('Typed Full Stack Product Development', 'React and TypeScript UI;REST contracts and PostgreSQL migrations;Sessions, authorization and input validation;Full stack integration tests', 'Build a multi-user issue tracker with ownership rules, migrations and automated UI-to-database tests.', 'https://www.typescriptlang.org/docs/'),
('Deploying Reliable Web Products', 'Docker and CI/CD pipelines;Pagination, caching and optimistic updates;Observability and performance profiling;Security and accessible user journeys', 'Deploy the tracker with a repeatable pipeline, rollback plan and tests for conflicting concurrent edits.', 'https://docs.docker.com/get-started/'),
('Full Stack Product Architecture', 'Domain boundaries and architecture records;Real-time delivery and consistency;Scalability, cost and reliability budgets;Incremental migrations and incident response', 'Produce and validate an architecture for a collaborative product with real-time sync, cost estimates and a failure drill.', 'https://sre.google/workbook/table-of-contents/')],
'Databases & SQL': [
('Relational Data and SQL Basics', 'Tables, keys and data types;SELECT, filtering and sorting;Joins and aggregation;Constraints and safe updates', 'Create a library schema and queries for loans, overdue items and member activity, including empty-result cases.', 'https://www.postgresql.org/docs/current/tutorial.html'),
('Designing Correct Database Applications', 'Normalization and relationship modeling;Transactions and isolation;Window functions and common table expressions;Indexes and execution plans', 'Implement inventory reservations and demonstrate rollback and concurrent-update behavior with SQL scripts.', 'https://www.postgresql.org/docs/current/'),
('Database Performance and Operations', 'Index selectivity and query tuning;Locking, deadlocks and MVCC;Replication and backup validation;Partitioning and schema migrations', 'Tune a slow reporting workload using EXPLAIN ANALYZE and perform a verified backup restore.', 'https://www.postgresql.org/docs/current/'),
('Data Platform Architecture', 'Consistency and distributed storage trade-offs;Sharding and online data movement;Recovery objectives and failover;Governance, retention and access controls', 'Design a multi-tenant storage platform with tenant isolation, recovery targets and an online migration rehearsal.', 'https://www.postgresql.org/docs/current/')],
'Software Testing & QA': [
('Testing Foundations', 'Requirements and acceptance criteria;Equivalence classes and boundary values;Exploratory testing and bug reports;First automated unit tests', 'Test a registration form with a boundary matrix, reproducible bug reports and automated validation tests.', 'https://docs.pytest.org/en/stable/getting-started.html'),
('API and Browser Test Automation', 'Fixtures, test data and isolation;API contracts and negative testing;Playwright locators and assertions;CI execution and test reports', 'Automate checkout API and browser journeys, including unauthorized requests and failed payments in a sandbox.', 'https://playwright.dev/docs/intro'),
('Reliability and Nonfunctional Testing', 'Property-based and mutation testing;Performance workloads and bottlenecks;Accessibility and security testing;Flaky-test diagnosis and service virtualization', 'Build a quality pipeline with property checks, an accessible journey and a load test with explicit pass thresholds.', 'https://playwright.dev/docs/best-practices'),
('Quality Engineering Strategy', 'Risk-based quality planning;Contract testing across services;Production signals and release gates;Test architecture and quality metrics', 'Develop a release strategy with risk coverage, consumer contracts, rollback gates and a non-vanity quality dashboard.', 'https://sre.google/workbook/table-of-contents/')],
'DevOps': [
('Linux and Delivery Foundations', 'Linux files, permissions and processes;Shell scripts and networking basics;Git workflows and configuration;Running an application and reading logs', 'Automate a local application setup with health checks, safe permissions and reproducible configuration.', 'https://www.gnu.org/software/bash/manual/bash.html'),
('Containers and Delivery Pipelines', 'Docker images and multi-stage builds;CI test and artifact pipelines;Environment variables and secret handling;Infrastructure as code foundations', 'Containerize a service and create a CI pipeline that tests, scans and publishes an immutable artifact.', 'https://docs.docker.com/get-started/'),
('Kubernetes and Observability', 'Deployments, services and probes;Helm configuration and rollouts;Metrics, logs and distributed traces;Terraform state and change review', 'Run a service on a local cluster with probes, resource limits, a dashboard and a demonstrated rollback.', 'https://kubernetes.io/docs/tutorials/'),
('Platform Engineering and SRE', 'SLOs, error budgets and capacity;GitOps and progressive delivery;Incident response and disaster recovery;Developer platforms and supply-chain security', 'Build a platform blueprint with signed artifacts, an SLO alert and a timed recovery exercise.', 'https://sre.google/workbook/table-of-contents/')],
'Cloud Computing': [
('Cloud and Infrastructure Basics', 'Compute, storage and networking concepts;Identity and least privilege;Deploying a small service;Billing alerts and resource cleanup', 'Deploy a small sandbox service with least-privilege access, a budget alert and a verified teardown checklist.', 'https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html'),
('Building Cloud Applications', 'Virtual networks and security groups;Managed databases and object storage;Load balancing and autoscaling;Infrastructure templates and secrets', 'Deploy a private database-backed application with TLS, secret storage and a repeatable infrastructure plan.', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html'),
('Reliable Cloud Operations', 'Multi-zone availability and recovery;Cloud metrics and incident diagnostics;Containers, serverless and queues;Cost optimization and policy controls', 'Evaluate container and serverless deployments using load, cost and failure tests; document the chosen trade-off.', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html'),
('Cloud Architecture and Governance', 'Multi-account boundaries and landing zones;Threat modeling and compliance evidence;Regional failover and recovery drills;FinOps, capacity and architecture reviews', 'Design a governed cloud landing zone with recovery objectives, policy checks and a monthly cost model.', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html')],
'Cybersecurity': [
('Security and Safe Computing Basics', 'Threats, assets and trust boundaries;Passwords, MFA and phishing;Linux permissions and network basics;Safe practice labs and responsible disclosure', 'Build an isolated local lab and document asset risks, MFA setup and recovery steps; never test third-party systems.', 'https://owasp.org/www-project-top-ten/'),
('Web Application Defense', 'HTTP, cookies and session security;Broken access control and injection;Validation, encoding and secret handling;Security tests in an authorized local lab', 'Harden a local demo API and add regression tests for authorization bypass and injection attempts.', 'https://cheatsheetseries.owasp.org/'),
('Security Engineering and Detection', 'Threat modeling and abuse cases;Cryptographic choices and key management;Cloud IAM and workload security;Logging, detection and incident triage', 'Threat-model a service and implement least-privilege policies and a tested alert for suspicious access.', 'https://cheatsheetseries.owasp.org/'),
('Secure Architecture and Response', 'Zero-trust boundaries and defense in depth;Software supply-chain assurance;Incident containment and recovery;Risk acceptance and security governance', 'Deliver a security architecture and run a tabletop incident exercise with evidence preservation and recovery criteria.', 'https://csrc.nist.gov/publications/detail/sp/800-218/final')],
'Data Analytics': [
('Spreadsheets, SQL and Data Literacy', 'Questions, metrics and data types;SQL filtering and aggregation;Data cleaning and missing values;Charts and honest visual communication', 'Analyze a small sales dataset and produce a dashboard that states definitions, missing data and limitations.', 'https://www.postgresql.org/docs/current/tutorial.html'),
('Python Analytics and Reporting', 'Pandas joins and group operations;Exploratory analysis and outliers;Descriptive statistics and uncertainty;Reproducible notebooks and stakeholder reports', 'Create a reproducible customer-retention report with cohort definitions and reconciled source totals.', 'https://pandas.pydata.org/docs/getting_started/'),
('Experimentation and Analytical Modeling', 'Hypothesis tests and confidence intervals;A/B design and power;Dimensional models and metric layers;Forecast evaluation and leakage prevention', 'Analyze a simulated A/B test with predeclared metrics, uncertainty intervals and practical-significance discussion.', 'https://www.statsmodels.org/stable/user-guide.html'),
('Analytics Strategy and Decision Systems', 'Causal assumptions and confounding;Metric governance and data contracts;Decision analysis and sensitivity;Communicating recommendations and uncertainty', 'Design a decision memo with sensitivity analysis, metric ownership and explicit limits on causal claims.', 'https://www.statsmodels.org/stable/user-guide.html')],
'Data Science': [
('Python and Statistics for Data Science', 'Python, NumPy and tabular data;Data cleaning and exploratory plots;Probability and descriptive statistics;Train-test separation and simple baselines', 'Build a reproducible notebook that cleans a dataset and evaluates a baseline without test-set leakage.', 'https://scikit-learn.org/stable/getting_started.html'),
('Practical Predictive Modeling', 'Regression and classification pipelines;Cross-validation and preprocessing;Feature engineering and missing values;Metrics, imbalance and model interpretation', 'Compare two models using a leakage-safe pipeline and explain metric selection and error patterns.', 'https://scikit-learn.org/stable/user_guide.html'),
('Robust Modeling and Experiments', 'Hyperparameter search and nested validation;Time series and grouped evaluation;Calibration, uncertainty and fairness;Experiment tracking and reproducibility', 'Evaluate a temporal model with rolling splits, calibration plots and subgroup error analysis.', 'https://scikit-learn.org/stable/user_guide.html'),
('Production Data Science Leadership', 'Model monitoring and drift;Causal evaluation and decision costs;Data contracts and reproducible delivery;Model governance and retirement', 'Deliver a model decision record with monitoring thresholds, a rollback baseline and a retraining/retirement policy.', 'https://scikit-learn.org/stable/common_pitfalls.html')],
'AI & Machine Learning': [
('Machine Learning Foundations', 'Python arrays and linear algebra intuition;Supervised learning and loss functions;Train, validation and test splits;Baseline models and responsible use', 'Train a baseline classifier and explain held-out performance, error costs and appropriate-use limits.', 'https://developers.google.com/machine-learning/crash-course'),
('Neural Networks and Practical ML', 'Gradients and training loops;Neural networks and regularization;Embeddings and transfer learning;Evaluation, reproducibility and data bias', 'Train a small neural model with fixed seeds, a validation curve and comparison against a simpler baseline.', 'https://pytorch.org/tutorials/'),
('LLM Applications and Evaluation', 'Transformers, tokens and context limits;Retrieval, chunking and vector search;Prompt injection and data privacy;Grounded evaluation and serving costs', 'Build a document assistant with citations, an evaluation set and tests for unsupported answers and injected instructions.', 'https://huggingface.co/learn'),
('Reliable AI Systems Engineering', 'Offline and online evaluation design;Serving, latency and inference optimization;Monitoring, safety and human review;Governance, model changes and rollback', 'Produce an AI launch review with quality/safety thresholds, latency and cost budgets, human escalation and rollback.', 'https://www.nist.gov/itl/ai-risk-management-framework')],
'Data Engineering': [
('Data Pipeline Foundations', 'Python files and structured data;SQL and relational storage;Batch extraction and transformations;Schema checks and reproducible runs', 'Build a local CSV-to-PostgreSQL pipeline with typed columns, rejection reporting and rerunnable loads.', 'https://www.postgresql.org/docs/current/tutorial.html'),
('Warehouses and Orchestrated Pipelines', 'Dimensional models and warehouse layers;Incremental loads and idempotency;Workflow dependencies and retries;Data quality tests and lineage', 'Implement a scheduled incremental warehouse load that handles late data and does not duplicate rows on retry.', 'https://airflow.apache.org/docs/apache-airflow/stable/tutorial/index.html'),
('Distributed and Streaming Data', 'Spark partitions and execution plans;Event time, windows and watermarks;Change data capture and schema evolution;Backfills, observability and reconciliation', 'Design and test an event pipeline with duplicates, late events and a reconciled historical backfill.', 'https://spark.apache.org/docs/latest/'),
('Data Platform Reliability and Governance', 'Lakehouse and storage trade-offs;Data contracts, ownership and privacy;Recovery objectives and cost controls;Multi-tenant orchestration and platform SLOs', 'Create a platform design with contracts, lineage, deletion handling, a recovery drill and a per-workload cost model.', 'https://airflow.apache.org/docs/apache-airflow/stable/')],
'Mobile Development': [
('Android and Kotlin Foundations', 'Kotlin values, functions and null safety;Compose layouts and state;Navigation and accessible interactions;Local data and device debugging', 'Build an accessible offline habit tracker with state restoration and validation on a local emulator.', 'https://developer.android.com/courses'),
('Connected Mobile Applications', 'Coroutines and lifecycle-aware work;HTTP APIs and authentication;Room persistence and offline states;Unit and UI testing', 'Build an offline-capable reading app with synchronized data, authentication and tested retry/error states.', 'https://developer.android.com/guide'),
('Mobile Performance and Architecture', 'Layered architecture and dependency injection;Background sync and conflict handling;Profiling startup, memory and battery;Secure storage and release pipelines', 'Profile and improve app startup and implement queued sync with tests for connectivity loss and conflicts.', 'https://developer.android.com/topic/architecture'),
('Mobile Platform Engineering', 'Modularization and API boundaries;Release safety and production observability;Cross-platform trade-offs and interoperability;Privacy, accessibility and compatibility strategy', 'Deliver a modular app architecture and staged-release plan with crash thresholds, rollback and a device test matrix.', 'https://developer.android.com/topic/architecture')],
'Software Architecture & System Design': [
('Architecture Foundations for Developers', 'Requirements and quality attributes;Modules, interfaces and dependency direction;HTTP, storage and deployment basics;Diagrams and architecture decision records', 'Model a small booking system with explicit requirements, a component diagram and two justified architecture decisions.', 'https://c4model.com/'),
('Designing Maintainable Systems', 'Domain modeling and bounded contexts;API design and schema evolution;Design patterns and testing boundaries;Caching, queues and failure modes', 'Design a modular application with versioned contracts and tests that protect domain rules from infrastructure changes.', 'https://microservices.io/patterns/'),
('Distributed System Design', 'Consistency, replication and partitioning;Idempotency and distributed transactions;Capacity estimates and bottlenecks;Observability and resilience patterns', 'Design a reservation system with contention handling, capacity estimates and failure-mode analysis.', 'https://sre.google/workbook/table-of-contents/'),
('Architecture Review and Evolution', 'Trade-off analysis and fitness functions;Legacy modernization and migration safety;Multi-region reliability and security;Technical strategy and architecture governance', 'Run an architecture review and propose an incremental migration with fitness checks, cost estimates and rollback gates.', 'https://sre.google/workbook/table-of-contents/')],
}
ALIASES = {'Computer science': 'Computer & Programming Foundations', 'Machine Learning (ML)': 'AI & Machine Learning'}
ROADMAPS = {
    'Full Stack Product Engineer': ['Computer & Programming Foundations', 'Frontend Development', 'Backend Development', 'Databases & SQL', 'Full Stack Development'],
    'Cloud and DevOps Engineer': ['Computer & Programming Foundations', 'DevOps', 'Cloud Computing', 'Cybersecurity'],
    'Data and AI Practitioner': ['Computer & Programming Foundations', 'Databases & SQL', 'Data Analytics', 'Data Science', 'AI & Machine Learning'],
    'Data Platform Engineer': ['Computer & Programming Foundations', 'Databases & SQL', 'Data Engineering', 'Cloud Computing'],
    'Quality and Architecture Engineer': ['Computer & Programming Foundations', 'Data Structures & Algorithms', 'Backend Development', 'Software Testing & QA', 'Software Architecture & System Design'],
}


def catalog():
    result = []
    for domain, rows in CURRICULA.items():
        for index, (focus, modules, project, reference) in enumerate(rows):
            level = LEVELS[index]
            topics = modules.split(';')
            result.append(dict(domain=domain, level=level, name=focus,
                               skill=skill_name(f'{domain} — {level.title()} Practice'), topics=topics,
                               project=project, reference=reference, order=index + 1))
    return result


def guide(entry):
    esc = escape
    previous = ('No prior domain experience. Use a local sandbox and keep personal data out of exercises.'
                if entry['order'] == 1 else
                f"Complete {entry['domain']} level {entry['order'] - 1}, or demonstrate equivalent project skills.")
    modules = ''.join(f'<li><strong>{esc(topic)}</strong>: read the relevant reference section, '
                      'create a minimal worked example, then test a normal case and a failure or boundary case. '
                      'Record what happened and explain the design choice in your own words.</li>'
                      for topic in entry['topics'])
    return (f"<h2>{esc(entry['name'])}</h2><p>This {entry['level'].lower()} course is a guided, "
            'project-based curriculum, not a claim of professional mastery. The ordered topics, official '
            'reading and project below are the study plan; independent practice time is additional.</p>'
            f'<h3>Prerequisites</h3><p>{esc(previous)}</p><h3>Learning sequence and outcomes</h3><ol>{modules}</ol>'
            f'<h3>Practical project</h3><p>{esc(entry["project"])}</p>'
            '<h3>Completion rubric</h3><ul><li>Provide reproducible setup instructions and a small, non-sensitive '
            'sample dataset or fixture.</li><li>Demonstrate each topic in the project and explain at least one '
            'alternative approach.</li><li>Include automated checks or a repeatable validation checklist covering '
            'success, failure and boundary conditions.</li><li>Document limitations, security considerations and '
            'measured results; request a peer review before moving to the next level.</li></ul>'
            f'<h3>Official study reference</h3><p><a href="{esc(entry["reference"], quote=True)}">'
            'Open the documentation and tutorials</a>. Read selectively in topic order; external documentation '
            'may evolve. Cloud work must use a sandbox, spending limits and cleanup procedures.</p>'
            '<h3>Next step</h3><p>Progress only after meeting the rubric. Expert-level study requires repeated '
            'projects, feedback and operational experience; a course alone does not establish expertise.</p>')
