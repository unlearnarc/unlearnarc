"""Shared, explicit catalog labels; never truncate meaningful course titles."""

DOMAIN_LABELS = {
    'Computer & Programming Foundations': 'Programming',
    'Data Structures & Algorithms': 'DSA',
    'Frontend Development': 'Frontend',
    'Backend Development': 'Backend',
    'Full Stack Development': 'Full Stack',
    'Databases & SQL': 'Databases',
    'Software Testing & QA': 'QA',
    'DevOps': 'DevOps',
    'Cloud Computing': 'Cloud',
    'Cybersecurity': 'Cybersecurity',
    'Data Analytics': 'Analytics',
    'Data Science': 'Data Science',
    'AI & Machine Learning': 'AI & ML',
    'Data Engineering': 'Data Engineering',
    'Mobile Development': 'Mobile',
    'Software Architecture & System Design': 'System Design',
}

SKILL_LABELS = {
    'Object-Oriented Programming': 'OOP',
    'Time and Space Complexity': 'Complexity Analysis',
    'Browser Developer Tools': 'Browser DevTools',
    'Authentication and Authorization': 'Auth & Permissions',
    'Exploratory Data Analysis': 'EDA',
    'Retrieval-Augmented Generation': 'RAG',
    'Site Reliability Engineering': 'SRE',
    'Technical Communication': 'Tech Communication',
    'Data Visualization': 'Data Viz',
    'Application Security': 'App Security',
    'Mobile App Testing': 'Mobile Testing',
    'Mobile App Architecture': 'Mobile Architecture',
    'LLM Fundamentals': 'LLM Basics',
}


def course_name(name):
    for domain in DOMAIN_LABELS:
        prefix = domain + ': '
        if name.startswith(prefix):
            return name[len(prefix):].strip()
    return name


def skill_name(name):
    for domain, label in DOMAIN_LABELS.items():
        for level in ('Beginner', 'Intermediate', 'Advanced', 'Expert'):
            if name == f'{domain} — {level} Practice':
                return f'{label} — {level}'
    return SKILL_LABELS.get(name, name)
