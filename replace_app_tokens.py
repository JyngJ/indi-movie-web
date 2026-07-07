import os
import glob
import re

# Files to target (src/app/**/*.tsx but excluding admin)
files = [f for f in glob.glob('src/app/**/*.tsx', recursive=True) if '/admin/' not in f]

replacements = [
    # fontSize
    (r'fontSize:\s*10\b', r"fontSize: 'var(--text-caption)'"),
    (r'fontSize:\s*11\b', r"fontSize: 'var(--text-caption)'"),
    (r'fontSize:\s*12\b', r"fontSize: 'var(--text-meta)'"),
    (r'fontSize:\s*13\b', r"fontSize: 'var(--text-meta)'"),
    (r'fontSize:\s*14\b', r"fontSize: 'var(--text-body)'"),
    (r'fontSize:\s*15\b', r"fontSize: 'var(--text-subtitle)'"),
    (r'fontSize:\s*16\b', r"fontSize: 'var(--text-title)'"),
    (r'fontSize:\s*17\b', r"fontSize: 'var(--text-title)'"),
    (r'fontSize:\s*18\b', r"fontSize: 'var(--text-h3)'"),
    (r'fontSize:\s*20\b', r"fontSize: 'var(--text-h3)'"),
    (r'fontSize:\s*22\b', r"fontSize: 'var(--text-h2)'"),
    (r'fontSize:\s*24\b', r"fontSize: 'var(--text-h1)'"),
    (r'fontSize:\s*26\b', r"fontSize: 'var(--text-h1)'"),
    (r'fontSize:\s*9\.5\b', r"fontSize: 'var(--text-badge)'"),
    (r'fontSize:\s*9\b', r"fontSize: 'var(--text-badge)'"),
    # borderRadius
    (r'borderRadius:\s*16\b', r"borderRadius: 'var(--radius-xl)'"),
    (r'borderRadius:\s*14\b', r"borderRadius: 'var(--radius-xl)'"),
    (r'borderRadius:\s*12\b', r"borderRadius: 'var(--radius-xl)'"),
    (r'borderRadius:\s*10\b', r"borderRadius: 'var(--radius-xl)'"),
    (r'borderRadius:\s*8\b', r"borderRadius: 'var(--radius-md)'"),
    (r'borderRadius:\s*6\b', r"borderRadius: 'var(--radius-sm)'"),
    (r'borderRadius:\s*4\b', r"borderRadius: 'var(--radius-sm)'"),
    (r'borderRadius:\s*3\b', r"borderRadius: 'var(--radius-sm)'"),
    (r'borderRadius:\s*999\b', r"borderRadius: 'var(--radius-full)'"),
    # gap
    (r'gap:\s*3\b', r"gap: 'var(--spacing-1)'"),
    (r'gap:\s*4\b', r"gap: 'var(--spacing-1)'"),
    (r'gap:\s*5\b', r"gap: 'var(--spacing-1)'"),
    (r'gap:\s*6\b', r"gap: 'var(--spacing-1-5)'"),
    (r'gap:\s*8\b', r"gap: 'var(--spacing-2)'"),
    (r'gap:\s*10\b', r"gap: 'var(--spacing-2-5)'"),
    (r'gap:\s*12\b', r"gap: 'var(--spacing-3)'"),
    (r'gap:\s*14\b', r"gap: 'var(--spacing-3)'"),
    (r'gap:\s*16\b', r"gap: 'var(--spacing-4)'"),
    (r'gap:\s*18\b', r"gap: 'var(--spacing-5)'"),
    (r'gap:\s*20\b', r"gap: 'var(--spacing-5)'"),
    # We must be careful about .5 matches like 'var(--text-meta)'.5
    # The python regex will match 12.5 as well if we're not careful. Wait, \b matches boundary.
]

for file in set(files):
    if not os.path.exists(file): continue
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, repl in replacements:
        new_content = re.sub(pattern, repl, new_content)
        
    # fix the '.5' bug manually
    new_content = new_content.replace("'var(--text-meta)'.5", "'var(--text-meta)'")
    
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")
